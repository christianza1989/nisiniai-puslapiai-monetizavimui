from fastapi import APIRouter, Depends, Request
from pydantic import ValidationError
from ..control.routes import ControlError, SafeRoute, authenticated, envelope, identifier
from . import service
from .wire import DetailEnvelope, PageEnvelope

router = APIRouter(prefix="/operator/v2/businesses", route_class=SafeRoute)


def response(request, data):
    return {**envelope(request, data), "contract_version": "mail-view.v1"}


@router.get("/{business_id}/mail", response_model=PageEnvelope)
async def listing(business_id: str, request: Request, context=Depends(authenticated, scope="function")):
    if await request.body() or any(key not in {"case_id", "before"}
            or len(request.query_params.getlist(key)) != 1 for key in request.query_params):
        raise ControlError(400, "invalid_request")
    query = {key: identifier(value) for key, value in request.query_params.items()}
    tx, session = context
    try:
        data = await service.listing(tx, session, identifier(business_id), **query)
    except ValidationError:
        raise ControlError(503, "mail_source_unavailable") from None
    return response(request, data.model_dump(mode="json"))


@router.get("/{business_id}/mail/{mail_id}", response_model=DetailEnvelope)
async def detail(business_id: str, mail_id: str, request: Request, context=Depends(authenticated, scope="function")):
    if request.url.query or await request.body():
        raise ControlError(400, "invalid_request")
    tx, session = context
    try:
        data = await service.detail(tx, session, identifier(business_id), identifier(mail_id))
    except (ValidationError, TypeError, ValueError):
        raise ControlError(503, "mail_source_unavailable") from None
    return response(request, data.model_dump(mode="json"))
