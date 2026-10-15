"""Admission and state transitions share the same durable task rows."""

import hashlib
import json
from datetime import timedelta

from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..control.models import BusinessGrant, Membership, Session, User
from ..control.routes import ControlError
from ..models import Business, new_id, utcnow
from .models import Task, TaskEvent, Thread

TERMINAL = {"succeeded", "failed", "cancelled"}


def chat_guard():
    cfg = settings()
    if not cfg.chat_enabled or not cfg.chat_operator_user_id or not 1 <= cfg.chat_daily_limit <= 100:
        raise ControlError(403, "chat_unavailable")


async def grant_for(tx, business_id, user_id):
    grant = await tx.scalar(select(BusinessGrant).join(Membership,
        (Membership.organization_id == BusinessGrant.organization_id)
        & (Membership.environment_id == BusinessGrant.environment_id)).where(
        BusinessGrant.business_id == business_id, BusinessGrant.enabled,
        Membership.user_id == user_id, Membership.enabled, Membership.role == "owner"))
    if not grant:
        raise ControlError(404, "not_found")
    return grant


async def authority(tx, task):
    cfg = settings()
    if (
        task.kind != "chat.consult"
        or not cfg.control_enabled
        or not cfg.chat_enabled
        or not cfg.chat_runner_enabled
        or task.user_id != cfg.chat_operator_user_id
        or task.source_revision != cfg.control_source_revision
    ):
        return False
    user = await tx.get(User, task.user_id)
    # Runtime may update sessions, so FOR SHARE can serialize logout with the final result commit.
    # Do not broaden write privileges on read-only membership/grant/identity tables to acquire locks.
    session = await tx.scalar(select(Session).where(Session.id == task.session_id).with_for_update(read=True))
    if (
        not user
        or not user.enabled
        or not session
        or session.user_id != task.user_id
        or session.revoked_at
        or session.expires_at <= utcnow()
    ):
        return False
    tx.info.setdefault('chat_session_deadlines',{})[task.id]=session.expires_at
    try:
        await grant_for(tx, task.business_id, task.user_id)
    except ControlError:
        return False
    from ..director.read import execution_authorized

    return await execution_authorized(tx, task)


async def append_event(tx, task):
    task.event_sequence += 1
    task.updated_at = utcnow()
    tx.add(TaskEvent(id=new_id(), task_id=task.id, sequence=task.event_sequence, status=task.status,
                    failure_code=task.failure_code, environment_id=task.environment_id,
                    organization_id=task.organization_id, business_id=task.business_id, user_id=task.user_id))
    await tx.flush()


def task_view(task):
    return {"task_id": task.id, "thread_id": task.thread_id, "business_id": task.business_id,
            "sequence": task.sequence, "kind": task.kind, "status": task.status, "message": task.message,
            "created_at": task.created_at.isoformat(), "updated_at": task.updated_at.isoformat(),
            "result": task.result, "failure_code": task.failure_code}


async def submit(tx, session, *, target, message, key, start):
    try:
        async with tx.begin_nested():
            return await _submit_chat(tx, session, target=target, message=message, key=key, start=start)
    except IntegrityError as error:
        if getattr(error.orig, "sqlstate", None) == "23505":
            raise ControlError(409, "idempotency_conflict") from None
        raise


async def _submit_chat(tx, session, *, target, message, key, start):
    chat_guard()
    user_id = session.user_id
    digest = hashlib.sha256(json.dumps([target, message, start], ensure_ascii=False,
                                       separators=(",", ":")).encode()).hexdigest()
    # One actor-wide transaction lock serializes duplicate keys, thread turns and daily admission.
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                     {"k": "chat-admission:" + settings().environment + ":" + user_id})
    if start:
        grant = await grant_for(tx, target, user_id)
        thread = None
    else:
        thread = await tx.scalar(select(Thread).where(Thread.id == target).with_for_update())
        if not thread:
            raise ControlError(404, "not_found")
        if await tx.scalar(select(Task.id).where(Task.thread_id == thread.id, Task.kind != "chat.consult").limit(1)):
            raise ControlError(404, "not_found")
        grant = await grant_for(tx, thread.business_id, user_id)
    if user_id != settings().chat_operator_user_id:
        raise ControlError(403, "operator_required")
    previous = await tx.scalar(select(Task).where(Task.idempotency_key == key))
    if previous:
        if previous.kind != "chat.consult" or previous.fingerprint != digest:
            raise ControlError(409, "idempotency_conflict")
        return previous
    if settings().workspace_team_enabled:
        from ..workspace_team.quota import call_slot
        from .codex import RunnerError
        try:
            await call_slot(tx, user_id, additional=1)
        except RunnerError as error:
            raise ControlError(429, error.code) from None
    since = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    count = await tx.scalar(select(func.count()).select_from(Task).where(Task.created_at >= since, Task.kind == "chat.consult"))
    if count >= settings().chat_daily_limit:
        raise ControlError(429, "task_rate_limited")
    if thread is None:
        thread = Thread(id=new_id(), business_id=grant.business_id, organization_id=grant.organization_id,
                        user_id=user_id, environment_id=settings().environment, last_sequence=0)
        tx.add(thread)
        await tx.flush()
    if thread.last_sequence >= 20:
        raise ControlError(409, "thread_full")
    active = await tx.scalar(select(Task.id).where(Task.thread_id == thread.id, Task.status.in_(["queued", "running"])))
    if active:
        raise ControlError(409, "thread_busy")
    thread.last_sequence += 1
    task = Task(id=new_id(), business_id=thread.business_id, organization_id=thread.organization_id,
                user_id=user_id, environment_id=settings().environment, thread_id=thread.id, session_id=session.id,
                sequence=thread.last_sequence, idempotency_key=key, fingerprint=digest, message=message,
                source_revision=settings().control_source_revision, status="queued", event_sequence=0)
    tx.add(task)
    await tx.flush()
    await append_event(tx, task)
    return task


async def get_task(tx, task_id, *, lock=False, kind="chat.consult"):
    query = select(Task).where(Task.id == task_id, Task.kind == kind)
    if lock:
        query = query.with_for_update()
    task = await tx.scalar(query)
    if not task:
        raise ControlError(404, "not_found")
    await grant_for(tx, task.business_id, task.user_id)
    if task.kind == "chat.consult":
        from ..director.read import ensure_task_read

        await ensure_task_read(tx, task)
    return task


async def context_for(tx, task):
    grant = await grant_for(tx, task.business_id, task.user_id)
    business = await tx.get(Business, task.business_id)
    previous = list(
        await tx.scalars(
            select(Task)
            .where(
                Task.thread_id == task.thread_id,
                Task.kind == "chat.consult",
                Task.sequence < task.sequence,
                Task.status == "succeeded",
            )
            .order_by(Task.sequence.desc())
            .limit(4)
        )
    )
    from ..director.read import visible_tasks

    previous = await visible_tasks(tx, previous, for_model=True)
    # Only verified registration metadata; no unpublished knowledge or private customer corpus.
    return {
        "business": {
            "display_name": grant.display_name,
            "site_id": business.site_id,
            "canonical_host": business.canonical_host,
            "stage": grant.stage,
            "runtime_status": grant.runtime_status,
        },
        "history": [{"message": t.message, "answer": t.result["answer"][:2000]} for t in reversed(previous)],
        "message": task.message,
    }


async def expire_run(tx, task):
    if task.status == "running" and task.lease_until and task.lease_until <= utcnow():
        task.status, task.failure_code = "failed", "worker_interrupted"
        task.lease_until = None
        await append_event(tx, task)


def lease_deadline():
    return utcnow() + timedelta(seconds=15)
