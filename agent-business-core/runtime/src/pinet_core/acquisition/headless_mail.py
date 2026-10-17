"""Narrow headless adapters to the existing canonical correspondence/Case core.

All capture is synthetic and non-sending. The canonical service owns scope,
current registration, replay, RLS, original mail binding and containment. No
second inbox, outbox, CRM, marketing activation or transport is introduced.
"""
import json
from email import policy
from email.parser import BytesParser

from sqlalchemy import select

from ..mail_reader import match_headers
from .contracts import Campaign, Prospect
from .correspondence import Correspondence
from .dialogue import REPLY_INSTRUCTION, prepare_reply
from .engine import fingerprint
from .instructions import compose
from .ledger import LedgerError, conditions
from .work_interfaces import InboundCapture
from .work_models import ContactPolicy, CorrespondenceThread, MailBinding, WorkReceipt


def parse_bound_reply(raw, known):
    """Parse only one bounded plain-text message matching exact known participants.

    `known` is loaded by the trusted caller from canonical committed MailMessage
    records in its admitted scope. A header match is thread linkage, not proof of
    delivery or sender authentication; the caller still owns authenticated IO.
    """
    if not isinstance(raw, bytes) or not 1 <= len(raw) <= 65536:
        raise ValueError('bounded_mail_bytes_required')
    message = BytesParser(policy=policy.default).parsebytes(raw)
    if message.defects or message.get_content_type() == 'multipart/report':
        raise ValueError('delivery_report_requires_transport_reconciliation')
    matched = match_headers(message, known)
    if not matched:
        raise ValueError('canonical_reply_participant_or_thread_mismatch')
    part = message.get_body(preferencelist=('plain',))
    body = part.get_content() if part is not None else None
    if not isinstance(body, str) or not body.strip() or len(body) > 16000:
        raise ValueError('bounded_plain_reply_required')
    parent = str(message['In-Reply-To']) if message['In-Reply-To'] is not None else next(
        key for key, row in known.items() if row == matched['original'] and key in matched['references'])
    return {**matched, 'body': body, 'in_reply_to': parent}


def committed_display_candidate(scope, receipt):
    """IDs only, after canonical transaction commit; display owner resolves pins.

    This is an integration event, not a model/translation dispatch or a promise
    the display sidecar exists. Capture replay can produce the same event; the
    receiver deduplicates by scope/mail/source hash using its own canonical hook.
    """
    return {'event': 'acquisition.mail_committed.v1', 'business_id': scope.business_id,
            'site_id': scope.site_id, 'environment_id': scope.environment_id,
            'case_id': receipt['case_id'], 'mail_id': receipt['mail_id'],
            'external_sent': False, 'synthetic': True, 'translation_dispatched': False}


class HeadlessMail:
    def __init__(self, database):
        self.correspondence = Correspondence(database)

    async def _outbound(self, tx, scope, values, thread, request_id, inbound_id):
        record = await tx.get(WorkReceipt, {**values, 'operation': 'decision', 'request_id': str(request_id)})
        if not record:
            return None, None
        receipt = json.loads(record.response_body)
        if record.thread_id != thread.thread_id or receipt['mail_id'] != inbound_id:
            raise LedgerError(409, 'headless_reply_request_conflict')
        bindings = list(await tx.scalars(select(MailBinding).where(*conditions(MailBinding, values),
            MailBinding.thread_id == thread.thread_id, MailBinding.direction == 'outbound',
            MailBinding.input_sha256 == record.body_sha256)))
        if len(bindings) > 1:
            raise LedgerError(409, 'headless_reply_binding_ambiguous')
        if not bindings:
            return receipt, None
        mail, _ = await self.correspondence.bound_mail(tx, values, thread, bindings[0].mail_id, 'outbound')
        campaign = Campaign.model_validate(thread.campaign)
        if (mail.payload.get('source_revision') != thread.source_revision
                or mail.payload.get('instruction_hash') != fingerprint([compose(campaign.sector)[0], REPLY_INSTRUCTION])
                or mail.payload.get('reviewer_hash') != compose(campaign.sector, 'reviewer')[1]):
            raise LedgerError(409, 'headless_reply_source_changed')
        if mail.payload.get('decision_request_id') != str(request_id) or mail.payload.get('reply_to_mail_id') != inbound_id:
            raise LedgerError(409, 'headless_reply_binding_invalid')
        return receipt, mail.id

    async def reply_to_case(self, *, scope, adapter_id, request_id, thread_id, inbound_id, lab):
        service = self.correspondence
        async with service.database.transaction(scope.business_id, scope.environment_id) as tx:
            values = await service.locked(tx, scope, adapter_id)
            thread = await tx.get(CorrespondenceThread, {**values, 'thread_id': thread_id},
                                  with_for_update=True, populate_existing=True)
            if not thread:
                raise LedgerError(404, 'correspondence_thread_unavailable')
            now, source = await service.admission(tx, scope, adapter_id)
            if thread.source_revision != source:
                raise LedgerError(409, 'correspondence_instructions_changed')
            replay, outbound_id = await self._outbound(tx, scope, values, thread, request_id, inbound_id)
            if replay:
                return self._reply_result(scope, replay, outbound_id)
            if thread.last_inbound_id != inbound_id:
                raise LedgerError(409, 'correspondence_decision_stale')
            inbound, binding = await service.bound_mail(tx, values, thread, inbound_id, 'inbound')
            rows = list(await tx.scalars(select(MailBinding).where(*conditions(MailBinding, values),
                MailBinding.thread_id == thread_id).order_by(MailBinding.created_at, MailBinding.mail_id).limit(31)))
            if len(rows) > 30:
                raise LedgerError(409, 'headless_context_limit')
            transcript = []
            for row in rows:
                mail, _ = await service.bound_mail(tx, values, thread, row.mail_id, row.direction)
                transcript.append({'role': 'recipient' if row.direction == 'inbound' else 'agent',
                                   'subject': mail.payload['subject'], 'body': mail.payload['body']})
            if not transcript or transcript[-1]['body'] != inbound.payload['body']:
                raise LedgerError(409, 'headless_context_order_invalid')
            campaign, prospect = Campaign.model_validate(thread.campaign), Prospect.model_validate(thread.prospect)
            policy_row = await tx.get(ContactPolicy, {**values, 'recipient_hash': thread.recipient_hash})
            revision, input_sha = thread.revision, binding.input_sha256
            suppressed = policy_row.state == 'stopped'
        result = await prepare_reply(campaign, prospect, transcript, lab, now, suppressed=suppressed)
        if result['state'] == 'blocked' or 'decision' not in result:
            # Failed prose review cannot erase a separately recognized refusal.
            raw_decision = result.get('decision', {})
            if result.get('marketing_suppression_required') and raw_decision.get('classification') in {'refusal', 'complaint'}:
                from .dialogue import ReplyDecision
                quote = raw_decision.get('privacy_request_quote', '')
                contained = ReplyDecision(classification=raw_decision['classification'],
                    action='privacy_handoff' if quote else 'stop', subject='', body='', offer_fact_ids=[],
                    privacy_request_quote=quote, reason='Failed copy review; preserve refusal and requested rights handoff')
                await service.apply_decision(scope=scope, adapter_id=adapter_id, request_id=request_id,
                    thread_id=thread_id, inbound_id=inbound_id, revision=revision, input_sha256=input_sha,
                    decision=contained, instruction_hash=result['instruction_hash'])
            return {'state': result['state'], 'prepared': result, 'outbound_mail_id': None, 'external_sent': False}
        from .dialogue import ReplyDecision
        decision = ReplyDecision.model_validate(result['decision'])
        reviewed = result if decision.action in {'reply', 'invite', 'privacy_reply'} else None
        response = await service.apply_decision(scope=scope, adapter_id=adapter_id, request_id=request_id,
            thread_id=thread_id, inbound_id=inbound_id, revision=revision, input_sha256=input_sha,
            decision=decision, instruction_hash=fingerprint([compose(campaign.sector)[0], REPLY_INSTRUCTION]),
            reviewed_reply=reviewed)
        async with service.database.transaction(scope.business_id, scope.environment_id) as tx:
            values = await service.locked(tx, scope, adapter_id)
            thread = await tx.get(CorrespondenceThread, {**values, 'thread_id': thread_id})
            receipt, outbound_id = await self._outbound(tx, scope, values, thread, request_id, inbound_id)
        assert receipt == json.loads(response.body)
        return self._reply_result(scope, receipt, outbound_id)

    @staticmethod
    def _reply_result(scope, receipt, outbound_id):
        candidate = committed_display_candidate(scope, {**receipt, 'mail_id': outbound_id}) if outbound_id else None
        return {'receipt': receipt, 'outbound_mail_id': outbound_id, 'display_candidate': candidate,
                'external_sent': False}

    async def capture_reviewed(self, *, scope, adapter_id, request_id, recipient, campaign, prospect, prepared):
        response = await self.correspondence.capture_reviewed(scope=scope, adapter_id=adapter_id,
            request_id=request_id, recipient=recipient, campaign=campaign, prospect=prospect, prepared=prepared)
        # The owned service's internal transaction has exited before this event.
        receipt = json.loads(response.body)
        return {'receipt': receipt, 'display_candidate': committed_display_candidate(scope, receipt)}

    async def receive_authenticated_capture(self, *, raw, known, scope, adapter_id,
                                            request_id, thread_id, parent_mail_id):
        if scope.environment_class != 'test':
            raise LedgerError(403, 'synthetic_scope_required')
        parsed = parse_bound_reply(raw, known)
        original = parsed['original']
        if original['site'] != scope.site_id or original['id'] != parent_mail_id:
            raise LedgerError(403, 'headless_reply_scope_mismatch')
        value = InboundCapture(scope=scope, adapter_id=adapter_id, request_id=request_id,
            thread_id=thread_id, parent_mail_id=parent_mail_id, message_id=parsed['provider_id'],
            in_reply_to=parsed['in_reply_to'],
            references=tuple(parsed['references']), sender=parsed['sender'], recipient=parsed['recipient'],
            subject=parsed['subject'], body=parsed['body'])
        response = await self.correspondence.receive(value, value.model_dump_json().encode())
        receipt = json.loads(response.body)
        return {'receipt': receipt, 'display_candidate': committed_display_candidate(scope, receipt)}
