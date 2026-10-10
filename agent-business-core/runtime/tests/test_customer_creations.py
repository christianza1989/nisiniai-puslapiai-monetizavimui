"""Actual isolated PG/RLS/queue/revision acceptance, with synthetic zero-provider adapters."""
import hashlib
import json
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Membership
from pinet_core.control.routes import scope
from pinet_core.creation import renderer, worker
from pinet_core.creation.models import Artifact, Creation, Job
from pinet_core.models import utcnow
from pinet_core.tasks.codex import RunnerError


def draft(reply='Sintetinis verslo pasiūlymas ir trijų puslapių juodraštis parengtas patikrai.'):
    return {'business_name': 'Bandymo dirbtuvės', 'tagline': 'Aiškus pasiūlymas pirmam kliento poreikio bandymui',
        'assistant_reply': reply, 'business': {
            'customer': 'Mažos įmonės, kurios nori patikrinti konkretaus pasiūlymo paklausą.',
            'paid_result': 'Pirmojo pasiūlymo svetainė ir užklausų surinkimo darbo planas.',
            'payer': 'Mažos įmonės savininkas.', 'offer': 'Siauro pasiūlymo pristatymas su aiškiu užklausos keliu ir patikros kriterijais.',
            'monetization': 'Mokamas parengimas; kaina ir vykdytojas dar nepatvirtinti.',
            'interest_test': 'Tikra poreikio užklausa, įjungus patvarų saugojimą ir pristatymą.',
            'alternatives': ['Savarankiškas kūrimas.'], 'execution_steps': ['Išrinkti pirkėją.', 'Patikrinti pasiūlymą.', 'Išmatuoti užklausas.'],
            'expansion_criteria': ['Tikros tinkamos užklausos.', 'Patvirtinta vykdymo ekonomika.']},
        'confirmed_facts': ['Tai sintetinis vidinis bandymas.'], 'assumptions': ['Poreikis dar nepatikrintas.'],
        'open_questions': ['Kas vykdys paslaugą?'], 'research': [],
        'tools': [{'area': 'Svetainė', 'tool': 'Bendras rendereris', 'purpose': 'Pristatyti patvirtintą pasiūlymą.',
                   'phase': 'phase_one', 'limitation': 'Viešas leidimas dar neparengtas.'},
                  {'area': 'Užklausos', 'tool': 'Bendras kontaktų modulis', 'purpose': 'Patvariai saugoti tikras užklausas.',
                   'phase': 'phase_one', 'limitation': 'Pristatymą dar reikia patikrinti.'}],
        'brand': {'accent': 'teal', 'composition': 'editorial', 'rationale': 'Aiškus skaitymo kelias ir atskirti klientų klausimai.'},
        'pages': [{'path': path, 'title': title, 'navigation_label': title,
                   'meta_description': 'Aiškus bandomojo pasiūlymo pristatymas ir jo patikros kriterijai.',
                   'intent': 'Suprasti konkretų siūlomą rezultatą.',
                   'sections': [{'heading': 'Pasiūlymas', 'body': 'Konkretus pasiūlymo paaiškinimas prieš užsakant bandomąjį rezultatą.',
                                 'items': ['Patikrinti poreikį.'], 'layout': 'prose'},
                                {'heading': 'Kitas žingsnis', 'body': 'Pirmiausia reikia patvirtinti vykdymą ir tikrą užklausų pristatymą.',
                                 'items': [], 'layout': 'checklist'}]}
                  for path, title in [('/', 'Pradžia'), ('/pasiulymas/', 'Pasiūlymas'), ('/kontaktai/', 'Kontaktai')]],
        'language_review': 'Peržiūrėjau sakinius, antraštes ir metaduomenis; bandymo ribos įvardytos aiškiai.',
        'remaining_gates': ['Patvirtinti verslo faktus.', 'Patikrinti užklausų saugojimą ir pristatymą.', 'Atlikti visą svetainės auditą.']}


@pytest.fixture
async def creation(customers, monkeypatch):  # noqa: F811 - explicit shared pytest fixture dependency
    for key, value in {'creation_enabled': True, 'creation_runner_enabled': True,
                       'creation_daily_limit': 10, 'creation_global_daily_limit': 20}.items():
        monkeypatch.setattr(settings(), key, value)
    return customers


async def start(c, auth, me, **changes):
    body = {'portfolio_id': me['portfolios'][0]['portfolio_id'], 'display_name': 'Bandymo verslas',
            'idea': 'Noriu sukurti mokymų verslo pasiūlymą ir naudingą svetainę.',
            'canonical_host': 'mokyai-ai.lt', 'idempotency_key': str(uuid4()), **changes}
    response = await c['client'].post('/customer/v2/creations', json=body, headers=auth)
    assert response.status_code == 202, response.text
    return response.json()['data'], body


async def result(context, authorized):
    assert await authorized()
    assert context['domain_ownership_verified'] is False and context['expected_instruction_hash']
    return draft(), {'usage': {'input_tokens': 123, 'output_tokens': 45}, 'web_search_count': 0}


async def test_language_failure_preserves_provider_usage_without_accepting_revision(creation):
    c = creation
    _, auth, me = await verified(c)
    item, _ = await start(c, auth, me)
    cid = item['creation_id']

    async def mixed(context, authorized):
        assert await authorized()
        value = draft()
        value['pages'][1]['sections'][0]['body'] = (
            'Apskaičiuoti mokymų ettevalmistus- ja toteutuskustannukset sekä päättää hinta ennen ensimmäistä toteutusta.')
        return value, {'usage': {'input_tokens': 143, 'output_tokens': 56}, 'web_search_count': 1}

    assert await worker.execute_once(mixed)
    read = (await c['client'].get('/customer/v2/creations/'+cid, headers=auth)).json()['data']
    assert read['status'] == 'failed' and read['failure_code'] == 'language_quality_failed'
    assert read['current_revision'] is None
    assert not (await c['client'].get('/customer/v2/creations/'+cid+'/artifacts', headers=auth)).json()['data']['items']
    async with scope(user=me['user_id']) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == cid))
        assert job.usage['usage']['input_tokens'] == 143
        assert job.usage['language_screening']['status'] == 'FAIL'


@pytest.mark.parametrize('field', ['assistant_reply', 'remaining_gates', 'page_title', 'research_finding', 'tool_purpose'])
def test_language_screen_covers_all_customer_facing_output_fields(field):
    value = draft()
    mixed = 'Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto.'
    if field == 'assistant_reply':
        value['assistant_reply'] = mixed
    elif field == 'remaining_gates':
        value['remaining_gates'][0] = mixed
    elif field == 'page_title':
        value['pages'][0]['title'] = mixed
    elif field == 'research_finding':
        value['research'] = [{'title': 'Official Research', 'url': 'https://example.com/research',
                              'market': 'Užsienio rinka', 'finding': mixed, 'is_counterevidence': False}]
    else:
        value['tools'][0]['purpose'] = mixed
    with pytest.raises(RunnerError) as error:
        renderer.language_screening(value)
    assert error.value.code == 'language_quality_failed'


def test_model_context_projection_omits_invalid_prose_without_mutating_source():
    value = draft()
    value['business']['execution_steps'][0] = 'Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto.'
    before = json.dumps(value, ensure_ascii=False)
    projected, receipt = renderer.context_projection(value)
    assert json.dumps(value, ensure_ascii=False) == before
    assert 'assistant_reply' not in projected and 'language_review' not in projected
    assert len(projected['business']['execution_steps']) == 2
    assert projected['business']['customer'] == value['business']['customer']
    assert projected['pages'] == value['pages']
    assert '.business.execution_steps[0]' in receipt['omitted_fields']


async def test_durable_queue_private_artifacts_and_exact_revision(creation):
    c = creation
    _, auth, me = await verified(c)
    item, body = await start(c, auth, me)
    cid = item['creation_id']
    assert item['status'] == 'queued' and item['current_revision'] is None
    assert (await c['client'].post('/customer/v2/creations', json=body, headers=auth)).json()['data']['creation_id'] == cid
    assert (await c['client'].post('/customer/v2/creations', json={**body, 'idea': body['idea']+'!'}, headers=auth)).status_code == 409
    assert await worker.execute_once(result)
    read = (await c['client'].get('/customer/v2/creations/'+cid, headers=auth)).json()['data']
    assert read['status'] == 'draft_ready' and read['current_revision'] == 1
    files = (await c['client'].get('/customer/v2/creations/'+cid+'/artifacts', headers=auth)).json()['data']['items']
    assert len(files) == 3
    for file in files:
        response = await c['client'].get('/customer/v2/creations/'+cid+'/artifacts/'+file['artifact_id'], headers=auth)
        assert response.status_code == 200 and response.headers['cache-control'] == 'private, no-store'
        data = response.json()['data']
        assert len(data['content'].encode()) == file['bytes']
        assert hashlib.sha256(data['content'].encode()).hexdigest() == file['sha256']
        if file['kind'] == 'content_package':
            assert json.loads(data['content'])['publicationApproved'] is False
    feedback = {'base_revision': 1, 'message': 'Aiškiau parodyk vykdytojo ir kontaktų patikros ribas.', 'idempotency_key': str(uuid4())}
    assert (await c['client'].post('/customer/v2/creations/'+cid+'/revisions', json=feedback, headers=auth)).status_code == 202
    assert (await c['client'].post('/customer/v2/creations/'+cid+'/revisions', json=feedback, headers=auth)).status_code == 202
    async def revised(context, authorized):
        assert context['base_revision'] == 1 and context['current_draft'] and len(context['history']) == 2
        assert context['previous_artifacts_preserved'] is True and context['permitted_web_actions'] == 2
        assert context['prior_context_projection']['projection'] == 'prior-draft-context.v1'
        assert await authorized()
        return draft('Patikslinau vykdytojo ir kontaktų ribas. Ankstesni patvirtinti faktai išsaugoti.'), {}
    assert await worker.execute_once(revised)
    assert (await c['client'].get('/customer/v2/creations/'+cid, headers=auth)).json()['data']['current_revision'] == 2
    assert len((await c['client'].get('/customer/v2/creations/'+cid+'/artifacts', headers=auth)).json()['data']['items']) == 6
    messages = (await c['client'].get('/customer/v2/creations/'+cid+'/messages', headers=auth)).json()['data']['items']
    assert [m['role'] for m in messages] == ['user', 'assistant', 'user', 'assistant']
    stale = {**feedback, 'idempotency_key': str(uuid4())}
    assert (await c['client'].post('/customer/v2/creations/'+cid+'/revisions', json=stale, headers=auth)).status_code == 409
    async with scope(user=me['user_id']) as tx:
        jobs = list(await tx.scalars(select(Job)))
        assert len(jobs) == 2 and all(j.status == 'succeeded' and j.cost_microusd is None for j in jobs)


async def test_foreign_portfolio_and_artifact_are_hidden_and_immutable(creation):
    c = creation
    _, auth, me = await verified(c)
    _, foreign, _ = await verified(c)
    item, _ = await start(c, auth, me)
    cid = item['creation_id']
    assert await worker.execute_once(result)
    files = (await c['client'].get('/customer/v2/creations/'+cid+'/artifacts', headers=auth)).json()['data']['items']
    for suffix in ('', '/events', '/messages', '/artifacts', '/artifacts/'+files[0]['artifact_id']):
        assert (await c['client'].get('/customer/v2/creations/'+cid+suffix, headers=foreign)).status_code == 404
    wrong = {'portfolio_id': me['portfolios'][0]['portfolio_id'], 'display_name': 'Foreign', 'idea': 'A meaningful synthetic foreign portfolio request.',
             'canonical_host': None, 'idempotency_key': str(uuid4())}
    assert (await c['client'].post('/customer/v2/creations', json=wrong, headers=foreign)).status_code == 404
    async with scope(user=me['user_id']) as tx:
        assert len(list(await tx.scalars(select(Artifact)))) == 3
    with pytest.raises(DBAPIError):
        async with scope(user=me['user_id']) as tx:
            await tx.execute(update(Artifact).values(content='Changed immutable content'))
    async with scope(user=me['user_id']) as tx:
        await tx.execute(text("SELECT set_config('pinet.environment','production',true)"))
        assert not list(await tx.scalars(select(Creation)))


async def test_failed_revision_preserves_old_files_and_explicit_retry(creation):
    c = creation
    _, auth, me = await verified(c)
    item, _ = await start(c, auth, me)
    cid = item['creation_id']
    await worker.execute_once(result)
    old = (await c['client'].get('/customer/v2/creations/'+cid+'/artifacts', headers=auth)).json()['data']['items']
    body = {'base_revision': 1, 'message': 'Patikslink pasiūlymą.', 'idempotency_key': str(uuid4())}
    await c['client'].post('/customer/v2/creations/'+cid+'/revisions', json=body, headers=auth)
    async def failed(context, authorized):
        raise RunnerError('run_timeout')
    await worker.execute_once(failed)
    read = (await c['client'].get('/customer/v2/creations/'+cid, headers=auth)).json()['data']
    assert read['status'] == 'failed' and read['current_revision'] == 1 and read['failure_code'] == 'run_timeout'
    assert (await c['client'].get('/customer/v2/creations/'+cid+'/artifacts', headers=auth)).json()['data']['items'] == old
    assert not await worker.execute_once(result)
    assert (await c['client'].post('/customer/v2/creations/'+cid+'/revisions', json={**body, 'idempotency_key': str(uuid4())}, headers=auth)).status_code == 202
    assert await worker.execute_once(result)


async def test_cancel_during_run_rejects_late_completion(creation):
    c = creation
    _, auth, me = await verified(c)
    item, _ = await start(c, auth, me)
    cid = item['creation_id']
    async def late(context, authorized):
        assert (await c['client'].post('/customer/v2/creations/'+cid+'/cancel', headers=auth)).status_code == 200
        assert not await authorized()
        return draft(), {}
    assert await worker.execute_once(late)
    read = (await c['client'].get('/customer/v2/creations/'+cid, headers=auth)).json()['data']
    assert read['status'] == 'cancelled' and read['current_revision'] is None
    assert (await c['client'].get('/customer/v2/creations/'+cid+'/artifacts', headers=auth)).json()['data']['items'] == []


async def test_revoked_member_cannot_deliver_or_starve_next_customer(creation):
    c = creation
    _, auth, me = await verified(c)
    item, _ = await start(c, auth, me)
    async with AsyncSession(c['admin']) as tx, tx.begin():
        await tx.execute(update(Membership).where(Membership.user_id == me['user_id']).values(enabled=False))
    assert not await worker.execute_once(result)
    assert (await c['client'].get('/customer/v2/creations/'+item['creation_id'], headers=auth)).status_code == 404
    _, other_auth, other = await verified(c)
    other_item, _ = await start(c, other_auth, other)
    assert await worker.execute_once(result)
    assert (await c['client'].get('/customer/v2/creations/'+other_item['creation_id'], headers=other_auth)).json()['data']['status'] == 'draft_ready'


async def test_expired_worker_not_retried_and_flags_quota(creation, monkeypatch):
    c = creation
    _, auth, me = await verified(c)
    item, _ = await start(c, auth, me)
    claim = await worker.claim()
    assert claim and not await worker.claim()
    async with AsyncSession(c['admin']) as tx, tx.begin():
        await tx.execute(update(Job).where(Job.id == claim['job_id']).values(lease_until=utcnow()-timedelta(seconds=1)))
    assert not await worker.execute_once(result)
    read = (await c['client'].get('/customer/v2/creations/'+item['creation_id'], headers=auth)).json()['data']
    assert read['status'] == 'failed' and read['failure_code'] == 'worker_interrupted'
    monkeypatch.setattr(settings(), 'creation_daily_limit', 1)
    body = {'base_revision': 0, 'message': 'Pakartok parengimą.', 'idempotency_key': str(uuid4())}
    assert (await c['client'].post('/customer/v2/creations/'+item['creation_id']+'/revisions', json=body, headers=auth)).status_code == 429
    monkeypatch.setattr(settings(), 'creation_runner_enabled', False)
    assert (await c['client'].post('/customer/v2/creations/'+item['creation_id']+'/revisions', json=body, headers=auth)).status_code == 503


async def test_authenticated_full_catalogue_and_invalid_filters(creation):
    c = creation
    client = c['client']
    assert (await client.get('/customer/v2/domains')).status_code == 401
    _, auth, _ = await verified(c)
    response = await client.get('/customer/v2/domains', params={'top200_only': True}, headers=auth)
    assert response.status_code == 200 and response.json()['contract_version'] == 'domains.v1'
    assert response.json()['data']['total'] == 200
    facets = await client.get('/customer/v2/domains/facets', headers=auth)
    assert facets.status_code == 200 and sum(v['count'] for v in facets.json()['data']['items']) == 45324
    response = await client.post('/customer/v2/domains/recommendations', json={'niche': 'mokymai', 'category': None, 'limit': 5}, headers=auth)
    assert response.status_code == 200 and all(v['domain']['availability'] == 'unknown' for v in response.json()['data']['items'])
    assert (await client.get('/customer/v2/domains', params={'limit': 101}, headers=auth)).status_code == 400
    assert (await client.get('/customer/v2/domains', params={'category': 'invented'}, headers=auth)).status_code == 400
    assert (await client.get('/customer/v2/domains', params={'query': '\x01'}, headers=auth)).status_code == 400


async def test_output_invalid_does_not_leave_active_job(creation, monkeypatch):
    c = creation
    _, auth, me = await verified(c)
    item, _ = await start(c, auth, me)
    def broken_artifacts(*args, **kwargs):
        raise RunnerError('output_invalid')
    monkeypatch.setattr(renderer, 'artifacts', broken_artifacts)
    assert await worker.execute_once(result)
    read = (await c['client'].get('/customer/v2/creations/'+item['creation_id'], headers=auth)).json()['data']
    assert read['status'] == 'failed' and read['failure_code'] == 'output_invalid' and read['active_job_id'] is None
