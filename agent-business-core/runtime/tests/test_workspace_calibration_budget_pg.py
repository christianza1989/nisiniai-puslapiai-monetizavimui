"""Actual restricted PG accounting, with synthetic metadata and zero providers.

These tests deliberately do not claim native Profile/Foundation/calibration
admission. They exercise only the shared Task allowance and database fences.
"""
import asyncio
import json
from datetime import timedelta
from uuid import uuid4, uuid5

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers  # noqa: F401 - maintained fixture chain
from test_workspace_team_pg import send, setup, team  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation.service import digest
from pinet_core.customer_text.service import usage_receipt
from pinet_core.models import Case, Conversation, Event, utcnow
from pinet_core.tasks.models import Task, TaskRun
from pinet_core.tasks.service import append_event
from pinet_core.workspace_team import calibration_budget as budget
from pinet_core.workspace_team.calibration_budget_schema import ALLOCATION, CALL
from pinet_core.workspace_team.calibration_plan import EpisodePlan
from pinet_core.workspace_team.models import TeamTurn


@pytest.fixture
async def allocated_customer(team):  # noqa: F811
    try:
        yield team
    finally:
        async with AsyncSession(team["admin"]) as tx, tx.begin():
            for table in (CALL, ALLOCATION):
                await tx.execute(text(f"DELETE FROM {table} WHERE environment_id=:e"), {"e": team["environment"]})
            await tx.execute(text("DELETE FROM cases WHERE environment_id=:e"), {"e": team["environment"]})


async def intent(c, *, messages=1):
    from offline_tests.test_workspace_calibration_plan import data
    auth, me, base, business, grant = await setup(c)
    accepted, _ = await send(c, auth, base)
    async with AsyncSession(c["admin"]) as tx:
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        task = await tx.get(Task, accepted["turn"]["task_id"])
        turn = await tx.get(TeamTurn, task.id)
        raw = data()
        raw["scope"].update(user_id=task.user_id, organization_id=task.organization_id,
            portfolio_id=turn.portfolio_id, session_id=session.id, creation_id=str(uuid4()),
            business_id=business, grant_id=grant, environment_id=c["environment"], source_revision=task.source_revision)
        raw["snapshot"].update({key: raw["scope"][key] for key in ("user_id", "session_id", "creation_id",
            "registration_id", "registration_fingerprint", "environment_id")})
        raw["snapshot"]["execution_source_revision"] = task.source_revision
        raw["messages"] *= messages
    return me["user_id"], task.id, EpisodePlan.model_validate_json(json.dumps(raw))


async def count(user):
    async with scope(user=user) as tx:
        return await tx.scalar(text("SELECT workspace_team_daily_reserved(:u,:e)"),
            {"u": user, "e": settings().environment})


async def claim(user, task_id, plan):
    async with scope(user=user) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        turn = await tx.get(TeamTurn, task.id)
        task.status, task.run_id, task.lease_until = "running", str(uuid4()), utcnow()+timedelta(seconds=30)
        tx.add(TaskRun(id=task.run_id, task_id=task.id, user_id=task.user_id, organization_id=task.organization_id,
            business_id=task.business_id, environment_id=task.environment_id, status="running",
            model="gpt-6.1-sol", effort="high", adapter_revision="synthetic-accounting-only"))
        turn.context = {budget.CONTEXT_KEY: digest(plan.model_dump(mode="json")), "history": []}
        turn.context_sha256, turn.context_cutoff = digest(turn.context), 1
        await tx.flush()
        await budget.bind_run(tx, task.id, task.run_id, turn.context_sha256)
        await append_event(tx, task)
        return task.run_id, turn.context_sha256


async def test_allocation_replaces_queue_hold_exact_replay_and_cancellation_release_only_unused(allocated_customer):
    user, task_id, plan = await intent(allocated_customer, messages=8)
    assert await count(user) == 3
    async with scope(user=user) as tx:
        first = await budget.allocate(tx, task_id, plan)
    assert first["call_limit"] == 10 and await count(user) == 10
    async with scope(user=user) as tx:
        replay = await budget.allocate(tx, task_id, plan)
        assert replay["plan_sha256"] == first["plan_sha256"]
    assert await count(user) == 10
    async with scope(user=user) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        task.status = "cancelled"
        await append_event(tx, task)
    assert await count(user) == 0


async def test_over_limit_allocation_rolls_back_without_changing_queue_or_history(allocated_customer, monkeypatch):
    user, task_id, plan = await intent(allocated_customer, messages=8)
    monkeypatch.setattr(settings(), "chat_daily_limit", 9)
    from pinet_core.tasks.codex import RunnerError
    with pytest.raises(RunnerError, match="task_rate_limited"):
        async with scope(user=user) as tx:
            await budget.allocate(tx, task_id, plan)
    assert await count(user) == 3
    async with scope(user=user) as tx:
        assert await budget.allocation(tx, task_id) is None


async def test_run_binding_is_exact_and_immutable(allocated_customer):
    user, task_id, plan = await intent(allocated_customer)
    async with scope(user=user) as tx:
        await budget.allocate(tx, task_id, plan)
    run_id, context = await claim(user, task_id, plan)
    async with scope(user=user) as tx:
        await budget.bind_run(tx, task_id, run_id, context)
    with pytest.raises(ControlError) as error:
        async with scope(user=user) as tx:
            await budget.bind_run(tx, task_id, str(uuid4()), context)
    assert error.value.code == "calibration_task_not_current"
    async with scope(user=user) as tx:
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,:t,'DELETE')"), {"t": ALLOCATION})
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,:t,'UPDATE,DELETE')"), {"t": CALL})


async def native_call(tx, user, task_id, run_id, plan, *, event=True, usage=None, conversation=None, step=0,
        quality_job=None, fence=None, changed=None):
    """Synthetic native ledger rows, not a fake model or a Foundation receipt."""
    business, environment = str(plan.scope.business_id), plan.scope.environment_id
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": business})
    conversation_id, request_id = conversation or str(uuid4()), str(uuid5(plan.episode_id, "step:"+str(step)))
    if conversation is None:
        case_id = str(uuid4())
        tx.add(Case(id=case_id, business_id=business, environment_id=environment))
        await tx.flush()
        tx.add(Conversation(id=conversation_id, case_id=case_id, business_id=business, environment_id=environment,
            token_hash="synthetic-budget-only", expires_at=utcnow()+timedelta(hours=1)))
        await tx.flush()
    material = {key: str(getattr(plan.snapshot, key)) for key in ("creation_id", "agent_id", "config_revision_id",
        "config_sha256", "admission_id", "admission_fingerprint")}
    kind = "customer_quality" if quality_job else "customer_text"
    call_key = "quality-attempt:"+quality_job+":1" if quality_job else "attempt:"+request_id
    usage_key = "quality-usage:"+quality_job+":1" if quality_job else "usage:"+request_id
    material.update(kind=kind, number=1, config_revision=plan.snapshot.config_revision,
        conversation_id=conversation_id, request_id=str(plan.quality_request_id) if quality_job else request_id,
        episode_id=str(plan.episode_id),
        call_key=call_key, model=plan.model, source_revision=plan.scope.source_revision,
        protected_case_sha256=None, prompt_sha256="1"*64, schema_sha256="2"*64)
    material.update(script_sha256=plan.script_sha256,
        request_input_sha256=plan.quality_request_sha256 if quality_job else digest(plan.messages[step]))
    material.update(changed or {})
    if fence is not None:
        from pinet_core.customer_agents.session import CallIdentity
        await fence.reserve(tx, CallIdentity.model_validate_json(json.dumps(material)))
    else:
        await tx.execute(text(f"""INSERT INTO {CALL}(id,task_id,run_id,user_id,organization_id,business_id,
          environment_id,conversation_id,call_key,kind,material,material_sha256)
          VALUES(:id,:t,:r,:u,:o,:b,:e,:c,:k,:kind,CAST(:j AS JSONB),:h)"""),
            {"id": str(uuid4()), "t": task_id, "r": run_id, "u": user, "o": str(plan.scope.organization_id),
             "b": business, "e": environment, "c": conversation_id, "k": material["call_key"], "kind": kind,
             "j": json.dumps(material), "h": digest(material)})
    if event:
        native_run = str(uuid4())
        tx.add(Event(business_id=business, environment_id=environment, conversation_id=conversation_id,
            event_key=material["call_key"], kind="quality_provider_attempt" if quality_job else "provider_attempt",
            sequence=2*step+1,
            payload={**{key: material[key] for key in ("model", "prompt_sha256", "schema_sha256")},
                "run_id": native_run}))
        if usage is not None:
            tx.add(Event(business_id=business, environment_id=environment, conversation_id=conversation_id,
                event_key=usage_key, kind="quality_provider_usage" if quality_job else "provider_usage",
                sequence=2*step+2, payload={"usage": usage_receipt(usage), "model": plan.model,
                    "request_id": request_id, "run_id": native_run,
                    **({"job_id": quality_job, "number": 1} if quality_job else {})}))
        await tx.flush()
    return material


async def prepared(c, *, messages=1):
    user, task_id, plan = await intent(c, messages=messages)
    async with scope(user=user) as tx:
        await budget.allocate(tx, task_id, plan)
    run_id, _ = await claim(user, task_id, plan)
    return user, task_id, plan, run_id


async def test_consumption_replaces_one_slot_and_ambiguous_call_survives_cancellation(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    assert await count(user) == 3
    async with scope(user=user) as tx:
        await native_call(tx, user, task_id, run_id, plan)
    assert await count(user) == 3  # One spent plus two held, not four.
    async with scope(user=user) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        task.status = "cancelled"
        await append_event(tx, task)
    assert await count(user) == 1
    async with scope(user=user) as tx:
        view = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
            {"t": task_id, "r": run_id, "u": user, "e": plan.scope.environment_id})
    assert view == {"usage": None, "reserved_calls": 1, "settled_calls": 0, "usage_complete": False}


async def test_missing_native_event_rolls_back_slot_and_midnight_expiry_cannot_reuse_allowance(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    with pytest.raises(IntegrityError):
        async with scope(user=user) as tx:
            await native_call(tx, user, task_id, run_id, plan, event=False)
    assert await count(user) == 3
    # Trusted test admin advances only this random allocation's deadline to the
    # past. No source/expiry gate or shared clock is changed in the application.
    async with AsyncSession(allocated_customer["admin"]) as tx, tx.begin():
        await tx.execute(text(f"ALTER TABLE {ALLOCATION} DISABLE TRIGGER calibration_allocation_insert"))
        await tx.execute(text(f"UPDATE {ALLOCATION} SET "
            "created_at=((date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '2 days') AT TIME ZONE 'UTC'),"
            "expires_at=((date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '1 day') AT TIME ZONE 'UTC') "
            "WHERE task_id=:t"), {"t": task_id})
        await tx.execute(text(f"ALTER TABLE {ALLOCATION} ENABLE TRIGGER calibration_allocation_insert"))
    assert await count(user) == 0
    with pytest.raises(IntegrityError):
        async with scope(user=user) as tx:
            await native_call(tx, user, task_id, run_id, plan)


async def test_independent_native_usage_is_summed_and_terminal_settlement_is_readable(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        first = await native_call(tx, user, task_id, run_id, plan, usage={"input_tokens": 7, "output_tokens": 3})
        await native_call(tx, user, task_id, run_id, plan, usage={"input_tokens": 11, "output_tokens": 5},
            conversation=first["conversation_id"], step=1, quality_job=str(uuid4()))
    async with scope(user=user) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        task.status = "cancelled"
        await append_event(tx, task)
    async with scope(user=user) as tx:
        view = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
            {"t": task_id, "r": run_id, "u": user, "e": plan.scope.environment_id})
    assert view == {"usage": {"input_tokens": 18, "output_tokens": 8},
        "reserved_calls": 2, "settled_calls": 2, "usage_complete": True}


async def test_mixed_missing_usage_is_incomplete_and_duplicate_native_reservations_do_not_multiply(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        first = await native_call(tx, user, task_id, run_id, plan, usage={"input_tokens": 7})
        await native_call(tx, user, task_id, run_id, plan, conversation=first["conversation_id"],
            step=1, quality_job=str(uuid4()))

    async def duplicate():
        async with scope(user=user) as tx:
            await native_call(tx, user, task_id, run_id, plan, conversation=first["conversation_id"])

    results = await asyncio.gather(duplicate(), duplicate(), return_exceptions=True)
    assert all(isinstance(result, IntegrityError) for result in results)
    assert await count(user) == 3
    async with scope(user=user) as tx:
        view = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
            {"t": task_id, "r": run_id, "u": user, "e": plan.scope.environment_id})
    assert view == {"usage": {"input_tokens": 7}, "reserved_calls": 2, "settled_calls": 1, "usage_complete": False}


async def test_native_unknown_usage_never_becomes_complete(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        await native_call(tx, user, task_id, run_id, plan, usage={})
    async with scope(user=user) as tx:
        view = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
            {"t": task_id, "r": run_id, "u": user, "e": plan.scope.environment_id})
    assert view == {"usage": None, "reserved_calls": 1, "settled_calls": 1, "usage_complete": False}


async def test_usage_arriving_after_task_cancellation_is_retained_without_new_dispatch(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        material = await native_call(tx, user, task_id, run_id, plan)
    async with scope(user=user) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        task.status = "cancelled"
        await append_event(tx, task)
    async with scope(user=user) as tx:
        business = str(plan.scope.business_id)
        await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": business})
        attempt = await tx.scalar(select(Event).where(Event.conversation_id == material["conversation_id"],
            Event.event_key == material["call_key"]))
        tx.add(Event(business_id=business, environment_id=plan.scope.environment_id,
            conversation_id=material["conversation_id"], event_key="usage:"+material["request_id"],
            kind="provider_usage", sequence=2, payload={"usage": usage_receipt({"input_tokens": 13}),
                "model": plan.model, "request_id": material["request_id"], "run_id": attempt.payload["run_id"]}))
    assert await count(user) == 1
    async with scope(user=user) as tx:
        view = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
            {"t": task_id, "r": run_id, "u": user, "e": plan.scope.environment_id})
    assert view == {"usage": {"input_tokens": 13}, "reserved_calls": 1,
        "settled_calls": 1, "usage_complete": True}


async def test_concrete_task_fence_consumes_native_slot_and_rejects_changed_first_input(allocated_customer):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        header = await budget.allocation(tx, task_id)
    fence = budget.task_fence(task_id, run_id, plan, header["context_sha256"])
    async with scope(user=user) as tx:
        await fence.check(tx)  # Same order as the native Session principal.
        await native_call(tx, user, task_id, run_id, plan, fence=fence)
    assert await count(user) == 3
    for field in ("script_sha256", "request_input_sha256", "model"):
        with pytest.raises(ControlError) as error:
            async with scope(user=user) as tx:
                await fence.check(tx)
                await native_call(tx, user, task_id, run_id, plan, fence=fence,
                    changed={field: "gpt-6-luna" if field == "model" else "f"*64})
        assert error.value.code == "calibration_call_not_planned"
    async with scope(user=user) as tx:
        assert await tx.scalar(text(f"SELECT count(*) FROM {CALL} WHERE task_id=:t"), {"t": task_id}) == 1


async def test_check_reads_time_after_waiting_for_unchanged_task_row(allocated_customer, monkeypatch):
    user, task_id, plan, run_id = await prepared(allocated_customer)
    async with scope(user=user) as tx:
        header = await budget.allocation(tx, task_id)
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        task.lease_until = utcnow()+timedelta(seconds=1)
    fence = budget.task_fence(task_id, run_id, plan, header["context_sha256"])
    held, release, checking = asyncio.Event(), asyncio.Event(), asyncio.Event()
    original = AsyncSession.execute

    async def observed_execute(tx, statement, *args, **kwargs):
        if "AS allocation_run" in str(statement):
            checking.set()
        return await original(tx, statement, *args, **kwargs)

    monkeypatch.setattr(AsyncSession, "execute", observed_execute)

    async def holder():
        async with scope(user=user) as tx:
            await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
            held.set()
            await asyncio.wait_for(release.wait(), timeout=8)

    async def check():
        async with scope(user=user) as tx:
            await fence.check(tx)

    blocker = asyncio.create_task(holder())
    pending = None
    try:
        await asyncio.wait_for(held.wait(), timeout=8)
        pending = asyncio.create_task(check())
        await asyncio.wait_for(checking.wait(), timeout=8)
        await asyncio.sleep(1.1)  # Holder keeps the tuple unchanged past its lease.
        assert not pending.done()
        release.set()
        await asyncio.wait_for(blocker, timeout=8)
        with pytest.raises(ControlError) as error:
            await asyncio.wait_for(pending, timeout=8)
        assert error.value.code == "calibration_task_not_current"
    finally:
        release.set()
        for task in (blocker, pending):
            if task is not None and not task.done():
                task.cancel()
        await asyncio.gather(*[task for task in (blocker, pending) if task is not None], return_exceptions=True)
