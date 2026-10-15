"""Explicit Config-bound independent Quality; existing lifecycle, durable per-call receipts."""
import asyncio
from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException
from pydantic import Field
from sqlalchemy import select

from .. import competence, evaluation_contract, jobs, local_semantics, policy, quality_guards
from .. import service as core
from ..config import settings
from ..contracts import Quality
from ..control.routes import ControlError
from ..creation.service import digest
from ..customer_text import service as chat
from ..db import db
from ..models import Artifact, Contact, Conversation, Event, Job, new_id, utcnow
from ..tasks.codex_transport import RunnerError
from . import evaluator, lab, protection, quality, typed_checks
from .wire import Strict

VERSION = "customer-quality-dispatch.v1"


class Request(Strict):
    bearer: str = Field(pattern=r"^[A-Za-z0-9_-]{64}$")
    conversation_id: UUID
    request_id: UUID
    episode: lab.Episode


class ScoredRequest(Request):
    score_competence: bool = Field(default=True, strict=True)


class TypedRequest(ScoredRequest):
    typed_expectations: protection.Reference


class SessionReviewRequest(Strict):
    conversation_id: UUID
    request_id: UUID
    episode: lab.Episode


class SessionScoredRequest(SessionReviewRequest):
    score_competence: bool = Field(default=True, strict=True)


class SessionTypedRequest(SessionScoredRequest):
    typed_expectations: protection.Reference


def parse_session_request(value):
    schema = (SessionTypedRequest if isinstance(value, dict) and "typed_expectations" in value else
              SessionScoredRequest if isinstance(value, dict) and "score_competence" in value else SessionReviewRequest)
    return schema.model_validate(value)


def parse_request(value):
    # Preserve the original four-field Request and its strict capabilities boundary.
    schema = (TypedRequest if isinstance(value, dict) and "typed_expectations" in value else
              ScoredRequest if isinstance(value, dict) and "score_competence" in value else Request)
    return schema.model_validate(value)


@dataclass(frozen=True)
class Dispatch:
    task: dict
    binding: dict
    data: dict
    fingerprint: str
    evaluator_sha256: str
    model_profile: dict
    protection_sha256: str | None = None
    score_competence: bool = False
    typed: dict | None = None


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
        "calibration_status": "UNVERIFIED", "module_admission": "not_admitted", "activation": "not_performed",
        **({"typed_report": job.payload["typed_report"]} if "typed_report" in job.payload else {})}


def current_job(job, dispatch):
    return bool(job and job.state == "running" and job.owner == dispatch.task["owner"]
        and job.generation == dispatch.task["generation"] and job.lease_until
        and job.lease_until > utcnow() and job.payload.get("dispatch") == VERSION
        and job.payload.get("fingerprint") == dispatch.fingerprint
        and job.payload.get("model") == evaluator.MODEL
        and job.payload.get("binding_sha256") == digest(dispatch.binding)
        and job.payload.get("input_sha256") == digest(dispatch.data)
        and job.payload.get("evaluator_sha256") == dispatch.evaluator_sha256
        and job.payload.get("model_profile") == dispatch.model_profile
        and job.payload.get("competence_contract") == (competence.VERSION if dispatch.score_competence else None)
        and job.payload.get("protected_case_sha256") == dispatch.protection_sha256
        and job.payload.get("typed_binding_sha256") == (digest(dispatch.typed) if dispatch.typed is not None else None))


def last_time(session, row):
    # Held Session/Conversation locks protect mutable state; time still advances
    # during the final awaited source observation.
    if session.revoked_at or session.expires_at <= utcnow() or row.expires_at <= utcnow():
        raise ControlError(409, "quality_authorization_changed")


async def prepare(request):
    return await _prepare(chat._bearer(request.bearer), request)


async def _prepare(principal, request):
    lab.guard()
    model_profile = evaluator.profile()  # validated before DB/paid reservation
    frozen = request.episode.model_dump(mode="json")
    material = {"version": VERSION, "conversation_id": str(request.conversation_id),
        "request_id": str(request.request_id), "episode": frozen}
    scored = isinstance(request, (ScoredRequest, SessionScoredRequest)) and request.score_competence
    if isinstance(request, (TypedRequest, SessionTypedRequest)) and not scored:
        raise ControlError(409, "typed_competence_required")
    score_material = {"competence_contract": competence.VERSION} if scored else {}
    material.update(score_material)
    async with principal.text_authority(frozen["creation_id"], calibration=frozen) as (
            tx, session, creation, identity, business, binding):
        row = await chat.locked(tx, str(request.conversation_id), binding)
        protection_sha256 = await protection.review_proof(tx, row)
        typed = None
        if isinstance(request, (TypedRequest, SessionTypedRequest)):
            typed = {"reference": request.typed_expectations.model_dump(mode="json"),
                     "binding": typed_checks.bound(request.typed_expectations, await protection.observe(tx, row)),
                     "observed": await typed_checks.capture(tx, row)}
        typed_material = {"typed_binding_sha256": digest(typed)} if typed is not None else {}
        proof_material = {"protected_case_sha256": protection_sha256} if protection_sha256 is not None else {}
        fingerprint = digest({**material, **proof_material, **typed_material})
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
                "evaluator_sha256": evaluator_sha256, "model": evaluator.MODEL, "model_profile": model_profile,
                **proof_material, **score_material, **typed_material})
        tx.add(job)
        await tx.flush()
        await core.add_event(tx, row, "quality-request:" + str(request.request_id), "quality_request",
            {**job.payload, "job_id": job.id, "deadline": job.lease_until.isoformat()})
        await chat.final_authority(tx, session, creation, identity, binding)
        task = {"id": job.id, "conversation_id": row.id, "kind": "quality", "generation": 1,
            "owner": job.owner, "attempts": 1, "business_id": business.id, "environment_id": row.environment_id}
        dispatch = Dispatch(task, binding, data, fingerprint, evaluator_sha256, model_profile,
                            protection_sha256, scored, typed)
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
            or await protection.review_proof(tx, row) != dispatch.protection_sha256
            or digest(await input_data(tx, row)) != digest(dispatch.data)):
        raise ControlError(409, "quality_authorization_changed")
    if dispatch.typed is not None:
        current = {"reference": dispatch.typed["reference"],
                   "binding": typed_checks.bound(dispatch.typed["reference"], await protection.observe(tx, row)),
                   "observed": await typed_checks.capture(tx, row)}
        if current != dispatch.typed:
            raise ControlError(409, "typed_receipts_changed")
    return job


async def authorized(token, dispatch):
    return await _authorized(chat._bearer(token), dispatch)


async def _authorized(principal, dispatch):
    try:
        binding = dispatch.binding
        async with principal.text_authority(binding["creation_id"], calibration=binding["task_calibration"]) as (
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
    return await _reserve_call(chat._bearer(token), dispatch, number, prompt, wire)


async def _reserve_call(principal, dispatch, number, prompt, wire):
    binding = dispatch.binding
    async with principal.text_authority(binding["creation_id"], calibration=binding["task_calibration"]) as (
            tx, session, creation, identity, _, current):
        row = await chat.locked(tx, dispatch.task["conversation_id"], current)
        if current != binding:
            raise ControlError(409, "quality_authorization_changed")
        job = await observe(tx, row, dispatch)
        key = "quality-attempt:" + job.id + ":" + str(number)
        if await tx.scalar(select(Event.id).where(Event.conversation_id == row.id, Event.event_key == key)):
            raise ControlError(409, "quality_call_already_reserved")
        await principal.reserve(tx, binding, kind="customer_quality", conversation_id=row.id,
            request_id=job.payload["request_id"], call_key=key, number=number, model=evaluator.MODEL,
            **evaluator.hashes(prompt, wire), protected_case_sha256=dispatch.protection_sha256)
        await core.add_event(tx, row, key, "quality_provider_attempt", {
            "job_id": job.id, "number": number, "model": evaluator.MODEL, "fingerprint": dispatch.fingerprint,
            "model_profile": dispatch.model_profile,
            "binding_sha256": digest(binding), "input_sha256": digest(dispatch.data),
            "evaluator_sha256": dispatch.evaluator_sha256, **evaluator.hashes(prompt, wire),
            **({"protected_case_sha256": dispatch.protection_sha256} if dispatch.protection_sha256 is not None else {})})
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
        self.principal = chat._bearer(token)
        self._initialize()

    @classmethod
    def for_principal(cls, principal, dispatch):
        value = cls.__new__(cls)
        value.token, value.dispatch, value.principal = None, dispatch, principal
        value._initialize()
        return value

    def _initialize(self):
        self.calls, self.usage, self.timeout_recoveries = 0, [], []
        self.scores = None

    async def _reserve(self, number, prompt, wire):
        if self.token is not None:
            return await reserve_call(self.token, self.dispatch, number, prompt, wire)
        return await _reserve_call(self.principal, self.dispatch, number, prompt, wire)

    async def _authorized(self):
        if self.token is not None:
            return await authorized(self.token, self.dispatch)
        return await _authorized(self.principal, self.dispatch)

    async def ask(self, schema, instruction, data):
        # Existing Quality plus its optional independent attribution: no retry.
        if self.calls >= 2:
            raise RunnerError("call_limit")
        scored = self.dispatch.score_competence and self.calls == 0 and issubclass(schema, Quality)
        if self.dispatch.score_competence and self.calls == 0 and not scored:
            raise RunnerError("competence_quality_required")
        if scored:
            schema = competence.combined(schema)
            instruction += ('\nReturn the independent Quality assessment in quality and the existing '
                'competence assessment in scores. Neither output grants calibration or activation.\n'
                + competence.customer_instruction())
        prompt, wire = evaluator.material(schema, instruction, data)
        number = self.calls + 1
        await self._reserve(number, prompt, wire)
        self.calls = number
        result, usage, failure = None, None, None
        try:
            result, usage = await evaluator.run(schema, prompt, wire, self._authorized)
        except RunnerError as error:
            usage, failure = error.receipt, error.code
        except asyncio.CancelledError as error:
            await settle_known(self.dispatch, number, getattr(error, "receipt", None), "request_interrupted")
            raise
        await settle_known(self.dispatch, number, usage, failure, result)
        self.usage.append(chat.usage_receipt(usage))
        if failure:
            raise RunnerError(failure, usage)
        if not await self._authorized():
            raise RunnerError("authorization_revoked", usage)
        if scored:
            self.scores = competence.report(result.scores)
            return result.quality
        return result


async def finish(token, dispatch, result):
    return await _finish(chat._bearer(token), dispatch, result)


async def _finish(principal, dispatch, result):
    binding = dispatch.binding
    async with principal.text_authority(binding["creation_id"], calibration=binding["task_calibration"]) as (
            tx, session, creation, identity, _, current):
        row = await chat.locked(tx, dispatch.task["conversation_id"], current)
        if current != binding:
            raise ControlError(409, "quality_authorization_changed")
        job = await observe(tx, row, dispatch)
        reconciled = quality_guards.reconcile(result, dispatch.data)
        if dispatch.typed is not None:
            await typed_checks.accounted(tx, row, dispatch, reconciled)
            report = typed_checks.evaluate(dispatch.typed["binding"], dispatch.typed["observed"], reconciled)
            reconciled = {**reconciled, "typed_checks": report}
        await jobs.complete_in_transaction(tx, row.business_id, dispatch.task, reconciled)
        if dispatch.typed is not None:
            job.payload = {**job.payload, "typed_report": {"state": report["state"],
                "sha256": digest(report), "evaluation_plan_sha256": report["evaluation_plan_sha256"],
                "purpose": report["purpose"]}}
        await chat.final_authority(tx, session, creation, identity, current)
        last_time(session, row)
        if job.lease_until <= utcnow():
            raise ControlError(409, "quality_authorization_changed")
        return receipt(job)


async def run(request):
    return await _run(chat._bearer(request.bearer), request)


async def run_session(principal, request):
    from .session import required
    principal = required(principal)
    if not isinstance(request, SessionReviewRequest):
        raise ControlError(400, "invalid_request")
    request = parse_session_request(request.model_dump(mode="json"))
    return await _run(principal, request)


async def _run(principal, request):
    dispatch = await _prepare(principal, request)
    if not isinstance(dispatch, Dispatch):
        return dispatch
    try:
        accounted = (AccountedLab(principal.token, dispatch) if isinstance(principal, chat._BearerPrincipal)
                     else AccountedLab.for_principal(principal, dispatch))
        result = await local_semantics.evaluate("quality", dispatch.data, accounted)
        if dispatch.score_competence:
            if accounted.scores is None:
                raise RunnerError("competence_scores_missing")
            result["competence"] = accounted.scores
        return await _finish(principal, dispatch, result)
    except asyncio.CancelledError:
        await asyncio.shield(fail(dispatch, "request_interrupted"))
        raise
    except (RunnerError, ControlError, HTTPException, RuntimeError, ValueError) as error:
        code = error.code if isinstance(error, RunnerError) else "quality_authorization_or_output_invalid"
        await fail(dispatch, code)
        return {"scope": "operator_local_customer_quality", "status": "failed", "failure_code": code,
            "job_id": dispatch.task["id"], "model": evaluator.MODEL, "calibration_status": "UNVERIFIED",
            "module_admission": "not_admitted", "activation": "not_performed"}
