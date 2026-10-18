"""Opt-in composed0049, retained synthetic owners only; no schema/operating writes.

Set PINET_BUSINESS_ATTACHMENT_QA=retained-isolated and BOTH dedicated
PINET_BUSINESS_ATTACHMENT_QA_ADMIN_URL / PINET_BUSINESS_ATTACHMENT_QA_RUNTIME_URL.
The caller installs Root's reviewed0049 and canonical runtime bootstrap first.
Fixtures append; they never reset.
"""
import asyncio
import os
from contextlib import asynccontextmanager
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from test_business_attachment import approval

from pinet_core.business_attachment import admin, service
from pinet_core.business_attachment.models import Binding
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Organization, Portfolio, Session, User
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import binding, digest
from pinet_core.customer.models import Account
from pinet_core.models import Business, new_id, utcnow

pytestmark = pytest.mark.skipif(os.environ.get("PINET_BUSINESS_ATTACHMENT_QA") != "retained-isolated",
    reason="Explicit composed0049 dedicated retained synthetic PostgreSQL lane required")


@asynccontextmanager
async def scoped(p, *, actor=None, runtime=True):
    async with AsyncSession(p["runtime"] if runtime else p["admin"], expire_on_commit=False) as tx, tx.begin():
        await tx.execute(text("SELECT set_config('pinet.control_user',:u,true),set_config('pinet.environment',:e,true)"),
            {"u": actor or p["session"].user_id, "e": p["environment"]})
        yield tx


async def approve(p, request=None):
    async with scoped(p, runtime=False) as tx:
        return await admin.operate(tx, "approve", request or p["request"])


@pytest.fixture
async def attached(monkeypatch):
    a = make_url(os.environ["PINET_BUSINESS_ATTACHMENT_QA_ADMIN_URL"])
    r = make_url(os.environ["PINET_BUSINESS_ATTACHMENT_QA_RUNTIME_URL"])
    assert a.host in {"127.0.0.1", "localhost", "::1"} and (a.host, a.port, a.database) == (r.host, r.port, r.database)
    assert r.username == "pinet_runtime" and a.username != r.username
    env = "test-business-source-" + uuid4().hex
    for key, value in {"environment": env, "control_enabled": True, "control_mode": "local",
            "customer_enabled": True, "control_source_revision": "a"*40}.items():
        monkeypatch.setattr(settings(), key, value)
    monkeypatch.setattr(service, "source_current", lambda: True)
    engines = {"admin": create_async_engine(a), "runtime": create_async_engine(r)}
    try:
        async with AsyncSession(engines["admin"], expire_on_commit=False) as tx, tx.begin():
            assert await tx.scalar(text("SELECT EXISTS(SELECT 1 FROM alembic_version WHERE version_num LIKE '0049%')"))
            assert await service.schema_ready(tx)
            user = User(id=new_id(), environment_id=env, username=uuid4().hex, password_hash="synthetic-unusable",
                identity_issuer="pinet-customer", identity_subject=uuid4().hex, enabled=True)
            org = Organization(id=new_id(), environment_id=env, key=uuid4().hex, display_name="Synthetic source QA")
            business = Business(id=new_id(), site_id="source-qa-"+uuid4().hex,
                canonical_host=uuid4().hex+".example.test")
            tx.add_all([user, org, business])
            await tx.flush()
            portfolio = Portfolio(id=new_id(), environment_id=env, organization_id=org.id, display_name="Synthetic QA")
            member = Membership(id=new_id(), environment_id=env, user_id=user.id,
                organization_id=org.id, role="owner", enabled=True)
            account = Account(id=new_id(), environment_id=env, user_id=user.id,
                email=uuid4().hex+"@example.test", email_hash=uuid4().hex, display_name="Synthetic QA",
                privacy_accepted_at=utcnow(), verified_at=utcnow())
            tx.add_all([portfolio, member, account])
            await tx.flush()
            grant = BusinessGrant(id=new_id(), environment_id=env, organization_id=org.id, portfolio_id=portfolio.id,
                business_id=business.id, display_name="Synthetic QA", evidence_revision="a"*40, enabled=True)
            session = Session(id=new_id(), environment_id=env, user_id=user.id, token_hash=uuid4().hex,
                expires_at=utcnow()+timedelta(hours=2))
            tx.add_all([grant, session])
            await tx.flush()
        request = {**approval(), "business_id": business.id, "authorizing_session_id": session.id}
        p = {**engines, "environment": env, "business": business, "grant": grant, "session": session,
            "portfolio": portfolio, "member": member, "request": request}
        p["receipt"] = await approve(p)
        yield p
    finally:
        await engines["runtime"].dispose()
        await engines["admin"].dispose()


async def test_real_sql_hash_runtime_select_only_and_cross_owner_denial(attached):
    p = attached
    async with scoped(p) as tx:
        row = await tx.get(Binding, p["receipt"]["binding_id"])
        assert row is not None and await service.is_current(tx, row)
        # Internal hash helpers are intentionally not runtime EXECUTE; the public
        # current function exercises that hash as its narrowly scoped definer.
        assert await tx.scalar(text("SELECT has_table_privilege('pinet_runtime','control_business_source_bindings','SELECT')"))
        assert not await tx.scalar(text("SELECT has_function_privilege('pinet_runtime',"
            "'public.business_source_fingerprint(jsonb)','EXECUTE')"))
    async with scoped(p, runtime=False) as tx:
        assert await tx.scalar(text("SELECT public.business_source_fingerprint(to_jsonb(b))=b.fingerprint "
            "FROM control_business_source_bindings b WHERE id=:id"), {"id": row.id})
    async with scoped(p, actor=str(uuid4())) as tx:
        assert await tx.get(Binding, row.id) is None
        assert not await tx.scalar(text("SELECT public.business_source_binding_current(:id)"), {"id": row.id})
    for operation in ("UPDATE control_business_source_bindings SET revoked_at=clock_timestamp() WHERE id=:id",
            "DELETE FROM control_business_source_bindings WHERE id=:id"):
        with pytest.raises(DBAPIError):
            async with scoped(p) as tx:
                await tx.execute(text(operation), {"id": row.id})


async def test_replay_conflict_new_session_and_historical_git_pin(attached, monkeypatch):
    p = attached
    monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
    async with scoped(p, runtime=False) as tx:
        next_session = Session(id=new_id(), environment_id=p["environment"], user_id=p["session"].user_id,
            token_hash=uuid4().hex, expires_at=utcnow()+timedelta(hours=1))
        tx.add(next_session)
        await tx.execute(update(Session).where(Session.id == p["session"].id).values(revoked_at=utcnow()))
    repeated = await approve(p, {**p["request"], "authorizing_session_id": next_session.id})
    assert repeated["replayed"] and repeated["binding_current"]
    assert repeated["expires_at"] == p["receipt"]["expires_at"]
    async with scoped(p) as tx:
        async with service.transaction_authority(tx, next_session, p["business"].id, writing=True) as row:
            assert row.source_revision == "a"*40 and row.authorizing_session_id == p["session"].id
    with pytest.raises(ControlError) as failed:
        await approve(p, {**p["request"], "authorizing_session_id": next_session.id, "duration_seconds": 7200})
    assert failed.value.status == 409


async def test_latest_revocation_never_falls_back_and_history_stays_readable(attached):
    p = attached
    second = await approve(p, {**p["request"], "request_id": str(uuid4())})
    revoke = {"business_id": p["business"].id, "binding_id": second["binding_id"],
        "authorizing_session_id": p["session"].id, "source_revision": "a"*40,
        "expected_fingerprint": second["fingerprint"]}
    async with scoped(p, runtime=False) as tx:
        stopped = await admin.operate(tx, "revoke", revoke)
    assert not stopped["binding_current"]
    for identity in (p["receipt"]["binding_id"], second["binding_id"]):
        async with scoped(p) as tx:
            async with service.transaction_authority(tx, p["session"], p["business"].id, identity) as row:
                assert not await service.is_current(tx, row)
    with pytest.raises(ControlError) as failed:
        async with scoped(p) as tx:
            async with service.transaction_authority(tx, p["session"], p["business"].id, writing=True):
                pytest.fail("Revoked latest source must stop writing")
    assert failed.value.status == 409
    async with scoped(p, runtime=False) as tx:
        again = await admin.operate(tx, "revoke", revoke)
    assert again["replayed"] and again["revoked_at"] == stopped["revoked_at"]


async def test_expired_latest_hides_no_history_and_does_not_revive_previous(attached):
    p = attached
    async with scoped(p, runtime=False) as tx:
        old = await tx.get(Binding, p["receipt"]["binding_id"])
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        reviewed = now-timedelta(seconds=100)
        past = Binding(id=new_id(), **binding(old), business_id=old.business_id, grant_id=old.grant_id,
            site_id=old.site_id, canonical_host=old.canonical_host, sequence=2, payload=old.payload,
            source_revision=old.source_revision, authorizing_session_id=p["session"].id, request_id=new_id(),
            request_fingerprint="e"*64, created_at=reviewed, reviewed_at=reviewed,
            expires_at=reviewed+timedelta(seconds=30), revoked_at=None)
        past.fingerprint = digest(service.material(past))
        tx.add(past)
    async with scoped(p) as tx:
        async with service.transaction_authority(tx, p["session"], p["business"].id) as current:
            assert current.id == past.id
            assert not await service.is_current(tx, current)
            assert not await service.is_current(tx, await tx.get(Binding, old.id))


async def test_immutable_sql_material_and_owner_revocation(attached):
    p = attached
    for operation in ("UPDATE control_business_source_bindings SET payload=payload||'{\"external_revision\":\"changed\"}' WHERE id=:id",
            "UPDATE control_business_source_bindings SET expires_at=expires_at+interval '1 second' WHERE id=:id",
            "DELETE FROM control_business_source_bindings WHERE id=:id"):
        with pytest.raises(DBAPIError):
            async with scoped(p, runtime=False) as tx:
                await tx.execute(text(operation), {"id": p["receipt"]["binding_id"]})
    async with scoped(p, runtime=False) as tx:
        await tx.execute(update(Membership).where(Membership.id == p["member"].id).values(enabled=False))
    async with scoped(p) as tx:
        assert await tx.get(Binding, p["receipt"]["binding_id"]) is None
        assert not await tx.scalar(text("SELECT public.business_source_binding_current(:id)"),
            {"id": p["receipt"]["binding_id"]})


@pytest.mark.parametrize("invalid", ["hash", "payload", "sequence", "grant"])
async def test_trusted_raw_insert_still_requires_exact_hash_payload_sequence_and_grant(attached, invalid):
    p = attached
    with pytest.raises(DBAPIError):
        async with scoped(p, runtime=False) as tx:
            old = await tx.get(Binding, p["receipt"]["binding_id"])
            now = await tx.scalar(text("SELECT clock_timestamp()"))
            values = {column.name: getattr(old, column.name) for column in Binding.__table__.columns}
            values.update(id=new_id(), request_id=new_id(), sequence=2, created_at=now,
                reviewed_at=now, expires_at=now+timedelta(hours=1))
            row = Binding(**values)
            if invalid == "payload":
                row.payload = {**row.payload, "executable": "Must be rejected as untyped source metadata"}
            if invalid == "sequence":
                row.sequence = 3
            if invalid == "grant":
                row.grant_id = new_id()
            row.fingerprint = "f"*64 if invalid == "hash" else digest(service.material(row))
            tx.add(row)
            await tx.flush()
    async with scoped(p) as tx:
        assert await tx.scalar(select(func.count()).select_from(Binding)) == 1


async def test_consumer_expiry_after_yield_stops_commit_even_with_live_review_binding(attached):
    p = attached
    async with scoped(p, runtime=False) as tx:
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        await tx.execute(update(Session).where(Session.id == p["session"].id).values(expires_at=now+timedelta(seconds=1)))
    with pytest.raises(ControlError) as failed:
        async with scoped(p) as tx:
            async with service.transaction_authority(tx, p["session"], p["business"].id, writing=True) as row:
                assert await service.is_current(tx, row)
                await asyncio.sleep(1.1)
    assert failed.value.status == 401
    async with scoped(p) as tx:
        assert await service.is_current(tx, await tx.get(Binding, p["receipt"]["binding_id"]))


async def test_source_append_waits_for_current_consumer_transaction(attached):
    p, entered, release = attached, asyncio.Event(), asyncio.Event()

    async def consumer():
        async with scoped(p) as tx:
            async with service.transaction_authority(tx, p["session"], p["business"].id, writing=True):
                entered.set()
                await release.wait()

    held = asyncio.create_task(consumer())
    await asyncio.wait_for(entered.wait(), 5)
    importing = asyncio.create_task(approve(p, {**p["request"], "request_id": str(uuid4())}))
    try:
        await asyncio.sleep(.15)
        assert not importing.done()
    finally:
        release.set()
    await asyncio.wait_for(held, 5)
    result = await asyncio.wait_for(importing, 5)
    assert result["sequence"] == 2
    async with scoped(p) as tx:
        assert await tx.scalar(select(func.count()).select_from(Binding)) == 2
