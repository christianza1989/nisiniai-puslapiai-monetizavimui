"""One durable worker; static typed handlers supply authority/context/effects."""

import asyncio

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from ..acquisition.ledger import LedgerError
from ..config import settings
from ..control.routes import scope
from ..models import new_id, utcnow
from . import codex
from .models import Task, TaskRun
from .service import append_event, authority, context_for, expire_run, lease_deadline


class ChatHandler:
    kind = "chat.consult"
    effort = "medium"
    adapter_revision = codex.ADAPTER_REVISION

    @property
    def model(self):
        return settings().chat_model

    async def actors(self):
        cfg = settings()
        return (
            [cfg.chat_operator_user_id]
            if cfg.chat_enabled and cfg.chat_runner_enabled and cfg.chat_operator_user_id
            else []
        )

    async def authority(self, tx, task):
        return await authority(tx, task)

    async def context(self, tx, task):
        return await context_for(tx, task)

    async def run(self, context, heartbeat, adapter=None):
        result, usage = await (adapter or codex.run)(context, heartbeat)
        return codex.normalize_answer(result), usage

    async def complete(self, tx, task, result):
        return codex.normalize_answer(result)


def handlers():
    # Source-fixed registry, never a browser-selected import/tool/executable.
    from ..acquisition.tasks import CaptureHandler

    return (ChatHandler(), CaptureHandler())


def handler_for(kind):
    value = next((handler for handler in handlers() if handler.kind == kind), None)
    if value is None:
        raise codex.RunnerError("task_kind_unavailable")
    return value


async def finish_run(tx, task, status, *, usage=None):
    run = await tx.get(TaskRun, task.run_id) if task.run_id else None
    if run:
        run.status, run.finished_at, run.usage = status, utcnow(), usage
        run.cost_microusd = None  # CLI usage is not an authoritative USD invoice.


async def claim(*, kind=None):
    for handler in handlers():
        if kind is not None and handler.kind != kind:
            continue
        try:
            actors = await handler.actors()
        except LedgerError:
            continue
        for user_id in actors:
            async with scope(user=user_id) as tx:
                # Existing actor lock: all kinds share one running slot.
                await tx.execute(
                    text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                    {"k": "chat-claim:" + settings().environment + ":" + user_id},
                )
                running = list(
                    await tx.scalars(select(Task).where(Task.status == "running").with_for_update())
                )
                busy = False
                for task in running:
                    await expire_run(tx, task)
                    if task.status == "running":
                        busy = True
                    else:
                        await finish_run(tx, task, "failed")
                if busy:
                    continue
                task = await tx.scalar(
                    select(Task)
                    .where(Task.status == "queued", Task.kind == handler.kind)
                    .order_by(Task.created_at, Task.id)
                    .limit(1)
                    .with_for_update()
                )
                if not task:
                    continue
                if not await handler.authority(tx, task):
                    task.status, task.failure_code = "failed", "authorization_revoked"
                    await append_event(tx, task)
                    continue
                context = await handler.context(tx, task)
                task.status, task.run_id, task.lease_until = "running", new_id(), lease_deadline()
                tx.add(
                    TaskRun(
                        id=task.run_id,
                        task_id=task.id,
                        business_id=task.business_id,
                        organization_id=task.organization_id,
                        user_id=task.user_id,
                        environment_id=task.environment_id,
                        status="running",
                        model=handler.model,
                        effort=handler.effort,
                        adapter_revision=handler.adapter_revision,
                    )
                )
                await append_event(tx, task)
                return {
                    "task_id": task.id,
                    "run_id": task.run_id,
                    "user_id": user_id,
                    "kind": task.kind,
                    "context": context,
                }
    return None


async def heartbeat(task_id, run_id, *, user_id=None, kind="chat.consult"):
    handler = handler_for(kind)
    actor = user_id or settings().chat_operator_user_id
    async with scope(user=actor) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id, Task.kind == kind).with_for_update())
        if not task or task.status != "running" or task.run_id != run_id:
            return False
        admitted = await handler.authority(tx, task)
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        if not task.lease_until or task.lease_until <= now or not admitted:
            task.status, task.failure_code, task.lease_until = "failed", "authorization_revoked", None
            await finish_run(tx, task, "failed")
            await append_event(tx, task)
            return False
        task.lease_until = lease_deadline()
        return True


async def execute_once(adapter=None, *, kind=None):
    claimed = await claim(kind=kind)
    if not claimed:
        return False
    task_id, run_id = claimed["task_id"], claimed["run_id"]
    actor, handler = claimed["user_id"], handler_for(claimed["kind"])
    result, usage, failure = None, None, None
    try:
        result, usage = await handler.run(
            claimed["context"], lambda: heartbeat(task_id, run_id, user_id=actor, kind=handler.kind), adapter
        )
    except codex.RunnerError as error:
        failure = error.code
        if isinstance(error.receipt, dict):
            observed = {
                key: value
                for key, value in error.receipt.items()
                if isinstance(key, str)
                and key.endswith("_tokens")
                and type(value) is int
                and 0 <= value <= 1_000_000_000
            }
            usage = observed or usage
    except LedgerError as error:
        failure = error.code
    except Exception:
        failure = "provider_error"  # No private provider/OS diagnostic text.
    async with scope(user=actor) as tx:
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        if not task:
            return True
        if task.status != "running" or task.run_id != run_id:
            await finish_run(tx, task, task.status, usage=usage)
            return True
        if not await handler.authority(tx, task):
            failure = "authorization_revoked"
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        if not task.lease_until or task.lease_until <= now:
            failure = "worker_interrupted"
        if not failure:
            try:
                # A failed final fence rolls back effects while retaining the
                # attempt. Task/run/event and canonical capture commit together.
                async with tx.begin_nested():
                    result = await handler.complete(tx, task, result)
                    admitted = await handler.authority(tx, task)
                    now = await tx.scalar(text("SELECT clock_timestamp()"))
                    if not admitted:
                        raise LedgerError(409, "authorization_revoked")
                    if not task.lease_until or task.lease_until <= now:
                        raise LedgerError(409, "worker_interrupted")
            except (LedgerError, codex.RunnerError) as error:
                failure = error.code
            except SQLAlchemyError:
                failure = "task_effect_failed"
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
            await asyncio.sleep(5)  # Outage cannot authorize a blind retry.
