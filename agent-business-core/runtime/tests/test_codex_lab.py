from pinet_core.codex_lab import strict_schema
from pinet_core.contracts import Quality


def test_nullable_quality_properties_mandatory_in_structured_output():
    raw = Quality.model_json_schema()
    strict = strict_schema(raw)
    assert set(strict["required"]) == set(strict["properties"])
    assert "default" not in strict["properties"]["suggested_scope"]
    assert {"type": "null"} in strict["properties"]["suggested_scope"]["anyOf"]
    assert raw["properties"]["suggested_scope"]["default"] is None
