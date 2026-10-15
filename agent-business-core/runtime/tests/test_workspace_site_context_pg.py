"""Canonical native intake -> bounded team context; actual owner/SQL race gates."""
import asyncio
from datetime import timedelta

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_workspace_agent_preparation_pg import (  # noqa: F401
    creation,
    customers,
    prepare_customer,
    profile,
    registration,
    setup,
    text_customer,
)
from test_workspace_team_pg import page, send

from pinet_core.control.models import Session
from pinet_core.creation_registration.models import Registration
from pinet_core.models import utcnow
from pinet_core.tasks import worker
from pinet_core.tasks.models import Task, TaskRun
from pinet_core.workspace_team import service, site_context
from pinet_core.workspace_team.models import Attempt, TeamTurn
from pinet_core.workspace_team.policy import KIND


async def test_real_native_workflow_is_frozen_once_for_all_three_roles(prepare_customer,monkeypatch):  # noqa: F811 - maintained fixture
    c=prepare_customer
    base=await setup(c)
    original=site_context.completion.projection
    reads=[]
    async def projection(*args):
        reads.append(1)
        return await original(*args)
    monkeypatch.setattr(site_context.completion,"projection",projection)
    packets=[]
    async def runner(phase,packet,alive):
        assert await alive()
        snapshot=packet["website_workflow"]
        assert snapshot["state"]=="available" and snapshot["page_count"]==3
        assert snapshot["creation_id"]==c["request"]["creation_id"]
        assert snapshot["candidate_sha256"]==c["request"]["candidate_sha256"]
        assert all(not p["review_current"] for p in snapshot["pages"])
        assert all(p["approved_revision_sha256"] is None for p in snapshot["pages"])
        packets.append(snapshot)
        answer={"answer":"Turime tris tikrus privačius puslapius, bet peržiūros dar nepatvirtintos.","limitations":["Paleidimas nepatvirtintas."]}
        return answer | ({"decision":"delegate","assignment":"Įvertinkite šias išsaugotas kliūtis."} if phase=="plan" else {}),{"input_tokens":2,"output_tokens":3}
    accepted,_=await send(c,c["auth"],base)
    assert await worker.execute_once(adapter=runner,kind=KIND)
    result=await page(c,c["auth"],base)
    assert result["turns"][0]["status"]=="succeeded" and len(reads)==1
    assert packets[0]==packets[1]==packets[2]
    async with AsyncSession(c["admin"]) as tx:
        turn=await tx.get(TeamTurn,accepted["turn"]["task_id"])
        assert turn.context["website_workflow"]==packets[0]
        run=await tx.scalar(select(TaskRun).where(TaskRun.task_id==turn.id))
        assert run.usage=={"input_tokens":6,"output_tokens":9}


@pytest.mark.parametrize("change",["session","registration","deadline"])
async def test_authority_or_deadline_loss_during_snapshot_has_no_provider_attempt(prepare_customer,monkeypatch,change):  # noqa: F811 - maintained fixture
    c=prepare_customer
    base=await setup(c)
    original=site_context.completion.projection
    normal_delta=service.timedelta
    if change=="deadline":
        monkeypatch.setattr(service,"timedelta",lambda **kwargs:timedelta(seconds=2))
    accepted,_=await send(c,c["auth"],base)
    monkeypatch.setattr(service,"timedelta",normal_delta)
    task_id=accepted["turn"]["task_id"]
    async def projection(tx,session,native_creation,revision):
        result=await original(tx,session,native_creation,revision)
        if change=="deadline":
            await asyncio.sleep(2.1)
        else:
            async with AsyncSession(c["admin"]) as admin,admin.begin():
                if change=="session":
                    await admin.execute(update(Session).where(Session.id==session.id).values(revoked_at=utcnow()))
                else:
                    await admin.execute(update(Registration).where(Registration.creation_id==native_creation.id).values(revoked_at=utcnow()))
        return result
    monkeypatch.setattr(site_context.completion,"projection",projection)
    async def forbidden(*args):
        raise AssertionError("Revoked or expired snapshot must not dispatch a model")
    assert await worker.execute_once(adapter=forbidden,kind=KIND) is False
    async with AsyncSession(c["admin"]) as tx:
        task=await tx.get(Task,task_id)
        assert task.status=="failed" and task.failure_code=="task_context_unavailable"
        assert list(await tx.scalars(select(Attempt.id).where(Attempt.task_id==task_id)))==[]
        assert list(await tx.scalars(select(TaskRun.id).where(TaskRun.task_id==task_id)))==[]
