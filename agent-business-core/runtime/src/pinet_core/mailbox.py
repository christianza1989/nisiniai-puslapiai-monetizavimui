"""Shared scoped mail console and an explicitly limited owner's test transport.

The production conversation outbox remains independent; this cannot send to arbitrary clients.
"""
import asyncio
import json
import re
import smtplib
from urllib.parse import urlsplit

from fastapi import HTTPException
from pydantic import EmailStr, Field, field_validator
from sqlalchemy import select

from .config import settings
from .contracts import Strict
from .db import db
from .models import Case, MailMessage, new_id, utcnow
from .offers import email_html
from .security import digest


class DraftInput(Strict):
    recipient: EmailStr
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=10, max_length=16000)
    case_id: str | None = None
    source_ref: str = Field(min_length=3, max_length=200)
    synthetic: bool = True
    customer_facing: bool = True
    reply_message_id: str | None = Field(default=None, max_length=250)

    @field_validator("subject")
    @classmethod
    def safe_subject(cls, value):
        if any(ord(char) < 32 for char in value):
            raise ValueError("subject_control_character")
        return value


def fingerprint(payload):
    fields = {key: payload[key] for key in ["recipient", "sender", "subject", "body", "source_ref", "synthetic"]}
    if payload.get("attachments"):
        fields["attachments"] = payload["attachments"]
    if payload.get("customer_facing"):
        fields["customer_facing"] = True
    if payload.get('in_reply_to'):
        fields['in_reply_to'] = payload['in_reply_to']
        fields['references'] = payload.get('references', [])
    return digest(json.dumps(fields, sort_keys=True))


async def prepare(tx, item, value: DraftInput):
    if not value.synthetic:
        raise HTTPException(409, "production_commercial_mail_not_enabled")
    if value.customer_facing:
        # Research source URLs remain private. Customer letters can link only to this business.
        allowed_hosts = {item.canonical_host.casefold(), 'www.' + item.canonical_host.casefold()}
        for url in re.findall(r'https?://[^\s<>]+', value.body, flags=re.IGNORECASE):
            if (urlsplit(url).hostname or '').casefold() not in allowed_hosts:
                raise HTTPException(409, 'external_supplier_link_in_customer_letter')
    case = await tx.get(Case, value.case_id, with_for_update=True) if value.case_id else None
    if value.case_id and not case:
        raise HTTPException(404, "case_unavailable")
    if not case:
        case = Case(id=new_id(), business_id=item.id, environment_id=settings().environment,
                    payload={"source": "owner_text_lab", "test": True})
        tx.add(case)
        await tx.flush()
    payload = {"recipient": str(value.recipient), "sender": settings().sender_email,
               "sender_name": settings().sender_name,
               "subject": value.subject if value.customer_facing else "[TESTAS] " + value.subject + " · " + case.id[:8],
               "body": value.body if value.customer_facing else "SINTETINIS BANDYMAS. Mokėti nereikia; užsakymo nėra.\n\n" + value.body,
               "source_ref": value.source_ref, "synthetic": True}
    if value.customer_facing:
        payload["customer_facing"] = True
    if value.reply_message_id:
        original = await tx.scalar(select(MailMessage).where(MailMessage.id == value.reply_message_id,
                                                             MailMessage.case_id == case.id))
        if not original:
            raise HTTPException(404, 'reply_parent_unavailable')
        payload['in_reply_to'] = original.message_id
        payload['references'] = list(dict.fromkeys(original.payload.get('references', []) +
                                    [original.message_id]))[-20:]
    payload["hash"] = fingerprint(payload)
    # Stable idempotency within an already resolved case and source.
    previous = await tx.scalar(select(MailMessage).where(MailMessage.case_id == case.id,
        MailMessage.payload["source_ref"].astext == value.source_ref, MailMessage.direction == "outbound"))
    if previous:
        # Keep the original headers immutable for the first two legacy test messages.
        if previous.payload["subject"] == "[TESTAS] " + value.subject:
            payload["subject"] = previous.payload["subject"]
            payload["hash"] = fingerprint(payload)
        if previous.payload["hash"] != payload["hash"]:
            raise HTTPException(409, "mail_draft_conflict")
        return previous
    message = MailMessage(id=new_id(), business_id=item.id, environment_id=settings().environment,
        case_id=case.id, message_id=f"<{new_id()}@pinet.lt>", direction="outbound", state="draft", payload=payload)
    tx.add(message)
    await tx.flush()
    return message


def public(message, detail=False):
    data = {"id": message.id, "case_id": message.case_id, "message_id": message.message_id,
        "direction": message.direction, "state": message.state, "created_at": message.created_at.isoformat(),
        "subject": message.payload.get("subject", ""), "sender": message.payload.get("sender", ""),
        "recipient": message.payload.get("recipient", ""), "synthetic": message.payload.get("synthetic", False)}
    if detail:
        data["body"] = message.payload.get("body", "")
        data["source_ref"] = message.payload.get("source_ref", "")
        data["attachments"] = [{"filename": a["filename"], "content_type": a.get("content_type", "text/html")}
            for a in message.payload.get("attachments", [])]
    data["customer_facing"] = message.payload.get("customer_facing", False)
    return data


async def listing(tx, before=None):
    query = select(MailMessage).order_by(MailMessage.created_at.desc(), MailMessage.id.desc()).limit(100)
    if before:
        query = query.where(MailMessage.created_at < before)
    return [public(message) for message in await tx.scalars(query)]


def smtp_test(payload, message_id):
    from .jobs import smtp_send
    smtp_send(payload["recipient"], {**payload, "html": email_html(payload["body"], settings().sender_name)}, message_id)


def test_transport_ready(cfg):
    return cfg.environment == "local" and cfg.lab_mail_enabled and bool(cfg.smtp_user and cfg.smtp_password)


async def send_test(business_id, message_id):
    cfg = settings()
    if not test_transport_ready(cfg):
        raise HTTPException(503, "owner_test_mail_not_configured")
    async with db.transaction(business_id, cfg.environment) as tx:
        message = await tx.scalar(select(MailMessage).where(MailMessage.id == message_id).with_for_update())
        if not message:
            raise HTTPException(404, "mail_unavailable")
        if message.state != "draft":
            return public(message)
        payload = message.payload
        if (not payload.get("synthetic") or payload["recipient"] != cfg.lab_mail_recipient or
                cfg.sender_email != "info@pinet.lt" or payload["sender"] != cfg.sender_email or
                payload["hash"] != fingerprint(payload)):
            raise HTTPException(409, "owner_test_mail_scope_conflict")
        case = await tx.get(Case, message.case_id, with_for_update=True)
        sale = case.payload.get('sales') if case else None
        if sale:
            newer_reply = await tx.scalar(select(MailMessage.id).where(MailMessage.case_id == case.id,
                MailMessage.direction == 'inbound', MailMessage.created_at > message.created_at))
            if newer_reply or sale['status'] in {'opted_out', 'declined'} or sale['pending_mail_id'] != message.id:
                message.state = 'superseded'
                return public(message)
        mid = message.message_id
        message.state = "sending"
        message.payload = {**payload, "intent_at": utcnow().isoformat()}
    # Durable intent precedes IO. An uncertain response is never retried by this endpoint.
    result = "accepted_by_smtp"
    try:
        await asyncio.to_thread(smtp_test, payload, mid)
    except (smtplib.SMTPRecipientsRefused, smtplib.SMTPSenderRefused, smtplib.SMTPDataError,
            smtplib.SMTPAuthenticationError):
        result = "rejected"
    except Exception:
        result = "delivery_unknown"
    async with db.transaction(business_id, cfg.environment) as tx:
        message = await tx.scalar(select(MailMessage).where(MailMessage.id == message_id).with_for_update())
        message.state = result
        message.payload = {**message.payload, "transport_result_at": utcnow().isoformat()}
        from .sales import record_delivery
        await record_delivery(tx, message)
        return public(message)


async def receive_reply(tx, original, provider_id, sender, subject, body):
    """Called only by authenticated mailbox connector after header/thread matching."""
    existing = await tx.scalar(select(MailMessage).where(MailMessage.message_id == provider_id))
    if existing:
        return existing
    if sender.casefold() != original.payload["recipient"].casefold():
        raise ValueError("reply_sender_not_case_participant")
    message = MailMessage(id=new_id(), business_id=original.business_id, environment_id=original.environment_id,
        case_id=original.case_id, message_id=provider_id, direction="inbound", state="received",
        payload={"sender": sender, "recipient": original.payload["sender"], "subject": subject[:200],
                 "body": body[:16000], "in_reply_to": original.message_id, "synthetic": original.payload["synthetic"],
                 "customer_facing": original.payload.get("customer_facing", False),
                 "source_ref": "authenticated_imap_reply"})
    tx.add(message)
    await tx.flush()
    case = await tx.get(Case, original.case_id, with_for_update=True)
    if case and case.payload.get('sales'):
        sale = dict(case.payload['sales'])
        sale.update(revision=sale['revision'] + 1, followup_due=None)
        case.payload = {**case.payload, 'sales': sale}
    return message
