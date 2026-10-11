"""Restricted PG conversation mail linkage. SMTP/IMAP are always substituted."""
import asyncio
import smtplib
from copy import deepcopy
from datetime import timedelta

import pytest
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
from test_delivery import prepared

from pinet_core import conversation_mail, jobs, mail_reader, mailbox, policy, service
from pinet_core.config import settings
from pinet_core.contracts import PolicyUpdate
from pinet_core.db import Database, db
from pinet_core.models import (
    Case,
    Contact,
    Conversation,
    Event,
    Job,
    KnowledgeState,
    MailMessage,
    Outbox,
    new_id,
    utcnow,
)


async def test_postcall_outbound_is_in_exact_conversation_case_reply_registry(client, monkeypatch):
    item = await prepared(client, monkeypatch)
    sends = []
    monkeypatch.setattr(jobs, "smtp_send", lambda *args: sends.append(args))
    assert await jobs.deliver_one(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        outbox = await tx.scalar(select(Outbox))
        convo = await tx.get(Conversation, outbox.conversation_id)
        outbound = await tx.scalar(select(MailMessage).where(MailMessage.message_id == sends[0][2]))
        assert outbound is not None, "postcall Message-ID is missing from maintained reply registry"
        assert outbound.case_id == convo.case_id
        assert outbound.state == "accepted_by_smtp"
        assert outbound.payload["conversation_id"] == convo.id
        assert outbound.payload["outbox_id"] == outbox.id
        assert outbox.payload["mail_message_id"] == outbound.id


@pytest.fixture
async def linked(client, monkeypatch):
    item = await prepared(client, monkeypatch)
    monkeypatch.setattr(jobs, "smtp_send", lambda *args: None)
    assert await jobs.deliver_one(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        outbound = await tx.scalar(select(MailMessage).where(MailMessage.direction == "outbound"))
        return item, outbound.id, outbound.payload["conversation_id"]


async def receive(linked, provider_id="<reply@client.example>", **changes):
    item, mail_id, _ = linked
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, mail_id, with_for_update=True)
        if not original:
            raise ValueError("reply_identity_invalid")
        args = {"provider_id": provider_id, "sender": original.payload["recipient"],
            "subject": "Re: Jūsų užklausa", "body": "Prašau patikslinti pasiūlymą.",
            "references": [original.message_id], "recipient": original.payload["sender"]}
        args.update(changes)
        return await mailbox.receive_reply(tx, original, **args)


async def test_reply_is_immutable_same_conversation_evidence_without_session_or_job_reopen(linked):
    item, _, cid = linked
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, cid)
        before = (convo.state, convo.epoch, convo.expires_at, deepcopy(convo.payload))
        jobs_before = [(row.id, row.state, row.generation) for row in await tx.scalars(select(Job))]
    first, again = await receive(linked), await receive(linked)
    assert first.id == again.id and first.payload == again.payload
    assert first.state == "conversation_evidence" and first.payload["response_eligibility"]["can_respond"] is False
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, cid)
        assert (convo.state, convo.epoch, convo.expires_at, convo.payload) == before
        assert [(row.id, row.state, row.generation) for row in await tx.scalars(select(Job))] == jobs_before
        events = list(await tx.scalars(select(Event).where(Event.kind == "email_reply_received")))
        assert len(events) == 1 and events[0].conversation_id == cid
        assert events[0].payload["mail_message_id"] == first.id
        assert "Prašau" not in str(events[0].payload) and "@" not in str(events[0].payload)


@pytest.mark.parametrize("changes", [
    {"sender": "other@client.example"}, {"recipient": "other@operator.example"},
    {"body": "Pakeistas laiškas tuo pačiu Message-ID."}, {"subject": "Kita tema"},
    {"references": ["<unrelated@operator.example>"]},
])
async def test_conflicting_duplicate_cannot_change_receipt_or_event(linked, changes):
    first = await receive(linked)
    with pytest.raises(ValueError, match="conflict"):
        await receive(linked, **changes)
    async with db.transaction(linked[0].id, settings().environment) as tx:
        assert (await tx.get(MailMessage, first.id)).payload == first.payload
        assert await tx.scalar(select(func.count()).select_from(Event).where(Event.kind == "email_reply_received")) == 1


async def test_concurrent_duplicate_receipts_and_distinct_reply_sequences_are_serialized(linked):
    same = await asyncio.gather(*(receive(linked) for _ in range(3)))
    assert len({value.id for value in same}) == 1
    other = await asyncio.gather(*(receive(linked, f"<reply{i}@client.example>") for i in range(3)))
    assert len({value.id for value in other}) == 3
    async with db.transaction(linked[0].id, settings().environment) as tx:
        events = list(await tx.scalars(select(Event).where(Event.kind == "email_reply_received")))
        assert len(events) == 4 and len({row.sequence for row in events}) == 4


@pytest.mark.parametrize("outcome,expected", [("accepted", "accepted_by_smtp"), ("refused", "rejected"),
    ("ambiguous", "delivery_unknown"), ("cancelled", "sending")])
async def test_exact_receipt_commits_before_io_and_uncertainty_never_retries(client, monkeypatch, outcome, expected):
    item = await prepared(client, monkeypatch)
    calls = []

    async def inspect_intent(message_id, recipient, content):
        isolated = Database(settings().database_url)
        try:
            async with isolated.transaction(item.id, settings().environment) as tx:
                mail = await tx.scalar(select(MailMessage).where(MailMessage.message_id == message_id))
                outbox = await tx.get(Outbox, mail.payload["outbox_id"])
                assert mail.state == "sending" and outbox.state == "dispatched"
                assert mail.payload["recipient"] == recipient and mail.payload["body"] == content["body"]
                assert conversation_mail.verified_outbound(mail)
        finally:
            await isolated.engine.dispose()

    def transport(recipient, content, message_id):
        calls.append(message_id)
        asyncio.run(inspect_intent(message_id, recipient, content))
        if outcome == "refused":
            raise smtplib.SMTPDataError(550, b"synthetic refusal")
        if outcome == "ambiguous":
            raise TimeoutError("synthetic uncertain DATA")
        if outcome == "cancelled":
            raise asyncio.CancelledError()

    monkeypatch.setattr(jobs, "smtp_send", transport)
    if outcome == "cancelled":
        with pytest.raises(asyncio.CancelledError):
            await jobs.deliver_one(item.id)
    else:
        assert await jobs.deliver_one(item.id)
    assert await jobs.deliver_one(item.id) is False and len(calls) == 1
    async with db.transaction(item.id, settings().environment) as tx:
        mail = await tx.scalar(select(MailMessage))
        assert mail.state == expected
        if outcome != "cancelled":
            assert mail.payload["transport_result"]["inbox_verified"] is False
        if outcome != "accepted":
            with pytest.raises(ValueError, match="identity_conflict"):
                await mailbox.receive_reply(tx, mail, "<reply@client.example>", mail.payload["recipient"],
                    "Re: test", "Synthetic reply", references=[mail.message_id], recipient=mail.payload["sender"])


@pytest.mark.parametrize("change,blocker", [("source", "current_source_revoked_or_changed"),
    ("ttl", "current_knowledge_unavailable"), ("policy", "current_policy_disabled"),
    ("contact", "current_contact_changed")])
async def test_inbound_receipt_survives_current_revoke_without_response_authority(linked, change, blocker):
    item, mid, _ = linked
    async with db.transaction(item.id, settings().environment) as tx:
        if change == "policy":
            await policy.lock(tx, item.id, settings().environment, exclusive=True)
            old, revision = await policy.read(tx)
            await policy.update(tx, item.id, settings().environment, PolicyUpdate(base_revision=revision,
                policy=old.model_copy(update={"paused": True}), reason="Synthetic pause before reply"))
        elif change == "contact":
            original = await tx.get(MailMessage, mid)
            contact = await tx.get(Contact, conversation_mail.binding(original.payload)["contact_id"])
            contact.payload = {**contact.payload, "revision": contact.payload["revision"] + 1}
        else:
            source = await tx.scalar(select(KnowledgeState))
            if change == "source":
                source.payload = {**source.payload, "revoked": ["a" * 64]}
            else:
                source.refreshed_at = utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)
    receipt = await receive(linked)
    assert blocker in receipt.payload["response_eligibility"]["blockers"]
    assert receipt.payload["response_eligibility"]["can_respond"] is False
    assert receipt.payload["conversation_mail"]["source_refs"][0]["revision_hash"] == "a" * 64


async def test_deleted_or_expired_original_binding_cannot_receive_or_recreate(linked):
    item, _, cid = linked
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, cid)
        convo.created_at = utcnow() - timedelta(days=settings().retention_days + 1)
    with pytest.raises(ValueError, match="binding_unavailable"):
        await receive(linked)
    async with db.transaction(item.id, settings().environment) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage).where(MailMessage.direction == "inbound")) == 0
        await tx.execute(delete(Case))
    with pytest.raises(ValueError, match="invalid"):
        await receive(linked)


async def test_scope_isolation_and_composite_case_fk_apply_to_mail_receipts(linked):
    one, mid, cid = linked
    two = await service.business("greitossvetaines")
    async with db.transaction(one.id, settings().environment) as tx:
        case_id = (await tx.get(Conversation, cid)).case_id
    async with db.transaction(two.id, settings().environment) as tx:
        assert await tx.get(MailMessage, mid) is None and await tx.get(Conversation, cid) is None
    async with db.transaction(one.id, settings().environment + "-other") as tx:
        assert await tx.get(MailMessage, mid) is None
    async with db.registry() as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 0
        role = (await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
        assert not role.rolsuper and not role.rolbypassrls
    with pytest.raises(IntegrityError):
        async with db.transaction(two.id, settings().environment) as tx:
            tx.add(MailMessage(id=new_id(), business_id=two.id, environment_id=settings().environment,
                case_id=case_id, message_id="<bad-fk@client.example>", direction="inbound", state="received", payload={}))


async def test_maintained_sync_rechecks_policy_after_mocked_inbox_scan(linked, monkeypatch):
    item, mid, cid = linked

    def inbox(known):
        original = next(value for value in known.values() if value and value["id"] == mid)
        # Actual DB commit during the connector's network boundary, not a stale in-memory snapshot.
        async def pause():
            isolated = Database(settings().database_url)
            try:
                async with isolated.transaction(item.id, settings().environment) as tx:
                    await policy.lock(tx, item.id, settings().environment, exclusive=True)
                    value, revision = await policy.read(tx)
                    await policy.update(tx, item.id, settings().environment, PolicyUpdate(base_revision=revision,
                        policy=value.model_copy(update={"paused": True}), reason="Synthetic scan-time pause"))
            finally:
                await isolated.engine.dispose()
        asyncio.run(pause())
        message_id = next(key for key, value in known.items() if value is original)
        return [{"original": original, "provider_id": "<scan-reply@client.example>",
            "sender": original["recipient"], "recipient": original["sender"], "subject": "Re: test",
            "references": [message_id], "body": "Prašau patikslinti."}]

    monkeypatch.setattr(mail_reader, "fetch_replies", inbox)
    with pytest.raises(RuntimeError, match="local_owner"):
        await mail_reader.sync_replies()
    assert (await mail_reader._sync_known_replies(settings()))["matched_replies"] == 1
    async with db.transaction(item.id, settings().environment) as tx:
        reply = await tx.scalar(select(MailMessage).where(MailMessage.direction == "inbound"))
        assert reply.payload["conversation_id"] == cid
        assert "current_policy_disabled" in reply.payload["response_eligibility"]["blockers"]


async def test_conflicting_message_id_across_cases_rejected_for_legacy_sales_too(linked):
    first = await receive(linked)
    item = linked[0]
    async with db.transaction(item.id, settings().environment) as tx:
        other = await mailbox.prepare(tx, item, mailbox.DraftInput(recipient="delivery-fixture@example.org",
            subject="Testinis pasiūlymas", body="Tik sintetinė užklausa.", source_ref="separate-case-fixture"))
        with pytest.raises(ValueError, match="idempotency_conflict"):
            await mailbox.receive_reply(tx, other, first.message_id, other.payload["recipient"],
                first.payload["subject"], first.payload["body"])


async def test_mocked_smtp_and_real_header_first_imap_adapter_link_same_conversation(linked, monkeypatch):
    item, mid, cid = linked
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, mid)
        raw = (f"Message-ID: <end-to-end@client.example>\r\nIn-Reply-To: {original.message_id}\r\n"
            f"References: {original.message_id}\r\nFrom: {original.payload['recipient']}\r\n"
            f"To: {original.payload['sender']}\r\nSubject: Re: inquiry\r\n"
            "Content-Type: text/plain; charset=utf-8\r\n\r\nPlease clarify the proposal.").encode()
    requests = []

    class Inbox:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def login(self, *args):
            return "OK", []

        def select(self, name, readonly):
            assert name == "INBOX" and readonly is True

        def uid(self, command, *args):
            requests.append((command, args))
            if command == "search":
                return "OK", [b"1"]
            data = raw.split(b"\r\n\r\n", 1)[0] + b"\r\n\r\n" if "HEADER.FIELDS" in args[1] else raw
            return "OK", [(f"1 (RFC822.SIZE {len(raw)})".encode(), data)]

    monkeypatch.setattr(mail_reader.imaplib, "IMAP4_SSL", lambda *args, **kwargs: Inbox())
    assert (await mail_reader._sync_known_replies(settings()))["matched_replies"] == 1
    assert (await mail_reader._sync_known_replies(settings()))["matched_replies"] == 0
    assert len(requests) == 6
    async with db.transaction(item.id, settings().environment) as tx:
        reply = await tx.scalar(select(MailMessage).where(MailMessage.direction == "inbound"))
        convo = await tx.get(Conversation, cid)
        assert reply.case_id == convo.case_id and reply.payload["conversation_id"] == cid
        assert reply.payload["body"] == "Please clarify the proposal."
        assert await tx.scalar(select(func.count()).select_from(Event).where(Event.kind == "email_reply_received")) == 1


@pytest.mark.parametrize("changed", ["body", "message_id", "binding", "recipient"])
async def test_tampered_outbound_receipt_is_never_a_reply_source(linked, changed):
    item, mid, _ = linked
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, mid)
        if changed == "message_id":
            original.message_id = "<tampered@operator.example>"
        elif changed == "binding":
            original.payload = {**original.payload, "conversation_mail": "untrusted malformed binding"}
        else:
            original.payload = {**original.payload, changed: "tampered"}
        assert not conversation_mail.verified_outbound(original)
    with pytest.raises(ValueError, match="identity_conflict"):
        await receive(linked)
    async with db.transaction(item.id, settings().environment) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage).where(MailMessage.direction == "inbound")) == 0


async def test_changed_contact_revision_blocks_before_any_dispatch_receipt(client, monkeypatch):
    item = await prepared(client, monkeypatch)
    calls = []
    monkeypatch.setattr(jobs, "smtp_send", lambda *args: calls.append(args))
    async with db.transaction(item.id, settings().environment) as tx:
        contact = await tx.scalar(select(Contact))
        contact.payload = {**contact.payload, "revision": contact.payload["revision"] + 1}
    assert await jobs.deliver_one(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.scalar(select(Outbox))).state == "blocked_contact_revision"
        assert await tx.scalar(select(func.count()).select_from(MailMessage)) == 0
    assert not calls
