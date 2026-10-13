"""One durable worker; static typed handlers supply authority/context/effects."""

import asyncio
import json

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from ..acquisition.ledger import LedgerError
from ..config import settings
from ..control.routes import ControlError, scope
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

    def deadline_valid(self, tx, task, now):
        from ..director.read import deadline_valid

        expiry = tx.info.get("chat_session_deadlines", {}).get(task.id)
        return expiry is not None and expiry > now and deadline_valid(tx, task, now)

    async def context(self, tx, task):
        from ..director.read import prepare

        return await prepare(tx, task, await context_for(tx, task))

    async def reserve_root(self, tx, task):
        if settings().workspace_team_enabled:
            from ..workspace_team.quota import call_slot
            await call_slot(tx, task.user_id)

    def revision_for(self, context):
        from ..director.read import ADAPTER_REVISION

        return ADAPTER_REVISION if "_director_receipt" in context else self.adapter_revision

    async def store_context(self, tx, task, run_id, context):
        from ..director.read import store

        await store(tx, task, run_id, context)

    async def run(self, context, heartbeat, adapter=None):
        public = {key: value for key, value in context.items() if not key.startswith("_")}
        result, usage = await (adapter or codex.run)(public, heartbeat)
        return codex.normalize_answer(result), usage

    async def complete(self, tx, task, result):
        return codex.normalize_answer(result)


def handlers():
    # Source-fixed registry, never a browser-selected import/tool/executable.
    from ..acquisition.tasks import CaptureHandler
    from ..workspace_team.handler import TeamHandler

    return (ChatHandler(), CaptureHandler(), TeamHandler())


def handler_for(kind):
    value = next((handler for handler in handlers() if handler.kind == kind), None)
    if value is None:
        raise codex.RunnerError("task_kind_unavailable")
    return value


async def finish_run(tx, task, status, *, usage=None):
    run = (
        await tx.scalar(select(TaskRun).where(TaskRun.id == task.run_id, TaskRun.task_id == task.id))
        if task.run_id
        else None
    )
    if run:
        if task.kind == "workspace.team_turn":
            from ..workspace_team.quota import merge_usage, saved_usage
            usage = merge_usage(usage, await saved_usage(tx, task_id=task.id, run_id=run.id, user_id=task.user_id,
                environment_id=task.environment_id, source_revision=task.source_revision))
        run.status, run.finished_at, run.usage = status, utcnow(), usage
        if task.kind == "workspace.team_turn" and task.status in {"succeeded", "failed", "cancelled"}:
            task.lease_until = None
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
                if settings().workspace_team_enabled:
                    from ..workspace_team.quota import release_queue
                    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                        {"k": "chat-admission:"+settings().environment+":"+user_id})
                    await release_queue(tx, user_id)
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
                if settings().workspace_team_enabled and await tx.scalar(
                    text("SELECT workspace_team_actor_busy(:u,:e)"), {"u": user_id, "e": settings().environment}
                ):
                    continue
                task = await tx.scalar(
                    select(Task)
                    .where(Task.status == "queued", Task.kind == handler.kind)
                    .where(handler.queue_filter() if hasattr(handler, "queue_filter") else True)
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
                try:
                    if hasattr(handler, "reserve_root"):
                        await handler.reserve_root(tx, task)
                    context = await handler.context(tx, task)
                except (ControlError, LedgerError, codex.RunnerError):
                    task.status, task.failure_code = "failed", "task_context_unavailable"
                    await append_event(tx, task)
                    continue
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
                        adapter_revision=handler.revision_for(context)
                        if hasattr(handler, "revision_for")
                        else handler.adapter_revision,
                    )
                )
                await tx.flush()
                if hasattr(handler, "store_context"):
                    await handler.store_context(tx, task, task.run_id, context)
                await append_event(tx, task)
                return {
                    "task_id": task.id,
                    "run_id": task.run_id,
                    "user_id": user_id,
                    "environment_id": task.environment_id,
                    "source_revision": task.source_revision,
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
        if (
            not task.lease_until
            or task.lease_until <= now
            or not admitted
            or not handler.deadline_valid(tx, task, now)
        ):
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
            # Losing a current grant must discard output, not lose already observed accounting.
            if await tx.scalar(
                text(
                    "SELECT to_regprocedure('public.director_settle_revoked_task(character varying,character varying,character varying,character varying,character varying,character varying,jsonb,character varying)') IS NOT NULL"
                )
            ):
                if claimed["kind"] == "workspace.team_turn":
                    from ..workspace_team.quota import merge_usage, saved_usage
                    usage = merge_usage(usage, await saved_usage(tx, task_id=task_id, run_id=run_id, user_id=actor,
                        environment_id=claimed["environment_id"], source_revision=claimed["source_revision"]))
                observed = (
                    {
                        key: value
                        for key, value in (usage or {}).items()
                        if isinstance(key, str)
                        and (
                            key.endswith("_tokens")
                            or (
                                claimed["kind"] == "acquisition.reviewed_capture"
                                and key == "model_calls"
                                and value == 0
                            )
                        )
                        and type(value) is int
                        and 0 <= value <= 1_000_000_000
                    }
                    if isinstance(usage, dict)
                    else None
                )
                await tx.scalar(
                    text("SELECT director_settle_revoked_task(:t,:r,:u,:e,:s,:k,CAST(:j AS JSONB),:event)"),
                    {
                        "t": task_id,
                        "r": run_id,
                        "u": actor,
                        "e": claimed["environment_id"],
                        "s": claimed["source_revision"],
                        "k": claimed["kind"],
                        "j": json.dumps(observed) if observed else None,
                        "event": new_id(),
                    },
                )
            return True
        if task.status != "running" or task.run_id != run_id:
            await finish_run(tx, task, task.status, usage=usage)
            return True
        admitted = await handler.authority(tx, task)
        if not admitted:
            failure = "authorization_revoked"
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        if admitted and not handler.deadline_valid(tx, task, now):
            failure = "authorization_revoked"
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
                    if not admitted or not handler.deadline_valid(tx, task, now):
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
