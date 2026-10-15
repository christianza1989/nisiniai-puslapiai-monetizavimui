"""Restricted PG + inert providers; Session path preserves canonical receipts.

The test fence is intentionally inert allocation, not production Task admission.
Root's durable allocation integration has its own independently owned tests.
"""
from copy import deepcopy
from pathlib import Path
from uuid import uuid4, uuid5

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agent_lab import (  # noqa: F401 - maintained actual fixture chain
    configured,
    creation,
    customers,
    fake,
    profile,
    registration,
    stored,
    text_customer,
)
from test_customer_agent_protection import manifest
from test_customer_competence import provider as scored_provider
from test_customer_review import provider, rows
from test_customer_typed_checks import typed_manifest

from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import ControlError, scope
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_agents import lab, provisioning, review
from pinet_core.customer_agents.session import SessionPrincipal, TaskFence
from pinet_core.customer_text import service as chat
from pinet_core.customer_text.wire import Start, Turn
from pinet_core.db import db
from pinet_core.models import Event, utcnow


class InertFence(TaskFence):
    def __init__(self, user_id, environment, available=8):
        self.user_id, self.environment, self.available = user_id, environment, available
        self.active, self.calls, self.denied = True, [], []
        self.pins = None

    async def check(self, tx):
        actor = (await tx.execute(text("SELECT current_setting('pinet.control_user',true), "
            "current_setting('pinet.environment',true)"))).one()
        assert tuple(actor) == (self.user_id, self.environment)
        if not self.active:
            raise ControlError(409, "task_not_current")

    async def reserve(self, tx, call):
        await self.check(tx)
        if self.pins is not None:
            pin = self.pins.get(str(call.request_id))
            if not pin or any(getattr(call, k) != v for k, v in pin.items()):
                self.denied.append(call)
                raise ControlError(409, "task_call_identity_changed")
        if self.available == 0:
            raise ControlError(429, "task_rate_limited")
        # The genuine native reservation is inserted AFTER this in the SAME tx.
        exists = await tx.scalar(select(Event.id).where(Event.conversation_id == str(call.conversation_id),
            Event.event_key == call.call_key))
        assert exists is None
        self.available -= 1
        self.calls.append(call)


@pytest.fixture
async def principal(configured):  # noqa: F811 - imported fixture
    c = configured
    frozen = c["frozen"]
    async with scope(user=frozen["user_id"]) as tx:
        session = await tx.get(Session, frozen["session_id"])
        registry = await tx.get(Registration, frozen["registration_id"])
        pin = await provisioning.capture(tx, session, frozen["creation_id"],
            business_id=registry.business_id, grant_id=registry.grant_id,
            source_revision=settings().control_source_revision)
    fence = InertFence(frozen["user_id"], c["environment"])
    return c, SessionPrincipal(pin, fence)


async def test_snapshot_and_episode_replay_share_exact_bearer_receipts_without_token_lookup(principal, monkeypatch):
    c, p = principal

    async def forbidden(*_, **__):
        pytest.fail("Session-only execution cannot call bearer Session lookup")

    monkeypatch.setattr(chat, "customer_session", forbidden)
    frozen = await lab.snapshot_session(p, c["agent"]["agent"]["agent_id"], 1)
    assert frozen == c["frozen"] and not p.fence.calls
    captures = []
    fake(monkeypatch, captures)
    key, messages = uuid4(), ["Synthetic request", "Synthetic correction"]
    first = await lab.episode_session(p, frozen, messages, key)
    assert first["script_complete"] and len(p.fence.calls) == len(captures) == 2
    before, events = await stored(c, first["conversation"]["conversation_id"])
    saved = deepcopy((before.payload, [(e.id, e.payload) for e in events]))
    again = await lab.episode_session(p, frozen, messages, key)
    after, retained = await stored(c, first["conversation"]["conversation_id"])
    assert first["conversation"]["conversation_id"] == again["conversation"]["conversation_id"]
    assert saved == (after.payload, [(e.id, e.payload) for e in retained])
    assert len(p.fence.calls) == len(captures) == 2
    assert all(call.kind == "customer_text" for call in p.fence.calls)
    assert c["token"] not in str(first) and c["token"] not in str(p.fence.calls)


async def test_session_episode_can_be_reconciled_through_existing_bearer_entry(principal, monkeypatch):
    c, p = principal
    captures = []
    fake(monkeypatch, captures)
    key, messages = uuid4(), ["Same synthetic native request"]
    first = await lab.episode_session(p, c["frozen"], messages, key)
    second = await lab.episode(c["token"], c["frozen"], messages, key)
    assert first["conversation"]["conversation_id"] == second["conversation"]["conversation_id"]
    assert len(captures) == len(p.fence.calls) == 1


async def test_zero_task_allocation_reserves_no_native_provider_event(principal, monkeypatch):
    c, p = principal
    captures = []
    fake(monkeypatch, captures)
    p.fence.available = 0
    with pytest.raises(ControlError, match="task_rate_limited"):
        await lab.episode_session(p, c["frozen"], ["No allocated call"], uuid4())
    assert captures == [] and p.fence.calls == []
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Event.id).where(Event.kind == "provider_attempt")))


@pytest.mark.parametrize("changed", ["script", "message"])
async def test_first_dispatch_changed_script_or_message_same_ids_consumes_no_permit(principal, monkeypatch, changed):
    c, p = principal
    captures, operation = [], uuid4()
    fake(monkeypatch, captures)
    messages = ["Synthetic pinned original"]
    step = uuid5(operation, "step:0")
    p.fence.pins = {str(step): {"script_sha256": chat.digest(messages),
        "request_input_sha256": chat.digest(messages[0])}}
    with pytest.raises(ControlError, match="task_call_identity_changed"):
        if changed == "script":
            await lab.episode_session(p, c["frozen"], messages + ["Unplanned second input"], operation)
        else:
            frozen = lab.Episode(**lab.Snapshot.model_validate(c["frozen"]).model_dump(),
                episode_id=operation, script_sha256=chat.digest(messages)).model_dump(mode="json")
            created = await p.start(frozen["creation_id"], Start(request_id=operation,
                admission_id=frozen["admission_id"], notice_version="customer-text.local.v1", consent=True),
                calibration=frozen)
            await p.turn(frozen["creation_id"], created["conversation_id"],
                Turn(request_id=step, base_need_revision=0, message="  Changed first input  "), calibration=frozen)
    assert not captures and not p.fence.calls and len(p.fence.denied) == 1
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Event.id).where(Event.kind == "provider_attempt")))


@pytest.mark.parametrize("change", ["session", "source", "registry"])
async def test_foreign_or_stale_session_scope_cannot_enter_provider(principal, monkeypatch, change):
    c, p = principal
    captures = []
    fake(monkeypatch, captures)
    field = {"session": "session_id", "source": "source_revision", "registry": "registration_id"}[change]
    value = "0" * 40 if change == "source" else uuid4()
    invalid = SessionPrincipal(p.scope.model_copy(update={field: value}), p.fence)
    with pytest.raises(ControlError):
        await lab.snapshot_session(invalid, c["agent"]["agent"]["agent_id"], 1)
    assert not captures and not p.fence.calls


async def test_cancelled_parent_after_inert_call_keeps_usage_but_refuses_output(principal, monkeypatch):
    c, p = principal

    async def runner(context, event_id, revision, authorized):
        assert await authorized()
        p.fence.active = False
        return chat.adapter.schema(event_id, revision).model_validate({
            "reply": "Synthetic result must not be accepted", "calls": []}), {"input_tokens": 17}

    monkeypatch.setattr(chat.adapter, "run", runner)
    with pytest.raises(ControlError, match="text_authorization_changed"):
        await lab.episode_session(p, c["frozen"], ["Synthetic request"], uuid4())
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        events = list(await tx.scalars(select(Event)))
        usage = next(e for e in events if e.kind == "provider_usage")
        assert usage.payload["usage"]["tokens"]["input_tokens"] == 17
        assert not any(e.kind == "customer_text_result" and e.payload.get("status") == "succeeded" for e in events)


async def test_logout_during_inert_call_preserves_accounting_without_session_renewal(principal, monkeypatch):
    c, p = principal

    async def runner(context, event_id, revision, authorized):
        assert await authorized()
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Session).where(Session.id == str(p.scope.session_id)).values(revoked_at=utcnow()))
        return chat.adapter.schema(event_id, revision).model_validate({
            "reply": "Synthetic late result", "calls": []}), {"output_tokens": 9}

    monkeypatch.setattr(chat.adapter, "run", runner)
    with pytest.raises(ControlError, match="text_authorization_changed"):
        await lab.episode_session(p, c["frozen"], ["Synthetic request"], uuid4())
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        usage = await tx.scalar(select(Event).where(Event.kind == "provider_usage"))
        assert usage.payload["usage"]["tokens"]["output_tokens"] == 9


@pytest.mark.parametrize("cause,expected", [("communication", 1), ("knowledge", 2)])
async def test_same_quality_lifecycle_consumes_exact_permits_and_replays_without_extra_call(principal, monkeypatch, cause, expected):
    c, p = principal
    fake(monkeypatch, [])
    episode = await lab.episode_session(p, c["frozen"], ["Synthetic request"], uuid4())
    calls = []
    provider(monkeypatch, c, calls, cause=cause)
    request = review.SessionReviewRequest(conversation_id=episode["conversation"]["conversation_id"],
        request_id=uuid4(), episode=episode["snapshot"])
    first = await review.run_session(p, request)
    assert first["status"] == "succeeded" and len(calls) == expected
    assert [call.kind for call in p.fence.calls] == ["customer_text"] + ["customer_quality"] * expected
    assert p.fence.calls[-1].call_key.startswith("quality-attempt:")
    events, artifacts, job = await rows(c, str(request.conversation_id))
    assert job.payload["request_input_sha256"] == review.request_intent_sha256(request)
    assert p.fence.calls[-1].request_input_sha256 == job.payload["request_input_sha256"]
    saved = deepcopy(([(e.id, e.payload) for e in events], [a.payload for a in artifacts], job.payload))
    assert await review.run_session(p, request) == first
    after, retained, current = await rows(c, str(request.conversation_id))
    assert saved == ([(e.id, e.payload) for e in after], [a.payload for a in retained], current.payload)
    assert len(calls) == expected and len(p.fence.calls) == expected + 1
    assert first["module_admission"] == "not_admitted" and first["activation"] == "not_performed"


async def test_protected_holdout_reuses_current_quality_without_tuning(principal, tmp_path, monkeypatch):
    c, p = principal
    captures, calls = [], []
    fake(monkeypatch, captures)
    reference, messages = manifest(c, tmp_path, monkeypatch, case_id="case3")
    episode = await lab.episode_session(p, c["frozen"], messages, uuid4(), protected_case=reference)
    provider(monkeypatch, c, calls)
    request = review.SessionReviewRequest(conversation_id=episode["conversation"]["conversation_id"],
        request_id=uuid4(), episode=episode["snapshot"])
    assert (await review.run_session(p, request))["status"] == "succeeded"
    _, artifacts, _ = await rows(c, str(request.conversation_id))
    assert [a.kind for a in artifacts] == ["quality"]  # no train issue/candidate/promotion
    assert all(call.protected_case_sha256 for call in p.fence.calls)


async def test_quality_task_loss_after_provider_keeps_usage_and_refuses_acceptance(principal, monkeypatch):
    c, p = principal
    fake(monkeypatch, [])
    episode = await lab.episode_session(p, c["frozen"], ["Synthetic request"], uuid4())
    calls = []
    provider(monkeypatch, c, calls)
    original = review.evaluator.run

    async def lose_authority(*args):
        result, usage = await original(*args)
        p.fence.active = False
        return result, usage

    monkeypatch.setattr(review.evaluator, "run", lose_authority)
    request = review.SessionReviewRequest(conversation_id=episode["conversation"]["conversation_id"],
        request_id=uuid4(), episode=episode["snapshot"])
    result = await review.run_session(p, request)
    events, artifacts, job = await rows(c, str(request.conversation_id))
    assert result["status"] == job.state == "failed" and not artifacts
    usage = next(e for e in events if e.kind == "quality_provider_usage")
    assert usage.payload["usage"]["tokens"]["input_tokens"] == 12 and len(calls) == 1


async def test_session_typed_quality_reuses_precommitted_receipts_without_admission(principal, tmp_path, monkeypatch):
    c, p = principal
    fake(monkeypatch, [])
    reference, messages, _ = typed_manifest(c, tmp_path, monkeypatch)
    episode = await lab.episode_session(p, c["frozen"], messages, uuid4(), protected_case=reference)
    calls = []
    scored_provider(monkeypatch, c, calls)
    request = review.SessionTypedRequest(conversation_id=episode["conversation"]["conversation_id"],
        request_id=uuid4(), episode=episode["snapshot"], typed_expectations=reference)
    result = await review.run_session(p, request)
    assert result["status"] == "succeeded" and result["typed_report"]["state"] == "PASS"
    _, artifacts, _ = await rows(c, str(request.conversation_id))
    assert [a.kind for a in artifacts] == ["quality"]
    assert artifacts[0].payload["competence"]["module_admission"] == "not_admitted"
    assert len(p.fence.calls) == 3 and len(calls) == 1
    assert await review.run_session(p, request) == result and len(p.fence.calls) == 3


async def test_first_quality_dispatch_changed_typed_reference_same_ids_consumes_no_permit(principal, tmp_path, monkeypatch):
    c, p = principal
    fake(monkeypatch, [])
    reference, messages, _ = typed_manifest(c, tmp_path, monkeypatch)
    episode = await lab.episode_session(p, c["frozen"], messages, uuid4(), protected_case=reference)
    request = review.SessionTypedRequest(conversation_id=episode["conversation"]["conversation_id"],
        request_id=uuid4(), episode=episode["snapshot"], typed_expectations=reference)
    p.fence.pins = {str(request.request_id): {"script_sha256": request.episode.script_sha256,
        "request_input_sha256": review.request_intent_sha256(request)}}
    before = len(p.fence.calls)
    alias = tmp_path / "same-manifest-other-path.private.json"
    alias.write_bytes(Path(reference["manifest_path"]).read_bytes())
    changed = review.SessionTypedRequest(**{**request.model_dump(),
        "typed_expectations": {**reference, "manifest_path": str(alias)}})
    assert review.request_intent_sha256(request) != review.request_intent_sha256(changed)
    calls = []
    scored_provider(monkeypatch, c, calls)
    result = await review.run_session(p, changed)
    assert result["status"] == "failed" and not calls and len(p.fence.calls) == before
    assert len(p.fence.denied) == 1
    events, artifacts, _ = await rows(c, str(request.conversation_id))
    assert not artifacts and not any(e.kind == "quality_provider_attempt" for e in events)
