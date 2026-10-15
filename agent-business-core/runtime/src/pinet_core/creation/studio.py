"""Fixed shared-studio private intake; no customer-selected paths, approvals or provider calls."""
import asyncio
import json
import os
import re
import shutil
from pathlib import Path
from uuid import UUID

from sqlalchemy import select

from ..config import settings
from ..tasks.codex_transport import RunnerError, stop_process
from .adapter import ROOT, RUNTIME
from .renderer import normalize
from .service import digest


def configuration():
    node = shutil.which("node")
    script = ROOT / "content-studio/scripts/customer-creation-intake.mjs"
    # Deployment-owned paths; never taken from a customer or model payload.
    # Separate worktrees use the same configuration documented for the studio.
    network_setting = os.environ.get("STUDIO_NETWORK_SETTINGS")
    public_setting = os.environ.get("PINET_PUBLIC_CORE_PATH")
    if (network_setting is not None and (not network_setting or not Path(network_setting).is_absolute())
            or public_setting is not None and (not public_setting or not Path(public_setting).is_absolute())):
        raise RunnerError("studio_unavailable")
    public = (Path(public_setting) if public_setting is not None else
              Path(network_setting).parent.parent if network_setting is not None else
              ROOT.parent / "dovanos-memorycasting")
    network = Path(network_setting) if network_setting is not None else public / "config/niche-network.json"
    configured = settings().customer_content_artifacts_root
    artifacts = Path(configured) if configured else RUNTIME / "artifacts"
    if configured and (not artifacts.is_absolute() or artifacts.name != "artifacts"
                       or artifacts.parent.name != "runtime"):
        raise RunnerError("studio_unavailable")
    if (not node or not script.is_file() or not network.is_file() or not public.is_dir()
            or network.resolve().parent.parent != public.resolve() or not artifacts.is_dir()):
        raise RunnerError("studio_unavailable")
    if artifacts.resolve() != artifacts.absolute():
        raise RunnerError("studio_unavailable")
    # Node only needs its native environment and the fixed companion configuration.
    keys = {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATHEXT", "COMSPEC"}
    environment = {key: value for key, value in os.environ.items() if key.upper() in keys}
    environment["STUDIO_NETWORK_SETTINGS"] = str(network.resolve())
    environment["STUDIO_PUBLIC_CORE_DIR"] = str(public.resolve())
    return Path(node).resolve(), script, artifacts, environment


async def preflight_dependencies(still_authorized):
    """Import maintained Node helpers before admitting any paid supervisor work.

    Uses the existing bounded transport and deployment-owned companion settings;
    the fixed helper never initializes a studio, reads a customer case or starts work.
    """
    node, _, _, environment = configuration()
    script = ROOT / "content-studio/scripts/customer-content-preflight.mjs"
    if not script.is_file():
        raise RunnerError("studio_dependencies_unavailable")
    value = await _execute([node, script], {"version": "customer-content-preflight.v1"},
                           environment, still_authorized, 10)
    expected = {"version", "state", "modules", "sharpVersion", "providerCalls", "initialization", "server"}
    if (not isinstance(value, dict) or set(value) != expected
            or value.get("version") != "customer-content-preflight.v1" or value.get("state") != "ready"
            or value.get("modules") != ["intake", "writer", "workflow", "model", "sharp"]
            or type(value.get("providerCalls")) is not int or value["providerCalls"] != 0
            or value.get("initialization") != "not-performed" or value.get("server") != "not-started"
            or not isinstance(value.get("sharpVersion"), str)
            or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-zA-Z0-9.-]+)?", value["sharpVersion"])):
        raise RunnerError("studio_dependencies_unavailable")
    return value


async def _execute(arguments, payload, environment, still_authorized, seconds, *, output_limit=1048576):
    # Only fixed server-owned media reads opt into the larger bounded payload.
    # Model/intake/writer callers retain their existing one-MiB default.
    if type(output_limit) is not int or not 1048576 <= output_limit <= 20 * 1048576:
        raise RunnerError("studio_output_limit")
    async def bounded(stream, limit):
        chunks, size = [], 0
        while chunk := await stream.read(8192):
            size += len(chunk)
            if size > limit:
                raise RunnerError("studio_output_limit")
            chunks.append(chunk)
        return b"".join(chunks)

    finishing = asyncio.Event()

    async def monitor():
        while not finishing.is_set():
            if not await still_authorized():
                raise RunnerError("authorization_revoked")
            try:
                await asyncio.wait_for(finishing.wait(), 1)
            except TimeoutError:
                pass

    if seconds <= 0 or not await still_authorized():
        raise RunnerError("authorization_revoked" if seconds > 0 else "run_timeout")
    try:
        process = await asyncio.create_subprocess_exec(*map(str, arguments), cwd=ROOT, env=environment,
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    except OSError:
        raise RunnerError("studio_unavailable") from None
    tasks = []
    try:
        tasks = [asyncio.create_task(bounded(process.stdout, output_limit)),
                 asyncio.create_task(bounded(process.stderr, 16384)), asyncio.create_task(monitor())]
        async with asyncio.timeout(seconds):
            process.stdin.write(json.dumps(payload, ensure_ascii=False).encode())
            await process.stdin.drain()
            process.stdin.close()
            pending = set(tasks)
            while len(pending) > 1:
                done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
                for task in done:
                    task.result()
            raw, errors = tasks[0].result(), tasks[1].result()
            # The callback may borrow the caller's SQL Session. Successful EOF must
            # drain its current query, then authorize serially, never cancel it.
            finishing.set()
            await asyncio.shield(tasks[2])
            await process.wait()
            final_authorization = asyncio.create_task(still_authorized())
            tasks.append(final_authorization)
            if not await asyncio.shield(final_authorization):
                raise RunnerError("authorization_revoked")
        if process.returncode:
            try:
                code = json.loads(errors).get("code", "studio_intake_failed")
            except (ValueError, TypeError):
                code = "studio_intake_failed"
            # Preserve specific trusted intake codes privately; never echo stderr or customer data.
            import re
            raise RunnerError(code if isinstance(code, str) and re.fullmatch("[a-z_]{1,80}", code) else "studio_intake_failed")
        return json.loads(raw)
    except TimeoutError:
        raise RunnerError("studio_timeout") from None
    except (ValueError, OSError):
        raise RunnerError("studio_intake_failed") from None
    finally:
        finishing.set()

        async def cleanup():
            for task in tasks:
                if not task.done():
                    task.cancel()
            try:
                await stop_process(process)
            finally:
                await asyncio.gather(*tasks, return_exceptions=True)

        # Repeated caller cancellation must not abandon a callback's cancellation
        # cleanup or leave a child using a scope that the caller is about to close.
        cleanup_task = asyncio.create_task(cleanup())
        cancelled = False
        while not cleanup_task.done():
            try:
                await asyncio.shield(cleanup_task)
            except asyncio.CancelledError:
                cancelled = True
        cleanup_task.result()
        if cancelled:
            raise asyncio.CancelledError


async def import_draft(draft, *, creation_id, revision, canonical_host, still_authorized, seconds=20):
    if not canonical_host:
        raise RunnerError("studio_domain_required")
    identity = str(UUID(creation_id))
    if not isinstance(revision, int) or isinstance(revision, bool) or revision < 1:
        raise RunnerError("studio_intake_failed")
    draft = normalize(draft)
    node, script, artifacts, environment = configuration()
    revision_dir = artifacts / "customer-content" / identity / f"revision-{revision}"
    # Business contact/facts cannot be inferred from generated claims or an account email.
    value = await _execute([node, script], {"creationId": identity, "acceptedRevision": revision,
        "sourceHash": digest(draft), "draft": draft, "canonicalHost": canonical_host,
        "artifactsRoot": str(artifacts), "dataDir": str(revision_dir / "data"), "outputDir": str(revision_dir / "output"),
        "verifiedFacts": [], "knownContact": {"email": "", "phone": ""}, "operatorName": ""},
        environment, still_authorized, min(20, seconds))
    if (not isinstance(value, dict) or value.get("version") != "customer-content-intake.v1"
            or value.get("creationId") != identity or value.get("acceptedRevision") != revision
            or value.get("sourceHash") != digest(draft) or value.get("state") != "private-draft-imported"
            or value.get("fullF1") != "UNVERIFIED" or value.get("launch") != "UNVERIFIED"
            or value.get("deployment") != "not-performed"):
        raise RunnerError("studio_intake_failed")
    return value


async def projection(tx, creation):
    """An explicit historical intake observation, never an inferred live publication state."""
    from ..control.routes import ControlError
    from .content_wire import ContentView
    from .models import Job, Revision
    revision = await tx.scalar(select(Revision).where(Revision.creation_id == creation.id,
        Revision.sequence == creation.current_revision))
    job = await tx.get(Job, revision.job_id) if revision else None
    intake = (job.usage or {}).get("content_intake") if job else None
    view = {"creation_id": creation.id, "current_revision": creation.current_revision or None,
        "active_job_id": creation.active_job_id, "creation_updated_at": creation.updated_at,
        "import_job_id": job.id if intake else None, "source_revision": revision.source_revision if revision else None,
        "candidate_sha256": revision.material_hash if revision else None, "state": "not_imported",
        "failure_code": None, "observed_at": None, "observation_scope": "intake_snapshot",
        "content_plan_state": "not_provided", "scheduling": "UNVERIFIED", "full_f1_status": "UNVERIFIED",
        "launch_status": "UNVERIFIED", "plan": (revision.payload.get("content_plan") or []) if revision else [],
        "pages": [], "plan_issues": []}
    try:
        if intake and intake.get("state") == "failed":
            view.update(state="intake_failed", failure_code=intake["code"])
        elif intake:
            if (intake["version"] != "customer-content-intake.v1" or intake["state"] != "private-draft-imported"
                    or intake["creationId"] != creation.id or intake["acceptedRevision"] != creation.current_revision
                    or intake["sourceHash"] != revision.material_hash or digest(revision.payload) != revision.material_hash
                    or intake["canonicalHost"] != creation.canonical_host or intake["fullF1"] != "UNVERIFIED"
                    or intake["launch"] != "UNVERIFIED" or intake["deployment"] != "not-performed"):
                raise ValueError("Invalid intake identity")
            paths = {item["pageId"]: item["path"] for item in intake["pageMappings"]}
            pages = [{"page_id": page["pageId"], "path": paths[page["pageId"]], "title": page["title"],
                "revision_sha256": page["revisionHash"], "state": page["state"],
                "has_approved_revision": page["hasApprovedRevision"], "review_current": page["reviewCurrent"],
                "blocker_count": len(page["blockers"]), "blockers": page["blockers"][:12],
                "hidden_blocker_count": max(0, len(page["blockers"]) - 12)} for page in intake["workflow"]["pages"]]
            view.update(state="private_draft_imported", observed_at=intake["importedAt"], pages=pages,
                content_plan_state=intake["contentPlanState"].replace("-", "_"), plan_issues=intake["planIssues"])
        return ContentView.model_validate(view).model_dump(mode="json")
    except (ValueError, TypeError, KeyError):
        raise ControlError(503, "invalid_content_source") from None
