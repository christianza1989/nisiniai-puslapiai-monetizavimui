"""Owner intent and output semantics: a draft is never a runtime permission."""
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.workspace_team import adapter
from pinet_core.workspace_team.preparation_contract import document
from pinet_core.workspace_team.preparation_wire import DraftPlan, PrepareAgent


def specification():
    return {"name": "Sintetinis pagalbininkas", "goal": "Rengti pateiktos užduoties juodraščius peržiūrai.",
        "audience": "Verslo savininkas", "inputs": ["Savininko pateikta užduotis"],
        "outputs": ["Peržiūrimas juodraštis"], "boundaries": ["Neatlikti išorinių veiksmų"],
        "escalation": "Paklausti trūkstamų faktų", "autonomy": "drafts_for_review", "sources": [],
        "examples": [{"input": "Parenkite pasiūlymą", "expected": "Juodraštis peržiūrai"}], "unknowns": []}


def request():
    return {"idempotency_key": str(uuid4()), "creation_id": str(uuid4()), "purpose": "custom",
        "content": "Parenkite pagalbininko aprašą šiai užduočiai."}


def test_explicit_preparation_contract_has_only_native_owner_input():
    result = PrepareAgent.model_validate(request())
    assert result.purpose == "custom"
    schema = document()
    assert list(schema["paths"]) == [
        "/customer/v2/portfolios/{portfolio_id}/workspace-topics/{topic_id}/team/agent-preparations"]
    assert schema["components"]["schemas"]["PrepareAgent"]["additionalProperties"] is False


@pytest.mark.parametrize("key", ["sender", "model", "tool", "session_id", "enabled", "calibrated"])
def test_client_cannot_supply_authority(key):
    with pytest.raises(ValidationError):
        PrepareAgent.model_validate({**request(), key: "untrusted"})


def test_plan_requires_exact_draft_or_clarification():
    value = {"answer": "Aprašas parengtas išsaugojimui.", "limitations": [],
        "decision": "save_draft", "configuration": specification()}
    assert DraftPlan.model_validate(value).configuration.name == "Sintetinis pagalbininkas"
    with pytest.raises(ValidationError):
        DraftPlan.model_validate({**value, "configuration": None})
    with pytest.raises(ValidationError):
        DraftPlan.model_validate({**value, "decision": "clarify"})
    assert DraftPlan.model_validate({**value, "decision": "clarify", "configuration": None}).configuration is None


def test_preparation_schema_and_prompt_are_separate_from_default_consultation():
    assert adapter.plan_model({"message": "parengti agentą"}) is adapter.Plan
    packet = {"message": "Parenkite aprašą", "agent_preparation": {"purpose": "custom"}}
    assert adapter.plan_model(packet) is DraftPlan
    prompt = adapter.prompt_for("plan", packet)
    assert "server alone may save" in prompt and "not evidence of real calibration" in prompt
    assert "Do not select targets, identities, permissions or channels" in prompt
    assert "No other delegation is supported" in adapter.prompt_for("plan", {"message": "Klausimas"})


@pytest.mark.parametrize("change", [{"autonomy": "execute_anything"}, {"sources": [" "]}, {"goal": "x"},
    {"inputs": ["a"*1001]}, {"enabled": True}, {"registration_id": str(uuid4())}])
def test_model_configuration_reuses_native_bounds_and_denies_activation(change):
    with pytest.raises(ValidationError):
        DraftPlan.model_validate({"answer": "Pateiktas aprašas.", "limitations": [], "decision": "save_draft",
            "configuration": {**specification(), **change}})
