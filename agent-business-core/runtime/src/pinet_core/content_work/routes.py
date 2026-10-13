from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from ..control.routes import ControlError, SafeRoute, authenticated, identifier
from ..control.routes import envelope as shared_envelope
from ..creation.routes import owned
from ..creation.service import ACTIVE
from ..customer.service import customer_guard
from ..models import utcnow
from . import service
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
    row = await service.admit(tx, session, creation, value)
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
