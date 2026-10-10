"""Real isolated PG/RLS + maintained native intake and V2 registry; no provider/channel calls."""
import json
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_team import runner
from test_customer_creations import creation as creation_fixture
from test_customer_creations import result, start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core import knowledge, knowledge_index, onboarding
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.creation import studio, worker
from pinet_core.creation.models import Creation, Job, Revision
from pinet_core.customer.models import Account
from pinet_core.models import Business, BusinessPolicy, KnowledgeState, new_id, utcnow

creation = creation_fixture


@pytest.fixture
async def preparation(creation):
    try:
        yield creation
    finally:
        async with AsyncSession(creation["admin"]) as tx, tx.begin():
            for model in (KnowledgeState, BusinessPolicy):
                await tx.execute(delete(model).where(model.environment_id == creation["environment"]))


async def read(c, auth, identity, **params):
    return await c["client"].get(f"/customer/v2/creations/{identity}/agent-preparation", headers=auth, params=params)


async def snapshot(c, identity, user_id):
    async with AsyncSession(c["admin"]) as tx:
        creation = await tx.get(Creation, identity)
        sessions = list(await tx.scalars(select(Session).where(Session.user_id == user_id)))
        jobs = list(await tx.scalars(select(Job).where(Job.creation_id == identity)))
        return {"creation": {k: getattr(creation, k) for k in ("status", "stage", "current_revision",
            "job_sequence", "event_sequence", "active_job_id", "failure_code", "updated_at")},
            "sessions": [(s.id, s.expires_at, s.revoked_at) for s in sessions],
            "jobs": [(j.id, j.status, j.usage, j.lease_until, j.failure_code) for j in jobs]}


async def candidate(c, me, canonical_host):
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        business = Business(id=new_id(), site_id="customer-qa-" + c["environment"], canonical_host=canonical_host)
        tx.add(business)
        await tx.flush()
        portfolio = me["portfolios"][0]
        grant = BusinessGrant(id=new_id(), environment_id=c["environment"], portfolio_id=portfolio["portfolio_id"],
            organization_id=portfolio["organization_id"], business_id=business.id, display_name="Synthetic candidate",
            connection_status="connected", runtime_status="unknown", evidence_revision="a" * 40, enabled=True)
        tx.add(grant)
        return business.id, business.site_id


async def index_native(c, identity, site, canonical_host):
    now = utcnow()
    metadata = {"site_id": site, "canonical_host": canonical_host, "contact_email": "operator@agent.example",
        "operator": "Synthetic candidate only", "deployment_id": "synthetic-test", "generated_at": now.isoformat()}
    pages = [{"id": "synthetic-approved", "title": "Synthetic source", "url": f"https://{canonical_host}/guide/",
        "revision_hash": "1" * 64, "projection_hash": "2" * 64, "text": "Synthetic accepted source projection."}]
    material = knowledge_index.content_hash(metadata, pages)
    from pinet_core.db import db
    async with db.transaction(identity, c["environment"]) as tx:
        item = await tx.get(Business, identity)
        await knowledge_index.begin(tx, item, knowledge_index.Begin(schema_version=2, transfer_id="synthetic-index",
            base_revision=0, metadata=metadata, page_count=1, fragment_count=1, content_hash=material))
        await knowledge_index.batch(tx, item, knowledge_index.Batch(transfer_id="synthetic-index", fragments=[{
            "ordinal": 0, "page_ordinal": 0, "part": 0, "parts": 1, **pages[0]}]))
        await knowledge_index.commit(tx, item, knowledge_index.Commit(transfer_id="synthetic-index", content_hash=material))
        await onboarding.update(tx, item, onboarding.Readiness(source_ready=True, learning_admitted=False))


async def test_no_revision_read_is_blocked_and_does_not_mutate_jobs_or_session(preparation):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity = row["creation_id"]
    before = await snapshot(c, identity, me["user_id"])
    response = await read(c, auth, identity)
    assert response.status_code == 200, response.text
    value = response.json()["data"]
    assert response.json()["contract_version"] == "agent-preparation.v1"
    assert value["state"] == "blocked" and value["accepted_revision"] is None and value["candidate_sha256"] is None
    assert value["team_review"]["state"] == "no_revision"
    assert value["activation"] == "not_performed" and value["can_activate"] is False
    assert value["mapping"]["candidate"] is None and value["runtime"]["scope"] == "unmapped"
    assert len(value["checks"]) == 14 and "accepted_revision" in value["blocker_keys"]
    assert response.headers["cache-control"] == "private, no-store"
    assert await snapshot(c, identity, me["user_id"]) == before
    assert (await read(c, auth, identity, accepted_revision=1)).status_code == 409
    for params in ({"accepted_revision": 0}, {"accepted_revision": 21}, {"accepted_revision": "bad"}, {"ignored": "yes"}):
        assert (await read(c, auth, identity, **params)).status_code == 400
    path = f"/customer/v2/creations/{identity}/agent-preparation?accepted_revision=1&accepted_revision=1"
    assert (await c["client"].get(path, headers=auth)).status_code == 400
    assert (await c["client"].post(path, headers=auth)).status_code == 405
    assert await snapshot(c, identity, me["user_id"]) == before


async def test_exhausted_attempt_budget_keeps_readonly_preparation_available(preparation, monkeypatch):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity = row["creation_id"]
    monkeypatch.setattr(settings(), "creation_daily_limit", 1)
    assert await worker.execute_once(result)
    before = await snapshot(c, identity, me["user_id"])
    denied = await c["client"].post(f"/customer/v2/creations/{identity}/revisions", headers=auth,
        json={"base_revision": 1, "message": "Patikrink pirmą išsaugotą versiją.", "idempotency_key": str(uuid4())})
    assert denied.status_code == 429 and denied.json()["code"] == "creation_daily_limit"
    response = await read(c, auth, identity, accepted_revision=1)
    assert response.status_code == 200, response.text
    assert response.json()["data"]["state"] == "blocked"
    assert response.json()["data"]["team_review"]["state"] == "unreviewed"
    assert await snapshot(c, identity, me["user_id"]) == before


async def test_legacy_intake_revision_and_source_identity_are_not_team_acceptance(preparation, monkeypatch):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity = row["creation_id"]
    assert await worker.execute_once(result, intake_runner=studio.import_draft)
    old_content = (await c["client"].get(f"/customer/v2/creations/{identity}/content", headers=auth)).json()["data"]
    before = await snapshot(c, identity, me["user_id"])
    response = await read(c, auth, identity, accepted_revision=1)
    assert response.status_code == 200, response.text
    value = response.json()["data"]
    checks = {c["key"]: c for c in value["checks"]}
    assert all(checks[k]["status"] == "PASS" for k in ("source_pin", "private_intake"))
    assert checks["accepted_revision"]["status"] == "FAIL"
    assert checks["accepted_revision"]["code"] == "private_revision_unreviewed"
    assert value["team_review"]["state"] == "unreviewed" and value["team_review"]["accepted_candidate_sha256"] is None
    actual_team = (await c["client"].get(f"/customer/v2/creations/{identity}/team", headers=auth)).json()["data"]
    assert actual_team["accepted_candidate_sha256"] is None
    assert value["candidate_sha256"] == old_content["candidate_sha256"]
    assert value["intake"]["page_count"] == 3 and value["intake"]["approved_page_count"] == 0
    assert value["intake"]["observation_scope"] == "intake_snapshot"
    assert checks["creation_business_binding"]["code"] == "creation_business_binding_missing"
    assert checks["v2_session"]["code"] == "v2_session_admission_missing" and value["can_activate"] is False
    for forbidden in ("info@pinet.lt", "MB Pinet", "dataDir", "outputDir", "manifestPath", "runtime/artifacts", "password"):
        assert forbidden not in response.text
    assert await snapshot(c, identity, me["user_id"]) == before
    assert (await c["client"].get(f"/customer/v2/creations/{identity}/content", headers=auth)).json()["data"] == old_content
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    changed = (await read(c, auth, identity, accepted_revision=1)).json()
    assert changed["source_revision"] == "b" * 40 and changed["data"]["accepted_source_revision"] == "a" * 40
    assert next(c for c in changed["data"]["checks"] if c["key"] == "source_pin")["code"] == "accepted_source_outdated"
    assert (await read(c, auth, identity, accepted_revision=2)).status_code == 409


async def test_actual_team_acceptance_and_revision_transition_recheck_exact_identity(preparation):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity, calls = row["creation_id"], []
    assert await worker.execute_once(role_runner=runner(calls), intake_runner=studio.import_draft)
    assert calls == ["creator", "critic", "coordinator"]
    first = (await read(c, auth, identity, accepted_revision=1)).json()["data"]
    assert first["team_review"]["state"] == "accepted"
    assert first["team_review"]["accepted_candidate_sha256"] == first["candidate_sha256"]
    assert next(c for c in first["checks"] if c["key"] == "accepted_revision")["status"] == "PASS"
    assert first["intake"]["page_count"] == 3 and first["can_activate"] is False
    response = await c["client"].post(f"/customer/v2/creations/{identity}/revisions", headers=auth,
        json={"base_revision": 1, "message": "Dar kartą patikrink verslo faktų ir kontakto ribas.",
              "idempotency_key": str(uuid4())})
    assert response.status_code == 202, response.text
    before = await snapshot(c, identity, me["user_id"])
    pending = (await read(c, auth, identity, accepted_revision=1)).json()["data"]
    assert pending["accepted_revision"] == 1 and pending["team_review"]["state"] == "accepted"
    assert next(c for c in pending["checks"] if c["key"] == "accepted_revision")["code"] == "creation_revision_pending"
    assert await snapshot(c, identity, me["user_id"]) == before
    assert await worker.execute_once(role_runner=runner([]), intake_runner=studio.import_draft)
    assert (await read(c, auth, identity, accepted_revision=1)).status_code == 409
    second_response = await read(c, auth, identity, accepted_revision=2)
    assert second_response.status_code == 200, second_response.text
    second = second_response.json()["data"]
    assert second["accepted_revision"] == 2 and second["team_review"]["state"] == "accepted"
    assert second["team_review"]["accepted_candidate_sha256"] == second["candidate_sha256"]
    actual_team = (await c["client"].get(f"/customer/v2/creations/{identity}/team", headers=auth)).json()["data"]
    assert actual_team["accepted_candidate_sha256"] == second["candidate_sha256"]
    assert second["can_activate"] is False and "creation_business_binding" in second["blocker_keys"]


@pytest.mark.parametrize("damage", ["payload", "intake"])
async def test_changed_accepted_source_is_distinct_service_failure(preparation, damage):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity = row["creation_id"]
    assert await worker.execute_once(result, intake_runner=studio.import_draft)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if damage == "payload":
            revision = await tx.scalar(select(Revision).where(Revision.creation_id == identity))
            await tx.execute(update(Revision).where(Revision.id == revision.id).values(payload={**revision.payload,
                "business_name": "Changed synthetic source"}))
        else:
            job = await tx.scalar(select(Job).where(Job.creation_id == identity))
            job.usage = {**job.usage, "content_intake": {**job.usage["content_intake"], "sourceHash": "0" * 64}}
    response = await read(c, auth, identity)
    assert response.status_code == 503 and response.json()["code"] in {"invalid_agent_source", "invalid_content_source"}
    assert "data" not in response.json()


@pytest.mark.parametrize("revocation", ["session", "membership", "account", "user"])
async def test_current_authority_revocation_and_foreign_owner_isolation(preparation, revocation):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity = row["creation_id"]
    _, foreign, _ = await verified(c)
    assert (await read(c, foreign, identity)).status_code == 404
    assert (await c["client"].get(f"/customer/v2/creations/{identity}/agent-preparation")).status_code == 401
    assert (await read(c, auth, identity)).status_code == 200
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if revocation == "session":
            await tx.execute(update(Session).where(Session.user_id == me["user_id"]).values(revoked_at=utcnow()))
        elif revocation == "membership":
            await tx.execute(update(Membership).where(Membership.user_id == me["user_id"]).values(role="viewer"))
        elif revocation == "account":
            await tx.execute(update(Account).where(Account.user_id == me["user_id"]).values(verified_at=None))
        else:
            await tx.execute(update(User).where(User.id == me["user_id"]).values(enabled=False))
    response = await read(c, auth, identity)
    assert response.status_code == (401 if revocation in {"session", "user"} else 404)
    assert identity not in response.text


async def test_same_host_foreign_grant_cannot_be_read_or_claimed(preparation):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    _, _, foreign_me = await verified(c)
    business_id, _ = await candidate(c, foreign_me, row["canonical_host"])
    response = await read(c, auth, row["creation_id"])
    assert response.status_code == 200
    value = response.json()["data"]
    assert value["mapping"]["state"] == "missing" and value["mapping"]["candidate"] is None
    assert business_id not in response.text and value["runtime"]["knowledge_state"] == "not_observed"


async def test_real_owned_v2_registration_is_only_candidate_and_revocation_stays_current(preparation):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    identity = row["creation_id"]
    assert await worker.execute_once(result, intake_runner=studio.import_draft)
    business_id, site = await candidate(c, me, row["canonical_host"])
    await index_native(c, business_id, site, row["canonical_host"])
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        tx.add(BusinessPolicy(business_id=business_id, environment_id=c["environment"], revision=1,
            payload={"enabled": True, "paused": False, "followup_enabled": True}))
    response = await read(c, auth, identity)
    assert response.status_code == 200, response.text
    value = response.json()["data"]
    assert value["mapping"]["state"] == "candidate_unbound" and value["mapping"]["confirmed_business_id"] is None
    assert value["mapping"]["candidate"]["business_id"] == business_id and value["can_activate"] is False
    assert value["runtime"]["knowledge_state"] == "v2_current" and value["runtime"]["knowledge_active_page_count"] == 1
    assert value["runtime"]["source_admitted"] is True and value["runtime"]["learning_admitted"] is False
    assert value["runtime"]["policy_enabled"] is True and value["runtime"]["profile_registered"] is False
    checks = {c["key"]: c for c in value["checks"]}
    assert checks["v2_knowledge"]["status"] == "UNVERIFIED" and checks["v2_knowledge"]["code"] == "knowledge_creation_binding_missing"
    assert checks["business_profile"]["status"] == "FAIL" and checks["site_voice"]["status"] == "FAIL"
    assert "operator@agent.example" not in response.text and "Synthetic candidate only" not in response.text
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == business_id,
            KnowledgeState.environment_id == c["environment"]))
        state.refreshed_at = utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 5)
    assert (await read(c, auth, identity)).json()["data"]["runtime"]["knowledge_state"] == "v2_expired"
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        grant = await tx.scalar(select(BusinessGrant).where(BusinessGrant.business_id == business_id,
            BusinessGrant.environment_id == c["environment"]))
        grant.enabled = False
    revoked = (await read(c, auth, identity)).json()["data"]
    assert revoked["mapping"]["state"] == "missing" and revoked["runtime"]["knowledge_state"] == "not_observed"
    assert business_id not in json.dumps(revoked)


@pytest.mark.parametrize("change", ["revoke", "source", "host"])
async def test_registration_changed_during_observation_denies_stale_candidate_projection(preparation, monkeypatch, change):
    c = preparation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    business_id, _ = await candidate(c, me, row["canonical_host"])
    original, revoked = knowledge.current, []

    async def revoke_during_read(tx):
        state = await original(tx)
        if not revoked:
            async with AsyncSession(c["admin"]) as admin_tx, admin_tx.begin():
                if change == "host":
                    await admin_tx.execute(update(Business).where(Business.id == business_id)
                        .values(canonical_host="changed.agent.example"))
                else:
                    await admin_tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == business_id,
                        BusinessGrant.environment_id == c["environment"]).values(**(
                            {"enabled": False} if change == "revoke" else {"evidence_revision": "b" * 40})))
            revoked.append(True)
        return state

    monkeypatch.setattr(knowledge, "current", revoke_during_read)
    response = await read(c, auth, row["creation_id"])
    assert revoked and response.status_code == (404 if change == "revoke" else 409), response.text
    assert "data" not in response.json() and business_id not in response.text
