"""Separately typed preparation handler; the existing capture handler stays model=none."""
import asyncio
import hashlib
import json
from datetime import datetime

from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError

from ..config import settings
from ..control.routes import ControlError, scope
from ..creation.service import digest
from ..db import db
from ..models import new_id
from ..source_observation import SourceObservationError
from ..tasks.codex import RunnerError
from ..tasks.models import Task
from ..tasks.service import append_event, lease_deadline
from . import model_adapter, model_observation
from . import model_authority as authority
from .contracts import Assessment, Review
from .correspondence import Correspondence
from .engine import prepare, validate_assessment
from .headless import HeadlessRoles
from .instructions import compose
from .ledger import LedgerError
from .model_contract import (
    ADAPTER,
    EFFORT,
    KIND,
    MODEL,
    REPLY_KIND,
    PrepareModel,
    ReplyInput,
    next_role,
    observed_usage,
)
from .model_models import ModelAttempt, ModelTaskBinding

DENIED = (ControlError, LedgerError, RunnerError, ValueError, SourceObservationError)


def observed_total(context):
    total = {}
    for value in context.get("_observed_usage", []):
        for key, number in (observed_usage(value) or {}).items():
            total[key] = total.get(key, 0)+number
    return total or None


async def schema_ready(tx):
    tables = ("acquisition_model_authorizations", "acquisition_model_task_bindings", "acquisition_model_attempts")
    rows = (await tx.execute(text("""SELECT relname,relrowsecurity,relforcerowsecurity,
        has_table_privilege(current_user,oid,'SELECT'),has_table_privilege(current_user,oid,'INSERT'),
        has_table_privilege(current_user,oid,'UPDATE'),has_table_privilege(current_user,oid,'DELETE')
        FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(:names)"""),
        {"names": list(tables)})).all()
    expected = {name: (True, True, True, name != tables[0], False, False) for name in tables}
    return len(rows) == 3 and all(tuple(row[1:]) == expected[row[0]] for row in rows)


async def binding(tx, task):
    bound = await tx.get(ModelTaskBinding, task.id, populate_existing=True)
    if (not bound or task.kind not in {KIND, REPLY_KIND} or not task.session_id
            or (bound.business_id, bound.organization_id, bound.user_id, bound.environment_id, bound.kind)
            != (task.business_id, task.organization_id, task.user_id, task.environment_id, task.kind)
            or digest(bound.input) != bound.input_sha256):
        raise RunnerError("acquisition_model_task_invalid")
    value = (ReplyInput if task.kind == REPLY_KIND else PrepareModel).model_validate(bound.input)
    if str(value.authorization_id) != bound.authorization_id or str(value.request_id) != task.idempotency_key:
        raise RunnerError("acquisition_model_task_invalid")
    return bound, value


async def preflight(tx, task):
    bound, value = await binding(tx, task)
    # Completion already holds the canonical owner/Creation/Agent locks from a
    # full proof. Reuse only that immutable proof in this exact root transaction;
    # never cache a lease, stop, file observation, Git check or SQL admission.
    proof = tx.info.get("acquisition_native_completion", {}).get(task.id)
    if value.native is not None and proof is not None and proof[0] is tx.sync_session.get_transaction():
        work = proof[1]
        if (work.authorization.id != bound.authorization_id
                or work.authorization.user_id not in settings().acquisition_model_actor_ids
                or task.fingerprint != digest({"request": bound.input,
                    "authorization_fingerprint": work.authorization.fingerprint})
                or (task.business_id, task.user_id, task.organization_id, task.environment_id, task.source_revision)
                != (work.authorization.business_id, work.authorization.user_id, work.authorization.organization_id,
                    work.authorization.environment_id, work.authorization.source_revision)):
            raise RunnerError("acquisition_model_task_invalid")
        from .native_chain import check_pair, final_fence, handoff
        _, private_hash = authority.read_registration(settings())
        if private_hash != work.authorization.work_registration_sha256:
            raise RunnerError("acquisition_model_private_registration_changed")
        await check_pair(tx, value, work)
        if task.kind == REPLY_KIND:
            from .model_reply import reply_context
            await reply_context(tx, work, value)
        else:
            await authority.target(tx, work, value)
            if value.stage == "email":
                await handoff(tx, value)
        await final_fence(tx, value, work)
        return bound, value, work
    async with authority.current(tx, bound.authorization_id, task.session_id, execution=True) as work:
        policy = work.authorization
        if (task.fingerprint != digest({"request": bound.input, "authorization_fingerprint": policy.fingerprint})
                or (task.business_id, task.user_id, task.organization_id, task.environment_id, task.source_revision)
                != (policy.business_id, policy.user_id, policy.organization_id, policy.environment_id, policy.source_revision)):
            raise RunnerError("acquisition_model_task_invalid")
        if value.native is not None:
            from .native_chain import check_pair, handoff
            tx.info.setdefault("acquisition_native_pairs", {})[task.id] = await check_pair(tx, value, work)
            if getattr(value, "stage", None) == "email":
                tx.info.setdefault("acquisition_qualifications", {})[task.id] = await handoff(tx, value)
        if task.kind == REPLY_KIND:
            from .model_reply import reply_context
            await reply_context(tx, work, value)
        else:
            await authority.target(tx, work, value)
        tx.info.setdefault("acquisition_model_deadlines", {})[task.id] = min(policy.expires_at, work.session.expires_at,
            tx.info.get("acquisition_native_deadline", policy.expires_at))
    if value.native is not None:
        from .native_chain import final_fence
        await final_fence(tx, value, work)
    return bound, value, work


async def usage_for(tx, task_id, run_id, user_id, environment_id, source_revision):
    value = await tx.scalar(text("SELECT acquisition_model_run_usage(:t,:r,:u,:e,:s)"),
        {"t": task_id, "r": run_id, "u": user_id, "e": environment_id, "s": source_revision})
    if value is None:
        return None
    return {**(value["usage"] or {}), **{key: value[key] for key in (
        "model_calls", "settled_calls", "unknown_usage_calls", "usage_complete")}}


async def renew_role_lease(tx, task, run_id, *, phase):
    """Full preflight and canonical Task lock precede this ordinary heartbeat.

    Native proofs between roles consume lease time too. Renew only a STILL live
    exact run after those proofs; no expired lease or authority can be revived.
    """
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    deadline = tx.info.get("acquisition_model_deadlines", {}).get(task.id)
    reason = ("task_not_running" if task.status != "running" else "run_changed" if task.run_id != run_id
        else "lease_missing" if not task.lease_until else "lease_expired" if task.lease_until <= now
        else "authority_deadline_missing" if deadline is None
        else "authority_deadline_expired" if deadline <= now else None)
    if reason:
        model_observation.task_guard(tx, task, phase, reason, now=now)
        raise RunnerError("authorization_revoked")
    task.lease_until = min(lease_deadline(), deadline)
    return now


class TaskRole:
    def __init__(self, context, role, heartbeat, run):
        self.context, self.role, self.heartbeat, self.run = context, role, heartbeat, run

    async def reserve(self, schema, instruction, data):
        context = self.context
        async with scope(user=context["_user_id"]) as tx:
            task = await tx.get(Task, context["_task_id"], populate_existing=True)
            if task is None:
                raise RunnerError("authorization_revoked")
            # Parent actor/Creation/Agent locks precede Task/Run and then Auth trigger.
            _, value, _ = await preflight(tx, task)
            task = await tx.get(Task, task.id, with_for_update=True, populate_existing=True)
            now = await renew_role_lease(tx, task, context["_run_id"], phase="role_reserve")
            prior = list(await tx.scalars(select(ModelAttempt).where(ModelAttempt.task_id == task.id)
                .order_by(ModelAttempt.ordinal)))
            if not next_role([{"role": row.role, "state": row.state} for row in prior], self.role,
                    context.get("_stage")):
                raise RunnerError("acquisition_model_attempt_invalid")
            await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"), {
                "key": "acquisition-model-campaign:"+task.environment_id+":"+task.business_id+":"+value.campaign.campaign_id})
            charged = await tx.scalar(select(func.count()).select_from(ModelAttempt).join(
                ModelTaskBinding, ModelTaskBinding.task_id == ModelAttempt.task_id).where(
                    ModelAttempt.business_id == task.business_id, ModelAttempt.environment_id == task.environment_id,
                    ModelTaskBinding.input["campaign"]["campaign_id"].astext == value.campaign.campaign_id))
            if charged >= value.campaign.max_model_calls:
                raise RunnerError("acquisition_model_campaign_budget_exhausted")
            packet = {"role": self.role, "instruction": instruction, "data": data}
            attempt = ModelAttempt(id=new_id(), authorization_id=context["_authorization_id"],
                task_id=task.id, run_id=task.run_id, business_id=task.business_id,
                organization_id=task.organization_id, user_id=task.user_id, environment_id=task.environment_id,
                ordinal=len(prior)+1, role=self.role, packet=packet, packet_sha256=digest(packet),
                instruction_sha256=hashlib.sha256(model_adapter.prompt(instruction, data).encode()).hexdigest(),
                model=MODEL, effort=EFFORT, source_revision=task.source_revision, state="reserved",
                reserved_at=now, finished_at=None, usage=None, output=None)
            tx.add(attempt)
            await tx.flush()
            return {"id": attempt.id, "run_id": task.run_id, "user_id": task.user_id,
                "environment_id": task.environment_id, "source_revision": task.source_revision}

    async def settle(self, receipt, state, usage, output=None):
        async def write(tx):
            packed = {"known": True, "tokens": observed_usage(usage)} if observed_usage(usage) is not None else None
            return await tx.scalar(text("SELECT acquisition_model_settle_attempt(:a,:r,:u,:e,:s,:state,CAST(:j AS JSONB),CAST(:o AS JSONB))"),
                {"a": receipt["id"], "r": receipt["run_id"], "u": receipt["user_id"],
                 "e": receipt["environment_id"], "s": receipt["source_revision"], "state": state,
                 "j": json.dumps(packed) if packed is not None else None,
                 "o": json.dumps(output) if output is not None else None})
        async with scope(user=receipt["user_id"]) as tx:
            if state == "succeeded":
                task = await tx.get(Task, self.context["_task_id"], populate_existing=True)
                if task is None:
                    raise RunnerError("authorization_revoked", observed_usage(usage))
                await preflight(tx, task)
                task = await tx.get(Task, task.id, with_for_update=True, populate_existing=True)
                await renew_role_lease(tx, task, receipt["run_id"], phase="role_settle_before")
            if not await write(tx):
                raise RunnerError("acquisition_model_accounting_failed", observed_usage(usage))
            if state == "succeeded":
                await preflight(tx, task)
                await renew_role_lease(tx, task, receipt["run_id"], phase="role_settle_after")

    async def ask(self, schema, instruction, data):
        from .dialogue import ReplyDecision
        expected = Review if self.role == "reviewer" else ReplyDecision if self.role == "reply_coordinator" else Assessment
        if schema is not expected:
            raise RunnerError("acquisition_model_role_invalid")
        packet = {**data, "agent_specification": self.context["specification"]}
        receipt = await self.reserve(schema, instruction, packet)
        observed = None
        try:
            result, observed = await self.run(self.role, schema, instruction, packet,
                self.heartbeat, datetime.fromisoformat(self.context["deadline"]))
            result = schema.model_validate(result)
            await self.settle(receipt, "succeeded", observed, result.model_dump(mode="json"))
            return result
        except BaseException as error:
            usage = observed or getattr(error, "receipt", None)
            model_observation.record(task_id=self.context["_task_id"], run_id=receipt["run_id"],
                source_revision=receipt["source_revision"], phase="role_execution", role=self.role,
                code=getattr(error, "code", None), usage_known=observed_usage(usage) is not None)
            observed = observed_usage(usage)
            try:
                await asyncio.shield(self.settle(receipt, "failed", usage))
            except (RunnerError, SQLAlchemyError):
                # Immutable reservation remains charged/unknown when accounting is unavailable.
                pass
            raise
        finally:
            self.context.setdefault("_observed_usage", []).append(observed_usage(observed))


class ModelHandler:
    kind, model, effort, adapter_revision = KIND, MODEL, EFFORT, ADAPTER
    always_completion_locks = True

    async def actors(self):
        try:
            authority.guard(execution=True)
        except ControlError:
            return []
        actors = list(settings().acquisition_model_actor_ids)
        if not actors:
            return []
        async with db.registry() as tx:
            if not await schema_ready(tx):
                return []
        return actors

    async def claim_exact_task(self, tx, task_id):
        return await self.claim_task(tx, task_id=task_id)

    async def claim_task(self, tx, *, task_id=None):
        task = await tx.scalar(select(Task).where(Task.kind == self.kind, Task.status == "queued")
            .where(Task.id == task_id if task_id is not None else True)
            .order_by(Task.created_at, Task.id).limit(1))
        if task is None:
            return None
        try:
            await preflight(tx, task)
        except DENIED:
            current = await tx.get(Task, task.id, with_for_update=True, populate_existing=True)
            if current and current.status == "queued":
                current.status, current.failure_code = "failed", "authorization_revoked"
                await append_event(tx, current)
            return None
        return await tx.scalar(select(Task).where(Task.id == task.id, Task.kind == self.kind, Task.status == "queued")
            .with_for_update().execution_options(populate_existing=True))

    async def authority_locks(self, tx, task_id):
        task = await tx.get(Task, task_id, populate_existing=True)
        if task is None:
            raise RunnerError("authorization_revoked")
        try:
            await preflight(tx, task)
        except DENIED as error:
            self.observe_guard(tx, task, "authority_locks", getattr(error, "code", None))
            raise

    async def completion_locks(self, tx, claimed):
        task = await tx.get(Task, claimed["task_id"], populate_existing=True)
        if task is None:
            raise RunnerError("authorization_revoked")
        try:
            _, value, work = await preflight(tx, task)
        except DENIED as error:
            self.observe_guard(tx, task, "completion_locks", getattr(error, "code", None))
            raise
        if value.native is not None:
            tx.info.setdefault("acquisition_native_completion", {})[task.id] = (
                tx.sync_session.get_transaction(), work)

    async def authority(self, tx, task):
        try:
            await preflight(tx, task)
            return True
        except DENIED as error:
            self.observe_guard(tx, task, "authority", getattr(error, "code", None))
            return False

    def observe_guard(self, tx, task, phase, code, *, now=None, prior_failure=None):
        model_observation.task_guard(tx, task, phase, code, now=now, prior_failure=prior_failure)

    def deadline_valid(self, tx, task, now):
        expiry = tx.info.get("acquisition_model_deadlines", {}).get(task.id)
        return expiry is not None and expiry > now

    async def context(self, tx, task):
        # Validate the large native binary on actual work, never every idle poll.
        if not model_adapter.runner_ready():
            raise RunnerError("runner_unavailable")
        bound, value, work = await preflight(tx, task)
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        context = {"_task_id": task.id, "_user_id": task.user_id, "_authorization_id": bound.authorization_id,
            "request": value.model_dump(mode="json"), "specification": work.specification,
            "now": now.isoformat(), "deadline": tx.info["acquisition_model_deadlines"][task.id].isoformat()}
        if value.stage is not None:
            context["_stage"] = value.stage
        if value.stage == "email":
            context["_qualification"] = tx.info["acquisition_qualifications"][task.id].model_dump(mode="json")
        return context

    async def store_context(self, tx, task, run_id, context):
        context["_run_id"] = run_id

    async def run(self, context, heartbeat, adapter=None):
        if not await heartbeat():
            raise RunnerError("authorization_revoked")
        value = PrepareModel.model_validate(context["request"])
        roles = {name: TaskRole(context, name, heartbeat, adapter or model_adapter.run_role)
            for name in ("researcher", "writer", "reviewer")}
        try:
            qualification = Assessment.model_validate(context["_qualification"]) if "_qualification" in context else None
            prepared = await prepare(value.campaign, value.prospect, HeadlessRoles(roles, qualification=qualification),
                datetime.fromisoformat(context["now"]))
            return prepared, observed_total(context)
        except (RunnerError, ControlError, LedgerError) as error:
            raise RunnerError(error.code, observed_total(context)) from None
        except (ValueError, KeyError, TypeError):
            raise RunnerError("acquisition_model_result_invalid", observed_total(context)) from None

    async def complete(self, tx, task, result):
        bound, value, work = await preflight(tx, task)
        attempts = list(await tx.scalars(select(ModelAttempt).where(ModelAttempt.task_id == task.id,
            ModelAttempt.run_id == task.run_id).order_by(ModelAttempt.ordinal)))
        if (not attempts or any(row.state != "succeeded" or row.output is None for row in attempts)
                or attempts[-1].role != "reviewer"):
            raise RunnerError("acquisition_model_result_unverified")
        assessment = next(row.output for row in reversed(attempts) if row.role in {"researcher", "writer"})
        review = attempts[-1].output
        if (not isinstance(result, dict) or result.get("assessment") != assessment or result.get("review") != review
                or result.get("instruction_hash") != compose(value.campaign.sector)[1]
                or result.get("reviewer_hash") != compose(value.campaign.sector, "reviewer")[1]
                or validate_assessment(value.campaign, value.prospect, Assessment.model_validate(assessment))):
            raise RunnerError("acquisition_model_result_unverified")
        if result.get("state") != "draft_ready":
            response = {"state": result["state"], "prepared": result, "external_sent": False, "synthetic": True}
            if value.stage == "research":
                response["handoff"] = {"task_id": task.id, "run_id": task.run_id,
                    "output_sha256": digest([row.output for row in attempts])}
            return response

        async def before_effect(transaction):
            await preflight(transaction, task)
            now = await transaction.scalar(text("SELECT clock_timestamp()"))
            if task.status != "running" or not task.lease_until or task.lease_until <= now:
                raise RunnerError("authorization_revoked")
        reply = await Correspondence(db).capture_reviewed(scope=work.scope, adapter_id=work.authorization.adapter_id,
            request_id=value.request_id, recipient=value.recipient, campaign=value.campaign,
            prospect=value.prospect, prepared=result, transaction=tx, before_effect=before_effect)
        captured = {"state": "captured", **json.loads(reply.body), "external_sent": False, "synthetic": True}
        if value.stage == "email":
            captured["prepared"] = result
        return captured
