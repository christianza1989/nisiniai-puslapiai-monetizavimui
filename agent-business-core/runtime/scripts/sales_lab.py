"""Single-owner SMTP/IMAP sales case driver. No real procurement or payment."""
import argparse
import asyncio
import json
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

from pinet_core import mail_reader, mailbox, sales, service
from pinet_core.attachments import pdf_bytes
from pinet_core.codex_lab import CodexLab
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, MailMessage
from pinet_core.offers import OfferSnapshot, PricingPolicy, retail_options
from pinet_core.security import digest


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['begin', 'process', 'remind'])
    parser.add_argument('--site', default='traktoriupadangos')
    parser.add_argument('--send', action='store_true')
    parser.add_argument('--retry-case', default=None)
    args = parser.parse_args()
    cfg = settings()
    if cfg.environment != 'local' or not cfg.lab_mail_enabled or cfg.smtp_enabled or cfg.voice_enabled:
        raise RuntimeError('configured_local_owner_sales_only')
    item = await service.business(args.site)
    directory = Path('artifacts/sales-lab')
    directory.mkdir(parents=True, exist_ok=True)
    result = None
    if args.action == 'begin':
        snapshot = OfferSnapshot.model_validate_json(Path('evals/public-offers.json').read_text(encoding='utf-8'))
        policy = PricingPolicy.model_validate_json(Path('artifacts/pricing', item.site_id + '.json').read_text(encoding='utf-8'))
        need = {'tyre_marking': {'value': '420/85 R28'}, 'quantity': {'value': '2'}}
        _, options = retail_options(need, snapshot, item.site_id, policy)
        async with db.transaction(item.id, cfg.environment) as tx:
            case = Case(id=str(uuid4()), business_id=item.id, environment_id=cfg.environment,
                payload={'test': True, 'source': 'owner_sales_lab', 'need': need})
            tx.add(case)
            await tx.flush()
            mid = await sales.begin(tx, item, case, cfg.lab_mail_recipient, options)
            result = {'case_id': case.id, 'mail_id': mid, 'state': 'offer_prepared'}
    elif args.action == 'process':
        if args.retry_case:
            async with db.transaction(item.id, cfg.environment) as tx:
                case = await tx.get(Case, args.retry_case, with_for_update=True)
                if not case or case.payload.get('source') != 'owner_sales_lab' or not case.payload.get('test'):
                    raise RuntimeError('owned_lab_case_required')
                rows = await tx.scalars(select(MailMessage).where(MailMessage.case_id == case.id,
                    MailMessage.state == 'manual_review').with_for_update())
                for row in rows:
                    attempts = row.payload.get('review_retries', [])
                    code_hash = digest(Path('src/pinet_core/email_agent.py').read_text(encoding='utf-8') +
                                       Path('src/pinet_core/sales.py').read_text(encoding='utf-8'))
                    if sum(attempt.get('code_hash') == code_hash for attempt in attempts) >= 2 or len(attempts) >= 5:
                        raise RuntimeError('bounded_review_retry_exhausted')
                    row.payload = {**row.payload, 'review_retries': attempts + [
                        {'sales_error': row.payload.get('sales_error'), 'diagnostic': row.payload.get('letter_diagnostic'),
                         'code_hash': code_hash} ]}
                    row.state = 'received'
        print(json.dumps(await mail_reader.sync_replies()), flush=True)
        lab = CodexLab(max_calls=12)
        lab.free_language = True
        for _ in range(20):
            row = await sales.run_reply(item, lab)
            if not row:
                break
            if row.get('mail_id'):
                result = row
            print(json.dumps(row), flush=True)
        print(json.dumps({'cli_calls': lab.calls}), flush=True)
    else:
        result = await sales.remind_one(item)
    # Recover prepared drafts after a runner crash; unknown SMTP delivery is never retried.
    async with db.transaction(item.id, cfg.environment) as tx:
        pending = list(await tx.scalars(select(MailMessage).join(Case, Case.id == MailMessage.case_id).where(
            Case.payload['source'].astext == 'owner_sales_lab', MailMessage.state == 'draft').limit(20)))
        ids = [row.id for row in pending]
    if args.send:
        for mid in ids:
            print(json.dumps(await mailbox.send_test(item.id, mid)), flush=True)
    async with db.transaction(item.id, cfg.environment) as tx:
        messages = list(await tx.scalars(select(MailMessage).join(Case, Case.id == MailMessage.case_id).where(
            Case.payload['source'].astext == 'owner_sales_lab').order_by(MailMessage.created_at)))
        receipt = {'messages': [mailbox.public(row, detail=True) for row in messages],
                   'production_smtp_enabled': cfg.smtp_enabled, 'real_orders': False}
        for row in messages:
            for attachment in row.payload.get('attachments', []):
                if attachment.get('content_type') == 'application/pdf':
                    (directory / (row.case_id + '.pdf')).write_bytes(pdf_bytes(attachment))
    (directory / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result or {'state': 'no_pending_action'}), flush=True)
    await db.engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
