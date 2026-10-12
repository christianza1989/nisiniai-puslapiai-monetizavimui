"""Actual isolated restricted PG, maintained Xbot + fake model. Never calibration/live X."""

import asyncio
import os
import subprocess
from datetime import timedelta
from uuid import uuid4

import pytest
import test_customer_profile as profile_fixture
from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agents import draft
from test_customer_profile import (  # noqa: F401
    admit,
    creation,
    customers,
    prepared,
    profile,
    profile_history_migrate,
    registration,
)
from test_customer_public import logged

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.control.routes import ControlError
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.models import Agent as CustomerAgent
from pinet_core.customer_agents.models import Config
from pinet_core.customer_agents.wire import Create, Revise
from pinet_core.customer_profile.models import Admission
from pinet_core.db import db
from pinet_core.models import KnowledgeState, utcnow
from pinet_core.xbot_bridge import admin, service, worker
from pinet_core.xbot_bridge.library import load


@pytest.fixture
async def bridge(profile, monkeypatch, request):  # noqa: F811 - imported shared fixture
    c = profile
    cfg = settings()
    monkeypatch.setattr(cfg, "customer_agents_enabled", True)
    monkeypatch.setattr(cfg, "xbot_bridge_enabled", True)
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    monkeypatch.setattr(cfg, "control_source_revision", head)
    if os.environ.get("XBOT_QA_FROZEN") != "1":
        # Development only. Final frozen pass uses the actual clean Git verifier.
        monkeypatch.setattr(service, "source_current", lambda: True)
        monkeypatch.setattr(agents, "source_current", lambda: True)
    if getattr(request, "param", None) == "long-pages":
        monkeypatch.setattr(profile_fixture, "public_source", long_public_source)
    request, saved, profile_request, value, auth, me = await prepared(c)
    admitted = await admit(c, profile_request)
    token = auth["Authorization"].split(" ")[1]
    created = await agents.create(
        token,
        request["creation_id"],
        Create(request_id=uuid4(), purpose="customer_research", configuration=draft()),
    )
    c.update(
        request=request,
        saved=saved,
        profile_request=profile_request,
        admitted=admitted,
        value=value,
        auth=auth,
        me=me,
        token=token,
        agent=created["agent"],
        config=created["configuration"],
    )
    try:
        yield c
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            for table in ("tickets", "workers", "slots", "admissions"):
                await tx.execute(
                    text(f"DELETE FROM control_xbot_{table} WHERE environment_id=:e"), {"e": c["environment"]}
                )
            await tx.execute(delete(Config).where(Config.environment_id == c["environment"]))
            await tx.execute(delete(CustomerAgent).where(CustomerAgent.environment_id == c["environment"]))


async def long_public_source(c, saved, *, ready=True, deployment=None):
    """Handwritten synthetic source through maintained V2; never root private source/authority."""
    from pinet_core import knowledge_index as index
    from pinet_core import onboarding, policy
    from pinet_core.contracts import KnowledgeReferenceV2
    from pinet_core.models import Business

    async with AsyncSession(c["admin"]) as tx:
        business = await tx.get(Business, saved["business_id"])
    metadata = {
        "site_id": business.site_id,
        "canonical_host": business.canonical_host,
        "operator": "Synthetic operator",
        "contact_email": "synthetic-owner@example.com",
        "deployment_id": deployment or uuid4().hex,
        "generated_at": utcnow().isoformat(),
    }
    pages = []
    for i, length in enumerate((4126, 1656, 3099)):
        prefix = "Synthetic information. " * ((length // 23) + 1)
        tail = " Capacity and commercial price remain unconfirmed."
        pages.append(
            {
                "id": f"page-{i}",
                "title": f"Synthetic source {i}",
                "url": f"https://{business.canonical_host}/source-{i}/",
                "text": prefix[: length - len(tail)] + tail,
                "revision_hash": str(i + 1) * 64,
                "projection_hash": str(i + 4) * 64,
            }
        )
    transfer = uuid4().hex
    async with db.transaction(business.id, c["environment"]) as tx:
        state = await tx.scalar(select(KnowledgeState))
        await policy.lock(tx, business.id, c["environment"], exclusive=True)
        content_hash = index.content_hash(metadata, pages)
        await index.begin(
            tx,
            business,
            index.Begin(
                schema_version=2,
                transfer_id=transfer,
                base_revision=state.revision if state else 0,
                metadata=metadata,
                page_count=3,
                fragment_count=3,
                content_hash=content_hash,
            ),
        )
        await index.batch(
            tx,
            business,
            index.Batch(
                transfer_id=transfer,
                fragments=[
                    index.Fragment(ordinal=i, page_ordinal=i, part=0, parts=1, **page)
                    for i, page in enumerate(pages)
                ],
            ),
        )
        await index.commit(tx, business, index.Commit(transfer_id=transfer, content_hash=content_hash))
        await onboarding.update(
            tx, business, onboarding.Readiness(source_ready=ready, learning_admitted=False)
        )
        state = await tx.scalar(select(KnowledgeState))
        c["synthetic_long_pages"] = pages
        return KnowledgeReferenceV2(
            schema_version=2,
            knowledge_revision=state.revision,
            knowledge_hash=state.payload["hash"],
            deployment_id=metadata["deployment_id"],
        ).model_dump(mode="json")


async def grant(c, **changes):
    proof = {
        "kind": "synthetic-plumbing",
        "config_sha256": c["config"]["sha256"],
        "module_fingerprint": service.module_material()["fingerprint"],
        "evidence_sha256": "c" * 64,
    }
    args = {
        "agent_id": c["agent"]["agent_id"],
        "authorizing_session_id": c["request"]["authorizing_session_id"],
        "proof": proof,
        "mandate": "synthetic-local-proposal-only",
        "seconds": 300,
        **changes,
    }
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await admin.open_local(tx, **args)


async def revoke(c, opened):
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await admin.revoke_local(tx, admission_id=opened["admission_id"])


def fake_agent(
    calls,
    *,
    callback=None,
    fail=False,
    unknown=False,
    approved=True,
    fact_indices=None,
    draft_text=None,
    evidence_sink=None,
):
    load()
    from xbot.agent import Agent, Draft, Review

    class Runner:
        def __init__(self):
            self.calls, self.usage, self.receipt_sink = 0, [], None

        async def ask(self, schema, *args):
            self.calls += 1
            calls.append(schema.__name__)
            if evidence_sink is not None:
                evidence_sink.append((schema.__name__, args[-1]))
            usage = {} if unknown else {"input_tokens": 7, "output_tokens": 3}
            self.usage.append(usage)
            if self.receipt_sink:
                self.receipt_sink({"attempt": self.calls, "usage": usage, "outcome": "synthetic"})
            if callback:
                await callback(self.calls)
            if fail:
                raise RuntimeError("synthetic_model_failure")
            if schema is Draft:
                return Draft(
                    text=draft_text or "Capacity and commercial price remain unconfirmed.",
                    media_brief="",
                    fact_indices=[0] if fact_indices is None else fact_indices,
                )
            assert schema is Review
            return Review(
                approved=approved, unsupported_claims=[] if approved else ["synthetic rejection"], reasons=[]
            )

    return lambda: Agent(runner=Runner())


async def history(c):
    async with AsyncSession(c["admin"]) as tx:
        result = {}
        for table in (
            "control_creation_registrations",
            "control_customer_profile_admissions",
            "control_customer_agent_configs",
            "knowledge_states",
        ):
            result[table] = list(
                await tx.scalars(
                    text(f"SELECT to_jsonb(t)::text FROM {table} t WHERE environment_id=:e ORDER BY id"),
                    {"e": c["environment"]},
                )
            )
        return result


async def test_restricted_pg_to_sqlite_to_owner_receipt_reopen_replay(bridge, tmp_path):
    c, calls = bridge, []
    before = await history(c)
    opened = await grant(c)
    token = opened["worker_token"]
    request = str(uuid4())
    ticket = await service.enqueue(token, request)
    assert await service.enqueue(token, request) == ticket
    result = await worker.run_local(token, ticket, tmp_path, agent_factory=fake_agent(calls))
    assert result["state"] == "accepted", result
    assert calls == ["Draft", "Review"]
    assert result["known_model_usage"] == {"input_tokens": 14, "output_tokens": 6}
    assert result["usage_status"] == "known" and result["started_calls"] == result["finished_calls"] == 2
    assert not result["live_module_admitted"] and result["calibration_status"] == "UNVERIFIED"
    assert not result["provider_execution"] and result["channel_activation"] == "not_performed"
    assert await history(c) == before
    await db.engine.dispose()  # Reopen connections; receipts survive, no in-memory acceptance.
    replay = await worker.run_local(token, ticket, tmp_path, agent_factory=fake_agent(calls))
    assert replay == result and len(calls) == 2
    path = f"/customer/v2/creations/{c['request']['creation_id']}/agents/{c['agent']['agent_id']}/xbot/tickets/{ticket}"
    response = await c["client"].get(path, headers=c["auth"])
    assert response.status_code == 200
    safe = response.json()
    assert safe["contract_version"] == "xbot-local-receipt.v1"
    assert safe["data"]["state"] == "accepted" and token not in response.text
    assert not any(
        key in response.text for key in ("material", "facts", "worker_token", "draft", "specification")
    )
    readiness = (await agents.get(c["token"], c["request"]["creation_id"], c["agent"]["agent_id"]))[
        "readiness"
    ]
    assert readiness["calibration_status"] == "UNVERIFIED" and readiness["module_admission"] == "not_admitted"


@pytest.mark.parametrize(
    "change", ["module", "member", "user", "grant", "config", "source", "profile", "ttl"]
)
async def test_final_pg_acceptance_quarantines_after_local_success(bridge, tmp_path, monkeypatch, change):
    c, calls = bridge, []
    opened = await grant(c)
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))

    async def boundary():
        if change == "module":
            await revoke(c, opened)
        elif change == "config":
            await agents.revise(
                c["token"],
                c["request"]["creation_id"],
                c["agent"]["agent_id"],
                Revise(
                    request_id=uuid4(), expected_revision=1, configuration={**draft(), "name": "Changed spec"}
                ),
            )
        elif change == "source":
            monkeypatch.setattr(service, "source_current", lambda: False)
        elif change == "ttl":
            monkeypatch.setattr(service, "utcnow", lambda: utcnow() + timedelta(minutes=20))
        else:
            model = {"member": Membership, "user": User, "grant": BusinessGrant, "profile": Admission}[change]
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                stmt = update(model).where(model.environment_id == c["environment"])
                await tx.execute(
                    stmt.values(**({"revoked_at": utcnow()} if change == "profile" else {"enabled": False}))
                )

    result = await asyncio.wait_for(
        worker.run_local(token, ticket, tmp_path, agent_factory=fake_agent(calls), before_accept=boundary),
        timeout=35,
    )
    assert calls == ["Draft", "Review"] and result["state"] == "quarantined"
    assert result["known_model_usage"] == {"input_tokens": 14, "output_tokens": 6}
    assert not result["live_module_admitted"] and result["reason"]
    # Quarantined proposal cannot be replaced or promoted by a late receipt.
    async with service.worker_scope(token) as (tx, _, _):
        row = await service.one(tx, "tickets", ticket)
    assert row["proposal_sha256"] == result["proposal_sha256"]


async def test_revocation_during_first_model_stops_second_call_keeps_usage(bridge, tmp_path):
    c, calls = bridge, []
    opened = await grant(c)
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))

    async def during_model(number):
        assert number == 1
        # A second actual PG connection can revoke now: no PG/SQLite lock held across model await.
        await asyncio.wait_for(revoke(c, opened), timeout=4)

    result = await worker.run_local(
        token, ticket, tmp_path, agent_factory=fake_agent(calls, callback=during_model)
    )
    assert calls == ["Draft"] and result["state"] == "quarantined"
    assert result["started_calls"] == result["finished_calls"] == 1
    assert result["known_model_usage"] == {"input_tokens": 7, "output_tokens": 3}


@pytest.mark.parametrize(
    "unknown,fail,approved,expected",
    [(False, True, True, "rejected"), (True, False, True, "quarantined"), (False, False, False, "rejected")],
)
async def test_failure_rejection_unknown_usage_are_not_free_or_accepted(
    bridge, tmp_path, unknown, fail, approved, expected
):
    calls, opened = [], await grant(bridge)
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))
    result = await worker.run_local(
        token,
        ticket,
        tmp_path,
        agent_factory=fake_agent(calls, unknown=unknown, fail=fail, approved=approved),
    )
    assert result["state"] == expected and calls
    assert result["usage_status"] == ("unknown" if unknown else "known")
    assert bool(result["known_model_usage"]) != unknown


async def test_browser_and_worker_are_distinct_and_logout_does_not_erase_mandate(bridge, tmp_path):
    c, calls = bridge, []
    opened = await grant(c)
    token = opened["worker_token"]
    with pytest.raises(ControlError):
        await service.enqueue(c["token"], str(uuid4()))
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(
            update(Session)
            .where(Session.id == c["request"]["authorizing_session_id"])
            .values(revoked_at=utcnow())
        )
    ticket = await service.enqueue(token, str(uuid4()))
    result = await worker.run_local(token, ticket, tmp_path, agent_factory=fake_agent(calls))
    assert result["state"] == "accepted"
    with pytest.raises(ControlError):
        await service.receipt(token, c["request"]["creation_id"], c["agent"]["agent_id"], ticket)
    fresh = await logged(c, c["value"])
    receipt = await service.receipt(
        fresh["Authorization"].split(" ")[1], c["request"]["creation_id"], c["agent"]["agent_id"], ticket
    )
    assert receipt == result


async def test_concurrent_enqueue_claim_and_reserved_crash_never_resend(bridge, monkeypatch):
    opened = await grant(bridge)
    token, request = opened["worker_token"], str(uuid4())
    tickets = await asyncio.gather(service.enqueue(token, request), service.enqueue(token, request))
    assert tickets[0] == tickets[1]
    claims = await asyncio.gather(
        service.claim(token, tickets[0]), service.claim(token, tickets[0]), return_exceptions=True
    )
    assert sum(isinstance(r, tuple) and r[1] for r in claims) == 1
    assert sum(isinstance(r, ControlError) for r in claims) == 1
    with pytest.raises(ControlError) as error:
        await service.reconcile_abandoned(token, tickets[0])
    assert error.value.code == "xbot_reservation_not_expired"
    monkeypatch.setattr(service, "utcnow", lambda: utcnow() + timedelta(minutes=10))
    receipt = await service.reconcile_abandoned(token, tickets[0])
    assert receipt["state"] == "uncertain" and receipt["usage_status"] == "unknown"
    assert receipt["known_model_usage"] == {} and receipt["started_calls"] == 0


async def test_default_off_explicit_proof_and_single_site_slot(bridge, monkeypatch):
    c = bridge
    monkeypatch.setattr(settings(), "xbot_bridge_enabled", False)
    with pytest.raises(ControlError):
        await grant(c)
    monkeypatch.setattr(settings(), "xbot_bridge_enabled", True)
    for change in ({"mandate": "activate"}, {"proof": {}}, {"seconds": 601}):
        with pytest.raises(ValueError):
            await grant(c, **change)
    opened = await grant(c)
    with pytest.raises(ControlError) as error:
        await grant(c)
    assert error.value.code == "xbot_site_slot_occupied"
    await revoke(c, opened)
    newer = await grant(c)
    assert newer["generation"] > opened["generation"]
    with pytest.raises(ControlError):
        await service.enqueue(opened["worker_token"], str(uuid4()))


async def test_runtime_rls_select_only_immutable_pins_and_terminal_tickets(bridge, tmp_path):
    opened, calls = await grant(bridge), []
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))
    result = await worker.run_local(token, ticket, tmp_path, agent_factory=fake_agent(calls))
    async with service.worker_scope(token) as (tx, _, _):
        role = (
            await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))
        ).one()
        assert not any(role)
        rows = (
            await tx.execute(
                text(
                    "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname LIKE 'control_xbot_%' AND relkind='r'"
                )
            )
        ).all()
        assert len(rows) == 4 and all(r[1] and r[2] for r in rows)
        await tx.execute(text("SELECT set_config('pinet.control_user',:u,true)"), {"u": str(uuid4())})
        assert await tx.scalar(text("SELECT count(*) FROM control_xbot_tickets")) == 0
        assert not await tx.scalar(
            text("SELECT control_xbot_pin(:a,:w)"), {"a": opened["admission_id"], "w": opened["worker_id"]}
        )
    for sql, args in [
        (
            "UPDATE control_xbot_workers SET token_hash=:h WHERE id=:id",
            {"h": "f" * 64, "id": opened["worker_id"]},
        ),
        ("DELETE FROM control_xbot_tickets WHERE id=:id", {"id": ticket}),
        ("UPDATE control_xbot_tickets SET state='reserved' WHERE id=:id", {"id": ticket}),
        ("UPDATE control_xbot_tickets SET worker_id=:w WHERE id=:id", {"w": str(uuid4()), "id": ticket}),
    ]:
        with pytest.raises(DBAPIError):
            async with service.worker_scope(token) as (tx, _, _):
                await tx.execute(text(sql), args)
    async with service.worker_scope(token) as (tx, _, _):
        row = await service.one(tx, "tickets", ticket)
    with pytest.raises(ControlError) as error:
        await service.complete(
            token,
            row,
            job_id=result["job_id"],
            proposal_sha256="f" * 64,
            usage=result["known_model_usage"],
            usage_status="known",
            accepted=True,
        )
    assert error.value.code == "xbot_receipt_conflict"
    assert service.safe_receipt(row) == result


async def test_source_hash_drift_and_final_git_wait_expiry_fail_closed(bridge, monkeypatch):
    opened = await grant(bridge)
    token = opened["worker_token"]
    original = service.module_material
    monkeypatch.setattr(service, "module_material", lambda: {**original(), "fingerprint": "f" * 64})
    with pytest.raises(ControlError) as error:
        await service.enqueue(token, str(uuid4()))
    assert error.value.code == "xbot_module_source_changed"
    monkeypatch.setattr(service, "module_material", original)
    original_guard = service.source_guard

    async def late():
        await original_guard()
        monkeypatch.setattr(service, "utcnow", lambda: utcnow() + timedelta(minutes=10))

    monkeypatch.setattr(service, "source_guard", late)
    with pytest.raises(ControlError) as error:
        await service.enqueue(token, str(uuid4()))
    assert error.value.code == "xbot_binding_expired_or_changed"


async def test_crash_after_attempt_preserves_unknown_and_known_partial_accounting(bridge, monkeypatch):
    opened = await grant(bridge)
    token = opened["worker_token"]
    ticket_id = await service.enqueue(token, str(uuid4()))
    ticket, _ = await service.claim(token, ticket_id)
    await service.bind_job(token, ticket, str(uuid4()))
    await service.begin_call(token, ticket)
    await service.finish_call(token, ticket, {"input_tokens": 7, "output_tokens": 3}, "known")
    await service.begin_call(token, ticket)  # Process lost before receipt, no retry presumed safe.
    monkeypatch.setattr(service, "utcnow", lambda: utcnow() + timedelta(minutes=10))
    result = await service.reconcile_abandoned(token, ticket_id)
    assert result["state"] == "uncertain" and result["usage_status"] == "partial"
    assert result["started_calls"] == 2 and result["finished_calls"] == 1
    assert result["known_model_usage"] == {"input_tokens": 7, "output_tokens": 3}
    assert await service.reconcile_abandoned(token, ticket_id) == result


@pytest.mark.parametrize("target", ["module", "user"])
async def test_final_cas_linearizes_before_waiting_actual_pg_revoker(bridge, tmp_path, monkeypatch, target):
    c, calls, opened = bridge, [], await grant(bridge)
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))
    entered, release = asyncio.Event(), asyncio.Event()
    original_guard = service.source_guard

    async def before_accept():
        async def paused():
            await original_guard()
            entered.set()
            await asyncio.wait_for(release.wait(), 5)

        monkeypatch.setattr(service, "source_guard", paused)

    async def revoker():
        if target == "module":
            await revoke(c, opened)
        else:
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(User).where(User.id == c["me"]["user_id"]).values(enabled=False))

    task = asyncio.create_task(
        worker.run_local(
            token, ticket, tmp_path, agent_factory=fake_agent(calls), before_accept=before_accept
        )
    )
    await asyncio.wait_for(entered.wait(), 25)
    pending = asyncio.create_task(revoker())
    try:
        await asyncio.sleep(0.15)
        assert not pending.done()  # Actual PG lock, not an in-memory callback-only assertion.
    finally:
        release.set()
    result = await asyncio.wait_for(task, 10)
    await asyncio.wait_for(pending, 10)
    assert result["state"] == "accepted" and calls == ["Draft", "Review"]
    async with service.worker_scope(token) as (tx, _, _):
        assert service.safe_receipt(await service.one(tx, "tickets", ticket)) == result


async def test_actual_migration_empty_roundtrip_and_populated_history_refusal(bridge):
    c = bridge
    before = await history(c)
    code, _ = await profile_history_migrate("downgrade", "0023_customer_source_refreshes")
    assert code == 0
    code, _ = await profile_history_migrate("upgrade", "0024_xbot_module_flow")
    assert code == 0 and await history(c) == before
    opened = await grant(c)
    await service.enqueue(opened["worker_token"], str(uuid4()))
    async with AsyncSession(c["admin"]) as tx:
        snapshot = {
            name: list(
                await tx.scalars(text(f"SELECT to_jsonb(t)::text FROM control_xbot_{name} t ORDER BY id"))
            )
            for name in ("admissions", "workers", "tickets")
        }
    code, errors = await profile_history_migrate("downgrade", "0023_customer_source_refreshes")
    assert code != 0 and "Retained X module history" in errors
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(text("SELECT version_num FROM alembic_version")) == "0024_xbot_module_flow"
        for name, values in snapshot.items():
            assert (
                list(
                    await tx.scalars(text(f"SELECT to_jsonb(t)::text FROM control_xbot_{name} t ORDER BY id"))
                )
                == values
            )
    assert await history(c) == before


async def test_v2_revocation_in_final_gap_quarantines_and_retains_receipt(bridge, tmp_path):
    from pinet_core import knowledge
    from pinet_core.contracts import KnowledgeRevocation

    c, opened, calls = bridge, await grant(bridge), []
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))

    async def changed():
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            state = await tx.scalar(select(KnowledgeState))
            await knowledge.revoke(
                tx,
                KnowledgeRevocation(
                    base_revision=state.revision,
                    revision_hashes=["d" * 64],
                    reason="Synthetic final boundary revocation",
                ),
            )

    result = await worker.run_local(
        token, ticket, tmp_path, agent_factory=fake_agent(calls), before_accept=changed
    )
    assert result["state"] == "quarantined" and result["known_model_usage"] == {
        "input_tokens": 14,
        "output_tokens": 6,
    }


async def test_windows_iana_zones_and_worker_cross_environment_deny(bridge, monkeypatch):
    from zoneinfo import ZoneInfo

    assert ZoneInfo("Europe/Vilnius").key == "Europe/Vilnius"
    opened = await grant(bridge)
    monkeypatch.setattr(settings(), "environment", "test-foreign-" + str(uuid4()))
    with pytest.raises(ControlError) as error:
        await service.enqueue(opened["worker_token"], str(uuid4()))
    assert error.value.code == "xbot_worker_unauthenticated"


async def test_maintained_actual_codex_runner_cannot_be_used_by_synthetic_mandate(
    bridge, tmp_path, monkeypatch
):
    load()
    from xbot.agent import Agent
    from xbot.codex import CodexRunner

    async def forbidden(*_):
        raise AssertionError("Actual model must never be invoked in this synthetic bridge")

    monkeypatch.setattr(CodexRunner, "ask", forbidden)
    opened = await grant(bridge)
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))
    result = await worker.run_local(token, ticket, tmp_path, agent_factory=Agent)
    assert result["state"] == "rejected" and result["started_calls"] == 0
    assert result["known_model_usage"] == {} and result["usage_status"] == "unknown"


async def test_ticket_lock_wait_cannot_accept_expired_worker_with_still_valid_lease(
    bridge, tmp_path, monkeypatch
):
    c, calls = bridge, []
    opened = await grant(c, seconds=60)
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))
    holder = AsyncSession(c["admin"])
    entered, final_gate = asyncio.Event(), asyncio.Event()
    original = service.source_guard

    async def observed():
        await original()
        if entered.is_set():
            final_gate.set()

    monkeypatch.setattr(service, "source_guard", observed)

    async def before_accept():
        await holder.begin()
        await holder.execute(
            text("SELECT id FROM control_xbot_tickets WHERE id=:id FOR UPDATE"), {"id": ticket}
        )
        entered.set()

    task = asyncio.create_task(
        worker.run_local(
            token, ticket, tmp_path, agent_factory=fake_agent(calls), before_accept=before_accept
        )
    )
    try:
        await asyncio.wait_for(final_gate.wait(), 25)

        async def blocked():
            for _ in range(100):
                async with AsyncSession(c["admin"]) as tx:
                    waiting = await tx.scalar(
                        text("""SELECT count(*) FROM pg_stat_activity
                        WHERE datname=current_database() AND wait_event_type='Lock'
                        AND query LIKE 'SELECT * FROM control_xbot_tickets%'""")
                    )
                if waiting:
                    return
                await asyncio.sleep(0.03)
            raise AssertionError("Actual ticket lock wait was not observed")

        await asyncio.wait_for(blocked(), 5)
        late = utcnow() + timedelta(seconds=65)
        async with AsyncSession(c["admin"]) as tx:
            lease = await tx.scalar(
                text("SELECT lease_until FROM control_xbot_tickets WHERE id=:id"), {"id": ticket}
            )
        assert late < lease, "The ticket lease must remain valid in this worker-expiry regression"
        monkeypatch.setattr(service, "utcnow", lambda: late)
        await holder.commit()
        result = await asyncio.wait_for(task, 20)
        assert calls == ["Draft", "Review"]
        assert result["state"] == "quarantined", result
        assert result["known_model_usage"] == {"input_tokens": 14, "output_tokens": 6}
    finally:
        await holder.close()
        if not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


@pytest.mark.parametrize("bad_output", ["fact_indices", "foreign_url"])
async def test_approved_but_invalid_private_draft_is_not_pg_accepted(bridge, tmp_path, bad_output):
    calls = []
    opened = await grant(bridge)
    token = opened["worker_token"]
    ticket = await service.enqueue(token, str(uuid4()))
    changes = (
        {"fact_indices": [999]}
        if bad_output == "fact_indices"
        else {"draft_text": "See https://foreign.example.invalid/offer"}
    )
    result = await worker.run_local(token, ticket, tmp_path, agent_factory=fake_agent(calls, **changes))
    assert calls == ["Draft", "Review"]
    assert result["state"] != "accepted", result
    assert result["known_model_usage"] == {"input_tokens": 14, "output_tokens": 6}
    assert result["usage_status"] == "known"


async def test_authorizing_session_expiry_during_slot_wait_does_not_issue_worker(bridge, monkeypatch):
    from pinet_core.creation import service as creation_service

    c = bridge
    holder = AsyncSession(c["admin"])
    await holder.begin()
    site_id = await holder.scalar(
        text("SELECT site_id FROM businesses WHERE id=:b"), {"b": c["saved"]["business_id"]}
    )
    await holder.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "xbot-slot:" + c["environment"] + ":" + site_id},
    )
    task = asyncio.create_task(grant(c))
    try:
        for _ in range(400):
            async with AsyncSession(c["admin"]) as tx:
                waiting = await tx.scalar(
                    text("""SELECT count(*) FROM pg_stat_activity
                    WHERE datname=current_database() AND wait_event_type='Lock'
                    AND query LIKE 'SELECT pg_advisory_xact_lock(hashtextextended%'""")
                )
            if waiting:
                break
            await asyncio.sleep(0.03)
        else:
            raise AssertionError("Actual site slot lock wait was not observed")
        async with AsyncSession(c["admin"]) as tx:
            session = await tx.get(Session, c["request"]["authorizing_session_id"])
            late = session.expires_at + timedelta(seconds=1)
        monkeypatch.setattr(creation_service, "utcnow", lambda: late)
        await holder.commit()
        with pytest.raises(ControlError) as error:
            await asyncio.wait_for(task, 20)
        assert error.value.code == "unauthenticated"
        async with AsyncSession(c["admin"]) as tx:
            for table in ("workers", "admissions", "slots"):
                assert (
                    await tx.scalar(
                        text(f"SELECT count(*) FROM control_xbot_{table} WHERE environment_id=:e"),
                        {"e": c["environment"]},
                    )
                    == 0
                )
    finally:
        await holder.close()
        if not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


@pytest.mark.parametrize("operation", ["begin_call", "complete"])
async def test_database_clock_fences_expired_lease_even_with_stale_application_clock(
    bridge, monkeypatch, operation
):
    c = bridge
    opened = await grant(c)
    token = opened["worker_token"]
    ticket_id = await service.enqueue(token, str(uuid4()))

    # Seed a reserved receipt at the allowed queued->reserved transition. Never
    # rewrite an immutable reserved lease or disable the maintained PG trigger.
    now, job_id = utcnow(), str(uuid4())
    usage = {"input_tokens": 14, "output_tokens": 6} if operation == "complete" else {}
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(
            text("""UPDATE control_xbot_tickets SET state='reserved',epoch=epoch+1,
            lease_until=:expiry,job_id=:job,usage=CAST(:usage AS jsonb),usage_status=:status,
            started_calls=:calls,finished_calls=:calls WHERE id=:id"""),
            {
                "id": ticket_id,
                "expiry": now - timedelta(seconds=1),
                "job": job_id,
                "usage": __import__("json").dumps(usage),
                "status": "known" if usage else "unknown",
                "calls": 2 if usage else 0,
            },
        )
    monkeypatch.setattr(service, "utcnow", lambda: now - timedelta(seconds=10))
    async with service.worker_scope(token) as (tx, _, _):
        ticket = await service.one(tx, "tickets", ticket_id)

    if operation == "begin_call":
        with pytest.raises(ControlError) as error:
            await service.begin_call(token, ticket)
        assert error.value.code == "xbot_dispatch_deadline_expired"
        async with service.worker_scope(token) as (tx, _, _):
            saved = await service.one(tx, "tickets", ticket_id)
            assert saved["started_calls"] == 0 and saved["state"] == "reserved"
    else:
        result = await service.complete(
            token,
            ticket,
            job_id=job_id,
            proposal_sha256="e" * 64,
            usage=usage,
            usage_status="known",
            accepted=True,
        )
        assert result["state"] == "quarantined" and result["reason"] == "xbot_acceptance_deadline_expired"
        assert result["known_model_usage"] == {"input_tokens": 14, "output_tokens": 6}


@pytest.mark.parametrize("operation", ["claim", "bind_job", "begin_call"])
async def test_dispatch_ticket_lock_wait_rechecks_worker_deadline(bridge, monkeypatch, operation):
    c = bridge
    opened = await grant(c, seconds=60)
    token = opened["worker_token"]
    ticket_id = await service.enqueue(token, str(uuid4()))
    ticket = None
    if operation != "claim":
        ticket, _ = await service.claim(token, ticket_id)
    if operation == "begin_call":
        await service.bind_job(token, ticket, str(uuid4()))
    holder = AsyncSession(c["admin"])
    await holder.begin()
    await holder.execute(
        text("SELECT id FROM control_xbot_tickets WHERE id=:id FOR UPDATE"), {"id": ticket_id}
    )
    first_gate, original = asyncio.Event(), service.source_guard

    async def observed():
        await original()
        first_gate.set()

    monkeypatch.setattr(service, "source_guard", observed)
    action = (
        service.claim(token, ticket_id)
        if operation == "claim"
        else service.bind_job(token, ticket, str(uuid4()))
        if operation == "bind_job"
        else service.begin_call(token, ticket)
    )
    task = asyncio.create_task(action)
    try:
        await asyncio.wait_for(first_gate.wait(), 25)
        for _ in range(100):
            async with AsyncSession(c["admin"]) as tx:
                waiting = await tx.scalar(
                    text("""SELECT count(*) FROM pg_stat_activity
                    WHERE datname=current_database() AND wait_event_type='Lock'
                    AND query LIKE 'SELECT * FROM control_xbot_tickets%'""")
                )
            if waiting:
                break
            await asyncio.sleep(0.03)
        else:
            raise AssertionError("Actual dispatch ticket lock wait was not observed")
        late = utcnow() + timedelta(seconds=65)
        if ticket:
            assert late < ticket["lease_until"]
        monkeypatch.setattr(service, "utcnow", lambda: late)
        await holder.commit()
        with pytest.raises(ControlError) as error:
            await asyncio.wait_for(task, 20)
        assert error.value.code in {"xbot_worker_revoked", "xbot_binding_expired_or_changed"}
        async with service.worker_scope(token) as (tx, _, _):
            saved = await service.one(tx, "tickets", ticket_id)
            assert saved["started_calls"] == 0
            assert saved["state"] == ("queued" if operation == "claim" else "reserved")
    finally:
        await holder.close()
        if not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


@pytest.mark.parametrize("bridge", ["long-pages"], indirect=True)
async def test_ordinary_complete_long_source_can_issue_local_worker(bridge):
    opened = await grant(bridge)
    assert opened["worker_id"] and not opened["live_module_admitted"]


@pytest.mark.parametrize("bridge", ["long-pages"], indirect=True)
@pytest.mark.parametrize("partial,approved", [(False, True), (True, True), (False, False)])
async def test_long_source_full_group_pg_acceptance_and_replay(bridge, tmp_path, partial, approved):
    load()
    from xbot.source_facts import validate_manifest
    from xbot.store import fingerprint

    c, calls, seen = bridge, [], []
    before = await history(c)
    opened = await grant(c)
    token = opened["worker_token"]
    ticket_id = await service.enqueue(token, str(uuid4()))
    async with service.worker_scope(token) as (tx, w, admitted):
        binding = await service.current(tx, admitted, worker=w)
        public = admitted["material"]["public_profile"]
        manifest, texts = validate_manifest(public["facts"], public["source_fact_manifest"])
        assert texts == [p["text"] for p in c["synthetic_long_pages"]]
        assert len(public["facts"]) == 6 and [len(g.fact_indices) for g in manifest.groups] == [3, 1, 2]
        assert binding.facts_sha256 == fingerprint(public["facts"])
    result = await worker.run_local(
        token,
        ticket_id,
        tmp_path,
        agent_factory=fake_agent(
            calls, fact_indices=[0] if partial else [0, 1, 2], evidence_sink=seen, approved=approved
        ),
    )
    assert result["state"] == ("accepted" if not partial and approved else "rejected"), result
    assert calls == ["Draft", "Review"] and len(seen) == 2
    assert result["known_model_usage"] == {"input_tokens": 14, "output_tokens": 6}
    for _, evidence in seen:
        group = evidence["source_groups"][0]
        assert "".join(evidence["facts"][i] for i in group["fact_indices"]) == texts[0]
    assert seen[0][1]["source_fact_manifest"] == seen[1][1]["source_fact_manifest"]
    assert await history(c) == before
    replay = await worker.run_local(token, ticket_id, tmp_path, agent_factory=fake_agent(calls))
    assert replay == result and len(calls) == 2
