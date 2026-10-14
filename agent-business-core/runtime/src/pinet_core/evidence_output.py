"""Constrain generated references to this conversation before generation."""
from typing import Literal

from pydantic import Field, create_model


def bound_schema(schema, data, client_only=False):
    allowed = tuple(dict.fromkeys(e['id'] for e in data['evidence']
        if not client_only or e['speaker'] == 'client'))
    if allowed:
        references = list[Literal[allowed]]
        field = Field(min_length=1, max_length=40)
    else:
        references = list[str]
        field = Field(max_length=0)
    return create_model(schema.__name__ + 'EvidenceBound', __base__=schema,
        evidence_event_ids=(references, field))


def provider_json_schema(schema):
    """Gemini supports enums; Pydantic emits const for a single allowed ID."""
    def compatible(value):
        if isinstance(value, list):
            return [compatible(item) for item in value]
        if not isinstance(value, dict):
            return value
        result = {key: compatible(item) for key, item in value.items() if key != 'const'}
        if 'const' in value:
            result['enum'] = [value['const']]
        return result
    return compatible(schema.model_json_schema())
