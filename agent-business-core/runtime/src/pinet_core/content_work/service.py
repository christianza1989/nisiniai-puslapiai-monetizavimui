import re
from datetime import timedelta

from sqlalchemy import func, select, text

from ..config import settings
from ..control.models import Session, User
from ..control.routes import ControlError
from ..creation import language_mode
from ..creation.models import Creation, Revision
from ..creation.review import canonical_sha256
from ..creation.service import ACTIVE, binding, current_actor, daily_limit_reached
from ..creation.service import authority as creation_authority
from ..models import new_id, utcnow
from .models import GuideAttempt, GuideEvent, GuideJob
from .wire import EventPayload, JobView


def enabled():
    cfg = settings()
    if (not cfg.creation_enabled or not cfg.creation_runner_enabled or not cfg.customer_enabled
            or cfg.control_mode != "local" or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
            or cfg.creation_daily_limit < 0 or cfg.creation_global_daily_limit < 0
            or not 30 <= cfg.creation_runner_seconds <= 300
            or not re.fullmatch("[a-f0-9]{40}", cfg.control_source_revision)):
        raise ControlError(503, "content_work_unavailable")


async def authority(tx, job, creation=None):
    try:
        enabled()
    except ControlError:
        return False
    creation = creation or await tx.get(Creation, job.creation_id)
    return bool(await creation_authority(tx, job) and creation and creation.current_revision == job.accepted_revision
        and creation.status not in ACTIVE and creation.canonical_host)


async def review_schema_ready(tx):
    return bool(await tx.scalar(text("""SELECT count(*)=1 FROM pg_constraint
      WHERE conrelid='control_content_work_attempts'::regclass AND contype='c' AND convalidated
        AND conname='control_content_work_attempts_review_model_check'"""))) and not bool(await tx.scalar(text("""
      SELECT count(*) FROM pg_constraint WHERE conrelid='control_content_work_attempts'::regclass
        AND conname='control_content_work_attempts_model_check'""")))


async def locked(tx, job_id, user_id):
    await tx.scalar(select(User).where(User.id == user_id).with_for_update())
    old = await tx.get(GuideJob, job_id)
    if not old:
        return None, None
    await tx.scalar(select(Session).where(Session.id == old.session_id).with_for_update(read=True)
        .execution_options(populate_existing=True))
    creation = await tx.scalar(select(Creation).where(Creation.id == old.creation_id).with_for_update()
        .execution_options(populate_existing=True))
    job = await tx.scalar(select(GuideJob).where(GuideJob.id == job_id).with_for_update()
        .execution_options(populate_existing=True))
    return creation, job


async def event(tx, job, state, summary, payload=None, attempt=None):
    payload = EventPayload.model_validate(payload or {}).model_dump(mode="json", exclude_none=True)
    job.event_sequence += 1
    if job.event_sequence > 100:
        raise ValueError("Bounded history exceeded")
    tx.add(GuideEvent(id=new_id(), creation_id=job.creation_id, job_id=job.id,
        attempt_id=attempt.id if attempt else None, sequence=job.event_sequence, state=state,
        summary=summary, payload=payload, **binding(job)))
    await tx.flush()


async def fail(tx, job, code):
    job.status, job.failure_code, job.lease_until, job.finished_at = "failed", code, None, utcnow()
    await event(tx, job, "failed", "Gido rengimas nebaigtas. Ankstesnis turinys ir bandymų įrodymai išsaugoti.",
                {"failure_code": code})


async def expire(tx, job):
    if job.status not in ACTIVE:
        return
    if not await authority(tx, job):
        await fail(tx, job, "authorization_revoked")
    elif job.status == "running" and (not job.lease_until or job.lease_until <= utcnow()):
        await fail(tx, job, "worker_interrupted")
    elif job.deadline_at and job.deadline_at <= utcnow():
        await fail(tx, job, "run_timeout")


async def quota(tx):
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                     {"k": "creation-admission:" + settings().environment})
    start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    args = {"e": settings().environment, "s": start}
    own = await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"), args)
    total = await tx.scalar(text("SELECT control_creation_attempt_count(:e,:s)"), args)
    if daily_limit_reached(own, total):
        raise ControlError(429, "creation_daily_limit")


async def current_revision(tx, creation, sequence):
    if creation.current_revision != sequence or creation.status in ACTIVE:
        raise ControlError(409, "stale_revision")
    revision = await tx.scalar(select(Revision).where(Revision.creation_id == creation.id, Revision.sequence == sequence))
    if not revision or canonical_sha256(revision.payload) != revision.material_hash:
        raise ControlError(503, "invalid_content_source")
    return revision


async def job_quota(tx):
    await quota(tx)
    args = {"e": settings().environment, "s": utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}
    own = await tx.scalar(text("SELECT control_content_work_job_count(:e,:s,true)"), args)
    total = await tx.scalar(text("SELECT control_content_work_job_count(:e,:s,false)"), args)
    if daily_limit_reached(own, total):
        raise ControlError(429, "content_work_daily_limit")


async def projection(tx, job):
    try:
        return await _projection(tx, job)
    except (ValueError, TypeError, KeyError, IndexError):
        raise ControlError(503, "invalid_content_source") from None


async def _projection(tx, job):
    attempts = list(await tx.scalars(select(GuideAttempt).where(GuideAttempt.job_id == job.id).order_by(GuideAttempt.sequence)))
    events = list(await tx.scalars(select(GuideEvent).where(GuideEvent.job_id == job.id).order_by(GuideEvent.sequence)))
    result = job.result or {}
    for row in events:
        if row.payload.get("candidate") and canonical_sha256(row.payload["candidate"]) != row.payload.get("output_sha256"):
            raise ControlError(503, "invalid_content_source")
    if result and (result.get("state") != "private-draft-written" or result.get("pageId") != job.page_id
            or result.get("sourceHash") != job.source_hash):
        raise ControlError(503, "invalid_content_source")
    page_observation = None
    if result:
        candidates = [e.payload for e in events if e.payload.get("candidate")]
        decisions = [e.payload["coordinator"] for e in events if e.payload.get("coordinator")]
        if (not candidates or not decisions or candidates[-1]["output_sha256"] != result.get("outputHash")
                or decisions[-1]["draft_sha256"] != result.get("outputHash")
                or decisions[-1]["decision"] != "accept_draft"
                or any(check["status"] == "FAIL" for check in candidates[-1]["checks"])
                or not any(language_mode.receipt_satisfies(check,
                           mode=candidates[-1].get("language_review_mode", "required"), digest=result.get("outputHash"))
                           for check in candidates[-1]["checks"])):
            raise ControlError(503, "invalid_content_source")
        page = next((p for p in result.get("workflow", {}).get("pages", []) if p.get("pageId") == job.page_id), None)
        if not page or page.get("revisionHash") != result.get("appliedRevisionHash"):
            raise ControlError(503, "invalid_content_source")
        blockers = page["blockers"]
        page_observation = {"page_id": job.page_id, "revision_sha256": page["revisionHash"], "state": page["state"],
            "review_current": page["reviewCurrent"], "has_approved_revision": page["hasApprovedRevision"],
            "blocker_count": len(blockers), "blockers": blockers[:12], "hidden_blocker_count": max(0, len(blockers)-12),
            "observed_at": result["observedAt"]}
    return JobView(job_id=job.id, creation_id=job.creation_id, accepted_revision=job.accepted_revision,
        source_sha256=job.source_hash, source_revision=job.source_revision, page_id=job.page_id, status=job.status,
        sequence=job.sequence, created_at=job.created_at, deadline_at=job.deadline_at, finished_at=job.finished_at,
        failure_code=job.failure_code, can_cancel=job.status in ACTIVE, output_sha256=result.get("outputHash"),
        applied_revision_sha256=result.get("appliedRevisionHash"),
        page_observation=page_observation,
        attempts=[{"attempt_id": a.id, "sequence": a.sequence, "role": a.role, "round_number": a.round_number,
            "stage": a.stage, "source_revision": a.source_revision, "instruction_sha256": a.instruction_hash,
            "model": a.model, "created_at": a.created_at} for a in attempts],
        events=[{"event_id": e.id, "attempt_id": e.attempt_id, "sequence": e.sequence, "state": e.state,
            "summary": e.summary, "created_at": e.created_at, "data": e.payload} for e in events]).model_dump(mode="json")


def lease(job):
    return min(utcnow() + timedelta(seconds=30), job.deadline_at)


async def next_sequence(tx, creation_id):
    return (await tx.scalar(select(func.max(GuideJob.sequence)).where(GuideJob.creation_id == creation_id)) or 0) + 1


__all__ = ["current_actor"]
