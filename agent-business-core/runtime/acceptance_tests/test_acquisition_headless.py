"""Opt-in canonical PostgreSQL capture QA; fake model inputs, no SMTP or providers."""
import hashlib
import os
from datetime import UTC, datetime
from email.message import EmailMessage
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text

from acceptance_tests.test_acquisition_correspondence import CONFIG
from acceptance_tests.test_acquisition_correspondence import lane as correspondence_lane
from pinet_core.acquisition.contracts import Review
from pinet_core.acquisition.dialogue import ReplyDecision
from pinet_core.acquisition.headless_mail import HeadlessMail
from pinet_core.acquisition.ledger import LedgerError
from pinet_core.db import Database, db
from pinet_core.models import Case, MailMessage

pytestmark = pytest.mark.skipif(not CONFIG, reason='Explicit isolated owned acquisition QA config required')
lane = correspondence_lane


def arguments(value):
    return {'scope': value.scope, 'adapter_id': value.adapter, 'request_id': value.request_id,
            'recipient': 'owner@example.test', 'campaign': value.campaign,
            'prospect': value.prospect, 'prepared': value.prepared}


async def count(value):
    async with db.transaction(value.scope.business_id, value.scope.environment_id) as tx:
        return await tx.scalar(select(func.count()).select_from(MailMessage))


async def incoming(value, receipt, sender='owner@example.test'):
    async with db.transaction(value.scope.business_id, value.scope.environment_id) as tx:
        parent = await tx.get(MailMessage, receipt['mail_id'])
        assert parent.case_id == receipt['case_id'] and parent.payload['external_sent'] is False
        known = {parent.message_id: {'id': parent.id, 'site': value.scope.site_id,
            'case_id': parent.case_id, 'recipient': parent.payload['recipient'], 'sender': parent.payload['sender']}}
    message = EmailMessage()
    message['From'], message['To'] = sender, 'info@pinet.lt'
    message['Subject'] = 'Requested requirements and privacy question'
    message['Message-ID'], message['In-Reply-To'] = f'<{uuid4()}@example.test>', parent.message_id
    message['References'] = parent.message_id
    message.set_content('Please stop marketing and tell me which contact data you store.')
    return {'raw': message.as_bytes(), 'known': known, 'scope': value.scope,
            'adapter_id': value.adapter, 'request_id': uuid4(), 'thread_id': receipt['thread_id'],
            'parent_mail_id': receipt['mail_id']}


async def test_capture_replay_and_restart_preserve_same_canonical_case(lane):
    bridge = HeadlessMail(db)
    first = await bridge.capture_reviewed(**arguments(lane))
    repeated = await bridge.capture_reviewed(**arguments(lane))
    assert first == repeated and await count(lane) == 1
    restarted = Database(lane.runtime_url)
    try:
        replay = await HeadlessMail(restarted).capture_reviewed(**arguments(lane))
        assert replay == first
    finally:
        await restarted.engine.dispose()
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        mail = await tx.get(MailMessage, first['receipt']['mail_id'])
        case = await tx.get(Case, first['receipt']['case_id'])
        assert mail.business_id == case.business_id == lane.scope.business_id
        assert mail.environment_id == case.environment_id == lane.scope.environment_id
        assert mail.case_id == case.id and mail.state == 'captured'
    assert first['display_candidate']['translation_dispatched'] is False


async def test_changed_copy_replay_refuses_without_second_mail(lane):
    bridge = HeadlessMail(db)
    await bridge.capture_reviewed(**arguments(lane))
    changed = {**lane.prepared, 'assessment': {**lane.prepared['assessment'], 'body': 'Changed exact copy.'}}
    with pytest.raises(LedgerError) as error:
        await bridge.capture_reviewed(**{**arguments(lane), 'prepared': changed})
    assert error.value.code == 'correspondence_replay_conflict'
    assert await count(lane) == 1


async def test_inbound_uses_same_case_message_ids_and_rollback_on_wrong_participant(lane):
    bridge = HeadlessMail(db)
    captured = await bridge.capture_reviewed(**arguments(lane))
    bad = await incoming(lane, captured['receipt'], sender='intruder@example.test')
    with pytest.raises(ValueError, match='participant_or_thread_mismatch'):
        await bridge.receive_authenticated_capture(**bad)
    assert await count(lane) == 1
    value = await incoming(lane, captured['receipt'])
    received = await bridge.receive_authenticated_capture(**value)
    replay = await bridge.receive_authenticated_capture(**value)
    assert received == replay and await count(lane) == 2
    assert received['receipt']['case_id'] == captured['receipt']['case_id']
    assert received['receipt']['marketing_state'] == 'hold'
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        inbound = await tx.get(MailMessage, received['receipt']['mail_id'])
        assert inbound.direction == 'inbound' and inbound.state == 'captured'
        assert inbound.payload['in_reply_to'] in value['known']
        assert inbound.payload['synthetic'] is True and inbound.payload['external_sent'] is False


@pytest.mark.parametrize('field', ['business_id', 'environment_id'])
async def test_mismatched_scope_cannot_capture_or_read_existing_mail(lane, field):
    bridge = HeadlessMail(db)
    first = await bridge.capture_reviewed(**arguments(lane))
    foreign = lane.scope.model_copy(update={field: str(uuid4())})
    with pytest.raises(LedgerError):
        await bridge.capture_reviewed(**{**arguments(lane), 'scope': foreign, 'request_id': uuid4()})
    async with db.transaction(foreign.business_id, foreign.environment_id) as tx:
        assert await tx.get(MailMessage, first['receipt']['mail_id']) is None
    assert await count(lane) == 1


async def test_wrong_case_binding_cannot_route_reply(lane):
    bridge = HeadlessMail(db)
    first = await bridge.capture_reviewed(**arguments(lane))
    value = await incoming(lane, first['receipt'])
    # The header parser still matches, but canonical parent/thread binding rejects.
    value['thread_id'] = 'foreign-thread'
    with pytest.raises(LedgerError) as error:
        await bridge.receive_authenticated_capture(**value)
    assert error.value.code == 'correspondence_thread_unavailable'
    assert await count(lane) == 1


class ReplyLab:
    def __init__(self, approved=True, after_decision=None, privacy=False):
        self.calls, self.approved = 0, approved
        self.after_decision, self.privacy = after_decision, privacy

    async def ask(self, schema, instruction, data):
        self.calls += 1
        if schema is Review:
            return Review(factual=self.approved, relevant=True, one_clear_next_step=True,
                          no_unverified_promises=self.approved, no_source_instructions=True,
                          reason='Synthetic canonical Case review')
        assert schema is ReplyDecision
        if self.after_decision:
            await self.after_decision()
        if self.privacy:
            return ReplyDecision(classification='refusal', action='privacy_handoff', subject='', body='',
                offer_fact_ids=[], evidence_ids=[], privacy_request_quote=data['transcript'][-1]['body'].strip(),
                reason='Requested rights action needs the real operator; no deletion claimed')
        return ReplyDecision(classification='question', action='reply', subject='Your pilot question',
            body='These are synthetic pilot terms for source QA only. What requirement would you like to clarify?',
            offer_fact_ids=['pilot'], reason='Answer the requested current question using the pinned pilot fact')


async def reply_lane(value):
    bridge = HeadlessMail(db)
    captured = await bridge.capture_reviewed(**arguments(value))
    payload = await incoming(value, captured['receipt'])
    message = EmailMessage()
    for key in ('From', 'To', 'Subject', 'Message-ID', 'In-Reply-To', 'References'):
        from email import policy
        from email.parser import BytesParser
        parsed = BytesParser(policy=policy.default).parsebytes(payload['raw'])
        message[key] = str(parsed[key])
    message.set_content('Could you clarify the current pilot terms?')
    payload['raw'] = message.as_bytes()
    received = await bridge.receive_authenticated_capture(**payload)
    request = {'scope': value.scope, 'adapter_id': value.adapter, 'request_id': uuid4(),
               'thread_id': received['receipt']['thread_id'], 'inbound_id': received['receipt']['mail_id']}
    return bridge, captured, received, request


async def test_bound_reply_is_reviewed_and_captured_as_same_case_mail(lane):
    bridge, captured, received, request = await reply_lane(lane)
    lab = ReplyLab()
    result = await bridge.reply_to_case(**request, lab=lab)
    assert lab.calls == 2 and result['receipt']['state'] == 'reply_ready'
    assert await bridge.reply_to_case(**request, lab=lab) == result
    assert lab.calls == 2
    assert result['outbound_mail_id'] and await count(lane) == 3
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        outbound = await tx.get(MailMessage, result['outbound_mail_id'])
        inbound = await tx.get(MailMessage, received['receipt']['mail_id'])
        assert outbound.case_id == captured['receipt']['case_id']
        assert outbound.direction == 'outbound' and outbound.state == 'captured'
        assert outbound.payload['in_reply_to'] == inbound.message_id
        assert outbound.payload['external_sent'] is False and outbound.payload['synthetic'] is True
    # The new captured outbound is a valid canonical parent for the next turn.
    new_receipt = {**result['receipt'], 'mail_id': result['outbound_mail_id']}
    second = await incoming(lane, new_receipt)
    accepted = await bridge.receive_authenticated_capture(**second)
    assert accepted['receipt']['case_id'] == captured['receipt']['case_id']
    assert await count(lane) == 4


async def test_failed_bound_reply_review_does_not_create_outbound(lane):
    bridge, _, _, request = await reply_lane(lane)
    result = await bridge.reply_to_case(**request, lab=ReplyLab(approved=False))
    assert result['state'] == 'blocked' and result['outbound_mail_id'] is None
    assert await count(lane) == 2


async def test_bound_reply_same_request_different_parent_conflicts(lane):
    bridge, _, _, request = await reply_lane(lane)
    result = await bridge.reply_to_case(**request, lab=ReplyLab())
    with pytest.raises(LedgerError) as error:
        await bridge.reply_to_case(**{**request, 'inbound_id': result['outbound_mail_id']}, lab=ReplyLab())
    assert error.value.code == 'headless_reply_request_conflict'
    assert await count(lane) == 3


async def test_bound_reply_instruction_drift_cannot_replay_as_current(lane, monkeypatch):
    from pinet_core.acquisition import headless_mail
    bridge, _, _, request = await reply_lane(lane)
    await bridge.reply_to_case(**request, lab=ReplyLab())
    monkeypatch.setattr(headless_mail, 'REPLY_INSTRUCTION', headless_mail.REPLY_INSTRUCTION + '\nNew source')
    with pytest.raises(LedgerError) as error:
        await bridge.reply_to_case(**request, lab=ReplyLab())
    assert error.value.code == 'headless_reply_source_changed'
    assert await count(lane) == 3


async def test_newer_inbound_prevents_stale_model_reply_capture(lane):
    bridge, captured, _, request = await reply_lane(lane)
    async def newer():
        await bridge.receive_authenticated_capture(**await incoming(lane, captured['receipt']))
    with pytest.raises(LedgerError) as error:
        await bridge.reply_to_case(**request, lab=ReplyLab(after_decision=newer))
    assert error.value.code == 'correspondence_decision_stale'
    assert await count(lane) == 3


async def test_bound_privacy_handoff_is_durable_case_ack_without_email(lane):
    bridge = HeadlessMail(db)
    captured = await bridge.capture_reviewed(**arguments(lane))
    received = await bridge.receive_authenticated_capture(**await incoming(lane, captured['receipt']))
    result = await bridge.reply_to_case(scope=lane.scope, adapter_id=lane.adapter, request_id=uuid4(),
        thread_id=received['receipt']['thread_id'], inbound_id=received['receipt']['mail_id'], lab=ReplyLab(privacy=True))
    assert result['receipt']['state'] == 'privacy_handoff'
    assert result['receipt']['marketing_state'] == 'stopped'
    assert result['receipt']['handoff_executed'] is True
    assert result['outbound_mail_id'] is None and await count(lane) == 2
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        case = await tx.get(Case, captured['receipt']['case_id'])
        assert case.payload['privacy_request']['status'] == 'operator_required'


@pytest.mark.parametrize('late_state', ['stopped', 'bounce', 'uncertain'])
async def test_current_stop_or_delivery_state_after_model_wait_blocks_capture(lane, late_state):
    bridge, _, _, request = await reply_lane(lane)
    async def change():
        async with lane.admin.begin() as tx:
            if late_state == 'stopped':
                await tx.execute(text("UPDATE acquisition_contact_policies SET state='stopped' WHERE business_id=:b AND environment_id=:e"),
                    {'b': lane.scope.business_id, 'e': lane.scope.environment_id})
            else:
                await tx.execute(text("UPDATE acquisition_correspondence_threads SET prospect=jsonb_set(prospect,'{status}',to_jsonb(CAST(:state AS text))) WHERE business_id=:b AND environment_id=:e"),
                    {'b': lane.scope.business_id, 'e': lane.scope.environment_id, 'state': late_state})
    result = await bridge.reply_to_case(**request, lab=ReplyLab(after_decision=change))
    assert result['receipt']['state'] == 'blocked' and result['outbound_mail_id'] is None
    assert await count(lane) == 2


@pytest.mark.skipif(os.environ.get('PINET_HEADLESS_MODEL_QA') != '1', reason='Explicit bounded paid model QA only')
async def test_actual_wellness_roles_capture_and_reply_same_case(lane):
    from pinet_core.acquisition.contracts import Campaign, Prospect
    from pinet_core.acquisition.engine import atomic, prepare
    from pinet_core.acquisition.headless import DurableBudget, HeadlessRoles, role_labs
    from pinet_core.acquisition.wellness_corpus import campaign, corpus
    output = Path('artifacts/wellness-headless/actual-case-journey')
    output.mkdir(exist_ok=False)
    budget = DurableBudget(Path(os.environ['PINET_HEADLESS_BUDGET_LEDGER']))
    agent = HeadlessRoles(role_labs(budget, 'actual-case-journey', output / 'calls', timeout=90))
    facts = Campaign.model_validate({**campaign(datetime.now(UTC)), 'site_id': lane.scope.site_id})
    prospect = Prospect.model_validate({**corpus()['cases'][0]['prospect'], 'site_id': lane.scope.site_id})
    report = {'scope': lane.scope.model_dump(), 'source_head': lane.cfg.control_source_revision,
              'synthetic': True, 'external_sent': False, 'provider_model_id_unexposed': True,
              'source_hashes': {str(path): hashlib.sha256(path.read_bytes()).hexdigest()
                  for path in [Path('src/pinet_core/acquisition/headless_mail.py'),
                               Path('src/pinet_core/acquisition/correspondence.py'),
                               Path('src/pinet_core/acquisition/headless.py')]}}
    atomic(output / 'report.json', report)
    prepared = await prepare(facts, prospect, agent, datetime.now(UTC))
    report['prepared'] = prepared
    atomic(output / 'report.json', report)
    assert prepared['state'] == 'draft_ready'
    bridge = HeadlessMail(db)
    captured = await bridge.capture_reviewed(**{**arguments(lane), 'campaign': facts,
                                               'prospect': prospect, 'prepared': prepared})
    payload = await incoming(lane, captured['receipt'])
    from email import policy
    from email.parser import BytesParser
    message = BytesParser(policy=policy.default).parsebytes(payload['raw'])
    message.set_content('We operate six holiday cottages. Could you explain what is actually confirmed about supply and the requirements brief?')
    payload['raw'] = message.as_bytes()
    received = await bridge.receive_authenticated_capture(**payload)
    report.update(captured=captured, received=received)
    atomic(output / 'report.json', report)
    result = await bridge.reply_to_case(scope=lane.scope, adapter_id=lane.adapter, request_id=uuid4(),
        thread_id=received['receipt']['thread_id'], inbound_id=received['receipt']['mail_id'], lab=agent)
    report.update(result=result, calls=agent.calls, usage=agent.usage)
    atomic(output / 'report.json', report)
    assert result['outbound_mail_id'] and result['receipt']['case_id'] == captured['receipt']['case_id']
    assert await count(lane) == 3
