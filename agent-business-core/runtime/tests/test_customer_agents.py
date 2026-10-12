"""Actual restricted PostgreSQL customer configuration, synthetic identity, zero provider."""
import asyncio
import os
import subprocess
import sys
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from fastapi.exceptions import ResponseValidationError
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import provision, session_id
from test_creation_team import runner
from test_customer_creations import start as start_creation
from test_customer_public import logged, verified
from test_customer_text import (  # noqa: F401 - actual shared fixture chain
    creation,
    customers,
    profile,
    registration,
)
from test_customer_text import text_customer as text_customer_fixture

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.control.routes import scope
from pinet_core.control_api import app
from pinet_core.creation import service as actor_service
from pinet_core.creation import studio, worker
from pinet_core.creation.models import Revision as CreationRevision
from pinet_core.creation_registration.models import Registration
from pinet_core.customer.models import Account
from pinet_core.customer_agents import routes as agent_routes
from pinet_core.customer_agents import service
from pinet_core.customer_agents.models import Agent, Config
from pinet_core.customer_profile.models import Admission
from pinet_core.models import Contact, Conversation, Event, Job, KnowledgeState, Outbox, utcnow

text_customer = text_customer_fixture


@pytest.fixture(autouse=True)
def module_configuration(monkeypatch):
    monkeypatch.setattr(settings(), "customer_agents_enabled", True)
    monkeypatch.setattr(service, "source_current", lambda: True)


def draft():
    return {"name": "Synthetic research assistant", "goal": "Find suitable synthetic customer segments",
        "audience": "Synthetic training businesses", "inputs": ["Customer's niche preference"],
        "outputs": ["Reviewed shortlist with evidence"], "boundaries": ["No contacting or sending"],
        "escalation": "Ask the owner when the source does not support the result",
        "autonomy": "recommendations_only", "sources": ["Approved synthetic business source"],
        "examples": [{"input": "Find possible synthetic customers", "expected": "Evidence-backed draft only"}],
        "unknowns": ["Actual channel access is unverified"]}


def path(c, suffix=""):
    return "/customer/v2/creations/" + c["request"]["creation_id"] + "/agents" + suffix


async def test_customer_can_save_agent_spec_and_reopen_by_server_id(text_customer):
    c = text_customer
    payload = {"request_id": str(uuid4()), "purpose": "customer_research", "configuration": draft()}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.post(path(c), headers=c["auth"], json=payload)
        assert response.status_code == 201, response.text
        data = response.json()["data"]
        assert data["action"] == "created" and data["configuration"]["revision"] == 1
        assert data["configuration"]["specification"] == draft()
        reopened = await client.get(path(c, "/" + data["agent"]["agent_id"]), headers=c["auth"])
        assert reopened.status_code == 200, reopened.text
        assert reopened.json()["data"]["configuration"] == data["configuration"]
        assert reopened.json()["data"]["readiness"]["can_activate"] is False


async def test_plan_linked_registered_business_cannot_skip_foundation(text_customer, monkeypatch):
    # The maintained fixture has a real accepted revision, Registration and grant.
    # Associate a synthetic discovery with it only in this isolated QA database,
    # to exercise the registration-only bypass without invoking a model/builder.
    from test_business_discovery import plan_roles

    from pinet_core.business_discovery import service as discovery_service
    from pinet_core.business_discovery import worker as discovery_worker
    from pinet_core.business_discovery.models import BuildApproval
    from pinet_core.business_discovery.wire import Start as DiscoveryStart
    from pinet_core.control.routes import token_hash
    from pinet_core.creation.models import Creation
    from pinet_core.creation.service import binding, digest
    from pinet_core.models import new_id

    c = text_customer
    monkeypatch.setattr(settings(), "business_discovery_enabled", True)
    monkeypatch.setattr(settings(), "business_discovery_runner_enabled", True)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        old = await saved(client, c)
        old_count = await counts(c)
        cid = c["request"]["creation_id"]
        async with AsyncSession(c["admin"]) as tx:
            owner = (await tx.get(Creation, cid)).user_id
        async with scope(user=owner) as tx:
            creation = await tx.get(Creation, cid)
            session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(c["token"])))
            row = await discovery_service.start(tx, session, DiscoveryStart(portfolio_id=creation.portfolio_id,
                message="Padėkite išsiaiškinti naujo verslo idėją.", idempotency_key=uuid4()))
            did = row.id
        assert await discovery_worker.execute_once(discovery_id=did, role_runner=plan_roles)
        async with scope(user=owner) as tx:
            creation = await tx.get(Creation, cid)
            session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(c["token"])))
            row = await discovery_service.owned(tx, session, did, lock=True)
            report = await discovery_service.latest(tx, row)
            key = str(uuid4())
            tx.add(BuildApproval(id=new_id(), discovery_id=did, report_id=report.id,
                report_revision=report.revision, report_sha256=report.material_hash, creation_id=cid,
                session_id=session.id, idempotency_key=key,
                fingerprint=digest({"discovery_id":did,"report_revision":report.revision,
                                    "report_sha256":report.material_hash,"idempotency_key":key}),
                **binding(creation)))
            row.status, row.linked_creation_id = "build_started", cid
        aid = old["agent"]["agent_id"]
        for enabled in (True, False):
            monkeypatch.setattr(settings(), "business_discovery_enabled", enabled)
            rejected = await client.post(path(c), headers=c["auth"], json=create_value())
            assert rejected.status_code == 409, rejected.text
            assert rejected.json()["code"] == "website_foundation_not_ready"
            revised = await client.post(path(c, "/" + aid + "/revisions"), headers=c["auth"], json={
                "request_id":str(uuid4()),"expected_revision":1,"configuration":draft()})
            assert revised.status_code == 409, revised.text
            assert revised.json()["code"] == "website_foundation_not_ready"
            historical = await client.get(path(c, "/" + aid), headers=c["auth"])
            assert historical.status_code == 200, historical.text
            assert historical.json()["data"]["configuration"] == old["configuration"]
            assert (await client.get(path(c), headers=c["auth"])).status_code == 200
            assert await counts(c) == old_count


def create_value(**change):
    return {"request_id": str(uuid4()), "purpose": "customer_research", "configuration": draft(), **change}


async def counts(c):
    async with AsyncSession(c["admin"]) as tx:
        return tuple([await tx.scalar(select(func.count()).select_from(model)
            .where(model.environment_id == c["environment"])) for model in (Agent, Config)])


async def unchanged_surfaces(c):
    async with AsyncSession(c["admin"]) as tx:
        snapshot = {}
        for model in (Admission, KnowledgeState, Conversation, Event, Job, Contact, Outbox):
            rows = list(await tx.scalars(select(model).where(model.environment_id == c["environment"])))
            snapshot[model.__tablename__] = sorted(
                [{column.name: getattr(row, column.name) for column in model.__table__.columns} for row in rows],
                key=lambda item: item["id"])
        return snapshot


async def saved(client, c, payload=None):
    response = await client.post(path(c), headers=c["auth"], json=payload or create_value())
    assert response.status_code == 201, response.text
    return response.json()["data"]


async def test_exact_replay_conflict_and_immutable_revisions_after_reload(text_customer):
    c = text_customer
    original = create_value()
    before = await unchanged_surfaces(c)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        first = await saved(client, c, original)
        agent_id = first["agent"]["agent_id"]
        replay = await saved(client, c, original)
        assert replay["action"] == "replayed" and replay["configuration"] == first["configuration"]
        conflict = await client.post(path(c), headers=c["auth"], json={**original, "purpose": "email"})
        assert conflict.status_code == 409 and conflict.json()["code"] == "idempotency_conflict"
        changed = {**draft(), "name": "Revised synthetic assistant", "goal": "Prepare a revised synthetic shortlist"}
        revision = {"request_id": str(uuid4()), "expected_revision": 1, "configuration": changed}
        revised = await client.post(path(c, "/" + agent_id + "/revisions"), headers=c["auth"], json=revision)
        assert revised.status_code == 200, revised.text
        second = revised.json()["data"]
        assert second["action"] == "revised" and second["configuration"]["revision"] == 2
        assert second["configuration"]["specification"] == changed
        again = await client.post(path(c, "/" + agent_id + "/revisions"), headers=c["auth"], json=revision)
        assert again.status_code == 200 and again.json()["data"]["action"] == "replayed"
        assert again.json()["data"]["configuration"] == second["configuration"]
        # Original UUID still reconciles its exact original receipt after later edits.
        late = await saved(client, c, original)
        assert late["action"] == "replayed" and late["configuration"] == first["configuration"]
        assert late["agent"]["name"] == changed["name"] and late["agent"]["current_revision"] == 2
        stale = await client.post(path(c, "/" + agent_id + "/revisions"), headers=c["auth"],
            json={**revision, "request_id": str(uuid4())})
        assert stale.status_code == 409 and stale.json()["code"] == "agent_revision_conflict"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as reopened:
        old = await reopened.get(path(c, "/" + agent_id + "/revisions/1"), headers=c["auth"])
        current = await reopened.get(path(c, "/" + agent_id), headers=c["auth"])
        assert old.status_code == current.status_code == 200
        assert old.json()["data"] == first["configuration"]
        assert current.json()["data"]["configuration"] == second["configuration"]
    assert await counts(c) == (1, 2)
    assert await unchanged_surfaces(c) == before


async def test_parallel_uuid_create_and_revision_cas_have_one_winner(text_customer):
    c = text_customer
    payload = create_value()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        replies = await asyncio.gather(*(client.post(path(c), headers=c["auth"], json=payload) for _ in range(2)))
        assert [r.status_code for r in replies] == [201, 201]
        assert {r.json()["data"]["action"] for r in replies} == {"created", "replayed"}
        agent_id = replies[0].json()["data"]["agent"]["agent_id"]
        revisions = [{"request_id": str(uuid4()), "expected_revision": 1,
            "configuration": {**draft(), "goal": "Synthetic competing revision " + str(i)}} for i in range(2)]
        results = await asyncio.gather(*(client.post(path(c, "/" + agent_id + "/revisions"),
            headers=c["auth"], json=value) for value in revisions))
        assert sorted(r.status_code for r in results) == [200, 409]
        final = await client.get(path(c, "/" + agent_id), headers=c["auth"])
        assert final.json()["data"]["configuration"]["revision"] == 2
    assert await counts(c) == (1, 2)


async def test_list_revision_pages_and_cursor_owner_session_purpose_boundaries(text_customer):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        empty = await client.get(path(c), headers=c["auth"])
        assert empty.status_code == 200 and empty.json()["data"]["items"] == []
        assert empty.json()["data"]["can_create_draft"] is True
        agents = [await saved(client, c) for _ in range(3)]
        original_ids = {row["agent"]["agent_id"] for row in agents}
        first = await client.get(path(c), headers=c["auth"], params={"limit": 1})
        data = first.json()["data"]
        assert data["has_more"] is True and len(data["items"]) == 1
        assert "specification" not in str(data["items"])
        seen = [data["items"][0]["agent_id"]]
        cursor = data["next_cursor"]
        list_cursor = cursor
        while cursor:
            response = await client.get(path(c), headers=c["auth"], params={"limit": 1, "cursor": cursor})
            assert response.status_code == 200
            data = response.json()["data"]
            seen += [row["agent_id"] for row in data["items"]]
            cursor = data.get("next_cursor")
        assert len(seen) == len(set(seen)) == 3 and set(seen) == original_ids
        agent_id = agents[0]["agent"]["agent_id"]
        for revision in (1, 2):
            response = await client.post(path(c, "/" + agent_id + "/revisions"), headers=c["auth"],
                json={"request_id": str(uuid4()), "expected_revision": revision, "configuration": draft()})
            assert response.status_code == 200
        revisions_path = path(c, "/" + agent_id + "/revisions")
        versions = await client.get(revisions_path, headers=c["auth"], params={"limit": 1})
        version_cursor = versions.json()["data"]["next_cursor"]
        assert versions.json()["data"]["items"][0]["revision"] == 3
        older = await client.get(revisions_path, headers=c["auth"], params={"limit": 50, "cursor": version_cursor})
        assert [row["revision"] for row in older.json()["data"]["items"]] == [2, 1]
        for wrong_path, wrong_cursor in ((revisions_path, list_cursor), (path(c), version_cursor),
                (path(c, "/" + agents[1]["agent"]["agent_id"] + "/revisions"), version_cursor)):
            denied = await client.get(wrong_path, headers=c["auth"], params={"cursor": wrong_cursor})
            assert denied.status_code in {400, 409}
        fresh = await logged(c, c["account"])
        denied = await client.get(path(c), headers=fresh, params={"cursor": list_cursor})
        assert denied.status_code == 400
        malformed = await client.get(path(c), headers=c["auth"], params={"cursor": "invalid"})
        assert malformed.status_code == 400
        missing = await client.get(path(c, "/" + agent_id + "/revisions/100"), headers=c["auth"])
        assert missing.status_code == 404


async def test_expired_profile_draft_save_does_not_renew_knowledge_or_admit_runtime(text_customer):
    c = text_customer
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"])
            .values(refreshed_at=utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)))
        await tx.execute(update(Admission).where(Admission.id == c["admitted"]["admission_id"]).values(revoked_at=utcnow()))
    before = await unchanged_surfaces(c)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        data = await saved(client, c)
        assert data["readiness"]["configuration_saved"] is True
        assert data["readiness"]["calibration_status"] == "UNVERIFIED"
        for key in ("can_calibrate", "can_activate", "provider_execution"):
            assert data["readiness"][key] is False
        assert data["agent"]["enabled"] is False
    assert before == await unchanged_surfaces(c)


@pytest.mark.parametrize("change", ["grant", "membership", "user", "account", "session", "expired_session"])
async def test_all_reads_and_writes_deny_revoked_current_authority(text_customer, change):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        data = await saved(client, c)
        agent_id = data["agent"]["agent_id"]
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            authorizing = await tx.get(Session, c["request"]["authorizing_session_id"])
            if change == "grant":
                await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == c["saved"]["business_id"]).values(enabled=False))
            elif change == "membership":
                await tx.execute(update(Membership).where(Membership.environment_id == c["environment"]).values(enabled=False))
            elif change == "user":
                await tx.execute(update(User).where(User.id == authorizing.user_id).values(enabled=False))
            elif change == "account":
                await tx.execute(update(Account).where(Account.user_id == authorizing.user_id).values(verified_at=None))
            elif change == "session":
                await tx.execute(update(Session).where(Session.id == authorizing.id).values(revoked_at=utcnow()))
            else:
                await tx.execute(update(Session).where(Session.id == authorizing.id).values(expires_at=utcnow() - timedelta(seconds=1)))
        before = await counts(c)
        for suffix in ("", "/" + agent_id, "/" + agent_id + "/revisions", "/" + agent_id + "/revisions/1"):
            response = await client.get(path(c, suffix), headers=c["auth"])
            assert response.status_code in {401, 404}, response.text
        response = await client.post(path(c), headers=c["auth"], json=create_value())
        assert response.status_code in {401, 404}
        response = await client.post(path(c, "/" + agent_id + "/revisions"), headers=c["auth"],
            json={"request_id": str(uuid4()), "expected_revision": 1, "configuration": draft()})
        assert response.status_code in {401, 404}
        assert await counts(c) == before


async def test_foreign_customer_and_creation_cannot_read_write_or_select_rls_rows(text_customer):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        data = await saved(client, c)
        agent_id = data["agent"]["agent_id"]
        _, foreign, _ = await verified(c)
        for suffix in ("", "/" + agent_id, "/" + agent_id + "/revisions", "/" + agent_id + "/revisions/1"):
            response = await client.get(path(c, suffix), headers=foreign)
            assert response.status_code == 404
        response = await client.post(path(c), headers=foreign, json=create_value())
        assert response.status_code == 404
        response = await client.get(path(c, "/" + agent_id).replace(c["request"]["creation_id"], str(uuid4())), headers=c["auth"])
        assert response.status_code == 404
        for method, suffix in (("GET", ""), ("POST", ""), ("GET", "/" + agent_id)):
            response = await client.request(method, path(c, suffix), json=create_value() if method == "POST" else None)
            assert response.status_code == 401
        token = service.bearer_token(foreign["Authorization"])
        async with scope(token=service.token_hash(token)) as tx:
            await service.customer_session(tx, token)
            assert not list(await tx.scalars(select(Agent)))
            assert not list(await tx.scalars(select(Config)))
    assert await counts(c) == (1, 1)


async def test_terminal_registration_retains_drafts_but_blocks_new_configurations(text_customer):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        data = await saved(client, c)
        agent_id = data["agent"]["agent_id"]
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Registration).where(Registration.id == c["saved"]["registration_id"]).values(revoked_at=utcnow()))
        read = await client.get(path(c, "/" + agent_id), headers=c["auth"])
        assert read.status_code == 200 and read.json()["data"]["configuration"] == data["configuration"]
        assert read.json()["data"]["readiness"]["can_edit_configuration"] is False
        listing = await client.get(path(c), headers=c["auth"])
        assert listing.status_code == 200 and listing.json()["data"]["can_create_draft"] is False
        assert listing.json()["data"]["configuration_blockers"] == ["agent_business_not_current"]
        assert (await client.post(path(c), headers=c["auth"], json=create_value())).status_code == 409
        response = await client.post(path(c, "/" + agent_id + "/revisions"), headers=c["auth"],
            json={"request_id": str(uuid4()), "expected_revision": 1, "configuration": draft()})
        assert response.status_code == 409
    assert await counts(c) == (1, 1)


@pytest.mark.parametrize("change", ["module", "smtp", "voice", "source", "schema"])
async def test_configuration_keeps_explicit_local_source_and_schema_guards(text_customer, monkeypatch, change):
    c = text_customer
    if change == "source":
        monkeypatch.setattr(service, "source_current", lambda: False)
    elif change == "schema":
        async def missing(tx):
            return False
        monkeypatch.setattr(service, "schema_ready", missing)
    else:
        monkeypatch.setattr(settings(), {"module": "customer_agents_enabled", "smtp": "smtp_enabled",
            "voice": "voice_enabled"}[change], change != "module")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.post(path(c), headers=c["auth"], json=create_value())
        assert response.status_code == (503 if change in {"source", "schema"} else 403)
    assert await counts(c) == (0, 0)


@pytest.mark.parametrize("late", ["source", "session_clock"])
async def test_final_git_wait_failure_or_session_expiry_rolls_back_both_rows(text_customer, monkeypatch, late):
    c = text_customer
    async with AsyncSession(c["admin"]) as tx:
        session = await tx.get(Session, c["request"]["authorizing_session_id"])
        future = session.expires_at + timedelta(seconds=1)
    calls = 0

    def source():
        nonlocal calls
        calls += 1
        if calls == 2:
            if late == "source":
                return False
            monkeypatch.setattr(actor_service, "utcnow", lambda: future)
        return True

    monkeypatch.setattr(service, "source_current", source)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.post(path(c), headers=c["auth"], json=create_value())
        assert response.status_code == (503 if late == "source" else 401)
    assert calls == 2 and await counts(c) == (0, 0)


async def test_database_identity_config_immutability_and_populated_downgrade_guard(text_customer):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        data = await saved(client, c)
    agent_id, revision_id = data["agent"]["agent_id"], data["configuration"]["revision_id"]
    for model, key, change in ((Agent, agent_id, {"purpose": "email"}),
            (Config, revision_id, {"payload": {"invalid": "rewrite"}}),
            (Agent, agent_id, {"current_revision": 2, "updated_at": utcnow()})):
        with pytest.raises(DBAPIError):
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(model).where(model.id == key).values(**change))
    result = await asyncio.to_thread(subprocess.run, [sys.executable, "-m", "alembic", "downgrade",
        "0021_customer_profile_history"], capture_output=True, env=os.environ.copy())
    assert result.returncode != 0
    assert b"Customer agent history exists" in result.stderr + result.stdout
    assert await counts(c) == (1, 1)


async def same_owner_business(c):
    me = await c["client"].get("/customer/v1/me", headers=c["auth"])
    assert me.status_code == 200
    row, _ = await start_creation(c, c["auth"], me.json()["data"], canonical_host=uuid4().hex + ".example.test")
    assert await worker.execute_once(role_runner=runner([]), intake_runner=studio.import_draft)
    async with AsyncSession(c["admin"]) as tx:
        accepted = await tx.scalar(select(CreationRevision).where(CreationRevision.creation_id == row["creation_id"],
            CreationRevision.sequence == 1))
    request = {"creation_id": row["creation_id"], "accepted_revision": 1,
        "candidate_sha256": accepted.material_hash, "accepted_source_revision": accepted.source_revision,
        "authorizing_session_id": await session_id(c, c["auth"])}
    registry = await provision(c, request)
    return {**c, "request": request, "saved": registry}


async def test_authorizing_login_deletion_cannot_remove_immutable_prior_revision(text_customer):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        first = await saved(client, c)
        agent_id = first["agent"]["agent_id"]
        authorizers = [await logged(c, c["account"]) for _ in range(2)]
        authorizer_ids = [await session_id(c, auth) for auth in authorizers]
        assert len({c["request"]["authorizing_session_id"], *authorizer_ids}) == 3
        for expected, auth in enumerate(authorizers, 1):
            response = await client.post(path(c, "/" + agent_id + "/revisions"), headers=auth,
                json={"request_id": str(uuid4()), "expected_revision": expected, "configuration": draft()})
            assert response.status_code == 200, response.text

    async def retained():
        async with AsyncSession(c["admin"]) as tx:
            snapshot = {}
            for model in (Agent, Config, Session):
                rows = list(await tx.scalars(select(model).where(model.environment_id == c["environment"])))
                snapshot[model.__tablename__] = sorted(
                    [{column.name: getattr(row, column.name) for column in model.__table__.columns} for row in rows],
                    key=lambda item: item["id"])
            return snapshot

    before = await retained()
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(Session).where(Session.id == authorizer_ids[0]))
    assert await retained() == before
    assert await counts(c) == (1, 3)


async def test_lost_receipt_after_commit_reconciles_original_uuid_without_duplicate(text_customer, monkeypatch):
    c = text_customer
    value = create_value()
    normal = agent_routes.envelope

    def lost(request, data):
        return {**normal(request, data), "synthetic_invalid_response": True}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        monkeypatch.setattr(agent_routes, "envelope", lost)
        with pytest.raises(ResponseValidationError):
            await client.post(path(c), headers=c["auth"], json=value)
        assert await counts(c) == (1, 1)
        monkeypatch.setattr(agent_routes, "envelope", normal)
        receipt = await saved(client, c, value)
        assert receipt["action"] == "replayed"
        current = await client.get(path(c, "/" + receipt["agent"]["agent_id"]), headers=c["auth"])
        assert current.json()["data"]["configuration"] == receipt["configuration"]
    assert await counts(c) == (1, 1)


async def test_more_than_twenty_configuration_revisions_remain_exactly_readable(text_customer):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        first = await saved(client, c)
        agent_id = first["agent"]["agent_id"]
        for expected in range(1, 22):
            response = await client.post(path(c, "/" + agent_id + "/revisions"), headers=c["auth"],
                json={"request_id": str(uuid4()), "expected_revision": expected,
                    "configuration": {**draft(), "goal": "Synthetic retained revision " + str(expected + 1)}})
            assert response.status_code == 200, response.text
            assert response.json()["data"]["configuration"]["revision"] == expected + 1
        page = await client.get(path(c, "/" + agent_id + "/revisions"), headers=c["auth"])
        assert len(page.json()["data"]["items"]) == 20 and page.json()["data"]["has_more"] is True
        remainder = await client.get(path(c, "/" + agent_id + "/revisions"), headers=c["auth"],
            params={"cursor": page.json()["data"]["next_cursor"]})
        assert [row["revision"] for row in remainder.json()["data"]["items"]] == [2, 1]
        for revision in (1, 21, 22):
            exact = await client.get(path(c, "/" + agent_id + "/revisions/" + str(revision)), headers=c["auth"])
            assert exact.status_code == 200 and exact.json()["data"]["revision"] == revision
    assert await counts(c) == (1, 22)


async def test_hidden_retained_uuid_on_revoked_business_is_conflict_for_current_business(text_customer):
    c = text_customer
    value = create_value()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        await saved(client, c, value)
        other = await same_owner_business(c)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == c["saved"]["business_id"]).values(enabled=False))
        response = await client.post(path(other), headers=c["auth"], json=value)
        assert response.status_code == 409, response.text
        assert response.json()["code"] == "idempotency_conflict"
        assert await counts(c) == (1, 1)
