from fastapi import APIRouter, Depends, Query, Request

from ..control.routes import ControlError, SafeRoute, authenticated, envelope
from ..creation.routes import owned
from ..customer.service import customer_guard
from .service import projection

router = APIRouter(prefix="/customer/v2/creations", route_class=SafeRoute,
                   dependencies=[Depends(customer_guard)])


@router.get("/{creation_id}/content-completion")
async def completion(creation_id: str, request: Request,
                     accepted_revision: int | None = Query(default=None, ge=1, le=20),
                     context=Depends(authenticated, scope="function")):
    pairs = list(request.query_params.multi_items())
    if len(pairs) > 1 or any(key != "accepted_revision" for key, _ in pairs):
        raise ControlError(400, "invalid_request")
    tx, session = context
    creation = await owned(tx, session, creation_id, lock=True)
    value = envelope(request, await projection(tx, session, creation, accepted_revision))
    value["contract_version"] = "content-completion.v1"
    return value
