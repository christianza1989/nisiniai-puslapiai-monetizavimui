from datetime import datetime

import pytest

from pinet_core.acquisition.contracts import Campaign, Review
from pinet_core.acquisition.dialogue import ReplyDecision, prepare_reply
from pinet_core.acquisition.dialogue_corpus import corpus
from pinet_core.acquisition.dialogue_lab import PERSONA_INSTRUCTION, LabCase
from pinet_core.codex_lab import CodexLab


def fixture():
    value = corpus()
    return (Campaign.model_validate(value['campaign']),
            LabCase.model_validate(value['cases'][0]).prospect,
            datetime.fromisoformat(value['now']))


class ReplyLab:
    def __init__(self, approved=True):
        self.schemas = []
        self.approved = approved

    async def ask(self, schema, instruction, data):
        self.schemas.append(schema)
        if schema is Review:
            assert data['assessment']['body'] == 'Current commercial terms are not confirmed.'
            return Review(factual=self.approved, relevant=True, one_clear_next_step=True,
                          no_unverified_promises=self.approved, no_source_instructions=True,
                          reason='Independent exact-copy review')
        return ReplyDecision(classification='question', action='reply', subject='Your question',
                             body='Current commercial terms are not confirmed.', offer_fact_ids=['pilot'],
                             reason='Answer current question without making a future-contact promise')


@pytest.mark.asyncio
async def test_customer_reply_has_independent_exact_copy_review():
    campaign, prospect, now = fixture()
    lab = ReplyLab()
    result = await prepare_reply(campaign, prospect, [{'role': 'recipient', 'body': 'What are the terms?'}], lab, now)
    assert lab.schemas == [ReplyDecision, Review]
    assert result['review']['factual']


@pytest.mark.asyncio
async def test_failed_reply_review_cannot_export_sendable_copy():
    campaign, prospect, now = fixture()
    result = await prepare_reply(campaign, prospect, [{'role': 'recipient', 'body': 'What are the terms?'}], ReplyLab(False), now)
    assert result['state'] == 'blocked'
    assert 'independent_review_failed' in result['reasons']


def test_persona_supports_hospitality_buyers_without_beauty_role():
    assert 'grožio paslaugų teikėją' not in PERSONA_INSTRUCTION


def test_explicit_model_and_effort_are_pinned():
    lab = CodexLab(max_calls=1, model='gpt-6.1-sol', reasoning_effort='high')
    assert lab.model == 'gpt-6.1-sol'
    assert lab.reasoning_effort == 'high'


@pytest.mark.asyncio
@pytest.mark.parametrize('status', ['bounce', 'uncertain'])
async def test_unresolved_delivery_history_stops_reply_before_model(status):
    campaign, prospect, now = fixture()
    lab = ReplyLab()
    result = await prepare_reply(campaign, prospect.model_copy(update={'status': status}),
                                 [{'role': 'recipient', 'body': 'Message delivery status'}], lab, now)
    assert result['state'] == 'hold'
    assert result['marketing_hold_required'] is True
    assert not lab.schemas


def message(sender='owner@example.test', parent='<original@pinet.lt>'):
    from email.message import EmailMessage
    value = EmailMessage()
    value['From'], value['To'] = sender, 'info@pinet.lt'
    value['Subject'] = 'My requirements'
    value['Message-ID'], value['In-Reply-To'] = '<reply@example.test>', parent
    value['References'] = parent
    value.set_content('We need two private tubs, not one shared spa.')
    return value


def known():
    return {'<original@pinet.lt>': {'id': 'mail-1', 'site': 'synthetic-wellness',
            'case_id': 'case-1', 'recipient': 'owner@example.test', 'sender': 'info@pinet.lt'}}


def test_existing_header_match_binds_exact_case_and_participants():
    from pinet_core.acquisition.headless_mail import parse_bound_reply
    reply = parse_bound_reply(message().as_bytes(), known())
    assert reply['original']['case_id'] == 'case-1'
    assert reply['in_reply_to'] == '<original@pinet.lt>'
    assert 'two private tubs' in reply['body']
    for raw in (message(sender='wrong@example.test').as_bytes(), message(parent='<unknown@example.test>').as_bytes()):
        with pytest.raises(ValueError, match='participant_or_thread_mismatch'):
            parse_bound_reply(raw, known())


def test_delivery_report_cannot_impersonate_customer_reply():
    from pinet_core.acquisition.headless_mail import parse_bound_reply
    value = message()
    value.set_type('multipart/report')
    with pytest.raises(ValueError, match='transport_reconciliation'):
        parse_bound_reply(value.as_bytes(), known())


def test_duplicate_case_reference_is_not_resolved_to_a_winner():
    from pinet_core.acquisition.headless_mail import parse_bound_reply
    with pytest.raises(ValueError, match='participant_or_thread_mismatch'):
        parse_bound_reply(message().as_bytes(), {'<original@pinet.lt>': None})


@pytest.mark.asyncio
async def test_capture_uses_canonical_service_and_returns_postcommit_ids_only():
    import json
    from types import SimpleNamespace

    from pinet_core.acquisition.headless_mail import HeadlessMail
    receipt = {'case_id': 'case-1', 'mail_id': 'mail-1', 'thread_id': 'thread-1'}
    class Canonical:
        committed = False
        async def capture_reviewed(self, **kwargs):
            assert kwargs['prepared'] == {'exact': 'copy'}
            self.committed = True
            return SimpleNamespace(body=json.dumps(receipt))
    bridge = HeadlessMail(None)
    bridge.correspondence = Canonical()
    scope = SimpleNamespace(business_id='business-1', site_id='synthetic-wellness', environment_id='test-acq')
    result = await bridge.capture_reviewed(scope=scope, adapter_id='wellness-test', request_id='request',
        recipient='owner@example.test', campaign=None, prospect=None, prepared={'exact': 'copy'})
    assert bridge.correspondence.committed
    assert result['receipt'] == receipt
    event = result['display_candidate']
    assert event['mail_id'] == 'mail-1' and event['external_sent'] is False
    assert event['translation_dispatched'] is False and 'body' not in event
