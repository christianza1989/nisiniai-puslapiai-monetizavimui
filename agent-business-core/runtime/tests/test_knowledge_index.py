import asyncio
import copy
from datetime import timedelta

import pytest
from conftest import knowledge, start
from pydantic import ValidationError

from pinet_core import knowledge as store
from pinet_core import knowledge_index as index
from pinet_core.config import settings
from pinet_core.contracts import Knowledge, KnowledgeQuery
from pinet_core.db import db
from pinet_core.models import utcnow
from pinet_core.security import digest
from pinet_core.service import business


def transfer(count=31, long=False, transfer_id='transfer-1', base=1):
    metadata = {k: v for k, v in knowledge().items() if k != 'pages'}
    metadata['deployment_id'] = 'complete-deployment'
    pages, fragments = [], []
    for ordinal in range(count):
        text = 'Public page ' + str(ordinal)
        if long and ordinal == 0:
            text = ('Long guide. ' * 4500) + ' unique_tail_fact_42085R28'
        page = {'id': str(ordinal), 'title': 'Guide ' + str(ordinal),
            'url': 'https://traktoriupadangos.lt/guide-' + str(ordinal), 'text': text,
            'revision_hash': digest('revision' + str(ordinal)), 'projection_hash': digest(text)}
        pages.append(page)
        parts = [text[i:i+18000] for i in range(0, len(text), 18000)]
        for part, value in enumerate(parts):
            fragments.append({**page, 'text': value, 'ordinal': len(fragments),
                'page_ordinal': ordinal, 'part': part, 'parts': len(parts)})
    header = {'schema_version': 2, 'transfer_id': transfer_id, 'base_revision': base,
        'metadata': metadata, 'page_count': len(pages), 'fragment_count': len(fragments),
        'content_hash': index.content_hash(metadata, pages)}
    return header, fragments, pages


async def call(client, action, value):
    return await client.post('/internal/sites/traktoriupadangos/knowledge/v2/' + action,
        json=value, headers={'Authorization': 'Bearer ' + settings().worker_secret})


async def upload(client, header, fragments):
    assert (await call(client, 'begin', header)).status_code == 200
    for i in range(0, len(fragments), 10):
        response = await call(client, 'batch', {'transfer_id': header['transfer_id'],
            'fragments': fragments[i:i+10]})
        assert response.status_code == 200, response.text


async def complete(client, header):
    return await call(client, 'commit', {k: header[k] for k in ('transfer_id', 'content_hash')})


async def snapshot():
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        state = await store.current(tx)
        return state.revision, state.refreshed_at, copy.deepcopy(state.payload)


def test_v1_limits_unchanged_and_fragment_hash_checks_complete_inventory():
    header, fragments, pages = transfer(long=True)
    with pytest.raises(ValidationError):
        Knowledge.model_validate({**header['metadata'], 'pages': pages})
    assert index.assemble(header, {str(p['ordinal']): p for p in fragments}) == pages
    with pytest.raises(Exception, match='knowledge_fragments_incomplete'):
        index.assemble(header, {str(p['ordinal']): p for p in fragments[:-1]})


async def test_atomic_31_pages_and_long_guide_retry_and_tail_retrieval(client):
    await start(client)
    before = await snapshot()
    header, fragments, pages = transfer(long=True)
    await upload(client, header, fragments[:-1])
    assert (await snapshot())[:2] == before[:2]
    assert (await snapshot())[2]['knowledge'] == before[2]['knowledge']
    assert (await complete(client, header)).status_code == 409
    assert (await call(client, 'batch', {'transfer_id': header['transfer_id'],
        'fragments': fragments[-1:]})).status_code == 200
    result = await complete(client, header)
    assert result.status_code == 200 and result.json()['page_count'] == 31
    assert (await snapshot())[2]['knowledge']['pages'] == pages
    assert (await complete(client, header)).json() == result.json()
    assert (await call(client, 'begin', {**header, 'base_revision': 2})).status_code == 409
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        found = await store.resolve(tx, KnowledgeQuery(query='unique_tail_fact_42085R28'))
        assert 'unique_tail_fact_42085R28' in found['sources'][0]['text']
        assert len(found['sources'][0]['text']) <= 4000


async def test_first_staging_is_not_available_and_wrong_site_rejected(client):
    header, fragments, _ = transfer(base=0)
    bad = copy.deepcopy(header)
    bad['metadata']['site_id'] = 'dovanos123'
    assert (await call(client, 'begin', bad)).status_code == 409
    await upload(client, header, fragments)
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        assert await store.projection(tx) is None
        assert (await store.resolve(tx, KnowledgeQuery(query='guide')))['status'] == 'unavailable'
    assert (await complete(client, header)).status_code == 200


@pytest.mark.parametrize('mutation', ['text', 'host', 'duplicate_page', 'missing_part'])
async def test_changed_fragments_cannot_publish(client, mutation):
    await start(client)
    header, fragments, _ = transfer(2, long=True)
    await upload(client, header, fragments)
    before = await snapshot()
    changed = copy.deepcopy(fragments[0])
    if mutation == 'text':
        changed['text'] = 'different'
    elif mutation == 'host':
        changed['url'] = 'https://other.lt/'
    elif mutation == 'duplicate_page':
        changed['id'] = '1'
    else:
        changed['part'] = 1
    assert (await call(client, 'batch', {'transfer_id': header['transfer_id'],
        'fragments': [changed]})).status_code == 409
    assert await snapshot() == before


async def test_expired_staging_no_ttl_renewal_and_replacement(client):
    await start(client)
    header, fragments, _ = transfer(2)
    await upload(client, header, fragments)
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        state = await store.current(tx)
        pending = state.payload['pending_index']
        state.payload = {**state.payload, 'pending_index': {**pending,
            'expires_at': (utcnow() - timedelta(seconds=1)).isoformat()}}
    before = (await snapshot())[:2]
    assert (await complete(client, header)).status_code == 409
    assert (await snapshot())[:2] == before
    header['transfer_id'] = 'replacement'
    await upload(client, header, fragments)
    assert (await complete(client, header)).status_code == 200


async def test_revocation_during_import_fences_commit_and_bulk_over_30(client):
    await start(client)
    header, fragments, _ = transfer()
    await upload(client, header, fragments)
    path = '/operator/sites/traktoriupadangos/knowledge/v2/revoke'
    headers = {'Authorization': 'Bearer ' + settings().operator_secret}
    hashes = [f['revision_hash'] for f in fragments]
    revoked = await client.post(path, json={'base_revision': 1, 'revision_hashes': hashes,
        'reason': 'Withdraw all 31 source revisions'}, headers=headers)
    assert revoked.status_code == 200 and len(revoked.json()['revoked']) == 31
    assert (await complete(client, header)).status_code == 409
    item = await business('traktoriupadangos')
    # A fenced-out staging transaction can be replaced immediately, rather
    # than making a source revocation wait for the staging timeout.
    header.update(transfer_id='new-transfer', base_revision=2)
    await upload(client, header, fragments)
    assert (await complete(client, header)).status_code == 200
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await store.projection(tx))['pages'] == []


async def test_checksum_and_duplicate_page_prevent_false_complete(client):
    await start(client)
    header, fragments, _ = transfer(2)
    header['content_hash'] = '0' * 64
    await upload(client, header, fragments)
    assert (await complete(client, header)).status_code == 409
    assert (await snapshot())[0] == 1


async def test_identical_refresh_changes_freshness_not_revision(client):
    await start(client)
    header, fragments, _ = transfer(2)
    await upload(client, header, fragments)
    first = (await complete(client, header)).json()
    next_header, fragments, pages = transfer(2, transfer_id='next', base=first['revision'])
    next_header['metadata']['generated_at'] = '2026-10-04T00:00:00Z'
    next_header['content_hash'] = index.content_hash(next_header['metadata'], pages)
    await upload(client, next_header, fragments)
    assert (await complete(client, next_header)).json()['revision'] == first['revision']


async def test_ingest_requires_private_worker_auth(client):
    header, _, _ = transfer()
    response = await client.post('/internal/sites/traktoriupadangos/knowledge/v2/begin', json=header)
    assert response.status_code == 401


async def test_concurrent_commit_replay_publishes_only_one_revision(client):
    await start(client)
    header, fragments, _ = transfer()
    await upload(client, header, fragments)
    first, second = await asyncio.gather(complete(client, header), complete(client, header))
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json() and first.json()['revision'] == 2


async def test_v1_change_invalidates_staging_and_v1_cannot_downgrade_active_v2(client):
    await start(client)
    header, fragments, _ = transfer(2)
    await upload(client, header, fragments)
    item = await business('traktoriupadangos')
    new = knowledge()
    new['pages'][0]['text'] = 'Current v1 correction'
    async with db.transaction(item.id, settings().environment) as tx:
        await store.register(tx, item, Knowledge.model_validate(new))
    assert (await complete(client, header)).status_code == 409
    header.update(transfer_id='next', base_revision=2)
    await upload(client, header, fragments)
    assert (await complete(client, header)).status_code == 200
    response = await client.post('/internal/sites/traktoriupadangos/simulation',
        json={'knowledge': knowledge(), 'notice_version': 'fixture', 'consent': True, 'mode': 'simulation'},
        headers={'Authorization': 'Bearer ' + settings().worker_secret})
    assert response.status_code == 409 and response.json()['detail'] == 'knowledge_v2_downgrade_forbidden'
