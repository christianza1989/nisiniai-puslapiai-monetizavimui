import asyncio
from datetime import timedelta

import pytest
from conftest import claim, edge, knowledge, start, utterance, worker
from sqlalchemy import select
from test_core import drain

from pinet_core import jobs, policy, service
from pinet_core.config import settings
from pinet_core.contracts import Policy, Start
from pinet_core.db import db
from pinet_core.models import Artifact, Outbox, utcnow


async def configure(client, revision=0, site="traktoriupadangos", **changes):
    return await client.put(f"/operator/sites/{site}/policy",
        headers={"Authorization": f"Bearer {settings().operator_secret}"},
        json={"base_revision": revision, "policy": Policy(**changes).model_dump(),
              "reason": "Synthetic operator policy test"})


async def test_operator_separate_auth_and_closed_capabilities(client):
    path = "/operator/sites/traktoriupadangos/policy"
    for key in ["worker_secret", "edge_secret"]:
        assert (await client.get(path, headers={
            "Authorization": f"Bearer {getattr(settings(), key)}"})).status_code == 401
    headers = {"Authorization": f"Bearer {settings().operator_secret}"}
    current = await client.get(path, headers=headers)
    assert current.json()["policy"]["enabled"] is False
    response = await client.put(path, headers=headers, json={"base_revision": 0,
        "reason": "Synthetic unsupported capability", "policy": {"allowed_tools": ["quote.commit"]}})
    assert response.status_code == 422


async def test_policy_revision_race_and_tenant_isolation(client):
    results = await asyncio.gather(configure(client, enabled=True), configure(client, enabled=True))
    assert sorted(r.status_code for r in results) == [200, 409]
    headers = {"Authorization": f"Bearer {settings().operator_secret}"}
    other = await client.get("/operator/sites/greitossvetaines/policy", headers=headers)
    assert other.json()["revision"] == 0
    history = await client.get("/operator/sites/traktoriupadangos/policy/history", headers=headers)
    assert len(history.json()["revisions"]) == 1
    item = await service.business("traktoriupadangos")
    async with db.transaction(item.id, "different-environment") as tx:
        assert (await policy.read(tx))[1] == 0


async def test_disable_rejects_previously_cached_tool(client):
    session = await start(client)
    epoch = await claim(client, session)
    call = {"epoch": epoch, "call_id": "cached-knowledge", "name": "knowledge.resolve",
            "arguments": {"query": "padangos"}}
    assert (await worker(client, session, "/tools", call)).json()["sources"]
    assert (await configure(client, allowed_tools=["ui.open_contact_form"])).status_code == 200
    assert (await worker(client, session, "/tools", call)).status_code == 403
    status = (await edge(client, "GET", "traktoriupadangos", session)).json()
    assert status["allowed_tools"] == ["ui.open_contact_form"]


async def test_pause_finalizes_active_call_and_preserves_late_contact(client):
    session = await start(client)
    epoch = await claim(client, session)
    await utterance(client, session, epoch)
    result = await configure(client, paused=True)
    assert result.json()["finalized_sessions"] == 1
    assert (await worker(client, session, "/claim", {"owner": "test-worker"})).status_code == 503
    status = (await edge(client, "GET", "traktoriupadangos", session)).json()
    assert status["state"] == "finalized" and status["paused"] is True
    late = await edge(client, "POST", "traktoriupadangos", session, "/contact", {
        "channel": "phone", "value": "+37060000000", "consent": True, "notice_version": "test-only"})
    assert late.json()["saved"] is True
    response = await client.post("/internal/sites/traktoriupadangos/simulation",
        headers={"Authorization": f"Bearer {settings().worker_secret}"},
        json={"knowledge": knowledge(), "notice_version": "test-only", "consent": True, "mode": "simulation"})
    assert response.status_code == 503


async def test_knowledge_expiry_overrides_cached_result(client):
    session = await start(client)
    epoch = await claim(client, session)
    call = {"epoch": epoch, "call_id": "same-knowledge", "name": "knowledge.resolve",
            "arguments": {"query": "padangos"}}
    assert (await worker(client, session, "/tools", call)).json()["sources"]
    item = await service.business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        from pinet_core.models import KnowledgeState
        state = await tx.scalar(select(KnowledgeState))
        state.refreshed_at = utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)
    assert (await worker(client, session, "/tools", call)).json()["reason"] == "knowledge_snapshot_expired"


async def test_policy_lock_serializes_disable_after_inflight_operation(client):
    item = await service.business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        await policy.lock(tx, item.id, settings().environment)
        pending = asyncio.create_task(configure(client, allowed_tools=[]))
        await asyncio.sleep(0.1)
        assert not pending.done()
    assert (await pending).status_code == 200


async def test_policy_restricts_live_admission_below_global_limit(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "allow_simulation", False)
    monkeypatch.setattr(cfg, "global_daily_budget_microusd", 1000000)
    monkeypatch.setattr(cfg, "voice_cost_ceiling_microusd", 10000)
    for key in ["voice_enabled", "m0_verified"]:
        monkeypatch.setattr(cfg, key, True)
    for key in ["google_api_key", "livekit_api_key", "livekit_api_secret"]:
        monkeypatch.setattr(cfg, key, "synthetic-never-used")
    item = await service.business("traktoriupadangos")
    data = Start(knowledge=knowledge(), consent=True, notice_version="test-only")
    from fastapi import HTTPException
    with pytest.raises(HTTPException, match="business_disabled"):
        await service.start(item, data)
    assert (await configure(client, enabled=True, max_sessions=1, daily_budget_microusd=1000000)).status_code == 200
    await service.start(item, data)
    with pytest.raises(HTTPException, match="session_capacity"):
        await service.start(item, Start(knowledge=knowledge(), consent=True, notice_version="test-only"))


async def test_followup_gate_prevents_external_dispatch(client, monkeypatch):
    session = await start(client)
    epoch = await claim(client, session)
    await utterance(client, session, epoch)
    await edge(client, "POST", "traktoriupadangos", session, "/contact", {
        "channel": "email", "value": "voice-test@example.org", "consent": True, "notice_version": "test-only"})
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await service.business("traktoriupadangos")
    await drain(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        artifact = await tx.scalar(select(Artifact).where(Artifact.kind == "followup"))
        artifact.payload = {**artifact.payload, "test": False}  # local fixture; SMTP is mocked below
    monkeypatch.setattr(settings(), "smtp_enabled", True)

    def forbidden(*args):
        raise AssertionError("disabled follow-up must not reach SMTP")
    monkeypatch.setattr(jobs, "smtp_send", forbidden)
    assert (await configure(client, enabled=True, followup_enabled=False)).status_code == 200
    assert await jobs.deliver_one(item.id) is False
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.scalar(select(Outbox))).state == "prepared"
