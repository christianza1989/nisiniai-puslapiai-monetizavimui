"""Real restricted PG, injected Sol only: durable exact-binding Quality execution."""
import asyncio
from copy import deepcopy
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agent_lab import (  # noqa: F401 - canonical fixture chain
    configured,
    creation,
    customers,
    fake,
    profile,
    registration,
    stored,
    text_customer,
)
from test_customer_quality import expire

from pinet_core import jobs
from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import ControlError
from pinet_core.customer_agents import evaluator, lab, review
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.wire import Revise
from pinet_core.customer_text import adapter
from pinet_core.customer_text import service as chat
from pinet_core.db import db
from pinet_core.models import Artifact, Conversation, Event, Job, Outbox, utcnow
from pinet_core.tasks.codex_transport import RunnerError


async def request(c, monkeypatch):
    fake(monkeypatch, [])
    episode = await lab.episode(c["token"], c["frozen"], ["Synthetic course"], uuid4())
    return review.Request(bearer=c["token"], conversation_id=episode["conversation"]["conversation_id"],
        request_id=uuid4(), episode=episode["snapshot"])


def provider(monkeypatch, c, calls, *, cause="communication"):
    async def run(schema, prompt, wire, authorized):
        assert await authorized()
        calls.append((prompt, wire))
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            attempts = list(await tx.scalars(select(Event).where(Event.kind == "quality_provider_attempt")))
            assert len(attempts) == len(calls)  # committed before provider work
            job = await tx.scalar(select(Job).where(Job.payload["dispatch"].astext == review.VERSION))
            event_id = await tx.scalar(select(Event.id).where(Event.conversation_id == job.conversation_id,
                Event.kind == "client_transcript"))
        if len(calls) == 2:
            return schema(root_cause="communication", suggested_scope="clarification",
                evidence_event_ids=[event_id], explanation="Synthetic attributed defect"), {"input_tokens": 8}
        return schema(outcome="needs_review", issues=["Synthetic clarification was omitted"],
            evidence_event_ids=[event_id], root_cause=cause, suggested_scope="clarification",
            improvement_hint="Explain the useful next clarification in this synthetic scenario."), {
            "input_tokens": 12, "output_tokens": 6}
    monkeypatch.setattr(evaluator, "run", run)


async def rows(c, cid):
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        events = list(await tx.scalars(select(Event).where(Event.conversation_id == cid).order_by(Event.sequence)))
        artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == cid)))
        job = await tx.scalar(select(Job).where(Job.conversation_id == cid, Job.kind == "quality"))
        return events, artifacts, job


async def test_actual_existing_quality_lifecycle_and_exact_replay_have_no_extra_model_calls(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    rq = await request(c, monkeypatch)
    before, old = await stored(c, str(rq.conversation_id))
    original = deepcopy((before.payload, [(e.id, e.payload) for e in old]))
    provider(monkeypatch, c, calls)
    monkeypatch.setattr(settings(), "learning_enabled", True)
    result = await review.run(rq)
    assert result["status"] == "succeeded" and len(calls) == 1
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    usage = next(e for e in events if e.kind == "quality_provider_usage")
    assert usage.payload["usage"]["tokens"]["input_tokens"] == 12
    assert usage.payload["usage"]["cost_usd"] is None
    assert any(a.kind == "quality" for a in artifacts)
    candidate = next(a for a in artifacts if a.kind.startswith("candidate:"))
    assert not candidate.payload["activated"]
    assert job.state == "succeeded" and result["calibration_status"] == "UNVERIFIED"
    snapshot = deepcopy([(e.id, e.payload) for e in events])
    assert await review.run(rq) == result and len(calls) == 1
    after, retained = await stored(c, str(rq.conversation_id))
    assert before.payload == after.payload
    assert original[1] == [(e.id, e.payload) for e in retained if not e.kind.startswith("quality_")]
    assert snapshot == [(e.id, e.payload) for e in retained]
    assert not any(key in calls[0][0] for key in ("session_id", "user_id", "admission_id", c["token"]))
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Job).where(Job.kind == "learning")))
        assert not list(await tx.scalars(select(Outbox)))


async def test_existing_optional_attribution_is_accounted_as_a_second_fixed_call(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    rq = await request(c, monkeypatch)
    provider(monkeypatch, c, calls, cause="knowledge")
    result = await review.run(rq)
    assert result["status"] == "succeeded" and len(calls) == 2
    events, artifacts, _ = await rows(c, str(rq.conversation_id))
    assert len([e for e in events if e.kind == "quality_provider_usage"]) == 2
    assert next(a for a in artifacts if a.kind == "quality").payload["root_cause"] == "communication"


@pytest.mark.parametrize("change", ["config", "session", "knowledge", "need", "catalogue", "evaluator"])
async def test_change_during_provider_wait_retains_usage_and_rejects_quality(configured, monkeypatch, change):  # noqa: F811
    c = configured
    rq = await request(c, monkeypatch)
    async def run(schema, prompt, wire, authorized):
        assert await authorized()
        if change == "config":
            await agents.revise(c["token"], c["request"]["creation_id"], c["agent"]["agent"]["agent_id"],
                Revise(request_id=uuid4(), expected_revision=1, configuration={**c["spec"], "goal": "Changed task"}))
        elif change == "session":
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(Session).where(Session.id == c["frozen"]["session_id"]).values(revoked_at=utcnow()))
        elif change == "knowledge":
            await expire(c)
        elif change == "catalogue":
            monkeypatch.setattr(evaluator.model_adapter, "REVIEW_MODEL_CATALOGUE_SHA256", "0" * 64)
        elif change == "evaluator":
            monkeypatch.setattr(review.evaluation_contract, "fingerprint", lambda: "0" * 64)
        else:
            async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
                row = await tx.get(Conversation, str(rq.conversation_id))
                row.payload = {**row.payload, "need": {"goal": {"value": "Changed need"}}}
        assert not await authorized()
        events = (await stored(c, str(rq.conversation_id)))[1]
        evidence = [next(e.id for e in events if e.kind == "client_transcript")]
        return schema(outcome="helpful", issues=[], evidence_event_ids=evidence, improvement_hint=""), {"input_tokens": 19}
    monkeypatch.setattr(evaluator, "run", run)
    result = await review.run(rq)
    assert result["status"] == "failed" and result["failure_code"] == "authorization_revoked"
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert not artifacts and job.state == "failed"
    assert next(e for e in events if e.kind == "quality_provider_usage").payload["usage"]["tokens"]["input_tokens"] == 19


async def test_provider_failure_is_durable_and_replay_never_retries(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    rq = await request(c, monkeypatch)
    async def failed(*_):
        calls.append(1)
        raise RunnerError("run_timeout", {"input_tokens": 7})
    monkeypatch.setattr(evaluator, "run", failed)
    first = await review.run(rq)
    second = await review.run(rq)
    assert first["status"] == second["status"] == "failed" and calls == [1]
    events, artifacts, _ = await rows(c, str(rq.conversation_id))
    assert not artifacts and len([e for e in events if e.kind == "quality_provider_usage"]) == 1


async def test_cancelled_provider_keeps_observed_usage_and_original_attempt(configured, monkeypatch):  # noqa: F811
    c = configured
    rq = await request(c, monkeypatch)
    async def cancelled(*_):
        raise adapter.RequestInterrupted({"output_tokens": 9})
    monkeypatch.setattr(evaluator, "run", cancelled)
    with pytest.raises(asyncio.CancelledError):
        await review.run(rq)
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert not artifacts and job.state == "failed"
    usage = next(e for e in events if e.kind == "quality_provider_usage")
    assert usage.payload["usage"]["tokens"]["output_tokens"] == 9
    assert (await review.run(rq))["status"] == "failed"


async def test_expired_private_job_cannot_be_claimed_by_the_legacy_worker(configured, monkeypatch):  # noqa: F811
    c = configured
    rq = await request(c, monkeypatch)
    dispatch = await review.prepare(rq)
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        (await tx.get(Job, dispatch.task["id"])).lease_until = utcnow() - timedelta(seconds=1)
    assert await jobs.claim_job(c["saved"]["business_id"], "generic-worker", "quality") is None
    result = await review.run(rq)
    assert result["status"] == "failed" and result["failure_code"] == "request_interrupted"
    assert not [e for e in (await rows(c, str(rq.conversation_id)))[0] if e.kind == "quality_provider_attempt"]


async def test_different_request_and_expired_source_reserve_no_provider(configured, monkeypatch):  # noqa: F811
    c = configured
    rq = await request(c, monkeypatch)
    await review.prepare(rq)
    with pytest.raises(ControlError, match="quality_request_conflict"):
        await review.prepare(rq.model_copy(update={"request_id": uuid4()}))
    await expire(c)
    with pytest.raises(ControlError):
        await review.run(rq)
    assert not [e for e in (await rows(c, str(rq.conversation_id)))[0] if e.kind == "quality_provider_attempt"]


async def test_cancel_during_known_usage_settlement_cannot_lose_provider_receipt(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    rq = await request(c, monkeypatch)
    provider(monkeypatch, c, calls)
    entered, release = asyncio.Event(), asyncio.Event()
    original = review.settle
    async def blocked(*args, **kwargs):
        entered.set()
        await release.wait()
        return await original(*args, **kwargs)
    monkeypatch.setattr(review, "settle", blocked)
    task = asyncio.create_task(review.run(rq))
    await asyncio.wait_for(entered.wait(), 30)
    task.cancel()
    release.set()
    with pytest.raises(asyncio.CancelledError):
        await task
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    usage = [e for e in events if e.kind == "quality_provider_usage"]
    assert len(usage) == 1 and usage[0].payload["usage"]["tokens"]["input_tokens"] == 12
    assert not artifacts and job.state == "failed"
    assert (await review.run(rq))["status"] == "failed" and len(calls) == 1


async def test_invalid_sol_catalogue_precedes_job_and_provider_reservation(configured, monkeypatch):  # noqa: F811
    c = configured
    rq = await request(c, monkeypatch)
    monkeypatch.setattr(evaluator.model_adapter, "REVIEW_MODEL_CATALOGUE_SHA256", "0" * 64)
    with pytest.raises(RunnerError) as error:
        await review.prepare(rq)
    assert error.value.code == "runner_unavailable"
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert job is None and not artifacts and not [e for e in events if e.kind.startswith("quality_")]


async def test_session_expiry_after_final_source_wait_rolls_back_reservation(configured, monkeypatch):  # noqa: F811
    c = configured
    rq = await request(c, monkeypatch)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Session).where(Session.id == c["frozen"]["session_id"]).values(
            expires_at=utcnow() + timedelta(seconds=60)))
    original = chat.final_authority
    async def after_wait(tx, session, *args):
        await original(tx, session, *args)
        monkeypatch.setattr(review, "utcnow", lambda: session.expires_at + timedelta(seconds=1))
    monkeypatch.setattr(chat, "final_authority", after_wait)
    with pytest.raises(ControlError, match="quality_authorization_changed"):
        await review.prepare(rq)
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert job is None and not artifacts and not [e for e in events if e.kind.startswith("quality_")]
