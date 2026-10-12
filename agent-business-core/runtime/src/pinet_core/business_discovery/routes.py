"""BFF-facing discovery endpoints; no credentials/raw traces or implicit build."""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select

from ..control.routes import authenticated
from ..control.routes import envelope as shared_envelope
from ..creation.routes import CreationRoute
from ..customer.service import customer_guard
from . import service
from .models import Discovery, DiscoveryAttempt, DiscoveryJob, Report
from .wire import Approve, Archive, Message, Start

router = APIRouter(prefix="/customer/v2/discoveries", route_class=CreationRoute,
                   dependencies=[Depends(customer_guard), Depends(service.enabled)])


def envelope(request, data):
    value = shared_envelope(request, data)
    value["contract_version"] = "business-discovery.v1"
    return value


@router.post("", status_code=202)
async def start(value: Start, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.start(tx, session, value)
    return envelope(request, await service.view(tx, row))


@router.get("")
async def listing(request: Request, include_archived: bool = False,
                  context=Depends(authenticated, scope="function")):
    tx, session = context
    await service.current_actor(tx, session)
    statement = select(Discovery)
    if not include_archived:
        statement = statement.where(Discovery.status != "archived")
    rows = list(await tx.scalars(statement.order_by(Discovery.updated_at.desc(), Discovery.id).limit(100)))
    return envelope(request, {"items": [await service.view(tx, row) for row in rows]})


@router.get("/{discovery_id}")
async def detail(discovery_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.owned(tx, session, discovery_id, lock=True)
    await service.expire(tx, row)
    return envelope(request, await service.view(tx, row))


@router.post("/{discovery_id}/messages", status_code=202)
async def message(discovery_id: str, value: Message, request: Request,
                  context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.owned(tx, session, discovery_id, lock=True)
    await service.message(tx, session, row, value)
    return envelope(request, await service.view(tx, row))


@router.get("/{discovery_id}/messages")
async def messages(discovery_id: str, request: Request, offset: int = Query(default=0, ge=0),
                   limit: int = Query(default=20, ge=1, le=50),
                   context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.owned(tx, session, discovery_id)
    return envelope(request, await service.history(tx, row, offset, limit))


@router.get("/{discovery_id}/reports")
async def reports(discovery_id: str, request: Request, offset: int = Query(default=0, ge=0),
                  limit: int = Query(default=20, ge=1, le=50),
                  context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.owned(tx, session, discovery_id)
    rows = list(await tx.scalars(select(Report).where(Report.discovery_id == row.id)
                               .order_by(Report.revision.desc()).offset(offset).limit(limit + 1)))
    return envelope(request, {"items": [service.report_view(r) for r in rows[:limit]],
                              "offset": offset, "limit": limit, "has_more": len(rows) > limit})


@router.post("/{discovery_id}/build", status_code=202)
async def build(discovery_id: str, value: Approve, request: Request,
                context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.owned(tx, session, discovery_id, lock=True)
    proof = await service.approve(tx, session, row, value)
    return envelope(request, {"discovery": await service.view(tx, row),
        "creation_id": proof.creation_id, "report_revision": proof.report_revision,
        "report_sha256": proof.report_sha256, "approval_id": proof.id})


@router.post("/{discovery_id}/archive")
async def archive(discovery_id: str, value: Archive, request: Request,
                  context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.owned(tx, session, discovery_id, lock=True)
    await service.archive(tx, row)
    return envelope(request, {"discovery": await service.view(tx, row),
                              "history_preserved": True, "provider_calls": 0})


@router.get("/{discovery_id}/execution")
async def execution(discovery_id: str, request: Request,
                    context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await service.owned(tx, session, discovery_id)
    jobs = list(await tx.scalars(select(DiscoveryJob).where(DiscoveryJob.discovery_id == row.id)
                                .order_by(DiscoveryJob.sequence.desc()).limit(20)))
    attempts = list(await tx.scalars(select(DiscoveryAttempt).where(
        DiscoveryAttempt.discovery_id == row.id,
        DiscoveryAttempt.job_id.in_([j.id for j in jobs])).order_by(DiscoveryAttempt.created_at)))
    return envelope(request, {"jobs": [{"job_id": j.id, "sequence": j.sequence,
        "status": j.status, "base_revision": j.base_revision, "failure_code": j.failure_code,
        "source_revision": j.source_revision, "instruction_hash": j.instruction_hash,
        "finished_at": j.finished_at.isoformat() if j.finished_at else None} for j in jobs],
        "attempts": [{"attempt_id": a.id, "job_id": a.job_id, "sequence": a.sequence,
                     "role": a.role, "round_number": a.round_number, "model": a.model,
                     "source_revision": a.source_revision, "instruction_hash": a.instruction_hash,
                     "created_at": a.created_at.isoformat()} for a in attempts],
        "source_reads": [{key: page.get(key) for key in ("url", "status", "http_status", "observed_at", "title",
            "body_sha256", "text_sha256", "response_bytes", "error")}
            for job in jobs for page in (job.usage or {}).get("source_reads", {}).get("pages", [])],
        "cost_status": "UNVERIFIED", "channel_activation": "not_performed"})
