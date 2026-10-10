"""Own current verified-customer read route; no persistence or expiry maintenance."""
from fastapi import APIRouter, Depends, Query, Request

from ..control.routes import ControlError, SafeRoute, authenticated
from ..control.routes import envelope as core_envelope
from ..creation.routes import owned
from ..customer.service import customer_guard
from .service import projection

router = APIRouter(prefix="/customer/v2/creations", route_class=SafeRoute,
    dependencies=[Depends(customer_guard)])


@router.get("/{creation_id}/agent-preparation")
async def readiness(creation_id: str, request: Request,
                    accepted_revision: int | None = Query(default=None, ge=1, le=20),
                    context=Depends(authenticated, scope="function")):
    pairs = list(request.query_params.multi_items())
    if any(key != "accepted_revision" for key, _ in pairs) or len(pairs) > 1:
        raise ControlError(400, "invalid_request")
    tx, session = context
    # Lock current User/Session/Creation while observing. No expire(), activation,
    # refresh, session extension, provider or channel operation is performed.
    creation = await owned(tx, session, creation_id, lock=True)
    data = await projection(tx, session, creation, accepted_revision)
    value = core_envelope(request, data)
    value["contract_version"] = "agent-preparation.v1"
    return value
