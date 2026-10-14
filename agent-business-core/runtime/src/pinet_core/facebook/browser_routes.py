from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import Field
from sqlalchemy import select

from ..config import settings
from ..db import db
from ..models import utcnow
from ..security import operator_auth, worker_auth
from ..service import business
from . import browser_extensions as extension
from . import browser_service as service
from . import service as fb
from .browser_contracts import (
    BlockInput,
    BrowserPolicyUpdate,
    ClaimInput,
    DiscoveryResult,
    GroupAccessInput,
    MediaInput,
    PostInput,
    PublisherBinding,
    ReceiptInput,
    ReconcileInput,
    Strict,
    SubmitInput,
    TaskInput,
)
from .models import FacebookRecord
from .route_types import BoundedRoute

router = APIRouter(route_class=BoundedRoute)


@router.get("/operator/facebook-browser-ui", response_class=HTMLResponse)
async def console():
    return (Path(__file__).parent / "browser_console.html").read_text(encoding="utf-8")


@router.get("/operator/sites/{site_id}/facebook/browser", dependencies=[Depends(operator_auth)])
async def dashboard(site_id: str):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return {"site_id": site_id, **await service.dashboard(tx)}


@router.put("/operator/sites/{site_id}/facebook/browser/policy", dependencies=[Depends(operator_auth)])
async def policy(site_id: str, data: BrowserPolicyUpdate):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.update_policy(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/browser/bindings", dependencies=[Depends(operator_auth)])
async def bind(site_id: str, data: PublisherBinding):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.bind(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/browser/posts", dependencies=[Depends(operator_auth)])
async def post(site_id: str, data: PostInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.queue(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/browser/media", dependencies=[Depends(operator_auth)])
async def media(site_id: str, data: MediaInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await extension.add_media(tx, item, data)


@router.post("/operator/sites/{site_id}/facebook/browser/group-access", dependencies=[Depends(operator_auth)])
async def group_access(site_id: str, data: GroupAccessInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await extension.group_access(tx, item, data)


@router.post("/internal/sites/{site_id}/facebook/browser/posts/{ident}/discovery-result",
             dependencies=[Depends(worker_auth)])
async def discovery(site_id: str, ident: str, data: DiscoveryResult):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await extension.complete_discovery(tx, item, ident, data)


@router.post("/operator/sites/{site_id}/facebook/browser/posts/{ident}/reconcile",
             dependencies=[Depends(operator_auth)])
async def reconcile(site_id: str, ident: str, data: ReconcileInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.reconcile(tx, item, ident, data)


@router.post("/internal/sites/{site_id}/facebook/browser/claim", dependencies=[Depends(worker_auth)])
async def claim(site_id: str, data: ClaimInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.claim(tx, item, data)


@router.post("/internal/sites/{site_id}/facebook/browser/posts/{ident}/renew", dependencies=[Depends(worker_auth)])
async def renew(site_id: str, ident: str, data: TaskInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.renew(tx, item, ident, data)


@router.post("/internal/sites/{site_id}/facebook/browser/posts/{ident}/resume", dependencies=[Depends(worker_auth)])
async def resume(site_id: str, ident: str, data: ClaimInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.resume(tx, item, ident, data)


@router.post("/internal/sites/{site_id}/facebook/browser/posts/{ident}/check", dependencies=[Depends(worker_auth)])
async def check(site_id: str, ident: str, data: ClaimInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.check(tx, item, ident, data)


@router.post("/internal/sites/{site_id}/facebook/browser/posts/{ident}/submit-permit",
             dependencies=[Depends(worker_auth)])
async def permit(site_id: str, ident: str, data: SubmitInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.submit_permit(tx, item, ident, data)


@router.post("/internal/sites/{site_id}/facebook/browser/posts/{ident}/receipt",
             dependencies=[Depends(worker_auth)])
async def receipt(site_id: str, ident: str, data: ReceiptInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.receipt(tx, item, ident, data)


@router.post("/internal/sites/{site_id}/facebook/browser/posts/{ident}/block",
             dependencies=[Depends(worker_auth)])
async def block(site_id: str, ident: str, data: BlockInput):
    item = await business(site_id)
    async with db.transaction(item.id, settings().environment) as tx:
        return await service.block(tx, item, ident, data)


def isolated_fixture(request):
    cfg = settings()
    if not (cfg.allow_simulation and cfg.environment.startswith("test-") and request.client
            and request.client.host in {"127.0.0.1", "::1", "testclient", "127.0.0.1-test"}):
        raise HTTPException(403, "facebook_fixture_requires_isolated_loopback")


@router.get("/operator/facebook-browser-fixture/{kind}/{actor_id}", response_class=HTMLResponse)
async def fixture(kind: str, actor_id: str, request: Request):
    isolated_fixture(request)
    if kind == "posts":
        return await fixture_receipt(actor_id, request)
    if (kind, actor_id) not in {("page", "fixture-page"), ("profile", "fixture-profile")}:
        raise HTTPException(404, "unknown_fixture_actor")
    return (Path(__file__).parent / "browser_fixture.html").read_text(encoding="utf-8")


class FixturePost(Strict):
    actor_kind: Literal["page", "profile"]
    actor_id: str = Field(max_length=100)
    body: str = Field(max_length=5000)
    audience: Literal["public", "friends", "only_me"]
    media_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")


@router.post("/operator/facebook-browser-fixture/{kind}/{actor_id}")
async def fixture_publish(kind: str, actor_id: str, data: FixturePost, request: Request):
    isolated_fixture(request)
    if kind != data.actor_kind or actor_id != data.actor_id:
        raise HTTPException(409, "wrong_fixture_actor")
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        await fb.module_lock(tx, item)
        jobs = (await tx.scalars(select(FacebookRecord).where(FacebookRecord.kind == "browser_post",
            FacebookRecord.state == "submitting").with_for_update())).all()
        jobs = [job for job in jobs if job.payload["binding"]["verification_scope"] == "fixture"
                and job.payload["binding"]["actor_id"] == actor_id
                and job.payload["binding"]["actor_kind"] == kind
                and job.payload["audience"] == data.audience
                and (extension.task_projection(job)["media"] or {}).get("sha256") == data.media_sha256
                and job.payload["body_sha256"] == service.body_hash(data.body)]
        if len(jobs) != 1:
            raise HTTPException(409, "fixture_requires_one_matching_submit_permit")
        job = jobs[0]
        await service.binding_guard(tx, item, job=job)
        await fb.fenced_account(tx, job.payload["binding"]["account_key"], job.payload["lease_owner"], job.payload["epoch"])
        if datetime_from_iso(job.payload["submit_permit_until"]) < utcnow():
            raise HTTPException(409, "fixture_submit_permit_expired")
        old = await fb.record(tx, "browser_fixture_post", job.id)
        if old:
            raise HTTPException(409, "fixture_one_write_only")
        result = fb.add(tx, item, "browser_fixture_post", job.id, "synthetic_visible",
            {"actor_id": actor_id, "actor_kind": kind, "body": data.body, "media_sha256": data.media_sha256})
        await tx.flush()
        return {"id": result.id, "body": data.body, "actor_id": actor_id, "actor_kind": kind,
                "permalink": job.payload["binding"]["target_url"].rsplit("/", 2)[0] + "/posts/" + result.id,
                "synthetic": True, "external_sending": False}


def datetime_from_iso(value):
    from datetime import datetime
    return datetime.fromisoformat(value)


@router.get("/operator/facebook-browser-fixture/posts/{ident}", response_class=HTMLResponse)
async def fixture_receipt(ident: str, request: Request):
    import html
    isolated_fixture(request)
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        row = await fb.by_id(tx, "browser_fixture_post", ident)
        return "<h1>Bandymo įrašas paskelbtas</h1><p>" + html.escape(row.payload["body"]) + "</p>"
