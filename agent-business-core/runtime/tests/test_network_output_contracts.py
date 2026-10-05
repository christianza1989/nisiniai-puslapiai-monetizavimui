import pytest
from pydantic import ValidationError

from pinet_core.contracts import Analysis, Quality
from pinet_core.evidence_output import bound_schema
from pinet_core.need_values import canonical_value


def test_generated_evidence_ids_are_constrained_before_generation():
    data = {'evidence': [{'id': 'client-1', 'speaker': 'client'},
        {'id': 'agent-1', 'speaker': 'agent'}]}
    schema = bound_schema(Analysis, data, client_only=True)
    items = schema.model_json_schema()['properties']['evidence_event_ids']['items']
    assert items['const'] == 'client-1'
    value = {'summary': 'need', 'requested_next_step': 'summary', 'missing_information': [],
        'evidence_event_ids': ['client-1'], 'subject': 'Your enquiry', 'body': 'Hello'}
    assert schema.model_validate(value).evidence_event_ids == ['client-1']
    for references in [[], ['agent-1'], ['page-id'], ['foreign-conversation']]:
        with pytest.raises(ValidationError):
            schema.model_validate({**value, 'evidence_event_ids': references})
    quality = bound_schema(Quality, data)
    assert quality.model_json_schema()['properties']['evidence_event_ids']['items']['enum'] == [
        'client-1', 'agent-1']
    empty = bound_schema(Quality, {'evidence': []})
    assert empty.model_validate({'outcome': 'no_interaction', 'issues': [],
        'evidence_event_ids': [], 'improvement_hint': ''}).outcome == 'no_interaction'


@pytest.mark.parametrize('field,value,expected', [('pages', '5 puslapiai', '5'),
    ('pages', ' 5 puslapių ', '5'), ('pages', '5 pages', '5'),
    ('quantity', '2 vnt.', '2'), ('quantity', '2 padangos', '2'),
    ('quantity', '2 tyres', '2'), ('pages', '2–4 puslapiai', '2–4 puslapiai'),
    ('quantity', '2.5', '2.5'), ('quantity', '420/85 R28', '420/85 R28'),
    ('quantity', '2 priekinės ir 4 galinės', '2 priekinės ir 4 galinės'),
    ('budget', '500 EUR', '500 EUR')])
def test_count_normalization_never_guesses_ranges_or_dimensions(field, value, expected):
    assert canonical_value(field, value) == expected


async def test_count_normalization_preserves_core_evidence_and_original_input(client):
    from conftest import edge, start, worker

    site = 'greitossvetaines'
    session = await start(client, site)
    owner = (await worker(client, session, '/claim', {'owner': 'count-contract'}, site)).json()
    event = (await worker(client, session, '/events', {'epoch': owner['epoch'],
        'event_key': 'need', 'kind': 'client_transcript', 'text': 'Reikia 5 puslapių.'}, site)).json()
    response = await worker(client, session, '/tools', {'epoch': owner['epoch'],
        'call_id': 'patch', 'name': 'need.patch', 'arguments': {'base_revision': 0,
            'fields': {'pages': '5 puslapiai'}, 'evidence_event_id': event['event_id']}}, site)
    assert response.status_code == 200
    saved = (await edge(client, 'GET', site, session)).json()['need']['pages']
    assert saved == {'value': '5', 'raw_value': '5 puslapiai',
        'status': 'proposed', 'evidence': event['event_id']}
