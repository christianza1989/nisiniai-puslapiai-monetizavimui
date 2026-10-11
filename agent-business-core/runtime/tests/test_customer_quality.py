"""Actual isolated customer PG evidence into the existing quality lifecycle."""
import asyncio
from copy import deepcopy
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
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

from pinet_core import jobs, knowledge, local_semantics, policy
from pinet_core.config import settings
from pinet_core.customer_agents import lab, quality
from pinet_core.customer_text import adapter
from pinet_core.db import db
from pinet_core.models import Artifact, Conversation, Event, Job, KnowledgeState, Outbox, utcnow
from pinet_core.tasks.codex_transport import RunnerError


async def test_saved_customer_episode_is_projected_without_legacy_payload_keys(configured, monkeypatch):  # noqa: F811
    c, captured = configured, []
    fake(monkeypatch, captured)
    episode = await lab.episode(c["token"], c["frozen"], ["Synthetic course", "Corrected course"], uuid4())
    cid, bid = episode["conversation"]["conversation_id"], c["saved"]["business_id"]
    before, retained = await stored(c, cid)
    original = deepcopy((before.payload, [(e.id, e.payload) for e in retained]))
    data = await jobs.load_input(bid, cid)
    assert [e["speaker"] for e in data["evidence"]] == ["client", "agent", "client", "agent"]
    assert data["need"]["goal"]["value"] == "Corrected course"
    assert data["customer_quality"]["language_quality"] == "UNVERIFIED"
    assert data["knowledge_available"] and data["knowledge"]["schema_version"] == 2
    assert not data["customer_quality"]["provider_authorized"]
    after, rows = await stored(c, cid)
    assert original == (after.payload, [(e.id, e.payload) for e in rows])


async def episode_input(c, monkeypatch):
    fake(monkeypatch, [])
    episode = await lab.episode(c["token"], c["frozen"], ["Synthetic course"], uuid4())
    bid, cid = c["saved"]["business_id"], episode["conversation"]["conversation_id"]
    return bid, cid, await jobs.load_input(bid, cid)


class EvidenceLab:
    def __init__(self):
        self.calls, self.usage, self.timeout_recoveries, self.inputs, self.prompts = 0, [], [], [], []

    async def ask(self, schema, instruction, data):
        self.calls += 1
        self.inputs.append(deepcopy(data))
        self.prompts.append(instruction)
        return schema(outcome="needs_review", issues=["Synthetic clarification was omitted"],
            evidence_event_ids=[data["evidence"][0]["id"]], root_cause="communication",
            suggested_scope="clarification", improvement_hint="Explain the useful next clarification in this synthetic scenario.")


async def queued_quality(c, cid):
    bid = c["saved"]["business_id"]
    async with db.transaction(bid, c["environment"]) as tx:
        tx.add(Job(business_id=bid, environment_id=c["environment"], conversation_id=cid, kind="quality"))
    return await jobs.claim_job(bid, "isolated-synthetic-quality", kind="quality")


async def test_existing_quality_issue_candidate_static_lifecycle_is_reused_without_learning(configured, monkeypatch):  # noqa: F811
    c = configured
    bid, cid, data = await episode_input(c, monkeypatch)
    row, events = await stored(c, cid)
    before = deepcopy((row.payload, [(e.id, e.payload) for e in events]))
    evaluator = EvidenceLab()
    result = await local_semantics.evaluate("quality", data, evaluator)
    assert evaluator.calls == 1 and "OWNER EVALUATION SCOPE" in evaluator.prompts[0]
    assert evaluator.inputs[0]["capabilities"]["followup"] is False
    assert not any(key in str(evaluator.inputs) for key in ("session_id", "user_id", "admission_id"))
    task = await queued_quality(c, cid)
    monkeypatch.setattr(settings(), "learning_enabled", True)
    await jobs.complete_artifact(bid, task, result)
    async with db.transaction(bid, c["environment"]) as tx:
        artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == cid)))
        kinds = [a.kind for a in artifacts]
        assert "quality" in kinds and any(k.startswith("calibration_issue:") for k in kinds)
        candidate = next(a for a in artifacts if a.kind.startswith("candidate:"))
        static = next(a for a in artifacts if a.kind.startswith("static_eval:"))
        assert candidate.payload["parent_hash"] == data["release_hash"] == quality.parent(row)
        assert static.payload["status"] == "PASS" and static.payload["semantic_evaluation"] == "UNVERIFIED"
        assert not candidate.payload["activated"] and not static.payload["promotion_eligible"]
        assert not list(await tx.scalars(select(Job).where(Job.kind == "learning")))
        assert not list(await tx.scalars(select(Outbox)))
        assert (await tx.get(Job, task["id"])).state == "succeeded"
    after, retained = await stored(c, cid)
    assert before == (after.payload, [(e.id, e.payload) for e in retained])


async def test_failed_provider_is_incomplete_and_never_an_agent_reply(configured, monkeypatch):  # noqa: F811
    c = configured
    async def failed(*_):
        raise RunnerError("synthetic_failure", receipt={"input_tokens": 7})
    monkeypatch.setattr(adapter, "run", failed)
    episode = await lab.episode(c["token"], c["frozen"], ["Synthetic course"], uuid4())
    cid, bid = episode["conversation"]["conversation_id"], c["saved"]["business_id"]
    data = await jobs.load_input(bid, cid)
    assert data["coverage"] == "incomplete" and len(data["evidence"]) == 1
    assert data["evidence"][0]["speaker"] == "client"
    assert not any(e["kind"] == "agent_transcript" for e in data["timeline"])
    async with db.transaction(bid, c["environment"]) as tx:
        usage = await tx.scalar(select(Event).where(Event.conversation_id == cid, Event.kind == "provider_usage"))
        assert usage.payload["usage"]["tokens"]["input_tokens"] == 7


async def expire(c):
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"],
            KnowledgeState.environment_id == c["environment"]).values(
                refreshed_at=utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 2)))


async def test_expired_current_v2_source_is_missing_facts_and_does_not_renew(configured, monkeypatch):  # noqa: F811
    c = configured
    bid, cid, data = await episode_input(c, monkeypatch)
    await expire(c)
    async with AsyncSession(c["admin"]) as tx:
        source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == bid))
        before = (source.refreshed_at, deepcopy(source.payload))
    blocked = await jobs.load_input(bid, cid)
    assert not blocked["knowledge_available"] and blocked["knowledge"]["pages"] == []
    assert blocked["customer_quality"]["source_blockers"] == ["knowledge_snapshot_expired"]
    assert blocked["release_hash"] == data["release_hash"]
    evaluator = EvidenceLab()
    with pytest.raises(RuntimeError, match="waiting_knowledge"):
        await local_semantics.evaluate("quality", blocked, evaluator)
    assert evaluator.calls == 0
    async with AsyncSession(c["admin"]) as tx:
        source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == bid))
        assert before == (source.refreshed_at, source.payload)


async def test_customer_input_cannot_start_implicit_or_legacy_provider(configured, monkeypatch):  # noqa: F811
    bid, cid, data = await episode_input(configured, monkeypatch)
    monkeypatch.setattr(settings(), "learning_enabled", True)
    monkeypatch.setattr(local_semantics, "CodexLab", lambda **_: pytest.fail("Implicit provider forbidden"))
    with pytest.raises(RuntimeError, match="customer_quality_authority_required"):
        await jobs.evaluate("quality", data, "synthetic-key")
    with pytest.raises(RuntimeError, match="customer_quality_authority_required"):
        await local_semantics.evaluate("quality", data)
    with pytest.raises(RuntimeError, match="customer_quality_authority_required"):
        await local_semantics.evaluate("analysis", data, EvidenceLab())


async def test_admin_bypass_still_requires_exact_business_and_environment(configured, monkeypatch):  # noqa: F811
    c = configured
    bid, cid, _ = await episode_input(c, monkeypatch)
    monkeypatch.setattr(db, "sessions", async_sessionmaker(c["admin"], expire_on_commit=False))
    with pytest.raises(ValueError, match="conversation_unavailable"):
        await jobs.load_input(str(uuid4()), cid)
    monkeypatch.setattr(settings(), "environment", "foreign-environment")
    with pytest.raises(ValueError, match="conversation_unavailable"):
        await jobs.load_input(bid, cid)
    monkeypatch.setattr(settings(), "environment", c["environment"])


async def test_stale_parent_or_source_rejects_artifact_atomically(configured, monkeypatch):  # noqa: F811
    c = configured
    bid, cid, data = await episode_input(c, monkeypatch)
    result = await local_semantics.evaluate("quality", data, EvidenceLab())
    task = await queued_quality(c, cid)
    with pytest.raises(ValueError, match="customer_quality_parent_conflict"):
        await jobs.complete_artifact(bid, task, {**result, "release_hash": "0" * 64})
    original = jobs.fenced_job
    async def expire_after_load(tx, claim):
        job = await original(tx, claim)
        await expire(c)
        return job
    monkeypatch.setattr(jobs, "fenced_job", expire_after_load)
    with pytest.raises(HTTPException, match="knowledge_snapshot_expired"):
        await jobs.complete_artifact(bid, task, result)
    async with db.transaction(bid, c["environment"]) as tx:
        assert not list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == cid)))
        assert (await tx.get(Job, task["id"])).state == "running"


async def test_source_expiry_during_the_final_job_fence_cannot_commit_quality(configured, monkeypatch):  # noqa: F811
    c = configured
    bid, cid, data = await episode_input(c, monkeypatch)
    result = await local_semantics.evaluate("quality", data, EvidenceLab())
    task = await queued_quality(c, cid)
    original, calls = jobs.fenced_job, 0
    real_now = knowledge.utcnow
    async def final_wait(tx, claim):
        nonlocal calls
        row = await original(tx, claim)
        calls += 1
        if calls == 2:
            monkeypatch.setattr(knowledge, "utcnow", lambda: real_now() + timedelta(
                seconds=settings().knowledge_ttl_seconds + 2))
        return row
    monkeypatch.setattr(jobs, "fenced_job", final_wait)
    with pytest.raises(HTTPException, match="knowledge_snapshot_expired"):
        await jobs.complete_artifact(bid, task, result)
    assert calls == 2
    async with db.transaction(bid, c["environment"]) as tx:
        assert not list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == cid)))
        assert (await tx.get(Job, task["id"])).state == "running"


async def test_quality_source_lock_precedes_artifact_fk_during_policy_disable(configured, monkeypatch):  # noqa: F811
    c = configured
    bid, cid, data = await episode_input(c, monkeypatch)
    result = await local_semantics.evaluate("quality", data, EvidenceLab())
    task = await queued_quality(c, cid)
    source_wait, policy_held = asyncio.Event(), asyncio.Event()
    original, calls = quality.current_source, 0
    async def barrier(tx, row):
        nonlocal calls
        calls += 1
        if calls == 2:  # first call is read-only load_input before acceptance TX
            source_wait.set()
            await policy_held.wait()
        return await original(tx, row)
    monkeypatch.setattr(quality, "current_source", barrier)
    async def disabling_lock_order():
        await source_wait.wait()
        async with db.transaction(bid, c["environment"]) as tx:
            # Same canonical order as disable/revoke, with no synthetic policy
            # change needed to reproduce the actual PostgreSQL FK lock cycle.
            await policy.lock(tx, bid, c["environment"], exclusive=True)
            policy_held.set()
            await tx.scalar(select(Conversation).where(Conversation.id == cid).with_for_update())
    tasks = [asyncio.create_task(jobs.complete_artifact(bid, task, result)),
             asyncio.create_task(disabling_lock_order())]
    try:
        async with asyncio.timeout(8):
            await asyncio.gather(*tasks)
    finally:
        for item in tasks:
            item.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    async with db.transaction(bid, c["environment"]) as tx:
        assert (await tx.get(Job, task["id"])).state == "succeeded"
