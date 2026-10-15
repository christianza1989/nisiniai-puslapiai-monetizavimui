"""Actual PG exact saved task in local conversations, fake provider, no channels."""
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agents import draft
from test_customer_text import (  # noqa: F401 - canonical actual fixture chain
    creation,
    customers,
    profile,
    registration,
    stored,
    text_customer,
)

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.customer_agents import lab
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.wire import Create, Revise
from pinet_core.customer_text import adapter
from pinet_core.customer_text import service as chat
from pinet_core.customer_text.wire import Turn
from pinet_core.models import Contact, Event, Job, Outbox


@pytest.fixture
async def configured(text_customer, monkeypatch):  # noqa: F811 - fixture dependency
    c = text_customer
    monkeypatch.setattr(settings(), "customer_agents_enabled", True)
    monkeypatch.setattr(agents, "source_current", lambda: True)
    spec = {**draft(), "name": "Synthetic course consultant", "goal": "Discuss the customer's synthetic learning need"}
    saved = await agents.create(c["token"], c["request"]["creation_id"],
        Create(request_id=uuid4(), purpose="site_chat", configuration=spec))
    frozen = await lab.snapshot(c["token"], c["request"]["creation_id"], saved["agent"]["agent_id"], 1)
    return {**c, "spec": spec, "agent": saved, "frozen": frozen}


def fake(monkeypatch, captures):
    async def runner(context, event_id, revision, authorized):
        assert await authorized()
        captures.append(deepcopy(context))
        return adapter.schema(event_id, revision).model_validate({"reply": "Useful synthetic consultation", "calls": [
            {"name": "need.patch", "arguments": {"base_revision": revision, "evidence_event_id": event_id,
             "fields": [{"field": "goal", "value": context["client_message"]}]}}]}), {
            "input_tokens": 9, "output_tokens": 5}
    monkeypatch.setattr(adapter, "run", runner)


async def test_exact_saved_task_drives_local_episode_and_replay_has_no_extra_attempt(configured, monkeypatch):
    c, captured = configured, []
    fake(monkeypatch, captured)
    key = uuid4()
    messages = ["I need a synthetic training course", "Can you explain the next step?"]
    first = await lab.episode(c["token"], c["frozen"], messages, key)
    assert first["script_complete"] and len(captured) == 2
    assert first["conversation"]["need_revision"] == 2
    assert all("session_id" not in ctx["agent_task"] and "user_id" not in ctx["agent_task"] for ctx in captured)
    assert first["calibration_status"] == "UNVERIFIED" and first["activation"] == "not_performed"
    assert all(ctx["agent_task"]["specification"] == c["spec"] for ctx in captured)
    assert all(ctx["agent_task"]["config_sha256"] == c["agent"]["configuration"]["sha256"] for ctx in captured)
    before, events = await stored(c, first["conversation"]["conversation_id"])
    snapshot = (before.payload, [(e.id, e.payload) for e in events])
    replay = await lab.episode(c["token"], c["frozen"], messages, key)
    after, retained = await stored(c, first["conversation"]["conversation_id"])
    assert replay["conversation"]["conversation_id"] == before.id and len(captured) == 2
    assert snapshot == (after.payload, [(e.id, e.payload) for e in retained])
    with pytest.raises(ControlError, match="idempotency_conflict"):
        await lab.episode(c["token"], c["frozen"], ["Different script"], key)
    async with AsyncSession(c["admin"]) as tx:
        for model in (Contact, Job, Outbox):
            assert not list(await tx.scalars(select(model).where(model.environment_id == c["environment"])))


@pytest.mark.parametrize("field", ["agent_id", "config_revision", "config_sha256", "specification", "admission_fingerprint", "session_id"])
async def test_changed_or_foreign_frozen_task_cannot_reserve_a_provider(configured, monkeypatch, field):
    c, captured = configured, []
    fake(monkeypatch, captured)
    value = deepcopy(c["frozen"])
    if field in {"agent_id", "session_id"}:
        value[field] = str(uuid4())
    elif field == "config_revision":
        value[field] += 1
    elif field == "specification":
        value[field]["goal"] += " Changed task"
    else:
        value[field] = "0" * 64
    with pytest.raises(ControlError):
        await lab.episode(c["token"], value, ["Synthetic client"], uuid4())
    assert not captured


async def test_config_edit_during_provider_wait_keeps_usage_but_rejects_result(configured, monkeypatch):
    c, calls = configured, []
    async def runner(context, event_id, revision, authorized):
        calls.append(context)
        # This write completes: no PG transaction/row lock spans provider await.
        await agents.revise(c["token"], c["request"]["creation_id"], c["agent"]["agent"]["agent_id"],
            Revise(request_id=uuid4(), expected_revision=1, configuration={**c["spec"], "goal": "A different synthetic consultation purpose"}))
        assert not await authorized()
        return adapter.schema(event_id, revision).model_validate({"reply": "Stale reply", "calls": []}), {
            "input_tokens": 9, "output_tokens": 5}
    monkeypatch.setattr(adapter, "run", runner)
    with pytest.raises(ControlError, match="text_authorization_changed"):
        await lab.episode(c["token"], c["frozen"], ["Synthetic client", "Another message"], uuid4())
    assert len(calls) == 1
    async with AsyncSession(c["admin"]) as tx:
        events = list(await tx.scalars(select(Event).where(Event.environment_id == c["environment"])))
        assert any(e.kind == "provider_usage" and e.payload["usage"]["tokens"]["input_tokens"] == 9 for e in events)
        assert not any(e.kind == "customer_text_result" and e.payload.get("reply") == "Stale reply" for e in events)
    with pytest.raises(ControlError, match="conversation_task_not_current"):
        await lab.episode(c["token"], c["frozen"], ["Another message"], uuid4())


async def test_public_consumer_cannot_execute_lab_conversation_without_internal_task(configured, monkeypatch):
    c, captured = configured, []
    fake(monkeypatch, captured)
    episode = await lab.episode(c["token"], c["frozen"], ["Synthetic client"], uuid4())
    with pytest.raises(ControlError):
        await chat.turn(c["token"], c["request"]["creation_id"], episode["conversation"]["conversation_id"],
            Turn(request_id=uuid4(), base_need_revision=0, message="Ordinary public turn"))
    assert len(captured) == 1
    retained = await chat.status(c["token"], c["request"]["creation_id"], episode["conversation"]["conversation_id"])
    assert retained["conversation_id"] == episode["conversation"]["conversation_id"]


async def test_other_task_purpose_is_not_a_conversation_runtime(configured):
    c = configured
    saved = await agents.create(c["token"], c["request"]["creation_id"],
        Create(request_id=uuid4(), purpose="email", configuration=c["spec"]))
    with pytest.raises(ControlError, match="conversation_task_not_current"):
        await lab.snapshot(c["token"], c["request"]["creation_id"], saved["agent"]["agent_id"], 1)
