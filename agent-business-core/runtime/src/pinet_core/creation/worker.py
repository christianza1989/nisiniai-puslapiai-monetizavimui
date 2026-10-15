import asyncio

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from ..config import settings
from ..control.models import Session, User
from ..control.routes import ControlError, scope
from ..models import new_id, utcnow
from . import adapter, renderer
from .models import Artifact, Creation, Job, Revision
from .service import ACTIVE, authority, binding, digest, event, fail, job_history_schema_ready, lease_deadline


async def locked(tx, job_id, user_id):
    # Same order as API/reset: current identity -> session -> creation -> job.
    user = await tx.scalar(select(User).where(User.id == user_id).with_for_update())
    job = await tx.get(Job, job_id)
    if not user or not job:
        return None, None
    await tx.scalar(select(Session).where(Session.id == job.session_id).with_for_update(read=True))
    creation = await tx.scalar(select(Creation).where(Creation.id == job.creation_id).with_for_update())
    job = await tx.scalar(select(Job).where(Job.id == job_id).with_for_update().execution_options(populate_existing=True))
    return creation, job


async def context_for(tx, creation, job):
    revisions = list(await tx.scalars(select(Revision).where(Revision.creation_id == creation.id).order_by(Revision.sequence)))
    prior = revisions[-1].payload if revisions else None
    projection = None
    if prior:
        prior, projection = renderer.context_projection(prior)
    jobs = list(reversed(list(await tx.scalars(select(Job).where(Job.creation_id == creation.id)
                                             .order_by(Job.sequence.desc()).limit(20)))))
    history = [{"role": "user", "content": j.message, "base_revision": j.base_revision} for j in jobs]
    recommendations = []
    try:
        from ..domain_catalogue import DomainCatalogue
        candidates = DomainCatalogue.default().recommend(creation.idea[:120], limit=5)["items"]
        recommendations = [{"domain": i["domain"]["domain"], "category": i["domain"]["category_label"],
                             "availability": "unknown", "reason": i["reason"]} for i in candidates]
    except ImportError:
        pass  # Domain catalogue is an optional separate source integration, not fabricated candidates.
    from ..business_discovery.service import approved_build_context
    approved_plan = await approved_build_context(tx, creation)
    return {"approved_business_plan": approved_plan,
            "display_name": creation.display_name, "idea": creation.idea, "canonical_host": creation.canonical_host,
            "current_date": utcnow().date().isoformat(), "locale": "lt-LT", "timezone": "Europe/Vilnius",
            "history": history, "current_draft": prior, "feedback": job.message, "base_revision": job.base_revision,
            "prior_context_projection": projection, "previous_artifacts_preserved": bool(revisions),
            "permitted_web_actions": 2 if revisions else 6,
            "domain_candidates": recommendations, "domain_ownership_verified": False,
            "scope": "private_business_and_website_draft", "expected_instruction_hash": job.instruction_hash}


async def claim(*, team_enabled=True, creation_id=None):
    cfg = settings()
    if not cfg.creation_enabled or not cfg.creation_runner_enabled or cfg.control_mode != "local":
        return None
    async with scope() as discovery:
        if not await job_history_schema_ready(discovery):
            raise adapter.RunnerError("runner_unavailable")
        await discovery.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                                {"k": "creation-worker:" + cfg.environment})
        candidates = (await discovery.execute(text("SELECT * FROM control_creation_candidates(:e)"), {"e": cfg.environment})).mappings().all()
        global_candidates = candidates
        if creation_id is not None:
            from ..site_build.selectors import selected
            candidates = await selected(discovery, "creation", cfg.environment, creation_id)
        # One actual provider process across cooperating workers, including a just-revoked lease.
        if any(row["status"] == "running" and row["lease_until"] and row["lease_until"] > utcnow()
               for row in [*global_candidates, *candidates]):
            return None
        for candidate in candidates:
            async with scope(user=candidate["user_id"]) as tx:
                creation, job = await locked(tx, candidate["id"], candidate["user_id"])
                if not creation or not job or job.status not in ACTIVE:
                    continue
                if creation_id is not None and creation.id != creation_id:
                    continue
                from . import execution_profiles as profiles
                profile_name = await profiles.ensure_current(tx, "creation", job)
                if job.status == "running":
                    await fail(tx, creation, job, "worker_interrupted")
                    continue
                if not await authority(tx, job):
                    await fail(tx, creation, job, "authorization_revoked")
                    continue
                instruction_hash = adapter.team_instruction_hash() if team_enabled else adapter.instructions()[1]
                job.status, job.run_id, job.lease_until = "running", new_id(), lease_deadline()
                job.instruction_hash, job.model, job.adapter_revision = instruction_hash, adapter.pipeline_model("creator"), (
                    "codex-business-team.v1" if team_enabled else adapter.ADAPTER_REVISION)
                creation.status, creation.stage = "running", "drafting"
                await event(tx, creation, job, "AI rengia verslo pasiūlymą ir svetainės juodraštį.")
                try:
                    context = await context_for(tx, creation, job)
                except ControlError as error:
                    if error.code != "invalid_discovery_source_context":
                        raise
                    await fail(tx, creation, job, error.code)
                    continue
                return {"job_id": job.id, "user_id": job.user_id, "run_id": job.run_id,
                        "creation_id": creation.id, "revision": creation.current_revision + 1,
                        "execution_profile": profile_name,
                        "context": context}
    return None


async def source_matches(tx, creation, expected):
    from ..business_discovery.service import approved_build_context
    try:
        current = await approved_build_context(tx, creation)
        context = current.get("sourceContext") if isinstance(current, dict) else None
        return bool(isinstance(context, dict) and context.get("contextSha256") == expected)
    except (ControlError, ValueError, TypeError):
        return False


async def heartbeat(job_id, user_id, run_id, *, expected_source_sha256=None):
    async with scope(user=user_id) as tx:
        creation, job = await locked(tx, job_id, user_id)
        if not creation or not job or job.status != "running" or job.run_id != run_id:
            return False
        from . import execution_profiles as profiles
        try:
            await profiles.ensure_current(tx, "creation", job)
        except adapter.RunnerError:
            return False
        if not job.lease_until or job.lease_until <= utcnow() or not await authority(tx, job):
            await fail(tx, creation, job, "authorization_revoked")
            return False
        if expected_source_sha256 is not None and not await source_matches(tx, creation, expected_source_sha256):
            await fail(tx, creation, job, "source_context_changed")
            return False
        job.lease_until = lease_deadline()
        return True


async def execute_once(runner=None, *, role_runner=None, intake_runner=None, creation_id=None):
    # Keep a database mutex until the owned child is stopped and completion is fenced.
    # An API cancellation can clear task state but cannot release this execution barrier.
    async with scope() as execution_scope:
        acquired = await execution_scope.scalar(text("SELECT pg_try_advisory_xact_lock(hashtextextended(:k,0))"),
                                               {"k": "creation-execution:" + settings().environment})
        if not acquired:
            return False
        return await _execute_once(runner, role_runner=role_runner, intake_runner=intake_runner,
                                   creation_id=creation_id)


async def _execute_once(runner=None, *, role_runner=None, intake_runner=None, creation_id=None):
    # Explicit single-run injection is an existing offline test seam, never a customer/runtime switch.
    claimed = await claim(team_enabled=runner is None, creation_id=creation_id)
    if not claimed:
        return False
    result, receipt, failure, outputs = None, {}, None, []
    frozen_source = (claimed["context"].get("approved_business_plan") or {}).get("sourceContext")
    if frozen_source is not None:
        from ..business_discovery.source_context import validate
        frozen_source = validate(frozen_source, creation_id=claimed["creation_id"])
    source_sha = frozen_source["contextSha256"] if frozen_source is not None else None
    try:
        heartbeat_options = {"expected_source_sha256": source_sha} if source_sha is not None else {}
        authorized = lambda: heartbeat(claimed["job_id"], claimed["user_id"], claimed["run_id"], **heartbeat_options)  # noqa: E731
        if runner:
            result, receipt = await runner(claimed["context"], authorized)
        else:
            from .team import run
            result, receipt = await run(claimed, authorized, role_runner)
        result = renderer.normalize(result)
        if source_sha is not None:
            receipt["source_context_sha256"] = source_sha
        from . import language_mode
        receipt["language_screening"] = language_mode.draft_observation(result)
        receipt["language_review_mode"] = language_mode.mode()
        if intake_runner or runner is None and role_runner is None:
            from .studio import import_draft
            from .team import monotonic
            remaining = receipt.get("deadline_monotonic", monotonic() + 20) - monotonic()
            try:
                intake_options = {"source_context": frozen_source} if frozen_source is not None else {}
                if source_sha is not None and not await authorized():
                    raise adapter.RunnerError("authorization_revoked", receipt)
                receipt["content_intake"] = await (intake_runner or import_draft)(result,
                    creation_id=claimed["creation_id"], revision=claimed["revision"],
                    canonical_host=claimed["context"]["canonical_host"], still_authorized=authorized, seconds=remaining,
                    **intake_options)
                if source_sha is not None and not await authorized():
                    raise adapter.RunnerError("authorization_revoked", receipt)
            except adapter.RunnerError as error:
                if error.code in {"authorization_revoked", "run_timeout"}:
                    raise
                # A usable accepted draft is distinct from the shared intake's readiness.
                # Failed/partial files remain private and the customer sees an explicit dependency.
                receipt["content_intake"] = {"version": "customer-content-intake.v1", "state": "failed", "code": error.code}
        outputs = renderer.artifacts(result, creation_id=claimed["creation_id"], revision=claimed["revision"], receipt=receipt)
    except adapter.RunnerError as error:
        failure = error.code
        receipt = error.receipt or receipt
        if failure == "language_quality_failed":
            receipt["language_screening"] = {"status": "FAIL", "check": "obvious_language_drift.v1"}
    except Exception:
        failure = "provider_error"
    async with scope(user=claimed["user_id"]) as tx:
        creation, job = await locked(tx, claimed["job_id"], claimed["user_id"])
        if not creation or not job:
            return True  # Current revocation hides the data; no late artifact can be published.
        job.usage, job.cost_microusd = receipt or None, None
        if job.status != "running" or job.run_id != claimed["run_id"]:
            return True
        from . import execution_profiles as profiles
        try:
            await profiles.ensure_current(tx, "creation", job)
        except adapter.RunnerError:
            failure = "instructions_changed"
        if not await authority(tx, job):
            failure = "authorization_revoked"
        if not job.lease_until or job.lease_until <= utcnow():
            failure = "worker_interrupted"
        if job.base_revision != creation.current_revision:
            failure = "stale_revision"
        if receipt.get("deadline_monotonic") is not None:
            from .team import monotonic
            if monotonic() >= receipt["deadline_monotonic"]:
                failure = "run_timeout"
        if failure:
            await fail(tx, creation, job, failure)
            return True
        if source_sha is not None and not await source_matches(tx, creation, source_sha):
            await fail(tx, creation, job, "source_context_changed")
            return True
        creation.stage = "validation"
        await event(tx, creation, job, ("Patikrinta juodraščio struktūra; kalbos patikra laikinai išjungta. Ruošiami peržiūros failai."
            if receipt.get("language_review_mode") == "paused_local_pilot" else
            "Patikrinta juodraščio struktūra ir kalbų maišymasis; ruošiami peržiūros failai. Pilnas redakcinis priėmimas dar neatliktas."))
        sequence = creation.current_revision + 1
        revision = Revision(id=new_id(), creation_id=creation.id, job_id=job.id, sequence=sequence, payload=result,
            material_hash=digest(result), source_revision=job.source_revision, **binding(creation))
        tx.add(revision)
        await tx.flush()
        for output in outputs:
            tx.add(Artifact(creation_id=creation.id, revision_id=revision.id, revision=sequence, **binding(creation), **output))
        creation.current_revision, creation.latest_summary = sequence, result["assistant_reply"]
        creation.status, creation.stage, creation.active_job_id, creation.failure_code = "draft_ready", "ready", None, None
        job.status, job.lease_until, job.finished_at = "succeeded", None, utcnow()
        await event(tx, creation, job, "Verslo pasiūlymas ir svetainės juodraštis parengti. Galite juos peržiūrėti ir paprašyti pataisymų.")
        intake = receipt.get("content_intake")
        if intake:
            message = (f"Į bendrą turinio studiją privačiai perduota {len(intake['workflow']['pages'])} puslapių užduočių. "
                "Turinio, šaltinių, vaizdų ir publikavimo patikros dar neužbaigtos."
                if intake.get("state") == "private-draft-imported" else
                "Juodraštis išsaugotas, tačiau jo perdavimas į turinio studiją nepavyko. Šis žingsnis dar neužbaigtas.")
            await event(tx, creation, job, message)
    return True


async def loop(source_check):
    while True:
        source_check()
        try:
            if not await execute_once():
                await asyncio.sleep(1)
        except SQLAlchemyError:
            # No blind retry of an interrupted provider execution. Its lease expires into failed state.
            await asyncio.sleep(5)
