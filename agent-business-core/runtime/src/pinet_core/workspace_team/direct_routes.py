"""Seven fixed authenticated DM operations; client data never selects execution code."""
from fastapi import APIRouter, Depends, Query, Request

from ..control.routes import authenticated
from ..control.routes import envelope as core_envelope
from ..creation.routes import CreationRoute
from ..customer.service import customer_guard
from ..workspace_topics.routes import query_keys
from . import direct, direct_projection
from .direct_wire import (
    VERSION,
    DirectAcceptedEnvelope,
    DirectCancel,
    DirectChatEnvelope,
    DirectChatsEnvelope,
    DirectCreate,
    DirectHistoryEnvelope,
    DirectRecipientsEnvelope,
    DirectSend,
    DirectTurnEnvelope,
)

router = APIRouter(prefix="/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/direct",
    route_class=CreationRoute, dependencies=[Depends(customer_guard)])


def envelope(request, data):
    value = core_envelope(request, data)
    value["contract_version"] = VERSION
    return value


@router.get("/recipients", response_model=DirectRecipientsEnvelope)
async def recipients(portfolio_id: str, topic_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, min_length=1, max_length=2048), context=Depends(authenticated, scope="function")):
    query_keys(request, {"limit", "cursor"})
    tx, session = context
    return envelope(request, await direct_projection.recipients(tx, session, portfolio_id, topic_id, limit=limit, cursor=cursor))


@router.get("/chats", response_model=DirectChatsEnvelope)
async def chats(portfolio_id: str, topic_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, min_length=1, max_length=2048), context=Depends(authenticated, scope="function")):
    query_keys(request, {"limit", "cursor"})
    tx, session = context
    return envelope(request, await direct_projection.chats(tx, session, portfolio_id, topic_id, limit=limit, cursor=cursor))


@router.post("/chats", response_model=DirectChatEnvelope)
async def create(portfolio_id: str, topic_id: str, value: DirectCreate, request: Request,
    context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await direct.create(tx, session, portfolio_id, topic_id, value))


@router.get("/chats/{chat_id}", response_model=DirectChatEnvelope)
async def detail(portfolio_id: str, topic_id: str, chat_id: str, request: Request,
    context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await direct.detail(tx, session, portfolio_id, topic_id, chat_id))


@router.get("/chats/{chat_id}/events", response_model=DirectHistoryEnvelope)
async def history(portfolio_id: str, topic_id: str, chat_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, min_length=1, max_length=2048), context=Depends(authenticated, scope="function")):
    query_keys(request, {"limit", "cursor"})
    tx, session = context
    return envelope(request, await direct_projection.history(tx, session, portfolio_id, topic_id, chat_id, limit=limit, cursor=cursor))


@router.post("/chats/{chat_id}/turns", response_model=DirectAcceptedEnvelope)
async def send(portfolio_id: str, topic_id: str, chat_id: str, value: DirectSend, request: Request,
    context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await direct.send(tx, session, portfolio_id, topic_id, chat_id, value))


@router.post("/chats/{chat_id}/turns/{task_id}/cancel", response_model=DirectTurnEnvelope)
async def cancel(portfolio_id: str, topic_id: str, chat_id: str, task_id: str, value: DirectCancel, request: Request,
    context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await direct_projection.cancel(tx, session, portfolio_id, topic_id, chat_id, task_id))
