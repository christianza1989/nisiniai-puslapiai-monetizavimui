"""Real restricted PostgreSQL constraints with synthetic native approved builds.

Direct SQL fixtures are blocked observations, never Foundation acceptance.
Controller/native bridge integration follows separately.
"""
from uuid import uuid4

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_site_build import build as build_fixture
from test_site_build import creation, customers, first  # noqa: F401

from pinet_core.business_discovery.models import BuildApproval
from pinet_core.control.models import Session
from pinet_core.control.routes import scope
from pinet_core.creation.models import Creation
from pinet_core.creation.service import binding, digest
from pinet_core.creation_registration.service import accepted_proof
from pinet_core.models import new_id, utcnow
from pinet_core.site_build.models import FoundationReceipt
from pinet_core.site_build.receipts import schema_ready

build = build_fixture


async def record(c, cid):
    async with AsyncSession(c["admin"]) as tx:
        native = await tx.get(Creation, cid)
        approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == cid))
        owner, session_id = native.user_id, approval.session_id
    async with scope(user=owner) as tx:
        native = await tx.get(Creation, cid)
        proof = await accepted_proof(tx, native)
        frozen = {**binding(native), "creation_id": cid, "approval_id": approval.id,
            "approval_fingerprint": approval.fingerprint, "session_id": session_id,
            "accepted": proof}
        observed = {"version": "native-foundation-evidence.v1", "state": "blocked",
            "scope_sha256": digest(frozen), "admission": "not_performed", "deployment": "not_performed",
            "channel_activation": "not_performed", "calibration_status": "UNVERIFIED"}
        value = FoundationReceipt(id=new_id(), creation_id=cid, approval_id=approval.id,
            revision_id=proof["revision_id"], accepted_revision=proof["accepted_revision"], session_id=session_id,
            idempotency_key=str(uuid4()), request_fingerprint="a"*64, scope_sha256=digest(frozen),
            observation_sha256=digest(observed), state="blocked", scope=frozen, observation=observed, **binding(native))
        return owner, value


async def test_real_schema_forces_rls_and_denies_receipt_mutation(build):
    c = build
    cid, _, _ = await first(c)
    owner, value = await record(c, cid)
    async with scope(user=owner) as tx:
        assert await schema_ready(tx)
        assert await tx.scalar(text("SELECT has_table_privilege(current_user,'control_site_foundation_receipts','SELECT,INSERT')"))
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'control_site_foundation_receipts','UPDATE')"))
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'control_site_foundation_receipts','DELETE')"))
        tx.add(value)
        await tx.flush()
    async with scope(user=owner) as tx:
        assert await tx.get(FoundationReceipt, value.id)
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(FoundationReceipt).where(FoundationReceipt.id == value.id).values(state="candidate"))
    async with scope(user=owner) as tx:
        assert (await tx.get(FoundationReceipt, value.id)).state == "blocked"


async def test_real_receipts_cannot_cross_owner_or_environment(build, monkeypatch):
    c = build
    cid, _, _ = await first(c)
    owner, value = await record(c, cid)
    async with scope(user=owner) as tx:
        tx.add(value)
        await tx.flush()
    async with scope(user=str(uuid4())) as tx:
        assert await tx.get(FoundationReceipt, value.id) is None
    from pinet_core.config import settings
    monkeypatch.setattr(settings(), "environment", "test-foreign-"+uuid4().hex)
    async with scope(user=owner) as tx:
        assert await tx.get(FoundationReceipt, value.id) is None


async def test_commit_fence_rejects_expired_session_without_retained_row(build):
    c = build
    cid, _, _ = await first(c)
    owner, value = await record(c, cid)
    with pytest.raises(DBAPIError):
        async with scope(user=owner) as tx:
            tx.add(value)
            await tx.flush()
            async with AsyncSession(c["admin"]) as admin, admin.begin():
                await admin.execute(update(Session).where(Session.id == value.session_id).values(revoked_at=utcnow()))
    async with scope(user=owner) as tx:
        assert await tx.get(FoundationReceipt, value.id) is None


async def test_incomplete_or_foreign_json_identity_cannot_be_inserted(build):
    c = build
    cid, _, _ = await first(c)
    owner, value = await record(c, cid)
    value.scope = {**value.scope, "approval_id": str(uuid4())}
    with pytest.raises(DBAPIError):
        async with scope(user=owner) as tx:
            tx.add(value)
            await tx.flush()
    _, second = await record(c, cid)
    second.scope = {}
    with pytest.raises(DBAPIError):
        async with scope(user=owner) as tx:
            tx.add(second)
            await tx.flush()
