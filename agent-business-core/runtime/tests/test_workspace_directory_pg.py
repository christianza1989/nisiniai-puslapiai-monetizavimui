"""Provider-zero ordinary scoped catalogue, canonical draft data and task context."""
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401
from test_workspace_read_pg import saved_registration, seed
from test_workspace_team_pg import team  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.control.routes import token_hash
from pinet_core.creation.models import Creation
from pinet_core.creation.service import binding, digest
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_agents.models import Agent, Config
from pinet_core.customer_agents.service import config_material
from pinet_core.customer_profile.models import REGISTRATION_KEYS
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskRun
from pinet_core.workspace_team import directory
from pinet_core.workspace_team.models import TeamTurn
from pinet_core.workspace_team.policy import KIND


@pytest.fixture
async def directory_customer(team):  # noqa: F811
    c = team
    c["workspace_business_ids"] = set()
    try:
        yield c
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(Agent).where(Agent.environment_id == c["environment"]))
            await tx.execute(delete(Registration).where(Registration.environment_id == c["environment"]))


async def setup(c, count=3, *, revision=2):
    _, auth, me = await verified(c)
    settings().workspace_team_actor_ids = [me["user_id"]]
    records = await seed(c, auth, me)
    reg = await saved_registration(c, auth, me, records, revision=revision)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        registry = await tx.get(Registration, reg["registration"])
        from pinet_core.control.models import Session
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        for n in range(count):
            agent = Agent(id=str(uuid4()), **binding(registry),
                **{key: getattr(registry, key) for key in REGISTRATION_KEYS if key not in binding(registry)},
                registration_id=registry.id, registration_fingerprint=registry.fingerprint,
                purpose="custom", current_revision=1)
            tx.add(agent)
            await tx.flush()
            spec = {"name": f"Sintetinis dizaino aprašas {n}", "goal": "Įvertinti tik savininko pateiktą sintetinį maketą.",
                "audience": "Sintetinis savininkas", "inputs": ["Pateiktas maketas"], "outputs": ["Patikros pasiūlymas"],
                "boundaries": ["Jokių išorinių veiksmų"], "escalation": "Trūkstamus faktus nurodyti savininkui",
                "autonomy": "recommendations_only", "sources": ["PRIVATE_SOURCE_NEVER_DIRECTORY"],
                "examples": [{"input": "SYNTHETIC_PROTECTED_EXAMPLE", "expected": "Sintetinė išvada"}], "unknowns": []}
            config = Config(id=str(uuid4()), agent_id=agent.id, revision=1, payload=spec,
                saved_source_revision="a"*40, idempotency_key=str(uuid4()), request_fingerprint="a"*64,
                authorizing_session_id=session.id, **binding(agent))
            config.config_sha256 = digest(config_material(agent, config))
            tx.add(config)
    pid = me["portfolios"][0]["portfolio_id"]
    base = f"/customer/v2/portfolios/{pid}/workspace-topics"
    response = await c["client"].post(base, headers=auth, json={"idempotency_key": str(uuid4()), "title": "Sintetinė katalogo tema",
        "anchor": {"kind": "business", "selection_id": reg["business"]}})
    assert response.status_code == 200, response.text
    return auth, me, base+"/"+response.json()["data"]["current_topic"]["topic_id"], records, reg


async def read(c, auth, base, params=None):
    result = await c["client"].get(base+"/team/directory", headers=auth, params=params)
    assert result.status_code == 200, result.text
    assert result.json()["contract_version"] == "workspace-directory.v1"
    return result.json()["data"]


async def test_directory_joins_exact_immutable_config_pages_and_never_dispatches(directory_customer):
    c = directory_customer
    auth, _, base, _, _ = await setup(c)
    first = await read(c, auth, base, {"limit": 2})
    assert first["total_count"] == 3 and len(first["items"]) == 2 and first["has_more"]
    second = await read(c, auth, base, {"limit": 2, "cursor": first["next_cursor"]})
    assert not second["has_more"] and len(second["items"]) == 1
    assert first["snapshot_sha256"] == second["snapshot_sha256"]
    assert len({r["agent_id"] for r in first["items"]+second["items"]}) == 3
    for r in first["items"]:
        assert r["configuration_state"] == "draft" and r["business_state"] == "current"
        assert r["availability"] == "not_admitted" and not r["can_delegate"] and not r["provider_execution"]
        assert r["calibration_status"] == "UNVERIFIED"
    assert "PRIVATE_SOURCE_NEVER_DIRECTORY" not in str(first) and "SYNTHETIC_PROTECTED_EXAMPLE" not in str(first)
    async with AsyncSession(c["admin"]) as tx:
        for model in (Task, TaskRun, TeamTurn):
            assert list(await tx.scalars(select(model).where(model.environment_id == c["environment"]))) == []


async def test_latest_revoked_registration_never_resurrects_old_drafts(directory_customer):
    c = directory_customer
    auth, me, base, records, reg = await setup(c, revision=1)
    assert (await read(c, auth, base))["total_count"] == 3
    # Old revision1 remains granted/unrevoked with drafts, but a revoked latest2 wins.
    await saved_registration(c, auth, me, records, revision=2, existing=reg, revoked=True)
    assert (await read(c, auth, base))["items"] == []


async def test_stale_creation_keeps_history_with_not_current_state_and_invalidates_cursor(directory_customer):
    c = directory_customer
    auth, _, base, records, _ = await setup(c)
    first = await read(c, auth, base, {"limit": 1})
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        creation = await tx.get(Creation, records["creation"])
        creation.current_revision = 3
    result = await c["client"].get(base+"/team/directory", headers=auth, params={"cursor": first["next_cursor"]})
    assert result.status_code == 409
    fresh = await read(c, auth, base)
    assert len(fresh["items"]) == 3 and all(r["business_state"] == "not_current" for r in fresh["items"])


async def test_cursor_cannot_cross_topic_and_current_revocation_hides_directory(directory_customer):
    c = directory_customer
    auth, me, base, _, reg = await setup(c)
    first = await read(c, auth, base, {"limit": 1})
    pid = me["portfolios"][0]["portfolio_id"]
    response = await c["client"].post(f"/customer/v2/portfolios/{pid}/workspace-topics", headers=auth,
        json={"idempotency_key": str(uuid4()), "title": "Kita katalogo tema", "anchor": {"kind": "business", "selection_id": reg["business"]}})
    other = response.json()["data"]["current_topic"]["topic_id"]
    foreign = await c["client"].get(f"/customer/v2/portfolios/{pid}/workspace-topics/{other}/team/directory", headers=auth,
        params={"cursor": first["next_cursor"]})
    assert foreign.status_code in (400, 409)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.id == reg["grant"]).values(enabled=False))
    denied = await c["client"].get(base+"/team/directory", headers=auth)
    assert denied.status_code == 404


async def test_coordinator_context_pins_bounded_drafts_without_admission_or_private_specs(directory_customer):
    c = directory_customer
    auth, me, base, _, _ = await setup(c, 22)
    accepted = await c["client"].post(base+"/team/turns", headers=auth,
        json={"idempotency_key": str(uuid4()), "content": "Kuriuos agentų aprašus jau turiu?", "reply_to_event_id": None})
    assert accepted.status_code == 200, accepted.text
    packets = []
    async def injected(phase, packet, heartbeat):
        assert await heartbeat()
        packets.append(packet)
        return {"answer": "Tai tik išsaugoti aprašai; vykdymas nesuteiktas.", "limitations": [],
            "decision": "answer", "assignment": None}, {"input_tokens": 1}
    assert await worker.execute_once(kind=KIND, adapter=injected)
    directory = packets[0]["configured_agents"]
    assert directory["total_count"] == 22 and directory["omitted_count"] == 2 and len(directory["items"]) == 20
    assert directory["execution_authority"] == "none"
    assert "PRIVATE_SOURCE_NEVER_DIRECTORY" not in str(packets) and "SYNTHETIC_PROTECTED_EXAMPLE" not in str(packets)
    assert {p["role"] for p in packets[0]["roster"]} == {"coordinator", "adviser"}


@pytest.mark.parametrize("authority", ["session", "grant", "membership"])
async def test_late_authority_loss_after_final_metadata_never_returns_cached_directory(directory_customer, monkeypatch, authority):
    c = directory_customer
    auth, me, base, _, reg = await setup(c)
    original, calls = directory.metadata, 0
    async def late(tx, session, row):
        nonlocal calls
        value = await original(tx, session, row)
        calls += 1
        if calls == 2:
            from pinet_core.control.models import Membership, Session
            from pinet_core.models import utcnow
            async with AsyncSession(c["admin"]) as admin, admin.begin():
                if authority == "session":
                    await admin.execute(update(Session).where(Session.id == session.id).values(revoked_at=utcnow()))
                elif authority == "grant":
                    await admin.execute(update(BusinessGrant).where(BusinessGrant.id == reg["grant"]).values(enabled=False))
                else:
                    await admin.execute(update(Membership).where(Membership.user_id == me["user_id"],
                        Membership.environment_id == c["environment"]).values(enabled=False))
        return value
    monkeypatch.setattr(directory, "metadata", late)
    result = await c["client"].get(base+"/team/directory", headers=auth)
    assert result.status_code == (401 if authority == "session" else 404), result.text
    assert "items" not in result.json()


async def test_config_change_beyond_first_page_invalidates_complete_snapshot(directory_customer):
    c = directory_customer
    auth, _, base, _, _ = await setup(c)
    first = await read(c, auth, base, {"limit": 1})
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        agent = await tx.scalar(select(Agent).where(Agent.environment_id == c["environment"]).order_by(Agent.id.desc()).limit(1))
        old = await tx.scalar(select(Config).where(Config.agent_id == agent.id, Config.revision == 1))
        config = Config(id=str(uuid4()), agent_id=agent.id, revision=2, payload=old.payload|{"name": "Atnaujintas sintetinis aprašas"},
            saved_source_revision="a"*40, idempotency_key=str(uuid4()), request_fingerprint="b"*64,
            authorizing_session_id=old.authorizing_session_id, **binding(agent))
        config.config_sha256 = digest(config_material(agent, config))
        tx.add(config)
        agent.current_revision = 2
    stale = await c["client"].get(base+"/team/directory", headers=auth, params={"cursor": first["next_cursor"]})
    assert stale.status_code == 409
    fresh = await read(c, auth, base)
    assert any(i["name"] == "Atnaujintas sintetinis aprašas" and i["revision"] == 2 for i in fresh["items"])


async def test_invalid_selected_config_is_not_a_successful_empty_catalogue(directory_customer):
    c = directory_customer
    auth, _, base, _, _ = await setup(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        agent = await tx.scalar(select(Agent).where(Agent.environment_id == c["environment"]).limit(1))
        old = await tx.scalar(select(Config).where(Config.agent_id == agent.id, Config.revision == 1))
        # Test-only malformed NEW receipt; immutable old configuration is never rewritten.
        tx.add(Config(id=str(uuid4()), agent_id=agent.id, revision=2, payload={"bad": "schema"},
            config_sha256="a"*64, saved_source_revision="a"*40, idempotency_key=str(uuid4()),
            request_fingerprint="b"*64, authorizing_session_id=old.authorizing_session_id, **binding(agent)))
        agent.current_revision = 2
    result = await c["client"].get(base+"/team/directory", headers=auth)
    assert result.status_code == 503 and result.json()["code"] == "invalid_agent_config"


async def test_schema_unavailable_is_unknown_context_and_s2_still_consults(directory_customer, monkeypatch):
    c = directory_customer
    auth, _, base, _, _ = await setup(c)
    from pinet_core.customer_agents import service as agent_service
    async def unavailable(tx):
        return False
    monkeypatch.setattr(agent_service, "schema_ready", unavailable)
    result = await c["client"].get(base+"/team/directory", headers=auth)
    assert result.status_code == 503 and result.json()["code"] == "customer_agents_schema_unavailable"
    result = await c["client"].post(base+"/team/turns", headers=auth,
        json={"idempotency_key": str(uuid4()), "content": "Konsultuokite apie pateiktą tekstą.", "reply_to_event_id": None})
    assert result.status_code == 200
    async def injected(phase, packet, heartbeat):
        assert packet["configured_agents"]["state"] == "unavailable" and packet["configured_agents"]["total_count"] is None
        return {"answer": "Agentų sąrašo negaliu patvirtinti; aptariu tik pateiktą tekstą.", "limitations": [],
            "decision": "answer", "assignment": None}, {"input_tokens": 1}
    assert await worker.execute_once(kind=KIND, adapter=injected)
