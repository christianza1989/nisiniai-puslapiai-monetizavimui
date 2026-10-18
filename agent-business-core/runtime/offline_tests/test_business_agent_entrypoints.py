"""Actual API contracts keep attachment separate from Creation-only previews."""
from pinet_core.api import app as full_api
from pinet_core.control_api import app as minimal_api
from pinet_core.customer_agents.business_contract import document


def test_both_actual_api_entrypoints_expose_the_same_business_agent_operations():
    prefix = "/customer/v2/businesses/{business_id}/agents"
    expected = {key: set(value) for key, value in document()["paths"].items()}
    assert len(expected) == 5
    assert sum(map(len, expected.values())) == 7
    for app in (full_api, minimal_api):
        paths = app.openapi()["paths"]
        actual = {key: set(value) for key, value in paths.items() if key.startswith(prefix)}
        assert actual == expected


def test_attachment_contract_keeps_live_actions_false_and_has_explicit_import_and_history():
    contract = document()
    root = "/customer/v2/businesses/{business_id}/agents"
    assert "post" in contract["paths"][root+"/import"]
    assert "get" in contract["paths"][root+"/{agent_id}/revisions/{revision}"]
    readiness = contract["components"]["schemas"]["Readiness"]["properties"]
    assert readiness["can_activate"]["const"] is False
    assert readiness["provider_execution"]["const"] is False
    assert contract["components"]["schemas"]["ImportResult"]["properties"]["provider_execution"]["const"] is False
