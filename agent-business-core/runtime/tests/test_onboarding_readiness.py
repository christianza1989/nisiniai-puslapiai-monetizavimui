from types import SimpleNamespace

import pytest
from conftest import start

from pinet_core import knowledge, learning_controller, onboarding, profiles
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.service import business


async def test_profile_registration_does_not_grant_source_or_learning(monkeypatch):
    async def none(tx):
        return None
    monkeypatch.setattr(knowledge, 'current', none)
    assert len(onboarding.LEGACY_SITES) == 6
    assert onboarding.LEGACY_SITES == frozenset(profiles.PROFILES) - {'parasoplansetes'}
    assert onboarding.defaults('parasoplansetes') == {'source_ready': False, 'learning_admitted': False}
    for site in onboarding.LEGACY_SITES:
        assert (await onboarding.status(None, site)) == {'source_ready': True, 'learning_admitted': True}
    assert await onboarding.status(None, 'dovanos123') == {'source_ready': False, 'learning_admitted': False}


async def test_v2_cannot_enter_v1_learning_evaluator(monkeypatch):
    async def state(tx):
        return SimpleNamespace(payload={'knowledge': {'schema_version': 2}})
    monkeypatch.setattr(knowledge, 'current', state)
    assert not (await onboarding.status(None, 'traktoriupadangos'))['learning_admitted']


async def test_readiness_override_does_not_change_facts_or_channels_and_blocks_controller(client, monkeypatch):
    await start(client)
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        state = await knowledge.current(tx)
        original = (state.payload['knowledge'], state.revision, state.refreshed_at)
    path = '/operator/sites/traktoriupadangos/onboarding'
    headers = {'Authorization': 'Bearer ' + settings().operator_secret}
    result = await client.put(path, headers=headers, json={'source_ready': False, 'learning_admitted': False})
    assert result.status_code == 200
    assert (await client.get(path, headers=headers)).json() == result.json()
    from conftest import knowledge as fixture_knowledge
    response = await client.post('/internal/sites/traktoriupadangos/simulation',
        headers={'Authorization': 'Bearer ' + settings().worker_secret},
        json={'knowledge': fixture_knowledge(), 'notice_version': 'fixture', 'consent': True, 'mode': 'simulation'})
    assert response.status_code == 409 and response.json()['detail'] == 'site_source_not_admitted'
    monkeypatch.setattr(settings(), 'learning_enabled', True)
    with pytest.raises(RuntimeError, match='site_learning_not_admitted'):
        await learning_controller.run(item.id, {})
    async with db.transaction(item.id, settings().environment) as tx:
        state = await knowledge.current(tx)
        assert (state.payload['knowledge'], state.revision, state.refreshed_at) == original
    bad = await client.put(path, headers=headers, json={'source_ready': False, 'learning_admitted': True})
    assert bad.status_code == 409


async def test_admission_requires_accepted_source_and_protected_corpus(client):
    path = '/operator/sites/traktoriupadangos/onboarding'
    headers = {'Authorization': 'Bearer ' + settings().operator_secret}
    assert (await client.put(path, headers=headers, json={'source_ready': True})).status_code == 409
    await start(client)
    assert (await client.put(path, headers=headers,
        json={'source_ready': True, 'learning_admitted': True})).status_code == 200


async def test_opted_out_quality_keeps_candidate_without_enqueuing_learning(client, monkeypatch):
    from conftest import claim, edge, utterance
    from sqlalchemy import select

    from pinet_core import jobs
    from pinet_core.models import Artifact, Job

    monkeypatch.setattr(settings(), 'learning_enabled', True)
    session = await start(client)
    epoch = await claim(client, session)
    event = (await utterance(client, session, epoch)).json()
    await edge(client, 'POST', 'traktoriupadangos', session, '/end')
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        await onboarding.update(tx, item, onboarding.Readiness(source_ready=True, learning_admitted=False))
    task = await jobs.claim_job(item.id, 'judge', kind='quality')
    data = await jobs.load_input(item.id, session['conversation_id'])
    await jobs.complete_artifact(item.id, task, {'outcome': 'needs_review', 'issues': ['Missed correction'],
        'root_cause': 'communication', 'suggested_scope': 'clarification',
        'improvement_hint': 'Save the corrected tyre marking before continuing.',
        'evidence_event_ids': [event['event_id']], 'release_hash': data['release_hash']})
    async with db.transaction(item.id, settings().environment) as tx:
        assert await tx.scalar(select(Job).where(Job.kind == 'learning')) is None
        candidate = await tx.scalar(select(Artifact).where(Artifact.kind.startswith('candidate:')))
        assert candidate.payload['state'] == 'awaiting_semantic_evaluation'
        assert not candidate.payload['activated']
