"""One typed handler for the maintained worker; no duplicate queue/lease/executor."""
import hashlib
import json

from pydantic import ValidationError
from sqlalchemy import exists, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import aliased

from ..config import settings
from ..control.routes import ControlError, scope
from ..creation.service import binding, digest
from ..models import new_id, utcnow
from ..tasks import codex
from ..tasks.models import Task
from . import adapter, service
from .models import Attempt
from .policy import ADAPTER, EFFORT, KIND, MAX_CALLS, MODEL
from .quota import call_slot


def observed_usage(value):
    if not isinstance(value, dict):
        return None
    result = {key: n for key, n in value.items() if key in {
        "input_tokens", "output_tokens", "cached_input_tokens", "reasoning_output_tokens"}
        and type(n) is int and 0 <= n <= 1_000_000_000}
    return result or None


def combined_usage(values):
    result = {}
    for value in values:
        for key, n in (observed_usage(value) or {}).items():
            result[key] = result.get(key, 0)+n
    return result or None


async def reserve(context, phase, packet):
    async with scope(user=context["_user_id"]) as tx:
        await call_slot(tx, context["_user_id"])
        task = await tx.scalar(select(Task).where(Task.id == context["_task_id"], Task.kind == KIND).with_for_update())
        if (not task or task.status != "running" or task.run_id != context.get("_run_id")
                or not task.lease_until or task.lease_until <= utcnow()):
            raise codex.RunnerError("authorization_revoked")
        try:
            row, thread, turn = await service.task_scope(tx, task)
        except ControlError:
            raise codex.RunnerError("authorization_revoked") from None
        if turn.deadline <= utcnow() or turn.context_sha256 != context["_team_context_sha256"] or digest(turn.context) != turn.context_sha256:
            raise codex.RunnerError("authorization_revoked")
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id).order_by(Attempt.ordinal)))
        expected = ("plan", "adviser", "synthesis")
        if len(attempts) >= MAX_CALLS or phase != expected[len(attempts)] or any(a.state != "succeeded" for a in attempts):
            raise codex.RunnerError("task_attempt_invalid")
        attempt = Attempt(id=new_id(), task_id=task.id, team_thread_id=thread.id, run_id=task.run_id,
            business_id=task.business_id, ordinal=len(attempts)+1, phase=phase, state="reserved",
            context=packet, context_sha256=digest(packet), instruction_sha256=hashlib.sha256(adapter.prompt_for(phase, packet).encode()).hexdigest(),
            model=MODEL, effort=EFFORT, source_revision=task.source_revision, **binding(row))
        tx.add(attempt)
        await tx.flush()
        return {"id": attempt.id, "run_id": task.run_id, "user_id": task.user_id,
            "source_revision": task.source_revision, "environment_id": task.environment_id}


async def settle(receipt, state, usage):
    # Narrow accounting-only retained-attempt function; cannot reveal/publish a result or grant authority.
    async with scope(user=receipt["user_id"]) as tx:
        result = await tx.scalar(text("SELECT workspace_team_settle_attempt(:a,:r,:u,:e,:src,:s,CAST(:j AS JSONB))"),
            {"a": receipt["id"], "r": receipt["run_id"], "u": receipt["user_id"], "e": receipt["environment_id"],
             "src": receipt["source_revision"], "s": state, "j": json.dumps(observed_usage(usage)) if observed_usage(usage) is not None else None})
        if not result:
            raise codex.RunnerError("task_accounting_failed", observed_usage(usage))


async def publish(context, attempt_id, author, kind, content):
    async with scope(user=context["_user_id"]) as tx:
        task = await tx.scalar(select(Task).where(Task.id == context["_task_id"], Task.kind == KIND).with_for_update())
        if (not task or task.status != "running" or task.run_id != context["_run_id"]
                or not task.lease_until or task.lease_until <= utcnow()):
            raise codex.RunnerError("authorization_revoked")
        try:
            row, thread, turn = await service.task_scope(tx, task)
        except ControlError:
            raise codex.RunnerError("authorization_revoked") from None
        if turn.deadline <= utcnow() or turn.context_sha256 != context["_team_context_sha256"]:
            raise codex.RunnerError("authorization_revoked")
        attempt = await tx.get(Attempt, attempt_id)
        if not attempt or attempt.task_id != task.id or attempt.run_id != task.run_id or attempt.state != "succeeded":
            raise codex.RunnerError("output_invalid")
        thread = await service.team_thread(tx, row, lock=True)
        event = await service.add_event(tx, row, thread, task.id, author, kind, content,
            reply=turn.owner_event_id, attempt=attempt_id)
        service.event_view(event, row)
        return event.id


class TeamHandler:
    kind, effort, model, adapter_revision = KIND, EFFORT, MODEL, ADAPTER

    async def actors(self):
        cfg = settings()
        if not cfg.workspace_team_enabled or not cfg.workspace_team_runner_enabled:
            return []
        from uuid import UUID
        try:
            return list(dict.fromkeys(str(UUID(value)) for value in cfg.workspace_team_actor_ids)) if len(cfg.workspace_team_actor_ids) <= 20 else []
        except (ValueError, TypeError):
            return []

    def queue_filter(self):
        earlier = aliased(Task)
        return ~exists(select(earlier.id).where(earlier.thread_id == Task.thread_id, earlier.kind == KIND,
            earlier.sequence < Task.sequence, earlier.status.in_(["queued", "running"])))

    async def authority(self, tx, task):
        try:
            await service.task_scope(tx, task)
            return True
        except ControlError:
            return False

    def deadline_valid(self, tx, task, now):
        deadline = tx.info.get("workspace_team_deadlines", {}).get(task.id)
        return deadline is not None and deadline > now

    async def context(self, tx, task):
        return await service.context_for(tx, task)

    async def store_context(self, tx, task, run_id, context):
        context["_run_id"] = run_id
        from . import episode
        if await episode.optional_allocation(tx, task.id) is not None:
            from .calibration_budget import bind_run
            await bind_run(tx, task.id, run_id, context["_team_context_sha256"])

    def revision_for(self, context):
        from . import episode
        return episode.ADAPTER if "_agent_episode_plan" in context else self.adapter_revision

    async def completion_locks(self, tx, claimed):
        from .preparation import completion_locks
        await completion_locks(tx, claimed)
        from . import episode
        await episode.completion_locks(tx, claimed)

    async def run(self, context, heartbeat, runner=None):
        if "_agent_episode_plan" in context:
            from . import episode
            try:
                return await episode.execute(context, heartbeat)
            except ControlError as error:
                raise codex.RunnerError(error.code) from None
            except SQLAlchemyError:
                raise codex.RunnerError("task_result_unavailable") from None
        usage, messages = [], []
        public = {key: value for key, value in context.items() if not key.startswith("_")}

        async def call(phase, packet):
            receipt = await reserve(context, phase, packet)
            try:
                if not await heartbeat():
                    raise codex.RunnerError("authorization_revoked")
                value, observed = await (runner or adapter.run)(phase, packet, heartbeat)
                model = adapter.plan_model(packet) if phase == "plan" else adapter.Answer
                value = model.model_validate(value).model_dump(mode="json")
            except codex.RunnerError as error:
                observed = observed_usage(error.receipt)
                usage.append(observed)
                await settle(receipt, "failed", observed)
                raise codex.RunnerError(error.code, combined_usage(usage)) from None
            except (ValidationError, ValueError, TypeError):
                # Returned usage is already observed even when normalization fails.
                observed = locals().get("observed")
                usage.append(observed)
                await settle(receipt, "failed", observed)
                raise codex.RunnerError("output_invalid", combined_usage(usage)) from None
            except BaseException:
                await settle(receipt, "failed", None)
                raise
            usage.append(observed)
            await settle(receipt, "succeeded", observed)
            return value, receipt["id"]

        try:
            plan, plan_attempt = await call("plan", public)
            if public.get("agent_preparation") is not None:
                return {"context_sha256": context["_team_context_sha256"], "preparation": plan,
                    "attempt_id": plan_attempt}, combined_usage(usage)
            if plan["decision"] == "answer":
                messages.append(await publish(context, plan_attempt, "coordinator", "answer", adapter.public_text(plan)))
            else:
                assignment_text = adapter.public_text({"answer": "Pavedimas verslo patarėjui:\n"+plan["assignment"], "limitations": plan["limitations"]})
                messages.append(await publish(context, plan_attempt, "coordinator", "assignment", assignment_text))
                adviser_packet = {"business": public["business"], "owner_goal": public["message"],
                    "assignment": plan["assignment"], "coordinator_limitations": plan["limitations"],
                    "reply": public["reply"], "roster": public["roster"], "scope": "internal_tools_disabled_consultation"}
                if "website_workflow" in public:
                    adviser_packet["website_workflow"] = public["website_workflow"]
                adviser, adviser_attempt = await call("adviser", adviser_packet)
                messages.append(await publish(context, adviser_attempt, "adviser", "answer", adapter.public_text(adviser)))
                result, synthesis_attempt = await call("synthesis", {**public, "coordinator_plan": plan, "adviser_result": adviser})
                messages.append(await publish(context, synthesis_attempt, "coordinator", "answer", adapter.public_text(result)))
            return {"messages": messages, "context_sha256": context["_team_context_sha256"]}, combined_usage(usage)
        except codex.RunnerError as error:
            raise codex.RunnerError(error.code, combined_usage(usage) or error.receipt) from None
        except (SQLAlchemyError, ControlError):
            raise codex.RunnerError("task_result_unavailable", combined_usage(usage)) from None

    async def complete(self, tx, task, result):
        row, thread, turn = await service.task_scope(tx, task)
        from . import episode
        if await episode.optional_allocation(tx, task.id) is not None:
            return await episode.complete(tx, task, row, turn, result)
        if turn.agent_creation_id is not None:
            from .preparation import complete
            return await complete(tx, task, row, turn, result)
        if not isinstance(result, dict) or set(result) != {"messages", "context_sha256"} or result["context_sha256"] != turn.context_sha256:
            raise codex.RunnerError("output_invalid")
        messages = result["messages"]
        attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id).order_by(Attempt.ordinal)))
        expected = [("coordinator", "answer", "plan")] if len(messages) == 1 else [
            ("coordinator", "assignment", "plan"), ("adviser", "answer", "adviser"), ("coordinator", "answer", "synthesis")]
        if len(messages) not in {1, 3} or len(attempts) != len(messages):
            raise codex.RunnerError("output_invalid")
        thread = await service.team_thread(tx, row, lock=True)
        from .models import TeamEvent
        for event_id, attempt, (author, kind, phase) in zip(messages, attempts, expected, strict=True):
            event = await tx.get(TeamEvent, event_id) if isinstance(event_id, str) else None
            if (not event or event.author_type != author or event.kind != kind or event.attempt_id != attempt.id
                    or event.task_id != task.id or event.team_thread_id != thread.id
                    or attempt.run_id != task.run_id or attempt.state != "succeeded" or attempt.phase != phase):
                raise codex.RunnerError("output_invalid")
            service.event_view(event, row)
        return {"public_events_saved": len(messages), "context_sha256": turn.context_sha256}
