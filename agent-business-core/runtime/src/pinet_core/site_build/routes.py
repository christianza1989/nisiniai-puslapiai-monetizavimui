"""Fixed owner-facing Foundation observations, independently from deployment."""
from fastapi import APIRouter, Depends, Request

from ..control.routes import ControlError, authenticated
from ..control.routes import envelope as shared_envelope
from ..creation.routes import CreationRoute, owned
from ..customer.service import customer_guard
from ..customer_text.service import bearer_token
from . import receipts, service
from .receipt_wire import Check

router = APIRouter(prefix="/customer/v2/creations", route_class=CreationRoute,
    dependencies=[Depends(customer_guard), Depends(service.enabled)])


def envelope(request, data):
    value = shared_envelope(request, data)
    value["contract_version"] = "site-foundation.v1"
    return value


@router.get("/{creation_id}/foundation")
async def detail(creation_id: str, request: Request, context=Depends(authenticated, scope="function")):
    if request.query_params:
        raise ControlError(400, "invalid_request")
    tx, session = context
    creation = await owned(tx, session, creation_id)
    return envelope(request, await receipts.view(tx, session, creation))


@router.post("/{creation_id}/foundation/checks")
async def check(creation_id: str, value: Check, request: Request):
    if request.query_params:
        raise ControlError(400, "invalid_request")
    # Each maintained token/owner scope closes before the long fixed Node/HTTP observation.
    token = bearer_token(request.headers.get("authorization", ""))
    return envelope(request, await receipts.check(token, creation_id, value))
