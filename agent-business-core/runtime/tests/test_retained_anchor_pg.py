"""Owner-only opt-in PG regressions; helper collects these without running fixtures."""
import copy
import os
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import verified
from test_private_preview_pg import accepted, path, preview  # noqa: F401

from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation import private_preview
from pinet_core.creation.models import PrivateIntakeReceipt, PrivateIntakeRequest
from pinet_core.creation.service import binding, digest
from pinet_core.customer_text.service import customer_session
from pinet_core.models import utcnow

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Root must supply/migrate an isolated dedicated PostgreSQL QA; helper collection is not execution")


@pytest.fixture
async def anchor_case(preview):  # noqa: F811
    c = preview
    identity, auth, body, _ = await accepted(c)
    response = await c["client"].post(path(identity), headers=auth, json=body)
    assert response.status_code == 200 and response.json()["data"]["state"] == "private_draft_imported"
    async with AsyncSession(c["admin"]) as tx:
        request = await tx.scalar(select(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == identity))
        receipt = await tx.scalar(select(PrivateIntakeReceipt).where(PrivateIntakeReceipt.recovery_id == request.id))
        captured = copy.deepcopy(request.context)
        creation = SimpleNamespace(id=identity, **binding(request))
        request_id, receipt_id = request.id, receipt.id
    token = auth["Authorization"].split()[1]
    async with scope(token=token_hash(token)) as tx:
        await customer_session(tx, token)
        marker, _ = await private_preview.retained_anchor(tx, creation, captured)
    return SimpleNamespace(c=c, creation=creation, captured=captured, token=token, marker=marker,
        request_id=request_id, receipt_id=receipt_id)


@pytest.mark.parametrize("pinned", [False, True])
async def test_retained_anchor_is_one_fresh_runtime_statement(anchor_case, pinned):
    f = anchor_case
    async with scope(token=token_hash(f.token)) as tx:
        await customer_session(tx, f.token)
        statements = []
        def observed(state):
            statements.append(state.statement)
        event.listen(tx.sync_session, "do_orm_execute", observed)
        try:
            marker, intake = await private_preview.retained_anchor(tx, f.creation, f.captured,
                f.marker if pinned else None)
        finally:
            event.remove(tx.sync_session, "do_orm_execute", observed)
        assert marker == f.marker and intake["state"] == "private-draft-imported"
        assert len(statements) == 1
        assert statements[0].get_execution_options()["populate_existing"] is True
        assert [column["entity"] for column in statements[0].column_descriptions] == [PrivateIntakeRequest, PrivateIntakeReceipt]


async def test_join_refreshes_both_cached_entities_without_flushing_fake_corruption(anchor_case):
    f = anchor_case
    async with scope(token=token_hash(f.token)) as tx:
        await customer_session(tx, f.token)
        request = await tx.get(PrivateIntakeRequest, f.request_id)
        receipt = await tx.get(PrivateIntakeReceipt, f.receipt_id)
        original = request.context_sha256, receipt.intake_sha256
        # This is stale local ORM state only. Immutable SQL rows/triggers remain intact.
        with tx.no_autoflush:
            request.context_sha256, receipt.intake_sha256 = "0"*64, "0"*64
            marker, _ = await private_preview.retained_anchor(tx, f.creation, f.captured, f.marker)
            assert marker == f.marker
            assert (request.context_sha256, receipt.intake_sha256) == original
        assert request not in tx.dirty and receipt not in tx.dirty


async def test_foreign_runtime_scope_cannot_observe_the_anchor(anchor_case):
    f = anchor_case
    _, auth, _ = await verified(f.c)
    token = auth["Authorization"].split()[1]
    async with scope(token=token_hash(token)) as tx:
        await customer_session(tx, token)
        with pytest.raises(ControlError) as error:
            await private_preview.retained_anchor(tx, f.creation, f.captured, f.marker)
        assert (error.value.status, error.value.code) == (409, "private_intake_anchor_stale")
        assert await private_preview.retained_anchor(tx, f.creation, f.captured) is None


async def test_runtime_visible_request_without_receipt_preserves_parent_and_refusal(anchor_case):
    f = anchor_case
    async with scope(token=token_hash(f.token)) as tx:
        await customer_session(tx, f.token)
        original = await tx.get(PrivateIntakeRequest, f.request_id)
        values = {column.name: copy.deepcopy(getattr(original, column.name)) for column in PrivateIntakeRequest.__table__.columns}
        values.update(id=str(uuid4()), idempotency_key=str(uuid4()), run_id=str(uuid4()),
            created_at=utcnow(), lease_until=utcnow()+timedelta(seconds=60))
        values["request_fingerprint"] = digest({"creation_id": f.creation.id,
            "accepted_revision": original.accepted_revision,
            "candidate_sha256": original.context["accepted"]["candidate_sha256"],
            "idempotency_key": values["idempotency_key"]})
        pending = PrivateIntakeRequest(**values)
        tx.add(pending)
        await tx.flush()
        marker = {**f.marker, "recovery_id": pending.id}
        with pytest.raises(ControlError) as error:
            await private_preview.retained_anchor(tx, f.creation, f.captured, marker)
        assert (error.value.status, error.value.code) == (409, "private_intake_anchor_stale")
        assert await tx.get(PrivateIntakeRequest, pending.id) is pending
        assert (await private_preview.retained_anchor(tx, f.creation, f.captured))[0] == f.marker
