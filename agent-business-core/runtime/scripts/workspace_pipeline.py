"""Observe/run the maintained local customer pipeline through HTTP, without a browser.

No database credentials, worker implementation or quality decision lives here. Private
state persists exact requests before dispatch so an uncertain response can be replayed
with the SAME key. A failed job is never retried automatically.
"""
import argparse
import hashlib
import json
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID, uuid4

import httpx


class PipelineError(Exception):
    def __init__(self, code):
        self.code = code


def identity(value):
    try:
        return str(UUID(value))
    except (ValueError, TypeError, AttributeError):
        raise PipelineError("invalid_identity") from None


def sha(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
        ensure_ascii=False).encode()).hexdigest()


def atomic(file, value):
    temporary = file.with_suffix(file.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(file)


def approved_report(view, report, source):
    """The server still performs its own locked admission; this only refuses bad inputs."""
    if not report or not view.get("can_build") or view.get("status") != "plan_ready":
        raise PipelineError("reviewed_plan_required")
    reply = report.get("reply", {})
    reviews = report.get("reviews", [])
    if (report.get("discovery_id") != view.get("discovery_id")
            or report.get("revision") != view.get("current_revision")
            or report.get("report_sha256") != view.get("latest_report_sha256")
            or report.get("source_revision") != source or reply.get("state") != "plan_ready"
            or not reply.get("plan") or len(reviews) != 2
            or not all(r.get("approved") is True and r.get("candidate_sha256") == sha(reply) for r in reviews)):
        raise PipelineError("exact_current_review_required")
    return {"report_revision": report["revision"], "report_sha256": report["report_sha256"]}


class Pipeline:
    def __init__(self, url, directory, *, client=None):
        parsed = urlsplit(url)
        if (parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}
                or parsed.username or parsed.password or parsed.path not in {"", "/"}
                or parsed.query or parsed.fragment):
            raise PipelineError("loopback_api_required")
        self.directory = directory.resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.state_file = self.directory / "state.private.json"
        self.state = json.loads(self.state_file.read_text("utf-8")) if self.state_file.exists() else {
            "version": "workspace-headless.v1", "api": url.rstrip("/"), "operations": {}, "seen": {}}
        if self.state["api"] != url.rstrip("/"):
            raise PipelineError("saved_api_mismatch")
        self.client = client or httpx.Client(base_url=url, timeout=30, follow_redirects=False, trust_env=False)
        self.started = time.monotonic()
        self.current_source = None
        self.expected_source = None

    def log(self, stage, **fields):
        # Callers supply numeric/status/ID observations, never message/response/token/URL text.
        allowed = {"status", "code", "job_id", "attempt_id", "role", "model", "source_revision",
            "revision", "creation_id", "discovery_id", "completed", "total", "state", "http_status"}
        if set(fields) - allowed:
            raise PipelineError("unsafe_log_field")
        row = {"at": datetime.now(UTC).isoformat(), "elapsed_seconds": round(time.monotonic()-self.started, 3),
               "stage": stage, **fields}
        with (self.directory / "events.private.jsonl").open("a", encoding="utf-8") as file:
            file.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(json.dumps(row, ensure_ascii=False), flush=True)

    def changed(self, key, stage, **fields):
        pin = sha(fields)
        if self.state["seen"].get(key) != pin:
            self.log(stage, **fields)
            self.state["seen"][key] = pin
            atomic(self.state_file, self.state)

    def request(self, method, path, payload=None):
        try:
            options = {"timeout": 180} if path.endswith("/foundation/checks") else {}
            response = (self.client.request(method, path, json=payload, **options) if payload is not None
                        else self.client.request(method, path, **options))
        except httpx.RequestError:
            raise PipelineError("api_response_unknown") from None
        if len(response.content) > 2097152:
            raise PipelineError("api_response_limit")
        try:
            value = response.json()
        except ValueError:
            raise PipelineError("api_response_invalid") from None
        if response.status_code >= 300:
            error = value.get("error", {})
            code = error.get("code", "api_refused") if isinstance(error, dict) else "api_refused"
            code = code if isinstance(code, str) and re.fullmatch(r"[a-z0-9_:-]{1,160}", code) else "api_refused"
            self.log("api", code=code, http_status=response.status_code)
            raise PipelineError(code)
        if not isinstance(value, dict):
            raise PipelineError("api_response_invalid")
        if "source_revision" in value:
            self.current_source = value["source_revision"]
        return value.get("data", value)

    def authenticate(self, credentials):
        account = json.loads(credentials.read_text("utf-8"))
        value = self.request("POST", "/customer/v1/auth/login", {
            "email": account["email"], "password": account["password"]})
        self.client.headers["Authorization"] = "Bearer " + value["access_token"]
        me = self.request("GET", "/customer/v1/me")
        portfolios = me.get("portfolios", [])
        if me.get("email_verified") is not True or len(portfolios) != 1:
            raise PipelineError("one_verified_owner_required")
        scope = {"user_id": identity(me["user_id"]), "portfolio_id": identity(portfolios[0]["portfolio_id"])}
        if self.state.get("scope") and self.state["scope"] != scope:
            raise PipelineError("saved_owner_mismatch")
        self.state["scope"] = scope
        atomic(self.state_file, self.state)
        self.log("authentication", status="verified_owner")

    def mutation(self, operation, path, payload):
        if self.current_source != self.expected_source or not self.expected_source:
            raise PipelineError("api_source_mismatch")
        previous = self.state["operations"].get(operation)
        if previous:
            if previous["path"] != path or previous["payload_sha256"] != sha(payload):
                raise PipelineError("saved_request_mismatch")
            if "result" in previous:
                return previous["result"]
        else:
            previous = {"path": path, "payload_sha256": sha(payload),
                "body": {**payload, "idempotency_key": str(uuid4())}}
            self.state["operations"][operation] = previous
            atomic(self.state_file, self.state)  # Persist BEFORE the first dispatch.
        result = self.request("POST", path, previous["body"])
        previous["result"] = result
        atomic(self.state_file, self.state)
        return result

    def discovery_snapshot(self, discovery_id):
        path = "/customer/v2/discoveries/" + identity(discovery_id)
        view = self.request("GET", path)
        if view["portfolio_id"] != self.state["scope"]["portfolio_id"] or str(view["discovery_id"]) != discovery_id:
            raise PipelineError("discovery_scope_mismatch")
        execution = self.request("GET", path + "/execution")
        reports = self.request("GET", path + "/reports?limit=1")
        atomic(self.directory / "discovery.private.json", {"view": view, "execution": execution, "reports": reports})
        self.changed("discovery", "research", discovery_id=discovery_id, status=view["status"],
            revision=view["current_revision"], code=view.get("failure_code"))
        for job in execution["jobs"]:
            self.changed("job:" + job["job_id"], "research_job", **{k: job.get(k) for k in
                ("job_id", "status", "source_revision")}, code=job.get("failure_code"))
        for attempt in execution["attempts"]:
            self.changed("attempt:" + attempt["attempt_id"], "research_agent", **{k: attempt.get(k) for k in
                ("attempt_id", "job_id", "role", "state", "model", "source_revision")})
        return view, reports["items"][0] if reports["items"] else None

    def creation_snapshot(self, creation_id):
        path = "/customer/v2/creations/" + identity(creation_id)
        view = self.request("GET", path)
        if view["portfolio_id"] != self.state["scope"]["portfolio_id"]:
            raise PipelineError("creation_scope_mismatch")
        details = {"view": view}
        for key in ("team", "events", "content", "content-work", "content-completion", "foundation"):
            details[key] = self.request("GET", path + "/" + key)
        atomic(self.directory / "creation.private.json", details)
        self.changed("creation", "business_draft", creation_id=creation_id, status=view["status"],
            revision=view["current_revision"], code=view.get("failure_code"))
        for attempt in details["team"]["attempts"]:
            self.changed("attempt:" + attempt["attempt_id"], "creation_agent", **{k: attempt.get(k) for k in
                ("attempt_id", "job_id", "role", "state", "model", "source_revision")})
        for job in details["content-work"]["items"]:
            self.changed("guide:" + job["job_id"], "initial_content", job_id=job["job_id"],
                         status=job["status"], code=job.get("failure_code"))
            final_states = {event["attempt_id"]: event["state"] for event in job["events"]
                            if event["state"] != "reserved"}
            for attempt in job["attempts"]:
                self.changed("attempt:" + attempt["attempt_id"], "guide_agent",
                    attempt_id=attempt["attempt_id"], job_id=job["job_id"], role=attempt["role"],
                    model=attempt["model"], state=final_states.get(attempt["attempt_id"], "reserved"),
                    source_revision=attempt["source_revision"])
        pages = details["content-completion"]["pages"]
        self.changed("quality", "content_quality", completed=sum(p["state"] == "reviewed" for p in pages), total=len(pages))
        foundation = details["foundation"]
        self.changed("foundation", "foundation", state=foundation["state"], status=foundation["foundation_status"])
        return details

    def run(self, *, discovery_id, message, source, mutate, timeout, poll):
        if not re.fullmatch(r"[a-f0-9]{40}", source):
            raise PipelineError("exact_source_required")
        self.expected_source = source
        saved_id = self.state.get("discovery_id")
        if saved_id and discovery_id and saved_id != discovery_id:
            raise PipelineError("saved_discovery_mismatch")
        discovery_id = saved_id or discovery_id
        if mutate and message:
            if discovery_id:
                view, _ = self.discovery_snapshot(discovery_id)
                stored = self.state["operations"].get("research_message")
                base = stored["body"]["base_revision"] if stored else view["current_revision"]
                result = self.mutation("research_message", "/customer/v2/discoveries/" + discovery_id + "/messages",
                    {"base_revision": base, "message": message})
            else:
                result = self.mutation("research_start", "/customer/v2/discoveries",
                    {"portfolio_id": self.state["scope"]["portfolio_id"], "message": message})
            discovery_id = identity(result["discovery_id"])
        if not discovery_id:
            raise PipelineError("discovery_or_message_required")
        self.state["discovery_id"] = identity(discovery_id)
        atomic(self.state_file, self.state)
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            view, report = self.discovery_snapshot(discovery_id)
            creation_id = view.get("linked_creation_id")
            if not creation_id and view["status"] not in {"queued", "running"}:
                if view["status"] in {"failed", "cancelled", "archived"}:
                    raise PipelineError(view.get("failure_code") or view["status"])
                if not mutate:
                    return "research_observed"
                approved = approved_report(view, report, source)
                result = self.mutation("build_approval", "/customer/v2/discoveries/" + discovery_id + "/build", approved)
                creation_id = identity(result["creation_id"])
                self.log("plan_approval", creation_id=creation_id, revision=result["report_revision"], status="accepted")
            if creation_id:
                details = self.creation_snapshot(creation_id)
                if details["view"]["status"] in {"failed", "cancelled"}:
                    raise PipelineError(details["view"].get("failure_code") or details["view"]["status"])
                jobs = details["content-work"]["items"]
                failed = next((j for j in jobs if j["status"] in {"failed", "cancelled"}), None)
                if failed:
                    raise PipelineError(failed.get("failure_code") or failed["status"])
                if details["foundation"]["agent_foundation_ready"]:
                    return "local_foundation_verified"
                pages = details["content-completion"]["pages"]
                initial_paths = {p["path"] for p in details["content"]["plan"] if p["priority"] == "initial"}
                initial_ids = {p["page_id"] for p in pages if p["path"] in initial_paths}
                completed_ids = {j["page_id"] for j in jobs if j["status"] == "succeeded"
                                 and j["accepted_revision"] == details["view"]["current_revision"]}
                initial_done = bool(initial_paths) and len(initial_ids) == len(initial_paths) and initial_ids <= completed_ids
                active = any(j["status"] in {"queued", "running"} for j in jobs)
                if initial_done and not active and pages and all(p["state"] == "reviewed" for p in pages):
                    if not mutate:
                        return "content_observed"
                    if details["foundation"]["can_check"]:
                        revision = details["view"]["current_revision"]
                        for command in ("candidate", "verify-local"):
                            result = self.mutation("foundation_" + command,
                                "/customer/v2/creations/" + creation_id + "/foundation/checks",
                                {"accepted_revision": revision, "command": command})
                            self.log("foundation_check", state=result["state"])
                            if result["state"] == "blocked":
                                raise PipelineError("foundation_evidence_blocked")
                if initial_done and not active and pages and any(p["state"] == "blocked" for p in pages):
                    raise PipelineError("media_editorial_renderer_pending")
            if not mutate:
                return "observed"
            time.sleep(poll)
        raise PipelineError("observation_timeout")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", required=True)
    parser.add_argument("--credentials", required=True, type=Path)
    parser.add_argument("--run-dir", required=True, type=Path)
    parser.add_argument("--source-revision", required=True)
    parser.add_argument("--discovery-id")
    parser.add_argument("--message-file", type=Path)
    parser.add_argument("--mode", choices=("observe", "run"), default="observe")
    parser.add_argument("--timeout", type=int, default=1800)
    parser.add_argument("--poll", type=float, default=2)
    args = parser.parse_args()
    artifacts = Path(__file__).resolve().parents[1] / "artifacts"
    if not args.run_dir.resolve().is_relative_to(artifacts.resolve()):
        parser.error("run-dir must be inside this runtime's ignored artifacts directory")
    if args.mode == "observe" and args.message_file:
        parser.error("message-file requires mode run")
    if not 1 <= args.timeout <= 7200 or not .2 <= args.poll <= 30:
        parser.error("bounded timeout/poll required")
    pipeline = Pipeline(args.api, args.run_dir)
    try:
        pipeline.authenticate(args.credentials)
        result = pipeline.run(discovery_id=identity(args.discovery_id) if args.discovery_id else None,
            message=args.message_file.read_text("utf-8") if args.message_file else None,
            source=args.source_revision, mutate=args.mode == "run", timeout=args.timeout, poll=args.poll)
        pipeline.log("result", status=result)
        return 0
    except PipelineError as error:
        pipeline.log("stopped", code=error.code)
        return 2
    finally:
        pipeline.client.close()


if __name__ == "__main__":
    raise SystemExit(main())
