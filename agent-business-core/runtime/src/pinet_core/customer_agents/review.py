"""Explicit Config-bound independent Quality; existing lifecycle, durable per-call receipts."""
import asyncio
from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException
from pydantic import Field
from sqlalchemy import select

from .. import evaluation_contract, jobs, local_semantics, policy, quality_guards
from .. import service as core
from ..config import settings
from ..control.routes import ControlError
from ..creation.service import digest
from ..customer_text import service as chat
from ..db import db
from ..models import Artifact, Contact, Conversation, Event, Job, new_id, utcnow
from ..tasks.codex_transport import RunnerError
from . import evaluator, lab, quality
from .wire import Strict

VERSION = "customer-quality-dispatch.v1"


class Request(Strict):
    bearer: str = Field(pattern=r"^[A-Za-z0-9_-]{64}$")
    conversation_id: UUID
    request_id: UUID
    episode: lab.Episode


@dataclass(frozen=True)
class Dispatch:
    task: dict
    binding: dict
    data: dict
    fingerprint: str
    evaluator_sha256: str
    model_profile: dict


async def input_data(tx, row):
    where = (Event.conversation_id == row.id, Event.business_id == row.business_id,
             Event.environment_id == row.environment_id)
    events = list(await tx.scalars(select(Event).where(*where).order_by(Event.sequence)))
    channels = list(await tx.scalars(select(Contact.channel).where(Contact.conversation_id == row.id,
        Contact.business_id == row.business_id, Contact.environment_id == row.environment_id)))
    artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == row.id,
        Artifact.business_id == row.business_id, Artifact.environment_id == row.environment_id)))
    data = await quality.projection(tx, row, events, artifacts, channels)
    quality.instruction(data)
    if not data["evidence"] or data["coverage"] != "complete" or not data["followup_ready"]:
        raise ControlError(409, "customer_quality_incomplete")
    return data


def receipt(job):
    return {"scope": "operator_local_customer_quality", "job_id": job.id,
        "conversation_id": job.conversation_id, "status": job.state,
        "model": evaluator.MODEL, "failure_code": job.payload.get("failure_code"),
        "calibration_status": "UNVERIFIED", "module_admission": "not_admitted", "activation": "not_performed"}


def current_job(job, dispatch):
    return bool(job and job.state == "running" and job.owner == dispatch.task["owner"]
        and job.generation == dispatch.task["generation"] and job.lease_until
        and job.lease_until > utcnow() and job.payload.get("dispatch") == VERSION
        and job.payload.get("fingerprint") == dispatch.fingerprint
        and job.payload.get("model") == evaluator.MODEL
        and job.payload.get("binding_sha256") == digest(dispatch.binding)
        and job.payload.get("input_sha256") == digest(dispatch.data)
        and job.payload.get("evaluator_sha256") == dispatch.evaluator_sha256
        and job.payload.get("model_profile") == dispatch.model_profile)


def last_time(session, row):
    # Held Session/Conversation locks protect mutable state; time still advances
    # during the final awaited source observation.
    if session.revoked_at or session.expires_at <= utcnow() or row.expires_at <= utcnow():
        raise ControlError(409, "quality_authorization_changed")


async def prepare(request):
    lab.guard()
    model_profile = evaluator.profile()  # validated before DB/paid reservation
    frozen = request.episode.model_dump(mode="json")
    fingerprint = digest({"version": VERSION, "conversation_id": str(request.conversation_id),
        "request_id": str(request.request_id), "episode": frozen})
    async with chat.authority(request.bearer, frozen["creation_id"], calibration=frozen) as (
            tx, session, creation, identity, business, binding):
        row = await chat.locked(tx, str(request.conversation_id), binding)
        job = await tx.scalar(select(Job).where(Job.conversation_id == row.id, Job.kind == "quality",
            Job.business_id == business.id, Job.environment_id == settings().environment).with_for_update())
        if job:
            if job.payload.get("dispatch") != VERSION or job.payload.get("fingerprint") != fingerprint:
                raise ControlError(409, "quality_request_conflict")
            if job.state == "running" and job.lease_until <= utcnow():
                job.state, job.payload = "failed", {**job.payload, "failure_code": "request_interrupted"}
            await chat.final_authority(tx, session, creation, identity, binding)
            last_time(session, row)
            return receipt(job)
        data = await input_data(tx, row)
        if row.owner and row.lease_until and row.lease_until > utcnow():
            raise ControlError(409, "customer_text_busy")
        evaluator_sha256 = evaluation_contract.fingerprint()
        job = Job(id=new_id(), business_id=business.id, environment_id=settings().environment,
            conversation_id=row.id, kind="quality", state="running", generation=1, attempts=1,
            owner=new_id(), lease_until=utcnow() + timedelta(seconds=2 * settings().chat_runner_seconds + 20),
            payload={"dispatch": VERSION, "request_id": str(request.request_id), "fingerprint": fingerprint,
                "binding_sha256": digest(binding), "input_sha256": digest(data),
                "evaluator_sha256": evaluator_sha256, "model": evaluator.MODEL, "model_profile": model_profile})
        tx.add(job)
        await tx.flush()
        await core.add_event(tx, row, "quality-request:" + str(request.request_id), "quality_request",
            {**job.payload, "job_id": job.id, "deadline": job.lease_until.isoformat()})
        await chat.final_authority(tx, session, creation, identity, binding)
        task = {"id": job.id, "conversation_id": row.id, "kind": "quality", "generation": 1,
            "owner": job.owner, "attempts": 1, "business_id": business.id, "environment_id": row.environment_id}
        dispatch = Dispatch(task, binding, data, fingerprint, evaluator_sha256, model_profile)
        last_time(session, row)
        if not current_job(job, dispatch):
            raise ControlError(409, "quality_authorization_changed")
        return dispatch


async def observe(tx, row, dispatch):
    job = await jobs.fenced_job(tx, dispatch.task)
    if (not current_job(job, dispatch) or job.business_id != row.business_id
            or job.environment_id != row.environment_id or job.conversation_id != row.id
            or evaluation_contract.fingerprint() != dispatch.evaluator_sha256
            or evaluator.profile() != dispatch.model_profile
            or digest(await input_data(tx, row)) != digest(dispatch.data)):
        raise ControlError(409, "quality_authorization_changed")
    return job


async def authorized(token, dispatch):
    try:
        binding = dispatch.binding
        async with chat.authority(token, binding["creation_id"], calibration=binding["task_calibration"]) as (
                tx, session, creation, identity, _, current):
            row = await chat.locked(tx, dispatch.task["conversation_id"], current)
            if current != binding:
                return False
            job = await observe(tx, row, dispatch)
            await chat.final_authority(tx, session, creation, identity, current)
            last_time(session, row)
            return current_job(job, dispatch)
    except (ControlError, HTTPException, RuntimeError, ValueError, RunnerError):
        return False


async def reserve_call(token, dispatch, number, prompt, wire):
    binding = dispatch.binding
    async with chat.authority(token, binding["creation_id"], calibration=binding["task_calibration"]) as (
            tx, session, creation, identity, _, current):
        row = await chat.locked(tx, dispatch.task["conversation_id"], current)
        if current != binding:
            raise ControlError(409, "quality_authorization_changed")
        job = await observe(tx, row, dispatch)
        key = "quality-attempt:" + job.id + ":" + str(number)
        if await tx.scalar(select(Event.id).where(Event.conversation_id == row.id, Event.event_key == key)):
            raise ControlError(409, "quality_call_already_reserved")
        await core.add_event(tx, row, key, "quality_provider_attempt", {
            "job_id": job.id, "number": number, "model": evaluator.MODEL, "fingerprint": dispatch.fingerprint,
            "model_profile": dispatch.model_profile,
            "binding_sha256": digest(binding), "input_sha256": digest(dispatch.data),
            "evaluator_sha256": dispatch.evaluator_sha256, **evaluator.hashes(prompt, wire)})
        await chat.final_authority(tx, session, creation, identity, current)
        last_time(session, row)
        if not current_job(job, dispatch):
            raise ControlError(409, "quality_authorization_changed")


async def internal(tx, dispatch):
    """Frozen business scope settles usage after revocation; grants no model authority."""
    task = dispatch.task
    await policy.lock(tx, task["business_id"], task["environment_id"])
    row = await tx.scalar(select(Conversation).where(Conversation.id == task["conversation_id"],
        Conversation.business_id == task["business_id"], Conversation.environment_id == task["environment_id"])
        .with_for_update())
    job = await tx.scalar(select(Job).where(Job.id == task["id"], Job.business_id == task["business_id"],
        Job.environment_id == task["environment_id"], Job.conversation_id == task["conversation_id"]).with_for_update())
    if (not row or not job or row.payload.get("customer_text_binding") != dispatch.binding
            or job.owner != task["owner"] or job.generation != task["generation"]
            or job.payload.get("fingerprint") != dispatch.fingerprint or job.payload.get("dispatch") != VERSION):
        raise ControlError(409, "quality_attempt_unavailable")
    return row, job


async def settle(dispatch, number, usage, failure, result=None):
    task = dispatch.task
    async with db.transaction(task["business_id"], task["environment_id"]) as tx:
        row, job = await internal(tx, dispatch)
        key = job.id + ":" + str(number)
        attempt = await tx.scalar(select(Event).where(Event.conversation_id == row.id,
            Event.event_key == "quality-attempt:" + key))
        if not attempt or attempt.payload["fingerprint"] != dispatch.fingerprint:
            raise ControlError(409, "quality_attempt_unavailable")
        await core.add_event(tx, row, "quality-usage:" + key, "quality_provider_usage", {
            "job_id": job.id, "number": number, "model": evaluator.MODEL,
            "usage": chat.usage_receipt(usage), "failure_code": failure,
            "output_sha256": digest(result.model_dump()) if result is not None else None})


async def fail(dispatch, code):
    task = dispatch.task
    async with db.transaction(task["business_id"], task["environment_id"]) as tx:
        _, job = await internal(tx, dispatch)
        if job.state == "running":
            job.state, job.payload = "failed", {**job.payload, "failure_code": code}


async def settle_known(*args):
    """Finish already observed usage despite outer cancellation, without retrying a model."""
    task, interrupted = asyncio.create_task(settle(*args)), False
    while True:
        try:
            await asyncio.shield(task)
            break
        except asyncio.CancelledError:
            if task.cancelled():
                raise
            interrupted = True
    if interrupted:
        raise asyncio.CancelledError


class AccountedLab:
    def __init__(self, token, dispatch):
        self.token, self.dispatch = token, dispatch
        self.calls, self.usage, self.timeout_recoveries = 0, [], []

    async def ask(self, schema, instruction, data):
        # Existing Quality plus its optional independent attribution: no retry.
        if self.calls >= 2:
            raise RunnerError("call_limit")
        prompt, wire = evaluator.material(schema, instruction, data)
        number = self.calls + 1
        await reserve_call(self.token, self.dispatch, number, prompt, wire)
        self.calls = number
        result, usage, failure = None, None, None
        try:
            result, usage = await evaluator.run(schema, prompt, wire, lambda: authorized(self.token, self.dispatch))
        except RunnerError as error:
            usage, failure = error.receipt, error.code
        except asyncio.CancelledError as error:
            await settle_known(self.dispatch, number, getattr(error, "receipt", None), "request_interrupted")
            raise
        await settle_known(self.dispatch, number, usage, failure, result)
        self.usage.append(chat.usage_receipt(usage))
        if failure:
            raise RunnerError(failure, usage)
        if not await authorized(self.token, self.dispatch):
            raise RunnerError("authorization_revoked", usage)
        return result


async def finish(token, dispatch, result):
    binding = dispatch.binding
    async with chat.authority(token, binding["creation_id"], calibration=binding["task_calibration"]) as (
            tx, session, creation, identity, _, current):
        row = await chat.locked(tx, dispatch.task["conversation_id"], current)
        if current != binding:
            raise ControlError(409, "quality_authorization_changed")
        job = await observe(tx, row, dispatch)
        await jobs.complete_in_transaction(tx, row.business_id, dispatch.task,
            quality_guards.reconcile(result, dispatch.data))
        await chat.final_authority(tx, session, creation, identity, current)
        last_time(session, row)
        if job.lease_until <= utcnow():
            raise ControlError(409, "quality_authorization_changed")
        return receipt(job)


async def run(request):
    dispatch = await prepare(request)
    if not isinstance(dispatch, Dispatch):
        return dispatch
    try:
        result = await local_semantics.evaluate("quality", dispatch.data, AccountedLab(request.bearer, dispatch))
        return await finish(request.bearer, dispatch, result)
    except asyncio.CancelledError:
        await asyncio.shield(fail(dispatch, "request_interrupted"))
        raise
    except (RunnerError, ControlError, HTTPException, RuntimeError, ValueError) as error:
        code = error.code if isinstance(error, RunnerError) else "quality_authorization_or_output_invalid"
        await fail(dispatch, code)
        return {"scope": "operator_local_customer_quality", "status": "failed", "failure_code": code,
            "job_id": dispatch.task["id"], "model": evaluator.MODEL, "calibration_status": "UNVERIFIED",
            "module_admission": "not_admitted", "activation": "not_performed"}
