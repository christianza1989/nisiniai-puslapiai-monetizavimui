"""Retained real customer/Business/Grant/source attachment; no Creation or providers."""
import asyncio
import os
from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import verified
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.business_attachment import admin
from pinet_core.business_attachment import service as sources
from pinet_core.config import settings
from pinet_core.control.bootstrap import registered_business, registered_grant, registration_lock
from pinet_core.control.routes import scope, token_hash
from pinet_core.creation.models import Creation
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_agents.models import Agent, Config
from pinet_core.customer_text.service import customer_session

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit retained isolated0049 customer attachment QA required")


def spec(name="Synthetic requirements assistant"):
    return {"name": name, "goal": "Clarify requirements using the reviewed synthetic source",
        "audience": "Synthetic lodging owners", "inputs": ["Reviewed business facts"],
        "outputs": ["Requirements draft"], "boundaries": ["No sending or supply promises"],
        "escalation": "Ask the owner about unknown supply terms", "autonomy": "drafts_for_review",
        "sources": ["Reviewed synthetic business snapshot"], "examples": [{"input": "What is offered?",
            "expected": "Explain only the reviewed requirements enquiry"}], "unknowns": ["Supply terms"]}


async def approve(c, revision=1):
    request = {"business_id": c["business_id"], "authorizing_session_id": c["session_id"],
        "request_id": str(uuid4()), "source_revision": settings().control_source_revision, "duration_seconds": 600,
        "payload": {"version": "external-business-source.v1", "external_revision": "synthetic-v"+str(revision),
            "artifact_ref": "private://synthetic/attachment/v"+str(revision), "artifact_sha256": "a"*64,
            "knowledge_sha256": "b"*64, "review_evidence_refs": ["private://synthetic/review"],
            "facts": [{"id": "enquiry", "text": "Synthetic requirements enquiry only.", "source_ref": "synthetic-owner"}]}}
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await admin.operate(tx, "approve", request)


@pytest.fixture
async def business_customer(preview, monkeypatch):  # noqa: F811
    c, cfg = preview, settings()
    # Actual committed source fencing, not a mocked Git observation.
    monkeypatch.setattr(cfg, "control_source_revision", os.environ["PINET_CONTROL_SOURCE_REVISION"])
    for key in ("customer_agents_enabled", "workspace_topics_enabled", "workspace_team_enabled"):
        monkeypatch.setattr(cfg, key, True)
    monkeypatch.setattr(cfg, "workspace_team_runner_enabled", False)
    _, auth, me = await verified(c)
    token, portfolio = auth["Authorization"][7:], me["portfolios"][0]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        session_id = session.id
    site = "external-account-"+uuid4().hex[:20]
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        await registration_lock(tx)
        business = await registered_business(tx, site_id=site, canonical_host=site+".example.test", allow_new=True)
        await registered_grant(tx, environment=c["environment"], organization_id=portfolio["organization_id"],
            portfolio_id=portfolio["portfolio_id"], business_id=business.id,
            display_name="Synthetic externally prepared business", evidence_revision=cfg.control_source_revision)
    result = {**c, "auth": auth, "me": me, "session_id": session_id, "business_id": business.id,
        "base": f"/customer/v2/businesses/{business.id}/agents"}
    result["source"] = await approve(result)
    return result


async def create(c):
    response = await c["client"].post(c["base"], headers=c["auth"], json={"request_id": str(uuid4()),
        "purpose": "email", "source_binding_id": c["source"]["binding_id"], "configuration": spec()})
    assert response.status_code == 201, response.text
    return response.json()["data"]


async def test_batch_import_exact_replay_owner_isolation_and_real_business_without_creation(business_customer):
    c = business_customer
    packet = {"version": "business-agent-import.v1", "request_id": str(uuid4()),
        "source_binding_id": c["source"]["binding_id"], "source_binding_fingerprint": c["source"]["fingerprint"],
        "agents": [{"key": key, "purpose": purpose, "configuration": spec(key),
            "provenance": {"version": "external-agent-provenance.v1", "origin_agent_key": key,
                "origin_config_revision": "synthetic-1", "artifact_sha256": "c"*64, "instruction_sha256": "d"*64,
                "knowledge_sha256": "b"*64}} for key, purpose in (("research", "customer_research"), ("email", "email"))]}
    imported = await c["client"].post(c["base"]+"/import", headers=c["auth"], json=packet)
    assert imported.status_code == 201, imported.text
    data = imported.json()["data"]
    again = await c["client"].post(c["base"]+"/import", headers=c["auth"], json=packet)
    assert again.status_code == 201 and again.json()["data"]["action"] == "replayed", again.text
    assert [row["agent"]["agent_id"] for row in data["items"]] == [row["agent"]["agent_id"] for row in again.json()["data"]["items"]]
    changed = deepcopy(packet)
    changed["agents"][0]["configuration"]["name"] = "Changed replay"
    assert (await c["client"].post(c["base"]+"/import", headers=c["auth"], json=changed)).status_code == 409
    assert (await c["client"].get(c["base"])).status_code == 401
    _, other, _ = await verified(c)
    assert (await c["client"].get(c["base"], headers=other)).status_code == 404
    listed = await c["client"].get(c["base"], headers=c["auth"])
    assert listed.status_code == 200 and len(listed.json()["data"]["items"]) == 2, listed.text
    for row in data["items"]:
        assert row["agent"]["source_origin"] == "external" and "creation_id" not in row["agent"]
        assert row["configuration"]["source_origin"]["binding_id"] == c["source"]["binding_id"]
        assert row["readiness"]["calibration_status"] == "UNVERIFIED" and not row["readiness"]["can_activate"]
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Creation).where(Creation.user_id == c["me"]["user_id"])) == 0
        assert await tx.scalar(select(func.count()).select_from(Registration).where(Registration.business_id == c["business_id"])) == 0
        assert await tx.scalar(select(func.count()).select_from(Agent).where(Agent.business_id == c["business_id"])) == 2


async def test_new_source_adoption_retains_agent_identity_history_hash_and_cas(business_customer):
    c = business_customer
    saved = await create(c)
    path = c["base"]+"/"+saved["agent"]["agent_id"]
    old_hash = saved["configuration"]["sha256"]
    target = await approve(c, 2)
    ordinary = {"request_id": str(uuid4()), "expected_revision": 1, "configuration": spec("Revised synthetic agent")}
    assert (await c["client"].post(path+"/revisions", headers=c["auth"], json=ordinary)).status_code == 409
    explicit = ordinary | {"source_binding_id": target["binding_id"], "source_binding_fingerprint": target["fingerprint"]}
    adopted = await c["client"].post(path+"/revisions", headers=c["auth"], json=explicit)
    assert adopted.status_code == 200, adopted.text
    current = adopted.json()["data"]
    assert current["agent"]["agent_id"] == saved["agent"]["agent_id"] and current["agent"]["current_revision"] == 2
    assert current["configuration"]["source_origin"]["binding_id"] == target["binding_id"]
    old = await c["client"].get(path+"/revisions/1", headers=c["auth"])
    assert old.status_code == 200 and old.json()["data"]["sha256"] == old_hash, old.text
    assert old.json()["data"]["source_origin"]["binding_id"] == c["source"]["binding_id"]
    assert (await c["client"].post(path+"/revisions", headers=c["auth"], json=explicit)).json()["data"]["action"] == "replayed"
    assert (await c["client"].post(path+"/revisions", headers=c["auth"], json=explicit | {"request_id": str(uuid4())})).status_code == 409
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Config).where(Config.agent_id == saved["agent"]["agent_id"])) == 2


async def test_source_adoption_and_old_revocation_have_no_lock_cycle(business_customer, monkeypatch):
    c = business_customer
    saved = await create(c)
    target = await approve(c, 2)
    attempted = asyncio.Event()
    original = sources.lifetime

    async def observed(*args, **kwargs):
        if asyncio.current_task().get_name() == "external-source-adopt":
            attempted.set()
        return await original(*args, **kwargs)

    monkeypatch.setattr(sources, "lifetime", observed)
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        await sources.lifetime(tx, c["business_id"], exclusive=True)
        path = c["base"]+"/"+saved["agent"]["agent_id"]+"/revisions"
        pending = asyncio.create_task(c["client"].post(path, headers=c["auth"], json={"request_id": str(uuid4()),
            "expected_revision": 1, "configuration": spec(), "source_binding_id": target["binding_id"],
            "source_binding_fingerprint": target["fingerprint"]}), name="external-source-adopt")
        await asyncio.wait_for(attempted.wait(), 10)
        await tx.execute(text("SET LOCAL lock_timeout='3s'"))
        await admin.operate(tx, "revoke", {"business_id": c["business_id"], "binding_id": c["source"]["binding_id"],
            "authorizing_session_id": c["session_id"], "source_revision": settings().control_source_revision,
            "expected_fingerprint": c["source"]["fingerprint"]})
    response = await asyncio.wait_for(pending, 15)
    assert response.status_code == 200, response.text


async def test_external_directory_does_not_enter_creation_only_preview(business_customer, monkeypatch):
    c = business_customer
    saved = await create(c)
    monkeypatch.setattr(settings(), "workspace_team_actor_ids", [c["me"]["user_id"]])
    portfolio = c["me"]["portfolios"][0]["portfolio_id"]
    base = f"/customer/v2/portfolios/{portfolio}/workspace-topics"
    topic = await c["client"].post(base, headers=c["auth"], json={"idempotency_key": str(uuid4()),
        "title": "Synthetic external business team", "anchor": {"kind": "business", "selection_id": c["business_id"]}})
    assert topic.status_code == 200, topic.text
    path = base+"/"+topic.json()["data"]["current_topic"]["topic_id"]
    directory = await c["client"].get(path+"/team/directory", headers=c["auth"])
    assert directory.status_code == 200, directory.text
    rows = directory.json()["data"]["items"]
    assert len(rows) == 1 and rows[0]["agent_id"] == saved["agent"]["agent_id"]
    assert rows[0]["external_binding_id"] == c["source"]["binding_id"] and not rows[0]["can_delegate"]
    contacts = await c["client"].get(path+"/direct/recipients", headers=c["auth"])
    assert contacts.status_code == 200, contacts.text
    assert all(row["recipient"]["kind"] != "saved_agent" for row in contacts.json()["data"]["items"])
