import copy

import pytest

from pinet_core.agent_instructions import compose
from pinet_core.contracts import NeedPatch
from pinet_core.followup_projection import bind, verified_result
from pinet_core.profiles import PROFILES, get


def test_six_niche_role_registry_and_fact_boundaries():
    assert len(PROFILES) == 6
    for site, profile in PROFILES.items():
        for role in ['conversation', 'sales', 'supplier', 'quality']:
            release = compose(site, role)
            assert profile.canonical_host in release.prompt
            assert len(release.sources) >= 3
        assert get(site, profile.canonical_host) == profile
    assert 'material' in PROFILES['akmenas'].need_fields
    assert 'tyre_marking' not in PROFILES['akmenas'].need_fields
    NeedPatch(base_revision=0, fields={'material': 'granitas'}, evidence_event_id='event')
    with pytest.raises(ValueError):
        NeedPatch(base_revision=0, fields={'bank_account': 'invented'}, evidence_event_id='event')
    with pytest.raises(Exception):
        get('akmenas', 'traktoriupadangos.lt')


def test_followup_review_is_bound_to_source_evidence_and_scope():
    data = {'knowledge': {'deployment_id': 'release', 'knowledge_revision': 2,
        'canonical_host': 'akmenas.lt', 'pages': [{'id': 'p', 'url': 'https://akmenas.lt/gidas',
        'revision_hash': 'a' * 64, 'projection_hash': 'b' * 64}]},
        'evidence': [{'id': 'client-event'}], 'test': True}
    body = 'Sveiki. Prašytas gidas: https://akmenas.lt/gidas'
    value = bind(data, 'Jūsų stalviršio klausimas', body,
        {'approved': True, 'unsupported_claims': []}, 'codex_cli_text_lab')
    assert verified_result(data, {'validated_followup': value})['body'] == body
    changes = [{'body': body + ' Pakeista.'}, {'knowledge_deployment_id': 'stale'},
        {'knowledge_revision': 1}, {'evidence_ids': ['foreign']},
        {'review': {'approved': False, 'unsupported_claims': ['fictional stock']}}, {'engine': 'client'}]
    for change in changes:
        assert verified_result(data, {'validated_followup': {**value, **change}}) is None
    foreign = copy.deepcopy(data)
    foreign['knowledge']['canonical_host'] = 'traktoriupadangos.lt'
    assert verified_result(foreign, {'validated_followup': value}) is None
    assert verified_result(data, {}) is None


def test_explicit_customer_language_survives_fallback_and_later_change():
    from types import SimpleNamespace

    from pinet_core.followup_language import english_fallback, explicit_language

    events = [{'speaker': 'client', 'text': 'Please send my summary in English.'},
        {'speaker': 'agent', 'text': 'Lietuviškai pateiksiu santrauką.'}]
    assert explicit_language(events) == 'en'
    events.append({'speaker': 'client', 'text': 'Vis dėlto atsakykite lietuviškai.'})
    assert explicit_language(events) == 'lt'
    assert explicit_language([{'speaker': 'client', 'text': 'Labas, reikia dviejų komodų.'}]) is None
    subject, body = english_fallback({'coverage': 'incomplete'}, SimpleNamespace(canonical_host='akmenas.lt'),
        ['I need a worktop.'], [{'title': 'Stalviršių gidas', 'url': 'https://akmenas.lt/gidas'}])
    assert subject.startswith('Your enquiry') and 'record may be incomplete' in body
    assert 'I need a worktop.' in body and 'https://akmenas.lt/gidas' in body
    assert 'have not been confirmed' in body
    from pinet_core.jobs import grounded_followup

    fallback = grounded_followup({'knowledge': {'site_id': 'akmenas', 'canonical_host': 'akmenas.lt',
        'pages': [{'id': 'p', 'title': 'Stalviršių gidas', 'text': 'Stalviršių informacija.',
            'url': 'https://akmenas.lt/gidas', 'revision_hash': 'a' * 64, 'projection_hash': 'b' * 64}]},
        'evidence': events[:1], 'test': True})
    assert fallback['subject'].startswith('Your enquiry') and fallback['body'].startswith('Hello,')
    assert fallback['validation'] == 'template_grounded'


async def test_real_followup_job_uses_reviewed_projection(client):
    from conftest import edge, start, worker
    from sqlalchemy import select

    from pinet_core import jobs, service
    from pinet_core.config import settings
    from pinet_core.db import db
    from pinet_core.models import Artifact

    site = 'greitossvetaines'
    session = await start(client, site)
    owner = (await worker(client, session, '/claim', {'owner': 'network-test'}, site)).json()
    await worker(client, session, '/events', {'epoch': owner['epoch'], 'event_key': 'client',
        'kind': 'client_transcript', 'text': 'Reikia penkių puslapių svetainės. Prašau duomenų sąrašo el. paštu.'}, site)
    await edge(client, 'POST', site, session, '/contact', {'channel': 'email', 'value': 'owner@example.com',
        'consent': True, 'notice_version': 'test'})
    await edge(client, 'POST', site, session, '/end')
    item = await service.business(site)
    data = await jobs.load_input(item.id, session['conversation_id'])
    body = 'Sveiki. Užregistruotas penkių puslapių svetainės poreikis. Turėkite darbų nuotraukas ir paslaugų sąrašą. MB Pinet'
    value = bind(data, 'Jūsų svetainės poreikis', body,
        {'approved': True, 'unsupported_claims': []}, 'codex_cli_text_lab')
    task = await jobs.claim_job(item.id, 'network-test', kind='analysis')
    await jobs.complete_artifact(item.id, task, {'validated_followup': value})
    followup = await jobs.claim_job(item.id, 'network-test', kind='followup')
    await jobs.prepare_followup(item.id, followup, data)
    async with db.transaction(item.id, settings().environment) as tx:
        artifact = await tx.scalar(select(Artifact).where(Artifact.conversation_id == session['conversation_id'],
            Artifact.kind == 'followup'))
        assert artifact.payload['body'] == body
        assert artifact.payload['validation'] == 'server_bound_model_facts_review'
