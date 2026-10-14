import json
import os
import subprocess
import sys
from datetime import timedelta

import pytest
from test_facebook import OTHER, SITE, base, enable, headers
from test_facebook import fb_client as shared_fb_client

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.facebook import browser_service as browser
from pinet_core.facebook import service as fb
from pinet_core.facebook.browser_contracts import PublisherBinding, destination
from pinet_core.facebook.desktop_worker import call
from pinet_core.models import utcnow
from pinet_core.service import business


@pytest.fixture
async def fb_client(client):
    async for value in shared_fb_client.__wrapped__(client):
        yield value


def endpoint(site=SITE, internal=False):
    return (f"/internal/sites/{site}/facebook" if internal else base(site)) + "/browser"


async def setup(client, site=SITE, kind="page", access="verified", scope="fixture"):
    await enable(client, site)
    response = await client.put(endpoint(site) + "/policy", headers=headers(), json={
        "base_revision": 0, "policy": {"enabled": True}, "reason": "Isolated browser acceptance"})
    assert response.status_code == 200, response.text
    data = {"key": "binding-" + kind, "account_key": "shared-test-account", "actor_kind": kind,
        "actor_id": "fixture-" + kind, "actor_name": "Bandomoji Page" if kind == "page" else "Bandomasis profilis",
        "target_url": "http://127.0.0.1:8844/operator/facebook-browser-fixture/" + kind + "/fixture-" + kind,
        "verification_scope": scope, "access": access, "evidence": "Only synthetic local fixture access proof",
        "valid_until": (utcnow() + timedelta(hours=1)).isoformat()}
    if scope == "live":
        data["target_url"] = "https://www.facebook.com/synthetic-owned-profile"
    response = await client.post(endpoint(site) + "/bindings", headers=headers(), json=data)
    assert response.status_code == 200, response.text
    return data


async def queue(client, kind="page", site=SITE, key="post-one", purpose="personal"):
    data = {"key": key, "binding_key": "binding-" + kind, "body": "Tik izoliuotas Codex publikavimo bandymas.",
            "purpose": purpose, "audience": "public" if kind == "page" else "only_me",
            "review_note": "Synthetic body reviewed for fixture acceptance only."}
    return await client.post(endpoint(site) + "/posts", headers=headers(), json=data)


async def claim(client, site=SITE):
    return await client.post(endpoint(site, True) + "/claim", headers=headers(True),
                             json={"owner": "desktop-qa-owner"})


def task(packet):
    return {key: packet[key] for key in ("owner", "task_token", "epoch")}


def observation(packet, **changes):
    value = {key: packet["publisher"][key] for key in ("actor_kind", "actor_id", "actor_name", "target_url")}
    return {**value, "body_sha256": packet["body_sha256"], "audience": packet["audience"],
            "tab_id": "actual-test-tab", "observed_at": utcnow().isoformat(), **changes}


@pytest.mark.parametrize("had_permit", [False, True])
async def test_explicit_resume_only_before_any_submit_permit(fb_client, had_permit):
    await setup(fb_client)
    await queue(fb_client)
    packet = (await claim(fb_client)).json()
    path = endpoint(internal=True) + f'/posts/{packet["job_id"]}/resume'
    body = {"owner":"explicit-resume-owner","seconds":240}
    assert (await fb_client.post(path,headers=headers(True),json=body)).status_code == 409
    if had_permit:
        assert (await command(fb_client,packet,"submit-permit",{"observation":observation(packet)})).status_code == 200
    item = await business(SITE)
    async with db.transaction(item.id,settings().environment) as tx:
        job = await fb.by_id(tx,"browser_post",packet["job_id"])
        job.payload = {**job.payload,"lease_until":(utcnow()-timedelta(seconds=1)).isoformat()}
    assert (await fb_client.get(endpoint(),headers=headers())).json()["posts"][0]["state"] == "uncertain"
    # Rotating check-only capability must preserve the original quota charge.
    checked = await fb_client.post(endpoint(internal=True)+f'/posts/{packet["job_id"]}/check',
        headers=headers(True),json={"owner":"check-only-resume-proof"})
    assert checked.status_code == 200
    current = (await fb_client.get(endpoint(),headers=headers())).json()["posts"][0]
    proof = {"base_revision":current["revision"],"outcome":"not_published",
        "evidence":"Synthetic check-only evidence confirms no fixture post was created; no real provider or browser action."}
    assert (await fb_client.post(endpoint()+f'/posts/{packet["job_id"]}/reconcile',headers=headers(),json=proof)).status_code == 200
    assert (await fb_client.post(path.replace(SITE,OTHER),headers=headers(True),json=body)).status_code == 404
    resumed = await fb_client.post(path,headers=headers(True),json=body)
    if had_permit:
        assert resumed.status_code == 409
    else:
        assert resumed.status_code == 200, resumed.text
        updated = resumed.json()
        assert updated["task_token"] != packet["task_token"] and updated["epoch"] > packet["epoch"]
        assert (await command(fb_client,packet,"submit-permit",{"observation":observation(packet)})).status_code == 409
        assert (await command(fb_client,updated,"submit-permit",{"observation":observation(updated)})).status_code == 200
    async with db.transaction(item.id,settings().environment) as tx:
        assert len(await fb.listing(tx,"browser_attempt")) == 1


async def command(client, packet, operation, payload=None, site=SITE):
    return await client.post(endpoint(site, True) + f'/posts/{packet["job_id"]}/{operation}',
                             headers=headers(True), json={**task(packet), **(payload or {})})


@pytest.mark.parametrize("kind", ["page", "profile"])
async def test_full_fixture_receipt_and_one_click(fb_client, kind):
    binding = await setup(fb_client, kind=kind)
    first = await queue(fb_client, kind)
    assert first.status_code == 200, first.text
    assert (await queue(fb_client, kind)).json()["id"] == first.json()["id"]
    packet = (await claim(fb_client)).json()
    assert packet["state"] == "claimed"
    assert "worker_secret" not in str(packet)
    permit = await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})
    assert permit.status_code == 200, permit.text
    assert (await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})).status_code == 409
    receipt = {"status": "visible", "observation": observation(packet), "provider_post_id": "fake-proof",
               "permalink": binding["target_url"].rsplit("/", 2)[0] + "/posts/fake-proof",
               "evidence": "Synthetic fixture not actually clicked yet"}
    assert (await command(fb_client, packet, "receipt", receipt)).status_code == 409
    published = await fb_client.post(binding["target_url"].replace("http://127.0.0.1:8844", ""), json={
        "actor_kind": kind, "actor_id": binding["actor_id"], "body": packet["body"], "audience": packet["audience"]})
    assert published.status_code == 200, published.text
    assert (await fb_client.post(binding["target_url"].replace("http://127.0.0.1:8844", ""), json={
        "actor_kind": kind, "actor_id": binding["actor_id"], "body": packet["body"], "audience": packet["audience"]})).status_code == 409
    receipt.update(provider_post_id=published.json()["id"], permalink=published.json()["permalink"],
                   observation=observation(packet))
    result = await command(fb_client, packet, "receipt", receipt)
    assert result.status_code == 200, result.text
    assert result.json()["state"] == "visible" and result.json()["external_sending"] is False
    assert (await command(fb_client, packet, "receipt", receipt)).json()["id"] == result.json()["id"]
    dashboard = (await fb_client.get(endpoint(), headers=headers())).json()
    assert "task_token" not in dashboard["posts"][0]
    assert dashboard["posts"][0]["result"]["permalink"] == receipt["permalink"]


@pytest.mark.parametrize("change", [
    {"actor_id": "another-actor"}, {"actor_name": "Different author"}, {"actor_kind": "profile"},
    {"target_url": "https://www.facebook.com/wrong-target"}, {"body_sha256": "a" * 64},
    {"audience": "only_me"}, {"observed_at": "2020-01-01T00:00:00Z"}])
async def test_pre_submit_observation_mismatch(fb_client, change):
    await setup(fb_client)
    await queue(fb_client)
    packet = (await claim(fb_client)).json()
    result = await command(fb_client, packet, "submit-permit", {"observation": observation(packet, **change)})
    assert result.status_code == 409, result.text
    assert (await command(fb_client, packet, "renew")).status_code == 200


async def test_defaultoff_auth_tenant_and_large_input(fb_client):
    assert (await fb_client.get(endpoint())).status_code == 401
    assert (await claim(fb_client)).status_code == 503
    await setup(fb_client)
    post = (await queue(fb_client)).json()
    await setup(fb_client, OTHER)
    packet = (await claim(fb_client)).json()
    assert (await command(fb_client, packet, "renew", site=OTHER)).status_code == 404
    assert (await fb_client.post(endpoint() + "/posts", headers=headers(), content=b"x" * 20001)).status_code == 413
    assert post["state"] == "ready"


async def test_expired_worker_blocks_other_tenant_until_explicit_check(fb_client):
    await setup(fb_client)
    await setup(fb_client, OTHER)
    await queue(fb_client)
    await queue(fb_client, site=OTHER)
    packet = (await claim(fb_client)).json()
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        job = await fb.by_id(tx, "browser_post", packet["job_id"])
        lease = await browser.account_row(tx, "shared-test-account")
        lease.lease_until = utcnow() - timedelta(seconds=1)
        job.payload = {**job.payload, "lease_until": lease.lease_until.isoformat()}
    assert (await claim(fb_client, OTHER)).json()["state"] == "account_blocked"
    assert (await command(fb_client, packet, "renew")).status_code == 409
    dashboard = (await fb_client.get(endpoint(), headers=headers())).json()
    old = dashboard["posts"][0]
    assert old["state"] == "uncertain"
    check = await fb_client.post(endpoint(SITE, True) + f'/posts/{old["id"]}/check', headers=headers(True),
                                  json={"owner": "new-check-only-desktop"})
    assert check.status_code == 200, check.text
    check_packet = check.json()
    assert check_packet["state"] == "check_only" and check_packet["task_token"] != packet["task_token"]
    assert (await command(fb_client, check_packet, "renew")).status_code == 409
    assert (await command(fb_client, check_packet, "submit-permit", {"observation": observation(check_packet)})).status_code == 409
    assert (await command(fb_client, packet, "block", {"reason": "cancelled"})).status_code == 409
    old = (await fb_client.get(endpoint(), headers=headers())).json()["posts"][0]
    response = await fb_client.post(endpoint() + f'/posts/{old["id"]}/reconcile', headers=headers(), json={
        "base_revision": old["revision"], "outcome": "not_published",
        "evidence": "Operator checked synthetic fixture post history and confirmed no publish occurred."})
    assert response.status_code == 200, response.text
    assert (await claim(fb_client, OTHER)).json()["state"] == "claimed"


@pytest.mark.parametrize("main_pause", [False, True])
async def test_pause_fences_active_posts(fb_client, main_pause):
    await setup(fb_client)
    await queue(fb_client)
    packet = (await claim(fb_client)).json()
    assert (await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})).status_code == 200
    if main_pause:
        await enable(fb_client, paused=True)
    else:
        await fb_client.put(endpoint() + "/policy", headers=headers(), json={"base_revision": 1,
            "policy": {"enabled": True, "paused": True}, "reason": "Pause during synthetic UI submit"})
    dashboard = (await fb_client.get(endpoint(), headers=headers())).json()
    assert dashboard["posts"][0]["state"] == "uncertain"
    assert (await command(fb_client, packet, "renew")).status_code == 409


async def test_context_change_quota_and_wrong_task(fb_client, monkeypatch):
    await setup(fb_client)
    await queue(fb_client)
    packet = (await claim(fb_client)).json()
    fake = {**packet, "epoch": packet["epoch"] + 1}
    assert (await command(fb_client, fake, "renew")).status_code == 409
    async def changed(tx):
        return {"synthetic": "new facts revision"}
    monkeypatch.setattr(browser.knowledge, "projection", changed)
    assert (await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})).status_code == 409
    await command(fb_client, packet, "block", {"reason": "cancelled"})
    await fb_client.put(endpoint() + "/policy", headers=headers(), json={"base_revision": 1,
        "policy": {"enabled": True, "daily_post_limit": 1}, "reason": "Bounded synthetic quota"})
    assert (await claim(fb_client)).json()["state"] == "limited"


async def test_unknown_access_and_binding_immutability(fb_client):
    await setup(fb_client, access="unknown")
    assert (await queue(fb_client)).status_code == 403
    # Immutable binding must not be silently changed on an existing idempotency key.
    assert (await fb_client.post(endpoint() + "/bindings", headers=headers(), json={
        **PublisherBinding(key="binding-page", account_key="shared-test-account", actor_kind="page",
        actor_id="fixture-page", actor_name="Bandomoji Page", target_url="https://www.facebook.com/synthetic",
        access="verified", evidence="Changed binding must be rejected", valid_until=utcnow()+timedelta(hours=1)).model_dump(mode="json")
    })).status_code == 409


async def test_live_business_requires_facts_and_fixture_is_disabled_in_live(fb_client, monkeypatch):
    async def absent(tx):
        return None
    monkeypatch.setattr(browser.knowledge, "projection", absent)
    await setup(fb_client, scope="live")
    assert (await queue(fb_client, purpose="business")).status_code == 403
    monkeypatch.setattr(settings(), "allow_simulation", False)
    assert (await fb_client.get('/operator/facebook-browser-fixture/page/fixture-page')).status_code == 403


async def test_changed_body_idempotency_and_expired_proof(fb_client):
    binding = await setup(fb_client)
    result = await queue(fb_client)
    command = {k: result.json()[k] for k in ("key", "binding_key", "body", "purpose", "audience", "review_note")}
    command["body"] += " changed"
    assert (await fb_client.post(endpoint()+'/posts', headers=headers(), json=command)).status_code == 409
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        record = await fb.record(tx, 'browser_binding', binding['key'])
        record.payload = {**record.payload, 'valid_until': (utcnow()-timedelta(seconds=1)).isoformat()}
    assert (await claim(fb_client)).json()['state'] == 'blocked'


async def test_check_only_recovers_visible_post_from_new_tab(fb_client):
    binding = await setup(fb_client)
    await queue(fb_client)
    packet = (await claim(fb_client)).json()
    assert (await command(fb_client, packet, "submit-permit", {"observation": observation(packet)})).status_code == 200
    published = await fb_client.post(binding["target_url"].replace("http://127.0.0.1:8844", ""), json={
        "actor_kind": "page", "actor_id": binding["actor_id"], "body": packet["body"], "audience": "public"})
    assert published.status_code == 200
    receipt = {"status": "visible", "observation": observation(packet, tab_id="new-check-tab"),
        "provider_post_id": published.json()["id"], "permalink": published.json()["permalink"],
        "evidence": "Actual synthetic post checked in a fresh tab after original desktop session loss."}
    assert (await command(fb_client, packet, "receipt", receipt)).status_code == 409
    await command(fb_client, packet, "block", {"reason": "submit_uncertain"})
    response = await fb_client.post(endpoint(SITE, True) + f'/posts/{packet["job_id"]}/check', headers=headers(True),
                                   json={"owner": "new-check-only-desktop"})
    recovered = response.json()
    receipt["observation"] = observation(recovered, tab_id="new-check-tab")
    result = await command(fb_client, recovered, "receipt", receipt)
    assert result.status_code == 200, result.text
    assert result.json()["state"] == "visible" and result.json()["external_sending"] is False


@pytest.mark.parametrize("url", ["https://evil.test/foo", "https://www.facebook.com/groups/x",
    "https://www.facebook.com/logout", "https://www.facebook.com/l.php", "https://www.facebook.com/profile.php",
    "https://www.facebook.com/profile.php?id=1&id=2", "https://www.facebook.com/foo?next=x"])
def test_unsafe_destination(url):
    with pytest.raises(ValueError):
        destination(url)


@pytest.mark.parametrize("url,site", [("https://evil.test", SITE), ("http://127.0.0.1:8844?q=x", SITE),
    ("http://127.0.0.1:8844", "../other")])
async def test_bridge_never_sends_credentials_to_wrong_origin(url, site):
    with pytest.raises(RuntimeError):
        await call(site, "claim", {"owner": "desktop-qa-owner"}, base_url=url)


def test_windows_cli_does_not_lose_claim_on_lithuanian_output(tmp_path):
    request = tmp_path / "request.json"
    request.write_text('{"owner":"desktop-qa-owner"}', encoding="utf-8")
    code = """from pinet_core.facebook import desktop_worker as worker
async def fixture_call(*args):
    return {"state":"claimed","body":"Įrašas, auditorija ir lietuviškas tekstas."}
worker.call = fixture_call
worker.main()
"""
    result = subprocess.run([sys.executable, "-c", code, "claim", "--site", SITE,
                             "--request-file", str(request)], capture_output=True,
                            env={**os.environ, "PYTHONIOENCODING": "cp1252"}, timeout=15)
    assert result.returncode == 0, result.stderr.decode("utf-8", errors="replace")
    assert json.loads(result.stdout.decode("utf-8"))["body"] == "Įrašas, auditorija ir lietuviškas tekstas."
