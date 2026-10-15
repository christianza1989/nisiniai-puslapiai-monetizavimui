"""Actual selected-parent starvation beyond the maintained global queue limit."""
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_creations import creation as creation_fixture
from test_customer_creations import start as start_creation
from test_customer_public import customers, verified  # noqa: F401
from test_site_build import build as build_fixture
from test_site_build import first

from pinet_core.business_discovery import worker as discoveries
from pinet_core.business_discovery.models import DiscoveryJob
from pinet_core.config import settings
from pinet_core.content_work import worker as guides
from pinet_core.content_work.models import GuideJob
from pinet_core.control.models import Membership, Session, User
from pinet_core.control.routes import scope, token_hash
from pinet_core.creation import worker as creations
from pinet_core.creation.models import Creation, Job, Revision
from pinet_core.customer.models import Account
from pinet_core.models import utcnow
from pinet_core.site_build import selectors

creation = creation_fixture
build = build_fixture


@pytest.mark.parametrize("kind", ["discovery", "creation"])
async def test_selected_parent_after_twenty_older_jobs_is_claimed(creation, monkeypatch, kind):
    c = creation
    for key, value in {"creation_daily_limit": 0, "creation_global_daily_limit": 0,
        "creation_job_limit": 0, "business_discovery_enabled": True,
        "business_discovery_runner_enabled": True}.items():
        monkeypatch.setattr(settings(), key, value)
    _, auth, me = await verified(c)
    target = None
    for _ in range(21):
        if kind == "discovery":
            response = await c["client"].post("/customer/v2/discoveries", headers=auth, json={
                "portfolio_id": me["portfolios"][0]["portfolio_id"], "idempotency_key": str(uuid4()),
                "message": "Padėkite pasirinkti konkrečią bandomojo verslo kryptį."})
            assert response.status_code == 202, response.text
            target = response.json()["data"]["discovery_id"]
        else:
            row, _ = await start_creation(c, auth, me, canonical_host=uuid4().hex+".example.test")
            target = row["creation_id"]
    claimed = (await discoveries.claim(target) if kind == "discovery"
        else await creations.claim(team_enabled=False, creation_id=target))
    assert claimed is not None, "Requested parent was excluded before Python target filtering"
    assert claimed["discovery_id" if kind == "discovery" else "creation_id"] == target


async def test_selected_native_guide_after_twenty_older_parents_is_claimed(build):
    c = build
    target, _, _ = await first(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        parent = await tx.get(Creation, target)
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == target))
        job = await tx.get(Job, revision.job_id)
        guide = await tx.scalar(select(GuideJob).where(GuideJob.creation_id == target))
        target_job = guide.id
        def values(row):
            return {column.name: getattr(row, column.name) for column in row.__table__.columns}
        # Competing queue-only fixture rows retain real binding/FK/RLS eligibility;
        # they are not executed and claim no editorial/native semantic acceptance.
        for _ in range(20):
            cid, jid, rid = (str(uuid4()) for _ in range(3))
            key, created = str(uuid4()), utcnow()-timedelta(days=1)
            tx.add(Creation(**{**values(parent), "id": cid, "idempotency_key": key,
                "canonical_host": uuid4().hex+".example.test", "created_at": created}))
            await tx.flush()
            tx.add(Job(**{**values(job), "id": jid, "creation_id": cid, "idempotency_key": key, "created_at": created}))
            await tx.flush()
            tx.add(Revision(**{**values(revision), "id": rid, "creation_id": cid, "job_id": jid, "created_at": created}))
            await tx.flush()
            tx.add(GuideJob(**{**values(guide), "id": str(uuid4()), "creation_id": cid,
                "revision_id": rid, "idempotency_key": key, "created_at": created}))
    async with scope() as tx:
        old = list(await tx.scalars(text("SELECT id FROM control_content_work_candidates(:e)"), {"e": c["environment"]}))
        assert len(old) == 20 and target_job not in old
    claimed = await guides.claim(creation_id=target)
    assert claimed and claimed["job_id"] == target_job


@pytest.mark.parametrize("kind", ["discovery", "creation"])
@pytest.mark.parametrize("loss", ["session", "user", "membership", "account"])
async def test_selected_overload_retains_current_eligibility_and_restricted_grants(creation, monkeypatch, kind, loss):
    c = creation
    monkeypatch.setattr(settings(), "business_discovery_enabled", True)
    monkeypatch.setattr(settings(), "business_discovery_runner_enabled", True)
    _, auth, me = await verified(c)
    if kind == "discovery":
        response = await c["client"].post("/customer/v2/discoveries", headers=auth, json={
            "portfolio_id": me["portfolios"][0]["portfolio_id"], "idempotency_key": str(uuid4()),
            "message": "Padėkite pasirinkti bandomojo verslo kryptį."})
        assert response.status_code == 202, response.text
        target, model, parent = response.json()["data"]["discovery_id"], DiscoveryJob, "discovery_id"
    else:
        row, _ = await start_creation(c, auth, me)
        target, model, parent = row["creation_id"], Job, "creation_id"
    async with scope() as tx:
        rows = await selectors.selected(tx, kind, c["environment"], target)
        assert len(rows) == 1
        original = list(await tx.scalars(text(f"SELECT id FROM {selectors.KINDS[kind][0]}(:e)"),
            {"e": c["environment"]}))
        assert original == [rows[0]["id"]]
        assert await selectors.selected(tx, kind, "production", target) == []
        assert await selectors.selected(tx, kind, c["environment"], str(uuid4())) == []
        assert not await tx.scalar(text("SELECT EXISTS(SELECT 1 FROM pg_proc p,"
            "LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl "
            "WHERE p.oid=to_regprocedure(:signature) AND acl.grantee=0 AND acl.privilege_type='EXECUTE')"),
            {"signature": selectors.KINDS[kind][0]+"(varchar,varchar)"})
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if loss == "session":
            await tx.execute(update(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])).values(
                expires_at=utcnow()-timedelta(seconds=1)))
        elif loss == "user":
            await tx.execute(update(User).where(User.id == me["user_id"]).values(enabled=False))
        elif loss == "membership":
            await tx.execute(update(Membership).where(Membership.user_id == me["user_id"]).values(enabled=False))
        else:
            await tx.execute(update(Account).where(Account.user_id == me["user_id"]).values(verified_at=None))
    async with scope() as tx:
        assert await selectors.selected(tx, kind, c["environment"], target) == []
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(model.status).where(getattr(model, parent) == target)) == "queued"
