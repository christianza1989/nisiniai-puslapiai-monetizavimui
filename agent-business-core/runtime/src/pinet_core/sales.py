"""Reusable local sales cases. Models interpret language; server owns prices and writes.

All automated transport is still restricted to the owner's single lab recipient.
Case row locks + revision fencing make reply/reminder transitions durable and deduplicated.
No purchase, payment verification or fiscal issuance is performed here.
"""
import copy
import re
from datetime import datetime, timedelta
from typing import Literal
from uuid import NAMESPACE_URL, uuid5

from fastapi import HTTPException
from pydantic import Field
from sqlalchemy import and_, or_, select

from . import agent_instructions, invoicing, knowledge, mailbox, order_tests
from .config import settings
from .contracts import Strict
from .db import db
from .models import Case, MailMessage, new_id, utcnow
from .security import digest


class Buyer(Strict):
    name: str = Field(max_length=150)
    kind: Literal['consumer', 'business']
    address: str = Field(max_length=300)
    registration_code: str = Field(max_length=50)


class Decision(Strict):
    intent: Literal['price_objection', 'accept', 'clarification', 'decline', 'opt_out', 'payment_claim', 'other']
    option: int | None = Field(default=None, ge=1, le=30)
    budget_unit_eur: str | None = None
    buyer: Buyer | None = None
    question: str = Field(default='', max_length=500)


class NegotiationPolicy(Strict):
    minimum_markup_percent: str = '10'
    discount_steps: list[str] = Field(default_factory=lambda: ['12', '10'], max_length=3)
    reminder_hours: int = Field(default=24, ge=24, le=168)
    max_reminders: Literal[1] = 1

    def validate_prices(self):
        floor = invoicing.money(self.minimum_markup_percent)
        steps = [invoicing.money(value) for value in self.discount_steps]
        if floor <= 0 or floor > 100 or any(step < floor or step > 100 for step in steps):
            raise ValueError('invalid_discount_floor')
        if steps != sorted(set(steps), reverse=True):
            raise ValueError('discount_steps_must_decrease')


def newest_text(body):
    """Conservative quote removal: ambiguous formats remain evidence, never instructions."""
    lines = []
    for line in body.splitlines():
        if line.lstrip().startswith('>'):
            break
        if re.search(r'^(On .+wrote:|.*rašė:|.*писал.*:|-----Original Message-----|From:|Nuo:)', line.strip()):
            break
        lines.append(line)
    return '\n'.join(lines).strip()[:4000]


def client_options(sale):
    return [{'option': index, **{key: row[key] for key in ['product', 'unit_price', 'quantity', 'total', 'currency']}}
            for index, row in enumerate(sale['options'], 1)]


def price_block(sale):
    lines = []
    for row in client_options(sale):
        lines.append(f"V{row['option']}. {row['product']}\n{row['quantity']} vnt. × {row['unit_price']} EUR = {row['total']} EUR.")
    lines.append('PVM neskaičiuojamas. Prekių kainos preliminarios; tinkamumą, pristatymo kainą ir terminą '
                 'reikia patvirtinti prieš galutinį užsakymą.')
    return '\n\n'.join(lines)


async def begin(tx, item, case, recipient, options, policy=None):
    if not case.payload.get('test') or not options or recipient != settings().lab_mail_recipient:
        raise HTTPException(409, 'owner_sales_case_required')
    if case.payload.get('sales'):
        return case.payload['sales']['pending_mail_id']
    policy = policy or NegotiationPolicy()
    policy.validate_prices()
    for row in options:
        if (not isinstance(row.get('quantity'), int) or not 1 <= row['quantity'] <= 10000 or
                row.get('currency') != 'EUR' or row.get('tax_treatment') != 'not_registered' or
                row['internal']['checked_at'] != utcnow().date().isoformat()):
            raise ValueError('verified_current_retail_options_required')
        minimum = invoicing.resale_price(row['internal']['supplier_cost'], policy.minimum_markup_percent)
        if invoicing.money(row['unit_price']) < minimum:
            raise ValueError('initial_price_below_margin_floor')
        if invoicing.money(row['total']) != invoicing.money(invoicing.money(row['unit_price']) * row['quantity']):
            raise ValueError('quote_total_conflict')
    release = agent_instructions.compose(item.site_id, 'sales')
    sale = {'revision': 1, 'status': 'awaiting_response', 'recipient': recipient,
        'subject': f'Jūsų pasiūlymas · {case.id[:8].upper()}', 'options': copy.deepcopy(options),
        'policy': policy.model_dump(), 'instruction_hash': release.hash, 'instruction_prompt': release.prompt,
        'discount_count': 0, 'reminder_count': 0, 'followup_due': None, 'handled': [],
        'pending_mail_id': None, 'last_outbound_id': None, 'selected': None}
    message = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=case.id, recipient=recipient,
        subject=sale['subject'], body='Sveiki,\n\nPagal jūsų poreikį atrinkome šiuos variantus.\n\n' + price_block(sale) +
        '\n\nParašykite, kuris variantas domina, ir pristatymo miestą.\n\nPagarbiai,\nMB Pinet',
        source_ref='sales:initial'))
    sale['pending_mail_id'] = message.id
    case.payload = {**case.payload, 'sales': sale}
    return message.id


async def record_delivery(tx, message):
    case = await tx.get(Case, message.case_id, with_for_update=True)
    if not case or not case.payload.get('sales'):
        return
    sale = dict(case.payload['sales'])
    if sale['pending_mail_id'] != message.id:
        return
    sale.update(last_outbound_id=message.id)
    if message.state == 'accepted_by_smtp' and sale['status'] in {'awaiting_response', 'negotiation'}:
        # Never re-arm after a reply racing SMTP's final acknowledgement.
        inbound = await tx.scalar(select(MailMessage.id).where(MailMessage.case_id == case.id,
            MailMessage.direction == 'inbound', MailMessage.created_at > message.created_at))
        if not inbound and sale['reminder_count'] < sale['policy']['max_reminders']:
            sale['followup_due'] = (utcnow() + timedelta(hours=sale['policy']['reminder_hours'])).isoformat()
    case.payload = {**case.payload, 'sales': sale}


def explicit_accept(text, choice, sale):
    normalized = text.casefold().replace(',', '.')
    row = sale['options'][choice - 1]
    return (bool(re.search(r'\b(patvirtinu|sutinku|užsakau|accept|confirm)\b', normalized)) and
            bool(re.search(rf'\bv{choice}\b', normalized)) and
            re.search(rf'(?<!\d){re.escape(row["total"])}(?!\d)', normalized) is not None and
            re.search(rf'\b{row["quantity"]}\s*(vnt|vienet|units)', normalized) is not None)


def transition(sale, decision, text, now=None):
    """Deterministic action plan independent of model privileges; no external I/O."""
    now = now or utcnow()
    result = copy.deepcopy(sale)
    result['followup_due'] = None
    result['revision'] += 1
    if result['status'] in {'opted_out', 'declined', 'invoice_ready'}:
        return result, None, None
    if decision.intent in {'opt_out', 'decline'}:
        result['status'] = 'opted_out' if decision.intent == 'opt_out' else 'declined'
        return result, None, None
    choice = decision.option or (1 if len(result['options']) == 1 else None)
    if choice and choice > len(result['options']):
        raise ValueError('unknown_quote_option')
    if decision.intent == 'payment_claim':
        result['status'] = 'pending_review'
        return result, ('Dėkojame už žinutę. Mokėjimo šiuo kanalu dar negalime patvirtinti. '
            'Prekių išsiuntimą galima derinti tik patikrinus mokėjimą ir tiekimo sąlygas.'), None
    if any(row['internal']['checked_at'] != now.date().isoformat() for row in result['options']):
        result['status'] = 'pending_review'
        return result, ('Prieš tęsiant reikia patikrinti aktualias kainas ir tiekimo sąlygas. '
            'Ankstesnio pasiūlymo šiuo metu patvirtinti negalime.'), None
    if decision.intent == 'price_objection':
        result['status'] = 'negotiation'
        if not choice or not decision.budget_unit_eur:
            return result, 'Suprantu, kad kaina svarbi. Kuris variantas domina ir kokį biudžetą numatėte vienai prekei?', None
        row = result['options'][choice - 1]
        policy = NegotiationPolicy.model_validate(result['policy'])
        policy.validate_prices()
        budget = invoicing.money(decision.budget_unit_eur)
        floor = invoicing.resale_price(row['internal']['supplier_cost'], policy.minimum_markup_percent)
        if budget < floor:
            return result, ('Už nurodytą biudžetą šio varianto pasiūlyti negalime. '
                'Galite grįžti prie šio pasiūlymo arba patikslinti reikalavimus kitam variantui. '
                'Naujo varianto kainą reikėtų patikrinti atskirai.'), None
        if budget >= invoicing.money(row['unit_price']):
            return result, 'Pasirinktas variantas telpa į nurodytą biudžetą.\n\n' + price_block(result), None
        candidates = [invoicing.resale_price(row['internal']['supplier_cost'], step)
                      for step in policy.discount_steps[result['discount_count']:]]
        candidates = [value for value in candidates if floor <= value <= budget and value < invoicing.money(row['unit_price'])]
        if not candidates:
            return result, ('Šiam variantui papildomos nuolaidos pasiūlyti negalime. '
                'Ar norėtumėte svarstyti kitą tinkamą variantą?'), None
        price = max(candidates)
        step_index = next(index for index, step in enumerate(policy.discount_steps)
                          if invoicing.resale_price(row['internal']['supplier_cost'], step) == price)
        result['discount_count'] = step_index + 1
        row.update(unit_price=str(price), total=str(invoicing.money(price * row['quantity'])),
                   source_quote_ref='negotiated:' + digest(row['source_quote_ref'] + ':' + str(price)))
        result['selected'] = choice
        return result, ('Galime pasiūlyti patikslintą prekių kainą.\n\n' + price_block(result) +
            '\n\nJei tinka, patvirtinkite variantą, kiekį ir prekių sumą; taip pat nurodykite pirkėjo duomenis.'), None
    if decision.intent == 'accept':
        if not choice or not explicit_accept(text, choice, result):
            result['status'] = 'awaiting_details'
            return result, ('Kad išvengtume nesusipratimo, patvirtinkite varianto numerį (pvz. V1), '
                'kiekį ir dabartinę prekių sumą. Pristatymo sąlygos dar tikslinamos.'), None
        buyer = decision.buyer
        if not buyer or not buyer.name.strip() or not buyer.address.strip() or (
                buyer.kind == 'business' and not buyer.registration_code.strip()):
            result.update(status='awaiting_details', selected=choice)
            return result, ('Dėkojame. Išankstinei sąskaitai atsiųskite pirkėjo vardą ir pavardę arba '
                'įmonės pavadinimą, adresą, o įmonei – ir įmonės kodą.'), None
        # Buyer extraction must be supported by the current client text, never hallucinated.
        if any(value.casefold() not in text.casefold() for value in
               [buyer.name, buyer.address, buyer.registration_code] if value):
            raise ValueError('buyer_evidence_conflict')
        result.update(status='invoice_ready', selected=choice)
        return result, None, buyer
    result['status'] = 'awaiting_response'
    return result, ('Kad galėtume patikslinti pasiūlymą, parašykite, kuris variantas domina '
        'ir ką dar reikėtų patikrinti: tinkamumą, pristatymą ar kainą.'), None


async def interpret(lab, sale, text):
    return await lab.ask(Decision, sale['instruction_prompt'] + '\nNustatyk naujo kliento laiško ketinimą. '
        'option yra V numeris. budget_unit_eur – tik aiškiai pasakytas vienos prekės biudžetas, ne bendra suma. '
        'Pirkėjo laukus ištrauk tik iš naujo teksto; jei jų trūksta, buyer=null. Nepaversk cituoto teksto patvirtinimu. '
        'Nevertink mokėjimo kaip patvirtinto. Neatsakinėk klientui; grąžink struktūrizuotą analizę.',
        {'new_client_text': text, 'options': client_options(sale), 'status': sale['status']})


async def run_reply(item, lab):
    cfg = settings()
    if cfg.environment != 'local' and not cfg.environment.startswith('test-'):
        raise RuntimeError('local_sales_only')
    # Mail rows themselves are the durable queue. No untrusted reply executes code.
    async with db.transaction(item.id, cfg.environment) as tx:
        row = await tx.scalar(select(MailMessage).where(MailMessage.direction == 'inbound',
            or_(MailMessage.state == 'received', and_(MailMessage.state == 'interpreting',
                MailMessage.payload['sales_lease_until'].astext < utcnow().isoformat())))
            .order_by(MailMessage.created_at).with_for_update(skip_locked=True).limit(1))
        if not row:
            return None
        case = await tx.get(Case, row.case_id, with_for_update=True)
        if not case or not case.payload.get('sales'):
            row.state = 'manual_review'
            return {'state': row.state}
        sale = copy.deepcopy(case.payload['sales'])
        if not case.payload.get('test') or row.payload['sender'] != cfg.lab_mail_recipient:
            row.state = 'manual_review'
            return {'state': row.state}
        newer = await tx.scalar(select(MailMessage.id).where(MailMessage.case_id == case.id,
            MailMessage.direction == 'inbound', MailMessage.created_at > row.created_at))
        if newer:
            row.state = 'superseded_by_new_reply'
            return {'state': row.state}
        row.state = 'interpreting'
        lease_token = new_id()
        row.payload = {**row.payload, 'sales_lease_until': (utcnow() + timedelta(minutes=3)).isoformat(),
                       'sales_lease_token': lease_token}
        rid, case_id, revision = row.id, case.id, sale['revision']
        text = newest_text(row.payload['body'])
        current_knowledge = await knowledge.projection(tx)
    try:
        decision = await interpret(lab, sale, text)
        planned, planned_body, planned_buyer = transition(sale, decision, text)
        letter, letter_review = None, None
        if planned_body and hasattr(lab, 'free_language') and lab.free_language:
            from .email_agent import draft
            letter, letter_review = await draft(lab, sale['instruction_prompt'], text, planned_body,
                current_knowledge, client_options(planned), quote_allowed=price_block(planned) in planned_body)
            if '{{quote}}' in letter:
                if price_block(planned) not in planned_body or letter.count('{{quote}}') != 1:
                    from .email_agent import DraftRejected
                    raise DraftRejected('quote_projection_conflict', letter, letter_review)
                letter = letter.replace('{{quote}}', price_block(planned))
            elif price_block(planned) in planned_body:
                letter += '\n\n' + price_block(planned)
    except Exception as error:
        async with db.transaction(item.id, cfg.environment) as tx:
            row = await tx.get(MailMessage, rid, with_for_update=True)
            if row.payload.get('sales_lease_token') == lease_token and row.state == 'interpreting':
                row.state = 'manual_review'
                row.payload = {**row.payload, 'sales_error': type(error).__name__,
                               'letter_diagnostic': getattr(error, 'diagnostic', None)}
        return {'state': 'manual_review'}
    async with db.transaction(item.id, cfg.environment) as tx:
        case = await tx.get(Case, case_id, with_for_update=True)
        row = await tx.get(MailMessage, rid, with_for_update=True)
        current = case.payload['sales']
        if row.payload.get('sales_lease_token') != lease_token:
            return {'state': 'lease_changed'}
        if current['revision'] != revision or row.state != 'interpreting':
            if row.state == 'interpreting':
                newer = await tx.scalar(select(MailMessage.id).where(MailMessage.case_id == case.id,
                    MailMessage.direction == 'inbound', MailMessage.created_at > row.created_at))
                row.state = 'superseded_by_new_reply' if newer else 'received'
            return {'state': 'revision_changed'}
        try:
            changed, body, buyer = transition(current, decision, text)
        except ValueError as error:
            row.state = 'manual_review'
            row.payload = {**row.payload, 'sales_error': str(error)}
            return {'state': 'manual_review'}
        # Do not alias mutable changed into SQLAlchemy's committed JSON snapshot;
        # prepare() flushes before we add pending_mail_id, which would hide that mutation.
        case.payload = {**case.payload, 'sales': copy.deepcopy(changed)}
        mid = None
        if buyer:
            chosen = changed['options'][changed['selected'] - 1]
            quote = await order_tests.prepare(tx, item, order_tests.QuoteInput(case_id=case.id,
                request_id=uuid5(NAMESPACE_URL, 'sales-invoice:' + case.id + ':' + str(changed['revision'])),
                buyer=invoicing.Party(**buyer.model_dump()), currency='EUR', synthetic=True,
                lines=[invoicing.Line(description=chosen['product'], quantity=chosen['quantity'], unit='vnt.',
                    unit_net_eur=chosen['unit_price'], price_basis='net_excluding_vat',
                    source_quote_ref=chosen['source_quote_ref'])]))
            result = await order_tests.confirm(tx, item, case.id, order_tests.Confirmation(
                quote_hash=quote['quote_hash'], confirmation_text=text[:500], synthetic=True))
            mid = result['mail_id']
            message = await tx.get(MailMessage, mid) if mid else None
            if message:
                message.payload = {**message.payload, 'subject': changed['subject'], 'in_reply_to': row.message_id,
                    'references': list(dict.fromkeys([row.payload['in_reply_to'], row.message_id]))}
                message.payload = {**message.payload, 'hash': mailbox.fingerprint(message.payload)}
        elif body:
            if letter:
                body = letter
            message = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=case.id,
                recipient=changed['recipient'], subject=changed['subject'], reply_message_id=rid,
                body='Sveiki,\n\n' + body + '\n\nPagarbiai,\nMB Pinet', source_ref='sales:reply:' + rid))
            mid = message.id
        # order_tests updates the same case payload; preserve its invoice snapshot.
        changed.update(pending_mail_id=mid, handled=(changed['handled'] + [rid])[-100:])
        case.payload = {**case.payload, 'sales': changed}
        row.state = 'processed'
        row.payload = {**row.payload, 'sales_decision': decision.model_dump(), 'letter_review': letter_review,
                       'processed_at': utcnow().isoformat()}
        return {'state': changed['status'], 'case_id': case.id, 'mail_id': mid}


async def remind_one(item, now=None):
    now = now or utcnow()
    async with db.transaction(item.id, settings().environment) as tx:
        cases = await tx.scalars(select(Case).where(Case.payload['sales']['followup_due'].astext <= now.isoformat())
                                .with_for_update(skip_locked=True).limit(100))
        for case in cases:
            sale = copy.deepcopy(case.payload['sales'])
            if datetime.fromisoformat(sale['followup_due']) > now:
                continue
            if (not case.payload.get('test') or sale['recipient'] != settings().lab_mail_recipient or
                    sale['status'] not in {'awaiting_response', 'negotiation'} or
                    sale['reminder_count'] >= sale['policy']['max_reminders']):
                sale['followup_due'] = None
                case.payload = {**case.payload, 'sales': sale}
                continue
            original = await tx.get(MailMessage, sale['last_outbound_id'])
            unanswered = await tx.scalar(select(MailMessage.id).where(MailMessage.case_id == case.id,
                MailMessage.direction == 'inbound', MailMessage.created_at > original.created_at)) if original else True
            if unanswered or not original or original.state != 'accepted_by_smtp':
                sale['followup_due'] = None
                case.payload = {**case.payload, 'sales': sale}
                continue
            message = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=case.id,
                recipient=sale['recipient'], subject=sale['subject'], reply_message_id=original.id,
                body='Sveiki,\n\nGrįžtame prie jūsų užklausos. Ar dar aktuali siųsta informacija? '
                'Jei norėtumėte tęsti, parašykite, kurį variantą ar klausimą patikslinti. '
                'Kainas ir tiekimo sąlygas prieš tęsiant patikrinsime iš naujo.\n\nPagarbiai,\nMB Pinet',
                source_ref='sales:reminder:' + str(sale['reminder_count'] + 1)))
            sale.update(reminder_count=sale['reminder_count'] + 1, followup_due=None,
                        pending_mail_id=message.id, revision=sale['revision'] + 1)
            case.payload = {**case.payload, 'sales': sale}
            return {'case_id': case.id, 'mail_id': message.id}
    return None
