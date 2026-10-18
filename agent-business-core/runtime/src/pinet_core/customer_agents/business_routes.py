"""Current-owner business routes over the same saved agent/config core."""
from fastapi import APIRouter, Depends, Path, Query, Request

from ..control.routes import SafeRoute
from ..control.routes import envelope as core_envelope
from ..customer.service import customer_guard
from . import business
from .business_wire import (
    ConfigEnvelope,
    Create,
    Envelope,
    Import,
    ImportEnvelope,
    ListingEnvelope,
    Revise,
    RevisionsEnvelope,
    SavedEnvelope,
)
from .routes import token
from .wire import Error


class BusinessAgentRoute(SafeRoute):
    body_limit = 1048576


router = APIRouter(prefix="/customer/v2/businesses", route_class=BusinessAgentRoute,
    dependencies=[Depends(customer_guard)], responses={code: {"model": Error} for code in (400, 401, 403, 404, 409, 503)})


def envelope(request, value):
    return {**core_envelope(request, value), "contract_version": "business-customer-agents.v1"}


@router.get("/{business_id}/agents", response_model=ListingEnvelope, response_model_exclude_none=True)
async def listing(business_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
        cursor: str | None = Query(None, min_length=1, max_length=2048)):
    return envelope(request, await business.listing(token(request), business_id, limit=limit, cursor=cursor))


@router.post("/{business_id}/agents", response_model=SavedEnvelope, status_code=201, response_model_exclude_none=True)
async def create(business_id: str, value: Create, request: Request):
    return envelope(request, await business.create(token(request), business_id, value))


@router.post("/{business_id}/agents/import", response_model=ImportEnvelope, status_code=201,
    response_model_exclude_none=True)
async def import_agents(business_id: str, value: Import, request: Request):
    return envelope(request, await business.import_agents(token(request), business_id, value))


@router.get("/{business_id}/agents/{agent_id}", response_model=Envelope, response_model_exclude_none=True)
async def detail(business_id: str, agent_id: str, request: Request):
    return envelope(request, await business.get(token(request), business_id, agent_id))


@router.post("/{business_id}/agents/{agent_id}/revisions", response_model=SavedEnvelope,
    response_model_exclude_none=True)
async def revise(business_id: str, agent_id: str, value: Revise, request: Request):
    return envelope(request, await business.revise(token(request), business_id, agent_id, value))


@router.get("/{business_id}/agents/{agent_id}/revisions", response_model=RevisionsEnvelope,
    response_model_exclude_none=True)
async def revisions(business_id: str, agent_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
        cursor: str | None = Query(None, min_length=1, max_length=2048)):
    return envelope(request, await business.revisions(token(request), business_id, agent_id, limit=limit, cursor=cursor))


@router.get("/{business_id}/agents/{agent_id}/revisions/{revision}", response_model=ConfigEnvelope,
    response_model_exclude_none=True)
async def revision(business_id: str, agent_id: str, request: Request, revision: int = Path(ge=1, le=2147483647)):
    return envelope(request, await business.revision(token(request), business_id, agent_id, revision))
