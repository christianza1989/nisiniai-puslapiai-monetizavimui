from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.routing import APIRoute
from sqlalchemy import select

from ..config import settings
from ..db import db
from ..models import Business
from ..security import operator_auth, worker_auth
from ..service import business
from . import service
from .contracts import ActionInput, GroupInput, InboundFixture, PolicyUpdate, SignalInput


class BoundedRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request: Request):
            if request.method in {"POST", "PUT"} and len(await request.body()) > 20000:
                raise HTTPException(413, "facebook_request_too_large")
            return await handler(request)

        return bounded


router = APIRouter(route_class=BoundedRoute)


@router.get("/operator/facebook-ui", response_class=HTMLResponse)
async def console():
    # Public login shell has no tenant data or credentials.
    return (Path(__file__).parent / "console.html").read_text(encoding="utf-8")


@router.get("/operator/facebook/sites", dependencies=[Depends(operator_auth)])
async def sites():
    async with db.registry() as tx:
        rows = list(await tx.scalars(select(Business).order_by(Business.site_id)))
    return {"sites": [{"site_id": row.site_id, "canonical_host": row.canonical_host} for row in rows],
            "environment": settings().environment}


@router.get("/operator/sites/{site_id}/facebook", dependencies=[Depends(operator_auth)])
async def dashboard(site_id: str):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return {"site_id": site_id, **await service.policy(tx), "overview": await service.overview(tx),
                "groups": await service.listing(tx, "group"), "signals": await service.listing(tx, "signal"),
                "actions": await service.listing(tx, "action"), "drafts": await service.listing(tx, "draft"),
                "audit": await service.listing(tx, "audit")}


@router.put("/operator/sites/{site_id}/facebook/policy", dependencies=[Depends(operator_auth)])
async def policy_update(site_id: str, data: PolicyUpdate):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.update_policy(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/groups", dependencies=[Depends(operator_auth)])
async def group_add(site_id: str, data: GroupInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.add_group(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/signals", dependencies=[Depends(operator_auth)])
async def signal_add(site_id: str, data: SignalInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.add_signal(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/actions", dependencies=[Depends(operator_auth)])
async def action_add(site_id: str, data: ActionInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.queue_draft(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/tick", dependencies=[Depends(operator_auth)])
async def prepare_one(site_id: str):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.tick(tx, item)


@router.post("/internal/sites/{site_id}/facebook/tick", dependencies=[Depends(worker_auth)])
async def worker_tick(site_id: str):
    return await prepare_one(site_id)


@router.post("/internal/sites/{site_id}/facebook/inbound-fixture", dependencies=[Depends(worker_auth)])
async def inbound_fixture(site_id: str, data: InboundFixture):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.import_fixture(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/actions/{action_id}/send", dependencies=[Depends(operator_auth)])
async def send_disabled(site_id: str, action_id: str):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        await service.require_enabled(tx)
        await service.by_id(tx, "action", action_id)
    raise HTTPException(503, "facebook_live_transport_not_connected")
