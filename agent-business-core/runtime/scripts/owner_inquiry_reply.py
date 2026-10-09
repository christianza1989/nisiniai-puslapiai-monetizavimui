"""Reviewed reply to a known owner's inquiry thread, using the shared mail core."""
import argparse
import asyncio
import json
from pathlib import Path

from google import genai
from google.genai import types
from sqlalchemy import select

from pinet_core import agent_instructions, budget, email_agent, knowledge, mailbox, policy, pricing, service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, MailMessage
from pinet_core.security import digest


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', required=True)
    parser.add_argument('--parent-message-id', required=True)
    parser.add_argument('--send', action='store_true')
    args = parser.parse_args()
    cfg = settings()
    namespace = cfg.environment
    item = await service.business(args.site)
    if not cfg.lab_mail_enabled or cfg.smtp_enabled or cfg.lab_mail_recipient != cfg.sender_email:
        raise ValueError('isolated_owner_reply_required')
    async with db.transaction(item.id, 'local') as tx:
        parent = await tx.scalar(select(MailMessage).where(MailMessage.message_id == args.parent_message_id,
            MailMessage.direction == 'outbound', MailMessage.state == 'accepted_by_smtp'))
        if not parent or parent.payload['recipient'] != cfg.lab_mail_recipient:
            raise ValueError('known_owner_thread_required')
        reply = await tx.scalar(select(MailMessage).where(MailMessage.case_id == parent.case_id,
            MailMessage.direction == 'inbound').order_by(MailMessage.created_at.desc()).limit(1))
        if not reply or reply.payload.get('source_ref') != 'authenticated_imap_reply':
            raise ValueError('authenticated_reply_required')
        case_id, reply_id, text = reply.case_id, reply.id, reply.payload['body']
        source = 'reviewed-inquiry-reply:' + digest(reply.message_id)
        existing = await tx.scalar(select(MailMessage).where(MailMessage.case_id == case_id,
            MailMessage.payload['source_ref'].astext == source))
        prepared_id = existing.id if existing else None
    review = None
    if not prepared_id:
        action = 'owner-inquiry:' + digest(reply_id)
        async with db.transaction(item.id, namespace) as tx:
            await policy.lock(tx, item.id, namespace)
            authority, _ = await policy.require(tx)
            await budget.reserve(tx, item.id, authority, action, 120000)
            approved = await knowledge.projection(tx)
        observed = 0
        class Lab:
            async def ask(self, schema, instruction, data):
                nonlocal observed
                async with genai.Client(api_key=cfg.google_api_key).aio as client:
                    output = await asyncio.wait_for(client.models.generate_content(model=cfg.analysis_model,
                        contents=json.dumps(data, ensure_ascii=False), config=types.GenerateContentConfig(
                            system_instruction=instruction, response_mime_type='application/json',
                            response_json_schema=schema.model_json_schema())), 45)
                observed += pricing.flash_estimate(output.usage_metadata, cfg.analysis_model)
                if observed > 120000:
                    raise ValueError('reply_cost_ceiling')
                return schema.model_validate_json(output.text)
        try:
            body, review = await email_agent.draft(Lab(), agent_instructions.compose(args.site, 'sales').prompt,
                text, {'action': 'acknowledge_customer_clarification_and_ask_one_useful_missing_requirement',
                    'constraints': 'No verified price, stock, order, supplier contact or callback receipt.'},
                approved, [], quote_allowed=False)
        finally:
            await budget.record_analysis(item.id, action, observed)
        cfg.environment = 'local'
        async with db.transaction(item.id, 'local') as tx:
            prepared = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=case_id,
                recipient=cfg.lab_mail_recipient, subject='Re: StepOver pasirašymo sprendimas',
                body='Sveiki,\n\n' + body + '\n\nPinet · virtualus AI konsultantas',
                source_ref=source, reply_message_id=reply_id))
            prepared_id = prepared.id
            case = await tx.get(Case, case_id, with_for_update=True)
            case.payload = {**case.payload, 'inquiry_reply': {'inbound_id': reply_id,
                'review_approved': review['approved'], 'draft_id': prepared_id, 'body_hash': digest(body)}}
    cfg.environment = 'local'
    receipt = await mailbox.send_test(item.id, prepared_id) if args.send else {'state': 'draft'}
    result = {'site_id': args.site, 'same_case': True, 'real_owner_reply': True,
        'reviewed': bool(review and review['approved']) or bool(existing),
        'state': receipt['state'], 'message_id': receipt.get('message_id'),
        'owner_only': True, 'ordinary_automatic_smtp': False, 'inbox_verified': False}
    output = Path('artifacts') / (args.site + '-voice') / 'inquiry-reply-receipt.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))
    await db.engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
