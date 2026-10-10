from types import SimpleNamespace

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from ..config import settings
from ..control.routes import ControlError, SafeRoute, authenticated, identifier
from ..control.routes import envelope as shared_envelope
from ..creation.review import canonical_sha256
from ..creation.routes import owned
from ..creation.service import ACTIVE, binding
from ..customer.service import customer_guard
from ..models import new_id, utcnow
from ..tasks.codex_transport import RunnerError
from . import service, studio
from .models import GuideJob
from .wire import StartGuide

router = APIRouter(prefix="/customer/v2/creations/{creation_id}/content-work", route_class=SafeRoute,
                   dependencies=[Depends(customer_guard)])


def envelope(request, data):
    result = shared_envelope(request, data)
    result["contract_version"] = "content-work.v1"
    return result


async def job_owned(tx, creation, job_id):
    job = await tx.scalar(select(GuideJob).where(GuideJob.id == identifier(job_id), GuideJob.creation_id == creation.id)
                          .with_for_update())
    if not job:
        raise ControlError(404, "not_found")
    await service.expire(tx, job)
    return job


@router.post("", status_code=202)
async def start(creation_id: str, value: StartGuide, request: Request,
                context=Depends(authenticated, scope="function")):
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    fingerprint = canonical_sha256({"creation_id": creation.id, **value.model_dump(mode="json")})
    prior = await tx.scalar(select(GuideJob).where(GuideJob.idempotency_key == str(value.idempotency_key)))
    if prior:
        if prior.fingerprint != fingerprint:
            raise ControlError(409, "idempotency_conflict")
        return envelope(request, await service.projection(tx, prior))
    service.enabled()
    revision = await service.current_revision(tx, creation, value.accepted_revision)
    active = await tx.scalar(select(GuideJob).where(GuideJob.creation_id == creation.id, GuideJob.status.in_(ACTIVE))
                             .with_for_update())
    if active:
        await service.expire(tx, active)
        if active.status in ACTIVE:
            raise ControlError(409, "content_work_busy")
    sequence = await service.next_sequence(tx, creation.id)
    if sequence > 20:
        raise ControlError(409, "content_work_limit")
    await service.job_quota(tx)
    target = SimpleNamespace(creation_id=creation.id, accepted_revision=value.accepted_revision,
        source_hash=revision.material_hash, page_id=value.page_id, canonical_host=creation.canonical_host)
    async def authorized():
        await service.current_actor(tx, session, creation.portfolio_id)
        return creation.current_revision == value.accepted_revision and creation.status not in ACTIVE
    try:
        prepared = await studio.invoke(target, "prepare", authorized, seconds=20)
    except RunnerError as error:
        raise ControlError(409 if error.code in {"writer_planning_brief_required", "writer_page_not_in_intake"}
                           else 503, error.code) from None
    row = GuideJob(id=new_id(), creation_id=creation.id, revision_id=revision.id,
        accepted_revision=value.accepted_revision, source_hash=revision.material_hash, page_id=value.page_id,
        session_id=session.id, sequence=sequence, idempotency_key=str(value.idempotency_key),
        fingerprint=fingerprint, source_revision=settings().control_source_revision, status="queued",
        binding={key: prepared[key] for key in studio.BINDING_KEYS}, event_sequence=0, **binding(creation))
    tx.add(row)
    await tx.flush()
    await service.event(tx, row, "queued", "Pasirinkto gido rengimo užduotis įrašyta ir laukia vykdytojo.")
    return envelope(request, await service.projection(tx, row))


@router.get("")
async def listing(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    jobs = list(await tx.scalars(select(GuideJob).where(GuideJob.creation_id == creation.id)
                                .order_by(GuideJob.sequence.desc()).limit(20)))
    for job in jobs:
        await service.expire(tx, job)
    return envelope(request, {"creation_id": creation.id, "observation_scope": "live_job",
                             "items": [await service.projection(tx, job) for job in jobs]})


@router.get("/{job_id}")
async def detail(creation_id: str, job_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    return envelope(request, await service.projection(tx, await job_owned(tx, creation, job_id)))


@router.post("/{job_id}/cancel")
async def cancel(creation_id: str, job_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    job = await job_owned(tx, creation, job_id)
    if job.status in ACTIVE:
        job.status, job.lease_until, job.finished_at = "cancelled", None, utcnow()
        await service.event(tx, job, "cancelled", "Gido rengimas atšauktas. Ankstesnis turinys išsaugotas.")
    return envelope(request, await service.projection(tx, job))
