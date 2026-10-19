"""One durable worker; static typed handlers supply authority/context/effects."""

import asyncio
import json

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from ..acquisition.ledger import LedgerError
from ..config import settings
from ..control.routes import ControlError, scope
from ..models import new_id, utcnow
from ..source_observation import SourceObservationError
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
    from ..acquisition.agent_role_handler import AgentRoleHandler
    from ..acquisition.model_handler import ModelHandler
    from ..acquisition.model_reply import ReplyHandler
    from ..acquisition.tasks import CaptureHandler
    from ..mail_view.task_handler import DisplayHandler
    from ..workspace_team.direct_handler import DirectHandler
    from ..workspace_team.handler import TeamHandler

    return (ChatHandler(), CaptureHandler(), TeamHandler(), DirectHandler(), ModelHandler(), ReplyHandler(), AgentRoleHandler(), DisplayHandler())


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
        elif task.kind == "workspace.direct_turn":
            from ..workspace_team.direct import saved_usage
            from ..workspace_team.quota import merge_usage
            usage = merge_usage(usage, await saved_usage(tx, task.id, run.id, task.user_id,
                task.environment_id, task.source_revision))
        elif task.kind == "mail.display_translate":
            from ..mail_view.task_handler import usage_for
            if run.status == "succeeded":
                return
            if run.status in {"failed", "cancelled"}:
                await handler_for(task.kind).terminal_failure(tx, task, usage, "worker_interrupted")
                return
            # Provider usage is durably checkpointed before Handler.run returns.
            usage = await usage_for(tx, task.id, run.id, task.user_id, task.environment_id, task.source_revision)
        elif task.kind in {"acquisition.model_prepare", "acquisition.model_reply", "acquisition.agent_role"}:
            from ..acquisition.model_handler import usage_for
            from ..workspace_team.quota import merge_usage
            saved = await usage_for(tx, task.id, run.id, task.user_id,
                task.environment_id, task.source_revision)
            usage = merge_usage(usage, saved)
            if run.status == "succeeded":
                return  # A late result cannot rewrite a successful run.
            if run.status in {"failed", "cancelled"}:
                # The visible path has the same terminal-history rule as the
                # revoked/hidden accounting helper: enrich knowledge only.
                usage = merge_usage(run.usage, usage)
                if saved is not None:
                    usage.update({key: saved[key] for key in (
                        "model_calls", "settled_calls", "unknown_usage_calls", "usage_complete")})
                if run.usage != usage:
                    run.usage = usage
                if run.cost_microusd is not None:
                    run.cost_microusd = None
                if task.lease_until is not None:
                    task.lease_until = None
                return
        run.status, run.finished_at, run.usage = status, utcnow(), usage
        if task.kind in {"workspace.team_turn", "workspace.direct_turn"} and task.status in {"succeeded", "failed", "cancelled"}:
            task.lease_until = None
        run.cost_microusd = None  # CLI usage is not an authoritative USD invoice.


async def reap_running(user_id):
    # Recovery locks Task/Run only. Commit these locks before the next queued
    # handler takes owner/Creation/Agent parents, matching heartbeat's order.
    async with scope(user=user_id) as tx:
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
            {"k": "chat-claim:" + settings().environment + ":" + user_id})
        running = list(await tx.scalars(select(Task).where(Task.status == "running").with_for_update()))
        for task in running:
            if task.lease_until and task.lease_until <= utcnow() and hasattr(handler_for(task.kind), "terminal_failure"):
                await handler_for(task.kind).terminal_failure(tx, task, None, "worker_interrupted")
                continue
            await expire_run(tx, task)
            if task.status != "running":
                await finish_run(tx, task, "failed")


async def claim(*, kind=None, task_id=None):
    if task_id is not None:
        from ..control.routes import identifier
        task_id = identifier(task_id)
    for handler in handlers():
        if kind is not None and handler.kind != kind:
            continue
        try:
            actors = await handler.actors()
        except LedgerError:
            continue
        for user_id in actors:
            if hasattr(handler, "reconcile"):
                # The fixed handler may resume an explicit durable intent.
                # Complete metadata preflight BEFORE actor/Task claim locks.
                await handler.reconcile(user_id)
            await reap_running(user_id)
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
                # Actor admission serializes claims. A fresh read also sees a
                # different worker that claimed between recovery and this tx.
                if await tx.scalar(select(Task.id).where(Task.status == "running").limit(1)):
                    continue
                if settings().workspace_team_enabled and await tx.scalar(
                    text("SELECT workspace_team_actor_busy(:u,:e)"), {"u": user_id, "e": settings().environment}
                ):
                    continue
                if task_id is not None:
                    if not hasattr(handler, "claim_exact_task"):
                        continue
                    task = await handler.claim_exact_task(tx, task_id)
                else:
                    task = await handler.claim_task(tx) if hasattr(handler, "claim_task") else await tx.scalar(
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
                task.status, task.run_id, task.lease_until = "running", new_id(), lease_deadline(
                    task.kind, until=tx.info.get("acquisition_model_deadlines", {}).get(task.id))
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
        parent_admitted = True
        if hasattr(handler, "authority_locks"):
            try:
                await handler.authority_locks(tx, task_id)
            except (ControlError, LedgerError, codex.RunnerError, ValueError, SourceObservationError):
                parent_admitted = False
        task = await tx.scalar(select(Task).where(Task.id == task_id, Task.kind == kind).with_for_update()
            .execution_options(populate_existing=True))
        if not task or task.status != "running" or task.run_id != run_id:
            return False
        admitted = parent_admitted and await handler.authority(tx, task)
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        if (
            not task.lease_until
            or task.lease_until <= now
            or not admitted
            or not handler.deadline_valid(tx, task, now)
        ):
            if hasattr(handler, "observe_guard"):
                reason = ("lease_missing" if not task.lease_until else "lease_expired" if task.lease_until <= now
                    else "authority_denied" if not admitted else "authority_deadline_expired")
                handler.observe_guard(tx, task, "heartbeat", reason, now=now)
            if hasattr(handler, "terminal_failure"):
                await handler.terminal_failure(tx, task, None, "authorization_revoked")
                return False
            task.status, task.failure_code, task.lease_until = "failed", "authorization_revoked", None
            await finish_run(tx, task, "failed")
            await append_event(tx, task)
            return False
        task.lease_until = lease_deadline(task.kind,
            until=tx.info.get("acquisition_model_deadlines", {}).get(task.id))
        return True


async def settle_hidden_task(tx, claimed, usage):
    """Existing accounting-only fallback; hidden output never becomes public."""
    if claimed["kind"] == "mail.display_translate":
        from ..mail_view.task_handler import settle_in_transaction
        await settle_in_transaction(tx, claimed, usage, "authorization_revoked")
        return
    if claimed["kind"] in {"acquisition.model_prepare", "acquisition.model_reply", "acquisition.agent_role"}:
        # This kind has a separately typed sink. The legacy Director whitelist
        # deliberately remains unchanged and must never silently discard it.
        from ..acquisition.model_handler import usage_for
        from ..workspace_team.quota import merge_usage
        usage = merge_usage(usage, await usage_for(tx, claimed["task_id"], claimed["run_id"], claimed["user_id"],
            claimed["environment_id"], claimed["source_revision"]))
        tokens = {key: number for key, number in (usage or {}).items() if key in {
            "input_tokens", "output_tokens", "cached_input_tokens", "reasoning_output_tokens"}
            and type(number) is int and 0 <= number <= 30_000_000_000}
        saved = await tx.scalar(text("SELECT acquisition_model_settle_task(:t,:r,:u,:e,:s,CAST(:j AS JSONB),:event)"), {
            "t": claimed["task_id"], "r": claimed["run_id"], "u": claimed["user_id"], "e": claimed["environment_id"],
            "s": claimed["source_revision"], "j": json.dumps(tokens) if tokens else None, "event": new_id()})
        if not saved:
            raise codex.RunnerError("acquisition_model_accounting_failed", tokens)
        return
    if not await tx.scalar(text(
        "SELECT to_regprocedure('public.director_settle_revoked_task(character varying,character varying,character varying,character varying,character varying,character varying,jsonb,character varying)') IS NOT NULL"
    )):
        return
    if claimed["kind"] == "workspace.team_turn":
        from ..workspace_team.quota import merge_usage, saved_usage
        usage = merge_usage(usage, await saved_usage(tx, task_id=claimed["task_id"], run_id=claimed["run_id"],
            user_id=claimed["user_id"], environment_id=claimed["environment_id"],
            source_revision=claimed["source_revision"]))
    elif claimed["kind"] == "workspace.direct_turn":
        from ..workspace_team.direct import saved_usage
        from ..workspace_team.quota import merge_usage
        usage = merge_usage(usage, await saved_usage(tx, claimed["task_id"], claimed["run_id"], claimed["user_id"],
            claimed["environment_id"], claimed["source_revision"]))
    observed = {
        key: value for key, value in (usage or {}).items()
        if isinstance(key, str)
        and (key.endswith("_tokens") or (
            claimed["kind"] == "acquisition.reviewed_capture" and key == "model_calls" and value == 0))
        and type(value) is int and 0 <= value <= 1_000_000_000
    } if isinstance(usage, dict) else None
    await tx.scalar(text("SELECT director_settle_revoked_task(:t,:r,:u,:e,:s,:k,CAST(:j AS JSONB),:event)"), {
        "t": claimed["task_id"], "r": claimed["run_id"], "u": claimed["user_id"],
        "e": claimed["environment_id"], "s": claimed["source_revision"], "k": claimed["kind"],
        "j": json.dumps(observed) if observed else None, "event": new_id()})


async def execute_once(adapter=None, *, kind=None, task_id=None):
    claimed = await claim(kind=kind, task_id=task_id)
    if not claimed:
        return False
    task_id, run_id = claimed["task_id"], claimed["run_id"]
    actor, handler = claimed["user_id"], handler_for(claimed["kind"])
    result, usage, failure = None, None, None
    try:
        result, usage = await handler.run(
            claimed["context"], lambda: heartbeat(task_id, run_id, user_id=actor, kind=handler.kind), adapter
        )
    except asyncio.CancelledError:
        if handler.kind in {"acquisition.model_prepare", "acquisition.model_reply", "acquisition.agent_role"}:
            from ..acquisition.model_handler import observed_total

            async def retain_cancelled():
                async with scope(user=actor) as tx:
                    await settle_hidden_task(tx, claimed, observed_total(claimed["context"]))

            try:
                await asyncio.shield(retain_cancelled())
            except (SQLAlchemyError, codex.RunnerError):
                # A retained reservation remains charged if the DB is unavailable.
                pass
        elif handler.kind == "mail.display_translate":
            from ..mail_view.task_handler import settle_accounting
            try:
                await asyncio.shield(settle_accounting(claimed,
                    claimed["context"].get("_observed_usage"), "worker_interrupted"))
            except (SQLAlchemyError, codex.RunnerError):
                pass
        raise  # Cancellation is never success, a retry, or a provider error.
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
        # Native effect adapters lock their parent/actor before the Task row.
        # No provider runs while these completion locks are held.
        if (not failure or getattr(handler, "always_completion_locks", False)) and hasattr(handler, "completion_locks"):
            try:
                await handler.completion_locks(tx, claimed)
            except (ControlError, LedgerError, codex.RunnerError, SourceObservationError) as error:
                failure = error.code
        task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update())
        if not task:
            # Losing a current grant must discard output, not lose already observed accounting.
            await settle_hidden_task(tx, claimed, usage)
            return True
        if task.status != "running" or task.run_id != run_id:
            await finish_run(tx, task, task.status, usage=usage)
            return True
        admitted = await handler.authority(tx, task)
        if not admitted:
            if hasattr(handler, "observe_guard"):
                handler.observe_guard(tx, task, "completion_authority", "authority_denied", prior_failure=failure)
            failure = "authorization_revoked"
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        if admitted and not handler.deadline_valid(tx, task, now):
            if hasattr(handler, "observe_guard"):
                handler.observe_guard(tx, task, "completion_deadline", "authority_deadline_expired", now=now,
                    prior_failure=failure)
            failure = "authorization_revoked"
        if not task.lease_until or task.lease_until <= now:
            if hasattr(handler, "observe_guard"):
                handler.observe_guard(tx, task, "completion_lease", "lease_expired" if task.lease_until else "lease_missing",
                    now=now, prior_failure=failure)
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
            except (ControlError, LedgerError, codex.RunnerError) as error:
                failure = error.code
            except SQLAlchemyError:
                failure = "task_effect_failed"
        if failure:
            # Rolling back a modified ORM Task expires its attributes. Reload
            # explicitly before terminal settlement; never perform implicit IO
            # or reuse a run that current RLS/status no longer admits.
            task = await tx.scalar(select(Task).where(Task.id == task_id).with_for_update()
                .execution_options(populate_existing=True))
            if not task:
                await settle_hidden_task(tx, claimed, usage)
                return True
            if task.status != "running" or task.run_id != run_id:
                await finish_run(tx, task, task.status, usage=usage)
                return True
        if failure and hasattr(handler, "terminal_failure"):
            await handler.terminal_failure(tx, task, usage, failure)
            return True
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
