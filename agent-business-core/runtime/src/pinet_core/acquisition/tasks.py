"""Typed reviewed synthetic capture on the common durable Task/Run/Event worker.

This stage never discovers contacts, generates copy, invokes a model or sends.
Only a trusted internal producer may submit supplied reviewed copy. Its presence
does not authenticate a real model receipt. Daily ceilings are optional; zero
removes the ceiling while every attempt remains recorded.
"""

import json
from datetime import UTC
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import Field, ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..control.models import User
from ..control.routes import ControlError
from ..db import db
from ..models import new_id
from ..tasks.models import Task, Thread
from ..tasks.service import append_event, grant_for
from .contracts import Campaign, Prospect
from .correspondence import Correspondence, own_capture_condition, recipient_hash, reviewed_copy, seal
from .engine import gates
from .interfaces import NoExternalSend, OpaqueId, Scope
from .ledger import LedgerError, apply_scope, conditions, scope_values
from .models import AcquisitionCampaign
from .module_models import ModuleBinding
from .task_models import TaskBinding
from .task_schema import KIND, TABLE
from .work_config import read_registration
from .work_models import ContactPolicy


class CaptureTaskInput(NoExternalSend):
    scope: Scope
    adapter_id: OpaqueId
    request_id: UUID
    recipient: str = Field(min_length=1, max_length=80)
    campaign: Campaign
    prospect: Prospect
    prepared: dict

    def checked(self):
        recipient_hash(self.recipient)
        reviewed_copy(self.campaign, self.prospect, self.prepared)
        if len(self.model_dump_json().encode()) > 65536:
            raise LedgerError(422, "acquisition_task_input_too_large")
        if self.scope.environment_class != "test" or self.campaign.site_id != self.scope.site_id:
            raise LedgerError(403, "acquisition_task_scope_denied")
        return self


def registration():
    cfg = settings()
    if not cfg.control_enabled or not cfg.acquisition_tasks_enabled:
        raise LedgerError(403, "acquisition_tasks_disabled")
    try:
        return read_registration(cfg)
    except (ValueError, OSError):
        raise LedgerError(503, "acquisition_tasks_unavailable") from None


def entry_for(reg, business_id, environment_id):
    entry = next(
        (
            e
            for e in reg.entries
            if e.scope.business_id == business_id and e.scope.environment_id == environment_id
        ),
        None,
    )
    if not entry:
        raise LedgerError(403, "acquisition_task_registration_denied")
    return entry


async def validate_storage(database):
    async with database.registry() as tx:
        row = (
            await tx.execute(
                text("""SELECT relrowsecurity,relforcerowsecurity,
            has_table_privilege(current_user,oid,'SELECT'),has_table_privilege(current_user,oid,'INSERT'),
            has_table_privilege(current_user,oid,'UPDATE'),has_table_privilege(current_user,oid,'DELETE')
            FROM pg_class WHERE relname=:table AND relnamespace='public'::regnamespace"""),
                {"table": TABLE},
            )
        ).one_or_none()
        if row is None or tuple(row) != (True, True, True, True, False, False):
            raise LedgerError(503, "acquisition_task_storage_unavailable")


async def owner(tx, scope, adapter_id):
    """Current identity/grant even for exact historical task replay; no Session."""
    pinned = await tx.scalar(
        text("SELECT acquisition_pin_authority(:b,:e,:s,:a)"),
        {"b": scope.business_id, "e": scope.environment_id, "s": scope.site_id, "a": adapter_id},
    )
    module = await tx.get(ModuleBinding, (scope.business_id, scope.environment_id), populate_existing=True)
    if not pinned or not module:
        raise LedgerError(403, "acquisition_task_owner_denied")
    await tx.execute(
        text("SELECT set_config('pinet.control_user',:u,true)"), {"u": module.approved_by_user_id}
    )
    user = await tx.get(User, module.approved_by_user_id)
    try:
        grant = await grant_for(tx, scope.business_id, module.approved_by_user_id)
    except ControlError:
        raise LedgerError(403, "acquisition_task_owner_denied") from None
    if not user or not user.enabled or grant.organization_id != module.organization_id:
        raise LedgerError(403, "acquisition_task_owner_denied")
    return module


async def available_target(tx, service, value):
    now, _ = await service.admission(tx, value.scope, value.adapter_id)
    module = await tx.get(ModuleBinding, (value.scope.business_id, value.scope.environment_id))
    if "acquisition.work" not in module.permissions:
        raise LedgerError(403, "acquisition_task_permission_denied")
    if gates(value.campaign, value.prospect, now):
        raise LedgerError(409, "correspondence_offer_unavailable")
    values = scope_values(value.scope, value.adapter_id)
    campaign = await tx.get(
        AcquisitionCampaign, {**values, "campaign_id": value.campaign.campaign_id}, with_for_update=True
    )
    if campaign and campaign.stopped:
        raise LedgerError(409, "acquisition_campaign_stopped")
    policy = await tx.get(
        ContactPolicy, {**values, "recipient_hash": recipient_hash(value.recipient)}, with_for_update=True
    )
    if policy and policy.state != "active":
        if not await tx.scalar(select(own_capture_condition(values, getattr(value, "request_id", None),
                value.recipient, value.campaign, value.prospect))):
            raise LedgerError(409, "recipient_marketing_contained")
    # The row barriers above may wait. Admission uses the final DB clock.
    now, _ = await service.admission(tx, value.scope, value.adapter_id)
    if gates(value.campaign, value.prospect, now):
        raise LedgerError(409, "correspondence_offer_unavailable")
    return now, module


async def submit_capture(database, value: CaptureTaskInput):
    try:
        return await _submit_capture(database, value)
    except IntegrityError as error:
        # RLS can hide the business which owns an earlier immutable UUID.
        # Its database unique key must stay retained without exposing it.
        if getattr(error.orig, "sqlstate", None) == "23505":
            raise LedgerError(409, "acquisition_task_replay_conflict") from None
        raise


async def _submit_capture(database, value: CaptureTaskInput):
    """Internal typed boundary only; browser cannot supply copy/review/Scope."""
    value.checked()
    reg, digest = registration()
    entry = entry_for(reg, value.scope.business_id, value.scope.environment_id)
    if entry.scope != value.scope or entry.adapter_id != value.adapter_id:
        raise LedgerError(403, "acquisition_task_registration_denied")
    await validate_storage(database)
    body, input_hash = value.model_dump(mode="json"), seal(value.model_dump(mode="json"))
    service = Correspondence(database)
    async with database.transaction(value.scope.business_id, value.scope.environment_id) as tx:
        values = await service.locked(
            tx, value.scope, value.adapter_id, campaign_id=value.campaign.campaign_id
        )
        module = await owner(tx, value.scope, value.adapter_id)
        await tx.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
            {"k": "chat-admission:" + value.scope.environment_id + ":" + module.approved_by_user_id},
        )
        previous = await tx.scalar(select(Task).where(Task.idempotency_key == str(value.request_id)))
        if previous:
            binding = await tx.get(TaskBinding, {**values, "task_id": previous.id})
            if (
                previous.kind != KIND
                or previous.business_id != value.scope.business_id
                or previous.fingerprint != input_hash
                or not binding
                or binding.input_sha256 != input_hash
            ):
                raise LedgerError(409, "acquisition_task_replay_conflict")
            return previous
        duplicate = await tx.scalar(
            select(TaskBinding.task_id).where(
                *conditions(TaskBinding, values),
                TaskBinding.campaign_id == value.campaign.campaign_id,
                TaskBinding.prospect_id == value.prospect.organization_key,
            )
        )
        if duplicate:
            raise LedgerError(409, "acquisition_task_target_reserved")
        now, module = await available_target(tx, service, value)
        # No mandatory invitation/call cap. A positive explicit operator ceiling
        # counts all attempts; cancellation/failure does not erase the accounting.
        since = now.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        if settings().acquisition_tasks_daily_limit:
            count = await tx.scalar(
                select(func.count()).select_from(Task).where(Task.kind == KIND, Task.created_at >= since)
            )
            if count >= settings().acquisition_tasks_daily_limit:
                raise LedgerError(429, "acquisition_task_rate_limited")
        thread = Thread(
            id=new_id(),
            business_id=value.scope.business_id,
            environment_id=value.scope.environment_id,
            organization_id=module.organization_id,
            user_id=module.approved_by_user_id,
            created_at=now,
            last_sequence=1,
        )
        tx.add(thread)
        await tx.flush()
        task = Task(
            id=new_id(),
            thread_id=thread.id,
            session_id=None,
            sequence=1,
            kind=KIND,
            status="queued",
            idempotency_key=str(value.request_id),
            fingerprint=input_hash,
            message="Patvirtinto testinio laiško išsaugojimas",
            source_revision=module.source_revision,
            business_id=thread.business_id,
            environment_id=thread.environment_id,
            organization_id=thread.organization_id,
            user_id=thread.user_id,
            created_at=now,
            updated_at=now,
            event_sequence=0,
        )
        tx.add(task)
        await tx.flush()
        tx.add(
            TaskBinding(
                **values,
                task_id=task.id,
                organization_id=task.organization_id,
                user_id=task.user_id,
                kind=KIND,
                input=body,
                input_sha256=input_hash,
                registration_sha256=digest,
                campaign_id=value.campaign.campaign_id,
                prospect_id=value.prospect.organization_key,
                campaign_day=now.astimezone(ZoneInfo(value.campaign.timezone)).date().isoformat(),
                created_at=now,
            )
        )
        await append_event(tx, task)
        return task


class CaptureHandler:
    kind = KIND
    model = "none"
    effort = "none"
    adapter_revision = "acquisition-reviewed-capture.v1"

    async def actors(self):
        if not settings().acquisition_tasks_enabled:
            return []
        reg, _ = registration()
        await validate_storage(db)
        actors = set()
        for entry in reg.entries:
            async with db.transaction(entry.scope.business_id, entry.scope.environment_id) as tx:
                await apply_scope(tx, entry.scope, entry.adapter_id)
                module = await tx.get(ModuleBinding, (entry.scope.business_id, entry.scope.environment_id))
                if module and module.site_id == entry.scope.site_id and module.adapter_id == entry.adapter_id:
                    actors.add(module.approved_by_user_id)
        return sorted(actors)

    async def binding(self, tx, task):
        reg, digest = registration()
        entry = entry_for(reg, task.business_id, task.environment_id)
        await apply_scope(tx, entry.scope, entry.adapter_id)
        binding = await tx.get(
            TaskBinding, {**scope_values(entry.scope, entry.adapter_id), "task_id": task.id}
        )
        if (
            not binding
            or binding.kind != task.kind
            or task.kind != KIND
            or task.session_id is not None
            or binding.user_id != task.user_id
            or binding.organization_id != task.organization_id
            or binding.input_sha256 != task.fingerprint
            or seal(binding.input) != binding.input_sha256
            or binding.registration_sha256 != digest
            or task.source_revision != settings().control_source_revision
        ):
            raise LedgerError(409, "acquisition_task_binding_invalid")
        try:
            value = CaptureTaskInput.model_validate_json(json.dumps(binding.input)).checked()
        except (ValueError, ValidationError, TypeError):
            raise LedgerError(409, "acquisition_task_binding_invalid") from None
        if value.scope != entry.scope or value.adapter_id != entry.adapter_id:
            raise LedgerError(403, "acquisition_task_scope_denied")
        return binding, value

    async def assert_authority(self, tx, task):
        _, value = await self.binding(tx, task)
        service = Correspondence(db)
        await service.locked(tx, value.scope, value.adapter_id, campaign_id=value.campaign.campaign_id)
        _, module = await available_target(tx, service, value)
        if module.approved_by_user_id != task.user_id or module.organization_id != task.organization_id:
            raise LedgerError(403, "acquisition_task_owner_denied")
        tx.info.setdefault('acquisition_task_deadlines',{})[task.id]=module.expires_at
        return value

    async def authority(self, tx, task):
        try:
            await self.assert_authority(tx, task)
            return True
        except LedgerError:
            return False

    async def context(self, tx, task):
        binding, _ = await self.binding(tx, task)
        return {"input_sha256": binding.input_sha256}

    def deadline_valid(self,tx,task,now):
        expiry=tx.info.get('acquisition_task_deadlines',{}).get(task.id)
        return expiry is not None and expiry>now

    async def run(self, context, heartbeat, adapter=None):
        if not await heartbeat():
            raise LedgerError(409, "acquisition_task_authorization_revoked")
        # This kind is a storage effect, never an AI model or caller adapter.
        return {"input_sha256": context["input_sha256"]}, {"model_calls": 0}

    async def complete(self, tx, task, result):
        value = await self.assert_authority(tx, task)
        if result != {"input_sha256": task.fingerprint}:
            raise LedgerError(409, "acquisition_task_result_invalid")

        async def before_effect(transaction):
            # Invoked after canonical campaign/policy waits, immediately before
            # the first canonical Case/mail effect in the same task transaction.
            await self.assert_authority(transaction, task)
            now = await transaction.scalar(text("SELECT clock_timestamp()"))
            if not self.deadline_valid(transaction,task,now):
                raise LedgerError(409,'authorization_revoked')
            if task.status != "running" or not task.lease_until or task.lease_until <= now:
                raise LedgerError(409, "worker_interrupted")

        reply = await Correspondence(db).capture_reviewed(
            scope=value.scope,
            adapter_id=value.adapter_id,
            request_id=value.request_id,
            recipient=value.recipient,
            campaign=value.campaign,
            prospect=value.prospect,
            prepared=value.prepared,
            transaction=tx,
            before_effect=before_effect,
        )
        receipt = json.loads(reply.body)
        return {
            "state": "captured",
            "thread_id": receipt["thread_id"],
            "case_id": receipt["case_id"],
            "mail_id": receipt["mail_id"],
            "external_sent": False,
            "synthetic": True,
        }
