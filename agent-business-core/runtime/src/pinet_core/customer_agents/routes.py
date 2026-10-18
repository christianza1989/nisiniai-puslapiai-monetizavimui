"""Additive bounded current-owner draft configuration routes; no calibration/provider dispatch."""
from fastapi import APIRouter, Depends, Path, Query, Request

from ..control.routes import SafeRoute
from ..control.routes import envelope as core_envelope
from ..customer.service import customer_guard
from . import evidence, service
from .wire import (
    ConfigEnvelope,
    Create,
    Envelope,
    Error,
    ListingEnvelope,
    PreparationReadinessEnvelope,
    Revise,
    RevisionsEnvelope,
    SavedEnvelope,
    ScoreEvidenceEnvelope,
    TestRunsEnvelope,
)


class AgentRoute(SafeRoute):
    body_limit = 262144


router = APIRouter(prefix="/customer/v2/creations", route_class=AgentRoute,
    dependencies=[Depends(customer_guard)], responses={code: {"model": Error} for code in (400, 401, 403, 404, 409, 503)})


def token(request):
    return service.bearer_token(request.headers.get("authorization", ""))


def envelope(request, value):
    result = core_envelope(request, value)
    result["contract_version"] = "customer-agents.v1"
    return result


@router.get("/{creation_id}/agents", response_model=ListingEnvelope, response_model_exclude_none=True)
async def listing(creation_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
        cursor: str | None = Query(None, min_length=1, max_length=2048)):
    return envelope(request, await service.listing(token(request), creation_id, limit=limit, cursor=cursor))


@router.post("/{creation_id}/agents", response_model=SavedEnvelope, status_code=201, response_model_exclude_none=True)
async def create(creation_id: str, value: Create, request: Request):
    return envelope(request, await service.create(token(request), creation_id, value))


@router.get("/{creation_id}/agents/preparation-readiness", response_model=PreparationReadinessEnvelope,
    response_model_exclude_none=True)
async def preparation_readiness(creation_id: str, request: Request):
    """Observe configuration eligibility only; this GET performs no preparation or dispatch."""
    result = core_envelope(request, await service.preparation_readiness(token(request), creation_id))
    result["contract_version"] = "customer-agent-preparation-readiness.v1"
    return result


@router.get("/{creation_id}/agents/{agent_id}", response_model=Envelope, response_model_exclude_none=True)
async def detail(creation_id: str, agent_id: str, request: Request):
    return envelope(request, await service.get(token(request), creation_id, agent_id))


@router.post("/{creation_id}/agents/{agent_id}/revisions", response_model=SavedEnvelope, response_model_exclude_none=True)
async def revise(creation_id: str, agent_id: str, value: Revise, request: Request):
    return envelope(request, await service.revise(token(request), creation_id, agent_id, value))


@router.get("/{creation_id}/agents/{agent_id}/revisions", response_model=RevisionsEnvelope, response_model_exclude_none=True)
async def revisions(creation_id: str, agent_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
        cursor: str | None = Query(None, min_length=1, max_length=2048)):
    return envelope(request, await service.revisions(token(request), creation_id, agent_id, limit=limit, cursor=cursor))


@router.get("/{creation_id}/agents/{agent_id}/revisions/{revision}", response_model=ConfigEnvelope, response_model_exclude_none=True)
async def revision(creation_id: str, agent_id: str, request: Request, revision: int = Path(ge=1, le=2147483647)):
    return envelope(request, await service.revision(token(request), creation_id, agent_id, revision))


@router.get("/{creation_id}/agents/{agent_id}/test-runs", response_model=TestRunsEnvelope, response_model_exclude_none=True)
async def test_runs(creation_id: str, agent_id: str, request: Request,
        revision: int | None = Query(None, ge=1, le=2147483647), limit: int = Query(20, ge=1, le=50),
        cursor: str | None = Query(None, min_length=1, max_length=2048)):
    return envelope(request, await evidence.listing(token(request), creation_id, agent_id,
        revision=revision, limit=limit, cursor=cursor))


@router.get("/{creation_id}/agents/{agent_id}/score-evidence", response_model=ScoreEvidenceEnvelope, response_model_exclude_none=True)
async def score_evidence(creation_id: str, agent_id: str, request: Request,
        revision: int | None = Query(None, ge=1, le=2147483647), limit: int = Query(20, ge=1, le=50),
        cursor: str | None = Query(None, min_length=1, max_length=2048)):
    return envelope(request, await evidence.listing(token(request), creation_id, agent_id,
        revision=revision, limit=limit, cursor=cursor, scores=True))
