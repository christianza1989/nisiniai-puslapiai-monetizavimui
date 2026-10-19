"""Inert ownership timing; no provider, database, authority extension or retry."""
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from pinet_core.acquisition import model_handler
from pinet_core.acquisition.contracts import Assessment
from pinet_core.tasks import service, worker
from pinet_core.tasks.codex import RunnerError

START = datetime(2026, 10, 19, 5, 0, tzinfo=UTC)
MODEL_KINDS = ("acquisition.model_prepare", "acquisition.model_reply", "acquisition.agent_role")
GAP = timedelta(seconds=30.267708)
USAGE = {"input_tokens": 17, "output_tokens": 3}


class Transaction:
    def __init__(self, now, deadline=START + timedelta(minutes=2)):
        self.now = now
        self.info = {"acquisition_model_deadlines": {"inert-task": deadline}}

    async def scalar(self, query):
        assert str(query) == "SELECT clock_timestamp()"
        return self.now


def task(**changes):
    return SimpleNamespace(id="inert-task", kind="acquisition.agent_role", status="running",
                           run_id="inert-run", lease_until=START + timedelta(seconds=60), **changes)


@pytest.fixture
def clock(monkeypatch):
    value = SimpleNamespace(now=START, guards=[])
    monkeypatch.setattr(service, "utcnow", lambda: value.now)
    monkeypatch.setattr(model_handler.model_observation, "task_guard",
                        lambda tx, task, phase, reason, **kw: value.guards.append((phase, reason)))
    return value


@pytest.mark.parametrize("kind", MODEL_KINDS)
def test_only_source_selected_model_kinds_receive_sixty_seconds(clock, kind):
    assert service.lease_deadline(kind) == START + timedelta(seconds=60)
    assert service.lease_deadline() == START + timedelta(seconds=15)


@pytest.mark.parametrize("kind", [None, "chat.consult", "mail.display_translate",
                                  "acquisition.reviewed_capture", "workspace.team_turn",
                                  "acquisition.model_prepare.untrusted", "ACQUISITION.AGENT_ROLE"])
def test_generic_and_lookalike_kinds_keep_fifteen_seconds(clock, kind):
    assert service.lease_deadline(kind) == START + timedelta(seconds=15)


@pytest.mark.parametrize("kind", MODEL_KINDS + ("chat.consult",))
@pytest.mark.parametrize("remaining", [-1, 0, 8, 120])
def test_lease_calculation_cannot_extend_admitted_authority(clock, kind, remaining):
    until = START + timedelta(seconds=remaining)
    nominal = 60 if kind in MODEL_KINDS else 15
    assert service.lease_deadline(kind, until=until) == min(START + timedelta(seconds=nominal), until)


async def test_fifteen_second_control_cannot_survive_observed_proof_gap(clock):
    value = task()
    value.lease_until = START + timedelta(seconds=15)
    clock.now += GAP
    with pytest.raises(RunnerError, match="authorization_revoked"):
        await model_handler.renew_role_lease(Transaction(clock.now), value, value.run_id,
                                            phase="role_settle_before")
    assert value.lease_until == START + timedelta(seconds=15)
    assert clock.guards == [("role_settle_before", "lease_expired")]


@pytest.mark.parametrize("kind", MODEL_KINDS)
async def test_selected_lease_survives_observed_gap_without_reviving_any_lease(clock, kind):
    value = task()
    value.kind, value.lease_until = kind, service.lease_deadline(kind)
    clock.now += GAP
    now = await model_handler.renew_role_lease(Transaction(clock.now), value, value.run_id,
                                             phase="role_settle_before")
    assert now == clock.now
    assert value.lease_until == clock.now + timedelta(seconds=60)
    assert not clock.guards


async def test_role_renewal_still_clamps_to_current_deadline(clock):
    value = task()
    until = START + timedelta(seconds=8)
    await model_handler.renew_role_lease(Transaction(START, until), value, value.run_id,
                                        phase="role_settle_before")
    assert value.lease_until == until


@pytest.mark.parametrize("barrier,reason", [
    ("expired", "lease_expired"), ("equal", "lease_expired"),
    ("missing", "lease_missing"), ("changed-run", "run_changed"),
    ("stopped-task", "task_not_running"), ("deadline-expired", "authority_deadline_expired"),
    ("deadline-equal", "authority_deadline_expired"), ("deadline-missing", "authority_deadline_missing"),
])
async def test_role_renewal_rejects_stale_ownership_or_authority(clock, barrier, reason):
    value, tx = task(), Transaction(START)
    if barrier in {"expired", "equal", "missing"}:
        value.lease_until = {"expired": START - timedelta(microseconds=1), "equal": START, "missing": None}[barrier]
    elif barrier == "changed-run":
        value.run_id = "different-run"
    elif barrier == "stopped-task":
        value.status = "failed"
    else:
        tx.info["acquisition_model_deadlines"][value.id] = {
            "deadline-expired": START - timedelta(microseconds=1), "deadline-equal": START,
            "deadline-missing": None}[barrier]
    original = value.lease_until
    with pytest.raises(RunnerError, match="authorization_revoked"):
        await model_handler.renew_role_lease(tx, value, "inert-run", phase="role_settle_before")
    assert value.lease_until == original
    assert clock.guards == [("role_settle_before", reason)]


@pytest.mark.parametrize("barrier", ["expired-lease", "expired-authority"])
async def test_failed_settlement_keeps_known_usage_without_accepting_output(clock, barrier):
    value, tx, settled = task(), Transaction(START), []
    if barrier == "expired-lease":
        value.lease_until = START
    else:
        tx.info["acquisition_model_deadlines"][value.id] = START

    async def inert_model(*args):
        return Assessment(fit="unknown", intent="unknown", reasons="Inert ownership test",
                          evidence_ids=[], offer_fact_ids=[], next_action="research", subject="", body=""), dict(USAGE)

    context = {"specification": {}, "_task_id": value.id, "deadline": (START + timedelta(minutes=2)).isoformat()}
    role = model_handler.TaskRole(context, "researcher", None, inert_model)

    async def reserve(*args):
        return {"run_id": value.run_id, "source_revision": "a" * 40}

    async def settle(receipt, state, usage, output=None):
        if state == "succeeded":
            await model_handler.renew_role_lease(tx, value, receipt["run_id"], phase="role_settle_before")
        settled.append((state, usage, output))

    role.reserve, role.settle = reserve, settle
    with pytest.raises(RunnerError, match="authorization_revoked"):
        await role.ask(Assessment, "Inert instruction", {})
    assert settled == [("failed", USAGE, None)]
    assert model_handler.observed_total(context) == USAGE
    assert value.lease_until == (START if barrier == "expired-lease" else START + timedelta(seconds=60))


@pytest.mark.parametrize("kind", MODEL_KINDS)
@pytest.mark.parametrize("remaining", [8, 120])
async def test_worker_heartbeat_uses_same_kind_policy_and_current_deadline(clock, monkeypatch, kind, remaining):
    value, tx = task(), Transaction(START, START + timedelta(seconds=remaining))
    value.kind = kind

    async def scalar(query):
        return START if str(query) == "SELECT clock_timestamp()" else value

    tx.scalar = scalar

    @asynccontextmanager
    async def owned_scope(**kwargs):
        yield tx

    handler = SimpleNamespace(authority_locks=AsyncMock(), authority=AsyncMock(return_value=True),
                              deadline_valid=lambda *args: True)
    monkeypatch.setattr(worker, "scope", owned_scope)
    monkeypatch.setattr(worker, "handler_for", lambda selected: handler)
    assert await worker.heartbeat(value.id, value.run_id, user_id="inert-user", kind=kind)
    assert value.lease_until == min(START + timedelta(seconds=60), START + timedelta(seconds=remaining))


async def test_worker_stopped_authority_cannot_renew_long_live_ownership(clock, monkeypatch):
    value, tx = task(), Transaction(START)

    async def scalar(query):
        return START if str(query) == "SELECT clock_timestamp()" else value

    tx.scalar = scalar

    @asynccontextmanager
    async def owned_scope(**kwargs):
        yield tx

    handler = SimpleNamespace(authority_locks=AsyncMock(), authority=AsyncMock(return_value=False),
                              deadline_valid=lambda *args: True)
    monkeypatch.setattr(worker, "scope", owned_scope)
    monkeypatch.setattr(worker, "handler_for", lambda selected: handler)
    finished, event = AsyncMock(), AsyncMock()
    monkeypatch.setattr(worker, "finish_run", finished)
    monkeypatch.setattr(worker, "append_event", event)
    assert not await worker.heartbeat(value.id, value.run_id, user_id="inert-user", kind=value.kind)
    assert value.status == "failed" and value.failure_code == "authorization_revoked" and value.lease_until is None
    finished.assert_awaited_once_with(tx, value, "failed")
    event.assert_awaited_once_with(tx, value)
