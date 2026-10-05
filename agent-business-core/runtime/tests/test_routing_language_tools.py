import asyncio
import copy

import pytest
from conftest import edge, start, worker
from pydantic import ValidationError
from sqlalchemy import select

from pinet_core import routing, service
from pinet_core.config import settings
from pinet_core.customer_language import select as language
from pinet_core.db import db
from pinet_core.models import Artifact
from pinet_core.text_tools import core_arguments, turn_schema


def test_offline_language_hint_retains_short_turn_and_explicit_preference():
    selected = language('I need two tyres, but I do not know the size.', 'e1')
    assert selected['code'] == 'en'
    assert language('420/85 R28', 'e2', selected) == selected
    assert language('OK', 'e3', selected) == selected
    lt = language('Reikia dviejų padangų, žymėjimo dar nežinau.', 'e4', selected)
    assert lt['code'] == 'lt'
    explicit = language('Prašau viską atsiųsti angliškai.', 'e5', lt)
    assert language('Dar reikia pasitikslinti pristatymą ir matmenis.', 'e6', explicit) == explicit
    assert language('Please reply in Lithuanian.', 'e7', explicit)['code'] == 'lt'
    assert language('420/85 R28', 'e8') is None


def test_text_tool_arguments_cannot_invent_field_evidence_revision_or_json():
    schema = turn_schema('greitossvetaines', 'client-event', 2)
    value = {'reply': '', 'calls': [{'name': 'need.patch', 'arguments': {
        'base_revision': 2, 'evidence_event_id': 'client-event',
        'fields': [{'field': 'pages', 'value': '5 puslapiai'}]}}]}
    call = schema.model_validate(value).calls[0]
    assert core_arguments(call)['fields'] == {'pages': '5 puslapiai'}
    for mutation in [{'base_revision': 1}, {'evidence_event_id': 'foreign'},
            {'fields': [{'field': 'tyre_marking', 'value': '420/85 R28'}]}]:
        changed = copy.deepcopy(value)
        changed['calls'][0]['arguments'].update(mutation)
        with pytest.raises(ValidationError):
            schema.model_validate(changed)
    wrong = {'reply': '', 'calls': [{'name': 'need.patch', 'arguments': '{not valid json'}]}
    with pytest.raises(ValidationError):
        schema.model_validate(wrong)


async def toggle(client, site, enabled, revision):
    return await client.put(f'/operator/sites/{site}/routing',
        headers={'Authorization': 'Bearer ' + settings().operator_secret},
        json={'enabled': enabled, 'base_revision': revision})


async def test_per_site_toggle_is_authenticated_revisioned_and_does_not_enable_voice(client):
    assert (await client.get('/operator/sites/traktoriupadangos/routing')).status_code == 401
    changed = await toggle(client, 'traktoriupadangos', True, 0)
    assert changed.status_code == 200
    assert changed.json()['policy']['jev_enabled'] is True
    assert changed.json()['policy']['enabled'] is False
    assert not settings().voice_enabled and not settings().smtp_enabled
    assert (await toggle(client, 'traktoriupadangos', False, 0)).status_code == 409
    headers = {'Authorization': 'Bearer ' + settings().operator_secret}
    other = (await client.get('/operator/sites/greitossvetaines/routing', headers=headers)).json()
    assert other['enabled'] is False
    assert (await toggle(client, 'traktoriupadangos', False, 1)).json()['policy']['jev_enabled'] is False


async def test_background_router_never_blocks_input_and_disabled_late_hint_is_dropped(client, monkeypatch):
    entered, release = asyncio.Event(), asyncio.Event()
    async def observe(snapshot, current):
        entered.set()
        await release.wait()
        return {'status': 'observed', 'apply': False, 'intent': 'contact_request', 'confidence': 0.95,
            'suggested_role': 'conversation', 'suggested_tools': ['ui.open_contact_form']}
    monkeypatch.setattr(routing.active.router, 'observe', observe)
    await toggle(client, 'traktoriupadangos', True, 0)
    session = await start(client)
    owner = (await worker(client, session, '/claim', {'owner': 'router-test'})).json()
    saved = await asyncio.wait_for(worker(client, session, '/events', {'epoch': owner['epoch'],
        'event_key': 'customer', 'kind': 'client_transcript', 'text': 'Please open the email form now.'}), 2)
    assert saved.status_code == 200
    await asyncio.wait_for(entered.wait(), 2)
    await toggle(client, 'traktoriupadangos', False, 1)
    release.set()
    await asyncio.gather(*list(routing.active.tasks))
    status = (await edge(client, 'GET', 'traktoriupadangos', session)).json()
    assert status['routing'] == {'mode': 'off', 'hint': None}
    assert status['language_hint']['code'] == 'en'
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        artifact = await tx.scalar(select(Artifact).where(Artifact.kind.like('routing_decision:%')))
        assert artifact.payload['status'] == 'dropped_stale_snapshot'
