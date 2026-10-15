"""Synthetic unchanged-source maintenance; real PostgreSQL, no providers/channels."""
import asyncio
import importlib
import json
import sys
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import accepted, provision
from test_customer_agent_prepare import cli as prep
from test_customer_agent_prepare import (  # noqa: F401 - fixture chain
    creation,
    customers,
    profile,
    registration,
    run,
)
from test_customer_knowledge_sync import native_transport
from test_customer_profile import profile_history_migrate

from pinet_core import knowledge, policy
from pinet_core import knowledge_index as index
from pinet_core.config import settings
from pinet_core.contracts import KnowledgeRevocation
from pinet_core.control.models import BusinessGrant, Membership, Session
from pinet_core.control.routes import ControlError, scope
from pinet_core.creation_registration.models import Registration
from pinet_core.customer.models import Account
from pinet_core.customer_profile import admin, instructions
from pinet_core.customer_profile import maintenance as maintained_source
from pinet_core.customer_profile.refresh_models import SourceRefresh
from pinet_core.customer_text import adapter
from pinet_core.customer_text import service as chat
from pinet_core.customer_text.wire import Start
from pinet_core.db import db
from pinet_core.models import Business, Case, KnowledgeState, utcnow

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
try:
    cli = importlib.import_module("customer_source_maintain")
finally:
    sys.path.pop(0)


@pytest.fixture
async def maintained(profile, monkeypatch):  # noqa: F811 - fixture dependency
    c = profile
    for key, value in {"smtp_enabled": False, "voice_enabled": False,
            "customer_text_enabled": True, "customer_text_runner_enabled": True}.items():
        monkeypatch.setattr(settings(), key, value)
    monkeypatch.setattr(prep, "source_check", lambda: settings().control_source_revision)
    monkeypatch.setattr(cli, "source_check", lambda: settings().control_source_revision)
    monkeypatch.setattr(adapter, "source_current", lambda: True)
    monkeypatch.setattr(adapter, "runner_ready", lambda: True)
    request, account, auth, me = await accepted(c)
    saved = await provision(c, request)
    value = {**request, "public_core": "synthetic-test", "public_source_revision": "c" * 40,
        "sandbox": "synthetic-test", "package_sha256": "d" * 64, "admit_source": True,
        "execution_source_revision": settings().control_source_revision}
    first = await run(c, value)
    async with AsyncSession(c["admin"]) as tx:
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == saved["business_id"]))
        expected = state.refreshed_at.isoformat()
    value.update(admit_source=False, profile_admission_id=first["profile_admission"]["admission_id"],
        profile_fingerprint=first["profile_admission"]["fingerprint"], expected_refreshed_at=expected,
        request_key=str(uuid4()))
    try:
        yield {**c, "value": value, "saved": saved, "first": first, "auth": auth,
               "account": account, "user": me["user_id"]}
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(SourceRefresh).where(SourceRefresh.environment_id == c["environment"]))
            await tx.execute(delete(Case).where(Case.environment_id == c["environment"]))


async def maintain(c, value=None, project_runner=native_transport):
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await cli.maintain(tx, environment=c["environment"], request=value or c["value"],
                                  project_runner=project_runner)


def rehash_transport(data):
    """The synthetic native fixture has one fragment per page; sign its new facts first."""
    transport = data["transport"]
    fragments = {str(f["ordinal"]): f for batch in transport["batches"] for f in batch["fragments"]}
    ordered = sorted(fragments.values(), key=lambda f: f["page_ordinal"])
    assert all(f["part"] == 0 and f["parts"] == 1 for f in ordered)
    pages = [{k: f[k] for k in ("id", "title", "url", "revision_hash", "projection_hash", "text")}
             for f in ordered]
    header = transport["header"]
    header["content_hash"] = index.content_hash(header["metadata"], pages)
    transport["commit"]["content_hash"] = header["content_hash"]
    assert index.assemble(header, fragments) == pages
    return data


async def snapshot(c):
    async with AsyncSession(c["admin"]) as tx:
        return {table: list(await tx.scalars(text(f"SELECT to_jsonb(t)::text FROM {table} t "
            "WHERE environment_id=:e ORDER BY id"), {"e": c["environment"]})) for table in
            ("knowledge_states", "control_customer_profile_admissions", "control_customer_source_refreshes",
             "control_creation_registrations", "control_business_grants", "conversations", "conversation_events")}


async def profile_get(c):
    response = await c["client"].get(f"/customer/v2/creations/{c['value']['creation_id']}/agent-profile",
                                      headers=c["auth"])
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def test_unchanged_source_maintenance_preserves_the_admitted_profile(maintained):
    c = maintained
    start = await chat.start(c["auth"]["Authorization"][7:], c["value"]["creation_id"],
        Start(request_id=uuid4(), admission_id=c["value"]["profile_admission_id"],
              notice_version="customer-text.local.v1", consent=True))
    before = await snapshot(c)
    result = await maintain(c)
    after = await snapshot(c)
    assert result["profile_admission_id"] == c["value"]["profile_admission_id"]
    assert result["profile_fingerprint"] == c["value"]["profile_fingerprint"]
    assert result["profile_admission"] == "preserved" and result["provider_calls"] == 0
    for key in before.keys() - {"knowledge_states", "control_customer_source_refreshes"}:
        assert before[key] == after[key], key
    old, new = map(json.loads, (before["knowledge_states"][0], after["knowledge_states"][0]))
    assert old["refreshed_at"] != new["refreshed_at"]
    old.pop("refreshed_at")
    new.pop("refreshed_at")
    assert old == new
    view = await profile_get(c)
    assert view["profile_current"] and view["admission"]["admission_id"] == result["profile_admission_id"]
    cap = await chat.capability(c["auth"]["Authorization"][7:], c["value"]["creation_id"])
    assert cap["admission_id"] == result["profile_admission_id"]
    retained = await chat.status(c["auth"]["Authorization"][7:], c["value"]["creation_id"], start["conversation_id"])
    assert retained["conversation_id"] == start["conversation_id"]


async def test_replay_never_renews_time_and_new_request_uses_cas(maintained):
    c = maintained
    first = await maintain(c)
    before = await snapshot(c)
    replay = await maintain(c)
    assert replay["replayed"] and replay["refresh_id"] == first["refresh_id"]
    assert await snapshot(c) == before
    with pytest.raises(ValueError, match="source_freshness_conflict"):
        await maintain(c, {**c["value"], "request_key": str(uuid4())})
    with pytest.raises(ValueError, match="maintenance_request_conflict"):
        await maintain(c, {**c["value"], "package_sha256": "e" * 64})
    assert await snapshot(c) == before


async def test_twenty_one_rechecks_keep_one_profile_and_all_original_receipts(maintained):
    c, value = maintained, dict(maintained["value"])
    original = await snapshot(c)
    for _ in range(21):
        result = await maintain(c, value)
        value.update(expected_refreshed_at=result["source_refreshed_at"], request_key=str(uuid4()))
    final = await snapshot(c)
    assert len(final["control_customer_source_refreshes"]) == 21
    assert final["control_customer_profile_admissions"] == original["control_customer_profile_admissions"]
    assert (await profile_get(c))["profile_current"]


async def test_get_expiry_does_not_refresh_and_explicit_complete_recheck_recovers(maintained, monkeypatch):
    c = maintained
    future = utcnow() + timedelta(seconds=settings().knowledge_ttl_seconds + 30)
    monkeypatch.setattr(knowledge, "utcnow", lambda: future)
    before = await snapshot(c)
    assert "public_source_expired" in (await profile_get(c))["blockers"]
    assert await snapshot(c) == before
    monkeypatch.setattr(index, "utcnow", lambda: future)
    result = await maintain(c)
    assert (await profile_get(c))["profile_current"]
    assert result["profile_admission_id"] == c["value"]["profile_admission_id"]


@pytest.mark.parametrize("change", ["text", "title", "operator", "deployment"])
async def test_changed_projection_rolls_back_and_preserves_history(maintained, change):
    c = maintained
    before = await snapshot(c)
    async def changed(value):
        data = await native_transport(value)
        header = data["transport"]["header"]
        if change in {"text", "title"}:
            data["transport"]["batches"][0]["fragments"][0][change] += " changed"
        else:
            header["metadata"]["deployment_id" if change == "deployment" else "operator"] += " changed"
        return rehash_transport(data)
    with pytest.raises(ValueError, match="public_projection_changed_requires_new_admission"):
        await maintain(c, project_runner=changed)
    assert await snapshot(c) == before


async def test_incomplete_transfer_is_not_a_refresh(maintained):
    c = maintained
    before = await snapshot(c)
    with pytest.raises(HTTPException):
        await maintain(c, project_runner=lambda v: native_transport(v, incomplete=True))
    assert await snapshot(c) == before


@pytest.mark.parametrize("change", ["session", "grant", "membership", "account", "profile", "registration", "instructions"])
async def test_revoked_or_changed_authority_never_refreshes(maintained, monkeypatch, change):
    c = maintained
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if change == "session":
            await tx.execute(update(Session).where(Session.id == c["value"]["authorizing_session_id"]).values(revoked_at=utcnow()))
        elif change == "grant":
            await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == c["saved"]["business_id"],
                             BusinessGrant.environment_id == c["environment"]).values(enabled=False))
        elif change == "membership":
            await tx.execute(update(Membership).where(Membership.user_id == c["user"]).values(enabled=False))
        elif change == "account":
            await tx.execute(update(Account).where(Account.user_id == c["user"]).values(verified_at=None))
        elif change == "profile":
            await admin.revoke(tx, environment=c["environment"], admission_id=c["value"]["profile_admission_id"],
                               fingerprint=c["value"]["profile_fingerprint"])
        elif change == "registration":
            await tx.execute(update(Registration).where(Registration.id == c["saved"]["registration_id"]).values(revoked_at=utcnow()))
    if change == "instructions":
        previous = instructions.manifest()
        monkeypatch.setattr(instructions, "manifest", lambda: {**previous, "conversation_sha256": "0" * 64})
    before = await snapshot(c)
    with pytest.raises((ValueError, ControlError)):
        await maintain(c)
    assert await snapshot(c) == before


async def test_revoked_facts_cannot_be_revived_by_unchanged_transfer(maintained):
    c = maintained
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"]))
        state.payload = {**state.payload, "revoked": ["a" * 64]}
    before = await snapshot(c)
    with pytest.raises(ValueError):
        await maintain(c)
    assert await snapshot(c) == before


async def test_concurrent_rechecks_have_one_cas_winner(maintained):
    c = maintained
    results = await asyncio.gather(maintain(c), maintain(c, {**c["value"], "request_key": str(uuid4())}), return_exceptions=True)
    assert len([r for r in results if isinstance(r, dict)]) == 1
    assert len([r for r in results if isinstance(r, ValueError) and "source_freshness_conflict" in str(r)]) == 1
    assert len((await snapshot(c))["control_customer_source_refreshes"]) == 1


async def test_proof_is_immutable_runtime_select_only_and_downgrade_refuses_loss(maintained):
    c = maintained
    result = await maintain(c)
    before = await snapshot(c)
    async with scope(user=c["user"]) as tx:
        assert await tx.get(SourceRefresh, result["refresh_id"])
    async with scope(user=str(uuid4())) as tx:
        assert await tx.get(SourceRefresh, result["refresh_id"]) is None
    with pytest.raises(DBAPIError):
        async with scope(user=c["user"]) as tx:
            await tx.execute(update(SourceRefresh).where(SourceRefresh.id == result["refresh_id"]).values(package_sha256="e" * 64))
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(SourceRefresh).where(SourceRefresh.id == result["refresh_id"]).values(package_sha256="e" * 64))
    code, errors = await profile_history_migrate("downgrade", "0022_customer_agent_configs")
    assert code != 0 and "Source revalidation history exists" in errors
    assert await snapshot(c) == before


async def test_bare_timestamp_extension_without_proof_is_denied(maintained):
    c = maintained
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"])
                         .values(refreshed_at=utcnow()))
    before = await snapshot(c)
    assert "public_source_changed" in (await profile_get(c))["blockers"]
    with pytest.raises(ValueError, match="current_profile_identity_required"):
        await maintain(c)
    assert await snapshot(c) == before


@pytest.mark.parametrize("change", ["git_wait", "fsync_session", "fsync_ttl"])
async def test_final_wait_expiry_or_source_drift_rolls_back_prepared_refresh(maintained, monkeypatch, tmp_path, change):
    c = maintained
    before = await snapshot(c)
    original_verify, original_write = cli.verify, cli.write_receipt
    original_maintain = cli.maintain
    if change == "git_wait":
        calls = []
        def drift():
            calls.append(True)
            return settings().control_source_revision if len(calls) == 1 else "0" * 40
        monkeypatch.setattr(cli, "source_check", drift)
    else:
        async def native(tx, **kwargs):
            return await original_maintain(tx, **kwargs, project_runner=native_transport)
        monkeypatch.setattr(cli, "maintain", native)
        async def expire(tx, **kwargs):
            if (tmp_path / "receipt.json.status.json").exists() and json.loads(
                    (tmp_path / "receipt.json.status.json").read_text())["status"] == "prepared":
                if change == "fsync_session":
                    # The authorizing session is locked in this exact transaction;
                    # emulate elapsed wall time, not an impossible concurrent update.
                    from pinet_core.creation import service as creation_service
                    monkeypatch.setattr(creation_service, "utcnow", lambda: utcnow() + timedelta(days=1))
                else:
                    monkeypatch.setattr(knowledge, "utcnow", lambda: utcnow() + timedelta(days=1))
            await original_verify(tx, **kwargs)
        monkeypatch.setattr(cli, "verify", expire)
        monkeypatch.setattr(cli, "write_receipt", original_write)
    if change == "git_wait":
        with pytest.raises(ValueError, match="execution_source_changed"):
            await maintain(c)
    else:
        with pytest.raises((ValueError, ControlError, HTTPException)):
            await cli.execute(c["value"], tmp_path / "receipt.json")
        assert json.loads((tmp_path / "receipt.json").read_text())["status"] == "prepared"
        assert json.loads((tmp_path / "receipt.json.status.json").read_text())["status"] == "prepared"
    assert await snapshot(c) == before


async def test_postcommit_receipt_failure_keeps_exact_proof_and_replay_never_imports(maintained, monkeypatch, tmp_path):
    c = maintained
    original_maintain, original_write = cli.maintain, cli.write_receipt
    async def native(tx, **kwargs):
        kwargs.setdefault("project_runner", native_transport)
        return await original_maintain(tx, **kwargs)
    def fail_marker(saved, status, result=None):
        if status == "committed":
            raise OSError("Synthetic marker disk failure")
        return original_write(saved, status, result)
    monkeypatch.setattr(cli, "maintain", native)
    monkeypatch.setattr(cli, "write_receipt", fail_marker)
    with pytest.raises(cli.CommittedReceiptUnavailable):
        await cli.execute(c["value"], tmp_path / "receipt.json")
    prepared = (tmp_path / "receipt.json").read_bytes()
    assert json.loads(prepared)["status"] == "prepared"
    before = await snapshot(c)
    async def forbidden(_):
        raise AssertionError("Replay must not import/renew source")
    replay = await maintain(c, project_runner=forbidden)
    assert replay["replayed"] and await snapshot(c) == before
    assert (tmp_path / "receipt.json").read_bytes() == prepared


async def test_maintenance_and_real_worker_index_use_one_lock_order(maintained, monkeypatch):
    from pinet_core.customer_profile import service as profiles
    c = maintained
    source_locked, worker_attempted, worker_shared = asyncio.Event(), asyncio.Event(), asyncio.Event()
    original, first = profiles.source, True
    async def observed(*args, **kwargs):
        nonlocal first
        result = await original(*args, **kwargs)
        if first:
            first = False
            source_locked.set()
            await worker_attempted.wait()
            try:
                await asyncio.wait_for(worker_shared.wait(), timeout=0.2)
            except TimeoutError:
                pass  # A correct exclusive policy gate holds the worker here.
        return result
    monkeypatch.setattr(profiles, "source", observed)
    async def worker():
        await source_locked.wait()
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            worker_attempted.set()
            await policy.lock(tx, c["saved"]["business_id"], c["environment"])
            worker_shared.set()
            await index.locked(tx, await tx.get(Business, c["saved"]["business_id"]))
    results = await asyncio.wait_for(asyncio.gather(maintain(c), worker(), return_exceptions=True), timeout=15)
    assert not any(isinstance(r, BaseException) for r in results), "Canonical worker and maintenance must both complete"


async def test_second_actual_business_preparation_does_not_mutate_first_source(maintained):
    c = maintained
    original = (await snapshot(c))["knowledge_states"]
    request, _, _, _ = await accepted(c)
    await provision(c, request)
    value = {**request, **{k: v for k, v in c["value"].items() if k in
        {"public_core", "public_source_revision", "sandbox", "package_sha256", "execution_source_revision"}},
        "admit_source": True}
    await run(c, value)
    async with AsyncSession(c["admin"]) as tx:
        first = await tx.scalar(text("SELECT to_jsonb(t)::text FROM knowledge_states t WHERE business_id=:b AND environment_id=:e"),
                               {"b": c["saved"]["business_id"], "e": c["environment"]})
    assert [first] == original, "Preparing a second business must not replace the first business's source"
    assert (await profile_get(c))["profile_current"]


async def test_freshness_proof_allows_explicit_new_source_admission_without_reimport(maintained, monkeypatch):
    c = maintained
    await maintain(c)
    before = (await snapshot(c))["knowledge_states"]
    updated_source = "1" * 40
    monkeypatch.setattr(settings(), "control_source_revision", updated_source)
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        result = await admin.admit(tx, environment=c["environment"],
            registration_id=c["saved"]["registration_id"],
            **{k: c["value"][k] for k in ("accepted_revision", "candidate_sha256", "accepted_source_revision", "authorizing_session_id")},
            execution_source_revision=updated_source, knowledge_ref=c["first"]["knowledge_ref"])
    assert result["admission_id"] != c["value"]["profile_admission_id"]
    assert (await snapshot(c))["knowledge_states"] == before
    assert (await profile_get(c))["profile_current"]


async def test_ttl_expiring_during_final_proof_lookup_cannot_commit(maintained, monkeypatch, tmp_path):
    c = maintained
    original_maintain, original_proof = cli.maintain, maintained_source.current_refresh
    count = 0
    async def native(tx, **kwargs):
        kwargs.setdefault("project_runner", native_transport)
        return await original_maintain(tx, **kwargs)
    async def delayed(*args):
        nonlocal count
        result = await original_proof(*args)
        marker = tmp_path / "receipt.json.status.json"
        if marker.exists() and json.loads(marker.read_text())["status"] == "prepared":
            count += 1
            if count == 4:  # two projection reads, structural proof, final source read
                monkeypatch.setattr(knowledge, "utcnow", lambda: utcnow() + timedelta(days=1))
        return result
    monkeypatch.setattr(cli, "maintain", native)
    monkeypatch.setattr(maintained_source, "current_refresh", delayed)
    before = await snapshot(c)
    with pytest.raises(HTTPException):
        await cli.execute(c["value"], tmp_path / "receipt.json")
    assert count == 4 and await snapshot(c) == before
    assert json.loads((tmp_path / "receipt.json.status.json").read_text())["status"] == "prepared"


async def test_session_expiring_during_final_proof_lookup_cannot_commit(maintained, monkeypatch, tmp_path):
    from pinet_core.creation import service as creation_service
    c = maintained
    original_maintain, original_proof = cli.maintain, maintained_source.current_refresh
    count = 0
    async def native(tx, **kwargs):
        kwargs.setdefault("project_runner", native_transport)
        return await original_maintain(tx, **kwargs)
    async def delayed(*args):
        nonlocal count
        result = await original_proof(*args)
        marker = tmp_path / "receipt.json.status.json"
        if marker.exists() and json.loads(marker.read_text())["status"] == "prepared":
            count += 1
            if count == 4:
                monkeypatch.setattr(creation_service, "utcnow", lambda: utcnow() + timedelta(days=1))
        return result
    monkeypatch.setattr(cli, "maintain", native)
    monkeypatch.setattr(maintained_source, "current_refresh", delayed)
    before = await snapshot(c)
    with pytest.raises(ControlError):
        await cli.execute(c["value"], tmp_path / "receipt.json")
    assert count == 4 and await snapshot(c) == before
    assert json.loads((tmp_path / "receipt.json.status.json").read_text())["status"] == "prepared"


async def test_partial_revocation_keeps_historical_freshness_but_requires_new_profile(maintained):
    c = maintained
    async def diverse(value):
        data = await native_transport(value)
        transport = data["transport"]
        transport["batches"][0]["fragments"][0]["revision_hash"] = "b" * 64
        return rehash_transport(data)
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        prepared = await prep.prepare(tx, environment=c["environment"], request={
            **{k: v for k, v in c["value"].items() if k in prep.Request.model_fields}, "admit_source": True},
            project_runner=diverse)
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"]))
        c["value"].update(profile_admission_id=prepared["profile_admission"]["admission_id"],
            profile_fingerprint=prepared["profile_admission"]["fingerprint"], expected_refreshed_at=state.refreshed_at.isoformat())
    await maintain(c, project_runner=diverse)
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        state = await knowledge.current(tx)
        await knowledge.revoke(tx, KnowledgeRevocation(base_revision=state.revision,
            revision_hashes=["b" * 64], reason="Synthetic partial fact revocation"))
        current = {**prepared["knowledge_ref"], "knowledge_revision": state.revision}
    assert "public_source_changed" in (await profile_get(c))["blockers"]
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        admitted = await admin.admit(tx, environment=c["environment"], registration_id=c["saved"]["registration_id"],
            **{k: c["value"][k] for k in ("accepted_revision", "candidate_sha256", "accepted_source_revision", "authorizing_session_id", "execution_source_revision")},
            knowledge_ref=current)
    assert admitted["admission_id"] != c["value"]["profile_admission_id"]
    assert (await profile_get(c))["profile_current"]
    before = await snapshot(c)
    with pytest.raises(ValueError):
        await maintain(c, project_runner=diverse)
    assert await snapshot(c) == before


async def test_admin_current_requires_exact_business_and_environment_context(maintained):
    c = maintained
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(text("SELECT set_config('pinet.environment',:e,true)"), {"e": c["environment"]})
        assert await knowledge.current(tx) is None
        await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": c["saved"]["business_id"]})
        assert (await knowledge.current(tx)).business_id == c["saved"]["business_id"]
        await tx.execute(text("SELECT set_config('pinet.environment',:e,true)"), {"e": c["environment"] + "-foreign"})
        assert await knowledge.current(tx) is None

# Explicit finite monitor delegates every mutation to the existing canonical CLI.
def source_monitor_module():
    sys.path.insert(0, str(ROOT / "scripts"))
    try:
        return importlib.import_module("customer_source_monitor")
    finally:
        sys.path.pop(0)


async def test_source_monitor_real_pg_retains_profile_and_chains_exact_receipts(maintained, monkeypatch, tmp_path):
    c, monitor = maintained, source_monitor_module()
    original = cli.maintain
    async def native(tx, **kwargs):
        kwargs.setdefault("project_runner", native_transport)
        return await original(tx, **kwargs)
    monkeypatch.setattr(cli, "maintain", native)
    clock = [utcnow()]
    async def sleep(seconds):
        clock[0] += timedelta(seconds=seconds)
    before = await snapshot(c)
    directory = tmp_path / "monitor"
    result = await monitor.monitor(c["value"], directory,
        until=(clock[0] + timedelta(seconds=40)).isoformat(), interval_seconds=20,
        ttl_seconds=settings().knowledge_ttl_seconds, executor=cli.execute,
        clock=lambda: clock[0], sleep=sleep, check=lambda: settings().control_source_revision)
    assert result["new_rechecks"] == 2 and result["provider_calls"] == 0
    after = await snapshot(c)
    for key in before.keys() - {"knowledge_states", "control_customer_source_refreshes"}:
        assert before[key] == after[key], key
    assert len(after["control_customer_source_refreshes"]) == len(before["control_customer_source_refreshes"]) + 2
    first = json.loads((directory / "000001/receipt.json").read_text())
    second = json.loads((directory / "000002/request.json").read_text())
    assert second["expected_refreshed_at"] == first["source_refreshed_at"]
    assert first["profile_admission_id"] == c["value"]["profile_admission_id"]
    assert (await profile_get(c))["profile_current"]


async def test_source_monitor_real_pg_session_expiry_stops_without_next_proof(maintained, monkeypatch, tmp_path):
    c, monitor = maintained, source_monitor_module()
    original = cli.maintain
    async def native(tx, **kwargs):
        kwargs.setdefault("project_runner", native_transport)
        return await original(tx, **kwargs)
    monkeypatch.setattr(cli, "maintain", native)
    clock, retained = [utcnow()], []
    async def expire(seconds):
        clock[0] += timedelta(seconds=seconds)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Session).where(Session.id == c["value"]["authorizing_session_id"])
                .values(expires_at=utcnow() - timedelta(seconds=1)))
        retained.append(await snapshot(c))
    directory = tmp_path / "monitor"
    with pytest.raises((ValueError, ControlError, HTTPException)):
        await monitor.monitor(c["value"], directory,
            until=(clock[0] + timedelta(seconds=60)).isoformat(), interval_seconds=20,
            ttl_seconds=settings().knowledge_ttl_seconds, executor=cli.execute,
            clock=lambda: clock[0], sleep=expire, check=lambda: settings().control_source_revision)
    assert len(retained) == 1 and await snapshot(c) == retained[0]
    assert json.loads((directory / "000001/receipt.json.status.json").read_text())["status"] == "committed"
    assert json.loads((directory / "000002/receipt.json.status.json").read_text())["status"] == "reserved"
    assert not (directory / "000003").exists()