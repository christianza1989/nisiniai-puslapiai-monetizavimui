"""Current verified owner and exact immutable plan bind every discovery action."""
from sqlalchemy import func, select, text

from ..config import settings
from ..control.models import Session, User
from ..control.routes import ControlError, identifier
from ..creation.service import ACTIVE, binding, current_actor, digest
from ..creation.service import authority as creation_authority
from ..models import new_id, utcnow
from .models import BuildApproval, Discovery, DiscoveryJob, Report
from .wire import DiscoveryView, Reply, ReportView


def enabled():
    cfg = settings()
    if not cfg.business_discovery_enabled or cfg.control_mode != "local" or not cfg.customer_enabled:
        raise ControlError(503, "discovery_unavailable")


async def schema_ready(tx):
    return bool(await tx.scalar(text("SELECT to_regclass('control_business_discoveries') IS NOT NULL AND to_regclass('control_business_discovery_attempts') IS NOT NULL")))


async def owned(tx, session, discovery_id, *, lock=False):
    await current_actor(tx, session, lock=lock)
    statement = select(Discovery).where(Discovery.id == identifier(discovery_id))
    if lock:
        statement = statement.with_for_update()
    row = await tx.scalar(statement)
    if not row:
        raise ControlError(404, "not_found")
    await current_actor(tx, session, row.portfolio_id)
    return row


async def latest(tx, row):
    return await tx.scalar(select(Report).where(Report.discovery_id == row.id,
                                               Report.revision == row.current_revision))


def report_view(row):
    if digest(row.payload) != row.material_hash:
        raise ControlError(503, "invalid_discovery_report")
    try:
        return ReportView(discovery_id=row.discovery_id, revision=row.revision,
            report_sha256=row.material_hash, source_revision=row.source_revision,
            created_at=row.created_at, reply=Reply.model_validate(row.payload["reply"]),
            reviews=row.payload["reviews"]).model_dump(mode="json")
    except ValueError:
        raise ControlError(503, "invalid_discovery_report") from None


def build_allowed(row, report):
    if not report or row.status != "plan_ready" or row.active_job_id or row.linked_creation_id:
        return False
    value = report_view(report)
    candidate_hash = digest(value["reply"])
    return bool(report.source_revision == settings().control_source_revision
                and value["reply"]["state"] == "plan_ready"
                and len(value["reviews"]) == 2
                and all(r["approved"] and r["candidate_sha256"] == candidate_hash for r in value["reviews"]))


async def view(tx, row):
    report = await latest(tx, row)
    cfg = settings()
    editable = row.status not in {"queued", "running", "archived", "build_started"}
    return DiscoveryView(discovery_id=row.id, portfolio_id=row.portfolio_id, title=row.title,
        initial_message=row.initial_message, status=row.status, current_revision=row.current_revision,
        active_job_id=row.active_job_id, linked_creation_id=row.linked_creation_id,
        latest_report_sha256=report.material_hash if report else None,
        source_revision=row.source_revision, failure_code=row.failure_code,
        created_at=row.created_at, updated_at=row.updated_at,
        can_message=bool(cfg.business_discovery_runner_enabled and editable),
        can_build=bool(cfg.creation_enabled and cfg.creation_runner_enabled and build_allowed(row, report)),
        foundation_status="UNVERIFIED", can_create_agents=False, can_open_designer=False,
        channel_activation="not_performed", launch_status="UNVERIFIED").model_dump(mode="json")


async def authority(tx, job):
    cfg = settings()
    return bool(cfg.business_discovery_enabled and cfg.business_discovery_runner_enabled
                and await creation_authority(tx, job))


async def locked(tx, job_id, user_id):
    user = await tx.scalar(select(User).where(User.id == user_id).with_for_update())
    job = await tx.get(DiscoveryJob, job_id)
    if not user or not job:
        return None, None
    await tx.scalar(select(Session).where(Session.id == job.session_id).with_for_update(read=True))
    row = await tx.scalar(select(Discovery).where(Discovery.id == job.discovery_id).with_for_update())
    job = await tx.scalar(select(DiscoveryJob).where(DiscoveryJob.id == job_id)
                          .with_for_update().execution_options(populate_existing=True))
    return row, job


async def fail(tx, row, job, code):
    job.status, job.failure_code, job.finished_at, job.lease_until = "failed", code, utcnow(), None
    if row.status != "archived":
        row.status, row.failure_code = "failed", code
    row.active_job_id, row.updated_at = None, utcnow()
    await tx.flush()


async def expire(tx, row):
    job = await tx.get(DiscoveryJob, row.active_job_id) if row.active_job_id else None
    if not job or job.status not in ACTIVE:
        return
    if not await authority(tx, job):
        await fail(tx, row, job, "authorization_revoked")
    elif job.status == "running" and (not job.lease_until or job.lease_until <= utcnow()):
        await fail(tx, row, job, "worker_interrupted")


async def enqueue(tx, row, session, message, key, fingerprint):
    cfg = settings()
    if not cfg.business_discovery_runner_enabled or not cfg.creation_runner_enabled:
        raise ControlError(503, "discovery_runner_unavailable")
    if not await schema_ready(tx):
        raise ControlError(503, "discovery_unavailable")
    from ..creation.service import quota
    await quota(tx, session.user_id)
    row.job_sequence += 1
    job = DiscoveryJob(id=new_id(), discovery_id=row.id, session_id=session.id,
        sequence=row.job_sequence, base_revision=row.current_revision, message=message,
        idempotency_key=key, fingerprint=fingerprint, source_revision=cfg.control_source_revision,
        status="queued", **binding(row))
    tx.add(job)
    row.status, row.active_job_id, row.failure_code, row.updated_at = "queued", job.id, None, utcnow()
    await tx.flush()
    return job


async def start(tx, session, value):
    enabled()
    portfolio = await current_actor(tx, session, str(value.portfolio_id), lock=True)
    fingerprint = digest(value.model_dump(mode="json"))
    old = await tx.scalar(select(Discovery).where(Discovery.idempotency_key == str(value.idempotency_key)))
    if old:
        if old.fingerprint != fingerprint:
            raise ControlError(409, "idempotency_conflict")
        return old
    if not await schema_ready(tx):
        raise ControlError(503, "discovery_unavailable")
    cfg = settings()
    if not cfg.business_discovery_runner_enabled or not cfg.creation_runner_enabled:
        raise ControlError(503, "discovery_runner_unavailable")
    # SafeRoute returns a caught refusal before current dependency cleanup exits.
    # Own the atomic parent+job write here, so every later admission failure rolls
    # back even when the enclosing request transaction closes with a response.
    # Successful exact replay above remains readable while execution is held.
    async with tx.begin_nested():
        row = Discovery(id=new_id(), title="Naujo verslo idėja", initial_message=value.message,
            status="queued", current_revision=0, job_sequence=0, user_id=session.user_id,
            organization_id=portfolio.organization_id, portfolio_id=portfolio.id,
            environment_id=cfg.environment, source_revision=cfg.control_source_revision,
            idempotency_key=str(value.idempotency_key), fingerprint=fingerprint)
        tx.add(row)
        await tx.flush()
        await enqueue(tx, row, session, value.message, str(value.idempotency_key), fingerprint)
    return row


async def message(tx, session, row, value):
    key = str(value.idempotency_key)
    fingerprint = digest({"discovery_id": row.id, **value.model_dump(mode="json")})
    old = await tx.scalar(select(DiscoveryJob).where(DiscoveryJob.idempotency_key == key))
    if old:
        if old.fingerprint != fingerprint:
            raise ControlError(409, "idempotency_conflict")
        return row
    await expire(tx, row)
    if row.status in {"archived", "build_started"}:
        raise ControlError(409, "discovery_closed")
    if row.status in ACTIVE:
        raise ControlError(409, "discovery_busy")
    if row.current_revision != value.base_revision:
        raise ControlError(409, "stale_report")
    await enqueue(tx, row, session, value.message, key, fingerprint)
    return row


async def approve(tx, session, row, value):
    key = str(value.idempotency_key)
    fingerprint = digest({"discovery_id": row.id, **value.model_dump(mode="json")})
    old = await tx.scalar(select(BuildApproval).where(BuildApproval.idempotency_key == key))
    if old:
        if old.fingerprint != fingerprint:
            raise ControlError(409, "idempotency_conflict")
        return old
    if row.linked_creation_id:
        raise ControlError(409, "build_already_started")
    await expire(tx, row)
    report = await latest(tx, row)
    if not build_allowed(row, report):
        raise ControlError(409, "plan_not_ready")
    if value.report_revision != report.revision or value.report_sha256 != report.material_hash:
        raise ControlError(409, "stale_report")
    plan = Reply.model_validate(report.payload["reply"]).plan
    from ..creation.models import Creation
    if await tx.scalar(select(Creation.id).where(Creation.idempotency_key == key)):
        raise ControlError(409, "idempotency_conflict")
    from ..creation.service import create_own
    from ..creation.wire import Start as CreationStart
    creation = await create_own(tx, session, CreationStart(
        portfolio_id=row.portfolio_id, display_name=plan.business_name, idea=plan.summary,
        canonical_host=plan.canonical_host_candidate, idempotency_key=value.idempotency_key))
    proof = BuildApproval(id=new_id(), discovery_id=row.id, report_id=report.id,
        report_revision=report.revision, report_sha256=report.material_hash,
        creation_id=creation.id, session_id=session.id, idempotency_key=key,
        fingerprint=fingerprint, **binding(row))
    tx.add(proof)
    row.linked_creation_id, row.status, row.updated_at = creation.id, "build_started", utcnow()
    await tx.flush()
    return proof


async def archive(tx, row):
    if row.linked_creation_id:
        raise ControlError(409, "linked_build_requires_creation_archive")
    job = await tx.get(DiscoveryJob, row.active_job_id) if row.active_job_id else None
    if job and job.status in ACTIVE:
        job.status, job.finished_at, job.lease_until = "cancelled", utcnow(), None
    row.status, row.active_job_id, row.updated_at = "archived", None, utcnow()
    await tx.flush()
    return row


async def approved_build_context(tx, creation):
    if not await schema_ready(tx):
        return None
    proof = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == creation.id))
    if not proof:
        return None
    report = await tx.get(Report, proof.report_id)
    parent = await tx.get(Discovery, proof.discovery_id)
    expected = digest({"discovery_id": proof.discovery_id, "report_revision": proof.report_revision,
                       "report_sha256": proof.report_sha256, "idempotency_key": proof.idempotency_key})
    if (not report or not parent or parent.status != "build_started"
            or parent.linked_creation_id != creation.id or proof.fingerprint != expected
            or report.revision != proof.report_revision or report.material_hash != proof.report_sha256
            or binding(proof) != binding(creation) or binding(report) != binding(creation)):
        raise ControlError(503, "invalid_approved_plan")
    value = report_view(report)
    if value["reply"]["state"] != "plan_ready" or len(value["reviews"]) != 2 or not all(
            r["approved"] and r["candidate_sha256"] == digest(value["reply"]) for r in value["reviews"]):
        raise ControlError(503, "invalid_approved_plan")
    return {"discovery_id": parent.id, "report_revision": report.revision,
            "report_sha256": report.material_hash, "source_revision": report.source_revision,
            "plan": value["reply"]["plan"]}


async def require_agent_foundation(tx, creation):
    """New approved-plan builds cannot use Registration alone to bypass foundation.

    The current build adapter only produces a private draft. Until a maintained
    actual foundation proof exists, its authoritative state is UNVERIFIED. This
    gate grants nothing, edits no history and does not migrate legacy businesses.
    Disabling discovery does not let an already linked build bypass the gate.
    """
    if not await schema_ready(tx):
        if settings().business_discovery_enabled:
            raise ControlError(503, "discovery_unavailable")
        return
    approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == creation.id))
    if not approval:
        return
    if binding(approval) != binding(creation):
        raise ControlError(503, "invalid_approved_plan")
    raise ControlError(409, "website_foundation_not_ready")


async def history(tx, row, offset, limit):
    jobs = list(await tx.scalars(select(DiscoveryJob).where(DiscoveryJob.discovery_id == row.id)
                                .order_by(DiscoveryJob.sequence.desc()).offset(offset).limit(limit)))
    reports = {r.job_id: r for r in await tx.scalars(select(Report).where(
        Report.discovery_id == row.id, Report.job_id.in_([j.id for j in jobs])))}
    items = []
    for job in reversed(jobs):
        items.append({"message_id": job.id, "role": "user", "content": job.message,
                      "revision": job.base_revision, "status": job.status, "created_at": job.created_at.isoformat()})
        if report := reports.get(job.id):
            value = report_view(report)
            items.append({"message_id": report.id, "role": "assistant",
                "content": value["reply"]["assistant_message"], "revision": report.revision,
                "status": job.status, "created_at": report.created_at.isoformat()})
    count = await tx.scalar(select(func.count()).select_from(DiscoveryJob).where(DiscoveryJob.discovery_id == row.id))
    return {"items": items, "offset": offset, "limit": limit, "has_more": offset + len(jobs) < count}
