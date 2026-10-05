import asyncio
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.facebook import service as fb
from pinet_core.facebook.agent import Draft
from pinet_core.facebook.models import FacebookAccountLease, FacebookRecord
from pinet_core.models import Business, Case, CaseSource, utcnow
from pinet_core.service import business

SITE = "traktoriupadangos"
OTHER = "greitossvetaines"


@pytest.fixture
async def fb_client(client):
    yield client
    async with db.registry() as tx:
        sites = list(await tx.scalars(select(Business)))
    for item in sites:
        async with db.transaction(item.id, settings().environment) as tx:
            await tx.execute(delete(FacebookRecord))
            await tx.execute(delete(FacebookAccountLease))


def headers(worker=False):
    return {"Authorization": "Bearer " + (settings().worker_secret if worker else settings().operator_secret)}


def base(site=SITE):
    return f"/operator/sites/{site}/facebook"


async def enable(client, site=SITE, enabled=True, paused=False, limit=20):
    current = (await client.get(base(site), headers=headers())).json()
    response = await client.put(base(site) + "/policy", headers=headers(), json={
        "base_revision": current["revision"], "reason": "Isolated module acceptance",
        "policy": {"enabled": enabled, "paused": paused, "daily_draft_limit": limit}})
    assert response.status_code == 200, response.text
    return response.json()


async def seed(client, site=SITE, reuse="unknown", role="buyer", data_class="anonymous"):
    await enable(client, site)
    group = {"key": "qa-group", "name": "Anonymous QA group metadata",
             "url": "https://www.facebook.com/groups/qa/", "rules_url": "https://www.facebook.com/groups/qa/about",
             "reuse": reuse, "notes": "No real group content or contacts"}
    response = await client.post(base(site) + "/groups", headers=headers(), json=group)
    assert response.status_code == 200, response.text
    signal = {"key": "qa-signal", "group_key": "qa-group", "title": "Padangos poreikio kategorija",
              "summary": "Anoniminis poreikis su dydžio, kiekio ir laikotarpio neaiškumais.",
              "role": role, "scope_fit": "yes", "data_class": data_class}
    response = await client.post(base(site) + "/signals", headers=headers(), json=signal)
    assert response.status_code == 200, response.text
    return response.json()


async def queue(client, signal, site=SITE, key="qa-action"):
    response = await client.post(base(site) + "/actions", headers=headers(), json={
        "key": key, "signal_id": signal["id"], "kind": "comment_draft"})
    assert response.status_code == 200, response.text
    return response.json()


async def test_auth_disabled_policy_revision_and_per_site(fb_client):
    assert (await fb_client.get(base())).status_code == 401
    assert (await fb_client.get(base(), headers=headers(worker=True))).status_code == 401
    assert (await fb_client.post(base() + "/tick", headers=headers())).status_code == 503
    await enable(fb_client)
    other = (await fb_client.get(base(OTHER), headers=headers())).json()
    assert other["policy"]["enabled"] is False
    conflict = await fb_client.put(base() + "/policy", headers=headers(), json={
        "base_revision": 0, "reason": "stale UI revision", "policy": {"enabled": False}})
    assert conflict.status_code == 409
    assert (await fb_client.get(base(), headers=headers())).json()["policy"]["enabled"] is True


async def test_durable_draft_idempotency_and_no_fake_demand(fb_client):
    signal = await seed(fb_client)
    action = await queue(fb_client, signal)
    assert (await queue(fb_client, signal))["id"] == action["id"]
    result = await fb_client.post(base() + "/tick", headers=headers())
    assert result.json()["processed"] == 1
    assert (await fb_client.post(base() + "/tick", headers=headers())).json()["processed"] == 0
    dashboard = (await fb_client.get(base(), headers=headers())).json()
    draft = dashboard["drafts"][0]
    assert draft["context"]["site_id"] == SITE and draft["context"]["contact_email"] == "info@pinet.lt"
    assert len(draft["context"]["instruction_hash"]) == 64
    assert "recency_unverified" in draft["qualification"]["reasons"]
    assert draft["external_sending"] is False
    assert dashboard["overview"]["received_real_needs"] == 0
    assert (await fb_client.post(base() + f'/actions/{action["id"]}/send', headers=headers())).status_code == 503


async def test_cross_tenant_source_routing_and_rls(fb_client):
    signal = await seed(fb_client)
    await enable(fb_client, OTHER)
    response = await fb_client.post(base(OTHER) + "/actions", headers=headers(), json={
        "key": "other-action", "signal_id": signal["id"], "kind": "comment_draft"})
    assert response.status_code == 404
    other = await business(OTHER)
    async with db.transaction(other.id, settings().environment) as tx:
        assert await tx.get(FacebookRecord, signal["id"]) is None
    assert (await fb_client.get(base(OTHER), headers=headers())).json()["signals"] == []


async def test_source_rights_validation_and_large_body(fb_client):
    await seed(fb_client)
    response = await fb_client.post(base() + "/signals", headers=headers(), json={
        "key": "personal-signal", "group_key": "qa-group", "title": "Request", "summary": "Details",
        "data_class": "permitted"})
    assert response.status_code == 403
    response = await fb_client.post(base() + "/groups", headers=headers(), json={
        "key": "offhost", "name": "Offhost", "url": "https://evil.test/groups/x/",
        "rules_url": "https://www.facebook.com/groups/x/about"})
    assert response.status_code == 422
    response = await fb_client.post(base() + "/groups", headers=headers(), content=b"x" * 20001)
    assert response.status_code == 413


async def test_pause_cancels_pending_and_limit(fb_client):
    signal = await seed(fb_client)
    await queue(fb_client, signal)
    await enable(fb_client, limit=0)
    assert (await fb_client.post(base() + "/tick", headers=headers())).json()["state"] == "limited"
    await enable(fb_client, paused=True)
    assert (await fb_client.post(base() + "/tick", headers=headers())).status_code == 503
    dashboard = (await fb_client.get(base(), headers=headers())).json()
    assert dashboard["actions"][0]["state"] == "cancelled"


async def test_buyer_supplier_and_stale_signal(fb_client):
    signal = await seed(fb_client, role="supplier")
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        row = await fb.by_id(tx, "signal", signal["id"])
        assert "not_buyer" in fb.qualification(row)["reasons"]
        row.payload = {**row.payload, "role": "buyer", "published_at": (utcnow() - timedelta(days=30)).isoformat()}
        assert "stale_signal" in fb.qualification(row)["reasons"]


async def test_account_single_writer_across_sites_and_stale_fence(fb_client):
    one, two = await business(SITE), await business(OTHER)
    account = "qa-" + uuid4().hex
    async with db.transaction(one.id, settings().environment) as tx:
        first = await fb.claim_account(tx, account, "first-owner")
    async with db.transaction(two.id, settings().environment) as tx:
        with pytest.raises(HTTPException, match="facebook_account_busy"):
            await fb.claim_account(tx, account, "second-owner")
    async with db.transaction(one.id, settings().environment) as tx:
        row = await fb.fenced_account(tx, account, "first-owner", first["epoch"])
        row.lease_until = utcnow() - timedelta(seconds=1)
    async with db.transaction(two.id, settings().environment) as tx:
        second = await fb.claim_account(tx, account, "second-owner")
        assert second["epoch"] > first["epoch"]
        with pytest.raises(HTTPException, match="facebook_stale_account_lease"):
            await fb.fenced_account(tx, account, "first-owner", first["epoch"])


async def test_parallel_tick_and_fixture_case_source_dedup(fb_client):
    signal = await seed(fb_client)
    await queue(fb_client, signal)
    results = await asyncio.gather(*[fb_client.post(base() + "/tick", headers=headers()) for _ in range(2)])
    assert sum(result.json()["processed"] for result in results) == 1
    path = f"/internal/sites/{SITE}/facebook/inbound-fixture"
    payload = {"page_id": "test-page", "sender_id": "test-person", "message_id": "test-message",
               "need": "Tik izoliuota synthetic poreikio užklausa."}
    first = await fb_client.post(path, json=payload, headers=headers(worker=True))
    second = await fb_client.post(path, json=payload, headers=headers(worker=True))
    assert first.status_code == 200, first.text
    assert first.json()["case_id"] == second.json()["case_id"]
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        source = await tx.scalar(select(CaseSource).where(CaseSource.case_id == first.json()["case_id"]))
        case = await tx.get(Case, source.case_id)
        assert source.source_system == "facebook_page_fixture" and case.payload["synthetic"] is True
    assert (await fb_client.get(base(), headers=headers())).json()["overview"]["received_real_needs"] == 0


async def test_async_model_task_is_fenced_by_policy_change(fb_client):
    signal = await seed(fb_client)
    await queue(fb_client, signal)
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        task = await fb.claim_model_draft(tx, item)
    await enable(fb_client, enabled=False)
    async with db.transaction(item.id, settings().environment) as tx:
        with pytest.raises(HTTPException):
            await fb.complete_model_draft(tx, item, task, {"approved": True})


async def test_module_tables_force_rls(fb_client):
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        rows = (await tx.execute(text("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class "
                                      "WHERE relname IN ('facebook_records','facebook_account_leases')"))).all()
        assert len(rows) == 2 and all(row.relrowsecurity and row.relforcerowsecurity for row in rows)


async def test_shared_daily_budget_and_model_acceptance(fb_client):
    signal = await seed(fb_client)
    await enable(fb_client, limit=1)
    await queue(fb_client, signal)
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        task = await fb.claim_model_draft(tx, item)
    async with db.transaction(item.id, settings().environment) as tx:
        result = await fb.complete_model_draft(tx, item, task, {
            "approved": True, "body": "Koks pilnas padangos žymėjimas ir reikalingas kiekis?",
            "review": {"approved": True, "unsupported_claims": []}, "usage": {"calls": 2}})
        assert result["state"] == "prepared"
        assert await fb.daily_usage(tx) == 1
    await queue(fb_client, signal, key="second-action")
    assert (await fb_client.post(base() + "/tick", headers=headers())).json()["state"] == "limited"
    async with db.transaction(item.id, settings().environment) as tx:
        assert await fb.claim_model_draft(tx, item) is None
        draft = (await fb.listing(tx, "draft"))[0]
        assert draft["generator"] == "codex_cli_private_v1" and not draft["external_sending"]


async def test_changed_knowledge_rejects_model_completion(fb_client, monkeypatch):
    signal = await seed(fb_client)
    await queue(fb_client, signal)
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        task = await fb.claim_model_draft(tx, item)

    async def changed_projection(tx):
        return {"synthetic": True, "new_revision": "Changed while generation was in progress"}

    monkeypatch.setattr(fb.knowledge, "projection", changed_projection)
    async with db.transaction(item.id, settings().environment) as tx:
        result = await fb.complete_model_draft(tx, item, task, {"approved": True})
        assert result["state"] == "blocked"
        assert not await fb.listing(tx, "draft")
        assert (await fb.record(tx, "model_attempt", task["token"])).state == "blocked"


async def test_expired_model_task_is_not_blindly_retried(fb_client):
    signal = await seed(fb_client)
    await queue(fb_client, signal)
    item = await business(SITE)
    async with db.transaction(item.id, settings().environment) as tx:
        task = await fb.claim_model_draft(tx, item)
        action = await fb.by_id(tx, "action", task["action_id"])
        action.payload = {**action.payload, "lease_until": (utcnow() - timedelta(seconds=1)).isoformat()}
    async with db.transaction(item.id, settings().environment) as tx:
        assert await fb.claim_model_draft(tx, item) is None
        assert (await fb.by_id(tx, "action", task["action_id"])).state == "uncertain"
        assert (await fb.record(tx, "model_attempt", task["token"])).state == "expired"
        with pytest.raises(HTTPException, match="facebook_stale_draft_task"):
            await fb.complete_model_draft(tx, item, task, {"approved": True})


async def test_cross_tenant_case_link_rejected_by_database(fb_client):
    one, two = await business(SITE), await business(OTHER)
    async with db.transaction(one.id, settings().environment) as tx:
        case = Case(business_id=one.id, environment_id=settings().environment, payload={"synthetic": True})
        tx.add(case)
        await tx.flush()
        ident = case.id
    with pytest.raises(IntegrityError):
        async with db.transaction(two.id, settings().environment) as tx:
            fb.add(tx, two, "inbound_fixture", "bad-link", "synthetic", {}, case_id=ident)
            await tx.flush()


async def test_fixture_is_not_a_live_ingestion_route(fb_client, monkeypatch):
    await enable(fb_client)
    monkeypatch.setattr(settings(), "allow_simulation", False)
    response = await fb_client.post(f"/internal/sites/{SITE}/facebook/inbound-fixture", json={
        "page_id": "qa-page", "sender_id": "qa-sender", "message_id": "qa-msg", "need": "Synthetic only"},
        headers=headers(worker=True))
    assert response.status_code == 403


def test_model_body_cannot_be_an_encoded_internal_artifact():
    with pytest.raises(ValidationError):
        Draft(body='{"mode":"draft_only","draft":"Kokio dydžio reikia?"}')
