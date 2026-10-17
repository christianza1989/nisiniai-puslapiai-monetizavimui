"""Explicit owner writes plus a strictly read-only projection."""
from fastapi import APIRouter, Depends, Request

from ..control.routes import authenticated
from ..control.routes import envelope as core_envelope
from ..creation.routes import CreationRoute
from ..customer.service import customer_guard
from ..workspace_topics.routes import query_keys
from . import workflow
from .wire import Cancel
from .workflow_wire import VERSION, PrepareAndTest, WorkflowEnvelope

router = APIRouter(prefix="/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-workflows",
    route_class=CreationRoute, dependencies=[Depends(customer_guard)])


def envelope(request, data):
    value = core_envelope(request, data)
    value["contract_version"] = VERSION
    return value


@router.post("", response_model=WorkflowEnvelope)
async def accept(portfolio_id: str, topic_id: str, value: PrepareAndTest, request: Request,
        context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await workflow.accept(tx, session, portfolio_id, topic_id, value))


@router.get("/{workflow_id}", response_model=WorkflowEnvelope)
async def read(portfolio_id: str, topic_id: str, workflow_id: str, request: Request,
        context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await workflow.read(tx, session, portfolio_id, topic_id, workflow_id))


@router.post("/{workflow_id}/cancel", response_model=WorkflowEnvelope)
async def cancel(portfolio_id: str, topic_id: str, workflow_id: str, value: Cancel, request: Request,
        context=Depends(authenticated, scope="function")):
    query_keys(request, set())
    tx, session = context
    return envelope(request, await workflow.cancel(tx, session, portfolio_id, topic_id, workflow_id))
