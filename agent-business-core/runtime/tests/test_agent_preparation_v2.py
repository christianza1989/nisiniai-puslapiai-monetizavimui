"""Actual restricted PostgreSQL current binding and read-only projection; zero provider."""
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_agent_preparation import candidate, index_native, snapshot
from test_creation_registration import accepted, counts, provision
from test_creation_registration import registration as registration_fixture
from test_creation_team import runner
from test_customer_creations import creation, start  # noqa: F401
from test_customer_public import customers, verified  # noqa: F401

from pinet_core import knowledge
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.creation import studio, worker
from pinet_core.creation.models import Job, Revision
from pinet_core.creation_registration import admin
from pinet_core.models import BusinessPolicy, KnowledgeState

registration = registration_fixture


@pytest.fixture
async def preparation_v2(registration):
    c = registration
    try:
        yield c
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            for model in (KnowledgeState, BusinessPolicy):
                await tx.execute(delete(model).where(model.environment_id == c["environment"]))


async def read(c, request, auth, **params):
    return await c["client"].get(f"/customer/v2/creations/{request['creation_id']}/agent-preparation-v2",
        headers=auth, params=params)


async def read_registration(c, request, auth):
    return await c["client"].get(f"/customer/v2/creations/{request['creation_id']}/registration", headers=auth)


async def test_no_revision_is_typed_blocked_and_readonly_with_strict_query(preparation_v2):
    c = preparation_v2
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    request = {"creation_id": row["creation_id"]}
    before = await snapshot(c, row["creation_id"], me["user_id"]), await counts(c)
    response = await read(c, request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert response.json()["contract_version"] == "agent-preparation.v2"
    assert response.headers["cache-control"] == "private, no-store"
    assert data["registration"]["state"] == "missing" and data["runtime"]["scope"] == "unmapped"
    assert len(data["checks"]) == 14 and not data["can_activate"] and data["team_review"]["state"] == "no_revision"
    assert (await snapshot(c, row["creation_id"], me["user_id"]), await counts(c)) == before
    for params in ({"unknown": "1"}, {"accepted_revision": "bad"}, {"accepted_revision": 0}, {"accepted_revision": 21}):
        assert (await read(c, request, auth, **params)).status_code == 400
    assert (await read(c, request, auth, accepted_revision=1)).status_code == 409
    path = f"/customer/v2/creations/{row['creation_id']}/agent-preparation-v2?accepted_revision=1&accepted_revision=1"
    assert (await c["client"].get(path, headers=auth)).status_code == 400
    assert (await c["client"].post(path, headers=auth)).status_code == 405


async def test_same_host_owned_candidate_never_enters_runtime_scope_without_durable_binding(preparation_v2, monkeypatch):
    c = preparation_v2
    request, _, auth, me = await accepted(c)
    host = (await c["client"].get(f"/customer/v2/creations/{request['creation_id']}", headers=auth)).json()["data"]["canonical_host"]
    identity, site = await candidate(c, me, host)
    c["registered_business_ids"].add(identity)
    await index_native(c, identity, site, host)

    async def forbidden_scope(tx):
        pytest.fail("Unbound same-host candidate entered legacy runtime scope")

    monkeypatch.setattr(knowledge, "current", forbidden_scope)
    response = await read(c, request, auth)
    assert response.status_code == 200, response.text
    value = response.json()["data"]
    assert value["registration"]["state"] == "missing" and value["runtime"]["scope"] == "unmapped"
    assert value["runtime"]["knowledge_state"] == "not_observed" and identity not in response.text


async def test_real_current_registration_observes_owned_runtime_preserves_v1_and_does_not_activate(preparation_v2, monkeypatch):
    c = preparation_v2
    request, _, auth, me = await accepted(c)
    registered = await provision(c, request)
    registration = (await read_registration(c, request, auth)).json()["data"]
    await index_native(c, registered["business_id"], registered["site_id"], registration["registration"]["canonical_host"])
    before = await snapshot(c, request["creation_id"], me["user_id"]), await counts(c)
    response = await read(c, request, auth, accepted_revision=1)
    assert response.status_code == 200, response.text
    value = response.json()["data"]
    assert value["registration"]["binding_current"] and value["registration"]["registration"] == registration["registration"]
    assert value["runtime"]["scope"] == "current_registered_business" and value["runtime"]["knowledge_state"] == "v2_current"
    assert value["runtime"]["source_admitted"] and not value["runtime"]["learning_admitted"]
    assert not value["runtime"]["profile_registered"] and not value["can_activate"]
    checks = {item["key"]: item for item in value["checks"]}
    assert all(checks[k]["status"] == "PASS" for k in ("accepted_revision", "private_intake", "business_registration", "creation_business_binding"))
    assert checks["v2_knowledge"]["status"] == "UNVERIFIED"
    assert checks["business_profile"]["status"] == checks["v2_session"]["status"] == "FAIL"
    for forbidden in ("operator@agent.example", "Synthetic candidate only", "authorizing_session", "manifestPath", "password", "MB Pinet", "info@pinet.lt"):
        assert forbidden not in response.text
    assert (await snapshot(c, request["creation_id"], me["user_id"]), await counts(c)) == before
    old = await c["client"].get(f"/customer/v2/creations/{request['creation_id']}/agent-preparation", headers=auth)
    assert old.status_code == 200 and old.json()["contract_version"] == "agent-preparation.v1"
    assert old.json()["data"]["mapping"]["state"] == "candidate_unbound"
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    changed = (await read(c, request, auth)).json()
    assert changed["source_revision"] == "b" * 40 and changed["data"]["accepted_source_revision"] == "a" * 40
    assert changed["data"]["registration"]["binding_current"]
    assert next(x for x in changed["data"]["checks"] if x["key"] == "source_pin")["code"] == "accepted_source_outdated"


@pytest.mark.parametrize("state", ["revoked", "grant_revoked", "pending", "stale"])
async def test_obsolete_registration_never_reads_business_runtime(preparation_v2, monkeypatch, state):
    c = preparation_v2
    request, _, auth, _ = await accepted(c)
    registered = await provision(c, request)
    if state == "revoked":
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await admin.revoke(tx, environment=c["environment"], registration_id=registered["registration_id"],
                candidate_sha256=request["candidate_sha256"])
    elif state == "grant_revoked":
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == registered["business_id"])
                .values(enabled=False))
    else:
        response = await c["client"].post(f"/customer/v2/creations/{request['creation_id']}/revisions", headers=auth,
            json={"base_revision": 1, "message": "Patikrink naują verslo pasiūlymo versiją.", "idempotency_key": str(uuid4())})
        assert response.status_code == 202, response.text
        if state == "stale":
            assert await worker.execute_once(role_runner=runner([]), intake_runner=studio.import_draft)

    async def forbidden_scope(tx):
        pytest.fail("Obsolete/pending registration entered legacy runtime scope")

    monkeypatch.setattr(knowledge, "current", forbidden_scope)
    response = await read(c, request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["registration"]["state"] == ("current" if state == "pending" else state)
    assert not data["registration"]["binding_current"] and data["runtime"]["scope"] == "unmapped"
    assert data["runtime"]["knowledge_state"] == "not_observed"


@pytest.mark.parametrize("change", ["binding_revoke", "grant_revoke", "payload", "intake"])
async def test_change_during_read_discards_runtime_or_denies_changed_source(preparation_v2, monkeypatch, change):
    c = preparation_v2
    request, _, auth, _ = await accepted(c)
    registered = await provision(c, request)
    original, modified = knowledge.current, []

    async def during_read(tx):
        observed = await original(tx)
        if not modified:
            async with AsyncSession(c["admin"]) as admin_tx, admin_tx.begin():
                if change == "binding_revoke":
                    await admin.revoke(admin_tx, environment=c["environment"], registration_id=registered["registration_id"],
                        candidate_sha256=request["candidate_sha256"])
                elif change == "grant_revoke":
                    await admin_tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == registered["business_id"])
                        .values(enabled=False))
                else:
                    revision = await admin_tx.scalar(select(Revision).where(Revision.creation_id == request["creation_id"]))
                    if change == "payload":
                        revision.payload = {**revision.payload, "business_name": "Changed synthetic source"}
                    else:
                        job = await admin_tx.get(Job, revision.job_id)
                        job.usage = {**job.usage, "content_intake": {**job.usage["content_intake"], "sourceHash": "0" * 64}}
            modified.append(True)
        return observed

    monkeypatch.setattr(knowledge, "current", during_read)
    response = await read(c, request, auth)
    assert modified
    if change in {"binding_revoke", "grant_revoke"}:
        assert response.status_code == 200, response.text
        value = response.json()["data"]
        assert value["registration"]["state"] == ("revoked" if change == "binding_revoke" else "grant_revoked")
        assert value["runtime"]["scope"] == "unmapped" and value["runtime"]["knowledge_state"] == "not_observed"
    else:
        assert response.status_code == 503 and "data" not in response.json()


async def test_foreign_and_unauthenticated_read_never_expose_accepted_business(preparation_v2):
    c = preparation_v2
    request, _, auth, _ = await accepted(c)
    registered = await provision(c, request)
    _, foreign, _ = await verified(c)
    denied = await read(c, request, foreign)
    assert denied.status_code == 404 and registered["business_id"] not in denied.text
    path = f"/customer/v2/creations/{request['creation_id']}/agent-preparation-v2"
    assert (await c["client"].get(path)).status_code == 401
    assert (await read(c, request, auth, accepted_revision=2)).status_code == 409
