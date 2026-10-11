"""No-provider customer quality projection, packaged prompt and fingerprint."""
from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core import evaluation_contract, local_semantics
from pinet_core.customer_agents import quality
from pinet_core.customer_profile import instructions
from pinet_core.customer_text.adapter import MODEL, VERSION


def row():
    bid, reg, admission = str(uuid4()), str(uuid4()), str(uuid4())
    manifest = instructions.manifest()
    profile = dict(admission_id=admission, sequence=1, registration_id=reg, business_id=bid,
        site_id="creation-" + uuid4().hex, canonical_host="synthetic.example",
        accepted_revision=1, candidate_sha256="a" * 64, accepted_source_revision="a" * 40,
        execution_source_revision="b" * 40,
        knowledge_ref=dict(schema_version=2, knowledge_revision=1, knowledge_hash="c" * 64, deployment_id="synthetic"),
        index_receipt_sha256="d" * 64, **manifest, admitted_at="2026-10-11T00:00:00Z", revoked_at=None)
    frozen = dict(creation_id=str(uuid4()), user_id=str(uuid4()), session_id=str(uuid4()),
        environment_id="local", registration_id=reg, registration_fingerprint="e" * 64,
        admission_id=admission, admission_fingerprint="f" * 64, profile=profile, adapter=VERSION, model=MODEL)
    return SimpleNamespace(business_id=bid, environment_id="local", payload=dict(
        transport=VERSION, test=True, customer_text_binding=frozen, need={}))


def event(sequence, kind, key, payload):
    return SimpleNamespace(id=str(uuid4()), sequence=sequence, kind=kind, event_key=key, payload=payload)


def client():
    return event(1, "client_transcript", "client:request", {"text": "Synthetic need"})


def succeeded():
    return event(2, "customer_text_result", "result:request", {
        "request_id": "request", "status": "succeeded", "reply": "Synthetic reply"})


def test_original_result_identity_is_retained_in_existing_transcript_shape():
    first, reply = client(), succeeded()
    evidence, timeline, coverage = quality.transcript([first, reply])
    assert coverage == "complete"
    assert evidence[1] == {"id": reply.id, "speaker": "agent", "text": "Synthetic reply"}
    assert timeline[1] == {"id": reply.id, "sequence": 2, "kind": "agent_transcript", "text": "Synthetic reply"}


@pytest.mark.parametrize("status", ["failed", "interrupted", "running"])
def test_unaccepted_reply_and_provider_material_never_become_agent_evidence(status):
    reply = succeeded()
    reply.payload["status"] = status
    trace = event(3, "provider_usage", "usage:request", {"reply": "Provider material"})
    evidence, timeline, coverage = quality.transcript([client(), reply, trace])
    assert coverage == "incomplete" and len(evidence) == len(timeline) == 1


@pytest.mark.parametrize("change", ["request", "key", "reply", "length", "order"])
def test_success_receipt_must_refer_to_an_actual_preceding_client(change):
    reply = succeeded()
    if change == "request":
        reply.payload["request_id"] = "foreign"
    elif change == "key":
        reply.event_key = "result:foreign"
    elif change == "reply":
        reply.payload["reply"] = None
    elif change == "length":
        reply.payload["reply"] = "a" * 4001
    with pytest.raises(ValueError, match="reply_receipt_conflict"):
        quality.transcript([reply, client()] if change == "order" else [client(), reply])


def test_saved_contact_timeline_contains_only_receipt_channel_and_original_identity():
    receipt = event(2, "contact_ready", "contact", {"channel": "email", "value": "private@example.com"})
    reply = succeeded()
    reply.sequence = 3
    evidence, timeline, coverage = quality.transcript([client(), receipt, reply])
    assert "private@example.com" not in str((evidence, timeline))
    from pinet_core.quality_context import contact_states
    assert contact_states({"timeline": timeline}) == [{"agent_event_id": reply.id,
        "channels_saved_before_reply": ["email"], "form_shown_before_reply": False}]


def test_immutable_parent_is_deterministic_and_does_not_backfill_historical_payload():
    value = row()
    before = deepcopy(value.payload)
    first = quality.parent(value)
    assert len(first) == 64 and first == quality.parent(value)
    assert value.payload == before and "release_hash" not in value.payload
    value.payload["need"] = {"goal": {"value": "Client correction"}}
    assert quality.parent(value) == first
    value.payload["customer_text_binding"]["profile"]["index_receipt_sha256"] = "0" * 64
    assert quality.parent(value) != first


def saved_task(value):
    frozen = value.payload["customer_text_binding"]
    task = {key: frozen[key] for key in ("creation_id", "user_id", "session_id", "environment_id",
        "registration_id", "registration_fingerprint", "admission_id", "admission_fingerprint")}
    task.update(agent_id=str(uuid4()), execution_source_revision=frozen["profile"]["execution_source_revision"],
        config_revision_id=str(uuid4()), config_revision=2, config_sha256="a" * 64,
        episode_id=str(uuid4()), script_sha256="b" * 64,
        specification=dict(name="Synthetic consultant", goal="Discuss a synthetic course",
            audience="Synthetic customer", inputs=["Client need"], outputs=["Recommendation"],
            boundaries=["No channels"], escalation="Ask the owner", autonomy="recommendations_only",
            sources=[], examples=[dict(input="Synthetic need", expected="Useful recommendation")], unknowns=[]))
    frozen["task_calibration"] = task
    return task


@pytest.mark.parametrize("change", ["session", "episode", "script"])
def test_same_behavior_source_parent_across_distinct_client_test_episodes_and_logins(change):
    value = row()
    task = saved_task(value)
    original = quality.parent(value)
    if change == "session":
        value.payload["customer_text_binding"]["session_id"] = task["session_id"] = str(uuid4())
    elif change == "episode":
        task["episode_id"] = str(uuid4())
    else:
        task["script_sha256"] = "0" * 64
    assert quality.parent(value) == original
    task["config_sha256"] = "0" * 64
    assert quality.parent(value) != original


@pytest.mark.parametrize("change", ["business", "environment", "admission", "model", "extra"])
def test_retained_binding_rejects_foreign_or_untyped_identity(change):
    value = row()
    binding = value.payload["customer_text_binding"]
    if change == "business":
        value.business_id = str(uuid4())
    elif change == "environment":
        value.environment_id = "foreign"
    elif change == "admission":
        binding["admission_id"] = str(uuid4())
    elif change == "model":
        binding["model"] = "other-model"
    else:
        binding["activated"] = True
    with pytest.raises((ValueError, ValidationError)):
        quality.parent(value)


def data():
    value = row()
    evidence, timeline, coverage = quality.transcript([client(), succeeded()])
    return dict(evidence=evidence, timeline=timeline, knowledge=dict(schema_version=2,
        site_id=value.payload["customer_text_binding"]["profile"]["site_id"], pages=[]),
        knowledge_available=True, need={}, coverage=coverage, release_hash=quality.parent(value),
        language_hint=None, contact_channels=[], actual_core_followup=None, agent_task=None,
        customer_quality=dict(version=quality.VERSION, profile_quality_sha256=instructions.HASHES["quality"],
            language_quality="UNVERIFIED", provider_authorized=False, source_blockers=[]))


class Lab:
    calls, usage, timeout_recoveries = 0, [], []
    async def ask(self, schema, prompt, payload):
        self.calls += 1
        self.prompt, self.payload = prompt, payload
        return schema(outcome="helpful", issues=[], evidence_event_ids=[payload["evidence"][0]["id"]],
            improvement_hint="", root_cause="unknown")


async def test_dynamic_customer_uses_existing_bound_quality_without_static_profile(monkeypatch):
    monkeypatch.setattr(local_semantics.agent_instructions, "compose", lambda *_: pytest.fail("No static profile substitution"))
    evaluator, payload = Lab(), data()
    result = await local_semantics.evaluate("quality", payload, evaluator)
    assert evaluator.calls == 1 and "Language quality is UNVERIFIED" in evaluator.prompt
    assert evaluator.payload["capabilities"]["followup"] is False
    assert result["customer_quality"] == payload["customer_quality"]


async def test_provider_is_not_created_without_explicit_injected_consumer(monkeypatch):
    monkeypatch.setattr(local_semantics, "CodexLab", lambda **_: pytest.fail("No implicit CodexLab"))
    with pytest.raises(RuntimeError, match="customer_quality_authority_required"):
        await local_semantics.evaluate("quality", data())


@pytest.mark.parametrize("field,value", [("profile_quality_sha256", "0" * 64), ("provider_authorized", True),
    ("language_quality", "PASS"), ("version", "other")])
async def test_conflicting_customer_quality_context_does_not_call_evaluator(field, value):
    payload, evaluator = data(), Lab()
    payload["customer_quality"][field] = value
    with pytest.raises(ValueError, match="customer_quality_profile_conflict"):
        await local_semantics.evaluate("quality", payload, evaluator)
    assert evaluator.calls == 0


def test_new_nested_adapter_bytes_are_in_existing_evaluator_fingerprint(tmp_path, monkeypatch):
    for relative in ["scripts/network_lab.py", "scripts/client_lab.py", "scripts/learning_observation.py",
                     "src/pinet_core/customer_agents/quality.py"]:
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("Original\n", encoding="utf-8")
    monkeypatch.setattr(evaluation_contract, "ROOT", tmp_path)
    original = evaluation_contract.fingerprint()
    (tmp_path / "src/pinet_core/customer_agents/quality.py").write_text("Changed\n", encoding="utf-8")
    assert evaluation_contract.fingerprint() != original
