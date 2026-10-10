import hashlib
import json
from datetime import timedelta

from sqlalchemy import func, select, text

from ..config import settings
from ..control.models import Membership, Portfolio, Session, User
from ..control.routes import ControlError
from ..customer.models import Account
from ..models import new_id, utcnow
from .models import Event, Job
from .wire import ArtifactView, CreationView, EventView

ACTIVE = {"queued", "running"}


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def binding(row):
    return {key: getattr(row, key) for key in ("user_id", "organization_id", "portfolio_id", "environment_id")}


def admission_enabled():
    cfg = settings()
    if (not cfg.creation_enabled or not cfg.creation_runner_enabled
            or cfg.creation_daily_limit < 0 or cfg.creation_global_daily_limit < 0):
        raise ControlError(503, "creation_unavailable")


def daily_limit_reached(own, total):
    cfg = settings()
    return ((cfg.creation_daily_limit > 0 and own >= cfg.creation_daily_limit)
            or (cfg.creation_global_daily_limit > 0 and total >= cfg.creation_global_daily_limit))


async def current_actor(tx, session, portfolio_id=None, *, lock=False):
    statement = select(User).where(User.id == session.user_id)
    if lock:
        statement = statement.with_for_update()
    user = await tx.scalar(statement)
    await tx.refresh(session, with_for_update={"read": True} if lock else None)
    if not user or not user.enabled or session.revoked_at or session.expires_at <= utcnow():
        raise ControlError(401, "unauthenticated")
    account = await tx.scalar(select(Account).where(Account.user_id == user.id, Account.verified_at.is_not(None)))
    if not account:
        raise ControlError(404, "not_found")
    if portfolio_id:
        portfolio = await tx.get(Portfolio, portfolio_id)
        if not portfolio or not await tx.scalar(select(Membership.id).where(Membership.user_id == user.id,
                Membership.organization_id == portfolio.organization_id, Membership.enabled, Membership.role == "owner")):
            raise ControlError(404, "not_found")
        return portfolio
    return account


async def quota(tx, user_id):
    # Global admission is serialized; current actor locks precede this lock on every writer.
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                     {"k": "creation-admission:" + settings().environment})
    now = utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    # Admission and each later role reservation use the same charged union:
    # legacy executions, creator/reviewer roles and native GUIDE attempts.
    # Keep the independent job-rate bound below for queued, unexecuted work.
    args = {"e": settings().environment, "s": start}
    attempted = await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"), args)
    all_attempted = await tx.scalar(text("SELECT control_creation_attempt_count(:e,:s)"), args)
    if daily_limit_reached(attempted, all_attempted):
        raise ControlError(429, "creation_daily_limit")
    own = await tx.scalar(select(func.count()).select_from(Job).where(Job.user_id == user_id, Job.created_at >= start))
    # Fixed definer aggregate returns a count, never another customer's rows/content.
    total = await tx.scalar(text("SELECT control_creation_daily_count(:e,:s)"), {"e": settings().environment, "s": start})
    if daily_limit_reached(own, total):
        raise ControlError(429, "creation_daily_limit")


async def event(tx, creation, job, message):
    creation.event_sequence += 1
    tx.add(Event(creation_id=creation.id, job_id=job.id, sequence=creation.event_sequence,
        status=creation.status, stage=creation.stage, message=message, **binding(creation)))
    creation.updated_at = utcnow()
    await tx.flush()


async def queue(tx, creation, session, message, key, fingerprint):
    if creation.job_sequence >= 20:
        raise ControlError(409, "creation_revision_limit")
    await quota(tx, session.user_id)
    creation.job_sequence += 1
    job = Job(id=new_id(), creation_id=creation.id, session_id=session.id, sequence=creation.job_sequence,
        base_revision=creation.current_revision, message=message, idempotency_key=key, fingerprint=fingerprint,
        source_revision=settings().control_source_revision, status="queued", **binding(creation))
    tx.add(job)
    creation.status, creation.stage, creation.active_job_id, creation.failure_code = "queued", "queued", job.id, None
    await tx.flush()
    await event(tx, creation, job, "Užduotis įrašyta. AI rengimas prasidės, kai ją paims vykdytojas.")
    return job


async def authority(tx, job):
    cfg = settings()
    if (not cfg.creation_enabled or not cfg.creation_runner_enabled or cfg.control_mode != "local"
            or job.environment_id != cfg.environment or job.source_revision != cfg.control_source_revision):
        return False
    session = await tx.get(Session, job.session_id)
    user = await tx.get(User, job.user_id)
    account = await tx.scalar(select(Account.user_id).where(Account.user_id == job.user_id, Account.verified_at.is_not(None)))
    member = await tx.scalar(select(Membership.id).where(Membership.user_id == job.user_id,
        Membership.organization_id == job.organization_id, Membership.enabled, Membership.role == "owner"))
    return bool(session and session.user_id == job.user_id and session.environment_id == job.environment_id
        and not session.revoked_at and session.expires_at > utcnow() and user and user.enabled and account and member)


async def expire(tx, creation):
    job = await tx.get(Job, creation.active_job_id) if creation.active_job_id else None
    if not job or job.status not in ACTIVE:
        return
    code = None
    if not await authority(tx, job):
        code = "authorization_revoked"
    elif job.status == "running" and job.lease_until and job.lease_until <= utcnow():
        code = "worker_interrupted"
    if code:
        await fail(tx, creation, job, code)


async def fail(tx, creation, job, code):
    job.status, job.failure_code, job.lease_until, job.finished_at = "failed", code, None, utcnow()
    creation.status, creation.stage, creation.failure_code, creation.active_job_id = "failed", "failed", code, None
    message = ("Juodraštyje aptiktas kalbų maišymasis. Nauja versija nepriimta; ankstesni rezultatai išsaugoti."
               if code == "language_quality_failed" else "Rengimo užbaigti nepavyko. Ankstesnės rezultato versijos išsaugotos.")
    await event(tx, creation, job, message)


def view(row):
    cfg = settings()
    return CreationView(creation_id=row.id, portfolio_id=row.portfolio_id, display_name=row.display_name, idea=row.idea,
        canonical_host=row.canonical_host, status=row.status, stage=row.stage, current_revision=row.current_revision or None,
        active_job_id=row.active_job_id, failure_code=row.failure_code, created_at=row.created_at, updated_at=row.updated_at,
        source_revision=row.source_revision, latest_summary=row.latest_summary,
        capabilities={"can_revise": bool(cfg.creation_enabled and cfg.creation_runner_enabled and row.status not in ACTIVE and row.job_sequence < 20),
                      "can_cancel": row.status in ACTIVE}).model_dump(mode="json")


def artifact_view(row):
    return ArtifactView(artifact_id=row.id, revision=row.revision, kind=row.kind, display_name=row.display_name,
        media_type=row.media_type, sha256=row.sha256, bytes=row.bytes, created_at=row.created_at).model_dump(mode="json")


def event_view(row):
    return EventView(event_id=row.id, sequence=row.sequence, job_id=row.job_id, status=row.status,
        stage=row.stage, message=row.message, created_at=row.created_at).model_dump(mode="json")


def artifact_integrity(row):
    material = row.content.encode()
    if len(material) != row.bytes or hashlib.sha256(material).hexdigest() != row.sha256:
        raise ControlError(503, "invalid_artifact_source")


def lease_deadline():
    return utcnow() + timedelta(seconds=30)
