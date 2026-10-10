import asyncio

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from ..config import settings
from ..control.models import Session, User
from ..control.routes import scope
from ..models import new_id, utcnow
from . import adapter, renderer
from .models import Artifact, Creation, Job, Revision
from .service import ACTIVE, authority, binding, digest, event, fail, lease_deadline


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
    jobs = list(await tx.scalars(select(Job).where(Job.creation_id == creation.id).order_by(Job.sequence).limit(20)))
    history = [{"role": "user", "content": j.message, "base_revision": j.base_revision} for j in jobs]
    recommendations = []
    try:
        from ..domain_catalogue import DomainCatalogue
        candidates = DomainCatalogue.default().recommend(creation.idea[:120], limit=5)["items"]
        recommendations = [{"domain": i["domain"]["domain"], "category": i["domain"]["category_label"],
                             "availability": "unknown", "reason": i["reason"]} for i in candidates]
    except ImportError:
        pass  # Domain catalogue is an optional separate source integration, not fabricated candidates.
    return {"display_name": creation.display_name, "idea": creation.idea, "canonical_host": creation.canonical_host,
            "history": history, "current_draft": prior, "feedback": job.message, "base_revision": job.base_revision,
            "domain_candidates": recommendations, "domain_ownership_verified": False,
            "scope": "private_business_and_website_draft", "expected_instruction_hash": job.instruction_hash}


async def claim():
    cfg = settings()
    if not cfg.creation_enabled or not cfg.creation_runner_enabled or cfg.control_mode != "local":
        return None
    async with scope() as discovery:
        await discovery.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                                {"k": "creation-worker:" + cfg.environment})
        candidates = (await discovery.execute(text("SELECT * FROM control_creation_candidates(:e)"), {"e": cfg.environment})).mappings().all()
        # One actual provider process across cooperating workers, including a just-revoked lease.
        if any(row["status"] == "running" and row["lease_until"] and row["lease_until"] > utcnow() for row in candidates):
            return None
        for candidate in candidates:
            async with scope(user=candidate["user_id"]) as tx:
                creation, job = await locked(tx, candidate["id"], candidate["user_id"])
                if not creation or not job or job.status not in ACTIVE:
                    continue
                if job.status == "running":
                    await fail(tx, creation, job, "worker_interrupted")
                    continue
                if not await authority(tx, job):
                    await fail(tx, creation, job, "authorization_revoked")
                    continue
                _, instruction_hash = adapter.instructions()
                job.status, job.run_id, job.lease_until = "running", new_id(), lease_deadline()
                job.instruction_hash, job.model, job.adapter_revision = instruction_hash, "gpt-6-luna", adapter.ADAPTER_REVISION
                creation.status, creation.stage = "running", "drafting"
                await event(tx, creation, job, "AI rengia verslo pasiūlymą ir svetainės juodraštį.")
                return {"job_id": job.id, "user_id": job.user_id, "run_id": job.run_id,
                        "creation_id": creation.id, "revision": creation.current_revision + 1,
                        "context": await context_for(tx, creation, job)}
    return None


async def heartbeat(job_id, user_id, run_id):
    async with scope(user=user_id) as tx:
        creation, job = await locked(tx, job_id, user_id)
        if not creation or not job or job.status != "running" or job.run_id != run_id:
            return False
        if not job.lease_until or job.lease_until <= utcnow() or not await authority(tx, job):
            await fail(tx, creation, job, "authorization_revoked")
            return False
        job.lease_until = lease_deadline()
        return True


async def execute_once(runner=None):
    claimed = await claim()
    if not claimed:
        return False
    result, receipt, failure, outputs = None, {}, None, []
    try:
        result, receipt = await (runner or adapter.run)(claimed["context"],
            lambda: heartbeat(claimed["job_id"], claimed["user_id"], claimed["run_id"]))
        result = renderer.normalize(result)
        receipt["language_screening"] = renderer.language_screening(result)
        outputs = renderer.artifacts(result, creation_id=claimed["creation_id"], revision=claimed["revision"], receipt=receipt)
    except adapter.RunnerError as error:
        failure = error.code
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
        if not await authority(tx, job):
            failure = "authorization_revoked"
        if not job.lease_until or job.lease_until <= utcnow():
            failure = "worker_interrupted"
        if job.base_revision != creation.current_revision:
            failure = "stale_revision"
        if failure:
            await fail(tx, creation, job, failure)
            return True
        creation.stage = "validation"
        await event(tx, creation, job, "Patikrinta juodraščio struktūra ir kalbų maišymasis; ruošiami peržiūros failai. Pilnas redakcinis priėmimas dar neatliktas.")
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
