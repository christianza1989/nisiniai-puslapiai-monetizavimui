"""Actual tool-free CodexLab strict wire schema, no fake grader/provider."""

import pytest

from pinet_core.acquisition.agent_role_calibration import GRADE, SixRoleGrade
from pinet_core.acquisition.agent_role_contract import OUTPUT, ROLES
from pinet_core.acquisition.engine import fingerprint
from pinet_core.codex_lab import strict_schema


def assert_closed_object(value, expected):
    assert value["type"] == "object"
    assert set(value.get("properties", {})) == set(expected)
    assert set(value["required"]) == set(expected)
    assert value["additionalProperties"] is False
    assert value.get("minProperties", 0) <= len(expected)
    assert value.get("maxProperties", len(expected)) >= len(expected)


def test_actual_strict_grade_wire_can_express_six_statuses_and_na_reasons():
    schema = strict_schema(SixRoleGrade.model_json_schema())
    for field in ("role_status", "na_reasons"):
        assert_closed_object(schema["properties"][field], ROLES)
        assert "propertyNames" not in schema["properties"][field]
    assert all(
        schema["properties"]["role_status"]["properties"][r]["enum"] == ["PASS", "FAIL", "NA"] for r in ROLES
    )
    assert all(schema["properties"]["na_reasons"]["properties"][r]["type"] == "string" for r in ROLES)
    value = SixRoleGrade(
        factual=True,
        appropriate=True,
        respects_stop=True,
        follows_corrected_need=True,
        no_false_activation=True,
        reason="Known wire shape fixture only.",
        role_status={r: "NA" if r == "reply" else "PASS" for r in ROLES},
        na_reasons={r: "Observed native stop before reply." if r == "reply" else "" for r in ROLES},
    )
    assert value.role_status["reply"] == "NA" and value.na_reasons["reply"]
    assert fingerprint(GRADE) == "025acf0b6e6bbd9d4876afb2b25afd7b481bdd71e1bcf86a453491f10808acc7"


@pytest.mark.parametrize("role", ROLES)
def test_all_six_native_outputs_have_nonempty_closed_actual_wire_objects(role):
    original = OUTPUT[role].model_json_schema()
    schema = strict_schema(original)
    assert original.get("properties")
    assert_closed_object(schema, original["properties"])
