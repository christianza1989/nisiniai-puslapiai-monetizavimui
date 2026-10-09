import json
from types import SimpleNamespace
import pytest
from pydantic import ValidationError
from pinet_core import chat
from pinet_core.text_tools import turn_schema


@pytest.mark.asyncio
async def test_provider_adapter_keeps_server_evidence_binding(monkeypatch):
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
    monkeypatch.setattr(chat.genai, 'Client', Client)
    monkeypatch.setattr(chat.pricing, 'flash_estimate', lambda *args: 123)
    bound = turn_schema('parasoplansetes', 'actual-client-event', 7)
    generated, cost = await chat.generate(bound, 'Synthetic instruction', {})
    decision = chat.decode(bound, generated)
    assert cost == 123
    assert decision.calls[0].arguments.base_revision == 7
    assert decision.calls[0].arguments.evidence_event_id == 'actual-client-event'
    wire = captured['config'].response_json_schema
    assert '$defs' not in wire and 'maxItems' not in json.dumps(wire)
    # Unsupported fields and extra model-supplied evidence cannot reach core tools.
    generated['wire_text'] = json.dumps({'reply':'','calls':[{'name':'need.patch',
        'fields':[{'field':'price','value':'1'}], 'query':''}]})
    with pytest.raises(ValidationError): chat.decode(bound, generated)
    generated['wire_text'] = json.dumps({'reply':'','calls':[{'name':'ui.open_contact_form',
        'fields':[], 'query':'unapproved extra argument'}]})
    with pytest.raises(ValueError): chat.decode(bound, generated)
