"""Typed text adapter for the same core tools; no JSON nested inside a string."""
from typing import Literal

from pydantic import Field, create_model

from .contracts import Strict
from .profiles import PROFILES


class Query(Strict):
    query: str = Field(min_length=1, max_length=500)


class MemoryQuery(Strict):
    query: str = Field(default='', max_length=500)
    before_event_id: str | None = None


class KnowledgeCall(Strict):
    name: Literal['knowledge.resolve']
    arguments: Query


class MemoryCall(Strict):
    name: Literal['memory.recall']
    arguments: MemoryQuery


class ContactCall(Strict):
    name: Literal['ui.open_contact_form']
    arguments: Strict


def turn_schema(site_id, event_id, revision):
    field = create_model('NeedField', __base__=Strict,
        field=(Literal[tuple(sorted(PROFILES[site_id].need_fields))], ...),
        value=(str, Field(max_length=500)))
    arguments = create_model('NeedArguments', __base__=Strict,
        base_revision=(Literal[revision], ...), evidence_event_id=(Literal[event_id], ...),
        fields=(list[field], Field(min_length=1, max_length=20)))
    need_call = create_model('NeedCall', __base__=Strict,
        name=(Literal['need.patch'], ...), arguments=(arguments, ...))
    return create_model('TextTurn', __base__=Strict,
        reply=(str, Field(max_length=4000)),
        calls=(list[need_call | KnowledgeCall | ContactCall | MemoryCall], Field(max_length=3)))


def core_arguments(call):
    arguments = call.arguments.model_dump()
    if call.name == 'need.patch':
        entries = arguments['fields']
        if len({entry['field'] for entry in entries}) != len(entries):
            raise ValueError('duplicate_need_field')
        arguments['fields'] = {entry['field']: entry['value'] for entry in entries}
    return arguments
