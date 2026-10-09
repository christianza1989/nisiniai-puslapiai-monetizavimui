"""Read only replies referring to our known Message-IDs; leave mailbox contents intact."""
import asyncio
import imaplib
import re
import ssl
from html.parser import HTMLParser
from email import policy
from email.parser import BytesParser
from email.utils import parseaddr

from sqlalchemy import select

from . import mailbox, service
from .config import settings
from .db import db
from .models import Business, MailMessage


NO_TEXT = '[Laiškas be tekstinės dalies; HTML ir priedai automatiškai nevykdomi.]'


def body_text(message):
    plain = message.get_body(preferencelist=('plain',))
    if plain:
        return plain.get_content()[:16000]
    html = message.get_body(preferencelist=('html',))
    if not html:
        return NO_TEXT
    # Parse inert text only. No DOM, images, links, CSS, scripts or attachments
    # are loaded or executed; the resulting text remains untrusted evidence.
    class Text(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.hidden = []
            self.parts = []
        def handle_starttag(self, tag, attrs):
            if tag in {'script', 'style', 'head', 'svg', 'template'}:
                self.hidden.append(tag)
            if not self.hidden and tag in {'br', 'p', 'div', 'li', 'blockquote'}:
                self.parts.append('\n')
        def handle_endtag(self, tag):
            if self.hidden and tag == self.hidden[-1]:
                self.hidden.pop()
            if not self.hidden and tag in {'p', 'div', 'li', 'blockquote'}:
                self.parts.append('\n')
        def handle_data(self, value):
            if not self.hidden:
                self.parts.append(value)
    parser = Text()
    parser.feed(html.get_content()[:65536])
    return re.sub(r'\n[ \t]*\n+', '\n\n', ''.join(parser.parts)).strip()[:16000] or NO_TEXT


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
            refs = re.findall(r"<[^<>\s]+>", str(header.get("In-Reply-To", "")) + " " + str(header.get("References", "")))
            if len({known[ref]["case_id"] for ref in refs if ref in known}) > 1:
                continue  # Ambiguous thread; never guess which client case to update.
            original = next((known[ref] for ref in reversed(refs) if ref in known), None)
            provider_id = str(header.get("Message-ID", ""))
            sender = parseaddr(str(header.get("From", "")))[1]
            if not original or not provider_id or sender.casefold() != original["recipient"].casefold():
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
            text = body_text(message)
            results.append({"original": original, "provider_id": provider_id, "sender": sender,
                            "subject": str(header.get("Subject", "")), "body": text[:16000]})
    return results


async def sync_replies():
    cfg = settings()
    if cfg.environment != "local" or not cfg.lab_mail_enabled:
        raise RuntimeError("local_owner_mail_connection_required")
    async with db.registry() as tx:
        sites = list(await tx.scalars(select(Business.site_id)))
    known = {}
    for site in sites:
        item = await service.business(site)
        async with db.transaction(item.id, cfg.environment) as tx:
            for message in await tx.scalars(select(MailMessage).where(MailMessage.direction == "outbound",
                    MailMessage.state == "accepted_by_smtp").order_by(MailMessage.created_at.desc()).limit(100)):
                known[message.message_id] = {"id": message.id, "site": site, "case_id": message.case_id,
                                            "recipient": message.payload["recipient"]}
    if not known:
        return {"matched_replies": 0}
    replies = await asyncio.to_thread(fetch_replies, known)
    count = 0
    for reply in replies:
        item = await service.business(reply["original"]["site"])
        async with db.transaction(item.id, cfg.environment) as tx:
            original = await tx.get(MailMessage, reply["original"]["id"], with_for_update=True)
            existed = await tx.scalar(select(MailMessage.id).where(MailMessage.message_id == reply["provider_id"]))
            await mailbox.receive_reply(tx, original, reply["provider_id"], reply["sender"], reply["subject"], reply["body"])
            count += not bool(existed)
    return {"matched_replies": count, "scan_limit": 100, "unmatched_imported": False}
