from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select

from ..config import settings
from ..control.models import Portfolio
from ..control.routes import ControlError, SafeRoute, authenticated, identifier
from ..control.routes import envelope as core_envelope
from ..customer.service import customer_guard
from ..domain_catalogue import DomainCatalogue
from ..domain_catalogue.models import (
    Category,
    FacetData,
    RecommendationData,
    RecommendationInput,
    SearchData,
    Sort,
)
from ..domain_catalogue.service import CatalogueError
from ..models import new_id, utcnow
from .models import Artifact, Creation, Event, Job, Revision
from .service import (
    ACTIVE,
    admission_enabled,
    artifact_integrity,
    artifact_view,
    current_actor,
    digest,
    event,
    event_view,
    expire,
    queue,
    view,
)
from .wire import Revise, Start


class CreationRoute(SafeRoute):
    body_limit = 16384


router = APIRouter(prefix="/customer/v2", route_class=CreationRoute, dependencies=[Depends(customer_guard)])


def envelope(request, data):
    value = core_envelope(request, data)
    value["contract_version"] = "creation.v1"
    return value


async def owned(tx, session, creation_id, *, lock=False):
    await current_actor(tx, session, lock=lock)
    statement = select(Creation).where(Creation.id == identifier(creation_id))
    if lock:
        statement = statement.with_for_update()
    row = await tx.scalar(statement)
    if not row:
        raise ControlError(404, "not_found")
    await current_actor(tx, session, row.portfolio_id)
    return row


@router.post("/creations", status_code=202)
async def start(value: Start, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    portfolio = await current_actor(tx, session, str(value.portfolio_id), lock=True)
    material = digest(value.model_dump(mode="json"))
    old = await tx.scalar(select(Creation).where(Creation.idempotency_key == str(value.idempotency_key)))
    if old:
        if old.fingerprint != material:
            raise ControlError(409, "idempotency_conflict")
        return envelope(request, view(old))
    admission_enabled()
    if (await tx.scalar(select(func.count()).select_from(Creation))) >= 100:
        raise ControlError(409, "creation_count_limit")
    row = Creation(id=new_id(), user_id=session.user_id, organization_id=portfolio.organization_id, portfolio_id=portfolio.id,
        environment_id=settings().environment, display_name=value.display_name, idea=value.idea, canonical_host=value.canonical_host,
        idempotency_key=str(value.idempotency_key), fingerprint=material, source_revision=settings().control_source_revision,
        status="queued", stage="queued", current_revision=0, job_sequence=0, event_sequence=0)
    tx.add(row)
    await tx.flush()
    await queue(tx, row, session, value.idea, str(value.idempotency_key), material)
    return envelope(request, view(row))


@router.get("/creations")
async def listing(request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    await current_actor(tx, session)
    rows = list(await tx.scalars(select(Creation).order_by(Creation.updated_at.desc(), Creation.id).limit(100)))
    return envelope(request, {"items": [view(row) for row in rows]})


@router.get("/creations/{creation_id}")
async def detail(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await owned(tx, session, creation_id, lock=True)
    await expire(tx, row)
    return envelope(request, view(row))


@router.get("/creations/{creation_id}/team")
async def team_detail(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    from .team import projection
    tx, session = context
    row = await owned(tx, session, creation_id, lock=True)
    await expire(tx, row)
    value = core_envelope(request, await projection(tx, row))
    value["contract_version"] = "team.v1"
    return value


@router.post("/creations/{creation_id}/revisions", status_code=202)
async def revise(creation_id: str, value: Revise, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await owned(tx, session, creation_id, lock=True)
    fingerprint = digest({"creation_id": row.id, **value.model_dump(mode="json")})
    old = await tx.scalar(select(Job).where(Job.idempotency_key == str(value.idempotency_key)))
    if old:
        if old.fingerprint != fingerprint:
            raise ControlError(409, "idempotency_conflict")
        return envelope(request, view(row))
    await expire(tx, row)
    if value.base_revision != row.current_revision:
        raise ControlError(409, "stale_revision")
    if row.status in ACTIVE:
        raise ControlError(409, "creation_busy")
    admission_enabled()
    await queue(tx, row, session, value.message, str(value.idempotency_key), fingerprint)
    return envelope(request, view(row))


@router.get("/creations/{creation_id}/content")
async def content_detail(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    from .studio import projection
    tx, session = context
    row = await owned(tx, session, creation_id, lock=True)
    await expire(tx, row)
    value = core_envelope(request, await projection(tx, row))
    value["contract_version"] = "content.v1"
    return value


@router.post("/creations/{creation_id}/cancel")
async def cancel(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await owned(tx, session, creation_id, lock=True)
    job = await tx.get(Job, row.active_job_id) if row.active_job_id else None
    if job and job.status in ACTIVE:
        job.status, job.lease_until, job.finished_at = "cancelled", None, utcnow()
        row.status, row.stage, row.failure_code, row.active_job_id = "cancelled", "cancelled", None, None
        await event(tx, row, job, "Rengimas atšauktas. Ankstesnės rezultato versijos išsaugotos.")
    return envelope(request, view(row))


@router.get("/creations/{creation_id}/events")
async def events(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await owned(tx, session, creation_id)
    items = await tx.scalars(select(Event).where(Event.creation_id == row.id).order_by(Event.sequence).limit(200))
    return envelope(request, {"items": [event_view(v) for v in items]})


@router.get("/creations/{creation_id}/messages")
async def messages(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await owned(tx, session, creation_id)
    jobs = list(await tx.scalars(select(Job).where(Job.creation_id == row.id).order_by(Job.sequence).limit(20)))
    revisions = {r.job_id: r for r in await tx.scalars(select(Revision).where(Revision.creation_id == row.id))}
    items = []
    for job in jobs:
        items.append({"message_id": job.id, "job_id": job.id, "role": "user", "content": job.message,
            "revision": job.base_revision or None, "created_at": job.created_at.isoformat()})
        if revision := revisions.get(job.id):
            items.append({"message_id": revision.id, "job_id": job.id, "role": "assistant",
                "content": revision.payload["assistant_reply"], "revision": revision.sequence, "created_at": revision.created_at.isoformat()})
    return envelope(request, {"items": items})


@router.get("/creations/{creation_id}/artifacts")
async def artifacts(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await owned(tx, session, creation_id)
    items = list(await tx.scalars(select(Artifact).where(Artifact.creation_id == row.id).order_by(Artifact.revision.desc(), Artifact.kind).limit(60)))
    return envelope(request, {"items": [artifact_view(v) for v in items]})


@router.get("/creations/{creation_id}/artifacts/{artifact_id}")
async def artifact(creation_id: str, artifact_id: str, request: Request, context=Depends(authenticated, scope="function")):
    tx, session = context
    row = await owned(tx, session, creation_id)
    item = await tx.scalar(select(Artifact).where(Artifact.id == identifier(artifact_id), Artifact.creation_id == row.id))
    if not item:
        raise ControlError(404, "not_found")
    artifact_integrity(item)
    return envelope(request, {"artifact": artifact_view(item), "content": item.content})


async def domain_actor(context):
    tx, session = context
    # Current shared identity and RLS-visible portfolio also admit the original owner account.
    if not await tx.scalar(select(Portfolio.id).limit(1)):
        raise ControlError(404, "not_found")
    await tx.refresh(session)
    if session.revoked_at or session.expires_at <= utcnow():
        raise ControlError(401, "unauthenticated")


def domains_envelope(request, data):
    value = core_envelope(request, data)
    value["contract_version"] = "domains.v1"
    return value


def catalogue_call(method, model, **kwargs):
    try:
        catalogue = DomainCatalogue.default()
        data = ({"items": catalogue.facets(), "metadata": catalogue.metadata()} if method == "facets"
                else getattr(catalogue, method)(**kwargs))
        return model.model_validate(data).model_dump(mode="json")
    except CatalogueError as error:
        invalid = str(error).startswith("invalid")
        raise ControlError(400 if invalid else 503, "invalid_request" if invalid else "catalogue_unavailable") from None
    except (ValueError, OSError):
        raise ControlError(503, "catalogue_unavailable") from None


@router.get("/domains")
async def domains(request: Request, query: str = Query(default="", max_length=120), category: Category | None = None,
                  top200_only: bool = False, offset: int = Query(default=0, ge=0, le=100000),
                  limit: int = Query(default=50, ge=1, le=100), sort: Sort = "research_priority",
                  context=Depends(authenticated, scope="function")):
    await domain_actor(context)
    return domains_envelope(request, catalogue_call("search", SearchData, query=query, category=category,
        top200_only=top200_only, offset=offset, limit=limit, sort=sort))


@router.get("/domains/facets")
async def domain_facets(request: Request, context=Depends(authenticated, scope="function")):
    await domain_actor(context)
    return domains_envelope(request, catalogue_call("facets", FacetData))


@router.post("/domains/recommendations")
async def domain_recommend(value: RecommendationInput, request: Request, context=Depends(authenticated, scope="function")):
    await domain_actor(context)
    return domains_envelope(request, catalogue_call("recommend", RecommendationData, **value.model_dump()))
