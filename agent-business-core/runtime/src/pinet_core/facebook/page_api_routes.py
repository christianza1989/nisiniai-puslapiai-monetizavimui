from fastapi import APIRouter, Depends

from ..config import settings
from ..db import db
from ..security import operator_auth, worker_auth
from ..service import business
from . import page_api_service as service
from .browser_contracts import MediaInput
from .page_api_contracts import PageApiJob, PageApiPolicyUpdate, ResolvePageApi, RunPageApi, VerifyPage
from .route_types import BoundedRoute

router = APIRouter(route_class=BoundedRoute)
ROOT = "/operator/sites/{site_id}/facebook/page-api"


@router.get(ROOT, dependencies=[Depends(operator_auth)])
async def dashboard(site_id: str):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return {"site_id": site_id, **await service.dashboard(tx, item)}


@router.put(ROOT + "/policy", dependencies=[Depends(operator_auth)])
async def policy(site_id: str, data: PageApiPolicyUpdate):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.update_policy(tx, item, data)


@router.post(ROOT + "/verify", dependencies=[Depends(operator_auth)])
async def verify(site_id: str, data: VerifyPage):
    return await service.verify(await business(site_id), data.credential_key)


@router.post(ROOT + "/media", dependencies=[Depends(operator_auth)])
async def media(site_id: str, data: MediaInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.media(tx, item, data)


@router.post(ROOT + "/jobs", dependencies=[Depends(operator_auth)])
async def queue(site_id: str, data: PageApiJob):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return service.public_job(await service.queue(tx, item, data))


@router.post("/internal/sites/{site_id}/facebook/page-api/run-once", dependencies=[Depends(worker_auth)])
async def run_once(site_id: str, data: RunPageApi):
    return service.public_job(await service.run_once(await business(site_id), data.owner))


@router.post(ROOT + "/jobs/{ident}/check", dependencies=[Depends(operator_auth)])
async def check(site_id: str, ident: str):
    return service.public_job(await service.check(await business(site_id), ident))


@router.post(ROOT + "/jobs/{ident}/resolve", dependencies=[Depends(operator_auth)])
async def resolve(site_id: str, ident: str, data: ResolvePageApi):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return service.public_job(await service.resolve(tx, item, ident, data))
