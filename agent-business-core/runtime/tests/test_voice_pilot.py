from uuid import uuid4

import pytest
from fastapi import HTTPException
from conftest import knowledge
from test_policy import configure
from pinet_core import service
from pinet_core.config import settings
from pinet_core.contracts import Start
from pinet_core.db import db
from pinet_core.models import Conversation


async def test_browser_pilot_is_paid_site_scoped_and_not_m0_certification(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, 'allow_simulation', False)
    monkeypatch.setattr(cfg, 'voice_enabled', False)
    monkeypatch.setattr(cfg, 'm0_verified', False)
    monkeypatch.setattr(cfg, 'm0_probe_enabled', True)
    monkeypatch.setattr(cfg, 'voice_pilot_enabled', True)
    monkeypatch.setattr(cfg, 'voice_pilot_sites', ['traktoriupadangos'])
    monkeypatch.setattr(cfg, 'google_api_key', 'synthetic-not-called')
    monkeypatch.setattr(cfg, 'livekit_url', 'wss://synthetic.invalid')
    monkeypatch.setattr(cfg, 'livekit_api_key', 'synthetic')
    monkeypatch.setattr(cfg, 'livekit_api_secret', 'synthetic')
    monkeypatch.setattr(cfg, 'global_daily_budget_microusd', 1000000)
    monkeypatch.setattr(cfg, 'voice_cost_ceiling_microusd', 100000)
    assert (await configure(client, enabled=True, daily_budget_microusd=1000000)).status_code == 200
    assert cfg.voice_pilot_ready and not cfg.voice_ready and not cfg.m0_verified
    item = await service.business('traktoriupadangos')
    data = Start(request_id=uuid4(), knowledge=knowledge(), consent=True, notice_version='pilot-test', mode='voice_pilot')
    session = await service.start(item, data)
    async with db.transaction(item.id, cfg.environment) as tx:
        convo = await tx.get(Conversation, session['conversation_id'])
        assert convo.payload['voice_pilot'] and not convo.payload['test']
    with pytest.raises(HTTPException, match='voice_not_ready'):
        await service.start(item, data.model_copy(update={'mode':'voice', 'request_id':uuid4()}))
    url = f"/internal/sites/traktoriupadangos/sessions/{session['conversation_id']}/claim"
    headers = {'Authorization':f'Bearer {cfg.worker_secret}'}
    wrong = await client.post(url, headers=headers, json={'owner':'pilot-worker'})
    assert wrong.status_code == 403
    correct = await client.post(url, headers=headers, json={'owner':'pilot-worker','voice_pilot':True})
    assert correct.status_code == 200
    monkeypatch.setattr(cfg, 'voice_pilot_enabled', False)
    assert (await client.post(url, headers=headers, json={'owner':'pilot-worker','voice_pilot':True})).status_code == 403
    monkeypatch.setattr(cfg, 'voice_pilot_enabled', True)
    monkeypatch.setattr(cfg, 'voice_pilot_sites', ['other-site'])
    with pytest.raises(HTTPException, match='voice_pilot_not_ready'):
        await service.start(item, data.model_copy(update={'request_id':uuid4()}))
    monkeypatch.setattr(cfg, 'voice_pilot_sites', ['traktoriupadangos'])
    monkeypatch.setattr(cfg, 'livekit_url', 'ws://127.0.0.1:17980')
    assert not cfg.voice_pilot_ready
