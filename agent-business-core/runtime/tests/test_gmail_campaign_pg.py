"""Restricted isolated PG + inert HTTP only; no operating/provider activation."""
import asyncio
import base64
import hashlib
import json
from datetime import timedelta
from email import policy
from email.parser import BytesParser
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_attachment import approval
from test_customer_public import verified
from test_gmail_owner_pg import gmail_owner  # noqa: F401
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.business_attachment import admin, service
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Session, User
from pinet_core.control.routes import ControlError, token_hash
from pinet_core.db import db
from pinet_core.mail_provider.campaign import CampaignGmail
from pinet_core.mail_provider.gmail import GmailError
from pinet_core.models import Case, MailMessage, utcnow


@pytest.fixture
async def customers(preview):  # noqa: F811
    # Source history is intentionally immutable. Use the existing append-only
    # retained QA lane, not the old identity fixture's destructive teardown.
    return {**preview, "businesses": []}


def save_plan(p):
    p["plan_path"].write_text(json.dumps(p["plan"]), encoding="utf-8")
    p["plan_sha"] = hashlib.sha256(p["plan_path"].read_bytes()).hexdigest()
    return CampaignGmail(p["vault"], p["owner"].id, p["owner"].token, p["bid"],
        plan_path=p["plan_path"], plan_sha256=p["plan_sha"], transport=httpx.MockTransport(p["provider"]))


@pytest.fixture
async def campaign(gmail_owner, monkeypatch, tmp_path):  # noqa: F811
    p = gmail_owner
    monkeypatch.setattr(settings(), "gmail_campaign_enabled", True)
    monkeypatch.setattr(service, "source_current", lambda: True)
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(p["owner"].token)))
        request = {**approval(), "business_id": p["bid"], "authorizing_session_id": session.id,
                   "source_revision": settings().control_source_revision}
        p["source"] = await admin.operate(tx, "approve", request)
    now = utcnow()
    p["plan"] = {"id": str(uuid4()), "enabled": True, "connection_id": p["owner"].id,
        "business_id": p["bid"], "user_id": p["binding"]["user_id"], "grant_id": p["binding"]["grant_id"],
        "source_binding_id": p["source"]["binding_id"], "source_binding_fingerprint": p["source"]["fingerprint"],
        "execution_source_revision": settings().control_source_revision, "environment": p["environment"],
        "sender": p["provider"].account, "approved_at": (now-timedelta(seconds=2)).isoformat(),
        "expires_at": (now+timedelta(minutes=30)).isoformat(), "maximum_sends": 2, "maximum_daily_sends": 2,
        "suppressed_recipients": [], "letters": [{"id": str(uuid4()), "recipient": "buyer@example.com",
            "subject": "Outdoor tubs for your accommodation", "body": "We can discuss two wood-fired tubs. Price and delivery need confirmation.",
            "language": "en", "contact_source": "https://example.com/contact", "contact_evidence": "Published business purchasing contact.",
            "permission_basis": "Isolated operator-reviewed inert fixture only.", "review_reference": "isolated-reviewed-copy-1"}]}
    p["plan_path"] = tmp_path / "campaign.private.json"
    p["gateway"] = save_plan(p)
    return p


async def prepared(p):
    return await p["gateway"].prepare_letter(p["plan"]["letters"][0]["id"])


async def test_new_real_draft_single_post_concurrency_and_capture_unchanged(campaign):
    p = campaign
    old = await p["owner"].prepare_self_test(str(uuid4()), "Owner self-test", "Isolated owner self-test, no real order.")
    value = await prepared(p)
    assert value == await prepared(p) and value["synthetic"] is False
    with pytest.raises(ControlError):
        await p["gateway"].send_letter(old["id"])
    with pytest.raises(ControlError):
        await p["owner"].send_self_test(value["id"])
    results = await asyncio.gather(p["gateway"].send_letter(value["id"]), p["gateway"].send_letter(value["id"]))
    assert "accepted_by_gmail" in {r["state"] for r in results} and len(p["provider"].posts) == 1
    raw = BytesParser(policy=policy.default).parsebytes(p["provider"].raw)
    assert str(raw["To"]) == "buyer@example.com" and "TESTAS" not in str(raw["Subject"])
    async with db.transaction(p["bid"], p["environment"]) as tx:
        original = await tx.get(MailMessage, old["id"])
        row = await tx.get(MailMessage, value["id"])
        assert original.payload["synthetic"] is True and original.state == "draft"
        assert row.payload["synthetic"] is False and row.payload["gmail_result"]["delivery_confirmed"] is False


@pytest.mark.parametrize("mode,state", [("timeout", "delivery_unknown"), ("reject", "rejected")])
async def test_unknown_rejected_consume_intent_and_never_retry(campaign, mode, state):
    p = campaign
    value = await prepared(p)
    p["provider"].mode = mode
    assert (await p["gateway"].send_letter(value["id"]))["state"] == state
    assert (await p["gateway"].send_letter(value["id"]))["state"] == state
    # A new campaign cannot retry the same contact's existing uncertain intent.
    p["plan"]["id"] = str(uuid4())
    p["gateway"] = save_plan(p)
    next_mail = await prepared(p)
    with pytest.raises(ControlError, match="already_attempted"):
        await p["gateway"].send_letter(next_mail["id"])
    assert len(p["provider"].posts) == 1


async def test_settlement_loss_stays_sending_and_does_not_post_twice(campaign, monkeypatch):
    p = campaign
    value = await prepared(p)
    async def unavailable(*args):
        raise RuntimeError("isolated database response lost after POST")
    monkeypatch.setattr(p["gateway"], "settle", unavailable)
    with pytest.raises(RuntimeError):
        await p["gateway"].send_letter(value["id"])
    assert (await p["gateway"].send_letter(value["id"]))["state"] == "sending"
    assert len(p["provider"].posts) == 1


@pytest.mark.parametrize("boundary", ["off", "expired", "suppressed", "changed-file", "revoked-grant", "wrong-source"])
async def test_closed_boundaries_make_zero_posts(campaign, monkeypatch, boundary):
    p = campaign
    value = await prepared(p)
    if boundary == "off":
        monkeypatch.setattr(settings(), "gmail_campaign_enabled", False)
    elif boundary == "changed-file":
        p["plan_path"].write_text("{}", encoding="utf-8")
    elif boundary == "revoked-grant":
        async with AsyncSession(p["admin"]) as tx, tx.begin():
            await tx.execute(update(BusinessGrant).where(BusinessGrant.id == p["binding"]["grant_id"]).values(enabled=False))
    else:
        if boundary == "expired":
            p["plan"]["approved_at"] = (utcnow()-timedelta(hours=2)).isoformat()
            p["plan"]["expires_at"] = (utcnow()-timedelta(hours=1)).isoformat()
        elif boundary == "suppressed":
            p["plan"]["suppressed_recipients"] = ["buyer@example.com"]
        else:
            p["plan"]["source_binding_fingerprint"] = "f"*64
        # Changed policy creates a fresh explicit draft, never mutates the old one.
        p["gateway"] = save_plan(p)
        if boundary == "suppressed":
            p["plan"]["id"] = str(uuid4())
            p["gateway"] = save_plan(p)
            value = await prepared(p)
    with pytest.raises((ControlError, GmailError)):
        await p["gateway"].send_letter(value["id"])
    assert not p["provider"].posts


async def test_quota_serializes_different_contacts(campaign):
    p = campaign
    p["plan"]["maximum_sends"] = p["plan"]["maximum_daily_sends"] = 1
    p["plan"]["letters"].append({**p["plan"]["letters"][0], "id": str(uuid4()), "recipient": "second@example.com"})
    p["gateway"] = save_plan(p)
    values = [await p["gateway"].prepare_letter(v["id"]) for v in p["plan"]["letters"]]
    results = await asyncio.gather(*(p["gateway"].send_letter(v["id"]) for v in values), return_exceptions=True)
    assert sum(isinstance(v, ControlError) and v.code == "gmail_campaign_send_limit" for v in results) == 1
    assert len(p["provider"].posts) == 1


async def test_bound_buyer_reply_same_case_replay_and_pause_hold(campaign, monkeypatch):
    p = campaign
    value = await prepared(p)
    await p["gateway"].send_letter(value["id"])
    p["provider"].sent_rfc = "<verified-google-rewrite@example.com>"
    async def buyer_reply(request):
        response = await p["provider"](request)
        if request.url.path.endswith("/" + p["provider"].reply_id):
            document = response.json()
            message = BytesParser(policy=policy.default).parsebytes(base64.urlsafe_b64decode(document["raw"]))
            message.replace_header("From", "buyer@example.com")
            document["raw"] = base64.urlsafe_b64encode(message.as_bytes()).decode()
            return httpx.Response(200, json=document)
        return response
    p["gateway"].transport = httpx.MockTransport(buyer_reply)
    monkeypatch.setattr(settings(), "gmail_campaign_enabled", False)
    received = await p["gateway"].sync_letter(value["id"])
    assert received == await p["gateway"].sync_letter(value["id"]) and len(received["inbound_mail_ids"]) == 1
    async with db.transaction(p["bid"], p["environment"]) as tx:
        reply = await tx.get(MailMessage, received["inbound_mail_ids"][0])
        case = await tx.get(Case, value["case_id"])
        assert reply.case_id == value["case_id"] and reply.payload["synthetic"] is False
        assert reply.payload["gmail_original_in_reply_to"] == p["provider"].sent_rfc
        assert case.payload["gmail_contact_state"] == "hold"
    read = await p["client"].get(f"/operator/v2/businesses/{p['bid']}/mail/{received['inbound_mail_ids'][0]}", headers=p["auth"])
    assert read.status_code == 200 and "2 Badezuber" in read.json()["data"]["body"]
    assert len(p["provider"].posts) == 1


async def test_foreign_owner_has_no_vault_or_case_access(campaign):
    p = campaign
    value = await prepared(p)
    _, auth, _ = await verified(p)
    foreign = CampaignGmail(p["vault"], p["owner"].id, auth["Authorization"][7:], p["bid"],
        plan_path=p["plan_path"], plan_sha256=p["plan_sha"], transport=httpx.MockTransport(p["provider"]))
    with pytest.raises(ControlError):
        await foreign.send_letter(value["id"])
    assert not p["provider"].posts


async def test_inherited_owner_action_cannot_bypass_campaign_pause_even_for_self(campaign, monkeypatch):
    p = campaign
    p["plan"]["letters"][0]["recipient"] = p["provider"].account
    p["gateway"] = save_plan(p)
    value = await prepared(p)
    monkeypatch.setattr(settings(), "gmail_campaign_enabled", False)
    for action in (p["gateway"].send_self_test, p["gateway"].sync_self_test):
        with pytest.raises(GmailError, match="exact_action_required"):
            await action(value["id"])
    assert not p["provider"].posts


async def test_observed_acceptance_survives_post_send_authority_loss(campaign, monkeypatch):
    p = campaign
    value = await prepared(p)
    current = service.current
    async def late_loss(*args, **kwargs):
        result = await current(*args, **kwargs)
        if p["provider"].posts:
            raise ControlError(409, "isolated_post_send_source_loss")
        return result
    monkeypatch.setattr(service, "current", late_loss)
    result = await p["gateway"].send_letter(value["id"])
    assert result["state"] == "accepted_by_gmail"
    async with db.transaction(p["bid"], p["environment"]) as tx:
        row = await tx.get(MailMessage, value["id"])
        assert row.payload["gmail_result"]["provider_message_id"] == p["provider"].sent_id
        assert row.payload["gmail_result"]["status"] == "accepted"
    assert len(p["provider"].posts) == 1


async def test_business_barrier_precedes_owner_lock_against_source_admin(campaign, monkeypatch):
    p, waiting = campaign, asyncio.Event()
    lifetime = service.lifetime
    async def observed_lifetime(*args, **kwargs):
        if asyncio.current_task().get_name() == "campaign-order-probe":
            waiting.set()
        return await lifetime(*args, **kwargs)
    monkeypatch.setattr(service, "lifetime", observed_lifetime)
    async def campaign_lock():
        async with p["gateway"].authorized():
            return True
    locked = False
    async with AsyncSession(p["admin"]) as tx:
        try:
            async with tx.begin():
                await lifetime(tx, p["bid"], exclusive=True)
                job = asyncio.create_task(campaign_lock(), name="campaign-order-probe")
                await asyncio.wait_for(waiting.wait(), 5)
                # Canonical admin already owns business lifetime. Its next User
                # lock must be available, rather than held by the waiting sender.
                await tx.scalar(select(User).where(User.id == p["binding"]["user_id"]).with_for_update(nowait=True))
                locked = True
        except DBAPIError:
            pass  # Keep the assertion after all locks and the child are released.
    assert await asyncio.wait_for(job, 10)
    assert locked, "campaign held User while waiting for admin's business barrier"
    assert not p["provider"].posts


async def test_same_gmail_account_two_connections_share_daily_cap(campaign):
    p = campaign
    p["plan"]["maximum_daily_sends"] = 1
    p["gateway"] = save_plan(p)
    await p["gateway"].send_letter((await prepared(p))["id"])
    second_id = str(uuid4())
    with p["vault"].locked(p["owner"].id):
        record = p["vault"].read(p["owner"].id, p["binding"])
    with p["vault"].locked(second_id):
        p["vault"].write(second_id, p["binding"], record, create=True)
    p["plan"]["id"], p["plan"]["connection_id"] = str(uuid4()), second_id
    p["plan"]["letters"][0]["recipient"] = "second@example.com"
    p["plan_path"].write_text(json.dumps(p["plan"]), encoding="utf-8")
    second = CampaignGmail(p["vault"], second_id, p["owner"].token, p["bid"], plan_path=p["plan_path"],
        plan_sha256=hashlib.sha256(p["plan_path"].read_bytes()).hexdigest(), transport=httpx.MockTransport(p["provider"]))
    value = await second.prepare_letter(p["plan"]["letters"][0]["id"])
    with pytest.raises(ControlError, match="send_limit"):
        await second.send_letter(value["id"])
    assert len(p["provider"].posts) == 1
