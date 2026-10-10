"""Read only replies referring to our known Message-IDs; leave mailbox contents intact."""
import asyncio
import imaplib
import re
import ssl
from email import policy
from email.parser import BytesParser

from sqlalchemy import select

from . import mailbox, service
from .config import settings
from .conversation_mail import valid_message_id, verified_outbound
from .db import db
from .models import Business, MailMessage


def add_known(known, message_id, value):
    """Message-ID is only DB-unique within a tenant; collisions never pick a winner."""
    if not valid_message_id(message_id):
        return
    if message_id in known and known[message_id] != value:
        known[message_id] = None
    else:
        known[message_id] = value


def references(header):
    values = []
    for key in ("In-Reply-To", "References"):
        headers = header.get_all(key, [])
        if len(headers) > 1:
            return None
        if headers:
            raw = str(headers[0])
            tokens = raw.split()
            if (not tokens or (key == "In-Reply-To" and len(tokens) != 1)
                    or any(not valid_message_id(token) for token in tokens)):
                return None
            values.extend(tokens)
    values = list(dict.fromkeys(values))
    return values if 0 < len(values) <= 20 else None


def addresses(header, name):
    values = header.get_all(name, [])
    if len(values) != 1 or values[0].defects:
        return None
    items = values[0].addresses
    if not 1 <= len(items) <= 10 or any(not value.username or not value.domain for value in items):
        return None
    return [value.addr_spec.casefold() for value in items]


def match_headers(header, known):
    """Bounded parsed identities. A known reference is evidence of a thread, not identity verification."""
    ids = header.get_all("Message-ID", [])
    if len(ids) != 1 or not valid_message_id(str(ids[0])):
        return None
    refs = references(header)
    senders, recipients = addresses(header, "From"), addresses(header, "To")
    subjects = header.get_all("Subject", [])
    if (not refs or not senders or len(senders) != 1 or not recipients or len(subjects) != 1
            or len(str(subjects[0])) > 200 or any(ord(c) < 32 for c in str(subjects[0]))):
        return None
    matched = [known[ref] for ref in refs if ref in known]
    if (not matched or any(value is None for value in matched)
            or len({(value["site"], value["case_id"], value.get("conversation_id")) for value in matched}) != 1):
        return None
    parent = header.get("In-Reply-To")
    if parent is not None:
        original = known.get(str(parent))
        if original is None:
            return None  # Explicit unknown parent must not fall back to an ancestor.
    else:
        if len(matched) != 1:
            return None  # Several known messages in one Case still have different receipts.
        original = matched[0]
    if senders[0] != original["recipient"].casefold() or original["sender"].casefold() not in recipients:
        return None
    return {"original": original, "provider_id": str(ids[0]), "sender": senders[0],
            "recipient": original["sender"].casefold(), "subject": str(subjects[0]), "references": refs}


def fetch_replies(known):
    cfg = settings()
    results = []
    with imaplib.IMAP4_SSL(cfg.imap_host, cfg.imap_port, ssl_context=ssl.create_default_context(), timeout=20) as imap:
        imap.login(cfg.smtp_user, cfg.smtp_password)
        imap.select("INBOX", readonly=True)
        status, data = imap.uid("search", None, "ALL")
        if status != "OK":
            return []
        for uid in data[0].split()[-100:]:
            status, parts = imap.uid("fetch", uid, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID IN-REPLY-TO REFERENCES FROM TO SUBJECT)] RFC822.SIZE)")
            if status != "OK":
                continue
            pairs = [part for part in parts if isinstance(part, tuple)]
            if not pairs:
                continue
            header = BytesParser(policy=policy.default).parsebytes(pairs[0][1])
            matched = match_headers(header, known)
            if not matched:
                continue
            size = re.search(rb"RFC822.SIZE (\d+)", pairs[0][0])
            if not size or int(size.group(1)) > 65536:
                continue
            status, parts = imap.uid("fetch", uid, "(BODY.PEEK[])")
            if status != "OK":
                continue
            pairs = [part for part in parts if isinstance(part, tuple)]
            if not pairs or len(pairs[0][1]) > 65536:
                continue
            message = BytesParser(policy=policy.default).parsebytes(pairs[0][1])
            if match_headers(message, known) != matched:
                continue  # Header/body mismatch must not route different fetched evidence.
            body = message.get_body(preferencelist=("plain",))
            text = body.get_content() if body else "[Laiškas be tekstinės dalies; HTML ir priedai automatiškai nevykdomi.]"
            if not isinstance(text, str) or len(text) > 16000:
                continue
            results.append({**matched, "body": text})
    return results


async def sync_replies():
    cfg = settings()
    if cfg.environment != "local" or not cfg.lab_mail_enabled:
        raise RuntimeError("local_owner_mail_connection_required")
    return await _sync_known_replies(cfg)


async def _sync_known_replies(cfg):
    """The guarded owner connector's scoped DB work; separately exercisable without live credentials."""
    async with db.registry() as tx:
        sites = list(await tx.scalars(select(Business.site_id)))
    known = {}
    for site in sites:
        item = await service.business(site)
        async with db.transaction(item.id, cfg.environment) as tx:
            for message in await tx.scalars(select(MailMessage).where(MailMessage.direction == "outbound",
                    MailMessage.state == "accepted_by_smtp").order_by(MailMessage.created_at.desc()).limit(100)):
                if message.payload.get("conversation_mail") and not verified_outbound(message):
                    continue
                add_known(known, message.message_id, {"id": message.id, "site": site, "case_id": message.case_id,
                    "recipient": message.payload["recipient"], "sender": message.payload["sender"],
                    "conversation_id": message.payload.get("conversation_id")})
    if not known:
        return {"matched_replies": 0}
    replies = await asyncio.to_thread(fetch_replies, known)
    count = 0
    for reply in replies:
        item = await service.business(reply["original"]["site"])
        async with db.transaction(item.id, cfg.environment) as tx:
            original = await tx.get(MailMessage, reply["original"]["id"], with_for_update=True)
            if (not original or original.state != "accepted_by_smtp"
                    or original.message_id not in reply["references"] or original.direction != "outbound"):
                continue
            existed = await tx.scalar(select(MailMessage.id).where(MailMessage.message_id == reply["provider_id"]))
            await mailbox.receive_reply(tx, original, reply["provider_id"], reply["sender"], reply["subject"], reply["body"],
                references=reply["references"], recipient=reply["recipient"])
            count += not bool(existed)
    return {"matched_replies": count, "scan_limit": 100, "unmatched_imported": False}
