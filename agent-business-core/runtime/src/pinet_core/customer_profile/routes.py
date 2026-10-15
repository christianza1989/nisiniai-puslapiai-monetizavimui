from fastapi import APIRouter, Depends, Query, Request

from ..control.routes import ControlError, SafeRoute, authenticated
from ..control.routes import envelope as core_envelope
from ..creation.routes import owned
from ..customer.service import customer_guard
from .service import pin_registration, projection

router = APIRouter(prefix="/customer/v2/creations", route_class=SafeRoute,
    dependencies=[Depends(customer_guard)])


@router.get("/{creation_id}/agent-profile")
async def profile(creation_id: str, request: Request,
                  accepted_revision: int | None = Query(default=None, ge=1, le=20),
                  context=Depends(authenticated, scope="function")):
    pairs = list(request.query_params.multi_items())
    if len(pairs) > 1 or any(key != "accepted_revision" for key, _ in pairs):
        raise ControlError(400, "invalid_request")
    tx, session = context
    registration_identity = await pin_registration(tx, creation_id)
    creation = await owned(tx, session, creation_id, lock=True)
    value = core_envelope(request, await projection(tx, session, creation, accepted_revision,
        registration_identity=registration_identity))
    value["contract_version"] = "agent-profile.v1"
    return value
