"""Actual RLS/Node continuation, synthetic three-role outputs, provider0."""
import asyncio
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import plan_roles
from test_content_work import brief, roles
from test_creation_team import runner
from test_customer_creations import creation as creation_fixture
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.business_discovery import worker as discovery_worker
from pinet_core.config import settings
from pinet_core.content_work import worker as guide_worker
from pinet_core.content_work.models import GuideAttempt, GuideJob
from pinet_core.control.models import Session
from pinet_core.control.routes import ControlError
from pinet_core.creation import studio
from pinet_core.creation.models import Job
from pinet_core.models import utcnow
from pinet_core.site_build import service, worker
from pinet_core.tasks.codex_transport import RunnerError

creation = creation_fixture


@pytest.fixture
async def build(creation,monkeypatch):
    for key in ("site_build_enabled","business_discovery_enabled","business_discovery_runner_enabled"):
        monkeypatch.setattr(settings(),key,True)
    monkeypatch.setattr(settings(),"creation_language_review_enabled",False)
    monkeypatch.setattr(settings(),"creation_daily_limit",0)
    monkeypatch.setattr(settings(),"creation_global_daily_limit",0)
    monkeypatch.setattr(service,"source_current",lambda:True)
    return creation


async def approved(c):
    _,auth,me = await verified(c)
    domain = uuid4().hex+".example.test"
    async def planning(context,authorized,**kwargs):
        value,receipt = await plan_roles(context,authorized,**kwargs)
        if kwargs["role"] == "creator":
            value["plan"]["canonical_host_candidate"] = domain
        return value,receipt
    started = await c["client"].post("/customer/v2/discoveries",headers=auth,json={
        "portfolio_id":me["portfolios"][0]["portfolio_id"],
        "message":"Padėkite sukurti nedidelio verslo svetainę.","idempotency_key":str(uuid4())})
    assert started.status_code == 202,started.text
    did = started.json()["data"]["discovery_id"]
    assert await discovery_worker.execute_once(discovery_id=did,role_runner=planning)
    detail = (await c["client"].get("/customer/v2/discoveries/"+did,headers=auth)).json()["data"]
    response = await c["client"].post("/customer/v2/discoveries/"+did+"/build",headers=auth,json={
        "report_revision":detail["current_revision"],"report_sha256":detail["latest_report_sha256"],
        "idempotency_key":str(uuid4())})
    assert response.status_code == 202,response.text
    return response.json()["data"]["creation_id"],auth


def business_roles():
    base = runner([])
    async def role(context,authorized,**kwargs):
        value,receipt = await base(context,authorized,**kwargs)
        if kwargs["role"] == "creator":
            value["content_plan"] = [brief(path,title) for path,title in (
                ("/gidai/uzduotis/","Kaip pasirinkti vieną komandos užduotį?"),
                ("/gidai/duomenys/","Kokius duomenis naudoti bandymui?"),
                ("/gidai/rezultatas/","Kaip palyginti bandymo rezultatą?"))]
        return value,receipt
    return role


async def first(c):
    cid,auth = await approved(c)
    result = await worker.tick(cid,creation_role_runner=business_roles(),intake_runner=studio.import_draft)
    assert result["phase"] == "initial_content" and result["state"] == "queued",result
    return cid,auth,result


async def test_approved_build_automatically_queues_initial_guides_and_survives_replay(build):
    c = build
    cid,_,initial = await first(c)
    repeats = await asyncio.gather(service.advance(cid),service.advance(cid))
    assert {r["job_id"] for r in repeats} == {initial["job_id"]}
    for index in range(3):
        result = await worker.tick(cid,guide_role_runner=roles())
        assert result["executed"] and result["completed_initial_guides"] == index+1,result
    assert result["phase"] == "page_quality" and result["state"] == "blocked"
    assert result["foundation_status"] == "UNVERIFIED"
    assert not (await worker.tick(cid,guide_role_runner=roles()))["executed"]
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id==cid)) == 3
        assert await tx.scalar(select(func.count()).select_from(GuideAttempt).where(GuideAttempt.creation_id==cid)) == 9


async def test_target_worker_does_not_consume_another_approved_case(build):
    c = build
    other,_ = await approved(c)
    target,_ = await approved(c)
    result = await worker.tick(target,creation_role_runner=business_roles(),intake_runner=studio.import_draft)
    assert result["creation_id"] == target and result["phase"] == "initial_content"
    async with AsyncSession(c["admin"]) as tx:
        old = await tx.scalar(select(Job).where(Job.creation_id==other))
        assert old.status == "queued" and old.usage is None


async def test_archiving_stops_admission_and_existing_guide_before_dispatch(build):
    c = build
    cid,auth,first_result = await first(c)
    archived = await c["client"].post("/customer/v2/creations/"+cid+"/archive",
        headers=auth,json={"idempotency_key":str(uuid4())})
    assert archived.status_code == 200,archived.text
    result = await service.advance(cid)
    assert result["state"] == "blocked"
    async def forbidden(*args,**kwargs):
        pytest.fail("Archived work cannot call a provider")
    assert not await guide_worker.execute_once(creation_id=cid,role_runner=forbidden)
    async with AsyncSession(c["admin"]) as tx:
        job = await tx.get(GuideJob,first_result["job_id"])
        assert job.status == "cancelled" and job.finished_at is not None
        assert await tx.scalar(select(func.count()).select_from(GuideAttempt).where(GuideAttempt.job_id==job.id)) == 0
    assert not (await worker.tick(cid,guide_role_runner=forbidden))["executed"]


async def test_expiry_and_source_change_do_not_admit_another_guide(build,monkeypatch):
    c = build
    cid,_,initial = await first(c)
    async with AsyncSession(c["admin"]) as tx:
        session_id = (await tx.get(GuideJob,initial["job_id"])).session_id
    monkeypatch.setattr(settings(),"control_source_revision","f"*40)
    stale = await service.advance(cid)
    assert stale["state"] == "blocked" and stale["code"] == "site_build_source_stale"
    async with AsyncSession(c["admin"]) as tx,tx.begin():
        await tx.execute(update(Session).where(Session.id==session_id).values(expires_at=utcnow()-timedelta(seconds=1)))
    with pytest.raises(ControlError) as failed:
        await service.advance(cid)
    assert failed.value.code == "unauthenticated"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id==cid)) == 1


async def test_archive_during_role_retains_attempt_and_fences_late_write(build):
    c = build
    cid,auth,initial = await first(c)
    async def stopped(context,authorized,**kwargs):
        assert kwargs["role"] == "creator" and await authorized()
        response = await c["client"].post("/customer/v2/creations/"+cid+"/archive",
            headers=auth,json={"idempotency_key":str(uuid4())})
        assert response.status_code == 200,response.text
        assert not await authorized()
        raise RunnerError("authorization_revoked", {"usage":{"input_tokens":100,"output_tokens":20}})
    assert await guide_worker.execute_once(creation_id=cid,role_runner=stopped)
    async with AsyncSession(c["admin"]) as tx:
        job = await tx.get(GuideJob,initial["job_id"])
        assert job.status == "cancelled" and job.result is None
        assert await tx.scalar(select(func.count()).select_from(GuideAttempt).where(GuideAttempt.job_id==job.id)) == 1
    assert not (await worker.tick(cid,guide_role_runner=stopped))["executed"]
