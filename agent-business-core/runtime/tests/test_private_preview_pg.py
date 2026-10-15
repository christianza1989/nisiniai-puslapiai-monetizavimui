"""Opt-in EMPTY dedicated PG QA, real restricted HTTP/Node, synthetic provider only.

Append-only synthetic request/receipt/actor rows and private files are intentionally retained.
The integrating owner supplies/migrates the dedicated QA DB; this file never creates a DB.
"""
import asyncio
import os
import secrets
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from test_creation_team import runner
from test_customer_creations import start
from test_customer_public import verified

from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import scope, token_hash
from pinet_core.control_api import app
from pinet_core.creation import private_preview, studio, worker
from pinet_core.creation.models import (
    Attempt,
    Creation,
    Job,
    PrivateIntakeReceipt,
    PrivateIntakeRequest,
    Revision,
)
from pinet_core.db import db
from pinet_core.models import utcnow
from pinet_core.tasks.codex_transport import RunnerError

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Requires explicitly supplied EMPTY dedicated PostgreSQL QA and retained synthetic history")


@pytest.fixture
async def preview(monkeypatch):
    cfg = settings()
    environment = "test-preview-"+str(uuid4())
    outbox = Path("artifacts/private-preview")/environment/"outbox"
    for key, value in {"environment": environment, "control_enabled": True, "control_mode": "local",
            "control_cursor_secret": secrets.token_hex(32), "control_source_revision": "a"*40,
            "customer_enabled": True, "customer_portal_origin": "http://127.0.0.1:3017",
            "customer_outbox_directory": str(outbox), "public_projects_enabled": True,
            "chat_enabled": False, "chat_runner_enabled": False, "creation_enabled": True,
            "creation_runner_enabled": True, "creation_daily_limit": 10, "creation_global_daily_limit": 20}.items():
        monkeypatch.setattr(cfg, key, value)
    # Synthetic source identity seam only. Native importer/companion/config hashes remain real.
    monkeypatch.setattr(private_preview, "source_current", lambda: True)
    db.engine = create_async_engine(cfg.database_url, pool_pre_ping=True)
    db.sessions = async_sessionmaker(db.engine, expire_on_commit=False)
    admin = create_async_engine(cfg.admin_database_url)
    try:
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
                yield {"client": client, "admin": admin, "environment": environment, "outbox": outbox}
    finally:
        await admin.dispose()
        await db.engine.dispose()


def path(cid):
    return f"/customer/v2/creations/{cid}/private-preview-intake"


async def accepted(c, *, canonical_host=None):
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me, canonical_host=canonical_host)
    cid = row["creation_id"]
    assert await worker.execute_once(creation_id=cid, role_runner=runner([]), intake_runner=studio.import_draft)
    async with AsyncSession(c["admin"]) as tx:
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == cid))
        job = await tx.get(Job, revision.job_id)
        body = {"accepted_revision": revision.sequence, "candidate_sha256": revision.material_hash, "idempotency_key": str(uuid4())}
        original = {"usage": job.usage, "source": revision.source_revision, "hash": revision.material_hash}
    return cid, auth, body, original


async def snapshot(c, cid):
    async with AsyncSession(c["admin"]) as tx:
        creation = await tx.get(Creation, cid)
        job = await tx.scalar(select(Job).where(Job.creation_id == cid))
        counts = tuple([await tx.scalar(select(func.count()).select_from(model).where(model.creation_id == cid))
            for model in (Job, Attempt, Revision)])
        return creation.canonical_host, job.usage, counts


async def test_real_node_prepare_replay_and_current_content_keep_original_acceptance(preview):
    c = preview
    cid, auth, body, original = await accepted(c)
    assert original["usage"]["content_intake"]["code"] == "studio_domain_required"
    before = await snapshot(c, cid)
    initial = await c["client"].get(path(cid), headers=auth)
    assert initial.status_code == 200, initial.text
    assert initial.json()["data"]["state"] == "not_prepared" and initial.json()["data"]["native_host"] is None
    result = await c["client"].post(path(cid), headers=auth, json=body)
    assert result.status_code == 200, result.text
    value = result.json()["data"]
    assert value["state"] == "private_draft_imported" and value["public_canonical_host"] is None
    assert value["native_host"] == private_preview.private_host(cid) and value["host_source"] == "explicit_private_preview"
    assert value["latest"]["candidate_sha256"] == body["candidate_sha256"] and not value["can_prepare"]
    assert value["full_f1_status"] == value["launch_status"] == value["domain_authority"] == "UNVERIFIED"
    assert (await c["client"].post(path(cid), headers=auth, json=body)).json()["data"] == value
    assert await snapshot(c, cid) == before
    content = await c["client"].get(f"/customer/v2/creations/{cid}/content", headers=auth)
    assert content.status_code == 200 and content.json()["data"]["state"] == "private_draft_imported", content.text
    completion = await c["client"].get(f"/customer/v2/creations/{cid}/content-completion", headers=auth)
    assert completion.status_code == 200, completion.text
    assert completion.json()["data"]["state"] == "current" and completion.json()["data"]["canonical_host"] == value["native_host"]
    assert (await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})).status_code == 409


async def test_concurrent_same_uuid_is_one_native_write_and_pending_reconciliation(preview, monkeypatch):
    c = preview
    cid, auth, body, _ = await accepted(c)
    original = studio.import_draft
    entered, release = asyncio.Event(), asyncio.Event()
    calls = []
    async def held(*args, **kwargs):
        calls.append(True)
        entered.set()
        await release.wait()
        return await original(*args, **kwargs)
    monkeypatch.setattr(studio, "import_draft", held)
    pending = asyncio.create_task(c["client"].post(path(cid), headers=auth, json=body))
    try:
        await asyncio.wait_for(entered.wait(), 30)
        reconcile = await c["client"].post(path(cid), headers=auth, json=body)
        assert reconcile.status_code == 200, reconcile.text
        assert reconcile.json()["data"]["state"] == "preparing" and not reconcile.json()["data"]["can_prepare"]
    finally:
        release.set()
    response = await asyncio.wait_for(pending, 60)
    assert response.status_code == 200 and response.json()["data"]["state"] == "private_draft_imported", response.text
    assert len(calls) == 1


async def test_terminal_failure_uuid_does_not_retry_and_new_explicit_uuid_can_recover(preview, monkeypatch):
    c = preview
    cid, auth, body, _ = await accepted(c)
    original = studio.import_draft
    calls = []
    async def failed(*args, **kwargs):
        calls.append(True)
        raise RunnerError("studio_unavailable")
    monkeypatch.setattr(studio, "import_draft", failed)
    for _ in range(2):
        response = await c["client"].post(path(cid), headers=auth, json=body)
        assert response.status_code == 200 and response.json()["data"]["state"] == "failed", response.text
    assert len(calls) == 1
    monkeypatch.setattr(studio, "import_draft", original)
    result = await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})
    assert result.status_code == 200 and result.json()["data"]["state"] == "private_draft_imported", result.text
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == cid)) == 2


async def test_owner_schema_hash_and_archive_guards_never_start_native(preview):
    c = preview
    cid, auth, body, _ = await accepted(c)
    _, foreign, _ = await verified(c)
    assert (await c["client"].get(path(cid), headers=foreign)).status_code == 404
    assert (await c["client"].post(path(cid), headers=foreign, json=body)).status_code == 404
    assert (await c["client"].post(path(cid), json=body)).status_code == 401
    assert (await c["client"].post(path(cid), headers=auth, json={**body, "canonical_host": "foreign.invalid"})).status_code == 400
    assert (await c["client"].get(path(cid)+"?unknown=1", headers=auth)).status_code == 400
    assert (await c["client"].post(path(cid), headers=auth, json={**body, "candidate_sha256": "0"*64})).status_code == 409
    result = await c["client"].post(f"/customer/v2/creations/{cid}/archive", headers=auth, json={"idempotency_key": str(uuid4())})
    assert result.status_code == 200, result.text
    assert (await c["client"].post(path(cid), headers=auth, json=body)).status_code == 409
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == cid)) == 0


@pytest.mark.parametrize("change", ["session", "source"])
async def test_after_real_node_revocation_or_source_change_cannot_commit_receipt(preview, monkeypatch, change):
    c = preview
    cid, auth, body, _ = await accepted(c)
    original = studio.import_draft
    async def changed(*args, **kwargs):
        result = await original(*args, **kwargs)
        if change == "source":
            monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
        else:
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])).values(revoked_at=utcnow()))
        return result
    monkeypatch.setattr(studio, "import_draft", changed)
    response = await c["client"].post(path(cid), headers=auth, json=body)
    assert response.status_code in {401, 409}, response.text
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.scalar(select(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == cid))
        assert row and not await tx.scalar(select(PrivateIntakeReceipt.id).where(PrivateIntakeReceipt.recovery_id == row.id))


async def test_storage_is_immutable_and_restricted_actor_has_no_history_mutation(preview):
    c = preview
    cid, auth, body, _ = await accepted(c)
    result = await c["client"].post(path(cid), headers=auth, json=body)
    assert result.status_code == 200, result.text
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.scalar(select(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == cid))
        identity, user_id = row.id, row.user_id
        receipt = await tx.scalar(select(PrivateIntakeReceipt).where(PrivateIntakeReceipt.recovery_id == identity))
        receipt_id = receipt.id
    async with scope(user=user_id) as tx:
        privileges = (await tx.execute(text("""SELECT has_column_privilege(current_user,
          'control_creation_private_intake_requests','context','UPDATE'),has_table_privilege(current_user,
          'control_creation_private_intake_receipts','UPDATE'),has_table_privilege(current_user,
          'control_creation_private_intake_receipts','DELETE')"""))).one()
        assert tuple(privileges) == (False, False, False)
    for model, key, changes in ((PrivateIntakeRequest, identity, {"context_sha256": "f"*64}),
            (PrivateIntakeReceipt, receipt_id, {"state": "failed"})):
        with pytest.raises(Exception, match="immutable private intake"):
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(model).where(model.id == key).values(**changes))


async def test_known_non_null_legacy_import_observation_is_unchanged(preview):
    c = preview
    cid, auth, body, original = await accepted(c, canonical_host="known.example")
    result = await c["client"].get(path(cid), headers=auth)
    assert result.status_code == 200, result.text
    value = result.json()["data"]
    assert value["state"] == "private_draft_imported" and value["latest"] is None and not value["can_prepare"]
    assert value["host_source"] == "existing_canonical_host" and value["native_host"] == "known.example"
    assert (await c["client"].post(path(cid), headers=auth, json=body)).status_code == 409
    assert (await snapshot(c, cid))[1] == original["usage"]
