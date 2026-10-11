"""Sanitized read-only customer receipt. No worker credentials or activation route."""

from fastapi import APIRouter, Depends, Request

from ..control.routes import SafeRoute, envelope
from ..customer.service import customer_guard
from ..customer_text.service import bearer_token
from . import service
from .wire import Envelope

router = APIRouter(
    prefix="/customer/v2/creations", route_class=SafeRoute, dependencies=[Depends(customer_guard)]
)


@router.get(
    "/{creation_id}/agents/{agent_id}/xbot/tickets/{ticket_id}",
    response_model=Envelope,
    response_model_exclude_none=True,
)
async def receipt(creation_id: str, agent_id: str, ticket_id: str, request: Request):
    token = bearer_token(request.headers.get("authorization", ""))
    result = envelope(request, await service.receipt(token, creation_id, agent_id, ticket_id))
    result["contract_version"] = "xbot-local-receipt.v1"
    return result
