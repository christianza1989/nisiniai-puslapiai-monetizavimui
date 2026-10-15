from fastapi import APIRouter, Depends, Query, Request

from ..control.routes import authenticated
from ..control.routes import envelope as core_envelope
from ..creation.routes import CreationRoute
from ..customer.service import customer_guard
from ..workspace_topics.routes import query_keys
from . import directory, service
from .directory_wire import DirectoryEnvelope
from .episode_wire import VERSION as EPISODE_VERSION
from .episode_wire import EpisodeEnvelope, TestAgent
from .preparation_wire import VERSION, PreparationEnvelope, PrepareAgent
from .wire import Cancel, Envelope, Send

router = APIRouter(prefix="/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team",
    route_class=CreationRoute, dependencies=[Depends(customer_guard)])


def envelope(request, data):
    value = core_envelope(request, data)
    value["contract_version"] = "workspace-team.v1"
    return value


@router.get("/roster", response_model=Envelope)
async def roster(portfolio_id: str, topic_id: str, request: Request, context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await service.roster(tx, session, portfolio_id, topic_id))


@router.post("/agent-tests", response_model=EpisodeEnvelope)
async def test_agent(portfolio_id: str, topic_id: str, value: TestAgent, request: Request,
    context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    data = await service.send_episode(tx, session, portfolio_id, topic_id, value)
    result = core_envelope(request, data)
    result["contract_version"] = EPISODE_VERSION
    return result


@router.get("/directory", response_model=DirectoryEnvelope)
async def team_directory(portfolio_id: str, topic_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, min_length=1, max_length=2048), context=Depends(authenticated, scope="function")):
    query_keys(request, {"limit", "cursor"})
    tx, session = context
    row = await service.topic(tx, session, portfolio_id, topic_id)
    value = core_envelope(request, await directory.read(tx, session, row, limit=limit, cursor=cursor))
    value["contract_version"] = "workspace-directory.v1"
    return value


@router.get("/events", response_model=Envelope)
async def history(portfolio_id: str, topic_id: str, request: Request, limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, min_length=1, max_length=2048), context=Depends(authenticated, scope="function")):
    query_keys(request, {"limit", "cursor"})
    tx, session = context
    return envelope(request, await service.history(tx, session, portfolio_id, topic_id, limit=limit, cursor=cursor))


@router.post("/turns", response_model=Envelope)
async def send(portfolio_id: str, topic_id: str, value: Send, request: Request, context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await service.send(tx, session, portfolio_id, topic_id, value))


@router.post("/agent-preparations", response_model=PreparationEnvelope)
async def prepare_agent(portfolio_id: str, topic_id: str, value: PrepareAgent, request: Request,
    context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    owner = Send(idempotency_key=value.idempotency_key, content=value.content, reply_to_event_id=value.reply_to_event_id)
    data = await service.send(tx, session, portfolio_id, topic_id, owner, preparation=value)
    result = core_envelope(request, data)
    result["contract_version"] = VERSION
    return result


@router.post("/turns/{task_id}/cancel", response_model=Envelope)
async def cancel(portfolio_id: str, topic_id: str, task_id: str, value: Cancel, request: Request,
    context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await service.cancel(tx, session, portfolio_id, topic_id, task_id))
