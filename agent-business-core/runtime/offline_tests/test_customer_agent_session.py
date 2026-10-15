"""Inert Session-only authority contract; no real provider or application DB."""
import json
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.customer_agents import lab, provisioning, review
from pinet_core.customer_agents import session as session_adapter
from pinet_core.customer_agents.session import CallIdentity, SessionPrincipal, TaskFence
from pinet_core.customer_text import service as chat
from pinet_core.customer_text.wire import Turn


@pytest.fixture(autouse=True)
def local_scope(monkeypatch):
    monkeypatch.setattr(settings(), "environment", "test-session")
    monkeypatch.setattr(settings(), "control_source_revision", "a" * 40)


def target():
    value = {k: str(uuid4()) for k in ("user_id", "organization_id", "portfolio_id", "session_id",
        "creation_id", "business_id", "grant_id", "registration_id")}
    return provisioning.ProvisioningScope.model_validate_json(json.dumps({
        **value, "environment_id": "test-session", "source_revision": "a" * 40,
        "registration_fingerprint": "b" * 64}))


class Fence(TaskFence):
    def __init__(self, available=10):
        self.available, self.checks, self.calls = available, [], []

    async def check(self, tx):
        self.checks.append(tx)

    async def reserve(self, tx, call):
        if not self.available:
            raise ControlError(429, "task_rate_limited")
        self.available -= 1
        self.calls.append((tx, call))


def binding(scope):
    return {"creation_id": str(scope.creation_id), "task_calibration": {"creation_id": str(scope.creation_id), "agent_id": str(uuid4()),
        "config_revision_id": str(uuid4()), "config_revision": 1, "config_sha256": "c" * 64,
        "admission_id": str(uuid4()), "admission_fingerprint": "d" * 64,
        "episode_id": str(uuid4()), "execution_source_revision": scope.source_revision,
        "specification": {"name": "Synthetic task", "goal": "Discuss a synthetic request"}}}


def call_fields():
    request = uuid4()
    return {"kind": "customer_text", "conversation_id": str(uuid4()), "request_id": str(request),
        "call_key": "attempt:" + str(request), "number": 1, "model": "gpt-6.1-sol",
        "prompt_sha256": "e" * 64, "schema_sha256": "f" * 64, "protected_case_sha256": None}


@pytest.mark.parametrize("value", [None, {}, object()])
async def test_missing_or_untyped_fence_denies_before_authority(value):
    principal = SessionPrincipal(target(), value)
    with pytest.raises(ControlError, match="task_fence_required"):
        await lab.snapshot_session(principal, str(uuid4()), 1)
    with pytest.raises(ControlError, match="task_fence_required"):
        await review.run_session(principal, object())


async def test_boolean_default_is_not_a_successful_compiled_fence():
    class Invalid(Fence):
        async def check(self, tx):
            return False

    with pytest.raises(ControlError, match="task_fence_required"):
        await SessionPrincipal(target(), Invalid()).check(object())


def test_unvalidated_scope_cannot_enter_session_authority():
    value = target().model_copy(update={"source_revision": "forged"})
    with pytest.raises(ControlError, match="invalid_session_scope"):
        SessionPrincipal(value, Fence()).validated()


@pytest.mark.parametrize("late", ["task", "source", "session"])
async def test_final_native_source_wait_cannot_hide_task_expiry_or_source_change(monkeypatch, late):
    active, tx = SimpleNamespace(valid=True, final=False), object()
    session = SimpleNamespace(revoked_at=None, expires_at=datetime.now(UTC) + timedelta(hours=1))

    class DeadlineFence(Fence):
        async def check(self, tx):
            if not active.valid:
                raise ControlError(409, "task_not_current")
            if active.final and late == "session":
                session.expires_at = datetime.now(UTC) - timedelta(seconds=1)

    principal = SessionPrincipal(target(), DeadlineFence())

    @asynccontextmanager
    async def user_scope(**_):
        yield tx

    @asynccontextmanager
    async def native(*_, **__):
        yield tx, session, object(), SimpleNamespace(id="inert", fingerprint="inert"), object()
        active.final = True
        if late == "task":
            active.valid = False
        elif late == "source":
            monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)

    async def authorizing(*_):
        return session

    async def bind(self, *args):
        await self.check(args[0])

    monkeypatch.setattr(session_adapter, "scope", user_scope)
    monkeypatch.setattr(session_adapter.agents, "transaction_authority", native)
    monkeypatch.setattr(provisioning, "authorizing_session", authorizing)
    monkeypatch.setattr(SessionPrincipal, "bind", bind)
    with pytest.raises(ControlError, match="task_not_current|source_unavailable|unauthenticated"):
        async with principal.agent_authority(str(principal.scope.creation_id), str(uuid4()), writing=True):
            pass


async def test_call_identity_is_native_byte_bound_and_delivered_in_same_transaction():
    scope, fence, tx = target(), Fence(), object()
    principal = SessionPrincipal(scope, fence)
    await principal.check(tx)
    await principal.reserve(tx, binding(scope), **call_fields())
    assert fence.checks == [tx] and fence.calls[0][0] is tx
    call = fence.calls[0][1]
    assert isinstance(call, CallIdentity)
    assert call.source_revision == scope.source_revision and call.number == 1
    assert len(call.fingerprint()) == 64 and "bearer" not in call.model_dump_json()


@pytest.mark.parametrize("field,value", [("number", 2), ("call_key", "attempt:foreign"),
    ("bearer", "secret"), ("source_revision", "forged"), ("number", True)])
async def test_invalid_native_identity_never_consumes_root_allocation(field, value):
    scope, fence = target(), Fence()
    principal = SessionPrincipal(scope, fence)
    fields = {**call_fields(), field: value}
    with pytest.raises(ControlError):
        await principal.reserve(object(), binding(scope), **fields)
    assert not fence.calls


def test_internal_quality_request_does_not_accept_a_bearer_or_activation():
    fields = {"conversation_id": uuid4(), "request_id": uuid4(), "episode": {}}
    for extra in ({"bearer": "a" * 64}, {"enabled": True}):
        with pytest.raises(ValidationError):
            review.parse_session_request({**fields, **extra})


@pytest.fixture
def text_case(monkeypatch):
    scope, fence, log = target(), Fence(), []
    principal = SessionPrincipal(scope, fence)
    bound = binding(scope)
    row = SimpleNamespace(id=str(uuid4()), state="created", owner=None, epoch=0, need_revision=0,
        lease_until=None, expires_at=datetime.now(UTC) + timedelta(hours=1), payload={"need": {}})
    replay = SimpleNamespace(enabled=False)

    class Transaction:
        async def scalar(self, _):
            return SimpleNamespace(payload={"fingerprint": chat.digest(value.model_dump(mode="json"))}) if replay.enabled else None

    tx = Transaction()
    value = Turn(request_id=uuid4(), base_need_revision=0, message="Synthetic original request")

    @asynccontextmanager
    async def authority(self, creation_id, *, calibration=None):
        await self.check(tx)
        yield (tx, SimpleNamespace(revoked_at=None, expires_at=row.expires_at),
               SimpleNamespace(id=creation_id), object(), SimpleNamespace(id=str(scope.business_id)), bound)
        await self.check(tx)

    async def locked(*_):
        return row

    async def observe(*_):
        return None

    async def unchanged(*_):
        return None

    async def event(tx, row, key, kind, payload):
        log.append(kind)
        return SimpleNamespace(id=str(uuid4()))

    async def resolve(*_):
        return {"sources": []}

    async def history(*_):
        return [], False

    async def completed(*_):
        return SimpleNamespace(payload={"status": "succeeded"})

    async def view(*_):
        return {"state": "created"}

    monkeypatch.setattr(SessionPrincipal, "text_authority", authority)
    monkeypatch.setattr(chat, "locked", locked)
    monkeypatch.setattr(chat, "final_authority", unchanged)
    monkeypatch.setattr(chat, "history", history)
    monkeypatch.setattr(chat, "view", view)
    monkeypatch.setattr(chat, "result_event", completed)
    monkeypatch.setattr(chat.core, "add_event", event)
    monkeypatch.setattr(chat.knowledge, "resolve", resolve)
    monkeypatch.setattr(chat.adapter, "source_current", lambda: True)
    monkeypatch.setattr(chat.adapter, "runner_ready", lambda: True)
    monkeypatch.setattr(chat.adapter, "material", lambda *_: (object(), "Exact inert prompt", "Exact inert schema"))
    from pinet_core.customer_agents import protection
    monkeypatch.setattr(protection, "turn", unchanged)
    monkeypatch.setattr(protection, "observe", observe)
    return SimpleNamespace(principal=principal, fence=fence, tx=tx, value=value, row=row, log=log,
        replay=replay, bound=bound, creation=str(scope.creation_id))


async def test_new_text_attempt_consumes_one_permit_before_its_native_event(text_case):
    f = text_case
    result = await chat._prepare(f.principal, f.creation, f.row.id, f.value, calibration={})
    assert isinstance(result, chat.Dispatch)
    assert len(f.fence.calls) == 1 and f.fence.calls[0][0] is f.tx
    assert f.log[-1] == "provider_attempt"
    assert f.fence.calls[0][1].call_key == "attempt:" + str(f.value.request_id)


async def test_budget_zero_never_inserts_a_provider_reservation(text_case):
    f = text_case
    f.fence.available = 0
    with pytest.raises(ControlError, match="task_rate_limited"):
        await chat._prepare(f.principal, f.creation, f.row.id, f.value, calibration={})
    assert "provider_attempt" not in f.log and not f.fence.calls


async def test_completed_native_uuid_replay_never_consumes_another_permit(text_case):
    f = text_case
    f.replay.enabled = True
    result = await chat._prepare(f.principal, f.creation, f.row.id, f.value, calibration={})
    assert result["turn"]["status"] == "succeeded" and not f.fence.calls


@pytest.fixture
def quality_case(text_case, monkeypatch):
    f = text_case
    job_id, owner = str(uuid4()), str(uuid4())
    dispatch = review.Dispatch({"id": job_id, "conversation_id": f.row.id, "owner": owner, "generation": 1},
        f.bound, {}, "e" * 64, "f" * 64, {"fixture": "inert"})
    job = SimpleNamespace(id=job_id, state="running", owner=owner, generation=1,
        lease_until=f.row.expires_at, payload={"request_id": str(uuid4()), "dispatch": review.VERSION,
            "fingerprint": dispatch.fingerprint, "model": review.evaluator.MODEL,
            "binding_sha256": review.digest(f.bound), "input_sha256": review.digest({}),
            "evaluator_sha256": dispatch.evaluator_sha256, "model_profile": dispatch.model_profile})

    async def observe(*_):
        return job

    monkeypatch.setattr(review, "observe", observe)
    return f, job, dispatch


async def test_quality_reserves_actual_material_once_before_event_and_never_on_poll(quality_case):
    f, job, dispatch = quality_case
    assert await review._authorized(f.principal, dispatch) and not f.fence.calls
    await review._reserve_call(f.principal, dispatch, 1, "Exact inert Quality prompt", "Exact inert schema")
    assert f.log == ["quality_provider_attempt"] and len(f.fence.calls) == 1
    tx, call = f.fence.calls[0]
    assert tx is f.tx and call.kind == "customer_quality" and call.request_id == UUID(job.payload["request_id"])
    assert call.call_key == "quality-attempt:" + job.id + ":1"
    assert call.model == review.evaluator.MODEL
    assert {k: getattr(call, k) for k in ("prompt_sha256", "schema_sha256")} == review.evaluator.hashes(
        "Exact inert Quality prompt", "Exact inert schema")
    assert await review._authorized(f.principal, dispatch) and len(f.fence.calls) == 1


async def test_quality_replay_does_not_consume_another_allocation(quality_case):
    f, _, dispatch = quality_case
    f.replay.enabled = True
    with pytest.raises(ControlError, match="quality_call_already_reserved"):
        await review._reserve_call(f.principal, dispatch, 1, "Same prompt", "Same schema")
    assert not f.fence.calls and not f.log


async def test_quality_zero_allocation_creates_no_provider_event(quality_case):
    f, _, dispatch = quality_case
    f.fence.available = 0
    with pytest.raises(ControlError, match="task_rate_limited"):
        await review._reserve_call(f.principal, dispatch, 1, "Exact prompt", "Exact schema")
    assert not f.fence.calls and not f.log


async def test_known_usage_settles_before_rejecting_lost_task_authority(monkeypatch):
    scope, fence, saved = target(), Fence(), []
    principal = SessionPrincipal(scope, fence)
    dispatch = chat.Dispatch(str(scope.business_id), scope.environment_id, str(uuid4()), str(scope.creation_id),
        str(uuid4()), str(uuid4()), 1, 0, str(uuid4()), {}, binding(scope))

    async def prepare(*_, **__):
        return dispatch

    checks = iter([True, False])

    async def authorized(*_):
        return next(checks)

    async def settle(*args):
        saved.append(args)

    async def provider(*_):
        return object(), {"input_tokens": 7}

    monkeypatch.setattr(chat, "_prepare", prepare)
    monkeypatch.setattr(chat, "_authorized", authorized)
    monkeypatch.setattr(chat.adapter, "run", provider)
    monkeypatch.setattr(chat, "settle", settle)
    with pytest.raises(ControlError, match="text_authorization_changed"):
        await chat._turn(principal, str(scope.creation_id), str(uuid4()), object(), calibration={})
    assert saved == [(dispatch, {"input_tokens": 7}, None)]
