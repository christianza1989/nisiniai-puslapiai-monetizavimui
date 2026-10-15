"""Real scoped PostgreSQL startup/tool tests; no model, mail or voice calls."""

import asyncio
import copy
from datetime import timedelta
from uuid import uuid4

import pytest
from conftest import claim, edge, knowledge, start, worker
from pydantic import ValidationError
from sqlalchemy import func, select
from test_knowledge_index import complete, snapshot, transfer, upload
from test_policy import configure

from pinet_core import knowledge as store
from pinet_core import knowledge_index as index
from pinet_core import onboarding, policy, profiles, service
from pinet_core.config import settings
from pinet_core.contracts import Start, StartV2
from pinet_core.db import db
from pinet_core.models import Admission, Case, Conversation, CostReservation, Event, Visitor, utcnow

PATH = '/internal/sites/traktoriupadangos/simulation/v2'


def request(reference=None, **changes):
    return {'request_id': str(uuid4()), 'knowledge_ref': reference or {
        'schema_version': 2, 'knowledge_revision': 1, 'knowledge_hash': 'a' * 64,
        'deployment_id': 'synthetic-public-deployment'},
        'notice_version': 'synthetic-test-only', 'consent': True,
        'mode': 'simulation', **changes}


async def current_request(**changes):
    revision, _, payload = await snapshot()
    return request({'schema_version': 2, 'knowledge_revision': revision,
        'knowledge_hash': payload['hash'],
        'deployment_id': payload['knowledge']['deployment_id']}, **changes)


async def begin(client, body=None, path=PATH, authenticated=True):
    headers = {'Authorization': 'Bearer ' + settings().worker_secret} if authenticated else {}
    return await client.post(path, json=body or await current_request(), headers=headers)


async def import_public(client, count=31, long=True, base=0, transfer_id='synthetic-v2-source'):
    header, fragments, pages = transfer(count, long=long, base=base, transfer_id=transfer_id)
    await upload(client, header, fragments)
    response = await complete(client, header)
    assert response.status_code == 200, response.text
    return header, pages


async def lookup(client, session, epoch, query, call_id='synthetic-lookup'):
    return await worker(client, session, '/tools', {'epoch': epoch, 'call_id': call_id,
        'name': 'knowledge.resolve', 'arguments': {'query': query}})


async def counts():
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        return [await tx.scalar(select(func.count()).select_from(model))
                for model in (Conversation, Case, Visitor, Event)]


@pytest.mark.parametrize('changes', [
    {'mode': 'voice'}, {'knowledge': knowledge()}, {'consent': False},
    {'notice_version': ''}, {'contact_email': 'invented@example.test'},
    {'operator': 'Invented operator'},
])
def test_v2_request_cannot_carry_facts_or_live_mode(changes):
    with pytest.raises(ValidationError):
        StartV2.model_validate(request(**changes))


@pytest.mark.parametrize('revision', [True, '1', 1.0, 0, -1])
def test_reference_revision_is_an_exact_positive_integer(revision):
    body = request()
    body['knowledge_ref']['knowledge_revision'] = revision
    with pytest.raises(ValidationError):
        StartV2.model_validate(body)


def test_legacy_start_contract_is_still_separate():
    original = {'knowledge': knowledge(), 'notice_version': '', 'consent': True}
    assert Start.model_validate(original).mode == 'voice'
    with pytest.raises(ValidationError):
        Start.model_validate(request())
    assert set(Start.model_fields) == {
        'request_id', 'knowledge', 'notice_version', 'consent', 'mode', 'remember', 'memory_token'}


async def test_31_pages_long_text_start_reuses_tools_and_never_registers_or_renews(client, monkeypatch):
    _, pages = await import_public(client)
    before = await snapshot()

    async def forbidden_register(*args, **kwargs):
        raise AssertionError('V2 reference startup must not register a V1 projection')

    monkeypatch.setattr(store, 'register', forbidden_register)
    body = await current_request(remember=True)
    response = await begin(client, body)
    assert response.status_code == 200, response.text
    session = response.json()
    assert session['test'] is True and session['memory_token']
    assert await snapshot() == before
    assert (await begin(client, body)).json() == session
    assert await snapshot() == before
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session['conversation_id'])
        assert convo.payload['knowledge_ref'] == body['knowledge_ref']
        assert convo.payload['knowledge']['pages'] == []
        assert convo.payload['knowledge']['schema_version'] == 2
        assert convo.payload['active_page_count'] == 31
        assert convo.payload['cost_ceiling_microusd'] == 0
        assert 'unique_tail_fact' not in convo.payload['prompt']
        assert not (await onboarding.status(tx, item.site_id))['learning_admitted']
    async with db.registry() as tx:
        for model in (Admission, CostReservation):
            assert await tx.scalar(select(func.count()).select_from(model).where(
                model.environment_id == settings().environment)) == 0
    epoch = await claim(client, session)
    tail = (await lookup(client, session, epoch, 'unique_tail_fact_42085R28')).json()
    assert tail['sources'][0]['revision_hash'] == pages[0]['revision_hash']
    assert 'unique_tail_fact_42085R28' in tail['sources'][0]['text']
    assert len(tail['sources'][0]['text']) <= 4000
    last = (await lookup(client, session, epoch, '30', call_id='last-page')).json()
    assert [p['id'] for p in last['sources']] == ['30']


@pytest.mark.parametrize('field,value', [
    ('knowledge_revision', 999), ('knowledge_hash', '0' * 64), ('deployment_id', 'foreign-deployment'),
])
async def test_stale_reference_rejects_without_any_session_or_memory_write(client, field, value):
    await import_public(client, count=2, long=False)
    body = await current_request(remember=True)
    body['knowledge_ref'][field] = value
    before, row_counts = await snapshot(), await counts()
    response = await begin(client, body)
    assert response.status_code == 409 and response.json()['detail'] == 'knowledge_reference_conflict'
    assert await snapshot() == before and await counts() == row_counts


async def test_ttl_expiry_is_rejected_not_renewed_even_on_idempotent_replay(client):
    await import_public(client, count=2, long=False)
    body = await current_request()
    session = (await begin(client, body)).json()
    epoch = await claim(client, session)
    assert (await lookup(client, session, epoch, 'Public')).json()['sources']
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        state = await store.current(tx)
        state.refreshed_at = utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)
    before = await snapshot()
    response = await begin(client, body)
    assert response.status_code == 409 and response.json()['detail'] == 'knowledge_snapshot_expired'
    assert (await lookup(client, session, epoch, 'Public')).json()['reason'] == 'knowledge_snapshot_expired'
    assert await snapshot() == before


@pytest.mark.parametrize('damage,reason', [
    ('receipt_missing', 'knowledge_v2_source_unavailable'),
    ('receipt_status', 'knowledge_v2_source_unavailable'),
    ('receipt_hash', 'knowledge_index_receipt_conflict'),
    ('receipt_count', 'knowledge_index_receipt_conflict'),
    ('site', 'knowledge_mapping_conflict'),
    ('host', 'knowledge_mapping_conflict'),
    ('page_host', 'knowledge_provenance_conflict'),
])
async def test_complete_receipt_and_actual_scope_are_required(client, damage, reason):
    await import_public(client, count=2, long=False)
    body = await current_request(remember=True)
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        state = await store.current(tx)
        payload = copy.deepcopy(state.payload)
        if damage == 'receipt_missing':
            payload.pop('index_receipt')
        elif damage == 'receipt_status':
            payload['index_receipt']['status'] = 'pending'
        elif damage == 'receipt_hash':
            payload['index_receipt']['content_hash'] = '0' * 64
        elif damage == 'receipt_count':
            payload['index_receipt']['page_count'] = 999
        elif damage == 'site':
            payload['knowledge']['site_id'] = 'greitossvetaines'
        elif damage == 'host':
            payload['knowledge']['canonical_host'] = 'greitossvetaines.lt'
        else:
            payload['knowledge']['pages'][0]['url'] = 'https://foreign.example/guide'
        state.payload = payload
    before, row_counts = await snapshot(), await counts()
    response = await begin(client, body)
    assert response.status_code == 409 and response.json()['detail'] == reason
    assert await snapshot() == before and await counts() == row_counts


async def test_partial_index_and_v1_source_do_not_qualify(client):
    header, fragments, _ = transfer(base=0)
    await upload(client, header, fragments)
    body = request()
    assert (await begin(client, body)).json()['detail'] == 'knowledge_v2_source_unavailable'
    # The original V1 endpoint can still start; this invalidates the V2 staging base.
    await start(client)
    assert (await begin(client, await current_request())).json()['detail'] == 'knowledge_v2_source_unavailable'
    assert (await complete(client, header)).status_code == 409


async def test_source_admission_is_independent_and_remains_off(client):
    await import_public(client, count=2, long=False)
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        state = await store.current(tx)
        state.payload = {**state.payload, 'onboarding': {
            'source_ready': False, 'learning_admitted': False}}
    before = await snapshot()
    response = await begin(client)
    assert response.status_code == 409 and response.json()['detail'] == 'site_source_not_admitted'
    assert await snapshot() == before


async def test_policy_pause_and_disabled_tool_are_not_overridden(client):
    await import_public(client, count=2, long=False)
    # Explicit internal simulation retains the existing disabled-by-default policy rule.
    session = (await begin(client)).json()
    epoch = await claim(client, session)
    assert (await configure(client, allowed_tools=[])).status_code == 200
    assert (await lookup(client, session, epoch, 'Guide')).status_code == 403
    assert (await configure(client, revision=1, paused=True)).status_code == 200
    row_counts = await counts()
    assert (await begin(client)).status_code == 503
    assert await counts() == row_counts


async def test_worker_only_local_switch_and_no_live_dispatch(client, monkeypatch):
    await import_public(client, count=2, long=False)
    body = await current_request()
    assert (await begin(client, body, authenticated=False)).status_code == 401
    assert (await client.post(PATH, json=body, headers={
        'Authorization': 'Bearer ' + settings().operator_secret})).status_code == 401
    for field, value in [('allow_simulation', False), ('environment', 'production')]:
        with monkeypatch.context() as scoped:
            scoped.setattr(settings(), field, value)
            assert (await begin(client, body)).status_code == 403
    with pytest.raises(Exception, match='local simulation only'):
        await service.start(await service.business('traktoriupadangos'), StartV2.model_validate(body))
    # Legacy public voice admission remains closed; V2 is not accepted by that DTO.
    assert (await client.post('/v1/sites/traktoriupadangos/sessions', json=body)).status_code == 401


async def test_cross_site_and_missing_profile_cannot_use_another_index(client, monkeypatch):
    await import_public(client, count=2, long=False)
    body = await current_request()
    assert (await begin(client, body, path='/internal/sites/greitossvetaines/simulation/v2')).status_code == 409
    assert (await begin(client, body, path='/internal/sites/unregistered/simulation/v2')).status_code == 404
    with monkeypatch.context() as scoped:
        scoped.setattr(profiles, 'PROFILES', {})
        response = await begin(client, body)
        assert response.status_code == 503 and response.json()['detail'] == 'business_profile_not_ready'


async def test_revocation_requires_current_revision_and_stops_exposed_session(client):
    _, pages = await import_public(client)
    original = await current_request()
    session = (await begin(client, original)).json()
    epoch = await claim(client, session)
    assert (await lookup(client, session, epoch, '30')).json()['sources']
    path = '/operator/sites/traktoriupadangos/knowledge/v2/revoke'
    headers = {'Authorization': 'Bearer ' + settings().operator_secret}
    response = await client.post(path, headers=headers, json={
        'base_revision': original['knowledge_ref']['knowledge_revision'],
        'revision_hashes': [pages[30]['revision_hash']], 'reason': 'Synthetic source withdrawn'})
    assert response.status_code == 200 and response.json()['finalized_sessions'] == 1
    assert (await edge(client, 'GET', 'traktoriupadangos', session)).json()['state'] == 'finalized'
    assert (await lookup(client, session, epoch, '30')).status_code == 409
    current = await current_request()
    assert current['knowledge_ref']['knowledge_hash'] == original['knowledge_ref']['knowledge_hash']
    assert current['knowledge_ref']['knowledge_revision'] > original['knowledge_ref']['knowledge_revision']
    assert (await begin(client, original)).json()['detail'] == 'knowledge_reference_conflict'
    fresh = (await begin(client, current)).json()
    fresh_epoch = await claim(client, fresh)
    assert not (await lookup(client, fresh, fresh_epoch, '30')).json()['sources']
    assert (await lookup(client, fresh, fresh_epoch, 'unique_tail_fact_42085R28', 'tail')).json()['sources']
    response = await client.post(path, headers=headers, json={
        'base_revision': current['knowledge_ref']['knowledge_revision'],
        'revision_hashes': [p['revision_hash'] for p in pages], 'reason': 'Synthetic entire source withdrawn'})
    assert response.status_code == 200
    before, row_counts = await snapshot(), await counts()
    response = await begin(client)
    assert response.status_code == 409 and response.json()['detail'] == 'knowledge_projection_empty'
    assert await snapshot() == before and await counts() == row_counts


async def test_current_source_version_overrides_tool_cache_and_old_start_reference(client):
    await import_public(client, count=2, long=False)
    body = await current_request()
    session = (await begin(client, body)).json()
    epoch = await claim(client, session)
    initial = (await lookup(client, session, epoch, 'Public')).json()
    await import_public(client, count=3, long=False, base=body['knowledge_ref']['knowledge_revision'],
                        transfer_id='synthetic-new-public-source')
    updated = (await lookup(client, session, epoch, 'Public')).json()
    assert updated['knowledge_revision'] > initial['knowledge_revision']
    assert len(updated['sources']) == 3
    assert (await begin(client, body)).json()['detail'] == 'knowledge_reference_conflict'
    assert (await begin(client)).status_code == 200
    # The legacy downgrade protection must still reject a replacement V1 start.
    response = await client.post('/internal/sites/traktoriupadangos/simulation', json={
        'knowledge': knowledge(), 'notice_version': 'synthetic-test', 'consent': True, 'mode': 'simulation'},
        headers={'Authorization': 'Bearer ' + settings().worker_secret})
    assert response.status_code == 409 and response.json()['detail'] == 'knowledge_v2_downgrade_forbidden'


async def test_commit_lock_serializes_reference_start_and_rejects_just_superseded_source(client):
    await import_public(client, count=2, long=False)
    body = await current_request()
    header, fragments, _ = transfer(count=3, base=body['knowledge_ref']['knowledge_revision'],
                                     transfer_id='synthetic-racing-source')
    await upload(client, header, fragments)
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        await index.locked(tx, item)
        pending = asyncio.create_task(begin(client, body))
        await asyncio.sleep(0.1)
        assert not pending.done()
        await index.commit(tx, item, index.Commit.model_validate({
            'transfer_id': header['transfer_id'], 'content_hash': header['content_hash']}))
    response = await pending
    assert response.status_code == 409 and response.json()['detail'] == 'knowledge_reference_conflict'
    assert await counts() == [0, 0, 0, 0]


async def test_idempotency_and_memory_authority_remain_shared(client):
    await import_public(client, count=2, long=False)
    body = await current_request(remember=True)
    session = (await begin(client, body)).json()
    assert (await begin(client, body)).json() == session
    conflict = {**body, 'notice_version': 'changed-consent-version'}
    assert (await begin(client, conflict)).status_code == 409
    epoch = await claim(client, session)
    assert (await worker(client, session, '/events', {'epoch': epoch, 'event_key': 'synthetic-client',
        'kind': 'client_transcript', 'text': 'Tai sintetinė ankstesnio pokalbio žinutė.'})).status_code == 200
    next_session = (await begin(client, await current_request(
        remember=True, memory_token=session['memory_token']))).json()
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        first = await tx.get(Conversation, session['conversation_id'])
        second = await tx.get(Conversation, next_session['conversation_id'])
        assert first.visitor_id == second.visitor_id
    remembered = await worker(client, next_session, '/claim', {'owner': 'synthetic-next-worker'})
    assert remembered.json()['memory']['conversations'][0]['conversation_id'] == session['conversation_id']
