"""Reviewed same-thread replies, inert retained PostgreSQL/Gmail only."""

import asyncio
import base64
import hashlib
import json
from copy import deepcopy
from email import policy
from email.parser import BytesParser
from uuid import uuid4

import httpx
import pytest
from test_gmail_campaign_pg import campaign, customers, prepared, save_plan  # noqa: F401
from test_gmail_owner_pg import gmail_owner  # noqa: F401
from test_private_preview_pg import preview  # noqa: F401

from pinet_core import mailbox
from pinet_core.control.routes import ControlError
from pinet_core.db import db
from pinet_core.mail_provider.conversation import ConversationGmail
from pinet_core.models import Case, MailMessage


async def incoming(p):
    value = await prepared(p)
    await p["gateway"].send_letter(value["id"])
    original_provider = p["provider"]

    async def buyer(request):
        response = await original_provider(request)
        if request.url.path.endswith("/" + original_provider.reply_id):
            document = response.json()
            message = BytesParser(policy=policy.default).parsebytes(base64.urlsafe_b64decode(document["raw"]))
            message.replace_header("From", p["plan"]["letters"][0]["recipient"])
            document["raw"] = base64.urlsafe_b64encode(message.as_bytes()).decode()
            return httpx.Response(200, json=document)
        return response

    p["gateway"].transport = httpx.MockTransport(buyer)
    return value


async def test_new_authenticated_reply_does_not_erase_terminal_contact_stop(campaign):  # noqa: F811
    p = campaign
    original = await incoming(p)
    async with db.transaction(p["bid"], p["environment"]) as tx:
        case = await tx.get(Case, original["case_id"], with_for_update=True)
        case.payload = {
            **case.payload,
            "gmail_contact_state": "stopped",
            "gmail_contact_reason": "confirmed_refusal",
        }
    value = await p["gateway"].sync_letter(original["id"])
    assert len(value["inbound_mail_ids"]) == 1
    async with db.transaction(p["bid"], p["environment"]) as tx:
        case = await tx.get(Case, original["case_id"])
        assert case.payload["gmail_contact_state"] == "stopped"
        assert case.payload["gmail_contact_reason"] == "confirmed_refusal"
        assert case.payload["gmail_last_inbound_id"] == value["inbound_mail_ids"][0]


async def test_replayed_old_gmail_reply_does_not_replace_newer_inbound(campaign):  # noqa: F811
    p = campaign
    original = await incoming(p)
    first = await p["gateway"].sync_letter(original["id"])
    async with db.transaction(p["bid"], p["environment"]) as tx:
        parent = await tx.get(MailMessage, original["id"])
        newer = await mailbox.receive_reply(
            tx,
            parent,
            "<later-known@example.com>",
            "buyer@example.com",
            "Re: requirements",
            "A later corrected customer requirement.",
            recipient=parent.payload["sender"],
            references=[parent.message_id],
            source_ref="authenticated_gmail_reply",
        )
        await p["gateway"].reply_received(tx, parent, newer)
        new_id = newer.id
    assert new_id != first["inbound_mail_ids"][0]
    await p["gateway"].sync_letter(original["id"])
    async with db.transaction(p["bid"], p["environment"]) as tx:
        case = await tx.get(Case, original["case_id"])
        assert case.payload["gmail_last_inbound_id"] == new_id


async def reply_ready(p):
    original = await incoming(p)
    received = await p["gateway"].sync_letter(original["id"])
    async with db.transaction(p["bid"], p["environment"]) as tx:
        row = await tx.get(MailMessage, received["inbound_mail_ids"][0])
        incoming_id, incoming_hash, subject = row.id, mailbox.fingerprint(row.payload), row.payload["subject"]
    plan = deepcopy(p["plan"])
    plan.update(id=str(uuid4()), parent_plan_path=str(p["plan_path"]), parent_plan_sha256=p["plan_sha"])
    plan["letters"][0].update(
        id=str(uuid4()),
        subject=subject,
        body="The final price and delivery date remain unconfirmed. Please confirm the intended guest capacity.",
        parent_mail_id=original["id"],
        inbound_mail_id=incoming_id,
        inbound_sha256=incoming_hash,
        reviewed_classification="question",
        reviewed_action="reply",
    )
    path = p["plan_path"].with_name("conversation.private.json")
    path.write_text(json.dumps(plan), "utf-8")
    gateway = ConversationGmail(
        p["vault"],
        p["owner"].id,
        p["owner"].token,
        p["bid"],
        plan_path=path,
        plan_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        transport=p["gateway"].transport,
    )
    draft = await gateway.prepare_letter(plan["letters"][0]["id"])
    return gateway, draft, original, incoming_id


async def test_exact_requested_reply_one_post_same_case_and_thread(campaign):  # noqa: F811
    p = campaign
    gateway, draft, original, inbound = await reply_ready(p)
    assert draft["case_id"] == original["case_id"] and draft["synthetic"] is False
    results = await asyncio.gather(gateway.send_letter(draft["id"]), gateway.send_letter(draft["id"]))
    assert "accepted_by_gmail" in {r["state"] for r in results} and len(p["provider"].posts) == 2
    document = json.loads(p["provider"].posts[-1].content)
    assert document["threadId"] == p["provider"].thread
    parsed = BytesParser(policy=policy.default).parsebytes(base64.urlsafe_b64decode(document["raw"]))
    async with db.transaction(p["bid"], p["environment"]) as tx:
        row = await tx.get(MailMessage, inbound)
        case = await tx.get(Case, original["case_id"])
        assert str(parsed["In-Reply-To"]) == row.message_id and row.message_id in str(parsed["References"])
        assert str(parsed["Subject"]) == row.payload["subject"]
        assert case.payload["gmail_contact_state"] == "hold"
        sent = await tx.get(MailMessage, draft["id"])
        assert sent.payload["gmail_result"]["thread_matched"] is True
    with pytest.raises(ControlError):
        await p["gateway"].send_letter(draft["id"])
    with pytest.raises(ControlError):
        await gateway.send_letter(original["id"])
    assert len(p["provider"].posts) == 2


async def test_next_authenticated_customer_reply_continues_accepted_reply_plan(campaign):  # noqa: F811
    p = campaign
    p["plan"]["maximum_daily_sends"] = 3
    p["gateway"] = save_plan(p)
    first, draft, original, _ = await reply_ready(p)
    p["provider"].sent_id = "accepted-second-message"
    assert (await first.send_letter(draft["id"]))["state"] == "accepted_by_gmail"
    p["provider"].reply_id = "inbound-second-question"
    p["provider"].reply_rfc = "<second-customer-question@example.com>"
    received = await first.sync_letter(draft["id"])
    assert len(received["inbound_mail_ids"]) == 1
    async with db.transaction(p["bid"], p["environment"]) as tx:
        incoming = await tx.get(MailMessage, received["inbound_mail_ids"][0])
        incoming_id, incoming_hash, subject = incoming.id, mailbox.fingerprint(incoming.payload), incoming.payload["subject"]
    plan = first.plan.model_dump(mode="json")
    plan.update(id=str(uuid4()), parent_plan_path=str(first.plan_path), parent_plan_sha256=first.plan_sha256)
    plan["letters"][0].update(id=str(uuid4()), parent_mail_id=draft["id"], inbound_mail_id=incoming_id,
        inbound_sha256=incoming_hash, subject=subject, body="Thank you. The revised specification still needs confirmation; please provide the destination postcode.")
    path = p["plan_path"].with_name("conversation-next.private.json")
    path.write_text(json.dumps(plan), "utf-8")
    following = ConversationGmail(p["vault"], p["owner"].id, p["owner"].token, p["bid"],
        plan_path=path, plan_sha256=hashlib.sha256(path.read_bytes()).hexdigest(), transport=first.transport)
    next_draft = await following.prepare_letter(plan["letters"][0]["id"])
    assert next_draft["case_id"] == original["case_id"]
    p["provider"].sent_id = "accepted-third-message"
    sent = await following.send_letter(next_draft["id"])
    assert sent["state"] == "accepted_by_gmail" and len(p["provider"].posts) == 3
    posted = json.loads(p["provider"].posts[-1].content)
    parsed = BytesParser(policy=policy.default).parsebytes(base64.urlsafe_b64decode(posted["raw"]))
    assert posted["threadId"] == p["provider"].thread and str(parsed["In-Reply-To"]) == p["provider"].reply_rfc
    assert (await following.send_letter(next_draft["id"]))["state"] == "accepted_by_gmail"
    assert len(p["provider"].posts) == 3


@pytest.mark.parametrize("change", ["stopped", "newer", "hash", "quota"])
async def test_changed_current_reply_cannot_create_send_intent(campaign, change):  # noqa: F811
    p = campaign
    gateway, draft, original, inbound = await reply_ready(p)
    if change == "quota":
        plan = json.loads(gateway.plan_path.read_text("utf-8"))
        plan["maximum_daily_sends"] = 1
        plan["id"] = str(uuid4())
        plan["letters"][0]["id"] = str(uuid4())
        gateway.plan_path.write_text(json.dumps(plan), "utf-8")
        gateway = ConversationGmail(
            p["vault"],
            p["owner"].id,
            p["owner"].token,
            p["bid"],
            plan_path=gateway.plan_path,
            plan_sha256=hashlib.sha256(gateway.plan_path.read_bytes()).hexdigest(),
            transport=p["gateway"].transport,
        )
        draft = await gateway.prepare_letter(plan["letters"][0]["id"])
    else:
        async with db.transaction(p["bid"], p["environment"]) as tx:
            case = await tx.get(Case, original["case_id"], with_for_update=True)
            if change == "stopped":
                case.payload = {**case.payload, "gmail_contact_state": "stopped"}
            elif change == "newer":
                case.payload = {**case.payload, "gmail_last_inbound_id": str(uuid4())}
            else:
                row = await tx.get(MailMessage, inbound, with_for_update=True)
                row.payload = {**row.payload, "body": "A changed inbound invalidates its old exact review."}
    with pytest.raises(ControlError):
        await gateway.send_letter(draft["id"])
    assert len(p["provider"].posts) == 1
    async with db.transaction(p["bid"], p["environment"]) as tx:
        row = await tx.get(MailMessage, draft["id"])
        assert row.state == "draft" and "gmail_intent" not in row.payload


async def test_unknown_requested_reply_stays_consumed(campaign):  # noqa: F811
    p = campaign
    gateway, draft, _, _ = await reply_ready(p)
    p["provider"].mode = "timeout"
    assert (await gateway.send_letter(draft["id"]))["state"] == "delivery_unknown"
    assert (await gateway.send_letter(draft["id"]))["state"] == "delivery_unknown"
    assert len(p["provider"].posts) == 2


async def test_requested_reply_acceptance_survives_post_send_fence(campaign, monkeypatch):  # noqa: F811
    from contextlib import asynccontextmanager

    p = campaign
    gateway, draft, _, _ = await reply_ready(p)
    original = gateway.authorized
    calls = 0

    @asynccontextmanager
    async def fenced():
        nonlocal calls
        calls += 1
        async with original() as value:
            yield value
        if calls == 2:
            raise ControlError(409, "source_changed_after_yield")

    monkeypatch.setattr(gateway, "authorized", fenced)
    value = await gateway.send_letter(draft["id"])
    assert value["state"] == "accepted_by_gmail" and len(p["provider"].posts) == 2
    async with db.transaction(p["bid"], p["environment"]) as tx:
        row = await tx.get(MailMessage, draft["id"])
        assert row.payload["gmail_result"]["provider_thread_id"] == p["provider"].thread


async def test_a_new_reply_plan_cannot_repeat_one_answered_inbound(campaign):  # noqa: F811
    p = campaign
    gateway, draft, _, _ = await reply_ready(p)
    await gateway.send_letter(draft["id"])
    plan = json.loads(gateway.plan_path.read_text("utf-8"))
    plan["id"] = str(uuid4())
    plan["letters"][0]["id"] = str(uuid4())
    other_path = gateway.plan_path.with_name("another-reply.private.json")
    other_path.write_text(json.dumps(plan), "utf-8")
    other = ConversationGmail(
        p["vault"],
        p["owner"].id,
        p["owner"].token,
        p["bid"],
        plan_path=other_path,
        plan_sha256=hashlib.sha256(other_path.read_bytes()).hexdigest(),
        transport=p["gateway"].transport,
    )
    new = await other.prepare_letter(plan["letters"][0]["id"])
    with pytest.raises(ControlError, match="gmail_inbound_reply_already_attempted"):
        await other.send_letter(new["id"])
    assert len(p["provider"].posts) == 2


async def test_owner_acceptance_is_self_only_and_cannot_become_commercial(campaign):  # noqa: F811
    from pinet_core.mail_provider.gmail import GmailError

    p = campaign
    p["plan"]["purpose"] = "owner_acceptance"
    p["plan"]["letters"][0]["recipient"] = p["provider"].account
    p["gateway"] = save_plan(p)
    gateway, draft, original, inbound = await reply_ready(p)
    assert draft["synthetic"] is True
    assert (await gateway.send_letter(draft["id"]))["state"] == "accepted_by_gmail"
    async with db.transaction(p["bid"], p["environment"]) as tx:
        for identity in (draft["id"], original["id"], inbound):
            row = await tx.get(MailMessage, identity)
            assert row.payload["synthetic"] is True
    plan = json.loads(gateway.plan_path.read_text("utf-8"))
    plan["id"] = str(uuid4())
    plan["purpose"] = "campaign"
    path = gateway.plan_path.with_name("wrong-commercial-conversion.private.json")
    path.write_text(json.dumps(plan), "utf-8")
    with pytest.raises(GmailError, match="gmail_conversation_scope_conflict"):
        ConversationGmail(
            p["vault"],
            p["owner"].id,
            p["owner"].token,
            p["bid"],
            plan_path=path,
            plan_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
            transport=p["gateway"].transport,
        )
    assert len(p["provider"].posts) == 2
