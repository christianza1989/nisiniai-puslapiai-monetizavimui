"""Owner API -> real Task allowance -> native lab/Quality -> same-chat receipt.

Only the bounded provider transport is inert; authority, admission, reservations,
argv construction, SQL provenance, native artifacts and parent accounting are real.
"""
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_sol_high import (  # noqa: F401 - maintained native fixture chain
    configured,
    creation,
    customers,
    high,
    principal,
    profile,
    quality_transport,
    registration,
    text_customer,
    text_transport,
)
from test_workspace_agent_preparation_pg import saved, setup

from pinet_core.config import settings
from pinet_core.customer_agents.models import Agent
from pinet_core.customer_text import adapter
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, Thread
from pinet_core.workspace_team import service
from pinet_core.workspace_team.calibration_budget_schema import ALLOCATION, CALL
from pinet_core.workspace_team.policy import KIND
from pinet_core.workspace_topics.models import Topic


@pytest.fixture
async def episode_customer(high, monkeypatch):  # noqa: F811
    c, p, frozen = high
    for key, value in {"workspace_topics_enabled": True, "workspace_team_enabled": True,
            "workspace_team_runner_enabled": True, "workspace_team_actor_ids": [],
            "chat_daily_limit": 20}.items():
        monkeypatch.setattr(settings(), key, value)
    monkeypatch.setattr(service, "source_current", lambda: True)
    try:
        yield c, p, frozen
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            for table in (CALL, ALLOCATION):
                await tx.execute(text(f"DELETE FROM {table} WHERE environment_id=:e"), {"e": c["environment"]})
            for model in (Topic, Task, Thread, Agent):
                await tx.execute(delete(model).where(model.environment_id == c["environment"]))


async def submit(c, base, *, messages=None, key=None):
    body = {"idempotency_key": key or str(uuid4()), "creation_id": c["request"]["creation_id"],
        "agent_id": c["agent"]["agent"]["agent_id"], "expected_revision": 1,
        "content": "Išbandykite šio agento scenarijų."}
    if messages is not None:
        body["messages"] = messages
    response = await c["client"].post(base+"/team/agent-tests", headers=c["auth"], json=body)
    assert response.status_code == 200, response.text
    assert response.json()["contract_version"] == "workspace-agent-episode.v1"
    return response.json()["data"], body


async def test_owner_scenario_native_worker_same_chat_and_exact_usage_once(episode_customer, monkeypatch):
    c, p, _ = episode_customer
    base = await setup(c)
    text_calls, quality_calls = [], []
    text_transport(monkeypatch, c, text_calls)
    quality_transport(monkeypatch, c, p.execution_profile, quality_calls)
    accepted, body = await submit(c, base, messages=["Synthetic original request"])
    tid = accepted["turn"]["task_id"]
    assert accepted["turn"]["native_episode"]["reserved_calls"] == 0
    assert await worker.execute_once(kind=KIND)
    task, _, events, attempts, runs = await saved(c, tid)
    assert task.status == "succeeded", task.failure_code
    assert not attempts and len(runs) == 1 and len(text_calls) == len(quality_calls) == 1
    assert runs[0].usage == {"input_tokens": 21, "output_tokens": 11}
    assert runs[0].cost_microusd is None
    assert [event.author_type for event in events] == ["user", "coordinator"]
    assert events[-1].attempt_id is None and events[-1].native_episode_task_id == tid
    assert "Inert native High reply" in events[-1].content and "vieno scenarijaus" in events[-1].content
    assert task.result["calibration_status"] == "UNVERIFIED" and task.result["module_admission"] == "not_admitted"
    history = await c["client"].get(base+"/team/events", headers=c["auth"])
    assert history.status_code == 200, history.text
    data = history.json()["data"]
    observed = data["turns"][0]["native_episode"]
    assert observed["reserved_calls"] == observed["settled_calls"] == 2 and observed["usage_complete"]
    assert observed["conversation_id"] == task.result["conversation_id"]
    assert observed["quality_job_id"] == task.result["quality_job_id"]
    assert data["events"][-1]["native_episode_task_id"] == tid
    # Reconcile a retained owner receipt before new-write profile preflight.
    from pinet_core.creation import execution_profiles
    monkeypatch.setattr(settings(), "creation_execution_profile", execution_profiles.DEFAULT)
    replay = await c["client"].post(base+"/team/agent-tests", headers=c["auth"], json=body)
    assert replay.status_code == 200 and replay.json()["data"]["turn"]["task_id"] == tid
    assert not await worker.execute_once(kind=KIND)
    assert len(text_calls) == len(quality_calls) == 1
    changed = await c["client"].post(base+"/team/agent-tests", headers=c["auth"], json={**body,
        "messages": ["Different first request"]})
    assert changed.status_code == 409


async def test_saved_example_uses_exact_native_revision_and_queued_cancel_releases_hold(episode_customer):
    c, _, frozen = episode_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    assert accepted["turn"]["native_episode"]["scenario"] == "saved_example"
    tid = accepted["turn"]["task_id"]
    async with AsyncSession(c["admin"]) as tx:
        plan = (await tx.execute(text(f"SELECT plan FROM {ALLOCATION} WHERE task_id=:t"), {"t": tid})).scalar_one()
        assert plan["messages"] == [frozen["specification"]["examples"][0]["input"]]
        assert plan["snapshot"]["execution_profile"] == frozen["execution_profile"]
    result = await c["client"].post(base+"/team/turns/"+tid+"/cancel", headers=c["auth"], json={})
    assert result.status_code == 200, result.text
    assert not await worker.execute_once(kind=KIND)
    task, _, events, attempts, runs = await saved(c, tid)
    assert task.status == "cancelled" and not attempts and not runs and len(events) == 1


async def test_cancellation_after_actual_reservation_keeps_usage_and_discards_reply(episode_customer, monkeypatch):
    c, _, _ = episode_customer
    base = await setup(c)
    captures = []
    text_transport(monkeypatch, c, captures)
    original = adapter.execute
    accepted, _ = await submit(c, base, messages=["Synthetic late result"])
    tid = accepted["turn"]["task_id"]

    async def late(argv, **options):
        value = await original(argv, **options)
        response = await c["client"].post(base+"/team/turns/"+tid+"/cancel", headers=c["auth"], json={})
        assert response.status_code == 200, response.text
        return value

    monkeypatch.setattr(adapter, "execute", late)
    assert await worker.execute_once(kind=KIND)
    task, _, events, attempts, runs = await saved(c, tid)
    assert task.status == "cancelled" and len(captures) == 1
    assert not attempts and len(events) == 1 and len(runs) == 1
    assert runs[0].usage == {"input_tokens": 9, "output_tokens": 5}


async def test_foreign_agent_and_changed_revision_fail_before_allocation(episode_customer):
    c, _, _ = episode_customer
    base = await setup(c)
    body = {"idempotency_key": str(uuid4()), "creation_id": c["request"]["creation_id"],
        "agent_id": str(uuid4()), "expected_revision": 1, "content": "Išbandykite pateiktą scenarijų."}
    for value in (body, {**body, "agent_id": c["agent"]["agent"]["agent_id"], "expected_revision": 2}):
        response = await c["client"].post(base+"/team/agent-tests", headers=c["auth"], json=value)
        assert response.status_code in {404, 409}, response.text
    async with AsyncSession(c["admin"]) as tx:
        assert not list(await tx.scalars(select(Task).where(Task.environment_id == c["environment"])))
        assert not await tx.scalar(text(f"SELECT count(*) FROM {ALLOCATION} WHERE environment_id=:e"), {"e": c["environment"]})


async def test_retained_unprofiled_allocation_keeps_topic_history_and_owner_replay_readable(episode_customer):
    import json

    from pinet_core.control.routes import scope
    from pinet_core.workspace_team import calibration_budget as budget
    from pinet_core.workspace_team.calibration_plan import EpisodePlan

    c, p, _ = episode_customer
    base = await setup(c)
    accepted, body = await submit(c, base)
    tid = accepted["turn"]["task_id"]
    # Synthetic historical0040 migration fixture only. No operational data and
    # no UPDATE of an admitted allocation: insert the retained shape afresh via
    # the same canonical immutable allocator after this test's admin cleanup.
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        plan = (await tx.execute(text(f"SELECT plan FROM {ALLOCATION} WHERE task_id=:t"), {"t": tid})).scalar_one()
        await tx.execute(text(f"DELETE FROM {ALLOCATION} WHERE task_id=:t"), {"t": tid})
    plan["snapshot"].pop("execution_profile")
    retained = EpisodePlan.model_validate_json(json.dumps(plan))
    async with scope(user=str(p.scope.user_id)) as tx:
        await budget.allocate(tx, tid, retained)
    history = await c["client"].get(base+"/team/events", headers=c["auth"])
    assert history.status_code == 200, history.text
    observed = history.json()["data"]["turns"][0]["native_episode"]
    assert observed["reasoning_effort"] is None and observed["execution_profile_sha256"] is None
    replay = await c["client"].post(base+"/team/agent-tests", headers=c["auth"], json=body)
    assert replay.status_code == 200, replay.text
    assert replay.json()["data"]["turn"]["task_id"] == tid

