import base64
import hashlib
import re
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

from .agent import Agent
from .contracts import READS, WRITES, validate_text
from .store import Conflict, fingerprint
from .treg import Treg


class Service:
    def __init__(self, store, config, transport=None, agent_factory=None):
        self.store, self.config = store, config
        self.transport = transport or Treg(config.token)
        self.agent_factory = agent_factory or (lambda: Agent(model=config.codex_model or None))

    async def reconcile(self, site, job_id):
        job = next((j for j in self.store.jobs(site) if j["id"] == job_id), None)
        if not job or job["state"] != "uncertain":
            raise Conflict("uncertain_scoped_job_required")
        spend = next((r for r in self.store.spending(site) if r["job_id"] == job_id and r["call_id"]), None)
        if not spend:
            raise Conflict("call_id_missing_manual_provider_verification_required")
        value = await self.transport.audit(spend["call_id"])
        # Evidence retrieval does not resend the action or guess what an own-tool response contained.
        self.store.record(site, "reconciliation", job_id, value)
        return {"job_id": job_id, "state": "uncertain", "audit_saved": True,
                "stored": value["result"].get("stored", False), "resend": False}

    async def paid(self, site, operation, payload, job_id, key, job=None):
        p = self.store.profile(site)["profile"]
        if not p["enabled"] or p["paused"] or not (p["live_read"] if operation not in WRITES | {
                "media_upload", "media_alt"} else p["live_write"]):
            raise Conflict("live_action_disabled")
        amount = await self.transport.price(operation, payload)
        if job:
            p = self.gate(job, time.time())
        reservation = self.store.reserve(site, p["actor_id"] or "treg-x", amount, job_id, operation=operation, job=job)
        try:
            receipt = await self.transport.call(operation, p, payload, key)
        except Exception:
            self.store.settle(reservation, None, None)
            current = self.store.profile(site)
            self.store.update_profile({**current["profile"], "paused": True}, current["revision"], "Unknown transport exception")
            raise Conflict("transport_outcome_unknown") from None
        self.store.settle(reservation, receipt.charged_micro, receipt.call_id)
        self.store.record(site, "receipt", key, {"operation": operation, "status": receipt.status,
                          "call_id": receipt.call_id, "charged_micro": receipt.charged_micro,
                          "uncertain": receipt.uncertain, "body": receipt.body})
        if receipt.status in {401, 402, 403, 429} or receipt.charged_micro is None or receipt.uncertain:
            current = self.store.profile(site)
            self.store.update_profile({**current["profile"], "paused": True}, current["revision"],
                                      "Provider restriction or settlement unknown")
        return receipt

    async def bind_actor(self, site):
        owner = str(uuid4())
        account = self.store.acquire_account(site, owner)
        try:
            result = await self.paid(site, "identity", {}, "actor-probe", owner)
        finally:
            self.store.release_account(account, owner)
        if not result.ok:
            raise Conflict("actor_probe_not_accepted")
        data = result.body.get("data", {})
        actor, handle = data.get("id"), data.get("username")
        if not actor or not handle:
            raise Conflict("actor_response_invalid")
        current = self.store.profile(site)
        if current["profile"]["actor_id"] and current["profile"]["actor_id"] != actor:
            self.store.update_profile({**current["profile"], "paused": True}, current["revision"], "X actor changed")
            raise Conflict("actor_changed_requires_explicit_rebind")
        return self.store.update_profile({**current["profile"], "actor_id": actor, "actor_handle": handle,
            "actor_verified_at": time.time(), "credential_hash": self.store.credential_hash(self.config.token)},
            current["revision"], "Actual Treg /2/users/me receipt")

    def gate(self, job, now):
        current = self.store.profile(job["site"])
        p, payload = current["profile"], job["payload"]
        if not p["enabled"] or p["paused"]:
            raise Conflict("module_disabled_or_paused")
        local = datetime.fromtimestamp(now, ZoneInfo(p["timezone"]))
        if not p["start_hour"] <= local.hour < p["end_hour"]:
            raise Conflict("outside_working_hours")
        if job["kind"] in WRITES:
            if not p["live_write"] or not p["brand_mandate"]:
                raise Conflict("publication_mandate_missing")
            if job["review_hash"] != job["input_hash"] or job["policy_revision"] != current["revision"]:
                raise Conflict("current_revision_review_required")
            if not p["actor_id"] or not 0 <= now - p["actor_verified_at"] <= 86400:
                raise Conflict("fresh_actor_verification_required")
            if p["credential_hash"] != self.store.credential_hash(self.config.token):
                raise Conflict("credential_changed_requires_actor_verification")
            if not p["facts"] or not p["facts_source"] or not 0 <= now - p["facts_verified_at"] <= 30 * 86400:
                raise Conflict("facts_refresh_required")
            validate_text(payload.get("text"), p["allowed_urls"])
            if re.search(r"(?<!\w)@\w+", payload["text"]):
                raise Conflict("unsolicited_mention_not_supported")
            if payload.get("media_ids"):
                if not p["media_enabled"]:
                    raise Conflict("media_capability_not_accepted")
                media = {r["key"]: r["payload"] for r in self.store.records(job["site"], "media")}
                for mid in payload["media_ids"]:
                    if mid not in media or media[mid].get("actor_id") != p["actor_id"] or media[mid]["expires_at"] <= now:
                        raise Conflict("media_expired_or_wrong_actor")
            if job["kind"] == "thread":
                parent = next((r for r in self.store.records(job["site"], "published")
                               if r["key"] == payload.get("parent_id")), None)
                if not parent or parent["payload"]["actor_id"] != p["actor_id"]:
                    raise Conflict("own_thread_parent_required")
            if job["kind"] in {"reply", "dm"}:
                if not p["ai_reply_approval"] or not p[f"{job['kind']}_enabled"]:
                    raise Conflict("x_approval_or_channel_capability_missing")
                source = next((r for r in self.store.records(job["site"], "inbound")
                               if r["key"] == payload.get("interaction_id")), None)
                if not source or not source["payload"].get("optin_evidence") or source["payload"].get("opted_out"):
                    raise Conflict("initiated_interaction_evidence_required")
                if job["kind"] == "reply" and source["key"] != payload.get("parent_id"):
                    raise Conflict("reply_must_target_original_interaction")
                if job["kind"] == "dm" and source["payload"].get("dm_requested") is not True:
                    raise Conflict("dm_request_required")
                if source["payload"].get("author_id") != payload.get("recipient_id"):
                    raise Conflict("recipient_mismatch")
                if self.store.records(job["site"], f"answered:{source['key']}"):
                    raise Conflict("interaction_already_answered")
        elif job["kind"] in READS and not p["live_read"]:
            raise Conflict("live_read_disabled")
        return p

    def schedule_day(self, site, now=None):
        now = datetime.fromtimestamp(now or time.time(), UTC)
        p = self.store.profile(site)["profile"]
        zone = ZoneInfo(p["timezone"])
        local = now.astimezone(zone)
        day = local.date().isoformat()
        start = datetime.combine(local.date(), datetime.min.time(), zone)
        times = {"plan": p["start_hour"], "research": min(p["start_hour"] + 2, p["end_hour"] - 1),
                 "summary": p["end_hour"] - 1}
        created = []
        for kind, hour in times.items():
            stamp = (start + timedelta(hours=hour)).timestamp()
            if kind == "research":
                for index, query in enumerate(p["queries"][:2]):
                    created.append(self.store.enqueue(site, kind, f"day:{day}:research:{index}",
                                                       {"query": query}, stamp))
            else:
                created.append(self.store.enqueue(site, kind, f"day:{day}:{kind}", {}, stamp))
        # Hourly inbound work is created only when opted into read mode; no empty polling by default.
        if p["live_read"] and p["actor_id"]:
            created.append(self.store.enqueue(site, "mentions", f"day:{day}:mentions",
                                               {}, (start + timedelta(hours=min(p["start_hour"] + 4, p["end_hour"] - 1))).timestamp()))
        return {"scheduled": len(created), "day": day, "timezone": p["timezone"]}

    async def run_once(self, site):
        owner = str(uuid4())
        job = self.store.claim(site, owner)
        if not job:
            return {"state": "idle"}
        dispatched = False
        try:
            p = self.gate(job, time.time())
            if job["kind"] in {"plan", "draft", "summary", "qualify"}:
                if not self.config.codex_enabled:
                    raise Conflict("codex_generation_disabled")
                model_calls = len(self.store.records(site, "model_call", 1000))
                calls_today = sum(1 for r in self.store.records(site, "model_call", 1000)
                                  if datetime.fromtimestamp(r["created"], UTC).date() == datetime.now(UTC).date())
                if calls_today + (2 if job["kind"] == "draft" else 1) > self.config.codex_calls_per_day:
                    raise Conflict("codex_daily_call_limit")
                evidence = [r["payload"] for r in self.store.records(site, "signal", 8)]
                if job["kind"] == "summary":
                    evidence = [{"spend": self.store.spending(site), "metrics": self.store.records(site, "metric"),
                                 "outcomes": self.store.records(site, "outcome")}]
                if job["kind"] == "qualify":
                    source = next((r["payload"] for r in self.store.records(site, "signal")
                                   if r["key"] == job["payload"].get("signal_id")), None)
                    if not source:
                        raise Conflict("qualification_requires_scoped_actual_signal")
                    evidence = [source]
                # Reserve logical model calls before launch; timeout still consumes its call quota.
                for n in range(2 if job["kind"] == "draft" else 1):
                    self.store.record(site, "model_call", f"{job['id']}:{n}", {"job": job["id"], "number": model_calls + n})
                result = await self.agent_factory().run(job["kind"], p, job["payload"], evidence)
                current = self.store.profile(site)
                if current["revision"] != job["policy_revision"] or current["profile"]["paused"]:
                    raise Conflict("context_changed_during_generation")
                self.store.record(site, job["kind"], job["id"], {**result, "facts_hash": fingerprint(p["facts"]),
                                  "instruction_hash": fingerprint((Path(__file__).resolve().parents[1] /
                                                                  "instructions/AGENT.md").read_text(encoding="utf-8"))})
                if job["kind"] == "plan":
                    # Plan produces private briefs. It cannot change policy, spend or publish.
                    for i, idea in enumerate(result["output"]["ideas"][:p["max_posts_per_day"]]):
                        self.store.enqueue(site, "draft", f"{job['key']}:draft:{i}", idea, time.time())
                if job["kind"] == "draft":
                    draft, review = result["draft"], result["review"]
                    valid = review["approved"] and not review["unsupported_claims"]
                    valid = valid and all(type(i) is int and 0 <= i < len(p["facts"]) for i in draft["fact_indices"])
                    if valid:
                        validate_text(draft["text"], p["allowed_urls"])
                    if valid and p["auto_publish"]:
                        scheduled = self.store.enqueue(site, "post", f"auto:{job['id']}",
                                                       {"text": draft["text"], "draft_id": job["id"]}, time.time())
                        post = next(r for r in self.store.jobs(site) if r["id"] == scheduled["id"])
                        self.store.review(site, post["id"], post["input_hash"], True, "Revision-bound independent Codex review")
                self.store.finish(job, "completed", {"kind": job["kind"], "result": result})
                return {"state": "completed", "kind": job["kind"], "job_id": job["id"]}
            if job["kind"] == "metrics":
                published = {r["key"] for r in self.store.records(site, "published")}
                if job["payload"].get("post_id") not in published:
                    raise Conflict("metrics_requires_own_published_post")
            if job["kind"] == "mentions":
                old = self.store.records(site, "cursor", 1)
                if old:
                    cursor = old[0]["payload"]
                    job["payload"] = {**job["payload"], **{k: cursor[k] for k in ("since_id", "pagination_token") if cursor.get(k)}}
            dispatched = True
            receipt = await self.paid(site, job["kind"], job["payload"], job["id"], job["id"], job)
            if receipt.uncertain or receipt.charged_micro is None:
                self.store.finish(job, "uncertain", {"status": receipt.status, "call_id": receipt.call_id})
                return {"state": "uncertain"}
            if not receipt.ok:
                if job["kind"] in WRITES and 200 <= receipt.status < 300:
                    current = self.store.profile(site)
                    self.store.update_profile({**current["profile"], "paused": True}, current["revision"], "Ambiguous write success receipt")
                    self.store.finish(job, "uncertain", {"status": receipt.status, "call_id": receipt.call_id})
                    return {"state": "uncertain"}
                self.store.finish(job, "blocked", {"status": receipt.status, "reason": "provider_rejected"})
                return {"state": "blocked", "status": receipt.status}
            data = receipt.body.get("data", [])
            if job["kind"] in {"research", "mentions"}:
                if not isinstance(data, list):
                    raise Conflict("provider_posts_schema_invalid")
                for row in data:
                    if not isinstance(row, dict) or not str(row.get("id", "")).isdigit():
                        raise Conflict("provider_post_id_invalid")
                    existing = next((r["payload"] for r in self.store.records(site, "inbound") if r["key"] == row["id"]), {})
                    self.store.record(site, "inbound" if job["kind"] == "mentions" else "signal", row["id"],
                        {**row, "source": job["kind"], "call_id": receipt.call_id,
                         "url": f"https://x.com/i/status/{row['id']}",
                         "optin_evidence": existing.get("optin_evidence"), "opted_out": existing.get("opted_out", False),
                         "dm_requested": existing.get("dm_requested", False),
                         "contactability": existing.get("contactability", "unverified"), "received_at": time.time()})
                if job["kind"] == "mentions":
                    prior = old[0]["payload"] if old else {}
                    highest = max([int(r["id"]) for r in data] + [int(prior.get("pending_highest", prior.get("since_id", "0")))])
                    continuation = receipt.body.get("meta", {}).get("next_token")
                    cursor = {"since_id": prior.get("since_id"), "pagination_token": continuation,
                              "pending_highest": str(highest)} if continuation else {"since_id": str(highest) if highest else None}
                    self.store.record(site, "cursor", "mentions", cursor)
                    # A bounded next poll resumes the pagination; never advance since_id across missing pages.
            elif job["kind"] in WRITES:
                sent_id = data.get("dm_event_id") if isinstance(data, dict) and job["kind"] == "dm" else data.get("id") if isinstance(data, dict) else None
                if not str(sent_id or "").isdigit():
                    self.store.finish(job, "uncertain", {"reason": "write_receipt_invalid", "call_id": receipt.call_id})
                    return {"state": "uncertain"}
                self.store.record(site, "sent_dm" if job["kind"] == "dm" else "published", sent_id, {**data, "actor_id": p["actor_id"],
                                  "url": None if job["kind"] == "dm" else f"https://x.com/{p['actor_handle']}/status/{sent_id}",
                                  "job_id": job["id"], "call_id": receipt.call_id})
                if job["kind"] in {"reply", "dm"}:
                    self.store.record(site, f"answered:{job['payload']['interaction_id']}", job["id"],
                                      {"sent_id": sent_id, "state": "accepted"})
            else:
                if not isinstance(data, dict) or data.get("author_id") != p["actor_id"]:
                    raise Conflict("metrics_actor_mismatch")
                self.store.record(site, "metric", job["payload"]["post_id"], {"data": data, "call_id": receipt.call_id})
            self.store.finish(job, "completed", {"status": receipt.status, "call_id": receipt.call_id,
                              "charged_micro": receipt.charged_micro, "resource_count": len(data) if isinstance(data, list) else 1})
            return {"state": "completed", "kind": job["kind"], "job_id": job["id"]}
        except (ValueError, RuntimeError, KeyError) as error:
            # Controlled errors only; raw provider/CLI logs are never echoed to UI.
            controlled = {"codex_cli_not_installed", "codex_lab_timeout", "codex_lab_schema_rejected",
                          "codex_lab_failed_no_private_log", "unexpected_cli_tool_execution", "lab_call_limit"}
            reason = str(error) if isinstance(error, Conflict) or str(error) in controlled else type(error).__name__
            if str(error) in controlled:
                current = self.store.profile(site)
                self.store.update_profile({**current["profile"], "paused": True}, current["revision"], "Codex capability failed; no automatic repeat")
            unknown = dispatched and job["kind"] in WRITES and reason == "transport_outcome_unknown"
            state = "uncertain" if unknown else "blocked"
            self.store.finish(job, state, {"reason": reason})
            return {"state": state, "reason": reason}

    async def upload(self, site, asset_id, alt):
        p = self.store.profile(site)["profile"]
        if not p["media_enabled"] or not p["live_write"]:
            raise Conflict("media_transport_not_enabled")
        if not re.fullmatch(r"[a-z0-9-]{3,100}\.(png|jpg|webp)", asset_id) or not 5 <= len(alt) <= 900:
            raise Conflict("invalid_media_input")
        asset_root = (self.config.data / "assets").resolve()
        path = (asset_root / asset_id).resolve()
        if not path.is_relative_to(asset_root):
            raise Conflict("asset_path_outside_private_store")
        blob = path.read_bytes()
        if not 0 < len(blob) <= 4_000_000:
            raise Conflict("media_size_limit")
        manifest = next((r["payload"] for r in self.store.records(site, "asset") if r["key"] == asset_id), None)
        sha = hashlib.sha256(blob).hexdigest()
        if not manifest or manifest.get("sha256") != sha or manifest.get("rights_verified") is not True or not manifest.get("source"):
            raise Conflict("exact_asset_rights_manifest_required")
        if not p["brand_mandate"] or not p["actor_id"] or not 0 <= time.time() - p["actor_verified_at"] <= 86400:
            raise Conflict("fresh_actor_and_media_mandate_required")
        if p["credential_hash"] != self.store.credential_hash(self.config.token):
            raise Conflict("credential_changed_requires_actor_verification")
        owner = str(uuid4())
        account = self.store.acquire_account(site, owner)
        try:
            return await self._upload_transport(site, asset_id, alt, p, blob, sha)
        finally:
            self.store.release_account(account, owner)

    async def _upload_transport(self, site, asset_id, alt, p, blob, sha):
        result = await self.paid(site, "media_upload", {"media": base64.b64encode(blob).decode(),
            "media_category": "tweet_image"}, "media:" + asset_id, str(uuid4()))
        if not result.ok:
            raise Conflict("media_upload_failed")
        data = result.body.get("data", {})
        mid = data.get("id")
        if not str(mid or "").isdigit() or data.get("processing_info", {}).get("state") not in (None, "succeeded"):
            raise Conflict("media_not_ready")
        alternative = await self.paid(site, "media_alt", {"media_id": mid, "alt": alt}, "media:" + asset_id, str(uuid4()))
        if not alternative.ok or alternative.body.get("data", {}).get("id") != mid:
            raise Conflict("media_alt_failed")
        self.store.record(site, "media", mid, {"asset_id": asset_id, "alt": alt, "actor_id": p["actor_id"],
                          "expires_at": time.time() + int(data.get("expires_after_secs", 3600)),
                          "source_hash": sha})
        return {"media_id": mid}
