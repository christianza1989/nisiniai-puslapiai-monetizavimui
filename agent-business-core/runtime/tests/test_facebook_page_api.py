import json
import logging
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException
from PIL import Image
from test_facebook import OTHER, SITE, base, enable, headers
from test_facebook import fb_client as shared_fb_client

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.facebook import browser_service as browser
from pinet_core.facebook import page_api_graph as graph
from pinet_core.facebook import page_api_service as api
from pinet_core.facebook import service as fb
from pinet_core.models import utcnow
from pinet_core.service import business

PAGE = "123456789012345"
APP = "987654321098765"
POST = PAGE + "_444555666"
TOKEN = "synthetic-page-token-not-a-credential"
APP_TOKEN = "synthetic-app-token-not-a-credential"


@pytest.fixture
async def fb_client(client):
    async for value in shared_fb_client.__wrapped__(client):
        yield value


class MetaFixture:
    def __init__(self):
        self.calls, self.writes = [], []
        self.created = {}
        self.comment_ids = {POST: ["444555666_777888"]}
        self.mode = "ok"
        self.actor = PAGE
        self.scopes = sorted(set.union(*graph.SCOPES.values()))
        self.before_write = None
        self.debug = {}
        self.post_actor = PAGE

    async def handle(self, request):
        self.calls.append(request)
        path = request.url.path.removeprefix("/v26.0/")
        assert request.url.host == "graph.facebook.com"
        assert request.headers["authorization"] == "Bearer " + (APP_TOKEN if path == "debug_token" else TOKEN)
        if path == "debug_token":
            assert request.url.params["input_token"] == TOKEN
            return httpx.Response(200, json={"data": {"is_valid": True, "type": "PAGE", "app_id": APP,
                "scopes": self.scopes, "expires_at": 0, **self.debug}})
        if path == "me":
            return httpx.Response(200, json={"id": self.actor, "name": "Synthetic Page"})
        if request.method == "POST":
            self.writes.append(request)
            if self.before_write:
                await self.before_write()
            if self.mode == "timeout":
                raise httpx.ReadTimeout("synthetic unknown outcome", request=request)
            if self.mode == "permission":
                return httpx.Response(403, json={"error": {"code": 200, "message": TOKEN}})
            if self.mode == "server":
                return httpx.Response(500, json={"error": {"code": 2, "message": TOKEN}})
            if self.mode == "malformed":
                return httpx.Response(200, json={"success": True})
            if path.endswith("/photos"):
                ident, node = "101010101", POST
                body = (await request.aread()).decode("latin1")
                assert 'name="source"; filename="image.png"' in body
                text = self.photo_body
                result = {"id": ident, "post_id": node}
            else:
                from urllib.parse import parse_qs
                text = parse_qs((await request.aread()).decode())["message"][0]
                ident = POST if path.endswith("/feed") else "444555666_999000"
                node = ident
                result = {"id": ident}
                if path.endswith("/comments"):
                    self.comment_ids.setdefault(path.removesuffix("/comments"), []).append(ident)
            self.created[node] = {"id": node, "from": {"id": PAGE}, "message": text}
            return httpx.Response(200, json=result)
        if path.endswith("/comments"):
            return httpx.Response(200, json={"data": [{"id": x} for x in self.comment_ids.get(
                path.removesuffix("/comments"), [])]})
        if path in self.created:
            if self.mode == "confirm_failure":
                return httpx.Response(403, json={"error": {"code": 200}})
            return httpx.Response(200, json=self.created[path])
        if path == POST:
            return httpx.Response(200, json={"id": POST, "from": {"id": self.post_actor}})
        return httpx.Response(404, json={"error": {"code": 100}})


@pytest.fixture
def meta(fb_client, monkeypatch):
    value = MetaFixture()
    path = fb.ROOT / "agent-business-core/runtime/artifacts" / ("page-api-test-" + str(uuid4()) + ".json")
    cfg = settings()
    data = [{"key": "owned-page", "site_id": site, "environment": cfg.environment,
             "account_key": "shared-test-account", "page_id": PAGE, "app_id": APP,
             "page_token": TOKEN, "app_token": APP_TOKEN} for site in (SITE, OTHER)]
    path.write_text(json.dumps({"credentials": data}), encoding="utf-8")
    monkeypatch.setattr(cfg, "facebook_page_credentials_path", str(path))
    monkeypatch.setattr(graph, "http_transport", lambda: httpx.MockTransport(value.handle))
    yield value
    path.unlink()


def endpoint(site=SITE, internal=False):
    return (f"/internal/sites/{site}/facebook" if internal else base(site)) + "/page-api"


async def setup(client, site=SITE, limit=5):
    response = await client.post(endpoint(site) + "/verify", headers=headers(),
                                 json={"credential_key": "owned-page"})
    assert response.status_code == 200, response.text
    await enable(client, site)
    response = await client.put(endpoint(site) + "/policy", headers=headers(), json={
        "base_revision": 0, "policy": {"enabled": True, "daily_write_limit": limit},
        "reason": "Only synthetic Graph transport acceptance"})
    assert response.status_code == 200, response.text


async def queue(client, site=SITE, **changes):
    return await client.post(endpoint(site) + "/jobs", headers=headers(), json={
        "key": "page-api-one", "credential_key": "owned-page", "body": "Tik sintetinis API bandymas. 👋",
        "review_note": "Reviewed synthetic text only; no actual Facebook publishing.",
        "purpose": "personal", **changes})


async def run(client, site=SITE):
    return await client.post(endpoint(site, True) + "/run-once", headers=headers(True),
                             json={"owner": "api-fixture-worker"})


async def test_first_entire_page_api_path(fb_client, meta):
    await setup(fb_client)
    first = await queue(fb_client)
    assert first.status_code == 200, first.text
    assert (await queue(fb_client)).json()["id"] == first.json()["id"]
    result = await run(fb_client)
    assert result.status_code == 200, result.text
    assert result.json()["state"] == "published"
    assert result.json()["receipt"]["provider_id"] == POST
    assert result.json()["external_sending"] is False
    assert "task_token" not in result.json()
    assert len(meta.writes) == 1
    assert (await run(fb_client)).json()["state"] == "idle"
    status = (await fb_client.get(endpoint(), headers=headers())).json()
    assert status["jobs"][0]["state"] == "published"
    assert TOKEN not in str(status) and APP_TOKEN not in str(status)
    assert "task_token" not in status["jobs"][0]


@pytest.fixture
def image():
    path = fb.ROOT / "agent-business-core/runtime/artifacts" / ("page-image-test-" + str(uuid4()) + ".png")
    Image.new("RGB", (80, 80), (40, 80, 110)).save(path)
    yield path
    path.unlink()


async def add_image(client, image):
    response = await client.post(endpoint() + "/media", headers=headers(), json={"key": "api-image-one",
        "path": str(image), "alt": "Synthetic test square", "provenance": "Generated local fixture, no personal image"})
    assert response.status_code == 200, response.text


@pytest.mark.parametrize("action", ["photo", "comment", "reply"])
async def test_photo_comment_and_reply(fb_client, meta, image, action):
    await setup(fb_client)
    args = {"action": action}
    if action == "photo":
        await add_image(fb_client, image)
        args["media_key"] = "api-image-one"
        meta.photo_body = "Tik sintetinis API bandymas. 👋"
    else:
        args["parent_post_id"] = POST
        if action == "reply":
            args["parent_comment_id"] = "444555666_777888"
    first = await queue(fb_client, **args)
    assert first.status_code == 200, first.text
    result = await run(fb_client)
    assert result.status_code == 200, result.text
    assert result.json()["state"] == "published"
    assert len(meta.writes) == 1 and result.json()["receipt"]["confirmed_at"]
    assert result.json()["receipt"]["provider_post_id"] == POST
    if action == "photo":
        assert result.json()["receipt"]["provider_id"] == "101010101"
    else:
        parent = "444555666_777888" if action == "reply" else POST
        assert meta.writes[0].url.path == "/v26.0/" + parent + "/comments"


async def test_defaultoff_auth_tenant_and_input_bound(fb_client, meta):
    assert (await fb_client.get(endpoint())).status_code == 401
    assert (await queue(fb_client)).status_code == 503
    assert (await run(fb_client)).status_code == 503
    assert not meta.calls
    await setup(fb_client)
    first = (await queue(fb_client)).json()
    assert (await queue(fb_client, body="Changed immutable body")).status_code == 409
    assert (await fb_client.post(endpoint(OTHER) + f'/jobs/{first["id"]}/check', headers=headers())).status_code == 404
    assert (await fb_client.post(endpoint() + "/jobs", headers=headers(), content=b"x" * 20001)).status_code == 413
    assert (await fb_client.post(endpoint(internal=True) + "/run-once", json={"owner": "synthetic-worker"})).status_code == 401
    assert not meta.writes


@pytest.mark.parametrize("mode,expected", [("timeout", "uncertain"), ("server", "uncertain"),
                                          ("malformed", "uncertain"), ("permission", "blocked")])
async def test_no_retry_and_no_secret_error_echo(fb_client, meta, mode, expected):
    await setup(fb_client)
    await queue(fb_client)
    meta.mode = mode
    result = await run(fb_client)
    assert result.status_code == 200, result.text
    assert result.json()["state"] == expected
    assert TOKEN not in result.text and APP_TOKEN not in result.text
    assert (await run(fb_client)).json()["state"] == "idle"
    assert len(meta.writes) == 1
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        lease = await browser.account_row(tx, "shared-test-account")
        if expected == "uncertain":
            assert lease.owner.startswith("page-api-uncertain:") and lease.lease_until is None
            with pytest.raises(HTTPException, match="requires_check_only"):
                await fb.claim_account(tx, "shared-test-account", "unrelated-owner")
        else:
            assert lease.owner is None


async def test_known_id_check_only_after_failed_confirmation(fb_client, meta):
    await setup(fb_client)
    first = (await queue(fb_client)).json()
    meta.mode = "confirm_failure"
    result = await run(fb_client)
    assert result.json()["state"] == "accepted"
    assert result.json()["receipt"]["provider_id"] == POST
    assert (await run(fb_client)).json()["state"] == "idle"
    # Checks remain possible when publishing is paused.
    await enable(fb_client, enabled=False)
    meta.mode = "ok"
    result = await fb_client.post(endpoint() + f'/jobs/{first["id"]}/check', headers=headers())
    assert result.status_code == 200, result.text
    assert result.json()["state"] == "published" and len(meta.writes) == 1
    assert (await fb_client.post(endpoint() + f'/jobs/{first["id"]}/check', headers=headers())).status_code == 200


async def test_comment_foreign_author_and_missing_parent_are_blocked(fb_client, meta):
    await setup(fb_client)
    assert (await queue(fb_client, action="comment", parent_post_id="888888888_111")).status_code == 422
    assert (await queue(fb_client, action="reply", parent_post_id=POST)).status_code == 422
    await queue(fb_client, action="comment", parent_post_id=POST)
    meta.post_actor = "999999999"
    assert (await run(fb_client)).json()["reason"] == "facebook_comment_parent_not_owned_page"
    await queue(fb_client, key="reply-two", action="reply", parent_post_id=POST, parent_comment_id="444555666_222333")
    meta.post_actor = PAGE
    assert (await run(fb_client)).json()["reason"] == "facebook_reply_parent_not_in_owned_post"
    assert not meta.writes


@pytest.mark.parametrize("debug", [
    {"is_valid": False}, {"type": "USER"}, {"app_id": "111111111"},
    {"expires_at": 1}, {"data_access_expires_at": 1},
    {"granular_scopes": [{"scope": x, "target_ids": ["111111111"]} for x in graph.SCOPES["post"]
                        | graph.SCOPES["comment"]]}])
async def test_token_identity_expiry_and_granular_page_scope(fb_client, meta, debug):
    meta.debug = debug
    response = await fb_client.post(endpoint() + "/verify", headers=headers(), json={"credential_key": "owned-page"})
    assert response.status_code == 403, response.text
    assert TOKEN not in response.text and not meta.writes


async def test_verified_capabilities_and_wrong_actor(fb_client, meta):
    meta.scopes = sorted(graph.SCOPES["comment"])
    await setup(fb_client)
    assert (await queue(fb_client)).status_code == 403
    await queue(fb_client, action="comment", parent_post_id=POST)
    meta.actor = "111111111"
    assert (await run(fb_client)).json()["reason"] == "facebook_page_actor_mismatch"
    assert not meta.writes


async def test_credential_rotation_and_missing_config_fail_closed(fb_client, meta):
    await setup(fb_client)
    await queue(fb_client)
    path = settings().facebook_page_credentials_path
    from pathlib import Path
    value = json.loads(Path(path).read_text())
    value["credentials"][0]["page_token"] = "new-synthetic-token"
    Path(path).write_text(json.dumps(value))
    assert (await run(fb_client)).json()["reason"] == "facebook_page_credentials_or_scopes_changed"
    settings().facebook_page_credentials_path = ""
    response = await fb_client.post(endpoint() + "/verify", headers=headers(), json={"credential_key": "owned-page"})
    assert response.status_code == 503 and "new-synthetic-token" not in response.text
    assert not meta.writes


async def test_media_mutation_prevents_upload(fb_client, meta, image):
    await setup(fb_client)
    await add_image(fb_client, image)
    await queue(fb_client, action="photo", media_key="api-image-one")
    Image.new("RGB", (80, 80), (220, 180, 140)).save(image)
    result = await run(fb_client)
    assert result.json()["state"] == "blocked"
    assert result.json()["reason"] == "facebook_media_changed_requires_new_review"
    assert not meta.writes


@pytest.mark.parametrize("master", [True, False])
async def test_pause_before_send_cancels_claim(master, fb_client, meta):
    await setup(fb_client)
    await queue(fb_client)
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        packet = await api.claim(tx, item, "synthetic-worker")
    if master:
        await enable(fb_client, paused=True)
    else:
        response = await fb_client.put(endpoint() + "/policy", headers=headers(), json={
            "base_revision": 1, "policy": {"enabled": True, "paused": True}, "reason": "Pause before sender"})
        assert response.status_code == 200
    assert await api.prepare(item, packet) is None
    assert (await fb_client.get(endpoint(), headers=headers())).json()["jobs"][0]["state"] == "cancelled"
    assert not meta.writes


async def test_pause_during_inflight_keeps_real_receipt(fb_client, meta):
    await setup(fb_client)
    await queue(fb_client)

    async def pause():
        await enable(fb_client, paused=True)
        status = (await fb_client.get(endpoint(), headers=headers())).json()
        assert status["jobs"][0]["state"] == "uncertain"

    meta.before_write = pause
    result = await run(fb_client)
    assert result.json()["state"] == "published" and len(meta.writes) == 1
    assert result.json()["receipt"]["provider_id"] == POST


@pytest.mark.parametrize("sending", [False, True])
async def test_expired_worker_does_not_steal_account_or_resubmit(fb_client, meta, sending):
    await setup(fb_client)
    await queue(fb_client)
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        packet = await api.claim(tx, item, "synthetic-worker")
        job = await fb.by_id(tx, "page_api_job", packet["job_id"])
        if sending:
            job.state = "sending"
        job.payload = {**job.payload, "lease_until": (utcnow() - timedelta(seconds=1)).isoformat()}
        lease = await browser.account_row(tx, "shared-test-account")
        lease.lease_until = utcnow() - timedelta(seconds=1)
        with pytest.raises(HTTPException, match="requires_check_only"):
            await fb.claim_account(tx, "shared-test-account", "different-worker")
    status = (await fb_client.get(endpoint(), headers=headers())).json()
    job = status["jobs"][0]
    assert job["state"] == ("uncertain" if sending else "blocked")
    if sending:
        result = await fb_client.post(endpoint() + f'/jobs/{job["id"]}/resolve', headers=headers(), json={
            "base_revision": job["revision"], "outcome": "not_published",
            "evidence": "Synthetic check proved no write had left this isolated mock environment."})
        assert result.status_code == 200 and result.json()["state"] == "not_published"
    assert (await run(fb_client)).json()["state"] == "idle" and not meta.writes


async def test_daily_limit_cross_transport_account_and_fixture_scope(fb_client, meta, monkeypatch):
    await setup(fb_client, limit=1)
    await queue(fb_client)
    await run(fb_client)
    await queue(fb_client, key="second-publication")
    assert (await run(fb_client)).json()["state"] == "limited"
    assert len(meta.writes) == 1
    monkeypatch.setattr(settings(), "allow_simulation", False)
    assert (await queue(fb_client, key="third-publication")).status_code == 403
    with pytest.raises(HTTPException, match="requires_test_environment"):
        graph.Graph(graph.credentials(SITE, "owned-page"))


async def test_http_log_redacts_debug_token(caplog, fb_client, meta):
    caplog.set_level(logging.INFO, logger="httpx")
    await setup(fb_client)
    assert TOKEN not in caplog.text and APP_TOKEN not in caplog.text
    assert "credentials redacted" in caplog.text


async def test_api_uncertainty_blocks_desktop_other_site(fb_client, meta):
    from test_facebook_browser import claim as desktop_claim
    from test_facebook_browser import queue as desktop_queue
    from test_facebook_browser import setup as desktop_setup
    await setup(fb_client)
    await queue(fb_client)
    meta.mode = "timeout"
    assert (await run(fb_client)).json()["state"] == "uncertain"
    await desktop_setup(fb_client, OTHER)
    await desktop_queue(fb_client, site=OTHER)
    result = await desktop_claim(fb_client, OTHER)
    assert result.json()["state"] == "account_blocked"
    assert len(meta.writes) == 1


async def test_browser_claim_blocks_api_even_after_expiry(fb_client, meta):
    from test_facebook_browser import claim as desktop_claim
    from test_facebook_browser import queue as desktop_queue
    from test_facebook_browser import setup as desktop_setup
    await setup(fb_client)
    await queue(fb_client)
    await desktop_setup(fb_client, OTHER)
    await desktop_queue(fb_client, site=OTHER)
    assert (await desktop_claim(fb_client, OTHER)).json()["state"] == "claimed"
    item = await business(OTHER)
    async with db.transaction(item.id, settings().environment) as tx:
        lease = await browser.account_row(tx, "shared-test-account")
        lease.lease_until = utcnow() - timedelta(seconds=1)
    assert (await run(fb_client)).json()["state"] == "account_blocked"
    assert not meta.writes


async def test_browser_limit_includes_completed_api_attempts(fb_client, meta):
    from test_facebook_browser import claim as desktop_claim
    from test_facebook_browser import endpoint as desktop_endpoint
    from test_facebook_browser import queue as desktop_queue
    from test_facebook_browser import setup as desktop_setup
    await setup(fb_client)
    await queue(fb_client)
    assert (await run(fb_client)).json()["state"] == "published"
    await desktop_setup(fb_client)
    response = await fb_client.put(desktop_endpoint() + "/policy", headers=headers(), json={
        "base_revision": 1, "policy": {"enabled": True, "daily_post_limit": 1},
        "reason": "One combined publication allowance across both transports"})
    assert response.status_code == 200
    await desktop_queue(fb_client)
    assert (await desktop_claim(fb_client)).json()["state"] == "limited"


async def test_actual_meta_permission_name_is_accepted(fb_client, meta):
    # Literal observed on Meta's Pages use-case panel, not copied from the implementation constant.
    meta.scopes = ["pages_manage_posts", "pages_manage_engagement", "pages_read_engagement",
                   "pages_read_user_content"]
    response = await fb_client.post(endpoint() + "/verify", headers=headers(),
                                   json={"credential_key": "owned-page"})
    assert response.status_code == 200, response.text
    assert response.json()["actions"] == ["comment", "photo", "post", "reply"]
