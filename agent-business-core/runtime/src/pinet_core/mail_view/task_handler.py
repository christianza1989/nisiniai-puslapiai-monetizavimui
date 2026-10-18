"""One separately authorized display call on the common durable worker."""
import asyncio
import json
import re
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import aliased

from ..config import settings
from ..control.routes import ControlError, scope
from ..creation.service import digest
from ..file_hash import sha256_file
from ..models import new_id
from ..source_observation import SourceObservationError
from ..tasks.codex_transport import RunnerError
from ..tasks.models import Task
from ..tasks.service import append_event
from . import runner
from . import task_authority as authority
from . import task_service as service
from .task_contract import ADAPTER, EFFORT, KIND, MODEL
from .task_models import DisplayJob
from .translations import POLICY_SHA, observed_usage

DENIED = (ControlError, RunnerError, ValueError, SourceObservationError)
FAILURES = {"authorization_revoked", "provider_error", "mail_translation_invalid", "mail_authority_changed",
    "worker_interrupted", "run_timeout", "output_invalid", "translation_runner_unavailable", "translation_deadline_invalid"}
REASONS = FAILURES | {"usage_observed"}


def runner_ready():
    cfg = settings()
    binary, workspace = Path(cfg.chat_codex_executable), Path(cfg.chat_workspace)
    try:
        return bool(cfg.mail_display_tasks_enabled and cfg.mail_display_runner_enabled
            and binary.is_absolute() and binary.is_file() and workspace.is_absolute() and workspace.is_dir()
            and not any(p.is_symlink() for p in (workspace, *workspace.parents))
            and re.fullmatch("[a-f0-9]{64}", cfg.chat_codex_sha256)
            and sha256_file(binary) == cfg.chat_codex_sha256)
    except OSError:
        return False


async def preflight(tx, task):
    job = await tx.get(DisplayJob, task.id, populate_existing=True)
    if (job is None or task.kind != KIND or not task.business_id or not task.session_id
            or (job.business_id, job.organization_id, job.user_id, job.environment_id, job.kind)
            != (task.business_id, task.organization_id, task.user_id, task.environment_id, task.kind)):
        raise RunnerError("authorization_revoked")
    async with authority.current(tx, job.policy_id, task.session_id, execution=True) as (policy, session):
        mail, original, sha = await authority.original(tx, policy, job.mail_id)
        key = service.execution_identity(job, service.identity(policy.business_id, policy.environment_id, mail.id, sha))
        if (job.source_sha256 != sha or job.case_id != mail.case_id or job.instruction_sha256 != POLICY_SHA
                or job.target_language != "lt" or task.source_revision != policy.source_revision
                or job.generation > 0 and service.legacy_claim(policy.business_id, policy.environment_id, original)
                or task.fingerprint != digest({"source": key, "policy_fingerprint": policy.fingerprint})):
            raise RunnerError("authorization_revoked")
        expiry = min(policy.expires_at, session.expires_at)
        tx.info.setdefault("mail_display_deadlines", {})[task.id] = expiry
        return job, policy, original, expiry


async def usage_for(tx, task_id, run_id, user_id, environment_id, source_revision):
    value = await tx.scalar(text("SELECT mail_display_run_usage(:t,:r,:u,:e,:s)"),
        {"t": task_id, "r": run_id, "u": user_id, "e": environment_id, "s": source_revision})
    if value is None:
        return None
    return {**(value["usage"] or {}), **{key: value[key] for key in (
        "model_calls", "unknown_usage_calls", "usage_complete")}}


async def settle_in_transaction(tx, claimed, usage, reason="authorization_revoked"):
    known = observed_usage(usage)
    saved = await tx.scalar(text("SELECT mail_display_settle_task(:t,:r,:u,:e,:s,CAST(:j AS JSONB),:reason,:event)"),
        {"t": claimed["task_id"], "r": claimed["run_id"], "u": claimed["user_id"],
         "e": claimed["environment_id"], "s": claimed["source_revision"],
         "j": json.dumps(known) if known is not None else None,
         "reason": reason if reason in REASONS else "provider_error", "event": new_id()})
    if not saved:
        raise RunnerError("mail_display_accounting_failed", known)


async def settle_accounting(claimed, usage, reason="authorization_revoked"):
    async with scope(user=claimed["user_id"]) as tx:
        await settle_in_transaction(tx, claimed, usage, reason)


class DisplayHandler:
    kind, model, effort, adapter_revision = KIND, MODEL, EFFORT, ADAPTER
    always_completion_locks = True

    async def terminal_failure(self, tx, task, usage, reason):
        await settle_in_transaction(tx, {"task_id": task.id, "run_id": task.run_id,
            "user_id": task.user_id, "environment_id": task.environment_id,
            "source_revision": task.source_revision}, usage, reason if reason in FAILURES else "provider_error")

    async def actors(self):
        try:
            authority.guard(execution=True)
        except ControlError:
            return []
        actors = list(settings().mail_display_actor_ids)
        if not actors:
            return []
        async with scope(user=actors[0]) as tx:
            return actors if await service.schema_ready(tx) else []

    async def reconcile(self, user_id):
        try:
            await service.reconcile(user_id)
        except DENIED:
            return

    async def claim_task(self, tx):
        successor = aliased(DisplayJob)
        task = await tx.scalar(select(Task).where(Task.kind == KIND, Task.status == "queued")
            .where(~select(successor.task_id).where(successor.previous_task_id == Task.id).exists())
            .order_by(Task.created_at, Task.id).limit(1))
        if task is None:
            return None
        try:
            await preflight(tx, task)
        except DENIED:
            task = await tx.get(Task, task.id, with_for_update=True, populate_existing=True)
            if task and task.status == "queued" and not await tx.scalar(
                select(successor.task_id).where(successor.previous_task_id == task.id).limit(1)
            ):
                task.status, task.failure_code = "failed", "authorization_revoked"
                await append_event(tx, task)
            return None
        task = await tx.scalar(select(Task).where(Task.id == task.id, Task.status == "queued")
            .with_for_update().execution_options(populate_existing=True))
        # Re-read after the Task lock wait: a committed successor must leave its
        # retained ancestor untouched even if the first preflight was admitted.
        if task is not None and await tx.scalar(
            select(successor.task_id).where(successor.previous_task_id == task.id).limit(1)
        ):
            return None
        return task

    async def authority_locks(self, tx, task_id):
        task = await tx.get(Task, task_id, populate_existing=True)
        if task is None:
            raise RunnerError("authorization_revoked")
        await preflight(tx, task)

    async def completion_locks(self, tx, claimed):
        await self.authority_locks(tx, claimed["task_id"])

    async def authority(self, tx, task):
        try:
            await preflight(tx, task)
            return True
        except DENIED:
            return False

    def deadline_valid(self, tx, task, now):
        expiry = tx.info.get("mail_display_deadlines", {}).get(task.id)
        return expiry is not None and expiry > now

    async def context(self, tx, task):
        if not runner_ready():
            raise RunnerError("translation_runner_unavailable")
        job, policy, original, expiry = await preflight(tx, task)
        if job.run_id is not None or job.reserved_at is not None:
            raise RunnerError("mail_display_already_reserved")
        return {"task_id": task.id, "user_id": task.user_id, "environment_id": task.environment_id,
            "source_revision": task.source_revision, "original": original, "business_id": policy.business_id,
            "deadline": expiry.isoformat()}

    async def store_context(self, tx, task, run_id, context):
        context["run_id"] = run_id

    async def run(self, context, heartbeat, adapter=None):
        observed = None
        try:
            if not await heartbeat():
                raise RunnerError("authorization_revoked")
            async with scope(user=context["user_id"]) as tx:
                task = await tx.get(Task, context["task_id"], populate_existing=True)
                if task is None:
                    raise RunnerError("authorization_revoked")
                await preflight(tx, task)
                task = await tx.get(Task, task.id, with_for_update=True, populate_existing=True)
                now = await tx.scalar(text("SELECT clock_timestamp()"))
                if task.status != "running" or task.run_id != context["run_id"] or not task.lease_until or task.lease_until <= now:
                    raise RunnerError("authorization_revoked")
                if not await tx.scalar(text("SELECT mail_display_reserve(:t,:r,:u,:e,:s)"),
                        {"t": task.id, "r": task.run_id, "u": task.user_id,
                         "e": task.environment_id, "s": task.source_revision}):
                    raise RunnerError("authorization_revoked")
            seconds = min(settings().mail_display_runner_seconds,
                (datetime.fromisoformat(context["deadline"])-datetime.now(UTC)).total_seconds())
            record = await (adapter or runner.translate_once)(context["original"], business_id=context["business_id"],
                environment=context["environment_id"], binary=Path(settings().chat_codex_executable),
                binary_sha256=settings().chat_codex_sha256, private_directory=Path(settings().chat_workspace),
                still_authorized=heartbeat, seconds=seconds)
            observed = observed_usage(record.usage)
            # The Run is the sole attempt. Persist already observed accounting
            # before returning into the separate common completion transaction.
            await settle_accounting(context, observed, "usage_observed")
            return record.model_dump(mode="json"), observed
        except BaseException as error:
            observed = observed or observed_usage(getattr(error, "receipt", None))
            context["_observed_usage"] = observed
            reason = "worker_interrupted" if isinstance(error, asyncio.CancelledError) else getattr(error, "code", "provider_error")
            try:
                await asyncio.shield(settle_accounting(context, observed, reason if reason in FAILURES else "provider_error"))
            except (SQLAlchemyError, RunnerError):
                pass  # A charged durable reservation is never converted to zero/retry.
            raise

    async def complete(self, tx, task, result):
        job, _, original, _ = await preflight(tx, task)
        try:
            record = authority.checked_record(result, original, business_id=task.business_id,
                environment_id=task.environment_id, expected_sha256=job.source_sha256)
        except (ValueError, TypeError, KeyError):
            raise RunnerError("mail_translation_invalid",
                observed_usage(result.get("usage")) if isinstance(result, dict) else None) from None
        if job.run_id != task.run_id or job.reserved_at is None:
            raise RunnerError("authorization_revoked", record.usage)
        stored = await tx.scalar(text("SELECT mail_display_store_record(:t,:r,:u,:e,:s,CAST(:record AS JSONB),CAST(:usage AS JSONB))"),
            {"t": task.id, "r": task.run_id, "u": task.user_id, "e": task.environment_id,
             "s": task.source_revision, "record": record.model_dump_json(),
             "usage": json.dumps(record.usage) if record.usage is not None else None})
        if not stored:
            raise RunnerError("authorization_revoked", record.usage)
        return {"state": "ready", "mail_id": job.mail_id, "source_sha256": job.source_sha256,
            "original_mail_changed": False, "external_sent": False}
