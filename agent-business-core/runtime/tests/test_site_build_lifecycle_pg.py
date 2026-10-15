"""Actual scoped queue/approval/native GUIDE catch-up with inert role callbacks."""
import asyncio
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import plan_roles, questions, start
from test_customer_public import verified
from test_site_build import build as build_fixture
from test_site_build import business_roles, creation, customers, roles  # noqa: F401

from pinet_core.business_discovery import worker as discovery_worker
from pinet_core.business_discovery.models import BuildApproval, Discovery, DiscoveryJob, Report
from pinet_core.config import settings
from pinet_core.content_work.models import GuideAttempt, GuideJob
from pinet_core.control.routes import scope
from pinet_core.control_api import app
from pinet_core.creation import studio
from pinet_core.creation.models import Creation, Job
from pinet_core.creation.service import digest
from pinet_core.models import utcnow
from pinet_core.site_build import foundation, lifecycle, selectors, worker
from pinet_core.tasks.codex_transport import RunnerError

build = build_fixture


async def configured(c, monkeypatch):
    _, auth, me = await verified(c)
    monkeypatch.setattr(settings(), "site_build_api_runner_enabled", True)
    monkeypatch.setattr(settings(), "site_build_actor_ids", [me["user_id"]])
    monkeypatch.setattr(lifecycle, "source_current", lambda: True)
    monkeypatch.setattr(lifecycle.discovery.adapter, "available", lambda: None)
    return auth, me


async def test_actual_queue_waits_for_explicit_approval_then_restart_catches_guides(build, monkeypatch):
    c = build
    auth, me = await configured(c, monkeypatch)
    _, foreign_auth, foreign_me = await verified(c)
    foreign, _ = await start(c, foreign_auth, foreign_me)
    row, _ = await start(c, auth, me)
    await lifecycle.preflight()
    calls, observations = [], []
    domain = uuid4().hex+".example.test"
    async def planning_roles(context, authorized, **kwargs):
        value, receipt = await plan_roles(context, authorized, **kwargs)
        if kwargs["role"] == "creator":
            value["plan"]["canonical_host_candidate"] = domain
        return value, receipt
    async def planning(*, discovery_id):
        calls.append(discovery_id)
        return await discovery_worker.execute_once(discovery_id=discovery_id, role_runner=planning_roles)
    async def building(identity):
        try:
            result = await worker.tick(identity, creation_role_runner=business_roles(), intake_runner=studio.import_draft,
                guide_role_runner=roles())
        except Exception as error:
            observations.append((type(error).__name__, getattr(error, "code", None)))
            raise
        observations.append(result)
        return result
    cursors = {}
    assert await lifecycle.sweep(cursors, discovery_runner=planning, build_runner=building)
    assert row["discovery_id"] in calls and foreign["discovery_id"] not in calls
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Job).where(Job.environment_id == c["environment"])) == 0
    detail = (await c["client"].get("/customer/v2/discoveries/"+row["discovery_id"], headers=auth)).json()["data"]
    approval = await c["client"].post("/customer/v2/discoveries/"+row["discovery_id"]+"/build", headers=auth,
        json={"report_revision": detail["current_revision"], "report_sha256": detail["latest_report_sha256"],
              "idempotency_key": str(uuid4())})
    assert approval.status_code == 202, approval.text
    cid = approval.json()["data"]["creation_id"]
    assert await lifecycle.sweep({}, discovery_runner=planning, build_runner=building), observations
    # New cursor state simulates a restarted supervisor over the same durable jobs.
    for _ in range(3):
        assert await lifecycle.sweep({}, discovery_runner=planning, build_runner=building)
    assert not await lifecycle.sweep({}, discovery_runner=planning, build_runner=building)
    async with AsyncSession(c["admin"]) as tx:
        states = list(await tx.scalars(select(GuideJob.status).where(GuideJob.creation_id == cid)))
        assert states == ["succeeded"]*3
        assert await tx.scalar(select(func.count()).select_from(Job).where(Job.creation_id == cid)) == 1


async def test_keyset_wrap_revisits_transient_work_and_excludes_foreign_owner(build, monkeypatch):
    c = build
    auth, me = await configured(c, monkeypatch)
    _, other_auth, other = await verified(c)
    foreign, _ = await start(c, other_auth, other)
    own = [(await start(c, auth, me))[0]["discovery_id"] for _ in range(21)]
    calls = []
    async def busy(*, discovery_id):
        calls.append(discovery_id)
        return False
    cursors = {}
    for _ in range(5):
        assert not await lifecycle.sweep(cursors, discovery_runner=busy)
    assert set(calls) == set(own) and foreign["discovery_id"] not in calls
    assert len(calls) > len(own)  # Transient mutex/running outcomes remain eligible.
    assert cursors[(me["user_id"], "discovery")] is not None
    async with scope(user=me["user_id"]) as tx:
        assert await selectors.page(tx, "discovery", other["user_id"], c["environment"], None) == []


async def test_source_drift_prevents_dispatch_and_bad_actor_preflight_fails(build, monkeypatch):
    c = build
    auth, me = await configured(c, monkeypatch)
    await start(c, auth, me)
    monkeypatch.setattr(lifecycle, "source_current", lambda: False)
    async def prohibited(**_):
        raise AssertionError("Source drift must prevent dispatch")
    with pytest.raises(RunnerError, match="source_unavailable"):
        await lifecycle.sweep({}, discovery_runner=prohibited)
    monkeypatch.setattr(lifecycle, "source_current", lambda: True)
    monkeypatch.setattr(settings(), "site_build_actor_ids", [str(uuid4())])
    with pytest.raises(RuntimeError, match="actor_unavailable"):
        await lifecycle.preflight()


@pytest.mark.parametrize("condition", ["failed", "stale_continuation"])
async def test_supervisor_does_not_retry_failed_guide_or_fall_back_from_stale_latest(build, monkeypatch, condition):
    from test_site_build import first
    c = build
    cid, auth, _ = await first(c)
    me = (await c["client"].get("/customer/v1/me", headers=auth)).json()["data"]
    monkeypatch.setattr(settings(), "site_build_api_runner_enabled", True)
    monkeypatch.setattr(settings(), "site_build_actor_ids", [me["user_id"]])
    monkeypatch.setattr(lifecycle, "source_current", lambda: True)
    if condition == "failed":
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(GuideJob).where(GuideJob.creation_id == cid).values(status="failed",
                failure_code="worker_interrupted"))
    else:
        monkeypatch.setattr(foundation, "source_current", lambda: True)
        response = await c["client"].post(f"/customer/v2/creations/{cid}/build-continuations", headers=auth,
            json={"accepted_revision": 1, "idempotency_key": str(uuid4())})
        assert response.status_code == 200, response.text
        monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
    observed = []
    async def prohibited(*_, **__):
        raise AssertionError("Terminal/stale work must not dispatch a new provider")
    async def building(identity):
        result = await worker.tick(identity, guide_role_runner=prohibited)
        observed.append(result)
        return result
    for _ in range(2):
        assert not await lifecycle.sweep({}, build_runner=building)
    assert {row["code"] for row in observed} == {"worker_interrupted" if condition == "failed" else "build_continuation_stale"}
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id == cid)) == 1
        assert await tx.scalar(select(func.count()).select_from(GuideAttempt).where(GuideAttempt.creation_id == cid)) == 0


async def test_build_keyset_reaches_new_case_behind_one_hundred_older_approvals(build, monkeypatch):
    from test_site_build import first
    c = build
    target, auth, _ = await first(c)
    me = (await c["client"].get("/customer/v1/me", headers=auth)).json()["data"]
    monkeypatch.setattr(settings(), "site_build_api_runner_enabled", True)
    monkeypatch.setattr(settings(), "site_build_actor_ids", [me["user_id"]])
    monkeypatch.setattr(lifecycle, "source_current", lambda: True)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        template = await tx.get(Creation, target)
        approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == target))
        discovery = await tx.get(Discovery, approval.discovery_id)
        report = await tx.get(Report, approval.report_id)
        discovery_job = await tx.get(DiscoveryJob, report.job_id)
        def clone(row, **changes):
            return type(row)(**{**{column.name: getattr(row, column.name)
                for column in row.__table__.columns}, **changes})
        # Historical read-scanner fixtures keep binding/FKs/RLS, but have no native
        # intake/files and are never sent to the executor or counted as accepted.
        for index in range(105):
            cid, did, jid, rid = str(UUID(int=index+1)), *(str(uuid4()) for _ in range(3))
            key, created = str(uuid4()), utcnow()-timedelta(days=1)
            tx.add(clone(template, id=cid, idempotency_key=key, created_at=created))
            await tx.flush()
            tx.add(clone(discovery, id=did, linked_creation_id=cid, idempotency_key=key, created_at=created))
            await tx.flush()
            tx.add(clone(discovery_job, id=jid, discovery_id=did, idempotency_key=key, created_at=created))
            await tx.flush()
            tx.add(clone(report, id=rid, discovery_id=did, job_id=jid, created_at=created))
            await tx.flush()
            tx.add(clone(approval, id=str(uuid4()), discovery_id=did, report_id=rid,
                creation_id=cid, idempotency_key=key, created_at=created, fingerprint=digest({
                    "discovery_id": did, "report_revision": approval.report_revision,
                    "report_sha256": approval.report_sha256, "idempotency_key": key})))
    from sqlalchemy import text
    async with scope() as tx:
        original = list(await tx.scalars(text("SELECT creation_id FROM control_site_build_candidates(:e)"),
            {"e": c["environment"]}))
        assert len(original) == 100 and target not in original
    seen, cursors = [], {}
    async def blocked(identity):
        seen.append(identity)
        return {"executed": False}
    for _ in range(14):
        assert not await lifecycle.sweep(cursors, build_runner=blocked)
    assert len(seen) == 106 and seen[-1] == target


async def test_enabled_api_lifespan_automatically_consumes_the_admitted_owner_queue(build, monkeypatch):
    c = build
    auth, me = await configured(c, monkeypatch)
    execute = discovery_worker.execute_once
    async def inert(*, discovery_id):
        return await execute(discovery_id=discovery_id, role_runner=questions)
    monkeypatch.setattr(discovery_worker, "execute_once", inert)
    async with app.router.lifespan_context(app):
        assert app.state.site_build_runner_status == "running"
        row, _ = await start(c, auth, me)
        async with asyncio.timeout(5):
            while True:
                detail = (await c["client"].get("/customer/v2/discoveries/"+row["discovery_id"], headers=auth)).json()["data"]
                if detail["status"] == "needs_input":
                    break
                await asyncio.sleep(0.05)
        assert detail["current_revision"] == 1 and not detail["can_build"]
    assert app.state.site_build_runner_status == "stopped"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Job).where(Job.environment_id == c["environment"])) == 0
