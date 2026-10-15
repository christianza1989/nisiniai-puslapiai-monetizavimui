"""One Answer call through the maintained worker/CLI and durable attempt ledger."""
import asyncio
import hashlib

from pydantic import ValidationError
from sqlalchemy import exists, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import aliased

from ..control.routes import ControlError, scope
from ..creation.service import binding, digest
from ..models import new_id, utcnow
from ..tasks import codex
from ..tasks.models import Task
from . import adapter, direct, direct_policy
from .handler import TeamHandler, observed_usage, settle
from .models import Attempt
from .quota import call_slot


def live(task, context):
    return bool(task and task.status == "running" and task.run_id == context.get("_run_id")
        and task.lease_until and task.lease_until > utcnow())


async def reserve(context, packet):
    if not await asyncio.to_thread(adapter.runner_ready):
        raise codex.RunnerError("runner_unavailable")
    async with scope(user=context["_user_id"]) as tx:
        task = await tx.scalar(select(Task).where(Task.id == context["_task_id"], Task.kind == direct_policy.KIND))
        if not live(task, context):
            raise codex.RunnerError("authorization_revoked")
        try:
            # Parent/actor lock precedes Task lock, matching current-owner revocation/completion.
            row, chat, turn, _ = await direct.task_scope(tx, task, lock=True)
        except ControlError:
            raise codex.RunnerError("authorization_revoked") from None
        await call_slot(tx, context["_user_id"])
        task = await tx.scalar(select(Task).where(Task.id == task.id).with_for_update().execution_options(populate_existing=True))
        if (not live(task, context) or chat.id != context["_chat_id"] or turn.deadline <= utcnow()
                or turn.context_sha256 != context["_direct_context_sha256"] or digest(turn.context) != turn.context_sha256
                or packet != turn.context or await tx.scalar(select(Attempt.id).where(Attempt.task_id == task.id).limit(1))):
            raise codex.RunnerError("authorization_revoked")
        role = "direct_" + chat.recipient["role"]
        attempt = Attempt(id=new_id(), **binding(row), task_id=task.id, team_thread_id=chat.team_thread_id,
            run_id=task.run_id, business_id=chat.business_id, ordinal=1, phase="direct", state="reserved",
            context=packet, context_sha256=digest(packet),
            instruction_sha256=hashlib.sha256(adapter.prompt_for(role, packet).encode()).hexdigest(),
            model=direct_policy.MODEL, effort=direct_policy.EFFORT, source_revision=task.source_revision)
        tx.add(attempt)
        await tx.flush()
        return {"id": attempt.id, "run_id": task.run_id, "user_id": task.user_id,
            "source_revision": task.source_revision, "environment_id": task.environment_id, "role": role}


class DirectHandler:
    kind, effort, model, adapter_revision = (direct_policy.KIND, direct_policy.EFFORT,
        direct_policy.MODEL, direct_policy.ADAPTER)
    actors = TeamHandler.actors

    def queue_filter(self):
        earlier = aliased(Task)
        return ~exists(select(earlier.id).where(earlier.thread_id == Task.thread_id, earlier.kind == self.kind,
            earlier.sequence < Task.sequence, earlier.status.in_(["queued", "running"])))

    async def authority(self, tx, task):
        try:
            await direct.task_scope(tx, task)
            return True
        except ControlError:
            return False

    def deadline_valid(self, tx, task, now):
        deadline = tx.info.get("direct_deadlines", {}).get(task.id)
        return deadline is not None and deadline > now

    async def context(self, tx, task):
        from .direct_context import context_for
        return await context_for(tx, task)

    async def store_context(self, tx, task, run_id, context):
        context["_run_id"] = run_id

    async def completion_locks(self, tx, claimed):
        task = await tx.get(Task, claimed["task_id"], populate_existing=True)
        if not task or task.run_id != claimed["run_id"]:
            raise ControlError(403, "authorization_revoked")
        await direct.task_scope(tx, task, lock=True)

    async def run(self, context, heartbeat, runner=None):
        packet = {key: value for key, value in context.items() if not key.startswith("_")}
        receipt, usage = None, None
        try:
            receipt = await reserve(context, packet)
            if not await heartbeat():
                raise codex.RunnerError("authorization_revoked")
            value, usage = await (runner or adapter.run)(receipt["role"], packet, heartbeat)
            value = adapter.Answer.model_validate(value).model_dump(mode="json")
            usage = observed_usage(usage)
            await settle(receipt, "succeeded", usage)
            return {"attempt_id": receipt["id"], "context_sha256": context["_direct_context_sha256"],
                "answer": value}, usage
        except codex.RunnerError as error:
            usage = observed_usage(error.receipt) or observed_usage(usage)
            if receipt:
                await settle(receipt, "failed", usage)
            raise codex.RunnerError(error.code, usage) from None
        except (ValidationError, ValueError, TypeError):
            if receipt:
                await settle(receipt, "failed", observed_usage(usage))
            raise codex.RunnerError("output_invalid", observed_usage(usage)) from None
        except (ControlError, SQLAlchemyError):
            # Retained reservation is never repeated on uncertain accounting.
            raise codex.RunnerError("task_result_unavailable", observed_usage(usage)) from None
        except BaseException:
            if receipt:
                await settle(receipt, "failed", observed_usage(usage))
            raise

    async def complete(self, tx, task, result):
        row, chat, turn, _ = await direct.task_scope(tx, task)
        if (not isinstance(result, dict) or set(result) != {"attempt_id", "context_sha256", "answer"}
                or result["context_sha256"] != turn.context_sha256 or digest(turn.context) != turn.context_sha256):
            raise codex.RunnerError("output_invalid")
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id)))
        if len(attempts) != 1:
            raise codex.RunnerError("output_invalid")
        attempt = attempts[0]
        if (attempt.id != result["attempt_id"] or attempt.run_id != task.run_id or attempt.state != "succeeded"
                or attempt.phase != "direct" or attempt.ordinal != 1 or attempt.team_thread_id != chat.team_thread_id
                or attempt.business_id != chat.business_id or binding(attempt) != binding(row)
                or attempt.context != turn.context or attempt.context_sha256 != turn.context_sha256
                or attempt.source_revision != task.source_revision or attempt.model != self.model or attempt.effort != self.effort
                or attempt.instruction_sha256 != hashlib.sha256(adapter.prompt_for("direct_" + chat.recipient["role"], turn.context).encode()).hexdigest()):
            raise codex.RunnerError("output_invalid")
        value = adapter.Answer.model_validate(result["answer"]).model_dump(mode="json")
        event = await direct.add_event(tx, chat, task, chat.recipient["role"], adapter.public_text(value),
            reply=turn.owner_event_id, attempt=attempt.id)
        from .direct_projection import event_view
        await event_view(tx, chat, event)
        # Validate deferred answer provenance while the maintained Task is still running.
        await tx.execute(text("SET CONSTRAINTS workspace_team_fence IMMEDIATE"))
        await tx.execute(text("SET CONSTRAINTS workspace_team_fence DEFERRED"))
        return {"public_events_saved": 1, "context_sha256": turn.context_sha256, "chat_id": chat.id}
