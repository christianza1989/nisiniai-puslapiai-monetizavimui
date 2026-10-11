"""Additive local-only routes; no auth dependency holds a DB transaction during a call."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from ..control.routes import SafeRoute
from ..control.routes import envelope as core_envelope
from ..customer.service import customer_guard
from . import service
from .wire import CapabilityEnvelope, Envelope, Error, Start, Turn


class TextRoute(SafeRoute):
    # 4000 Unicode characters plus bounded JSON overhead, including escaped clients.
    body_limit = 65536

    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request):
            try:
                return await handler(request)
            except HTTPException as error:
                # Legacy policy/knowledge helpers keep their own exceptions. Never expose details.
                code = "customer_text_blocked"
                return JSONResponse({"code": code, "message": code,
                    "request_id": request.state.control_request_id}, status_code=error.status_code,
                    headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})
        return bounded


router = APIRouter(prefix="/customer/v2/creations", route_class=TextRoute,
    dependencies=[Depends(customer_guard)], responses={code: {"model": Error} for code in
        (400, 401, 403, 404, 409, 503)})


def token(request):
    return service.bearer_token(request.headers.get("authorization", ""))


def envelope(request, value):
    result = core_envelope(request, value)
    result["contract_version"] = "customer-text.v1"
    return result


@router.get("/{creation_id}/text-capability", response_model=CapabilityEnvelope, response_model_exclude_none=True)
async def capability(creation_id: str, request: Request):
    return envelope(request, await service.capability(token(request), creation_id))


@router.post("/{creation_id}/text-sessions", response_model=Envelope, response_model_exclude_none=True)
async def start(creation_id: str, value: Start, request: Request):
    return envelope(request, await service.start(token(request), creation_id, value))


@router.get("/{creation_id}/text-sessions/{conversation_id}", response_model=Envelope, response_model_exclude_none=True)
async def status(creation_id: str, conversation_id: str, request: Request):
    return envelope(request, await service.status(token(request), creation_id, conversation_id))


@router.post("/{creation_id}/text-sessions/{conversation_id}/turns", response_model=Envelope, response_model_exclude_none=True)
async def turn(creation_id: str, conversation_id: str, value: Turn, request: Request):
    return envelope(request, await service.turn(token(request), creation_id, conversation_id, value))


@router.post("/{creation_id}/text-sessions/{conversation_id}/end", response_model=Envelope, response_model_exclude_none=True)
async def end(creation_id: str, conversation_id: str, request: Request):
    return envelope(request, await service.end(token(request), creation_id, conversation_id))
