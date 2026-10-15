"""Restricted native PG execution policy; shared flags never choose a model."""
from uuid import uuid4

import pytest
from sqlalchemy import select
from test_customer_agent_lab import (  # noqa: F401 - maintained native fixture chain
    configured,
    creation,
    customers,
    fake,
    profile,
    registration,
    stored,
    text_customer,
)
from test_customer_agent_session import principal  # noqa: F401 - maintained fixture
from test_customer_review import request as quality_request
from test_customer_review import rows

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation import execution_profiles as profiles
from pinet_core.customer_agents import evaluator, lab, review
from pinet_core.customer_text import adapter
from pinet_core.customer_text import service as chat
from pinet_core.customer_text.wire import Start, Turn
from pinet_core.db import db
from pinet_core.models import Conversation, Event


@pytest.fixture(autouse=True)
def default_policy(monkeypatch):
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)


@pytest.mark.parametrize("entry", ["capability", "start"])
async def test_high_default_bearer_has_no_native_reservation(configured, monkeypatch, entry):  # noqa: F811
    c = configured
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        if entry == "capability":
            await chat.capability(c["token"], c["request"]["creation_id"])
        else:
            await chat.start(c["token"], c["request"]["creation_id"], Start(request_id=uuid4(),
                admission_id=c["frozen"]["admission_id"], notice_version="customer-text.local.v1", consent=True))
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Conversation.id)))
        assert not list(await tx.scalars(select(Event.id)))


async def test_default_session_metadata_stays_readable_but_episode_has_zero_permits(principal, monkeypatch):  # noqa: F811
    c, p = principal
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    assert await lab.snapshot_session(p, c["agent"]["agent"]["agent_id"], 1) == c["frozen"]
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        await lab.episode_session(p, c["frozen"], ["Unprofiled new execution"], uuid4())
    assert not p.fence.calls
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Event.id).where(Event.kind == "provider_attempt")))


async def test_high_policy_keeps_luna_history_and_end_without_new_attempt(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    fake(monkeypatch, calls)
    episode = await lab.episode(c["token"], c["frozen"], ["Previous default request"], uuid4())
    cid = episode["conversation"]["conversation_id"]
    before, events = await stored(c, cid)
    attempts = [(e.id, e.payload) for e in events if e.kind == "provider_attempt"]
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        await chat.turn(c["token"], c["request"]["creation_id"], cid,
            Turn(request_id=uuid4(), base_need_revision=before.need_revision, message="Unprofiled new request"),
            calibration=episode["snapshot"])
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    assert (await chat.status(c["token"], c["request"]["creation_id"], cid))["model"] == adapter.MODEL
    assert await chat.sessions(c["token"], c["request"]["creation_id"])
    assert await chat.events(c["token"], c["request"]["creation_id"], cid)
    await chat.end(c["token"], c["request"]["creation_id"], cid)
    after, retained = await stored(c, cid)
    assert after.state == "finalized" and len(calls) == 1
    assert [(e.id, e.payload) for e in retained if e.kind == "provider_attempt"] == attempts


@pytest.mark.parametrize("session_only", [False, True])
async def test_high_policy_refuses_default_medium_before_job_or_attempt(principal, monkeypatch, session_only):  # noqa: F811
    c, p = principal
    request = await quality_request(c, monkeypatch)
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)

    async def forbidden(*_, **__):
        pytest.fail("Unprofiled Medium reached provider")

    monkeypatch.setattr(evaluator, "run", forbidden)
    with pytest.raises(ControlError, match="customer_text_profile_required"):
        if session_only:
            await review.run_session(p, review.SessionReviewRequest(**request.model_dump(exclude={"bearer"})))
        else:
            await review.run(request)
    events, artifacts, job = await rows(c, str(request.conversation_id))
    assert not job and not artifacts and not p.fence.calls
    assert not any(e.kind.startswith("quality_") for e in events)


async def test_inflight_luna_policy_loss_settles_usage_and_refuses_output(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    start = await chat.start(c["token"], c["request"]["creation_id"], Start(request_id=uuid4(),
        admission_id=c["frozen"]["admission_id"], notice_version="customer-text.local.v1", consent=True))
    cid = start["conversation_id"]

    async def run(context, event_id, revision, authorized):
        assert await authorized()
        calls.append(event_id)
        monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
        assert not await authorized()
        return adapter.schema(event_id, revision).model_validate({"reply": "Late output", "calls": []}), {
            "input_tokens": 17}

    monkeypatch.setattr(adapter, "run", run)
    with pytest.raises(ControlError, match="text_authorization_changed"):
        await chat.turn(c["token"], c["request"]["creation_id"], cid,
            Turn(request_id=uuid4(), base_need_revision=0, message="Default request before policy change"))
    _, events = await stored(c, cid)
    usage = next(e for e in events if e.kind == "provider_usage")
    assert usage.payload["model"] == adapter.MODEL and usage.payload["usage"]["tokens"]["input_tokens"] == 17
    assert len(calls) == 1 and not any(e.kind == "customer_text_result" for e in events)


async def test_inflight_medium_policy_loss_settles_usage_and_refuses_artifact(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    request = await quality_request(c, monkeypatch)

    async def run(schema, prompt, wire, authorized):
        assert await authorized()
        calls.append(prompt)
        events = (await stored(c, str(request.conversation_id)))[1]
        evidence = [next(e.id for e in events if e.kind == "client_transcript")]
        monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
        assert not await authorized()
        return schema(outcome="helpful", issues=[], evidence_event_ids=evidence, improvement_hint=""), {
            "input_tokens": 19}

    monkeypatch.setattr(evaluator, "run", run)
    result = await review.run(request)
    assert result["status"] == "failed" and result["failure_code"] == "authorization_revoked"
    events, artifacts, job = await rows(c, str(request.conversation_id))
    usage = next(e for e in events if e.kind == "quality_provider_usage")
    assert usage.payload["usage"]["tokens"]["input_tokens"] == 19
    assert job.state == "failed" and not artifacts and len(calls) == 1
    assert job.payload["model_profile"]["reasoning_effort"] == "medium"
