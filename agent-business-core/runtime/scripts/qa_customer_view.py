"""Current customer presentation receipts; no secrets or message bodies in output."""
import asyncio
import json
from hashlib import sha256
from pathlib import Path

import httpx
from sqlalchemy import select

from pinet_core import mailbox, service
from pinet_core.attachments import pdf_bytes
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, MailMessage


async def main():
    cfg = settings()
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, cfg.environment) as tx:
        messages = list(await tx.scalars(select(MailMessage).where(
            MailMessage.payload['customer_facing'].as_boolean().is_(True))))
        pdf_messages = [m for m in messages if m.payload.get('attachments')]
        invoice = pdf_messages[0] if len(pdf_messages) == 1 else None
        case = await tx.get(Case, invoice.case_id) if invoice else None
        receipts = [{'id': m.id, 'state': m.state, 'hash_verified': mailbox.fingerprint(m.payload) == m.payload['hash'],
            'only_owner_recipient': m.payload['recipient'] == cfg.lab_mail_recipient,
            'sender_verified': m.payload['sender'] == 'info@pinet.lt',
            'no_visible_test_markers': not any(w in (m.payload['subject'] + m.payload['body']).lower()
                for w in ['[test', 'testin', 'sintetin']),
            'no_supplier_urls': 'https://' not in m.payload['body'] and 'http://' not in m.payload['body']}
            for m in messages]
        pdf = pdf_bytes(invoice.payload['attachments'][0]) if invoice else b''
        snapshot = case.payload['invoice_test']['snapshot'] if case else {}
        checks = {'six_customer_view_letters': len(messages) == 6,
            'accepted_by_smtp': all(r['state'] == 'accepted_by_smtp' for r in receipts),
            'protected_internal_scope': all(r['hash_verified'] and r['only_owner_recipient'] and r['sender_verified'] for r in receipts),
            'clean_customer_presentation': all(r['no_visible_test_markers'] and r['no_supplier_urls'] for r in receipts),
            'pdf_attached': len(pdf_messages) == 1 and pdf.startswith(b'%PDF-'),
            'same_case_as_offer': bool(invoice) and any(m.case_id == invoice.case_id and m.id != invoice.id for m in messages),
            'our_marked_up_total': snapshot.get('gross') == '1343.32',
            'no_fiscal_order_or_payment': not snapshot.get('issued', True) and not snapshot.get('payment_requested', True),
            'production_channels_off': not cfg.smtp_enabled and not cfg.voice_enabled}
    output = {'date': '2026-10-01', 'checks': checks, 'passed': all(checks.values()),
        'receipts': receipts, 'pdf_sha256': sha256(pdf).hexdigest(), 'recipient_inbox_verified': False}
    if invoice:
        async with httpx.AsyncClient(base_url='http://127.0.0.1:8840', timeout=10) as client:
            url = '/operator/sites/traktoriupadangos/mail/' + invoice.id + '/attachments/0'
            headers = {'Authorization': 'Bearer ' + cfg.operator_secret}
            downloaded = await client.get(url, headers=headers)
            anonymous = await client.get(url)
            foreign = await client.get(url.replace('traktoriupadangos', 'greitossvetaines'), headers=headers)
            checks['live_scoped_pdf_download'] = (downloaded.status_code == 200 and downloaded.content == pdf
                and anonymous.status_code == 401 and foreign.status_code == 404)
    output['passed'] = all(checks.values())
    Path('artifacts/customer-view-qa-2026-10-01.json').write_text(json.dumps(output, indent=2), encoding='utf-8')
    await db.engine.dispose()
    print(json.dumps({'checks': checks, 'passed': output['passed']}))
    if not output['passed']:
        raise RuntimeError('customer_view_qa_failed')


if __name__ == '__main__':
    asyncio.run(main())
