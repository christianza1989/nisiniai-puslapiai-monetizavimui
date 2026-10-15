"""Frozen request pins, canonical turn IDs and shared-call bounds, provider zero."""
import json
from types import SimpleNamespace
from uuid import uuid4, uuid5

import pytest
from pydantic import ValidationError

from pinet_core.creation.service import digest
from pinet_core.workspace_team.calibration_plan import EpisodePlan, validated_plan


def data():
    scope = {key: str(uuid4()) for key in ("user_id", "organization_id", "portfolio_id", "session_id",
        "creation_id", "business_id", "grant_id", "registration_id")}
    scope.update(environment_id="test-budget", source_revision="a"*40, registration_fingerprint="b"*64)
    snapshot = {key: scope[key] for key in ("user_id", "session_id", "creation_id", "registration_id",
        "registration_fingerprint", "environment_id")}
    snapshot.update(agent_id=str(uuid4()), admission_id=str(uuid4()), admission_fingerprint="c"*64,
        execution_source_revision=scope["source_revision"], config_revision_id=str(uuid4()),
        config_revision=1, config_sha256="d"*64,
        specification={"name": "Bandymų pagalbininkas", "goal": "Aptarti pateiktą sintetinį poreikį.",
            "audience": "Bandymo dalyvis", "inputs": ["Pateiktas poreikis"], "outputs": ["Aptarimas"],
            "boundaries": ["Jokių išorinių veiksmų"], "escalation": "Paklausti trūkstamų faktų",
            "autonomy": "drafts_for_review", "sources": [],
            "examples": [{"input": "Noriu aptarti poreikį", "expected": "Patikslinti nežinomus faktus"}], "unknowns": []})
    return {"scope": scope, "snapshot": snapshot, "episode_id": str(uuid4()), "quality_request_id": str(uuid4()),
        "messages": ["Noriu aptarti sintetinį poreikį."], "quality_request_sha256": "e"*64,
        "protected_case_sha256": None}


def parsed(value=None):
    return EpisodePlan.model_validate_json(json.dumps(value or data()))


def call(plan, kind="customer_text"):
    snapshot = plan.snapshot
    result = {key: getattr(snapshot, key) for key in ("creation_id", "agent_id", "config_revision_id",
        "config_revision", "config_sha256", "admission_id", "admission_fingerprint")}
    request = uuid5(plan.episode_id, "step:0") if kind == "customer_text" else plan.quality_request_id
    return SimpleNamespace(**result, source_revision=plan.scope.source_revision,
        episode_id=plan.episode_id, protected_case_sha256=None, model=plan.model,
        kind=kind, number=1, request_id=request, call_key="attempt:"+str(request),
        script_sha256=plan.script_sha256,
        request_input_sha256=digest(plan.messages[0]) if kind == "customer_text" else plan.quality_request_sha256)


def test_exact_single_episode_limits_and_canonical_replay_keys():
    plan = parsed()
    assert plan.call_limit == 3 and plan.call_matches(call(plan))
    value = data()
    value["messages"] *= 8
    assert parsed(value).call_limit == 10
    value["messages"].append("Devintas žingsnis.")
    with pytest.raises(ValidationError):
        parsed(value)


@pytest.mark.parametrize("key", ["user_id", "session_id", "registration_id", "creation_id", "environment_id"])
def test_snapshot_cannot_rebind_the_native_scope(key):
    value = data()
    value["snapshot"][key] = "test-other" if key == "environment_id" else str(uuid4())
    with pytest.raises(ValidationError):
        parsed(value)


@pytest.mark.parametrize("key,value", [("source_revision", "f"*40), ("config_sha256", "f"*64),
    ("episode_id", uuid4()), ("request_id", uuid4()), ("model", "gpt-6-luna"),
    ("kind", "send_email"), ("number", 2), ("protected_case_sha256", "f"*64),
    ("script_sha256", "f"*64), ("request_input_sha256", "f"*64)])
def test_unplanned_call_is_refused(key, value):
    plan = parsed()
    candidate = call(plan)
    setattr(candidate, key, value)
    assert not plan.call_matches(candidate)


def test_no_authority_or_provider_override_is_a_plan_field():
    for key in ("bearer", "enabled", "can_activate", "budget_override", "tools"):
        with pytest.raises(ValidationError):
            parsed(data() | {key: True})
    with pytest.raises(ValidationError):
        parsed(data() | {"model": "gpt-6-luna"})
    with pytest.raises(ValidationError):
        parsed(data() | {"effort": "medium"})


def test_model_copy_cannot_bypass_revalidation_and_validation_detaches_nested_models():
    plan = parsed()
    with pytest.raises(ValidationError):
        validated_plan(plan.model_copy(update={"messages": ()}))
    detached = validated_plan(plan)
    assert detached is not plan and detached.snapshot is not plan.snapshot
    assert detached.scope is not plan.scope


def test_first_script_or_quality_input_cannot_differ_under_the_same_operation_ids():
    plan = parsed()
    candidate = call(plan)
    candidate.request_input_sha256 = digest("Kitas pirmas kliento tekstas.")
    assert not plan.call_matches(candidate)
    quality = call(plan, "customer_quality")
    assert plan.call_matches(quality)
    quality.request_input_sha256 = digest({"typed_expectations": "Kita nuoroda"})
    assert not plan.call_matches(quality)
    with pytest.raises(ValidationError):
        parsed(data() | {"script_sha256": "f"*64})
