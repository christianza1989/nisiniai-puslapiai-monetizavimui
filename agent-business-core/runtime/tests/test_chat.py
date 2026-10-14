import json
from uuid import uuid4
import pytest
from sqlalchemy import select
from conftest import start, edge
from pinet_core import chat
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Conversation, CostReservation, BusinessPolicy
from pinet_core.contracts import Policy
from pinet_core.service import business
from datetime import timedelta
from pinet_core.models import utcnow
from pinet_core import jobs


async def chat_fixture(client, monkeypatch):
    session = await start(client)
    cfg = settings()
    monkeypatch.setattr(cfg, 'allow_simulation', False)
    monkeypatch.setattr(cfg, 'chat_enabled', True)
    monkeypatch.setattr(cfg, 'chat_sites', ['traktoriupadangos'])
    monkeypatch.setattr(cfg, 'google_api_key', 'synthetic-not-called')
    monkeypatch.setattr(cfg, 'global_daily_budget_microusd', 1000000)
    monkeypatch.setattr(cfg, 'chat_turn_cost_ceiling_microusd', 40000)
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, cfg.environment) as tx:
        tx.add(BusinessPolicy(business_id=item.id, environment_id=cfg.environment,
            payload=Policy(enabled=True, daily_budget_microusd=1000000).model_dump(), revision=1))
        convo = await tx.get(Conversation, session['conversation_id'])
        convo.payload = {**convo.payload, 'mode': 'chat'}
    return session, item


async def test_text_auth_idempotency_and_real_core_need(client, monkeypatch):
    session, item = await chat_fixture(client, monkeypatch)
    calls = []
    async def generated(schema, instruction, data):
        calls.append(data)
        if len(calls) == 1:
            return schema.model_validate({'reply':'','calls':[{'name':'need.patch','arguments':{
                'base_revision':data['need_revision'], 'evidence_event_id':data['latest_client_event_id'],
                'fields':[{'field':'quantity','value':'2'}]}}]}), 1000
        return schema.model_validate({'reply':'Užregistravau du įrenginius.','calls':[]}), 1000
    monkeypatch.setattr(chat, 'generate', generated)
    body = {'request_id':str(uuid4()), 'text':'Reikia dviejų vienetų.'}
    wrong = await edge(client, 'POST', 'traktoriupadangos', {**session,'session_token':'wrong'}, '/message', body)
    assert wrong.status_code == 401 and not calls
    reply = await edge(client,'POST','traktoriupadangos',session,'/message',body)
    assert reply.status_code == 200 and 'du' in reply.json()['reply']
    again = await edge(client,'POST','traktoriupadangos',session,'/message',body)
    assert again.json()['replayed'] and len(calls) == 2
    conflict = await edge(client,'POST','traktoriupadangos',session,'/message',{**body,'text':'Reikia trijų.'})
    assert conflict.status_code == 409
    status = (await edge(client,'GET','traktoriupadangos',session)).json()
    assert status['need']['quantity']['value'] == '2'
    async with db.transaction(item.id, settings().environment) as tx:
        row = await tx.scalar(select(CostReservation).where(CostReservation.action_key == f"chat:{session['conversation_id']}:{body['request_id']}"))
        assert row.observed_microusd == 2000


async def test_failed_turn_replay_does_not_bill_or_repeat_tools(client, monkeypatch):
    session, _ = await chat_fixture(client, monkeypatch)
    calls = []
    async def fail(*args):
        calls.append(1)
        raise RuntimeError('provider_unavailable')
    monkeypatch.setattr(chat,'generate',fail)
    body = {'request_id':str(uuid4()),'text':'Ką galite pasiūlyti?'}
    first = await edge(client,'POST','traktoriupadangos',session,'/message',body)
    second = await edge(client,'POST','traktoriupadangos',session,'/message',body)
    assert first.status_code == 503 and second.status_code == 409 and len(calls) == 1
    await edge(client,'POST','traktoriupadangos',session,'/end',{})
    ended = await edge(client,'POST','traktoriupadangos',session,'/message',{**body,'request_id':str(uuid4())})
    assert ended.status_code == 409


async def test_chat_disabled_never_calls_provider(client, monkeypatch):
    session = await start(client)
    monkeypatch.setattr(settings(),'chat_enabled',False)
    result = await edge(client,'POST','traktoriupadangos',session,'/message',{'request_id':str(uuid4()),'text':'Sveiki'})
    assert result.status_code == 503


async def test_text_has_separate_deadline_from_voice_reaper(client, monkeypatch):
    session, item = await chat_fixture(client, monkeypatch)
    monkeypatch.setattr(settings(), 'session_seconds', 120)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session['conversation_id'])
        convo.created_at = utcnow() - timedelta(seconds=180)
    await jobs.maintenance(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session['conversation_id'])
        assert convo.state != 'finalized'
        convo.created_at = utcnow() - timedelta(seconds=1801)
    await jobs.maintenance(item.id)
    assert (await edge(client,'GET','traktoriupadangos',session)).json()['state'] == 'finalized'
