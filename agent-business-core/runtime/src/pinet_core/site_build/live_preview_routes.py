"""Ordinary customer actions; no caller-selected proof, origin or process."""
import json
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, Request

from ..control.routes import ControlError, SafeRoute, envelope, identifier
from ..customer.service import customer_guard
from ..customer_text.service import bearer_token
from . import live_preview as service
from . import live_preview_wire as wire
from . import service as builds


@asynccontextmanager
async def lifespan(app):
    # Registry construction starts no task, worker, process or filesystem write.
    app.state.customer_live_preview_service = service.Service()
    try:
        yield
    finally:
        await service.close_service(app)


class PreviewRoute(SafeRoute):
    body_limit = 4096


router = APIRouter(prefix="/customer/v2/creations/{creation_id}/live-previews", route_class=PreviewRoute,
    dependencies=[Depends(customer_guard), Depends(builds.enabled)], lifespan=lifespan)


async def context(request, *, body=False):
    if request.query_params or not body and await request.body():
        raise ControlError(400, "invalid_request")
    manager = getattr(request.app.state, "customer_live_preview_service", None)
    if manager is None:
        raise ControlError(503, "live_preview_service_unavailable")
    return manager, bearer_token(request.headers.get("authorization", ""))


def result(request, data, model):
    value = envelope(request, data)
    value["contract_version"] = wire.CONTRACT
    return model.model_validate_json(json.dumps(value))


@router.get("", response_model=wire.AvailabilityEnvelope)
async def availability(creation_id: str, request: Request):
    manager, token = await context(request)
    return result(request, await manager.availability(token, identifier(creation_id)), wire.AvailabilityEnvelope)


@router.post("", response_model=wire.LeaseEnvelope, status_code=202)
async def start(creation_id: str, body: wire.Start, request: Request):
    manager, token = await context(request, body=True)
    return result(request, await manager.start(token, identifier(creation_id), body), wire.LeaseEnvelope)


@router.get("/{lease_id}", response_model=wire.LeaseEnvelope)
async def detail(creation_id: str, lease_id: str, request: Request):
    manager, token = await context(request)
    return result(request, await manager.detail(token, identifier(creation_id), identifier(lease_id)), wire.LeaseEnvelope)


@router.delete("/{lease_id}", response_model=wire.LeaseEnvelope)
async def close(creation_id: str, lease_id: str, request: Request):
    manager, token = await context(request)
    return result(request, await manager.detail(token, identifier(creation_id), identifier(lease_id), close=True), wire.LeaseEnvelope)
