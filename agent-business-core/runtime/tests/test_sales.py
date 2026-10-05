import copy
from datetime import timedelta

import pytest

from pinet_core import mailbox, sales, service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, MailMessage, new_id, utcnow


def sale():
    return {'revision': 1, 'status': 'awaiting_response', 'followup_due': None, 'discount_count': 0,
        'reminder_count': 0, 'policy': sales.NegotiationPolicy().model_dump(), 'selected': None,
        'options': [{'product': 'Padanga 420/85 R28', 'unit_price': '671.66', 'quantity': 2,
            'total': '1343.32', 'currency': 'EUR', 'tax_treatment': 'not_registered',
            'source_quote_ref': 'quote:known', 'internal': {'checked_at': utcnow().date().isoformat(),
            'supplier_cost': '584.05'}}]}


def test_negotiation_preserves_floor_and_does_not_invent_alternatives():
    original = sale()
    value, body, _ = sales.transition(original, sales.Decision(intent='price_objection', option=1,
        budget_unit_eur='660'), 'V1 per brangu, biudžetas 660 EUR/vnt.')
    assert value['options'][0]['unit_price'] == '654.14'
    assert value['options'][0]['total'] == '1308.28'
    assert original['options'][0]['unit_price'] == '671.66'
    value, body, _ = sales.transition(value, sales.Decision(intent='price_objection', option=1,
        budget_unit_eur='100'), 'Biudžetas 100')
    assert value['options'][0]['unit_price'] == '654.14' and 'negalime' in body
    assert '584.05' not in body


def test_vague_acceptance_old_price_and_unsupported_buyer_do_not_issue_invoice():
    original = sale()
    for text in ['Gerai', 'V1 patvirtinu 2 vnt., 1000.00 EUR']:
        changed, body, buyer = sales.transition(original, sales.Decision(intent='accept', option=1), text)
        assert changed['status'] == 'awaiting_details' and buyer is None and body
    decision = sales.Decision(intent='accept', option=1, buyer=sales.Buyer(name='Jonas', kind='consumer',
        address='Kaunas', registration_code=''))
    with pytest.raises(ValueError, match='buyer_evidence'):
        sales.transition(original, decision, 'Patvirtinu V1, 2 vnt., 1343.32 EUR. Petras, Vilnius')
    changed, body, buyer = sales.transition(original, decision, 'Patvirtinu V1, 2 vnt., 1343.32 EUR. Jonas, Kaunas')
    assert changed['status'] == 'invoice_ready' and buyer.name == 'Jonas'


def test_refusal_payment_claim_and_stale_price_are_distinct():
    for intent in ['opt_out', 'decline']:
        changed, body, _ = sales.transition(sale(), sales.Decision(intent=intent), 'Nesiųskite')
        assert changed['followup_due'] is None and body is None
    changed, body, _ = sales.transition(sale(), sales.Decision(intent='payment_claim'), 'Jau mokėjau')
    assert changed['status'] == 'pending_review' and 'patvirtinti' in body
    changed, body, _ = sales.transition(sale(), sales.Decision(intent='accept', option=1),
        'Patvirtinu V1 2 vnt. 1343.32 EUR', now=utcnow() + timedelta(days=1))
    assert changed['status'] == 'pending_review' and 'aktualias' in body
    assert sales.newest_text('Per brangu\n\nOn Thu wrote:\n> Patvirtinu V1') == 'Per brangu'


async def case_fixture(client, monkeypatch):
    monkeypatch.setattr(settings(), 'lab_mail_recipient', 'owner@example.org')
    item = await service.business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        case = Case(id=new_id(), business_id=item.id, environment_id=settings().environment,
                    payload={'test': True, 'source': 'owner_sales_lab'})
        tx.add(case)
        await tx.flush()
        mid = await sales.begin(tx, item, case, 'owner@example.org', sale()['options'])
        message = await tx.get(MailMessage, mid)
        message.state = 'accepted_by_smtp'
        await sales.record_delivery(tx, message)
        return item, case.id, mid


async def test_reminder_once_after_24h_and_reply_cancels(client, monkeypatch):
    item, case_id, mid = await case_fixture(client, monkeypatch)
    assert await sales.remind_one(item, utcnow() + timedelta(hours=23)) is None
    result = await sales.remind_one(item, utcnow() + timedelta(hours=25))
    assert result['case_id'] == case_id
    assert await sales.remind_one(item, utcnow() + timedelta(days=3)) is None
    async with db.transaction(item.id, settings().environment) as tx:
        reminder = await tx.get(MailMessage, result['mail_id'])
        original = await tx.get(MailMessage, mid)
        assert reminder.payload['in_reply_to'] == original.message_id
        assert '671.66' not in reminder.payload['body']  # Stale price is not repeated tomorrow.
        assert reminder.payload['hash'] == mailbox.fingerprint(reminder.payload)
    item, case2, mid2 = await case_fixture(client, monkeypatch)
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, mid2)
        await mailbox.receive_reply(tx, original, '<reply@stop.example>', 'owner@example.org', 'Re: offre', 'Nesiųskite daugiau.')
        assert (await tx.get(Case, case2)).payload['sales']['followup_due'] is None
    assert await sales.remind_one(item, utcnow() + timedelta(hours=25)) is None


async def test_reply_worker_invoice_same_case_and_idempotency(client, monkeypatch):
    item, case_id, mid = await case_fixture(client, monkeypatch)
    body = 'Patvirtinu V1, 2 vnt., 1343.32 EUR. Jonas, Kaunas'
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, mid)
        await mailbox.receive_reply(tx, original, '<accept@case.example>', 'owner@example.org', 'Re: offre', body)

    class Interpreter:
        async def ask(self, schema, instruction, data):
            assert 'supplier_cost' not in str(data) and 'owner@example.org' not in str(data)
            return sales.Decision(intent='accept', option=1, buyer=sales.Buyer(name='Jonas', kind='consumer',
                address='Kaunas', registration_code=''))

    result = await sales.run_reply(item, Interpreter())
    assert result['case_id'] == case_id and result['state'] == 'invoice_ready'
    assert await sales.run_reply(item, Interpreter()) is None
    async with db.transaction(item.id, settings().environment) as tx:
        case = await tx.get(Case, case_id)
        message = await tx.get(MailMessage, result['mail_id'])
        assert message.case_id == case_id and message.payload['in_reply_to'] == '<accept@case.example>'
        assert message.payload['attachments'][0]['content_type'] == 'application/pdf'
        assert not case.payload['invoice_test']['snapshot']['issued']
        assert case.payload['sales']['status'] == 'invoice_ready'
        assert case.payload['sales']['pending_mail_id'] == result['mail_id']
        assert case.payload['sales']['followup_due'] is None
        mutated = copy.deepcopy(message.payload)
        mutated['in_reply_to'] = '<other@case.example>'
        assert mailbox.fingerprint(mutated) != message.payload['hash']


async def test_reply_racing_interpretation_fences_old_decision(client, monkeypatch):
    item, case_id, mid = await case_fixture(client, monkeypatch)
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, mid)
        await mailbox.receive_reply(tx, original, '<first@case.example>', 'owner@example.org', 'Re: offre', 'V1 iki 660')

    class RacingInterpreter:
        async def ask(self, schema, instruction, data):
            async with db.transaction(item.id, settings().environment) as tx:
                original = await tx.get(MailMessage, mid)
                await mailbox.receive_reply(tx, original, '<newer@case.example>', 'owner@example.org',
                                            'Re: offre', 'Nebereikia, nesiųskite daugiau')
            return sales.Decision(intent='price_objection', option=1, budget_unit_eur='660')

    result = await sales.run_reply(item, RacingInterpreter())
    assert result['state'] == 'revision_changed'
    async with db.transaction(item.id, settings().environment) as tx:
        case = await tx.get(Case, case_id)
        assert case.payload['sales']['discount_count'] == 0
        assert case.payload['sales']['options'][0]['unit_price'] == '671.66'
        first = await tx.scalar(__import__('sqlalchemy').select(MailMessage).where(
            MailMessage.message_id == '<first@case.example>'))
        assert first.state == 'superseded_by_new_reply'


async def test_expired_interpretation_lease_recovers_without_duplicate_action(client, monkeypatch):
    item, case_id, mid = await case_fixture(client, monkeypatch)
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, mid)
        row = await mailbox.receive_reply(tx, original, '<expired@case.example>', 'owner@example.org', 'Re: offre', 'Nesiųskite')
        row.state = 'interpreting'
        row.payload = {**row.payload, 'sales_lease_until': (utcnow() - timedelta(minutes=1)).isoformat(),
                       'sales_lease_token': 'crashed-worker'}

    class Interpreter:
        async def ask(self, *args):
            return sales.Decision(intent='opt_out')

    result = await sales.run_reply(item, Interpreter())
    assert result['state'] == 'opted_out' and result['mail_id'] is None
    assert await sales.run_reply(item, Interpreter()) is None
