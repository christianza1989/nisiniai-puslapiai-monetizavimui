"""Fixed server reads, immutable input evidence and current read-purpose fences."""

import hashlib
import json

from pydantic import ValidationError
from sqlalchemy import select, text

from ..acquisition import normal, normal_config, work_config, work_routes
from ..acquisition.interfaces import Scope
from ..acquisition.ledger import apply_scope
from ..acquisition.module_models import ModuleBinding
from ..config import settings
from ..control.models import Session, User
from ..control.routes import ControlError
from ..db import db
from ..tasks import codex
from ..tasks.models import TaskRun
from ..tasks.service import grant_for
from .interfaces import ADAPTER_REVISION, CAPTURE, WORK, ToolList
from .models import ContextReceipt
from .schema import TABLE, function_security_sql

MAX_CONTEXT_BYTES = 64000


def registrations():
    try:
        native, native_sha = normal_config.read_registration(settings())
        work, work_sha = work_config.read_registration(settings())
        return native, work, {"capture": native_sha, "work": work_sha}
    except (ValueError, OSError):
        raise ControlError(503, "director_read_unavailable") from None


async def validate_storage(database):
    async with database.registry() as tx:
        row = (
            await tx.execute(
                text("""SELECT relrowsecurity,relforcerowsecurity,
            has_table_privilege(current_user,oid,'SELECT'),has_table_privilege(current_user,oid,'INSERT'),
            has_table_privilege(current_user,oid,'UPDATE'),has_table_privilege(current_user,oid,'DELETE')
            FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=:t"""),
                {"t": TABLE},
            )
        ).first()
        complete = await tx.scalar(
            text("""SELECT EXISTS(SELECT 1 FROM pg_constraint
            WHERE conrelid=to_regclass('public.control_task_runs') AND conname='uq_control_run_task_scope')
            AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.control_director_contexts')
            AND conname='fk_director_exact_run_scope') AND
            to_regprocedure('public.director_pin_reader(character varying,character varying,character varying,character varying,character varying,character varying)') IS NOT NULL
            AND to_regprocedure('public.director_settle_revoked_task(character varying,character varying,character varying,character varying,character varying,character varying,jsonb,character varying)') IS NOT NULL""")
        )
        security = await tx.scalar(text(function_security_sql()))
        if not row or tuple(row) != (True, True, True, True, False, False) or not complete or not security:
            raise ControlError(503, "director_read_storage_unavailable")


async def start(app, database):
    if settings().director_acquisition_enabled:
        registrations()
        await validate_storage(database)


async def binding(tx, task, *, pin=False):
    native, work, hashes = registrations()
    entry = next(
        (
            e
            for e in native.entries
            if e.scope.business_id == task.business_id and e.scope.environment_id == settings().environment
        ),
        None,
    )
    if not entry:
        return None
    if not any(e.scope == entry.scope and e.adapter_id == entry.adapter_id for e in work.entries):
        raise ControlError(503, "director_read_unavailable")
    await tx.execute(
        text("SELECT set_config('pinet.business',:b,true),set_config('pinet.director_organization',:o,true)"),
        {"b": task.business_id, "o": task.organization_id},
    )
    await apply_scope(tx, entry.scope, entry.adapter_id)
    user = await tx.get(User, task.user_id, populate_existing=True)
    grant = await grant_for(tx, task.business_id, task.user_id)
    module = await tx.get(ModuleBinding, (task.business_id, settings().environment), populate_existing=True)
    if (
        not user
        or not user.enabled
        or not module
        or grant.organization_id != task.organization_id
        or module.organization_id != grant.organization_id
        or module.site_id != entry.scope.site_id
        or module.adapter_id != entry.adapter_id
    ):
        raise ControlError(403, "director_read_denied")
    if pin:
        valid = await tx.scalar(
            text("SELECT director_pin_reader(:b,:e,:s,:a,:u,:o)"),
            {
                "b": task.business_id,
                "e": entry.scope.environment_id,
                "s": entry.scope.site_id,
                "a": entry.adapter_id,
                "u": task.user_id,
                "o": task.organization_id,
            },
        )
        if not valid:
            raise ControlError(403, "director_read_denied")
        # A pin may wait for a Module/identity/grant update. Read its committed value anew.
        module = await tx.get(
            ModuleBinding, (task.business_id, settings().environment), populate_existing=True
        )
    return entry, module, native, work, hashes


async def prepare(tx, task, context):
    if not settings().director_acquisition_enabled:
        return context
    await validate_storage(db)
    bound = await binding(tx, task, pin=True)
    if bound is None:
        return context  # This business has no registered acquisition reader.
    entry, _, native, work, hashes = bound
    tools = []
    for name, registration, reader in (
        (CAPTURE, native, normal.read_registered_snapshot),
        (WORK, work, work_routes.read_registered_snapshot),
    ):
        try:
            value = await reader(
                registration,
                db,
                business_id=task.business_id,
                user_id=task.user_id,
                session_id=task.session_id,
            )
            tools.append(
                {"name": name, "status": "available", "data": value.model_dump(mode="json"), "reason": None}
            )
        except ControlError as error:
            if error.status not in {403, 409}:
                raise
            tools.append({"name": name, "status": "unavailable", "data": None, "reason": error.code})
    public = {**context, "server_tools": tools}
    digest = hashlib.sha256(codex.prompt_for(public).encode()).hexdigest()
    receipt = {
        "version": "director-read.v1",
        "scope": entry.scope.model_dump(mode="json"),
        "adapter_id": entry.adapter_id,
        "registration_sha256": hashes,
        "source_revision": task.source_revision,
        "instruction": codex.instruction_for(public),
        "context": public,
    }
    if len(json.dumps(receipt, ensure_ascii=False).encode()) > MAX_CONTEXT_BYTES:
        raise ControlError(503, "director_context_too_large")
    return {**public, "_director_receipt": {"data": receipt, "input_sha256": digest}}


async def store(tx, task, run_id, context):
    prepared = context.get("_director_receipt")
    if prepared is None:
        return
    value = prepared["data"]
    scope = Scope.model_validate_json(json.dumps(value["scope"]))
    await apply_scope(tx, scope, value["adapter_id"])
    await tx.execute(
        text("SELECT set_config('pinet.director_organization',:o,true)"), {"o": task.organization_id}
    )
    tx.add(
        ContextReceipt(
            id=run_id,
            task_id=task.id,
            business_id=task.business_id,
            organization_id=task.organization_id,
            user_id=task.user_id,
            environment_id=task.environment_id,
            site_id=scope.site_id,
            adapter_id=value["adapter_id"],
            environment_class=scope.environment_class,
            input_sha256=prepared["input_sha256"],
            data=value,
        )
    )
    await tx.flush()


async def receipt_for(tx, task, bound):
    entry, _, _, _, _ = bound
    receipt = await tx.scalar(
        select(ContextReceipt).where(
            ContextReceipt.id == task.run_id,
            ContextReceipt.task_id == task.id,
            ContextReceipt.business_id == task.business_id,
            ContextReceipt.organization_id == task.organization_id,
            ContextReceipt.user_id == task.user_id,
            ContextReceipt.environment_id == task.environment_id,
        )
    )
    if (
        not receipt
        or receipt.site_id != entry.scope.site_id
        or receipt.adapter_id != entry.adapter_id
        or receipt.environment_class != entry.scope.environment_class
    ):
        raise ControlError(403, "director_context_unavailable")
    value = receipt.data
    try:
        scope = Scope.model_validate_json(json.dumps(value["scope"]))
        if (
            value["version"] != "director-read.v1"
            or value["source_revision"] != task.source_revision
            or scope != entry.scope
            or value["adapter_id"] != entry.adapter_id
            or not isinstance(value["instruction"], str)
            or hashlib.sha256(
                (
                    value["instruction"] + json.dumps(value["context"], ensure_ascii=False, sort_keys=True)
                ).encode()
            ).hexdigest()
            != receipt.input_sha256
        ):
            raise ValueError()
        tools = value["context"]["server_tools"]
        ToolList.model_validate_json(json.dumps({"tools": tools}))
        for item in tools:
            if item["status"] == "available" and (
                item["data"]["scope"] != value["scope"] or item["data"]["adapter_id"] != entry.adapter_id
            ):
                raise ValueError()
        if (
            not isinstance(tools, list)
            or len(tools) != 2
            or [item["name"] for item in tools] != [CAPTURE, WORK]
            or any(item["status"] not in {"available", "unavailable"} for item in tools)
        ):
            raise ValueError()
    except (KeyError, ValueError, TypeError, ValidationError):
        raise ControlError(503, "director_context_invalid") from None
    return receipt


def purpose_valid(module, receipt, now):
    tools = receipt.data["context"]["server_tools"]
    for item in tools:
        if item["status"] != "available":
            continue
        if item["name"] == WORK and "acquisition.correspondence.read" not in module.permissions:
            return False
        if item["name"] == CAPTURE and (
            not module.enabled
            or "acquisition.read" not in module.permissions
            or module.expires_at <= now
            or module.approved_at > now
            or module.source_revision != settings().control_source_revision
        ):
            return False
    return True


async def purposes(tx, module, receipt):
    return purpose_valid(module, receipt, await tx.scalar(text("SELECT clock_timestamp()")))


async def run_for(tx, task):
    # A malformed mutable Task.run_id cannot turn contextual output into legacy output.
    return await tx.scalar(
        select(TaskRun)
        .where(TaskRun.task_id == task.id)
        .order_by(TaskRun.created_at.desc(), TaskRun.id.desc())
        .limit(1)
    )


async def requires_context(tx, task, run):
    # Immutable presence is authoritative even if a mutable Run marker changes.
    available = await tx.scalar(
        text(
            "SELECT to_regprocedure('public.director_context_exists(character varying,character varying,character varying)') IS NOT NULL"
        )
    )
    exists = (
        await tx.scalar(
            text("SELECT director_context_exists(:t,:u,:e)"),
            {"t": task.id, "u": task.user_id, "e": task.environment_id},
        )
        if available
        else False
    )
    if not exists and (not run or run.adapter_revision != ADAPTER_REVISION):
        return False  # Feature-off, pre0028 and genuine legacy paths remain compatible.
    if not exists or not run or run.id != task.run_id or run.adapter_revision != ADAPTER_REVISION:
        raise ControlError(403, "director_context_unavailable")
    return True


async def execution_authorized(tx, task):
    tx.info.setdefault("director_capture_deadlines", {}).pop(task.id, None)
    run = await run_for(tx, task)
    try:
        if not await requires_context(tx, task, run):
            return True
        if not settings().director_acquisition_enabled:
            return False
        bound = await binding(tx, task, pin=True)
        if bound is None:
            return False
        receipt = await receipt_for(tx, task, bound)
        session = await tx.get(Session, task.session_id, populate_existing=True)
        admitted = await purposes(tx, bound[1], receipt)
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        valid = (
            receipt.data["registration_sha256"] == bound[4]
            and receipt.data["instruction"] == codex.instruction_for(receipt.data["context"])
            and session is not None
            and session.user_id == task.user_id
            and not session.revoked_at
            and session.expires_at > now
            and admitted
            and purpose_valid(bound[1], receipt, now)
        )
        if valid:
            capture_available = receipt.data["context"]["server_tools"][0]["status"] == "available"
            tx.info["director_capture_deadlines"][task.id] = (
                bound[1].expires_at if capture_available else None
            )
        return valid
    except ControlError:
        return False


def deadline_valid(tx, task, now):
    deadline = tx.info.get("director_capture_deadlines", {}).get(task.id)
    return deadline is None or deadline > now


async def ensure_task_read(tx, task):
    run = await run_for(tx, task)
    if not await requires_context(tx, task, run):
        return
    if not settings().director_acquisition_enabled:
        raise ControlError(503, "director_read_unavailable")
    bound = await binding(tx, task)
    if bound is None:
        raise ControlError(403, "director_context_unavailable")
    receipt = await receipt_for(tx, task, bound)
    if not await purposes(tx, bound[1], receipt):
        raise ControlError(403, "director_read_denied")


async def visible_tasks(tx, tasks, *, for_model=False):
    result = []
    for task in tasks:
        try:
            await ensure_task_read(tx, task)
            result.append(task)
        except ControlError as error:
            # A model continuation omits unauthorized historical tool answers.
            # A dashboard must surface unavailable/denied data, never a false empty history.
            if for_model and error.status == 403:
                continue
            raise
    return result
