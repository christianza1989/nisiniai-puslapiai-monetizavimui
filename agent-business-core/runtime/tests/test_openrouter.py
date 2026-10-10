import json
from decimal import Decimal
from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr, ValidationError
from sqlalchemy import select
from test_policy import configure

from pinet_core import budget, chat, jobs, text_provider
from pinet_core.config import Settings, settings
from pinet_core.contracts import Analysis
from pinet_core.db import db
from pinet_core.followup_projection import bind, verified_result
from pinet_core.models import CostReservation
from pinet_core.service import business
from pinet_core.text_tools import turn_schema


def router(monkeypatch):
    cfg = settings()
    for key, value in {'text_provider': 'openrouter', 'openrouter_model': 'google/gemini-3.8-flash',
            'openrouter_api_key': SecretStr('synthetic-router-credential'),
            'openrouter_max_prompt_price': 0.75, 'openrouter_max_completion_price': 3.75,
            'google_api_key': ''}.items():
        monkeypatch.setattr(cfg, key, value)
    return cfg


def mock_provider(monkeypatch, handler):
    original = httpx.AsyncClient
    def factory(**kwargs):
        return original(**kwargs, transport=httpx.MockTransport(handler))
    monkeypatch.setattr(text_provider.httpx, 'AsyncClient', factory)


@pytest.mark.parametrize('value,expected', [('0', 0), ('0.00000001', 1), (0.0001234, 124),
                                          (Decimal('0.04'), 40000)])
def test_cost_uses_total_charge_rounded_up(value, expected):
    assert text_provider.openrouter_cost({'cost': value, 'cost_details': {'upstream_inference_cost': 99}}) == expected


@pytest.mark.parametrize('value', [None, True, False, -1, 'NaN', 'Infinity', '-Infinity', 'bad', {}, []])
def test_missing_or_invalid_cost_is_not_treated_as_free(value):
    with pytest.raises(text_provider.ProviderError):
        text_provider.openrouter_cost({'cost': value})


def test_provider_configuration_is_explicit_and_voice_is_independent():
    cfg = Settings(_env_file=None, google_api_key='', text_provider='openrouter',
        openrouter_api_key='synthetic-router-credential', openrouter_model='google/gemini-3.8-flash',
        openrouter_max_prompt_price=0.75, openrouter_max_completion_price=3.75,
        chat_enabled=True, allow_simulation=False, global_daily_budget_microusd=100000,
        chat_turn_cost_ceiling_microusd=40000)
    assert cfg.chat_ready and not cfg.voice_ready and cfg.text_engine == 'openrouter:google/gemini-3.8-flash'
    assert 'synthetic-router-credential' not in repr(cfg)
    cfg.openrouter_model = 'openrouter/auto?unapproved=true'
    assert not cfg.chat_ready
    cfg.openrouter_model = 'google/gemini-3.8-flash'
    cfg.openrouter_max_prompt_price = 0
    assert not cfg.chat_ready
    with pytest.raises(ValidationError):
        Settings(_env_file=None, text_provider='unknown')


async def test_router_schema_and_real_tool_binding(monkeypatch):
    router(monkeypatch)
    requests = []
    def respond(request):
        requests.append(request)
        body = json.loads(request.content)
        assert str(request.url) == text_provider.OPENROUTER_URL
        assert body['model'] == 'google/gemini-3.8-flash'
        assert body['provider'] == {'require_parameters': True, 'allow_fallbacks': False,
            'data_collection': 'deny', 'max_price': {'prompt': 0.75, 'completion': 3.75}}
        assert body['response_format']['json_schema']['strict'] is True
        assert body['messages'][0]['role'] == 'system' and body['max_tokens'] == 2048
        return httpx.Response(200, json={'usage': {'cost': 0.000123}, 'choices': [{
            'finish_reason': 'stop', 'message': {'content': json.dumps({'reply': '', 'calls': [{
                'name': 'need.patch', 'fields': [{'field': 'quantity', 'value': '2'}], 'query': ''}]})}}]})
    mock_provider(monkeypatch, respond)
    schema = turn_schema('parasoplansetes', 'actual-client-event', 7)
    generated, cost = await chat.generate(schema, 'Synthetic instruction', {'need_revision': 7})
    decision = chat.decode(schema, generated)
    assert cost == 123 and len(requests) == 1
    assert decision.calls[0].arguments.base_revision == 7
    assert decision.calls[0].arguments.evidence_event_id == 'actual-client-event'
    generated['wire_text'] = json.dumps({'reply': '', 'calls': [{'name': 'need.patch',
        'fields': [{'field': 'quantity', 'value': '2'}], 'query': '', 'evidence_event_id': 'invented'}]})
    with pytest.raises(ValidationError):
        chat.decode(schema, generated)


@pytest.mark.parametrize('status', [401, 402, 429, 503, 302])
async def test_rejected_request_does_not_retry_or_leak_provider_body(monkeypatch, status):
    router(monkeypatch)
    count = []
    def reject(request):
        count.append(request)
        return httpx.Response(status, json={'error': {'message': 'synthetic-router-credential PRIVATE DATA'}},
                              headers={'location': 'https://unapproved.example'})
    mock_provider(monkeypatch, reject)
    with pytest.raises(text_provider.ProviderError) as raised:
        await text_provider.generate_json({}, 'synthetic', {}, max_output_tokens=16, timeout=1)
    assert raised.value.code == status and len(count) == 1
    assert 'credential' not in str(raised.value) and 'PRIVATE' not in str(raised.value)


async def test_timeout_does_not_retry(monkeypatch):
    router(monkeypatch)
    attempts = []
    def fail(request):
        attempts.append(1)
        raise httpx.ReadTimeout('synthetic timeout')
    mock_provider(monkeypatch, fail)
    with pytest.raises(httpx.ReadTimeout):
        await text_provider.generate_json({}, 'synthetic', {}, max_output_tokens=16, timeout=1)
    assert attempts == [1]


async def test_malformed_model_output_records_cost_before_validation(client, monkeypatch):
    item = await business('traktoriupadangos')
    cfg = router(monkeypatch)
    monkeypatch.setattr(cfg, 'global_daily_budget_microusd', 1000000)
    monkeypatch.setattr(cfg, 'analysis_cost_ceiling_microusd', 30000)
    assert (await configure(client, enabled=True, daily_budget_microusd=1000000)).status_code == 200
    key = 'router-malformed:' + str(uuid4())
    assert await budget.allow_analysis(item.id, key)
    mock_provider(monkeypatch, lambda req: httpx.Response(200, json={'usage': {'cost': 0.001001},
        'choices': [{'finish_reason': 'stop', 'message': {'content': 'invalid JSON'}}]}))
    with pytest.raises(ValueError):
        await jobs.model_output(Analysis, 'synthetic', {'business_id': item.id,
            'evidence': [{'id': 'client-fixture', 'speaker': 'client'}]}, key)
    async with db.transaction(item.id, cfg.environment) as tx:
        row = await tx.scalar(select(CostReservation).where(CostReservation.action_key == key))
        assert row.observed_microusd == 1001 and row.reserved_microusd == 30000


async def test_missing_cost_preserves_reservation(client, monkeypatch):
    item = await business('traktoriupadangos')
    cfg = router(monkeypatch)
    monkeypatch.setattr(cfg, 'global_daily_budget_microusd', 1000000)
    monkeypatch.setattr(cfg, 'analysis_cost_ceiling_microusd', 30000)
    assert (await configure(client, enabled=True, daily_budget_microusd=1000000)).status_code == 200
    key = 'router-unknown-cost:' + str(uuid4())
    assert await budget.allow_analysis(item.id, key)
    mock_provider(monkeypatch, lambda req: httpx.Response(200, json={'choices': []}))
    with pytest.raises(text_provider.ProviderError):
        await jobs.model_output(Analysis, 'synthetic', {'business_id': item.id, 'evidence': []}, key)
    async with db.transaction(item.id, cfg.environment) as tx:
        row = await tx.scalar(select(CostReservation).where(CostReservation.action_key == key))
        assert row.reserved_microusd == 30000 and not row.observed_microusd


async def test_openrouter_runs_through_signed_chat_tools_and_replay(client, monkeypatch):
    from conftest import edge
    from test_chat import chat_fixture
    session, item = await chat_fixture(client, monkeypatch)
    cfg = router(monkeypatch)
    requests = []
    def respond(request):
        requests.append(request)
        decision = {'reply': 'Užregistravau du įrenginius.', 'calls': []}
        if len(requests) == 1:
            decision = {'reply': '', 'calls': [{'name': 'need.patch',
                'fields': [{'field': 'quantity', 'value': '2'}], 'query': ''}]}
        return httpx.Response(200, json={'usage': {'cost': 0.001},
            'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(decision)}}]})
    mock_provider(monkeypatch, respond)
    body = {'request_id': str(uuid4()), 'text': 'Reikia dviejų vienetų.'}
    response = await edge(client, 'POST', 'traktoriupadangos', session, '/message', body)
    assert response.status_code == 200 and response.json()['reply'] == 'Užregistravau du įrenginius.'
    repeated = await edge(client, 'POST', 'traktoriupadangos', session, '/message', body)
    assert repeated.json()['replayed'] and len(requests) == 2
    status = (await edge(client, 'GET', 'traktoriupadangos', session)).json()
    assert status['need']['quantity']['value'] == '2'
    async with db.transaction(item.id, cfg.environment) as tx:
        key = f"chat:{session['conversation_id']}:{body['request_id']}"
        row = await tx.scalar(select(CostReservation).where(CostReservation.action_key == key))
        assert row.reserved_microusd == 40000 and row.observed_microusd == 2000


async def test_no_paid_request_when_existing_total_budget_is_exhausted(client, monkeypatch):
    from conftest import edge
    from test_chat import chat_fixture
    session, _ = await chat_fixture(client, monkeypatch)
    cfg = router(monkeypatch)
    monkeypatch.setattr(cfg, 'global_total_budget_microusd', 1)
    attempts = []
    def unexpected(request):
        attempts.append(1)
        raise AssertionError('provider call must be blocked before spending')
    mock_provider(monkeypatch, unexpected)
    response = await edge(client, 'POST', 'traktoriupadangos', session, '/message',
        {'request_id': str(uuid4()), 'text': 'Reikia dviejų vienetų.'})
    assert response.status_code == 429 and attempts == []


async def test_bounded_tool_sequence_finishes_with_real_reply_schema(client, monkeypatch):
    from conftest import edge
    from test_chat import chat_fixture
    session, item = await chat_fixture(client, monkeypatch)
    cfg = router(monkeypatch)
    requests = []
    def respond(request):
        body = json.loads(request.content)
        requests.append(body)
        if len(requests) == 1:
            decision = {'reply': '', 'calls': [{'name': 'need.patch',
                'fields': [{'field': 'quantity', 'value': '2'}], 'query': ''}]}
        elif len(requests) == 2:
            decision = {'reply': '', 'calls': [{'name': 'knowledge.resolve', 'fields': [], 'query': 'dokumentas'}]}
        else:
            assert set(body['response_format']['json_schema']['schema']['properties']) == {'reply'}
            decision = {'reply': 'Užregistravau du įrenginius. Kokią programą naudojate?'}
        return httpx.Response(200, json={'usage': {'cost': 0.001},
            'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(decision)}}]})
    mock_provider(monkeypatch, respond)
    body = {'request_id': str(uuid4()), 'text': 'Reikia dviejų vienetų.'}
    response = await edge(client, 'POST', 'traktoriupadangos', session, '/message', body)
    assert response.status_code == 200 and 'Kokią programą' in response.json()['reply']
    repeated = await edge(client, 'POST', 'traktoriupadangos', session, '/message', body)
    assert repeated.json()['replayed'] and len(requests) == 3
    async with db.transaction(item.id, cfg.environment) as tx:
        key = f"chat:{session['conversation_id']}:{body['request_id']}"
        row = await tx.scalar(select(CostReservation).where(CostReservation.action_key == key))
        assert row.observed_microusd == 3000


@pytest.mark.parametrize('reason,content', [('length', '{"reply":"unfinished"}'), ('content_filter', None)])
async def test_incomplete_output_cannot_be_accepted_but_retains_cost(monkeypatch, reason, content):
    router(monkeypatch)
    mock_provider(monkeypatch, lambda req: httpx.Response(200, json={'usage': {'cost': 0.001},
        'choices': [{'finish_reason': reason, 'message': {'content': content}}]}))
    result = await text_provider.generate_json({}, 'synthetic', {}, max_output_tokens=16, timeout=1)
    assert result.text == '' and result.amount_microusd == 1000


def test_router_followup_still_requires_exact_review_and_provenance(monkeypatch):
    cfg = router(monkeypatch)
    data = {'knowledge': {'site_id': 'parasoplansetes', 'canonical_host': 'parasoplansetes.lt',
        'deployment_id': 'fixture-deployment', 'knowledge_revision': 'revision', 'pages': []},
        'evidence': [{'id': 'client-fixture'}], 'test': True}
    value = bind(data, 'Dėl sprendimo', 'Sveiki, patikslinkite savo dokumentų procesą.',
                 {'approved': True, 'unsupported_claims': []}, cfg.text_engine)
    assert verified_result(data, {'validated_followup': value})
    value['body'] = 'Changed text without a new independent review.'
    assert verified_result(data, {'validated_followup': value}) is None
    value = bind(data, 'Dėl sprendimo', 'Sveiki, patikslinkite savo dokumentų procesą.',
                 {'approved': True, 'unsupported_claims': []}, 'openrouter:unapproved/other-model')
    assert verified_result(data, {'validated_followup': value}) is None
