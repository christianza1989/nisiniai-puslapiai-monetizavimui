"""Restricted PostgreSQL, injected providers: existing Quality lifecycle with Scores."""
import asyncio
from copy import deepcopy

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
from test_customer_agent_protection import episode as protected_episode
from test_customer_review import request, rows

from pinet_core import competence
from pinet_core.control.models import Session
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import evaluator, review
from pinet_core.customer_text import adapter
from pinet_core.customer_text import service as chat
from pinet_core.db import db
from pinet_core.models import Event, Job, Outbox, utcnow
from pinet_core.tasks.codex_transport import RunnerError

VALUES = dict(relevance=4, factual_accuracy=4, listening=4, useful_next_step=4,
              email_quality=5, critical_issues=[], explanation="Synthetic assessment")


def provider(monkeypatch, c, calls, *, scores=None, cause="unknown", issues=None):
    async def run(schema, prompt, wire, authorized):
        assert await authorized()
        calls.append(prompt)
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            attempts = list(await tx.scalars(select(Event).where(Event.kind == "quality_provider_attempt")))
            assert len(attempts) == len(calls)
            job = await tx.scalar(select(Job).where(Job.payload["dispatch"].astext == review.VERSION))
            event = await tx.scalar(select(Event.id).where(Event.conversation_id == job.conversation_id,
                Event.kind == "client_transcript"))
        if len(calls) == 2:
            return schema(root_cause="communication", suggested_scope="clarification",
                evidence_event_ids=[event], explanation="Synthetic attribution"), {"input_tokens": 8, "output_tokens": 3}
        value = dict(outcome="needs_review" if issues else "helpful", issues=issues or [],
            evidence_event_ids=[event], root_cause=cause,
            suggested_scope="clarification" if issues else None,
            improvement_hint="Explain the synthetic correction" if issues else "")
        return schema(quality=value, scores=scores or VALUES), {"input_tokens": 12, "output_tokens": 6}
    monkeypatch.setattr(evaluator, "run", run)


async def scored_request(c, monkeypatch):
    rq = await request(c, monkeypatch)
    return review.parse_request({**rq.model_dump(), "score_competence": True})


@pytest.mark.parametrize("defect", ["none", "low", "critical"])
async def test_scored_quality_is_durable_and_replay_never_retries_or_admits(configured, monkeypatch, defect):  # noqa: F811
    c, calls = configured, []
    rq = await scored_request(c, monkeypatch)
    original, old = await stored(c, str(rq.conversation_id))
    before = deepcopy((original.payload, [(e.id, e.payload) for e in sorted(old, key=lambda e: e.sequence)]))
    scores = {**VALUES, **({"listening": 3} if defect == "low" else
                         {"critical_issues": ["Synthetic privacy defect"]} if defect == "critical" else {})}
    provider(monkeypatch, c, calls, scores=scores)
    result = await review.run(rq)
    assert result["status"] == "succeeded" and len(calls) == 1
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    value = next(a.payload for a in artifacts if a.kind == "quality")
    report = value["competence"]
    assert report["contract"] == competence.VERSION and report["scores"] == scores
    assert report["state"] == ("competent" if defect == "none" else "needs_review")
    assert report["module_admission"] == "not_admitted" and report["typed_checks"] == "UNVERIFIED"
    assert job.payload["competence_contract"] == competence.VERSION and job.state == "succeeded"
    assert value["cli_calls"] == 1 and value["cli_usage"][0]["tokens"]["input_tokens"] == 12
    snapshot = deepcopy([(e.id, e.payload) for e in events])
    assert await review.run(rq) == result and len(calls) == 1
    after, retained = await stored(c, str(rq.conversation_id))
    retained = sorted(retained, key=lambda e: e.sequence)
    assert before[0] == after.payload
    assert before[1] == [(e.id, e.payload) for e in retained if not e.kind.startswith("quality_")]
    assert snapshot == [(e.id, e.payload) for e in retained]
    with pytest.raises(ControlError) as error:
        await review.run(rq.model_copy(update={"score_competence": False}))
    assert error.value.code == "quality_request_conflict" and len(calls) == 1
    assert not any(k in calls[0] for k in (c["token"], "session_id", "protected_case", "case_id", "split"))
    assert [a.kind for a in artifacts] == ["quality"]
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Outbox)))
        assert not list(await tx.scalars(select(Job).where(Job.kind == "learning")))
    history = await chat.status(c["token"], str(rq.episode.creation_id), str(rq.conversation_id))
    assert "competence" not in str(history) and "critical_issues" not in str(history)


async def test_original_default_request_fingerprint_and_payload_are_unchanged(configured, monkeypatch):  # noqa: F811
    c = configured
    rq = await request(c, monkeypatch)
    dispatch = await review.prepare(rq)
    expected = digest(dict(version=review.VERSION, conversation_id=str(rq.conversation_id),
        request_id=str(rq.request_id), episode=rq.episode.model_dump(mode="json")))
    assert dispatch.fingerprint == expected and not dispatch.score_competence
    _, _, job = await rows(c, str(rq.conversation_id))
    assert "competence_contract" not in job.payload


async def test_protected_holdout_scores_keep_quality_usage_without_tuning(configured, tmp_path, monkeypatch):  # noqa: F811
    c, calls = configured, []
    _, rq, _, _, _ = await protected_episode(c, tmp_path, monkeypatch)
    rq = review.parse_request({**rq.model_dump(), "score_competence": True})
    provider(monkeypatch, c, calls, cause="communication", issues=["Synthetic correction omitted"])
    assert (await review.run(rq))["status"] == "succeeded"
    events, artifacts, _ = await rows(c, str(rq.conversation_id))
    assert len(calls) == 1 and [a.kind for a in artifacts] == ["quality"]
    assert artifacts[0].payload["competence"]["state"] == "competent"
    assert len([e for e in events if e.kind == "quality_provider_usage"]) == 1
    assert not any(label in calls[0] for label in ("case3", "holdout", "protected_case", "manifest_path"))


async def test_existing_optional_attribution_is_second_accounted_call(configured, monkeypatch):  # noqa: F811
    c, calls = configured, []
    rq = await scored_request(c, monkeypatch)
    provider(monkeypatch, c, calls, cause="knowledge", issues=["Synthetic clarification omitted"])
    assert (await review.run(rq))["status"] == "succeeded" and len(calls) == 2
    events, artifacts, _ = await rows(c, str(rq.conversation_id))
    quality = next(a.payload for a in artifacts if a.kind == "quality")
    assert quality["root_cause"] == "communication" and quality["competence"]["scores"] == VALUES
    assert quality["cli_calls"] == 2
    assert len([e for e in events if e.kind == "quality_provider_usage"]) == 2


@pytest.mark.parametrize("failure", ["revoked", "invalid", "cancelled"])
async def test_observed_usage_survives_failure_without_quality_or_model_retry(configured, monkeypatch, failure):  # noqa: F811
    c, calls = configured, []
    rq = await scored_request(c, monkeypatch)
    async def run(schema, prompt, wire, authorized):
        assert await authorized()
        calls.append(prompt)
        if failure == "invalid":
            raise RunnerError("output_invalid", {"input_tokens": 19})
        if failure == "cancelled":
            raise adapter.RequestInterrupted({"input_tokens": 19})
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Session).where(Session.id == c["frozen"]["session_id"]).values(revoked_at=utcnow()))
        assert not await authorized()
        events = (await stored(c, str(rq.conversation_id)))[1]
        event = next(e.id for e in events if e.kind == "client_transcript")
        return schema(quality=dict(outcome="helpful", issues=[], evidence_event_ids=[event], improvement_hint=""),
            scores=VALUES), {"input_tokens": 19}
    monkeypatch.setattr(evaluator, "run", run)
    if failure == "cancelled":
        with pytest.raises(asyncio.CancelledError):
            await review.run(rq)
    else:
        assert (await review.run(rq))["status"] == "failed"
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert len(calls) == 1 and not artifacts and job.state == "failed"
    assert next(e for e in events if e.kind == "quality_provider_usage").payload["usage"]["tokens"]["input_tokens"] == 19
    if failure != "revoked":
        assert (await review.run(rq))["status"] == "failed" and len(calls) == 1
