"""Prepared hosted transport against real nonce/session persistence; no public tunnel."""
import asyncio
import json
import secrets
import time
from uuid import uuid4

import httpx
import pytest
from test_control_portfolio import login
from test_control_portfolio import pilot as portfolio_pilot

from pinet_core.config import settings
from pinet_core.control.bridge import signature
from pinet_core.control_api import app as control_app

pilot = portfolio_pilot


@pytest.fixture
async def hosted(pilot, monkeypatch):
    headers = await login(pilot)
    cfg = settings()
    monkeypatch.setattr(cfg, "control_mode", "hosted")
    monkeypatch.setattr(cfg, "control_bridge_secret", secrets.token_hex(32))
    monkeypatch.setattr(cfg, "control_owner_user_id", pilot["receipts"][0]["user_id"])
    pilot["client"].base_url = "http://control.pinet.internal:8854"
    return {**pilot, "headers": headers}


def signed(method, target, body=b"", nonce=None, timestamp=None):
    nonce, timestamp = nonce or str(uuid4()), timestamp or str(int(time.time()))
    return {"X-Pinet-Control-Timestamp": timestamp, "X-Pinet-Control-Nonce": nonce,
            "X-Pinet-Control-Signature": signature(settings().control_bridge_secret, timestamp, nonce,
                                                   method, target, body)}


async def test_signed_login_query_and_logout_revoke_current_actor(hosted):
    value = hosted["inputs"][0]
    body = json.dumps({k: value[k] for k in ("username", "password")}, separators=(",", ":")).encode()
    path = "/operator/v2/auth/login"
    result = await hosted["client"].post(path, content=body,
                headers={**signed("POST", path, body), "content-type": "application/json"})
    assert result.status_code == 200
    headers = {"Authorization": "Bearer " + result.json()["access_token"]}
    path = f"/operator/v2/portfolios/{hosted['receipts'][0]['portfolio_id']}/businesses?limit=1"
    result = await hosted["client"].get(path, headers={**headers, **signed("GET", path)})
    assert result.status_code == 200 and len(result.json()["data"]["items"]) == 1
    path = "/operator/v2/auth/logout"
    assert (await hosted["client"].post(path, headers={**headers, **signed("POST", path)})).status_code == 204
    path = "/operator/v2/me"
    assert (await hosted["client"].get(path, headers={**headers, **signed("GET", path)})).status_code == 401


async def test_nonce_replay_concurrent_is_durable_and_actor_separate(hosted):
    path = "/operator/v2/me"
    headers = {**hosted["headers"], **signed("GET", path)}
    a, b = await asyncio.gather(hosted["client"].get(path, headers=headers), hosted["client"].get(path, headers=headers))
    assert sorted([a.status_code, b.status_code]) == [200, 409]
    from pinet_core.db import db
    await db.engine.dispose()
    assert (await hosted["client"].get(path, headers=headers)).status_code == 409
    assert (await hosted["client"].get(path, headers=signed("GET", path))).status_code == 401


async def test_bad_signature_query_body_clock_and_origin_fail_closed(hosted):
    path = "/operator/v2/me"
    for headers in ({}, signed("GET", path, timestamp=str(int(time.time())-46)),
                    signed("GET", path, timestamp=str(int(time.time())+46)),
                    {**signed("GET", path), "X-Pinet-Control-Signature": "0"*64},
                    {**signed("GET", path), "Origin": "https://verslomatika.lt"},
                    {**signed("GET", path), "X-Forwarded-Host": "control.pinet.internal"}):
        result = await hosted["client"].get(path, headers={**hosted["headers"], **headers})
        assert result.status_code == 403
        assert set(result.json()) == {"code", "message", "request_id"}
    assert (await hosted["client"].get(path + "?limit=1", headers={**hosted["headers"],
                                    **signed("GET", path)})).status_code == 403
    path = "/operator/v2/auth/login"
    assert (await hosted["client"].post(path, content=b"{} ", headers={**signed("POST", path, b"{}"),
                                               "content-type": "application/json"})).status_code == 403


async def test_hosted_owner_allowlist_and_backend_host(hosted):
    value = hosted["inputs"][1]
    body = json.dumps({k: value[k] for k in ("username", "password")}).encode()
    path = "/operator/v2/auth/login"
    assert (await hosted["client"].post(path, content=body,
        headers={**signed("POST", path, body), "content-type": "application/json"})).status_code == 401
    path = "/operator/v2/me"
    hosted["client"].base_url = "http://127.0.0.1:8854"
    assert (await hosted["client"].get(path, headers={**hosted["headers"], **signed("GET", path)})).status_code == 403


async def test_control_only_app_has_no_legacy_or_documentation_surfaces(hosted):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=control_app),
                                base_url="http://control.pinet.internal") as client:
        for path in ("/docs", "/openapi.json", "/operator/mail-ui", "/operator/sites/greitossvetaines",
                     "/edge/sites/greitossvetaines/start", "/health"):
            assert (await client.get(path)).status_code == 404
        path = "/operator/v2/me"
        assert (await client.get(path, headers={**hosted["headers"], **signed("GET", path)})).status_code == 200
