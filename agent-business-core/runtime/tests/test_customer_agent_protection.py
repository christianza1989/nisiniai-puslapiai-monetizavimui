"""Restricted PG and injected fixed providers; protected labels stay server-side."""
import hashlib
import json
from copy import deepcopy
from uuid import UUID, uuid4, uuid5

import httpx
import pytest
from sqlalchemy import select
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
from test_customer_review import provider, rows

from pinet_core import calibration, evaluation_contract, jobs
from pinet_core.api import app
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import evaluator, lab, protection, review
from pinet_core.customer_text import adapter
from pinet_core.customer_text import service as chat
from pinet_core.customer_text.wire import Start, Turn
from pinet_core.db import db
from pinet_core.models import Artifact, Conversation, Job, Outbox, new_id
from pinet_core.security import digest as instruction_digest


def manifest(c, tmp_path, monkeypatch, case_id="case3", messages=None, scheme="json-sorted-utf8-compact.v1"):
    messages = messages or ["Synthetic frozen request"]
    cases = [{"case_id": "case" + str(i), "split": "train" if i < 3 else "holdout",
        "archetype": "synthetic" + str(i), "messages": messages if "case" + str(i) == case_id else ["Synthetic " + str(i)]}
        for i in range(6)]
    value = dict(contract="private_customer_archetype_baseline.v1", source_revision=c["frozen"]["execution_source_revision"],
        snapshot=c["frozen"], snapshot_sha256=digest(c["frozen"]), evaluator_sha256=evaluation_contract.fingerprint(),
        model_profile=evaluator.profile(), customer_model=adapter.MODEL, cases=cases, corpus_sha256=digest(cases),
        split={"train": 3, "holdout": 3})
    value["corpus_digest_scheme"] = scheme
    value["corpus_sha256"] = protection.corpus_digest(value)
    monkeypatch.setattr(protection, "ROOT", tmp_path)
    path = tmp_path / "manifest.private.json"
    path.write_text(json.dumps(value), encoding="utf-8")
    ref = dict(manifest_path=str(path), manifest_sha256=hashlib.sha256(path.read_bytes()).hexdigest(), case_id=case_id)
    return ref, messages


async def episode(c, tmp_path, monkeypatch, case_id="case3", scheme="json-sorted-utf8-compact.v1"):
    captures = []
    fake(monkeypatch, captures)
    ref, messages = manifest(c, tmp_path, monkeypatch, case_id, scheme=scheme)
    result = await lab.episode(c["token"], c["frozen"], messages, uuid4(), protected_case=ref)
    rq = review.Request(bearer=c["token"], conversation_id=result["conversation"]["conversation_id"],
        request_id=uuid4(), episode=result["snapshot"])
    return result, rq, ref, messages, captures


@pytest.mark.parametrize("case_id,scheme", [("case0", "json-sorted-utf8-compact.v1"),
    ("case3", "json-sorted-utf8-compact.v1"), ("case3", "json-sorted-utf8-spaced.v1")])
async def test_train_uses_existing_lifecycle_holdout_keeps_quality_and_usage_only(configured, tmp_path, monkeypatch, case_id, scheme):  # noqa: F811
    c, calls = configured, []
    result, rq, ref, messages, captures = await episode(c, tmp_path, monkeypatch, case_id, scheme)
    row, before = await stored(c, str(rq.conversation_id))
    proof = protection.retained(row, before)
    assert before[0].kind == "created" and proof["case_id"] == case_id
    original = deepcopy((row.payload, [(e.id, e.payload) for e in before]))
    provider(monkeypatch, c, calls)
    quality_result = await review.run(rq)
    assert quality_result["status"] == "succeeded" and len(calls) == 1
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert job.payload["protected_case_sha256"] == digest(proof)
    attempt = next(e for e in events if e.kind == "quality_provider_attempt")
    assert attempt.payload["protected_case_sha256"] == digest(proof)
    assert next(e for e in events if e.kind == "quality_provider_usage").payload["usage"]["tokens"]["input_tokens"] == 12
    assert next(a for a in artifacts if a.kind == "quality").payload["outcome"] == "needs_review"
    if case_id == "case3":
        assert [a.kind for a in artifacts] == ["quality"]
    else:
        assert any(a.kind.startswith("candidate:") for a in artifacts)
        assert next(a for a in artifacts if a.kind.startswith("static_eval:")).payload["status"] == "PASS"
    assert await review.run(rq) == quality_result and len(calls) == 1
    replay = await lab.episode(c["token"], c["frozen"], messages, UUID(result["snapshot"]["episode_id"]), protected_case=ref)
    assert replay["script_complete"] and len(captures) == 1
    after, retained = await stored(c, str(rq.conversation_id))
    assert original == (after.payload, [(e.id, e.payload) for e in retained if not e.kind.startswith("quality_")])
    for material in [*captures, calls[0][0]]:
        assert all(key not in str(material) for key in ("protected_case", "manifest_sha256", "message_sha256", "holdout", ref["manifest_path"]))
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        assert not list(await tx.scalars(select(Job).where(Job.kind == "learning")))
        assert not list(await tx.scalars(select(Outbox)))
    path = f"/customer/v2/creations/{c['request']['creation_id']}/text-sessions/{rq.conversation_id}"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        for suffix in ("", "/events"):
            response = await client.get(path + suffix, headers=c["auth"])
            assert response.status_code == 200
            assert all(e["kind"] in chat.TEXT_EVENTS for e in response.json()["data"]["events"])
            assert "protected_case" not in response.text and "quality_request" not in response.text


async def test_protection_is_committed_before_first_provider_and_foreign_step_reserves_nothing(configured, tmp_path, monkeypatch):  # noqa: F811
    c, captured = configured, []
    ref, messages = manifest(c, tmp_path, monkeypatch, messages=["Synthetic first", "Synthetic second"])
    key = uuid4()
    frozen = lab.Episode(**c["frozen"], episode_id=key, script_sha256=digest(messages)).model_dump(mode="json")
    material = protection.freeze(ref, c["frozen"], messages)
    started = await chat.start(c["token"], frozen["creation_id"], Start(request_id=key, admission_id=frozen["admission_id"],
        notice_version="customer-text.local.v1", consent=True), calibration=frozen, protection=material)
    cid = started["conversation_id"]
    row, events = await stored(c, cid)
    assert protection.retained(row, events)["split"] == "holdout"
    assert not any(e.kind == "provider_attempt" for e in events)
    fake(monkeypatch, captured)
    for request_id, message in [(uuid5(key, "step:1"), messages[1]), (uuid5(key, "step:0"), "Changed"), (uuid4(), messages[0])]:
        with pytest.raises(ControlError, match="protected_case_conflict"):
            await chat.turn(c["token"], frozen["creation_id"], cid,
                Turn(request_id=request_id, base_need_revision=0, message=message), calibration=frozen)
    assert not captured
    rq = review.Request(bearer=c["token"], conversation_id=cid, request_id=uuid4(), episode=frozen)
    with pytest.raises(ControlError, match="protected_quality_incomplete"):
        await review.prepare(rq)
    await lab.episode(c["token"], c["frozen"], messages, key, protected_case=ref)
    assert len(captured) == 2


async def test_replay_cannot_drop_or_replace_original_manifest_split(configured, tmp_path, monkeypatch):  # noqa: F811
    c = configured
    result, _, ref, messages, captures = await episode(c, tmp_path, monkeypatch)
    key = UUID(result["snapshot"]["episode_id"])
    with pytest.raises(ControlError, match="idempotency_conflict"):
        await lab.episode(c["token"], c["frozen"], messages, key)
    path = tmp_path / "manifest.private.json"
    value = json.loads(path.read_text(encoding="utf-8"))
    value["cases"][3]["split"], value["cases"][0]["split"] = "train", "holdout"
    value["corpus_sha256"] = digest(value["cases"])
    path.write_text(json.dumps(value), encoding="utf-8")
    changed = {**ref, "manifest_sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    with pytest.raises(ControlError, match="idempotency_conflict"):
        await lab.episode(c["token"], c["frozen"], messages, key, protected_case=changed)
    with pytest.raises(ControlError, match="protected_case_reclassification_conflict"):
        await lab.episode(c["token"], c["frozen"], messages, uuid4(), protected_case=changed)
    assert len(captures) == 1


async def test_new_uuid_cannot_omit_protection_and_turn_holdout_into_tuning(configured, tmp_path, monkeypatch):  # noqa: F811
    c = configured
    _, _, _, messages, captures = await episode(c, tmp_path, monkeypatch)
    with pytest.raises(ControlError, match="protected_case_binding_required"):
        await lab.episode(c["token"], c["frozen"], messages, uuid4())
    assert len(captures) == 1


@pytest.mark.parametrize("reference", [False, True])
async def test_original_event_still_blocks_new_uuid_when_mutable_marker_is_removed(configured, tmp_path, monkeypatch, reference):  # noqa: F811
    c = configured
    _, rq, ref, messages, captures = await episode(c, tmp_path, monkeypatch)
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        row = await tx.get(Conversation, str(rq.conversation_id))
        row.payload = {k: v for k, v in row.payload.items() if k != "protected_case"}
    options = {"protected_case": ref} if reference else {}
    with pytest.raises((ControlError, ValueError)):
        await lab.episode(c["token"], c["frozen"], messages, uuid4(), **options)
    assert len(captures) == 1


@pytest.mark.parametrize("change", ["removed", "split"])
async def test_changed_proof_during_quality_wait_retains_usage_and_no_tuning(configured, tmp_path, monkeypatch, change):  # noqa: F811
    c = configured
    _, rq, _, _, _ = await episode(c, tmp_path, monkeypatch)
    async def run(schema, prompt, wire, authorized):
        assert await authorized()
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            row = await tx.get(Conversation, str(rq.conversation_id))
            payload = deepcopy(row.payload)
            if change == "removed":
                del payload["protected_case"]
            else:
                payload["protected_case"]["split"] = "train"
            row.payload = payload
        assert not await authorized()
        evidence = next(e.id for e in (await stored(c, str(rq.conversation_id)))[1] if e.kind == "client_transcript")
        return schema(outcome="helpful", issues=[], evidence_event_ids=[evidence], improvement_hint=""), {"input_tokens": 19}
    monkeypatch.setattr(evaluator, "run", run)
    result = await review.run(rq)
    assert result["status"] == "failed" and result["failure_code"] == "authorization_revoked"
    events, artifacts, job = await rows(c, str(rq.conversation_id))
    assert not artifacts and job.state == "failed"
    assert next(e for e in events if e.kind == "quality_provider_usage").payload["usage"]["tokens"]["input_tokens"] == 19


async def test_direct_static_bypass_cannot_admit_holdout_candidate(configured, tmp_path, monkeypatch):  # noqa: F811
    c, calls = configured, []
    _, rq, _, _, _ = await episode(c, tmp_path, monkeypatch)
    provider(monkeypatch, c, calls)
    await review.run(rq)
    cid, bid = str(rq.conversation_id), c["saved"]["business_id"]
    async with db.transaction(bid, c["environment"]) as tx:
        q = await tx.scalar(select(Artifact).where(Artifact.conversation_id == cid, Artifact.kind == "quality"))
        candidate_id = new_id()
        hint = "Explain the useful next clarification in this synthetic scenario."
        tx.add(Artifact(id=candidate_id, business_id=bid, environment_id=c["environment"], conversation_id=cid,
            kind="candidate:" + candidate_id, payload=dict(parent_hash=q.payload["release_hash"], scope="clarification",
            instruction=hint, hash=instruction_digest(hint), issue_artifact_id=q.id, state="proposed", activated=False)))
        await tx.flush()
        result = await calibration.static_check(tx, candidate_id)
        assert result["status"] == "FAIL" and "protected_holdout_not_tuning_input" in result["issues"]
        assert not result["promotion_eligible"]


async def test_holdout_knowledge_issue_is_preserved_without_editorial_or_issue_artifacts(configured, tmp_path, monkeypatch):  # noqa: F811
    c = configured
    result, rq, _, _, _ = await episode(c, tmp_path, monkeypatch)
    cid, bid = str(rq.conversation_id), c["saved"]["business_id"]
    data = await jobs.load_input(bid, cid)
    async with db.transaction(bid, c["environment"]) as tx:
        tx.add(Job(business_id=bid, environment_id=c["environment"], conversation_id=cid, kind="quality"))
    task = await jobs.claim_job(bid, "isolated-quality", "quality")
    output = dict(outcome="needs_review", issues=["Synthetic missing factual evidence"],
        root_cause="knowledge", evidence_event_ids=[data["evidence"][0]["id"]], improvement_hint="",
        suggested_scope=None, release_hash=data["release_hash"], coverage="complete")
    await jobs.complete_artifact(bid, task, output)
    async with db.transaction(bid, c["environment"]) as tx:
        artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == cid)))
        assert [a.kind for a in artifacts] == ["quality"] and artifacts[0].payload["root_cause"] == "knowledge"
    assert result["calibration_status"] == "UNVERIFIED"
