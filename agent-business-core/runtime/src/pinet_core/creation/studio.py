"""Fixed shared-studio private intake; no customer-selected paths, approvals or provider calls."""
import asyncio
import json
import os
import shutil
from pathlib import Path
from uuid import UUID

from sqlalchemy import select

from ..tasks.codex_transport import RunnerError, stop_process
from .adapter import ROOT, RUNTIME
from .renderer import normalize
from .service import digest


def configuration():
    node = shutil.which("node")
    script = ROOT / "content-studio/scripts/customer-creation-intake.mjs"
    network = ROOT.parent / "dovanos-memorycasting/config/niche-network.json"
    artifacts = RUNTIME / "artifacts"
    if not node or not script.is_file() or not network.is_file() or not artifacts.is_dir():
        raise RunnerError("studio_unavailable")
    if artifacts.resolve() != artifacts.absolute():
        raise RunnerError("studio_unavailable")
    # Node only needs its native environment and the fixed companion configuration.
    keys = {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATHEXT", "COMSPEC"}
    environment = {key: value for key, value in os.environ.items() if key.upper() in keys}
    environment["STUDIO_NETWORK_SETTINGS"] = str(network.resolve())
    environment["STUDIO_PUBLIC_CORE_DIR"] = str(network.resolve().parents[1])
    return Path(node).resolve(), script, artifacts, environment


async def _execute(arguments, payload, environment, still_authorized, seconds):
    async def bounded(stream, limit):
        chunks, size = [], 0
        while chunk := await stream.read(8192):
            size += len(chunk)
            if size > limit:
                raise RunnerError("studio_output_limit")
            chunks.append(chunk)
        return b"".join(chunks)

    async def monitor():
        while True:
            if not await still_authorized():
                raise RunnerError("authorization_revoked")
            await asyncio.sleep(1)

    if seconds <= 0 or not await still_authorized():
        raise RunnerError("authorization_revoked" if seconds > 0 else "run_timeout")
    try:
        process = await asyncio.create_subprocess_exec(*map(str, arguments), cwd=ROOT, env=environment,
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    except OSError:
        raise RunnerError("studio_unavailable") from None
    tasks = []
    try:
        tasks = [asyncio.create_task(bounded(process.stdout, 1048576)),
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
            await process.wait()
        if not await still_authorized():
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
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await stop_process(process)


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
