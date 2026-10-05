"""Explicit synthetic customer acceptance. No supplier order or fiscal invoice."""
import argparse
import asyncio
import json
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from pinet_core import mailbox, order_tests, service
from pinet_core.attachments import pdf_bytes
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, MailMessage
from pinet_core.offers import OfferSnapshot, PricingPolicy, retail_options


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', default='traktoriupadangos')
    parser.add_argument('--confirm', action='store_true')
    parser.add_argument('--send', action='store_true')
    parser.add_argument('--case-id')
    args = parser.parse_args()
    if settings().environment != 'local' or (args.send and not args.confirm):
        raise ValueError('local_synthetic_confirmation_required')
    item = await service.business(args.site)
    fixture = json.loads(Path('evals/invoice-draft.json').read_text(encoding='utf-8'))
    snapshot = OfferSnapshot.model_validate_json(Path('evals/public-offers.json').read_text(encoding='utf-8'))
    pricing = PricingPolicy.model_validate_json(Path('artifacts/pricing', args.site + '.json').read_text(encoding='utf-8'))
    _, variants = retail_options({'tyre_marking': {'value': '420/85 R28'}, 'quantity': {'value': '2'}}, snapshot, args.site, pricing)
    if not variants:
        raise ValueError('current_retail_offer_required')
    selected = variants[0]
    request = order_tests.QuoteInput.model_validate({
        'request_id': str(uuid5(NAMESPACE_URL, 'owner-customer-pdf-2026-10-01:' + args.site)),
        'case_id': args.case_id,
        'buyer': {'name': 'Jonas Petrauskas', 'kind': 'consumer'}, 'currency': fixture['currency'],
        'lines': [{'description': selected['product'], 'quantity': selected['quantity'], 'unit': 'vnt.',
            'unit_net_eur': selected['unit_price'], 'price_basis': 'net_excluding_vat',
            'source_quote_ref': selected['source_quote_ref']}], 'synthetic': True})
    async with db.transaction(item.id, settings().environment) as tx:
        result = await order_tests.prepare(tx, item, request)
    if args.confirm:
        confirmation = order_tests.Confirmation(quote_hash=result['quote_hash'],
            confirmation_text='Sintetinis klientas patvirtina tik sistemos bandymo pasiūlymą. Mokėti nereikia.',
            synthetic=True)
        async with db.transaction(item.id, settings().environment) as tx:
            result = await order_tests.confirm(tx, item, result['case_id'], confirmation)
    if args.send and result.get('mail_id'):
        result['mail_delivery_state'] = (await mailbox.send_test(item.id, result['mail_id']))['state']
    if result.get('mail_id'):
        async with db.transaction(item.id, settings().environment) as tx:
            case = await tx.get(Case, result['case_id'])
            message = await tx.get(MailMessage, result['mail_id'])
            result['invoice_snapshot'] = case.payload['invoice_test']['snapshot']
            target = Path('artifacts/customer-preview-2026-10-01')
            target.mkdir(parents=True, exist_ok=True)
            (target / 'saskaita.pdf').write_bytes(pdf_bytes(message.payload['attachments'][0]))
            (target / 'saskaita.html').write_text(case.payload['invoice_test']['html'], encoding='utf-8')
    output = Path('artifacts/order-test-customer-pdf-2026-10-01.json')
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    await db.engine.dispose()
    print(json.dumps({'state': result['state'], 'mail_delivery_state': result.get('mail_delivery_state'),
        'real_order_created': False, 'fiscal_invoice_issued': False, 'receipt': str(output)}))


if __name__ == '__main__':
    asyncio.run(main())
