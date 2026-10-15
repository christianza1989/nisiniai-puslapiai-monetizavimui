from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from ..control.routes import ControlError, authenticated
from ..control.routes import envelope as core_envelope
from ..creation.routes import CreationRoute
from ..customer.service import customer_guard
from . import service
from .wire import Anchor, AppendMessage, Create, Envelope, Kind, SetMetadata

router = APIRouter(prefix="/customer/v2/portfolios/{portfolio_id}/workspace-topics",
                   route_class=CreationRoute, dependencies=[Depends(customer_guard)])


def envelope(request, data):
    value = core_envelope(request, data)
    value["contract_version"] = "workspace-topics.v1"
    return value


def query_keys(request, allowed):
    if any(key not in allowed or len(request.query_params.getlist(key)) != 1 for key in request.query_params):
        raise ControlError(400, "invalid_request")


@router.get("", response_model=Envelope)
async def topics(portfolio_id: str, request: Request, kind: Kind | None = None, selection_id: UUID | None = None,
                 state: str = "active", limit: int = Query(20, ge=1, le=50),
                 q: str = Query("", max_length=100), cursor: str | None = Query(None, min_length=1, max_length=2048),
                 context=Depends(authenticated, scope="function")):
    query_keys(request, {"kind", "selection_id", "state", "limit", "q", "cursor"})
    if (kind is None) != (selection_id is None):
        raise ControlError(400, "invalid_request")
    anchor = Anchor(kind=kind, selection_id=selection_id) if kind is not None else None
    tx, session = context
    return envelope(request, await service.listing(tx, session, portfolio_id, anchor, limit=limit,
                                                  query=q, state=state, cursor=cursor))


@router.post("", response_model=Envelope)
async def create(portfolio_id: str, value: Create, request: Request, context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await service.create(tx, session, portfolio_id, value))


@router.get("/{topic_id}", response_model=Envelope)
async def topic(portfolio_id: str, topic_id: str, request: Request, context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await service.read(tx, session, portfolio_id, topic_id))


@router.post("/{topic_id}/controls", response_model=Envelope)
async def controls(portfolio_id: str, topic_id: str, value: SetMetadata, request: Request,
                   context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await service.controls(tx, session, portfolio_id, topic_id, value))


@router.get("/{topic_id}/messages", response_model=Envelope)
async def history(portfolio_id: str, topic_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
                  cursor: str | None = Query(None, min_length=1, max_length=2048),
                  context=Depends(authenticated, scope="function")):
    query_keys(request, {"limit", "cursor"})
    tx, session = context
    return envelope(request, await service.history(tx, session, portfolio_id, topic_id, limit=limit, cursor=cursor))


@router.post("/{topic_id}/messages", response_model=Envelope)
async def append(portfolio_id: str, topic_id: str, value: AppendMessage, request: Request,
                 context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await service.append(tx, session, portfolio_id, topic_id, value))
