"""Restricted native PG, real High argument builders, inert bounded transport."""
import hashlib
import json
import sys
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import select
from test_customer_agent_lab import (  # noqa: F401 - maintained native fixture chain
    configured,
    creation,
    customers,
    profile,
    registration,
    stored,
    text_customer,
)
from test_customer_agent_session import principal  # noqa: F401 - maintained fixture
from test_customer_competence import VALUES
from test_customer_review import rows
from test_customer_typed_checks import typed_manifest

from pinet_core.config import settings
from pinet_core.control.routes import ControlError, scope
from pinet_core.creation import execution_profiles as profiles
from pinet_core.customer_agents import evaluator, evidence, lab, provisioning, quality, review
from pinet_core.customer_agents.session import SessionPrincipal
from pinet_core.customer_text import adapter, execution
from pinet_core.customer_text import service as chat
from pinet_core.db import db
from pinet_core.models import Event, Job
from pinet_core.tasks.codex_transport import RunnerError

RUNNER_READY = adapter.runner_ready


@pytest.fixture
async def high(principal, monkeypatch, tmp_path):  # noqa: F811 - imported fixture
    c, original = principal
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    monkeypatch.setattr(settings(), "chat_workspace", str(tmp_path))
    monkeypatch.setattr(settings(), "chat_codex_executable", sys.executable)
    monkeypatch.setattr(settings(), "chat_codex_sha256", hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest())
    monkeypatch.setattr(settings(), "chat_model", adapter.MODEL)
    monkeypatch.setattr(settings(), "chat_runner_seconds", 30)
    monkeypatch.setattr(adapter, "runner_ready", RUNNER_READY)
    pin = execution.capture_high()
    p = SessionPrincipal(original.scope, original.fence, execution_profile=pin)
    frozen = await lab.snapshot_session(p, c["agent"]["agent"]["agent_id"], 1)
    return c, p, frozen


def constant(value, name):
    if isinstance(value, dict):
        if isinstance(value.get(name), dict) and "const" in value[name]:
            return value[name]["const"]
        for item in value.values():
            result = constant(item, name)
            if result is not None:
                return result
    if isinstance(value, list):
        for item in value:
            result = constant(item, name)
            if result is not None:
                return result
    return None


def text_transport(monkeypatch, c, captures, after=None):
    async def execute(argv, **options):
        assert await options["still_authorized"]()
        assert argv[argv.index("--model") + 1] == "gpt-6.1-sol" and 'model_reasoning_effort="high"' in argv
        wire = json.loads(options["output"].with_name("turn.schema.json").read_text())
        event_id, revision = constant(wire, "evidence_event_id"), constant(wire, "base_revision")
        assert event_id and type(revision) is int
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            event = await tx.get(Event, event_id)
            message = event.payload["text"]
        captures.append(deepcopy(argv))
        if after:
            after()
        return {"reply": "Inert native High reply", "calls": [{"name": "need.patch", "arguments": {
            "base_revision": revision, "evidence_event_id": event_id,
            "fields": [{"field": "goal", "value": message}]}}]}, {"input_tokens": 9, "output_tokens": 5}
    monkeypatch.setattr(adapter, "execute", execute)


def quality_transport(monkeypatch, c, pin, captures, cause="unknown"):
    async def execute(argv, **options):
        assert await options["still_authorized"]()
        assert argv[argv.index("--model") + 1] == "gpt-6.1-sol" and 'model_reasoning_effort="high"' in argv
        captures.append(deepcopy(argv))
        wire = json.loads(options["output"].with_name("review.schema.json").read_text())
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            job = await tx.scalar(select(Job).where(Job.payload["execution_profile_sha256"].astext == pin.fingerprint()))
            event = await tx.scalar(select(Event.id).where(Event.conversation_id == job.conversation_id,
                Event.kind == "client_transcript").order_by(Event.sequence).limit(1))
        if len(captures) == 2:
            return {"root_cause": "communication", "suggested_scope": "clarification",
                "evidence_event_ids": [event], "explanation": "Inert independent attribution"}, {"input_tokens": 8}
        issues = ["Synthetic clarification omitted"] if cause == "knowledge" else []
        value = {"outcome": "needs_review" if issues else "helpful", "issues": issues, "evidence_event_ids": [event],
            "improvement_hint": "Clarify the synthetic need" if issues else "", "root_cause": cause,
            "suggested_scope": "clarification" if issues else None}
        return ({"quality": value, "scores": VALUES} if "quality" in wire["properties"] else value), {
            "input_tokens": 12, "output_tokens": 6}
    monkeypatch.setattr(evaluator, "execute", execute)


async def test_separate_preflight_and_running_snapshot_are_exact_without_any_permit(high):
    c, p, frozen = high
    async with scope(user=str(p.scope.user_id)) as tx:
        session = await provisioning.authorizing_session(tx, p.scope)
        captured = await lab.snapshot_in_transaction(tx, session, str(p.scope.creation_id),
            c["agent"]["agent"]["agent_id"], 1, execution_profile=p.execution_profile)
    assert captured == frozen and not p.fence.calls


async def test_high_episode_exact_replay_and_default_runtime_history_keep_actual_receipts(high, monkeypatch):
    c, p, frozen = high
    captures = []
    text_transport(monkeypatch, c, captures)
    operation, messages = uuid4(), ["Synthetic original 100", "Synthetic correction 50"]
    first = await lab.episode_session(p, frozen, messages, operation)
    assert first["script_complete"] and len(captures) == 2
    original, events = await stored(c, first["conversation"]["conversation_id"])
    saved = deepcopy((original.payload, [(e.id, e.payload) for e in events]))
    bound = original.payload["customer_text_binding"]
    assert all(call.model == "gpt-6.1-sol" and call.reasoning_effort == "high"
        and call.execution_profile_sha256 == p.execution_profile.fingerprint() for call in p.fence.calls)
    assert all(execution.verified({"_execution": e.payload.get("execution")}, bound, "customer_text")
        for e in events if e.kind == "provider_usage")
    await lab.episode_session(p, frozen, messages, operation)
    assert len(captures) == 2 and len(p.fence.calls) == 2
    after, retained = await stored(c, original.id)
    assert saved == (after.payload, [(e.id, e.payload) for e in retained])
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    history = await chat.status(c["token"], c["request"]["creation_id"], original.id)
    assert history["model"] == "gpt-6.1-sol" and history["calibration_status"] == "UNVERIFIED"
    assert quality.retained(after).execution_profile == p.execution_profile


@pytest.mark.parametrize("loss", ["task", "profile"])
async def test_high_usage_survives_lost_authority_without_accepting_output(high, monkeypatch, loss):
    c, p, frozen = high
    captures = []
    def after():
        if loss == "task":
            p.fence.active = False
        else:
            monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    text_transport(monkeypatch, c, captures, after)
    with pytest.raises(ControlError, match="text_authorization_changed"):
        await lab.episode_session(p, frozen, ["Synthetic late High request"], uuid4())
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        events = list(await tx.scalars(select(Event)))
    usage = next(e for e in events if e.kind == "provider_usage")
    assert usage.payload["usage"]["tokens"]["input_tokens"] == 9
    assert usage.payload["execution"]["reasoning_effort"] == "high" and len(captures) == 1
    assert not any(e.kind == "customer_text_result" and e.payload.get("status") == "succeeded" for e in events)


async def test_bearer_cannot_execute_high_episode_and_pin_drift_has_zero_permits(high, monkeypatch):
    c, p, frozen = high
    captures = []
    text_transport(monkeypatch, c, captures)
    with pytest.raises(ControlError, match="conversation_task_not_current"):
        await lab.episode(c["token"], frozen, ["Synthetic request"], uuid4())
    changed = deepcopy(frozen)
    changed["execution_profile"]["text"]["model_catalogue_sha256"] = "0" * 64
    with pytest.raises(ControlError, match="conversation_task_not_current"):
        await lab.episode_session(p, changed, ["Synthetic request"], uuid4())
    assert not p.fence.calls and not captures


@pytest.mark.parametrize("cause,expected", [("unknown", 1), ("knowledge", 2)])
async def test_high_protected_typed_quality_and_replay_keep_same_frozen_model_profile(high, tmp_path, monkeypatch, cause, expected):
    c, p, frozen = high
    # Existing manifest fixture pins canonical High metadata; criteria unchanged.
    c = {**c, "frozen": frozen}
    text_calls, review_calls = [], []
    text_transport(monkeypatch, c, text_calls)
    # Author the fresh High manifest BEFORE its first freeze. Existing unseen
    # cases/criteria stay exact; no runtime evaluator is replaced.
    reference, messages, _ = typed_manifest(c, tmp_path, monkeypatch)
    path = Path(reference["manifest_path"])
    manifest = json.loads(path.read_text())
    supplement_path = Path(manifest["typed_expectations"]["path"])
    supplement = json.loads(supplement_path.read_text())
    origin_path = Path(supplement["origin"]["path"])
    origin = json.loads(origin_path.read_text())
    origin["model_profile"] = evaluator.profile_high(p.execution_profile)
    origin["customer_model"] = p.execution_profile.text.model
    origin_path.write_text(json.dumps(origin), encoding="utf-8")
    supplement["origin"]["sha256"] = hashlib.sha256(origin_path.read_bytes()).hexdigest()
    supplement_path.write_text(json.dumps(supplement), encoding="utf-8")
    manifest["typed_expectations"]["sha256"] = hashlib.sha256(supplement_path.read_bytes()).hexdigest()
    manifest["model_profile"] = evaluator.profile_high(p.execution_profile)
    manifest["customer_model"] = p.execution_profile.text.model
    path.write_text(json.dumps(manifest), encoding="utf-8")
    reference = {**reference, "manifest_sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    episode = await lab.episode_session(p, frozen, messages, uuid4(), protected_case=reference)
    quality_transport(monkeypatch, c, p.execution_profile, review_calls, cause)
    request = review.SessionTypedRequest(conversation_id=episode["conversation"]["conversation_id"],
        request_id=uuid4(), episode=episode["snapshot"], typed_expectations=reference)
    result = await review.run_session(p, request)
    assert result["status"] == "succeeded" and result["typed_report"]["state"] == "PASS"
    events, artifacts, job = await rows(c, str(request.conversation_id))
    assert job.payload["model_profile"]["reasoning_effort"] == "high"
    assert len(text_calls) == 2 and len(review_calls) == expected and len(p.fence.calls) == expected + 2
    assert [a.kind for a in artifacts] == ["quality"]
    bound = (await stored(c, str(request.conversation_id)))[0].payload["customer_text_binding"]
    assert all(execution.verified({"_execution": e.payload.get("execution")}, bound, "customer_quality")
        for e in events if e.kind == "quality_provider_usage")
    assert await review.run_session(p, request) == result and len(p.fence.calls) == expected + 2
    assert artifacts[0].payload["competence"]["module_admission"] == "not_admitted"
    assert evidence.settled_attempts(job, [e for e in events if e.kind == "quality_provider_attempt"],
        [e for e in events if e.kind == "quality_provider_usage"])


async def test_profile_drift_refuses_new_snapshot_before_provider(high, monkeypatch):
    _, p, frozen = high
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
    with pytest.raises(RunnerError):
        await lab.snapshot_session(p, frozen["agent_id"], 1)
    assert not p.fence.calls
