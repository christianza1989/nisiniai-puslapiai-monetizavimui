"""Atomic explicit operator preparation in isolated PostgreSQL; no model/channel calls."""
import hashlib
import importlib
import json
import sys
from contextlib import AbstractAsyncContextManager
from datetime import timedelta
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import (  # noqa: F401 - shared fixture dependencies
    accepted,
    creation,
    customers,
    provision,
    registration,
)
from test_customer_knowledge_sync import native_transport
from test_customer_profile import counts
from test_customer_profile import profile as profile_fixture

from pinet_core import knowledge
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Session
from pinet_core.control.routes import ControlError
from pinet_core.creation import service as creation_service
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_profile.models import Admission
from pinet_core.models import KnowledgeState, utcnow

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
try:
    cli = importlib.import_module("customer_agent_prepare")
finally:
    sys.path.pop(0)
profile = profile_fixture


@pytest.fixture
async def prepared_request(profile, monkeypatch):
    c = profile
    for key in ("voice_enabled", "smtp_enabled"):
        monkeypatch.setattr(settings(), key, False)
    monkeypatch.setattr(cli, "source_check", lambda: settings().control_source_revision)
    request, _, _, _ = await accepted(c)
    saved = await provision(c, request)
    value = {**request, "public_core": "synthetic-test", "public_source_revision": "c" * 40,
        "sandbox": "synthetic-test", "package_sha256": "d" * 64, "admit_source": True,
        "execution_source_revision": settings().control_source_revision}
    return c, saved, value


async def run(c, value, **kwargs):
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await cli.prepare(tx, environment=c["environment"], request=value,
            project_runner=native_transport, **kwargs)


async def material(c, model):
    async with AsyncSession(c["admin"]) as tx:
        return [(row.id, row.fingerprint) for row in (await tx.scalars(select(model).where(
            model.environment_id == c["environment"]).order_by(model.id))).all()]


async def test_prepare_commits_source_and_profile_together_preserves_previous_history(prepared_request):
    c, saved, value = prepared_request
    first = await run(c, value)
    assert first["page_count"] == 35 and first["source_admitted_by_this_operation"] is True
    assert first["profile_admission"]["profile_admitted"] is True
    assert first["session_activation"] == first["channel_activation"] == "not_performed"
    assert first["provider_calls"] == 0
    old = await material(c, Admission)
    second = await run(c, value)
    assert second["profile_admission"]["admission_id"] != first["profile_admission"]["admission_id"]
    current = await material(c, Admission)
    assert all(row in current for row in old)
    async with AsyncSession(c["admin"]) as tx:
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == saved["business_id"]))
        # Identical semantic content keeps its knowledge revision; refreshed
        # index receipt still binds each explicit Profile admission separately.
        assert state.revision == first["knowledge_ref"]["knowledge_revision"]
        assert (await tx.get(Admission, first["profile_admission"]["admission_id"])).sequence == 1
        assert (await tx.get(Admission, second["profile_admission"]["admission_id"])).sequence == 2


async def test_profile_failure_rolls_back_new_source_and_preserves_original(prepared_request, monkeypatch):
    c, saved, value = prepared_request
    await run(c, value)
    before = await counts(c)
    original = await material(c, Admission)
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == saved["business_id"]))
        retained = row.revision, json.dumps(row.payload, sort_keys=True), row.refreshed_at

    async def fail(tx, **request):
        # Prove transfer happened inside this tx before admission failed.
        row = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == saved["business_id"]))
        assert (row.revision, json.dumps(row.payload, sort_keys=True), row.refreshed_at) != retained
        raise ValueError("synthetic_profile_failure")

    monkeypatch.setattr(cli, "admit", fail)
    with pytest.raises(ValueError, match="synthetic_profile_failure"):
        await run(c, value)
    assert await counts(c) == before and await material(c, Admission) == original
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == saved["business_id"]))
        assert (row.revision, json.dumps(row.payload, sort_keys=True), row.refreshed_at) == retained


@pytest.mark.parametrize("authority", ["registration", "grant", "session"])
async def test_current_authority_denial_never_commits_source(prepared_request, authority):
    c, saved, value = prepared_request
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if authority == "registration":
            await tx.execute(update(Registration).where(Registration.id == saved["registration_id"])
                .values(revoked_at=utcnow()))
        elif authority == "grant":
            registry = await tx.get(Registration, saved["registration_id"])
            await tx.execute(update(BusinessGrant).where(BusinessGrant.id == registry.grant_id)
                .values(enabled=False))
        else:
            await tx.execute(update(Session).where(Session.id == value["authorizing_session_id"])
                .values(revoked_at=utcnow()))
    before = await counts(c)
    with pytest.raises(Exception):
        await run(c, value)
    assert await counts(c) == before


@pytest.mark.parametrize("changed", ["source_before", "source_after_transfer", "explicit_false", "smtp", "voice"])
async def test_source_and_local_scope_fences(prepared_request, monkeypatch, changed):
    c, _, value = prepared_request
    if changed == "source_before":
        value["execution_source_revision"] = "f" * 40
    elif changed == "source_after_transfer":
        calls = iter([value["execution_source_revision"], "f" * 40])
        monkeypatch.setattr(cli, "source_check", lambda: next(calls))
    elif changed == "explicit_false":
        value["admit_source"] = False
    else:
        monkeypatch.setattr(settings(), changed + "_enabled", True)
    before = await counts(c)
    with pytest.raises(ValueError):
        await run(c, value)
    assert await counts(c) == before


@pytest.mark.parametrize("expired", ["session", "knowledge"])
async def test_final_git_wait_expiry_rolls_back_all_preparation(prepared_request, monkeypatch, expired):
    c, _, value = prepared_request
    checks = 0

    def checked_source():
        nonlocal checks
        checks += 1
        if checks == 3:
            # Only time advances during final Git observation: no authority or
            # historical DB row is rewritten to manufacture this scenario.
            module = creation_service if expired == "session" else knowledge
            original = module.utcnow
            future = original() + timedelta(days=1)
            monkeypatch.setattr(module, "utcnow", lambda: future)
        return value["execution_source_revision"]

    monkeypatch.setattr(cli, "source_check", checked_source)
    before = await counts(c)
    with pytest.raises((ControlError, HTTPException)):
        await run(c, value)
    assert checks == 3 and await counts(c) == before


@pytest.mark.parametrize("expired", ["session", "knowledge"])
async def test_prepared_fsync_expiry_rolls_back_actual_transaction(prepared_request, monkeypatch, tmp_path, expired):
    c, _, value = prepared_request
    output = tmp_path / "actual-prepared.json"
    original_prepare, original_write = cli.prepare, cli.write_receipt

    async def prepared(tx, **kwargs):
        return await original_prepare(tx, **kwargs, project_runner=native_transport)

    def write(saved, status, result=None):
        receipt_hash = original_write(saved, status, result)
        if status == "prepared" and saved.name.endswith(".status.json"):
            module = creation_service if expired == "session" else knowledge
            future = module.utcnow() + timedelta(days=1)
            monkeypatch.setattr(module, "utcnow", lambda: future)
        return receipt_hash

    monkeypatch.setattr(cli, "prepare", prepared)
    monkeypatch.setattr(cli, "write_receipt", write)
    before = await counts(c)
    with pytest.raises((ControlError, HTTPException)):
        await cli.execute(value, output)
    assert await counts(c) == before
    assert json.loads(output.read_text())["status"] == "prepared"
    assert json.loads(Path(str(output) + ".status.json").read_text())["status"] == "prepared"


async def test_receipt_destination_failure_precedes_database(tmp_path, monkeypatch):
    touched = []
    monkeypatch.setattr(cli, "create_async_engine", lambda *args: touched.append("db"))
    with pytest.raises(FileNotFoundError):
        await cli.execute({}, tmp_path / "missing-parent/receipt.json")
    assert touched == []


@pytest.mark.parametrize("failed_status", [None, "prepared", "committed"])
async def test_durable_prepared_receipt_and_commit_marker(tmp_path, monkeypatch, failed_status):
    events = []
    output = tmp_path / "receipt.json"
    result = {"page_count": 35, "profile_admission": {"admission_id": "synthetic-private-id"}}

    class Context(AbstractAsyncContextManager):
        async def __aenter__(self):
            return self

        async def __aexit__(self, kind, value, traceback):
            events.append("rollback" if kind else "commit")

        def begin(self):
            return self

    class Engine:
        async def dispose(self):
            events.append("dispose")

    async def prepare(*args, **kwargs):
        events.append("prepare")
        return result

    async def verify_profile(*args, **kwargs):
        events.append("verify_after_prepared_writes")

    original = cli.write_receipt

    def write(saved, status, result=None):
        events.append(saved.name + ":" + status)
        if saved.name.endswith(".status.json") and status == failed_status:
            # Deliberate partial marker cannot corrupt immutable prepared bytes.
            saved.write("partial")
            saved.flush()
            raise OSError("synthetic_status_failure")
        return original(saved, status, result)

    monkeypatch.setattr(cli, "create_async_engine", lambda *args: Engine())
    monkeypatch.setattr(cli, "AsyncSession", lambda *args, **kwargs: Context())
    monkeypatch.setattr(cli, "prepare", prepare)
    monkeypatch.setattr(cli, "verify_profile", verify_profile)
    monkeypatch.setattr(cli, "write_receipt", write)
    if failed_status:
        expected = cli.CommittedReceiptUnavailable if failed_status == "committed" else OSError
        with pytest.raises(expected):
            await cli.execute({}, output)
    else:
        safe = await cli.execute({}, output)
        assert safe["provider_calls"] == 0 and "synthetic-private-id" not in json.dumps(safe)
    retained = output.read_bytes()
    assert json.loads(retained) == {"status": "prepared", **result}
    if failed_status == "prepared":
        assert "rollback" in events and "commit" not in events
    else:
        assert "commit" in events and events.index(str(output) + ":prepared") < events.index("commit")
        assert events.index(str(output) + ".status.json:prepared") < events.index("verify_after_prepared_writes") < events.index("commit")
    if failed_status is None:
        marker = json.loads(Path(str(output) + ".status.json").read_text())
        assert marker == {"status": "committed", "receipt_sha256": hashlib.sha256(retained).hexdigest()}
    with pytest.raises(ValueError, match="new_private_receipt_required"):
        await cli.execute({}, output)
