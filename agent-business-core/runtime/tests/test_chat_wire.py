import json
from types import SimpleNamespace
import pytest
from pydantic import ValidationError
from pinet_core import chat, text_provider
from pinet_core.text_tools import turn_schema


@pytest.mark.asyncio
async def test_provider_adapter_keeps_server_evidence_binding(monkeypatch):
    from pinet_core.config import settings
    monkeypatch.setattr(settings(), 'text_provider', 'gemini')
    captured = {}
    class Client:
        def __init__(self, **kwargs):
            self.aio = self
            self.models = self
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def generate_content(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(text=json.dumps({'reply':'','calls':[{'name':'need.patch',
                'fields':[{'field':'quantity','value':'2'}], 'query':''}]}), usage_metadata=None)
    monkeypatch.setattr(text_provider.genai, 'Client', Client)
    monkeypatch.setattr(text_provider.pricing, 'flash_estimate', lambda *args: 123)
    bound = turn_schema('parasoplansetes', 'actual-client-event', 7)
    generated, cost = await chat.generate(bound, 'Synthetic instruction', {})
    decision = chat.decode(bound, generated)
    assert cost == 123
    assert decision.calls[0].arguments.base_revision == 7
    assert decision.calls[0].arguments.evidence_event_id == 'actual-client-event'
    wire = captured['config'].response_json_schema
    assert captured['config'].thinking_config.thinking_level.value == 'LOW'
    assert '$defs' not in wire and 'maxItems' not in json.dumps(wire)
    # Unsupported fields and extra model-supplied evidence cannot reach core tools.
    generated['wire_text'] = json.dumps({'reply':'','calls':[{'name':'need.patch',
        'fields':[{'field':'price','value':'1'}], 'query':''}]})
    with pytest.raises(ValidationError): chat.decode(bound, generated)
    generated['wire_text'] = json.dumps({'reply':'','calls':[{'name':'ui.open_contact_form',
        'fields':[], 'query':'unapproved extra argument'}]})
    with pytest.raises(ValueError): chat.decode(bound, generated)


async def test_last_generation_has_reply_only_schema_and_rejects_more_tools(monkeypatch):
    captured = {}
    async def generate(schema, instruction, data, **kwargs):
        captured.update(schema=schema, instruction=instruction)
        return text_provider.Generated('{"reply":"Patikslinkite naudojamą programą."}', 100, 'stop')
    monkeypatch.setattr(text_provider, 'generate_json', generate)
    bound = turn_schema('parasoplansetes', 'actual-client-event', 7)
    generated, cost = await chat.generate(bound, 'Synthetic instruction', {'tool_budget_remaining': 0})
    assert set(captured['schema']['properties']) == {'reply'}
    assert captured['schema']['additionalProperties'] is False
    decision = chat.decode(bound, generated)
    assert cost == 100 and decision.reply and decision.calls == []
    generated['wire_text'] = '{"reply":"","calls":[{"name":"knowledge.resolve","fields":[],"query":"repeat"}]}'
    with pytest.raises(ValidationError):
        chat.decode(bound, generated)
