"""Link existing postcall transport to immutable mail evidence, never activate replies.

All helpers run in the caller's existing tenant/environment transaction. Receipt
identity describes what was sent/received; current eligibility is a separate read.
"""
import json
import re
from copy import deepcopy
from datetime import timedelta

from sqlalchemy import select, text

from . import knowledge, policy
from .config import settings
from .models import Artifact, Case, Contact, Conversation, MailMessage, Outbox, new_id, utcnow
from .security import digest

VERSION = "conversation-mail.v1"
_MESSAGE_ID = re.compile(r"<[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?>")


def valid_message_id(value):
    return isinstance(value, str) and len(value) <= 250 and _MESSAGE_ID.fullmatch(value) is not None


def seal(payload):
    return digest(json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False))


def binding(payload):
    return payload.get("conversation_mail")


def same_scope(*rows):
    return all(row and (row.business_id, row.environment_id) == (rows[0].business_id, rows[0].environment_id)
               for row in rows)


async def bind_dispatch(tx, outbox, contact, artifact, sources, recipient, message_id):
    """Called after existing delivery guards, before durable intent commits/SMTP."""
    from .mailbox import fingerprint

    convo = await tx.get(Conversation, outbox.conversation_id, with_for_update=True)
    case = await tx.get(Case, convo.case_id) if convo else None
    if (not same_scope(outbox, contact, artifact, convo, case) or outbox.kind != "email"
            or contact.channel != "email" or artifact.kind != "followup"
            or contact.conversation_id != convo.id or artifact.conversation_id != convo.id
            or outbox.payload["contact_id"] != contact.id or outbox.payload["artifact_id"] != artifact.id
            or outbox.payload.get("contact_revision", 1) != contact.payload.get("revision", 1)
            or outbox.payload["artifact_hash"] != digest(artifact.payload["body"])
            or not valid_message_id(message_id)):
        raise ValueError("conversation_mail_binding_conflict")
    snapshot = {"version": VERSION, "business_id": outbox.business_id,
        "environment_id": outbox.environment_id, "message_id": message_id,
        "conversation_id": convo.id, "case_id": case.id,
        "outbox_id": outbox.id, "contact_id": contact.id,
        "contact_revision": contact.payload.get("revision", 1), "artifact_id": artifact.id,
        "artifact_revision": artifact.revision, "artifact_hash": outbox.payload["artifact_hash"],
        "source_refs": deepcopy(artifact.payload["source_refs"]),
        "knowledge_revision": sources["knowledge_revision"], "deployment_id": sources["deployment_id"]}
    payload = {"conversation_id": convo.id, "outbox_id": outbox.id, "conversation_mail": snapshot,
        "recipient": recipient, "sender": settings().sender_email, "sender_name": settings().sender_name,
        "subject": artifact.payload["subject"], "body": artifact.payload["body"],
        "source_ref": "conversation_followup", "synthetic": bool(convo.payload.get("test")),
        "customer_facing": True}
    payload["receipt_hash"] = seal(payload)
    payload["hash"] = fingerprint(payload)
    old = await tx.scalar(select(MailMessage).where(MailMessage.message_id == message_id))
    if old:
        if (old.direction != "outbound" or old.case_id != case.id or old.payload != payload
                or not same_scope(outbox, old)):
            raise ValueError("conversation_mail_message_id_conflict")
        message = old
    else:
        message = MailMessage(id=new_id(), business_id=outbox.business_id,
            environment_id=outbox.environment_id, case_id=case.id, message_id=message_id,
            direction="outbound", state="sending", payload=payload)
        tx.add(message)
        await tx.flush()
    outbox.payload = {**outbox.payload, "mail_message_id": message.id}
    return message


def verified_outbound(message):
    value = binding(message.payload)
    payload = {k: v for k, v in message.payload.items() if k not in {"hash", "receipt_hash", "transport_result"}}
    return bool(isinstance(value, dict) and value.get("version") == VERSION
        and all(isinstance(value.get(k), str) and value[k] for k in
            ("contact_id", "artifact_id", "conversation_id", "outbox_id", "deployment_id"))
        and all(type(value.get(k)) is int and value[k] >= 1 for k in
            ("contact_revision", "artifact_revision", "knowledge_revision"))
        and isinstance(value.get("source_refs"), list) and value.get("case_id") == message.case_id
        and value.get("business_id") == message.business_id and value.get("environment_id") == message.environment_id
        and value.get("message_id") == message.message_id
        and message.direction == "outbound" and valid_message_id(message.message_id)
        and value.get("conversation_id") == payload.get("conversation_id")
        and value.get("outbox_id") == payload.get("outbox_id")
        and message.payload.get("receipt_hash") == seal(payload)
        and value.get("artifact_hash") == digest(payload.get("body", "")))


async def record_transport(tx, outbox, state, failure_class):
    message = await tx.get(MailMessage, outbox.payload.get("mail_message_id"), with_for_update=True)
    if (not message or not verified_outbound(message) or not same_scope(outbox, message)
            or binding(message.payload)["outbox_id"] != outbox.id
            or message.message_id != outbox.payload.get("message_id") or message.state != "sending"):
        raise ValueError("conversation_mail_transport_conflict")
    message.state = {"accepted": "accepted_by_smtp", "rejected": "rejected", "unknown": "delivery_unknown"}[state]
    message.payload = {**message.payload, "transport_result": {"state": state,
        "failure_class": failure_class, "observed_at": utcnow().isoformat(), "inbox_verified": False}}


async def eligibility(tx, original, convo):
    """Observation only; never a sending grant or a cached permission to reply."""
    authority, revision = await policy.read(tx)
    blockers = []
    if authority.paused or not authority.enabled or not authority.followup_enabled:
        blockers.append("current_policy_disabled")
    contact = await tx.get(Contact, binding(original.payload)["contact_id"])
    if (not contact or contact.conversation_id != convo.id or contact.channel != "email"
            or contact.payload.get("revision", 1) != binding(original.payload)["contact_revision"]
            or contact.value.casefold() != original.payload["recipient"].casefold()):
        blockers.append("current_contact_changed")
    sources = await knowledge.projection(tx)
    if sources is None:
        blockers.append("current_knowledge_unavailable")
    else:
        refs = [{k: page[k] for k in ("id", "url", "revision_hash", "projection_hash")}
                for page in sources["pages"]]
        if any(ref not in refs for ref in binding(original.payload)["source_refs"]):
            blockers.append("current_source_revoked_or_changed")
    # This increment records evidence only, not an automatic agent response path.
    return {"observed_at": utcnow().isoformat(), "policy_revision": revision,
        "blockers": blockers + ["conversation_reply_worker_not_enabled"], "can_respond": False}


async def receive_reply(tx, original, provider_id, sender, subject, body, *, references=None, recipient=None):
    """Authenticated known-thread connector only; a finalized session stays final."""
    if (not original or not verified_outbound(original) or original.state != "accepted_by_smtp"
            or not valid_message_id(provider_id) or sender.casefold() != original.payload["recipient"].casefold()
            or recipient is None or recipient.casefold() != original.payload["sender"].casefold()
            or not isinstance(body, str) or len(body) > 16000 or not isinstance(subject, str)
            or len(subject) > 200 or any(ord(char) < 32 for char in subject)):
        raise ValueError("conversation_mail_reply_identity_conflict")
    refs = list(references or [])
    if not refs or len(refs) > 20 or original.message_id not in refs or any(not valid_message_id(ref) for ref in refs):
        raise ValueError("conversation_mail_reply_reference_conflict")
    value = binding(original.payload)
    await policy.lock(tx, original.business_id, original.environment_id)
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"contact:{value['conversation_id']}"})
    # Provider-ID serialization is shared across Cases, not only the chosen parent.
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"mail-reply:{original.business_id}:{original.environment_id}:{provider_id}"})
    convo = await tx.get(Conversation, value["conversation_id"], with_for_update=True)
    case = await tx.get(Case, original.case_id)
    outbox = await tx.get(Outbox, value["outbox_id"])
    artifact = await tx.get(Artifact, value["artifact_id"])
    if (not same_scope(original, convo, case, outbox, artifact) or convo.case_id != case.id
            or outbox.conversation_id != convo.id or outbox.state != "accepted"
            or outbox.payload.get("mail_message_id") != original.id
            or outbox.payload.get("message_id") != original.message_id
            or outbox.payload.get("artifact_hash") != value["artifact_hash"]
            or artifact.conversation_id != convo.id or artifact.revision != value["artifact_revision"]
            or convo.created_at < utcnow() - timedelta(days=settings().retention_days)):
        raise ValueError("conversation_mail_reply_binding_unavailable")
    payload = {"provider_message_id": provider_id,
        "sender": sender.casefold(), "recipient": recipient.casefold(), "subject": subject,
        "body": body, "in_reply_to": original.message_id, "references": refs,
        "synthetic": original.payload["synthetic"], "customer_facing": True,
        "source_ref": "authenticated_imap_reply", "conversation_id": convo.id,
        "outbox_id": outbox.id, "outbound_mail_id": original.id,
        "conversation_mail": deepcopy(value)}
    payload["receipt_hash"] = seal(payload)
    existing = await tx.scalar(select(MailMessage).where(MailMessage.message_id == provider_id))
    if existing:
        saved = {k: v for k, v in existing.payload.items() if k != "response_eligibility"}
        if existing.direction != "inbound" or existing.case_id != case.id or saved != payload:
            raise ValueError("conversation_mail_reply_idempotency_conflict")
        return existing
    payload["response_eligibility"] = await eligibility(tx, original, convo)
    message = MailMessage(id=new_id(), business_id=original.business_id,
        environment_id=original.environment_id, case_id=case.id, message_id=provider_id,
        direction="inbound", state="conversation_evidence", payload=payload)
    tx.add(message)
    await tx.flush()
    from .service import add_event

    await add_event(tx, convo, "email-reply:" + message.id, "email_reply_received", {
        "mail_message_id": message.id, "outbound_mail_id": original.id,
        "outbox_id": outbox.id, "case_id": case.id, "receipt_hash": payload["receipt_hash"],
        "source": "authenticated_known_thread_imap", "can_respond": False})
    return message
