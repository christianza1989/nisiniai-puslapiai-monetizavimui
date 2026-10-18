"""Loopback-only HTTP evidence; no Google/SMTP/model calls or real credentials."""
import asyncio
from urllib.parse import urlsplit

import pytest

from pinet_core.mail_provider.callback import callback_target, listener
from pinet_core.mail_provider.gmail import GmailError


@pytest.mark.parametrize("raw_request", [
    b"POST /oauth/callback?code=private HTTP/1.1\r\nHost: 127.0.0.1:15555\r\n\r\n",
    b"GET http://evil.example/oauth/callback HTTP/1.1\r\nHost: 127.0.0.1:15555\r\n\r\n",
    b"GET /oauth/callback HTTP/1.1\r\nHost: evil.example\r\n\r\n",
    b"GET /oauth/callback HTTP/1.1\r\nHost: 127.0.0.1:15555\r\nHost: 127.0.0.1:15555\r\n\r\n",
    b"GET /oauth/callback HTTP/1.1\r\nHost: 127.0.0.1:15555\r\nContent-Length: 5\r\n\r\n",
    b"GET /oauth/callback HTTP/1.1\r\nHost: 127.0.0.1:15555\r\nTransfer-Encoding: chunked\r\n\r\n",
    b"GET /other HTTP/1.1\r\nHost: 127.0.0.1:15555\r\n\r\n",
])
def test_callback_refuses_wrong_host_method_path_and_request_smuggling(raw_request):
    with pytest.raises(GmailError, match="callback_invalid"):
        callback_target(raw_request, 15555)


@pytest.mark.asyncio
async def test_real_loopback_wrong_state_then_single_callback_never_reflects_secret():
    calls = []

    async def complete(url):
        calls.append(url)
        if "state=correct" not in url:
            raise GmailError("gmail_oauth_state_invalid")
        return {"status": "active"}

    async with listener(complete) as (redirect, result):
        target = urlsplit(redirect)
        assert target.hostname == "127.0.0.1" and target.port

        async def get(query):
            reader, writer = await asyncio.open_connection("127.0.0.1", target.port)
            writer.write((f"GET /oauth/callback?{query} HTTP/1.1\r\nHost: {target.netloc}\r\n\r\n").encode())
            await writer.drain()
            response = await asyncio.wait_for(reader.read(), 3)
            writer.close()
            await writer.wait_closed()
            return response

        bad = await get("state=wrong&code=PRIVATE_CODE_CANARY")
        assert bad.startswith(b"HTTP/1.1 400") and not result.done()
        good = await get("state=correct&code=PRIVATE_CODE_CANARY")
        assert good.startswith(b"HTTP/1.1 200") and await result == {"status": "active"}
        repeated = await get("state=correct&code=PRIVATE_CODE_CANARY")
        assert repeated.startswith(b"HTTP/1.1 400")
        assert len(calls) == 2
        assert all(b"PRIVATE_CODE_CANARY" not in raw for raw in (bad, good, repeated))
        assert b"Referrer-Policy: no-referrer" in good
