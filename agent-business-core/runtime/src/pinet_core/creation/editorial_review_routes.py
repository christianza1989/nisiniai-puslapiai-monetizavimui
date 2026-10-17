"""Two bounded authenticated actions; no generic native command surface."""
import json

from fastapi import APIRouter, Depends, Request

from ..control.routes import ControlError, SafeRoute, authenticated, envelope
from ..customer.service import customer_guard
from . import editorial_review as service


class EditorialRoute(SafeRoute):
    body_limit = 131072


router = APIRouter(prefix="/customer/v2/creations", route_class=EditorialRoute,
    dependencies=[Depends(customer_guard)])


@router.post("/{creation_id}/editorial-reviews", response_model=service.EditorialResultEnvelope)
async def record(creation_id: str, body: service.RecordReview, request: Request,
                 context=Depends(authenticated, scope="function")):
    if request.query_params:
        raise ControlError(400, "invalid_request")
    tx, session = context
    value = envelope(request, await service.record_review(tx, session, creation_id, body))
    value["contract_version"] = service.CONTRACT
    return service.EditorialResultEnvelope.model_validate_json(json.dumps(value))


@router.post("/{creation_id}/editorial-approvals", response_model=service.EditorialResultEnvelope)
async def approve(creation_id: str, body: service.ApproveBatch, request: Request,
                  context=Depends(authenticated, scope="function")):
    if request.query_params:
        raise ControlError(400, "invalid_request")
    tx, session = context
    value = envelope(request, await service.approve_batch(tx, session, creation_id, body))
    value["contract_version"] = service.CONTRACT
    return service.EditorialResultEnvelope.model_validate_json(json.dumps(value))
