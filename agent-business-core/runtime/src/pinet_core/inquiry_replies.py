"""Known inquiry replies use the shared Case, evidence, jobs and reviewed Outbox.

No quote/order/supplier authority, unsolicited reminders or mailbox mutation.
"""
import re

from sqlalchemy import select

from . import jobs, policy, service
from .config import settings
from .db import db
from .followup_projection import verified_result
from .models import Artifact, Business, Case, Contact, Conversation, Event, Job, MailMessage, Outbox, new_id
from .sales import newest_text


def requests_stop(body):
    text = newest_text(body).casefold()
    return bool(re.search(r'nesiųsk\w*|nerašyk\w*|neberaš\w*|nebesiųs\w*|atsisakau|nebedomina|'
        r'\b(?:unsubscribe|stop emailing|do not contact|don.t email|not interested)\b', text))


async def receive(tx, original, reply):
    cfg = settings()
    item = await tx.get(Business, original.business_id)
    if not cfg.imap_enabled or not item or item.site_id not in cfg.imap_sites:
        return
    convo = await tx.get(Conversation, original.payload.get('conversation_id'), with_for_update=True)
    if not convo or convo.case_id != reply.case_id or convo.payload['test']:
        return
    case = await tx.get(Case, convo.case_id, with_for_update=True)
    inquiry = dict(case.payload.get('inquiry', {}))
    stopped = inquiry.get('opted_out', False) or requests_stop(reply.payload['body'])
    case.payload = {**case.payload, 'inquiry': {**inquiry, 'latest_reply_id': reply.id, 'opted_out': stopped}}
    # The private mail events do not appear as live browser transcripts.
    await service.add_event(tx, convo, 'email:' + reply.id, 'mail_client_transcript',
        {'text': newest_text(reply.payload['body'])[:16000], 'mail_id': reply.id})
    if not stopped:
        tx.add(Job(id=new_id(), business_id=convo.business_id, environment_id=convo.environment_id,
            conversation_id=convo.id, kind='inquiry_reply:' + reply.id, payload={'reply_id': reply.id}))


async def run(business_id, task):
    cfg = settings()
    reply_id = task['kind'].split(':', 1)[1]
    async with db.transaction(business_id, cfg.environment) as tx:
        await policy.lock(tx, business_id, cfg.environment)
        authority, _ = await policy.read(tx)
        item = await tx.get(Business, business_id)
        if (not cfg.imap_enabled or item.site_id not in cfg.imap_sites or authority.paused
                or not authority.enabled or not authority.followup_enabled):
            raise RuntimeError('waiting_mail_authority')
        await jobs.fenced_job(tx, task)
        reply = await tx.get(MailMessage, reply_id)
        convo = await tx.get(Conversation, task['conversation_id'])
        case = await tx.get(Case, convo.case_id, with_for_update=True)
        inquiry = case.payload.get('inquiry', {})
        if (not reply or reply.case_id != case.id or reply.direction != 'inbound'
                or reply.payload.get('source_ref') != 'authenticated_imap_reply'):
            raise ValueError('inquiry_reply_scope')
        if inquiry.get('opted_out') or inquiry.get('latest_reply_id') != reply_id:
            job = await jobs.fenced_job(tx, task)
            job.state = 'succeeded'
            job.payload = {**job.payload, 'result': 'superseded_or_opted_out'}
            return
        parent_id = reply.payload['in_reply_to']
        provider_id = reply.message_id
        sender = reply.payload['sender']
        contact = await tx.scalar(select(Contact).where(Contact.conversation_id == convo.id, Contact.channel == 'email'))
        if not contact or contact.value.casefold() != sender.casefold():
            raise ValueError('reply_contact_changed')
    data = await jobs.load_input(business_id, task['conversation_id'])
    async with db.transaction(business_id, cfg.environment) as tx:
        mail_events = list(await tx.scalars(select(Event).where(Event.conversation_id == task['conversation_id'],
            Event.kind.in_(['mail_client_transcript', 'mail_agent_transcript'])).order_by(Event.sequence)))
    data['evidence'] += [{'id': e.id, 'speaker': 'client' if e.kind == 'mail_client_transcript' else 'agent',
                          'text': e.payload['text']} for e in mail_events]
    data['need'] = {}  # Prior structured need may have been corrected in the newer email.
    data['reply_context'] = {'latest_reply_id': reply_id,
        'action': 'Answer the latest customer email and use older evidence only as context. Acknowledge corrections. '
                  'No quote, order, payment, supplier contact or callback has been authorized.'}
    result = await jobs.evaluate('analysis', data, action_key=f"model:{task['id']}:{task['generation']}")
    content = verified_result(data, result)
    if not content:
        raise RuntimeError('reply_review_unavailable')  # Never send an unreviewed fallback.
    content = {**content, 'in_reply_to': provider_id, 'references': [parent_id, provider_id]}
    async with db.transaction(business_id, cfg.environment) as tx:
        job = await jobs.fenced_job(tx, task)
        case = await tx.get(Case, case.id, with_for_update=True)
        inquiry = case.payload.get('inquiry', {})
        if inquiry.get('opted_out') or inquiry.get('latest_reply_id') != reply_id:
            job.state = 'succeeded'
            job.payload = {**job.payload, 'result': 'superseded_or_opted_out'}
            return
        contact = await tx.get(Contact, contact.id)
        if contact.value.casefold() != sender.casefold():
            raise ValueError('reply_contact_changed')
        artifact = Artifact(id=new_id(), business_id=business_id, environment_id=cfg.environment,
            conversation_id=task['conversation_id'], kind=task['kind'], payload=content)
        tx.add(artifact)
        tx.add(Outbox(id=new_id(), business_id=business_id, environment_id=cfg.environment,
            conversation_id=task['conversation_id'], kind='email', action_key=task['kind'], state='prepared',
            payload={'reply_id': reply_id, 'contact_id': contact.id,
                'contact_revision': contact.payload.get('revision', 1), 'artifact_id': artifact.id,
                'artifact_hash': content['hash']}))
        job.state = 'succeeded'
