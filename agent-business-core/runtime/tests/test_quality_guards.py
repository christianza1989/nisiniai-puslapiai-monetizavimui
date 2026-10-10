import pytest

from pinet_core.quality_guards import findings, reconcile
from pinet_core.quality_guards import unsupported_model_exclusion


def test_document_view_exclusion_is_not_proved_by_screen_size():
    knowledge = {'site_id': 'parasoplansetes', 'pages': [{'url':
        'https://parasoplansetes.lt/produktas/paraso-plansete-stepover-durasign-pad-5-0'}]}
    assert unsupported_model_exclusion('Dokumentui mažesni 4.3 ir 5.0 ekranai netiks.', knowledge)
    assert unsupported_model_exclusion('Pad 5.0 cannot display the document.', knowledge)
    assert not unsupported_model_exclusion('5.0 atmetimas dokumento peržiūrai buvo nepagrįstas.', knowledge)
    assert not unsupported_model_exclusion('Palyginkime 5.0 ir 10.0 ekrano skaitomumą su jūsų dokumentu.', knowledge)
    assert not unsupported_model_exclusion('Pad 5.0 ekranas netiks.', {'site_id': 'other', 'pages': []})


def timeline(reply, channel='email', after=False):
    saved = {'id': 'receipt', 'kind': 'contact_ready', 'sequence': 2, 'channel': channel}
    agent = {'id': 'agent', 'kind': 'agent_transcript', 'sequence': 3, 'text': reply}
    return {'timeline': [agent, saved] if after else [saved, agent]}


@pytest.mark.parametrize('reply', ['El. pašto laukas rodomas, galite jį įvesti ten.',
    'Please enter your email in the field.', 'You can enter it there.'])
def test_known_saved_contact_defect_overrules_high_model_score(reply):
    data = timeline(reply)
    raw = {'outcome': 'helpful', 'issues': [], 'evidence_event_ids': ['client'],
        'root_cause': 'unknown', 'improvement_hint': 'Everything was excellent.'}
    corrected = reconcile(raw, data)
    assert corrected['outcome'] == 'needs_review'
    assert corrected['root_cause'] == 'communication'
    assert corrected['evidence_event_ids'] == ['client', 'agent']
    assert corrected['model_assessment'] == raw
    assert 'excellent' not in corrected['improvement_hint']


def test_after_call_contact_different_channel_and_negation_are_not_false_positives():
    assert not findings(timeline('Please enter your email.', after=True))
    assert not findings(timeline('Please enter your phone.'))
    assert not findings(timeline('You do not need to enter your email again.'))
    assert not findings(timeline('El. paštą gavome, nebereikia jo įvesti.'))


def test_one_negated_sentence_does_not_hide_a_later_actual_reprompt():
    assert findings(timeline('You do not need to enter your email again. Please enter your email below.'))


def test_required_photo_range_is_grounded_but_optional_advice_is_not_a_fake_minimum():
    data = {'knowledge': {'site_id': 'greitossvetaines', 'pages': [{'text': 'Pradžiai pakanka kelių tinkamų nuotraukų.'}]},
        'evidence': [{'id': 'client', 'speaker': 'client', 'text': 'I have real work photos.'},
            {'id': 'agent', 'speaker': 'agent', 'text': 'Content needed: descriptions, contact details, and 8-20 strong photos.'}]}
    assert findings(data)[0]['code'] == 'unsupported_preparation_photo_requirement'
    raw = {'outcome': 'helpful', 'issues': [], 'root_cause': 'unknown', 'evidence_event_ids': ['client']}
    fixed = reconcile(raw, data)
    assert fixed['root_cause'] == 'communication' and fixed['model_assessment'] == raw
    assert 'photo' in fixed['improvement_hint']
    data['evidence'][1]['text'] = 'Optional gallery expansion: 8–20 strong photos. A few are enough to start.'
    assert not findings(data)
    data['evidence'][1]['text'] = 'You do not need 8–20 strong photos to start.'
    assert not findings(data)
    data['evidence'][1]['text'] = 'Content needed: your 8–20 strong photos.'
    data['evidence'][0]['text'] = 'I have 8-20 strong photos and want to use them.'
    assert not findings(data)


def test_price_guard_reads_current_unique_reference_and_ignores_unrequested_comparison():
    data = {'knowledge': {'site_id': 'greitossvetaines', 'pages': [{'text': 'Pradinis paketas nuo 490 €.'}]},
        'need': {'budget': {'value': '400 eurų'}},
        'evidence': [{'id': 'client', 'speaker': 'client', 'text': 'Patvirtinkite galutinę kainą.'},
            {'id': 'agent', 'speaker': 'agent', 'text': 'Jūsų biudžetas 400 eurų.'}]}
    assert findings(data)[0]['code'] == 'published_starting_reference_not_clarified'
    data['evidence'][1]['text'] = 'Patvirtintas pradinis paketas nuo 490 €, tai nėra galutinė kaina.'
    assert not findings(data)
    data['knowledge']['pages'][0]['text'] = 'Pradinis paketas nuo 550 €.'
    assert findings(data)[0]['approved_starting_reference_eur'] == '550'
    data['evidence'][0]['text'] = 'Tik pasiruošimo santrauka, kainos neprašau.'
    assert not findings(data)
    data['evidence'][0]['text'] = 'Galutinės kainos neprašau, duokite tik pasiruošimo sąrašą.'
    assert not findings(data)


async def test_real_contact_chronology_is_safe_and_detects_reprompt(client):
    from conftest import claim, edge, start, utterance

    from pinet_core import jobs, service

    session = await start(client)
    epoch = await claim(client, session)
    await utterance(client, session, epoch)
    await edge(client, 'POST', 'traktoriupadangos', session, '/contact',
        {'channel': 'email', 'value': 'private-value@example.com', 'consent': True, 'notice_version': 'test'})
    await utterance(client, session, epoch, key='agent', text='Please enter your email.', kind='agent_transcript')
    item = await service.business('traktoriupadangos')
    data = await jobs.load_input(item.id, session['conversation_id'])
    assert 'private-value@example.com' not in str(data)
    assert findings(data)[0]['code'] == 'saved_contact_reinvited'
