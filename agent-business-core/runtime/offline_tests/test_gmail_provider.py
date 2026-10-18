"""No external network; real MIME, PKCE, encrypted vault and bounded HTTP shapes."""
import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta
from email import policy
from email.parser import BytesParser
from urllib.parse import parse_qs, urlencode, urlsplit
from uuid import uuid4

import httpx
import pytest
from cryptography.fernet import Fernet

from pinet_core.mail_provider import oauth
from pinet_core.mail_provider.gmail import API, GmailClient, GmailError, raw_message
from pinet_core.mail_provider.vault import Vault


def payload():
    return {"sender": "owner@example.com", "recipient": "owner@example.com", "subject": "2 tubs",
            "body": "Not confirmed: 2 tubs. Ąčęėįšųūž", "sender_name": "Synthetic test"}


def test_mime_retains_exact_canonical_identity_and_plain_text():
    original = payload()
    raw = raw_message(original, "<own@example.test>", datetime.now(UTC))
    parsed = BytesParser(policy=policy.default).parsebytes(raw)
    assert str(parsed["Message-ID"]) == "<own@example.test>"
    assert str(parsed["From"]) == original["sender"] and str(parsed["To"]) == original["recipient"]
    assert parsed.get_body(preferencelist=("plain",)).get_content().strip() == original["body"]
    assert "Ąčęėįšųūž" in parsed.get_body(preferencelist=("html",)).get_content()
    assert "in_reply_to" not in original


@pytest.mark.parametrize("change", [{"subject": "subject\r\nBcc: other@example.test"},
    {"recipient": "other@example.test\r\nBcc: evil@example.test"}, {"body": "x"*16001},
    {"attachments": ["unreviewed"]}, {"in_reply_to": "<own@example.test>", "references": []}])
def test_unreviewed_mime_mutations_are_rejected_before_io(change):
    with pytest.raises(GmailError):
        raw_message({**payload(), **change}, "<own@example.test>", datetime.now(UTC))


def test_pkce_and_callback_are_bound_one_use_and_expire():
    binding = {"business_id": str(uuid4()), "user_id": str(uuid4())}
    flow, url = oauth.new_flow("test.apps.googleusercontent.com", "http://127.0.0.1:15555/oauth/callback", binding)
    values = parse_qs(urlsplit(url).query)
    assert values["scope"][0].split() == list(oauth.SCOPES)
    assert values["code_challenge_method"] == ["S256"]
    assert values["code_challenge"] == [base64.urlsafe_b64encode(hashlib.sha256(flow["verifier"].encode()).digest()).decode().rstrip("=")]
    callback = flow["redirect_uri"] + "?" + urlencode({"state": flow["state"], "iss": oauth.ISSUER, "code": "synthetic-code"})
    for wrong in (callback.replace("15555", "15556"), callback+"&state=another", callback.replace(flow["state"], "bad")):
        with pytest.raises(GmailError):
            oauth.consume_callback(flow, wrong, binding)
        assert not flow["consumed"]
    with pytest.raises(GmailError):
        oauth.consume_callback(flow, callback, {"business_id": "foreign"})
    assert oauth.consume_callback(flow, callback, binding) == "synthetic-code"
    with pytest.raises(GmailError):
        oauth.consume_callback(flow, callback, binding)
    flow["consumed"] = False
    with pytest.raises(GmailError):
        oauth.consume_callback(flow, callback, binding, now=datetime.now(UTC)+timedelta(hours=1))


@pytest.mark.parametrize("redirect", ["https://evil.test/oauth/callback", "http://localhost:15555/oauth/callback",
    "http://127.0.0.1:15555/other", "http://user@127.0.0.1:15555/oauth/callback"])
def test_oauth_uses_only_exact_loopback_callback(redirect):
    with pytest.raises(GmailError):
        oauth.new_flow("test.apps.googleusercontent.com", redirect, {})


def test_vault_encryption_exact_binding_busy_and_tamper(tmp_path):
    key, cid = Fernet.generate_key(), str(uuid4())
    vault, binding = Vault(tmp_path, key), {"business_id": str(uuid4()), "user_id": str(uuid4())}
    with vault.locked(cid):
        vault.write(cid, binding, {"access_token": "PRIVATE_TOKEN_CANARY", "refresh_token": "PRIVATE_REFRESH_CANARY"}, create=True)
        with pytest.raises(GmailError, match="busy"):
            with vault.locked(cid):
                pass
    raw = vault.path(cid).read_bytes()
    assert b"PRIVATE_" not in raw and b"business_id" not in raw
    assert vault.read(cid, binding)["access_token"] == "PRIVATE_TOKEN_CANARY"
    with pytest.raises(GmailError, match="owned_vault_lock"):
        vault.write(cid, binding, {"status": "changed_without_lock"})
    with vault.locked(cid):
        with pytest.raises(GmailError):
            vault.write(cid, {**binding, "user_id": "foreign"}, {"status": "foreign_overwrite"})
    assert vault.read(cid, binding)["access_token"] == "PRIVATE_TOKEN_CANARY"
    with pytest.raises(GmailError):
        vault.read(cid, {**binding, "user_id": "foreign"})
    with pytest.raises(GmailError):
        Vault(tmp_path, Fernet.generate_key()).read(cid, binding)
    vault.path(cid).write_bytes(raw[:-5] + b"broken")
    with pytest.raises(GmailError):
        vault.read(cid, binding)


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["accept", "timeout", "server", "reject", "bad-json", "bad-id", "huge"])
async def test_send_outcomes_are_truthful_single_attempt_without_secret_errors(mode):
    calls = []
    def handle(request):
        calls.append(request)
        assert str(request.url) == API + "/messages/send"
        assert json.loads(request.content)["raw"] == base64.urlsafe_b64encode(b"reviewed-mail").decode()
        if mode == "timeout":
            raise httpx.ReadTimeout("PRIVATE_CREDENTIAL_CANARY", request=request)
        if mode == "server":
            return httpx.Response(503, text="PRIVATE_PROVIDER_CANARY")
        if mode == "reject":
            return httpx.Response(401, text="PRIVATE_PROVIDER_CANARY")
        if mode == "bad-json":
            return httpx.Response(200, text="PRIVATE_PROVIDER_CANARY")
        if mode == "bad-id":
            return httpx.Response(200, json={"id": "../bad", "threadId": "thread1"})
        if mode == "huge":
            return httpx.Response(200, content=b"x"*262145)
        return httpx.Response(200, json={"id": "msg1", "threadId": "thread1"})
    async with GmailClient("PRIVATE_CREDENTIAL_CANARY", transport=httpx.MockTransport(handle)) as client:
        if mode == "accept":
            result = await client.send(b"reviewed-mail")
            assert result.message_id == "msg1" and result.delivery_confirmed is False
        else:
            with pytest.raises(GmailError) as error:
                await client.send(b"reviewed-mail")
            assert error.value.outcome == ("rejected" if mode == "reject" else "unknown")
            assert "PRIVATE_" not in str(error.value)
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_known_message_and_thread_bounds_never_search_whole_mailbox():
    calls = []
    def handle(request):
        calls.append(request)
        if request.url.path.endswith("/messages"):
            assert request.url.params["q"] == "rfc822msgid:<known@example.test>"
            return httpx.Response(200, json={"messages": [{"id": "msg1", "threadId": "thread1"}]})
        if "/threads/" in request.url.path:
            return httpx.Response(200, json={"id": "thread1", "messages": [{"id": "msg1", "threadId": "thread1"}]})
        return httpx.Response(200, json={"id": "msg1", "raw": base64.urlsafe_b64encode(b"known-mail").decode()})
    async with GmailClient("test-token", transport=httpx.MockTransport(handle)) as client:
        assert await client.find_message("<known@example.test>") == {"id": "msg1", "thread_id": "thread1"}
        assert await client.thread_ids("thread1") == ["msg1"]
        assert await client.raw("msg1") == b"known-mail"
        for invalid in ("../bad", "https://evil.test", "x"*129):
            with pytest.raises(GmailError):
                await client.raw(invalid)
    assert len(calls) == 3


@pytest.mark.asyncio
async def test_token_endpoint_and_scope_cannot_be_broadened_or_retried():
    calls = []
    def handle(request):
        calls.append(request)
        assert str(request.url) == oauth.TOKEN_URL
        return httpx.Response(200, json={"access_token": "test-access", "refresh_token": "test-refresh",
            "expires_in": 3600, "token_type": "Bearer", "scope": " ".join(oauth.SCOPES) + " extra"})
    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        with pytest.raises(GmailError):
            await oauth.token_request(client, {"grant_type": "authorization_code"})
    assert len(calls) == 1
