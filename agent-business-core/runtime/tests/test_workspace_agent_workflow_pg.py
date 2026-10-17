"""ROOT-ONLY isolated PG gate; helper authors/collects, never executes DB.

Real routes/Task/native storage/provenance/accounting, inert bounded provider
transports. Existing random-environment fixture cleanup is kept transactional.
"""
import asyncio
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import IntegrityError
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
from test_workspace_agent_episode_pg import episode_customer  # noqa: F401
from test_workspace_agent_preparation import specification
from test_workspace_agent_preparation_pg import saved, setup

from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import scope
from pinet_core.customer_agents.models import Agent
from pinet_core.models import utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.codex import RunnerError
from pinet_core.tasks.models import Task, Thread
from pinet_core.workspace_team import preparation, workflow
from pinet_core.workspace_team.calibration_budget_schema import ALLOCATION, CALL
from pinet_core.workspace_team.models import TeamEvent, TeamTurn
from pinet_core.workspace_team.policy import KIND
from pinet_core.workspace_team.workflow_models import TABLE, AgentWorkflow
from pinet_core.workspace_topics.models import Topic


@pytest.fixture
async def workflow_customer(episode_customer):  # noqa: F811 - imported native fixture
    c, p, frozen = episode_customer
    try:
        yield c, p, frozen
    finally:
        # Exact random test environment only. The maintained immutable-history
        # cleanup pattern disables/re-enables one trigger INSIDE one admin tx;
        # no disabled trigger or partial deletion is ever committed.
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            for table in (CALL, ALLOCATION):
                await tx.execute(text(f"DELETE FROM {table} WHERE environment_id=:e"), {"e": c["environment"]})
            await tx.execute(delete(TeamEvent).where(TeamEvent.environment_id == c["environment"],
                TeamEvent.native_workflow_intent_id.is_not(None)))
            await tx.execute(text(f"ALTER TABLE {TABLE} DISABLE TRIGGER workspace_agent_workflow_fence"))
            await tx.execute(delete(AgentWorkflow).where(AgentWorkflow.environment_id == c["environment"]))
            await tx.execute(text(f"ALTER TABLE {TABLE} ENABLE TRIGGER workspace_agent_workflow_fence"))
            for model in (Topic, Task, Thread, Agent):
                await tx.execute(delete(model).where(model.environment_id == c["environment"]))


async def plan(phase, packet, heartbeat):
    assert phase == "plan" and packet["agent_preparation"]["purpose"] == "site_chat" and await heartbeat()
    return {"answer": "Parengtas svetainės pokalbių agento aprašas.", "limitations": [],
        "decision": "save_draft", "configuration": specification()}, {"input_tokens": 17, "output_tokens": 9}


async def submit(c, base, *, key=None):
    body = {"idempotency_key": key or str(uuid4()), "creation_id": c["request"]["creation_id"],
        "purpose": "site_chat", "content": "Parenkite agento aprašą ir išbandykite vieną jo pavyzdį."}
    response = await c["client"].post(base+"/team/agent-workflows", headers=c["auth"], json=body)
    assert response.status_code == 200, response.text
    assert response.json()["contract_version"] == "workspace-agent-workflow.v1"
    return response.json()["data"], body


async def observed(c, base, workflow_id):
    response = await c["client"].get(base+"/team/agent-workflows/"+workflow_id, headers=c["auth"])
    assert response.status_code == 200, response.text
    return response.json()["data"]


async def stored_intent(c, workflow_id):
    async with AsyncSession(c["admin"]) as tx:
        return await tx.get(AgentWorkflow, workflow_id)


async def test_explicit_owner_s4_commit_then_worker_native_s5_same_chat_exact_usage_and_replay(workflow_customer, monkeypatch):
    c, p, _ = workflow_customer
    base = await setup(c)
    text_calls, quality_calls = [], []
    text_transport(monkeypatch, c, text_calls)
    quality_transport(monkeypatch, c, p.execution_profile, quality_calls)
    accepted, body = await submit(c, base)
    wid, parent_id = accepted["workflow_id"], accepted["preparation"]["task_id"]
    assert accepted["status"] == "waiting_preparation" and accepted["test"] is None
    async with AsyncSession(c["admin"]) as tx:
        original_turn = await tx.get(TeamTurn, parent_id)
        original_intent = await tx.get(AgentWorkflow, wid)
        assert original_intent.deadline <= original_turn.deadline
    assert await worker.execute_once(plan, kind=KIND)
    parent, _, _, _, _ = await saved(c, parent_id)
    parent_result = dict(parent.result)
    for _ in range(2):
        view = await observed(c, base, wid)
        assert view["status"] == "waiting_test" and view["test"] is None
    assert not text_calls and not quality_calls  # GET cannot enqueue or dispatch.
    assert await worker.execute_once(kind=KIND)
    view = await observed(c, base, wid)
    assert view["status"] == "completed"
    assert view["calibration_status"] == "UNVERIFIED" and view["module_admission"] == "not_admitted"
    assert view["channel_activation"] == "not_performed"
    native = view["test"]["native_episode"]
    assert native["reserved_calls"] == native["settled_calls"] == 2 and native["usage_complete"]
    assert len(text_calls) == len(quality_calls) == 1
    finished_cancel = await c["client"].post(base+"/team/agent-workflows/"+wid+"/cancel",
        headers=c["auth"], json={})
    assert finished_cancel.status_code == 200 and finished_cancel.json()["data"] == view
    intent = await stored_intent(c, wid)
    child, _, events, attempts, runs = await saved(c, intent.child_task_id)
    assert intent.state == "dispatched" and child.status == "succeeded" and not attempts
    assert len(runs) == 1 and runs[0].usage == {"input_tokens": 21, "output_tokens": 11}
    assert events[0].author_type == "coordinator" and events[0].kind == "assignment"
    assert events[0].native_workflow_intent_id == wid and events[0].attempt_id is None
    assert events[-1].native_episode_task_id == child.id and events[-1].author_type == "coordinator"
    assert all(event.author_type != "user" for event in events)
    replay = await c["client"].post(base+"/team/agent-workflows", headers=c["auth"], json=body)
    assert replay.status_code == 200 and replay.json()["data"] == view
    assert not await worker.execute_once(kind=KIND)
    retained, _, _, _, _ = await saved(c, parent_id)
    assert retained.result == parent_result  # Never mutate a terminal parent's result.
    assert len(text_calls) == len(quality_calls) == 1


async def test_restart_and_two_reconcilers_allocate_exactly_one_child_and_one_allowance(workflow_customer):
    c, _, _ = workflow_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    assert await worker.execute_once(plan, kind=KIND)
    before = await stored_intent(c, accepted["workflow_id"])
    assert before.state == "prepared" and before.child_task_id is None
    # New invocations reconstruct only the committed intent/Config. No Python
    # continuation object, browser poll or prior worker process is needed.
    results = await asyncio.gather(workflow.reconcile(before.user_id), workflow.reconcile(before.user_id))
    assert sum(results) == 1
    after = await stored_intent(c, before.id)
    assert after.child_task_id == before.planned_child_task_id and after.deadline == before.deadline
    assert not await workflow.reconcile(before.user_id)
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Task).where(Task.id == after.child_task_id)) == 1
        count = await tx.scalar(text(f"SELECT count(*) FROM {ALLOCATION} WHERE task_id=:t"), {"t": after.child_task_id})
        assert count == 1


@pytest.mark.parametrize("after_child", [False, True])
async def test_cancel_after_s4_or_queued_child_stops_future_dispatch_without_forging_usage(workflow_customer, after_child):
    c, _, _ = workflow_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    assert await worker.execute_once(plan, kind=KIND)
    intent = await stored_intent(c, accepted["workflow_id"])
    if after_child:
        assert await workflow.reconcile(intent.user_id)
    url = base+"/team/agent-workflows/"+intent.id+"/cancel"
    response = await c["client"].post(url, headers=c["auth"], json={})
    assert response.status_code == 200, response.text
    view = response.json()["data"]
    assert view["status"] == "cancelled" and view["cancel_requested"]
    if after_child:
        assert view["test"]["status"] == "cancelled" and view["test"]["reserved_calls"] == 0
    else:
        assert view["test"] is None
    replay = await c["client"].post(url, headers=c["auth"], json={})
    assert replay.status_code == 200 and replay.json()["data"] == view
    assert not await worker.execute_once(kind=KIND)


async def test_clarification_is_terminal_without_a_config_or_automatic_test(workflow_customer):
    c, _, _ = workflow_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    async def clarify(phase, packet, heartbeat):
        assert await heartbeat()
        return {"answer": "Kokią užduotį agentas turėtų atlikti?", "limitations": [],
            "decision": "clarify", "configuration": None}, {"input_tokens": 5, "output_tokens": 3}
    assert await worker.execute_once(clarify, kind=KIND)
    view = await observed(c, base, accepted["workflow_id"])
    assert view["status"] == "clarification_required" and view["agent"] is None and view["test"] is None
    assert not await worker.execute_once(kind=KIND)


async def test_late_effect_failure_rolls_back_native_receipt_event_and_child_but_retains_call_usage(workflow_customer, monkeypatch):
    c, _, _ = workflow_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    original = preparation.complete
    async def fail_after_effects(*args, **kwargs):
        await original(*args, **kwargs)
        raise RunnerError("output_invalid")
    monkeypatch.setattr(preparation, "complete", fail_after_effects)
    assert await worker.execute_once(plan, kind=KIND)
    view = await observed(c, base, accepted["workflow_id"])
    assert view["status"] == "failed" and view["agent"] is None and view["test"] is None
    intent = await stored_intent(c, accepted["workflow_id"])
    assert intent.state == "pending" and intent.config_revision_id is None
    task, _, events, attempts, runs = await saved(c, intent.parent_task_id)
    assert task.status == "failed" and len(events) == 1 and len(attempts) == len(runs) == 1
    assert attempts[0].usage and runs[0].usage["input_tokens"] == 17
    assert not await worker.execute_once(kind=KIND)


async def test_source_change_before_resumption_fails_closed_without_renewing_the_owner_intent(workflow_customer, monkeypatch):
    c, _, _ = workflow_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    assert await worker.execute_once(plan, kind=KIND)
    intent = await stored_intent(c, accepted["workflow_id"])
    monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
    assert not await workflow.reconcile(intent.user_id)
    after = await stored_intent(c, intent.id)
    assert after.failure_code == "authorization_revoked" and after.child_task_id is None
    assert after.session_id == intent.session_id and after.deadline == intent.deadline


async def test_ordinary_old_preparation_key_cannot_be_reinterpreted_as_workflow(workflow_customer):
    c, _, _ = workflow_customer
    base = await setup(c)
    body = {"idempotency_key": str(uuid4()), "creation_id": c["request"]["creation_id"],
        "purpose": "site_chat", "content": "Parenkite agento aprašą ir išbandykite vieną jo pavyzdį."}
    old = await c["client"].post(base+"/team/agent-preparations", headers=c["auth"], json=body)
    assert old.status_code == 200, old.text
    new = await c["client"].post(base+"/team/agent-workflows", headers=c["auth"], json=body)
    assert new.status_code == 409 and new.json()["code"] == "idempotency_conflict"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(AgentWorkflow).where(
            AgentWorkflow.environment_id == c["environment"])) == 0


async def test_native_outbox_rejects_receipt_rewrite_null_and_unproven_child_at_database_boundary(workflow_customer):
    c, _, _ = workflow_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    assert await worker.execute_once(plan, kind=KIND)
    intent = await stored_intent(c, accepted["workflow_id"])
    for changes in ("config_revision=NULL", "config_sha256=repeat('e',64)",
            "state='dispatched',child_task_id=planned_child_task_id"):
        with pytest.raises(IntegrityError):
            async with scope(user=intent.user_id) as tx:
                await tx.execute(text(f"UPDATE {TABLE} SET {changes} WHERE id=:w"), {"w": intent.id})
    after = await stored_intent(c, intent.id)
    assert after.state == "prepared" and after.config_sha256 == intent.config_sha256 and after.child_task_id is None


@pytest.mark.parametrize("reason", ["quota", "session", "revision"])
async def test_preflight_or_admission_refusal_leaves_no_child_event_or_allowance(workflow_customer, monkeypatch, reason):
    c, _, _ = workflow_customer
    base = await setup(c)
    accepted, _ = await submit(c, base)
    assert await worker.execute_once(plan, kind=KIND)
    intent = await stored_intent(c, accepted["workflow_id"])
    if reason == "quota":
        monkeypatch.setattr(settings(), "chat_daily_limit", 1)
    elif reason == "session":
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Session).where(Session.id == intent.session_id).values(revoked_at=utcnow()))
    else:
        revised = await c["client"].post(
            "/customer/v2/creations/"+intent.creation_id+"/agents/"+intent.agent_id+"/revisions",
            headers=c["auth"], json={"request_id": str(uuid4()), "expected_revision": 1,
                "configuration": specification() | {"name": "Pakeistas sintetinės patikros aprašas"}})
        assert revised.status_code == 200, revised.text
    assert not await workflow.reconcile(intent.user_id)
    after = await stored_intent(c, intent.id)
    assert after.failure_code is not None and after.child_task_id is None and after.state == "prepared"
    if reason == "quota":
        assert after.failure_code == "task_rate_limited"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.get(Task, intent.planned_child_task_id) is None
        assert await tx.get(TeamEvent, intent.origin_event_id) is None
        assert await tx.scalar(text(f"SELECT count(*) FROM {ALLOCATION} WHERE task_id=:t"),
            {"t": intent.planned_child_task_id}) == 0
