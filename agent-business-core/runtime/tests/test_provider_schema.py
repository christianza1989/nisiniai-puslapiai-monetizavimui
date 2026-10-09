from pinet_core.contracts import Analysis
from pinet_core.evidence_output import bound_schema, provider_json_schema


def test_provider_schema_preserves_strictness_and_one_client_reference():
    bound = bound_schema(Analysis, {"evidence": [
        {"id": "client", "speaker": "client"}, {"id": "agent", "speaker": "agent"}]}, client_only=True)
    original = bound.model_json_schema()
    schema = provider_json_schema(bound)
    assert schema["additionalProperties"] is False
    refs = schema["properties"]["evidence_event_ids"]
    assert refs["items"]["enum"] == ["client"]
    assert refs["minItems"] == 1 and refs["maxItems"] == 40
    assert original["properties"]["evidence_event_ids"]["items"]["const"] == "client"


def test_provider_schema_retains_empty_evidence_constraint():
    schema = provider_json_schema(bound_schema(Analysis, {"evidence": []}, client_only=True))
    assert schema["properties"]["evidence_event_ids"]["maxItems"] == 0
