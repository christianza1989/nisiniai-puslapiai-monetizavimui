"""Read-only transport, case and PDF verification for the owner sales exercise."""
import argparse
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
    parser = argparse.ArgumentParser()
    parser.add_argument('case_id')
    parser.add_argument('--browser-attestation', type=Path,
        help='Screenshot from the separately inspected owner inbox; this script cannot inspect Gmail.')
    args = parser.parse_args()
    cfg = settings()
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, cfg.environment) as tx:
        case = await tx.get(Case, args.case_id)
        if not case or not case.payload.get('test'):
            raise ValueError('owner_lab_case_required')
        messages = list(await tx.scalars(select(MailMessage).where(
            MailMessage.case_id == case.id).order_by(MailMessage.created_at)))
        outbound = [m for m in messages if m.direction == 'outbound' and m.state == 'accepted_by_smtp']
        inbound = [m for m in messages if m.direction == 'inbound']
        invoices = [m for m in outbound if m.payload.get('attachments')]
        invoice = invoices[0] if len(invoices) == 1 else None
        pdf = pdf_bytes(invoice.payload['attachments'][0]) if invoice else b''
        snapshot = case.payload.get('invoice_test', {}).get('snapshot', {})
        checks = {
            'four_accepted_outbound_three_imported_replies': len(outbound) == 4 and len(inbound) == 3,
            'one_case': all(m.case_id == case.id for m in messages),
            'owner_only_recipient': all(m.payload['recipient'] == cfg.lab_mail_recipient for m in outbound),
            'authenticated_sender': all(m.payload['sender'] == 'info@pinet.lt' for m in outbound),
            'immutable_send_fingerprints': all(mailbox.fingerprint(m.payload) == m.payload['hash'] for m in outbound),
            'no_visible_test_labels_or_supplier_links': all(not any(s in (
                m.payload['subject'] + m.payload['body']).lower() for s in
                ['[test', 'testin', 'sintetin', 'https://', 'http://']) for m in outbound),
            'single_pdf': len(invoices) == 1 and pdf.startswith(b'%PDF-'),
            'confirmed_total': snapshot.get('gross') == '1308.28',
            'no_fiscal_order_or_payment': not snapshot.get('issued', True) and not snapshot.get('payment_requested', True),
            'production_voice_and_smtp_off': not cfg.voice_enabled and not cfg.smtp_enabled,
        }
    async with httpx.AsyncClient(base_url=cfg.core_url, timeout=10) as client:
        health = (await client.get('/health')).json()
        checks['local_api_healthy_voice_not_ready'] = health['status'] == 'ok' and not health['voice_ready']
        if invoice:
            url = f'/operator/sites/traktoriupadangos/mail/{invoice.id}/attachments/0'
            headers = {'Authorization': 'Bearer ' + cfg.operator_secret}
            download = await client.get(url, headers=headers)
            anonymous = await client.get(url)
            foreign = await client.get(url.replace('traktoriupadangos', 'greitossvetaines'), headers=headers)
            checks['scoped_pdf_http_access'] = (download.status_code == 200 and download.content == pdf
                and anonymous.status_code == 401 and foreign.status_code == 404)
    evidence = args.browser_attestation
    if evidence and (not evidence.is_file() or evidence.suffix.lower() != '.png'):
        raise ValueError('browser_evidence_png_required')
    output = {'date': '2026-10-01', 'case_id': args.case_id, 'checks': checks,
        'passed': all(checks.values()), 'pdf_sha256': sha256(pdf).hexdigest(),
        'recipient_inbox_verified': bool(evidence),
        'inbox_evidence': evidence.name if evidence else None,
        'inbox_evidence_sha256': sha256(evidence.read_bytes()).hexdigest() if evidence else None,
        'inbox_evidence_method': 'Separate browser attestation, not an automated Gmail verification',
        'real_customer_or_paid_sale': False}
    Path('artifacts/sales-lab/qa.json').write_text(json.dumps(output, indent=2), encoding='utf-8')
    await db.engine.dispose()
    print(json.dumps({'checks': checks, 'passed': output['passed']}))
    if not output['passed']:
        raise RuntimeError('sales_case_qa_failed')


if __name__ == '__main__':
    asyncio.run(main())
