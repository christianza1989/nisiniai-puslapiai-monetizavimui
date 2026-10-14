"""Niche admission and contact/need flow through the shared core; no model or SMTP."""
import pytest
from conftest import edge, knowledge, worker
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core import agent_instructions, knowledge as store, profiles
from pinet_core.config import settings
from pinet_core.contracts import Knowledge
from pinet_core.db import db
from pinet_core.models import Business, Case, KnowledgeState, BusinessPolicy, PolicyRevision, Visitor, new_id

SITE = 'parasoplansetes'


def test_profile_does_not_grant_channel_or_foreign_brand_authority():
    cfg = settings()
    profile = profiles.get(SITE, 'parasoplansetes.lt')
    assert 'quantity' in profile.need_fields and 'software' in profile.need_fields
    assert SITE not in cfg.voice_sites or not cfg.voice_ready
    for role in ('conversation', 'sales', 'supplier', 'quality'):
        release = agent_instructions.compose(SITE, role)
        assert len(release.hash) == 64 and 'StepOver' in release.prompt
        assert all('/niches/traktoriupadangos/' not in path for path in release.sources)
    with pytest.raises(Exception):
        profiles.get(SITE, 'signaturepads.lt')


async def test_new_site_requires_source_admission_then_saves_correction_and_contact(client):
    cfg = settings()
    engine = create_async_engine(cfg.admin_database_url)
    async with engine.begin() as tx:
        row = await tx.scalar(select(Business.id).where(Business.site_id == SITE))
        if not row:
            await tx.execute(Business.__table__.insert().values(id=new_id(), site_id=SITE,
                canonical_host='parasoplansetes.lt'))
    await engine.dispose()
    from pinet_core.service import business
    item = await business(SITE)
    try:
        headers = {'Authorization': 'Bearer ' + cfg.worker_secret}
        value = {'knowledge': knowledge(SITE), 'notice_version': 'test-only', 'consent': True,
                 'mode': 'simulation', 'remember': True}
        denied = await client.post(f'/internal/sites/{SITE}/simulation', json=value, headers=headers)
        assert denied.status_code == 409 and denied.json()['detail'] == 'site_source_not_admitted'
        async with db.transaction(item.id, cfg.environment) as tx:
            await store.register(tx, item, Knowledge.model_validate(value['knowledge']))
        admitted = await client.put(f'/operator/sites/{SITE}/onboarding',
            json={'source_ready': True, 'learning_admitted': True},
            headers={'Authorization': 'Bearer ' + cfg.operator_secret})
        assert admitted.status_code == 200
        created = await client.post(f'/internal/sites/{SITE}/simulation', json=value, headers=headers)
        assert created.status_code == 200
        session = created.json()
        claimed = await worker(client, session, '/claim', {'owner': 'niche-test'}, site=SITE)
        epoch = claimed.json()['epoch']
        spoken = await worker(client, session, '/events', {'epoch': epoch, 'event_key': 'corrected',
            'kind': 'client_transcript', 'text': 'Pataisau: reikia dviejų įrenginių, ne keturių.'}, site=SITE)
        patched = await worker(client, session, '/tools', {'epoch': epoch, 'call_id': new_id(),
            'name': 'need.patch', 'arguments': {'base_revision': 0, 'fields': {'quantity': '2'},
                'evidence_event_id': spoken.json()['event_id']}}, site=SITE)
        assert patched.status_code == 200
        form = await worker(client, session, '/tools', {'epoch': epoch, 'call_id': new_id(),
            'name': 'ui.open_contact_form', 'arguments': {}}, site=SITE)
        assert form.status_code == 200
        shown = await edge(client, 'POST', SITE, session, '/ui', {'request_id': form.json()['request_id'], 'state': 'shown'})
        assert shown.status_code == 200
        saved = await edge(client, 'POST', SITE, session, '/contact', {'channel': 'email',
            'value': 'calibration@client.example', 'purpose': 'followup', 'consent': True, 'notice_version': 'test-only'})
        assert saved.status_code == 200
        state = await edge(client, 'GET', SITE, session)
        assert state.json()['need']['quantity']['value'] == '2'
        assert state.json()['contacts'][0]['channel'] == 'email'
        other = await edge(client, 'GET', 'traktoriupadangos', session)
        assert other.status_code == 404
        ended = await edge(client, 'POST', SITE, session, '/end')
        assert ended.status_code == 200
        resumed = await client.post(f'/internal/sites/{SITE}/simulation',
            json={**value, 'memory_token': session['memory_token']}, headers=headers)
        assert resumed.status_code == 200
        returned = await worker(client, resumed.json(), '/claim', {'owner': 'returning-niche-test'}, site=SITE)
        remembered = returned.json()['memory']
        assert resumed.json()['conversation_id'] != session['conversation_id']
        assert remembered['identity_assurance'] == 'device_only'
        assert remembered['history_is_not_current_business_truth'] is True
        assert [e['text'] for c in remembered['conversations'] for e in c['evidence']] == [
            'Pataisau: reikia dviejų įrenginių, ne keturių.']
    finally:
        async with db.transaction(item.id, cfg.environment) as tx:
            for table in (Case, Visitor, KnowledgeState, BusinessPolicy, PolicyRevision):
                await tx.execute(delete(table))
