"""Real owner/RLS/Case/MailMessage, explicitly inert Gmail HTTP transport."""
import asyncio
import base64
import json
from datetime import timedelta
from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from types import SimpleNamespace
from urllib.parse import parse_qs, urlencode, urlsplit
from uuid import uuid4

import httpx
import pytest
from cryptography.fernet import Fernet
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.acquisition import module_admin
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Portfolio
from pinet_core.control.routes import ControlError
from pinet_core.db import db
from pinet_core.mail_provider import oauth
from pinet_core.mail_provider.gmail import GmailError
from pinet_core.mail_provider.owner import OwnerGmail
from pinet_core.mail_provider.vault import Vault
from pinet_core.models import Business, Case, MailMessage, new_id, utcnow


class InertGmail:
    def __init__(self):
        self.calls, self.posts, self.mode, self.raw = [], [], "accept", None
        self.thread, self.sent_id, self.reply_id = "thread1", "sent1", "reply1"
        self.reply_rfc = "<"+uuid4().hex+"@example.com>"
        self.account = "owner@example.com"
        self.business_id = None

    async def __call__(self, request):
        self.calls.append((request.method, request.url.path))
        if request.url.path.endswith("/profile"):
            return httpx.Response(200, json={"emailAddress": self.account})
        if request.method == "POST":
            self.posts.append(request)
            self.raw = base64.urlsafe_b64decode(json.loads(request.content)["raw"])
            parsed = BytesParser(policy=policy.default).parsebytes(self.raw)
            # The network seam itself observes intent committed by an earlier transaction.
            async with db.transaction(self.business_id, settings().environment) as tx:
                row = await tx.scalar(select(MailMessage).where(MailMessage.message_id == str(parsed["Message-ID"])))
                assert row and row.state == "sending" and row.payload["gmail_intent"]["source_revision"] == settings().control_source_revision
            if self.mode == "timeout":
                raise httpx.ReadTimeout("synthetic timeout", request=request)
            if self.mode == "reject":
                return httpx.Response(401, json={"error": "synthetic invalid credential"})
            return httpx.Response(200, json={"id": self.sent_id, "threadId": self.thread})
        if "/threads/" in request.url.path:
            return httpx.Response(200, json={"id": self.thread, "messages": [
                {"id": self.sent_id, "threadId": self.thread}, {"id": self.reply_id, "threadId": self.thread}]})
        if "/messages/" in request.url.path:
            original = BytesParser(policy=policy.default).parsebytes(self.raw)
            message = EmailMessage(policy=policy.SMTP)
            message["Message-ID"], message["From"], message["To"] = self.reply_rfc, self.account, self.account
            if self.mode == "foreign-reply":
                message.replace_header("From", "foreign@example.com")
            message["Subject"] = "Re: " + str(original["Subject"])
            message["In-Reply-To"], message["References"] = str(original["Message-ID"]), str(original["Message-ID"])
            message.set_content("Bitte 2 Badezuber; Preis und Liefertermin sind noch nicht bestätigt.")
            return httpx.Response(200, json={"id": self.reply_id,
                "raw": base64.urlsafe_b64encode(message.as_bytes()).decode()})
        raise AssertionError("unexpected Gmail operation")


@pytest.fixture
async def gmail_owner(customers, monkeypatch, tmp_path):  # noqa: F811
    p, cfg = customers, settings()
    monkeypatch.setattr(cfg, "gmail_owner_enabled", True)
    monkeypatch.setattr(module_admin, "git_source_observation",
        lambda root: SimpleNamespace(head=cfg.control_source_revision, porcelain=""))
    _, auth, me = await verified(p)
    token = auth["Authorization"][7:]
    bid = new_id()
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        portfolio = await tx.get(Portfolio, me["portfolios"][0]["portfolio_id"])
        site = "customer-qa-"+p["environment"]+"-gmail-"+uuid4().hex
        tx.add(Business(id=bid, site_id=site, canonical_host=site+".example.test"))
        await tx.flush()
        tx.add(BusinessGrant(id=new_id(), business_id=bid, environment_id=p["environment"],
            organization_id=portfolio.organization_id, portfolio_id=portfolio.id, display_name="Synthetic Gmail",
            evidence_revision=cfg.control_source_revision, enabled=True))
    provider, vault, cid = InertGmail(), Vault(tmp_path, Fernet.generate_key()), str(uuid4())
    provider.business_id = bid
    owner = OwnerGmail(vault, cid, token, bid, transport=httpx.MockTransport(provider))
    binding = await owner.binding()
    with vault.locked(cid):
        vault.write(cid, binding, {"status": "active", "account_email": provider.account,
            "client": {"client_id": "test.apps.googleusercontent.com", "client_secret": "test-secret"},
            "tokens": {"access_token": "test-token", "refresh_token": "test-refresh",
                       "expires_at": (utcnow()+timedelta(hours=1)).isoformat()}}, create=True)
    try:
        yield {**p, "owner": owner, "provider": provider, "bid": bid, "auth": auth, "vault": vault, "binding": binding}
    finally:
        async with AsyncSession(p["admin"]) as tx, tx.begin():
            await tx.execute(delete(Case).where(Case.business_id == bid, Case.environment_id == p["environment"]))


async def prepared(p):
    return await p["owner"].prepare_self_test(str(uuid4()), "Gmail integration test", "Synthetic owner self-test. Not an order: 2 tubs.")


@pytest.mark.parametrize("revoke_before_adoption", [False, True])
async def test_oauth_exchange_consumed_before_network_and_current_owner_before_adoption(gmail_owner, revoke_before_adoption):
    p, cid, exchanges = gmail_owner, str(uuid4()), []

    async def transport(request):
        if str(request.url) == oauth.TOKEN_URL:
            exchanges.append(request)
            assert p["vault"].read(cid, p["binding"])["flow"]["consumed"] is True
            assert parse_qs(request.content.decode())["code"] == ["synthetic-code"]
            if revoke_before_adoption:
                async with AsyncSession(p["admin"]) as tx, tx.begin():
                    await tx.execute(update(BusinessGrant).where(BusinessGrant.id == p["binding"]["grant_id"]).values(enabled=False))
            return httpx.Response(200, json={"access_token": "synthetic-access", "refresh_token": "synthetic-refresh",
                "token_type": "Bearer", "expires_in": 3600, "scope": " ".join(oauth.SCOPES)})
        assert request.url.path.endswith("/profile")
        return httpx.Response(200, json={"emailAddress": p["provider"].account})

    owner = OwnerGmail(p["vault"], cid, p["owner"].token, p["bid"], transport=httpx.MockTransport(transport))
    url = await owner.begin({"installed": {"client_id": "synthetic.apps.googleusercontent.com",
        "client_secret": "synthetic-secret", "token_uri": oauth.TOKEN_URL,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth"}}, "http://127.0.0.1:15555/oauth/callback")
    callback = "http://127.0.0.1:15555/oauth/callback?" + urlencode({
        "state": parse_qs(urlsplit(url).query)["state"][0], "code": "synthetic-code"})
    if revoke_before_adoption:
        with pytest.raises(ControlError):
            await owner.complete(callback)
        record = p["vault"].read(cid, p["binding"])
        assert record["status"] == "pending" and record["flow"]["consumed"] is True and "tokens" not in record
    else:
        assert (await owner.complete(callback))["status"] == "active"
        with pytest.raises(GmailError, match="not_pending"):
            await owner.complete(callback)
    assert len(exchanges) == 1


async def test_durable_single_send_known_reply_replay_and_existing_owner_ui_read(gmail_owner):
    p = gmail_owner
    request_id = str(uuid4())
    value = await p["owner"].prepare_self_test(request_id, "Gmail integration test", "Synthetic owner self-test. Not an order: 2 tubs.")
    same = await p["owner"].prepare_self_test(request_id, "Gmail integration test", "Synthetic owner self-test. Not an order: 2 tubs.")
    assert value["id"] == same["id"] and value["case_id"] == same["case_id"]
    with pytest.raises(ControlError):
        await p["owner"].prepare_self_test(request_id, "Gmail integration test", "Changed content must not replay.")
    results = await asyncio.gather(p["owner"].send_self_test(value["id"]), p["owner"].send_self_test(value["id"]))
    assert len(p["provider"].posts) == 1
    assert "accepted_by_gmail" in {result["state"] for result in results}
    assert (await p["owner"].send_self_test(value["id"]))["state"] == "accepted_by_gmail"
    received = await p["owner"].sync_self_test(value["id"])
    replay = await p["owner"].sync_self_test(value["id"])
    assert len(received["inbound_mail_ids"]) == 1 and replay == received
    async with db.transaction(p["bid"], p["environment"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage).where(MailMessage.case_id == value["case_id"])) == 2
        original = await tx.get(MailMessage, value["id"])
        assert original.payload["sender"] == p["provider"].account and original.payload["synthetic"] is True
        assert original.payload["gmail_result"]["delivery_confirmed"] is False
    data = await p["client"].get(f"/operator/v2/businesses/{p['bid']}/mail/{received['inbound_mail_ids'][0]}", headers=p["auth"])
    assert data.status_code == 200, data.text
    assert "2 Badezuber" in data.json()["data"]["body"] and data.json()["data"]["translation"]["status"] in {"missing", "unavailable"}
    assert len(p["provider"].posts) == 1


@pytest.mark.parametrize("mode,state", [("timeout", "delivery_unknown"), ("reject", "rejected")])
async def test_unknown_and_rejected_are_not_retried(gmail_owner, mode, state):
    p = gmail_owner
    value = await prepared(p)
    p["provider"].mode = mode
    assert (await p["owner"].send_self_test(value["id"]))["state"] == state
    assert (await p["owner"].send_self_test(value["id"]))["state"] == state
    assert len(p["provider"].posts) == 1


async def test_foreign_actor_and_revoked_grant_cannot_use_connection(gmail_owner):
    p = gmail_owner
    value = await prepared(p)
    _, foreign, _ = await verified(p)
    other = OwnerGmail(p["vault"], p["owner"].id, foreign["Authorization"][7:], p["bid"], transport=httpx.MockTransport(p["provider"]))
    with pytest.raises(ControlError):
        await other.send_self_test(value["id"])
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == p["bid"],
            BusinessGrant.environment_id == p["environment"]).values(enabled=False))
    with pytest.raises(ControlError):
        await p["owner"].send_self_test(value["id"])
    assert not p["provider"].posts


async def test_foreign_reply_is_not_imported(gmail_owner):
    p = gmail_owner
    value = await prepared(p)
    await p["owner"].send_self_test(value["id"])
    p["provider"].mode = "foreign-reply"
    result = await p["owner"].sync_self_test(value["id"])
    assert result["inbound_mail_ids"] == []
    async with db.transaction(p["bid"], p["environment"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(MailMessage).where(MailMessage.case_id == value["case_id"])) == 1
