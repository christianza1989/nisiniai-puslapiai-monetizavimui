import asyncio

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from ..config import settings
from ..control.routes import scope
from ..models import new_id, utcnow
from . import codex
from .models import Task, TaskRun
from .service import append_event, authority, context_for, expire_run, lease_deadline


async def finish_run(tx, task, status, *, usage=None):
    run = await tx.get(TaskRun, task.run_id) if task.run_id else None
    if run:
        run.status, run.finished_at, run.usage = status, utcnow(), usage
        # ChatGPT CLI usage is not an authoritative USD invoice.
        run.cost_microusd = None


async def claim():
    cfg = settings()
    if not cfg.chat_enabled or not cfg.chat_runner_enabled or not cfg.chat_operator_user_id:
        return None
    async with scope(user=cfg.chat_operator_user_id) as tx:
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                         {"k": "chat-claim:" + cfg.environment + ":" + cfg.chat_operator_user_id})
        running = list(await tx.scalars(select(Task).where(Task.status == "running").with_for_update()))
        for task in running:
            await expire_run(tx, task)
            if task.status == "running":
                return None
            await finish_run(tx, task, "failed")
        task = await tx.scalar(select(Task).where(Task.status == "queued").order_by(Task.created_at, Task.id)
                               .limit(1).with_for_update())
        if not task:
            return None
        if not await authority(tx, task):
            task.status, task.failure_code = "failed", "authorization_revoked"
            await append_event(tx, task)
            return None
        task.status, task.run_id, task.lease_until = "running", new_id(), lease_deadline()
        tx.add(TaskRun(id=task.run_id, task_id=task.id, business_id=task.business_id,
               organization_id=task.organization_id, user_id=task.user_id, environment_id=task.environment_id,
               status="running", model=cfg.chat_model, effort="medium", adapter_revision=codex.ADAPTER_REVISION))
        await append_event(tx, task)
        return {"task_id": task.id, "run_id": task.run_id, "context": await context_for(tx, task)}


async def heartbeat(task_id, run_id):
    async with scope(user=settings().chat_operator_user_id) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        if not task or task.status != "running" or task.run_id != run_id:
            return False
        if task.lease_until <= utcnow() or not await authority(tx, task):
            task.status, task.failure_code, task.lease_until = "failed", "authorization_revoked", None
            await finish_run(tx, task, "failed")
            await append_event(tx, task)
            return False
        task.lease_until = lease_deadline()
        return True


async def execute_once(adapter=None):
    claimed = await claim()
    if not claimed:
        return False
    task_id, run_id = claimed["task_id"], claimed["run_id"]
    result, usage, failure = None, None, None
    try:
        result, usage = await (adapter or codex.run)(claimed["context"], lambda: heartbeat(task_id, run_id))
        result = codex.normalize_answer(result)
    except codex.RunnerError as error:
        failure = error.code
    except Exception:
        # Unknown provider/OS diagnostics never become public task content.
        failure = "provider_error"
    async with scope(user=settings().chat_operator_user_id) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        if not task:
            return True  # Current RLS revocation hides the task; no result can be committed.
        if task.status != "running" or task.run_id != run_id:
            await finish_run(tx, task, task.status, usage=usage)
            return True
        if not await authority(tx, task):
            failure = "authorization_revoked"
        if task.lease_until <= utcnow():
            failure = "worker_interrupted"
        task.status, task.failure_code = ("failed", failure) if failure else ("succeeded", None)
        task.result = result if not failure else None
        task.lease_until = None
        await finish_run(tx, task, task.status, usage=usage)
        await append_event(tx, task)
    return True


async def loop():
    while True:
        try:
            if not await execute_once():
                await asyncio.sleep(1)
        except SQLAlchemyError:
            # A DB outage cannot authorize a blind provider retry. Expired runs fail on the next claim.
            await asyncio.sleep(5)
