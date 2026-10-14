"""Ordinary owner API, canonical native fixtures and provider-zero atomic effects."""
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agents import (  # noqa: F401 - maintained native fixture chain
    creation,
    customers,
    profile,
    registration,
    text_customer,
)
from test_workspace_agent_preparation import specification
from test_workspace_directory_pg import directory_customer  # noqa: F401
from test_workspace_directory_pg import setup as directory_setup
from test_workspace_team_pg import team  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Session
from pinet_core.control.routes import token_hash
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.models import Agent, Config
from pinet_core.models import utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskRun, Thread
from pinet_core.workspace_team import preparation, service
from pinet_core.workspace_team.models import Attempt, TeamEvent
from pinet_core.workspace_team.policy import KIND
from pinet_core.workspace_topics.models import Topic


@pytest.fixture
async def prepare_customer(text_customer, monkeypatch):  # noqa: F811
    c = text_customer
    cfg = settings()
    for key, value in {"workspace_topics_enabled": True, "workspace_team_enabled": True,
            "workspace_team_runner_enabled": True, "workspace_team_actor_ids": [], "chat_daily_limit": 20,
            "customer_agents_enabled": True}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(service, "source_current", lambda: True)
    monkeypatch.setattr(agents, "source_current", lambda: True)
    try:
        yield c
    finally:
        # Only this maintained fixture's random test environment. No original preview writes.
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(Topic).where(Topic.environment_id == c["environment"]))
            await tx.execute(delete(Task).where(Task.environment_id == c["environment"]))
            await tx.execute(delete(Thread).where(Thread.environment_id == c["environment"]))
            await tx.execute(delete(Agent).where(Agent.environment_id == c["environment"]))


async def setup(c):
    async with AsyncSession(c["admin"]) as tx:
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(c["token"])))
        owner = session.user_id
        registry = await tx.get(Registration, c["saved"]["registration_id"])
        grant = await tx.get(BusinessGrant, registry.grant_id)
        c["preparation_grant_id"] = grant.id
        portfolio = grant.portfolio_id
    settings().workspace_team_actor_ids = [owner]
    root = f"/customer/v2/portfolios/{portfolio}/workspace-topics"
    topic = await c["client"].post(root, headers=c["auth"], json={"idempotency_key": str(uuid4()),
        "title": "Sintetinė agento parengimo užduotis", "anchor": {"kind": "business",
            "selection_id": c["saved"]["business_id"]}})
    assert topic.status_code == 200, topic.text
    return root+"/"+topic.json()["data"]["current_topic"]["topic_id"]


async def submit(c, base, *, key=None, content="Parenkite pagalbininko aprašą pateiktai užduočiai."):
    body = {"idempotency_key": key or str(uuid4()), "creation_id": c["request"]["creation_id"],
        "purpose": "custom", "content": content}
    response = await c["client"].post(base+"/team/agent-preparations", headers=c["auth"], json=body)
    assert response.status_code == 200, response.text
    assert response.json()["contract_version"] == "workspace-agent-preparation.v1"
    return response.json()["data"], body


async def saved(c, task_id):
    async with AsyncSession(c["admin"]) as tx:
        task = await tx.get(Task, task_id)
        configurations = list(await tx.scalars(select(Config).where(Config.environment_id == c["environment"])))
        events = list(await tx.scalars(select(TeamEvent).where(TeamEvent.task_id == task_id).order_by(TeamEvent.sequence)))
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task_id)))
        runs = list(await tx.scalars(select(TaskRun).where(TaskRun.task_id == task_id)))
        return task, configurations, events, attempts, runs


async def plan(phase, packet, heartbeat):
    assert phase == "plan" and packet["agent_preparation"]["purpose"] == "custom"
    assert preparation.SCOPE_KEY not in packet and await heartbeat()
    return {"answer": "Aprašas parengtas išsaugojimui.", "limitations": ["Tik sintetinė patikra"],
        "decision": "save_draft", "configuration": specification()}, {"input_tokens": 17, "output_tokens": 9}


async def test_preparation_saves_one_canonical_draft_and_exact_replay_never_redispatches(prepare_customer):
    c = prepare_customer
    base = await setup(c)
    accepted, body = await submit(c, base)
    assert await worker.execute_once(plan, kind=KIND)
    task, configs, events, attempts, runs = await saved(c, accepted["turn"]["task_id"])
    assert task.status == "succeeded" and len(configs) == 1
    assert len(attempts) == len(runs) == 1 and attempts[0].phase == "plan" and attempts[0].state == "succeeded"
    assert runs[0].usage["input_tokens"] == 17
    assert [event.author_type for event in events] == ["user", "coordinator"]
    receipt = task.result["agent_preparation"]
    assert receipt["revision_id"] == configs[0].id and receipt["sha256"] == configs[0].config_sha256
    assert receipt["module_admission"] == "not_admitted" and receipt["calibration_status"] == "UNVERIFIED"
    assert "juodraštis" in events[-1].content and "kalibravimas nepatvirtintas" in events[-1].content
    replay = await c["client"].post(base+"/team/agent-preparations", headers=c["auth"], json=body)
    assert replay.status_code == 200 and replay.json()["data"]["turn"]["task_id"] == task.id
    assert not await worker.execute_once(plan, kind=KIND)
    changed = await c["client"].post(base+"/team/agent-preparations", headers=c["auth"], json={**body, "purpose": "email"})
    assert changed.status_code == 409
    old_consult = await c["client"].post(base+"/team/turns", headers=c["auth"], json={
        "idempotency_key": body["idempotency_key"], "content": body["content"]})
    assert old_consult.status_code == 409
    directory = await c["client"].get(base+"/team/directory", headers=c["auth"])
    assert directory.status_code == 200 and len(directory.json()["data"]["items"]) == 1


async def test_clarification_is_persisted_without_an_agent_effect(prepare_customer):
    c = prepare_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)

    async def clarify(phase, packet, heartbeat):
        assert await heartbeat()
        return {"answer": "Kokio rezultato reikia?", "limitations": [], "decision": "clarify",
            "configuration": None}, {"input_tokens": 13}

    assert await worker.execute_once(clarify, kind=KIND)
    task, configs, events, _, _ = await saved(c, accepted["turn"]["task_id"])
    assert task.status == "succeeded" and not configs
    assert task.result["agent_preparation"] is None and events[-1].content == "Kokio rezultato reikia?"


async def test_cancel_after_provider_preserves_usage_without_effect_or_fake_reply(prepare_customer):
    c = prepare_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    task_id = accepted["turn"]["task_id"]

    async def interrupted(phase, packet, heartbeat):
        result = await plan(phase, packet, heartbeat)
        cancelled = await c["client"].post(base+"/team/turns/"+task_id+"/cancel", headers=c["auth"], json={})
        assert cancelled.status_code == 200
        return result

    assert await worker.execute_once(interrupted, kind=KIND)
    task, configs, events, attempts, runs = await saved(c, task_id)
    assert task.status == "cancelled" and not configs
    assert len(events) == 1 and runs[0].usage["input_tokens"] == 17 and attempts[0].usage["input_tokens"] == 17


async def test_late_source_denial_rolls_back_config_and_public_effect_together(prepare_customer, monkeypatch):
    c = prepare_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    from pinet_core.customer_agents import provisioning
    original = provisioning.create

    async def late(tx, scope, value):
        result = await original(tx, scope, value)
        monkeypatch.setattr(service, "source_current", lambda: False)
        return result

    monkeypatch.setattr(provisioning, "create", late)
    assert await worker.execute_once(plan, kind=KIND)
    task, configs, events, _, runs = await saved(c, accepted["turn"]["task_id"])
    assert task.status == "failed" and not configs and len(events) == 1
    assert runs[0].usage["input_tokens"] == 17


async def test_grant_revoked_after_provider_discards_effect_retains_accounting(prepare_customer):
    c = prepare_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)

    async def revoked(phase, packet, heartbeat):
        result = await plan(phase, packet, heartbeat)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(BusinessGrant).where(BusinessGrant.id == c["preparation_grant_id"]).values(enabled=False))
        return result

    assert await worker.execute_once(revoked, kind=KIND)
    task, configs, events, _, runs = await saved(c, accepted["turn"]["task_id"])
    assert task.status == "failed" and not configs and len(events) == 1
    assert runs[0].usage["input_tokens"] == 17


async def test_discovery_foundation_refuses_preparation_before_any_provider(directory_customer, monkeypatch):  # noqa: F811
    c = directory_customer
    monkeypatch.setattr(settings(), "customer_agents_enabled", True)
    monkeypatch.setattr(agents, "source_current", lambda: True)
    auth, _, base, records, _ = await directory_setup(c, count=0)
    result = await c["client"].post(base+"/team/agent-preparations", headers=auth, json={
        "idempotency_key": str(uuid4()), "creation_id": records["creation"], "purpose": "custom", "content": "Parenkite agentą."})
    assert result.status_code == 409 and result.json()["error"]["code"] == "website_foundation_not_ready"
    async with AsyncSession(c["admin"]) as tx:
        assert not list(await tx.scalars(select(Task).where(Task.environment_id == c["environment"])))


async def test_expired_authorizing_login_never_creates_a_draft(prepare_customer):
    c = prepare_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)

    async def expired(phase, packet, heartbeat):
        result = await plan(phase, packet, heartbeat)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Session).where(Session.token_hash == token_hash(c["token"])).values(expires_at=utcnow()))
        return result

    assert await worker.execute_once(expired, kind=KIND)
    task, configs, events, _, runs = await saved(c, accepted["turn"]["task_id"])
    assert task.status == "failed" and not configs and len(events) == 1 and runs[0].usage["input_tokens"] == 17
