"""Ordinary-customer team admission and trusted projection on the maintained tasks."""
import asyncio
import hashlib
from datetime import timedelta

from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..control.models import BusinessGrant, Session
from ..control.routes import ControlError, identifier, seal_cursor
from ..creation.service import binding, digest
from ..customer_text.adapter import source_current
from ..models import Business, new_id, utcnow
from ..tasks.models import Task, TaskRun, Thread
from ..tasks.service import TERMINAL, append_event
from ..workspace_topics import service as topics
from .models import Attempt, Member, TeamEvent, TeamThread, TeamTurn
from .policy import CAPABILITIES, KIND, MAX_HISTORY, participant_id, roster_hash, roster_items
from .quota import call_slot
from .schema import TABLES
from .wire import Accepted, PublicEvent, Roster, TeamPage, Turn


def guard():
    topics.guard()
    if not settings().workspace_team_enabled:
        raise ControlError(403, "workspace_team_unavailable")


async def schema_ready(tx):
    count = await tx.scalar(text("SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(:names) AND relrowsecurity AND relforcerowsecurity"), {"names": list(TABLES)})
    if count != len(TABLES):
        raise ControlError(503, "workspace_team_schema_unavailable")
    ready = await tx.scalar(text("""SELECT
      (SELECT count(*)=10 FROM pg_trigger WHERE tgname IN('workspace_team_mutation','workspace_team_fence')
       AND tgrelid=ANY(SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(:names))
       AND tgenabled IN('O','A') AND NOT tgisinternal)
      AND (SELECT count(*)=3 FROM pg_constraint WHERE conname IN('fk_workspace_team_owner_event','fk_workspace_team_event_turn','fk_workspace_team_reply')
        AND convalidated AND condeferrable AND condeferred)
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='control_tasks'::regclass AND conname='uq_control_task_thread_kind_scope' AND convalidated)
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='control_tasks'::regclass AND conname='control_tasks_kind_check' AND convalidated AND pg_get_constraintdef(oid) LIKE '%workspace.team_turn%')
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='control_tasks'::regclass AND conname='control_tasks_session_kind_check' AND convalidated AND pg_get_constraintdef(oid) LIKE '%workspace.team_turn%')
      AND (SELECT count(*)=2 FROM pg_attribute WHERE attrelid='control_workspace_team_turns'::regclass
        AND attname IN('agent_creation_id','agent_purpose') AND NOT attisdropped)
      AND (SELECT count(*)=2 FROM pg_constraint WHERE conrelid='control_workspace_team_turns'::regclass
        AND conname IN('workspace_agent_intent_check','fk_workspace_agent_intent_creation') AND convalidated)
      AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('uq_workspace_team_owner_message') AND indisunique AND indisvalid)
      AND NOT EXISTS(SELECT 1 FROM unnest(CAST(:names AS TEXT[])) AS tables(name) WHERE has_table_privilege(current_user,tables.name,'UPDATE,DELETE'))
      AND (SELECT count(*)=5 FROM pg_proc WHERE oid IN
        (to_regprocedure('workspace_team_daily_reserved(character varying,character varying)'),
         to_regprocedure('workspace_team_actor_busy(character varying,character varying)'),
         to_regprocedure('workspace_team_settle_attempt(character varying,character varying,character varying,character varying,character varying,character varying,jsonb)'),
         to_regprocedure('workspace_team_release_queue(character varying,character varying,character varying)'),
         to_regprocedure('workspace_team_run_usage(character varying,character varying,character varying,character varying,character varying)'))
        AND prosecdef AND has_function_privilege(current_user,oid,'EXECUTE'))
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('director_settle_revoked_task(character varying,character varying,character varying,character varying,character varying,character varying,jsonb,character varying)')
        AND prosecdef AND pg_get_functiondef(oid) LIKE '%workspace.team_turn%')"""), {"names": list(TABLES)})
    if not ready:
        raise ControlError(503, "workspace_team_schema_unavailable")


async def topic(tx, session, portfolio_id, topic_id):
    guard()
    row = await topics.owned_topic(tx, session, portfolio_id, topic_id)
    await schema_ready(tx)
    return row


async def blockers(tx, row):
    cfg = settings()
    values = []
    if row.anchor_kind != "business":
        values.append("business_anchor_required")
    if (not cfg.workspace_team_runner_enabled or row.user_id not in cfg.workspace_team_actor_ids
            or not 1 <= cfg.chat_daily_limit <= 100 or not await asyncio.to_thread(source_current)):
        values.append("team_execution_disabled")
    if row.archived_at is not None:
        values.append("topic_archived")
    thread = await tx.scalar(select(TeamThread).where(TeamThread.topic_id == row.id))
    if thread:
        native = await tx.get(Thread, thread.task_thread_id)
        if not native or native.last_sequence >= 20:
            values.append("topic_capacity_reached")
    return values


async def roster(tx, session, portfolio_id, topic_id):
    row = await topic(tx, session, portfolio_id, topic_id)
    reasons = await blockers(tx, row)
    items = roster_items(row, admitted=not reasons)
    await topic(tx, session, portfolio_id, topic_id)
    return topics.project(Roster, topic_id=row.id, portfolio_id=row.portfolio_id, anchor=topics.anchor_of(row),
        participants=items, roster_sha256=roster_hash(items), can_send=not reasons, blockers=reasons,
        max_calls_per_turn=3, old_notes_dispatch="never_automatic")


async def team_thread(tx, row, *, create=False, lock=False):
    statement = select(TeamThread).where(TeamThread.topic_id == row.id, *topics.constraints(TeamThread, binding(row)))
    if lock:
        statement = statement.with_for_update()
    thread = await tx.scalar(statement.execution_options(populate_existing=True))
    if not thread and create:
        native = Thread(id=new_id(), business_id=row.business_id, organization_id=row.organization_id,
            user_id=row.user_id, environment_id=row.environment_id, last_sequence=0)
        tx.add(native)
        await tx.flush()
        thread = TeamThread(id=new_id(), topic_id=row.id, task_thread_id=native.id,
            business_id=row.business_id, grant_id=row.grant_id, event_sequence=0, **binding(row))
        tx.add(thread)
        await tx.flush()
        for role, cap in CAPABILITIES.items():
            tx.add(Member(id=participant_id(row, role), team_thread_id=thread.id, role=role,
                capability_id=cap[0], **binding(row)))
        await tx.flush()
    if thread:
        if (thread.business_id, thread.grant_id) != (row.business_id, row.grant_id):
            raise ControlError(503, "source_unavailable")
        members = list(await tx.scalars(select(Member).where(Member.team_thread_id == thread.id)))
        if len(members) != 2 or {m.role for m in members} != set(CAPABILITIES) or any(
                m.id != participant_id(row, m.role) or m.capability_id != CAPABILITIES[m.role][0]
                or binding(m) != binding(row) for m in members):
            raise ControlError(503, "source_unavailable")
    return thread


def event_view(event, row):
    if event.author_type != "user" and event.participant_id != participant_id(row, event.author_type):
        raise ControlError(503, "source_unavailable")
    return topics.project(PublicEvent, event_id=event.id, topic_id=row.id, task_id=event.task_id,
        sequence=event.sequence, author_type=event.author_type, author_user_id=event.author_user_id,
        participant_id=event.participant_id, attempt_id=event.attempt_id, kind=event.kind,
        reply_to_event_id=event.reply_to_event_id, content=event.content, content_sha256=event.content_sha256,
        source_revision=event.source_revision, created_at=event.created_at)


async def turn_view(tx, task, row):
    attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id)))
    turn = await tx.get(TeamTurn, task.id)
    run = await tx.get(TaskRun, task.run_id) if task.run_id else None
    receipt = None
    if turn.context is not None:
        if digest(turn.context) != turn.context_sha256:
            raise ControlError(503, "source_unavailable")
        receipt = {"context_sha256": turn.context_sha256, "roster_sha256": turn.roster_sha256,
            "history_cutoff": turn.context_cutoff, "history_event_ids": [item["event"]["event_id"] for item in turn.context["history"]],
            "omitted_history_events": turn.context["omitted_history_events"], "reply_to_event_id": turn.context["reply"]["event_id"] if turn.context["reply"] else None}
    return topics.project(Turn, task_id=task.id, topic_id=row.id, sequence=task.sequence,
        idempotency_key=task.idempotency_key, status=task.status, created_at=task.created_at,
        updated_at=task.updated_at, failure_code=task.failure_code, reserved_calls=len(attempts),
        settled_calls=sum(a.state != "reserved" for a in attempts),
        usage_complete=bool(attempts) and all(a.state != "reserved" and a.usage is not None for a in attempts),
        cost_status="UNVERIFIED", context_receipt=receipt, started_at=run.created_at if run else None, lease_until=task.lease_until)


async def add_event(tx, row, thread, task_id, author, kind, content, *, event_id=None, reply=None, attempt=None):
    if thread.event_sequence >= 2147483647:
        raise ControlError(409, "topic_capacity_reached")
    thread.event_sequence += 1
    event = TeamEvent(id=event_id or new_id(), task_id=task_id, team_thread_id=thread.id,
        sequence=thread.event_sequence, author_type=author,
        author_user_id=row.user_id if author == "user" else None,
        participant_id=None if author == "user" else participant_id(row, author), attempt_id=attempt,
        kind=kind, reply_to_event_id=reply, content=content,
        content_sha256=hashlib.sha256(content.encode()).hexdigest(), source_revision=settings().control_source_revision,
        **binding(row))
    tx.add(event)
    await tx.flush()
    return event


async def send(tx, session, portfolio_id, topic_id, value, *, preparation=None):
    try:
        async with tx.begin_nested():
            return await _send(tx, session, portfolio_id, topic_id, value, preparation=preparation)
    except IntegrityError as error:
        queue, seen = [error], set()
        while queue:
            item = queue.pop()
            if id(item) in seen:
                continue
            seen.add(id(item))
            if (getattr(item, "sqlstate", None) == "23505"
                    and getattr(item, "constraint_name", None) == "control_tasks_user_id_environment_id_idempotency_key_key"):
                raise ControlError(409, "idempotency_conflict") from None
            queue.extend(x for x in (getattr(item, "orig", None), item.__cause__, item.__context__) if x is not None)
        raise


async def _send(tx, session, portfolio_id, topic_id, value, *, preparation=None):
    row = await topic(tx, session, portfolio_id, topic_id)
    if preparation is not None:
        from .preparation import capture
        await capture(tx, session, row, preparation.creation_id, source=settings().control_source_revision)
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "chat-admission:"+row.environment_id+":"+row.user_id})
    material = {"kind": KIND, "topic_id": row.id, "binding": binding(row), "request": value.model_dump(mode="json", exclude={"idempotency_key"})}
    if preparation is not None:
        material["agent_preparation"] = {"creation_id": str(preparation.creation_id), "purpose": preparation.purpose}
    fingerprint = digest(material)
    old = await tx.scalar(select(Task).where(Task.idempotency_key == str(value.idempotency_key)))
    if old:
        turn = await tx.get(TeamTurn, old.id)
        if old.kind != KIND or old.fingerprint != fingerprint or not turn or turn.topic_id != row.id:
            raise ControlError(409, "idempotency_conflict")
        event = await tx.get(TeamEvent, turn.owner_event_id)
        return topics.project(Accepted, turn=await turn_view(tx, old, row), event=event_view(event, row))
    reasons = await blockers(tx, row)
    if reasons:
        raise ControlError(409 if reasons[0] in {"topic_archived", "topic_capacity_reached"} else 403, reasons[0])
    thread = await team_thread(tx, row, create=True, lock=True)
    native = await tx.scalar(select(Thread).where(Thread.id == thread.task_thread_id).with_for_update())
    if native.last_sequence >= 20:
        raise ControlError(409, "topic_capacity_reached")
    reply = str(value.reply_to_event_id) if value.reply_to_event_id else None
    if reply and not await tx.scalar(select(TeamEvent.id).where(TeamEvent.id == reply, TeamEvent.team_thread_id == thread.id)):
        raise ControlError(404, "not_found")
    native.last_sequence += 1
    task = Task(id=new_id(), business_id=row.business_id, organization_id=row.organization_id,
        user_id=row.user_id, environment_id=row.environment_id, thread_id=native.id, session_id=session.id,
        sequence=native.last_sequence, idempotency_key=str(value.idempotency_key), fingerprint=fingerprint,
        message=value.content, kind=KIND, source_revision=settings().control_source_revision,
        status="queued", event_sequence=0)
    tx.add(task)
    await tx.flush()
    owner_id = new_id()
    tx.add(TeamTurn(id=task.id, team_thread_id=thread.id, topic_id=row.id, task_thread_id=native.id, business_id=row.business_id,
        task_kind=KIND, owner_event_id=owner_id, roster_sha256=roster_hash(roster_items(row, admitted=True)),
        agent_creation_id=str(preparation.creation_id) if preparation is not None else None,
        agent_purpose=preparation.purpose if preparation is not None else None,
        deadline=utcnow()+timedelta(hours=24), **binding(row)))
    await tx.flush()
    event = await add_event(tx, row, thread, task.id, "user", "owner_message", value.content, event_id=owner_id, reply=reply)
    await append_event(tx, task)
    # Check the durable request key before quota. Hidden old keys must conflict,
    # even when the next valid queued task already consumes the daily allowance.
    # This new queued turn now holds its three calls inside the same savepoint.
    from ..tasks.codex import RunnerError
    try:
        await call_slot(tx, row.user_id)
    except RunnerError as error:
        raise ControlError(429, error.code) from None
    await topic(tx, session, portfolio_id, topic_id)
    if preparation is not None:
        await capture(tx, session, row, preparation.creation_id, source=task.source_revision)
    return topics.project(Accepted, turn=await turn_view(tx, task, row), event=event_view(event, row))


async def history(tx, session, portfolio_id, topic_id, *, limit=20, cursor=None):
    topics.query_checks(limit, "")
    row = await topic(tx, session, portfolio_id, topic_id)
    thread = await team_thread(tx, row)
    if not thread:
        if cursor:
            raise ControlError(400, "invalid_cursor")
        return topics.project(TeamPage, topic_id=row.id, events=[], turns=[], cutoff_sequence=0, next_cursor=None)
    snapshot = digest(["workspace-team.v1", "history", row.id, binding(row), row.grant_id, thread.id])
    cutoff, before, expires = thread.event_sequence, None, int(utcnow().timestamp())+300
    if cursor:
        payload, expires = topics.decoded_cursor(cursor, session, portfolio_id, snapshot)
        cutoff, before = payload.get("cutoff"), payload.get("before")
        if type(cutoff) is not int or type(before) is not int or not 1 <= before <= cutoff <= thread.event_sequence:
            raise ControlError(400, "invalid_cursor")
        if not await tx.scalar(select(TeamEvent.id).where(TeamEvent.id == payload["after"], TeamEvent.team_thread_id == thread.id, TeamEvent.sequence == before)):
            raise ControlError(400, "invalid_cursor")
    statement = select(TeamEvent).where(TeamEvent.team_thread_id == thread.id, TeamEvent.sequence <= cutoff)
    if before is not None:
        statement = statement.where(TeamEvent.sequence < before)
    rows = list(await tx.scalars(statement.order_by(TeamEvent.sequence.desc()).limit(limit+1)))
    page = rows[:limit]
    tasks = list(await tx.scalars(select(Task).where(Task.thread_id == thread.task_thread_id, Task.kind == KIND).order_by(Task.sequence)))
    next_cursor = seal_cursor({"binding": [session.user_id, session.id, row.portfolio_id, row.environment_id],
        "snapshot": snapshot, "expires": expires, "after": page[-1].id, "before": page[-1].sequence, "cutoff": cutoff}) if len(rows) > limit else None
    await topic(tx, session, portfolio_id, topic_id)
    return topics.project(TeamPage, topic_id=row.id, events=[event_view(e, row) for e in reversed(page)],
        turns=[await turn_view(tx, task, row) for task in tasks], cutoff_sequence=cutoff, next_cursor=next_cursor)


async def cancel(tx, session, portfolio_id, topic_id, task_id):
    row = await topic(tx, session, portfolio_id, topic_id)
    turn = await tx.get(TeamTurn, identifier(task_id))
    if not turn or turn.topic_id != row.id:
        raise ControlError(404, "not_found")
    task = await tx.scalar(select(Task).where(Task.id == turn.id, Task.kind == KIND).with_for_update())
    if not task:
        raise ControlError(404, "not_found")
    if task.status not in TERMINAL:
        task.status, task.failure_code = "cancelled", None
        # A live reserved run holds its current bounded slot until settled/expired.
        if task.run_id is None:
            task.lease_until = None
        await append_event(tx, task)
    return await turn_view(tx, task, row)


async def task_scope(tx, task):
    guard()
    cfg = settings()
    if (not cfg.workspace_team_runner_enabled or task.kind != KIND or task.user_id not in cfg.workspace_team_actor_ids
            or task.source_revision != cfg.control_source_revision or not await asyncio.to_thread(source_current)):
        raise ControlError(403, "team_execution_disabled")
    session = await tx.scalar(select(Session).where(Session.id == task.session_id).execution_options(populate_existing=True))
    if not session or session.user_id != task.user_id:
        raise ControlError(401, "unauthenticated")
    turn = await tx.get(TeamTurn, task.id, populate_existing=True)
    if not turn:
        raise ControlError(404, "not_found")
    row = await topic(tx, session, turn.portfolio_id, turn.topic_id)
    if row.archived_at is not None or row.business_id != task.business_id or binding(turn) != binding(row):
        raise ControlError(403, "authorization_revoked")
    thread = await team_thread(tx, row)
    if not thread or thread.id != turn.team_thread_id or thread.task_thread_id != task.thread_id:
        raise ControlError(503, "source_unavailable")
    if turn.roster_sha256 != roster_hash(roster_items(row, admitted=True)):
        raise ControlError(403, "authorization_revoked")
    owner = await tx.get(TeamEvent, turn.owner_event_id, populate_existing=True)
    if (not owner or owner.task_id != task.id or owner.author_type != "user" or owner.kind != "owner_message"
            or owner.content != task.message or owner.source_revision != task.source_revision):
        raise ControlError(503, "source_unavailable")
    tx.info.setdefault("workspace_team_deadlines", {})[task.id] = min(turn.deadline, session.expires_at)
    if turn.agent_creation_id is not None:
        from .preparation import verify_task
        await verify_task(tx, task, row, turn)
    return row, thread, turn


async def context_for(tx, task):
    row, thread, turn = await task_scope(tx, task)
    if turn.context is not None:
        raise ControlError(409, "team_context_already_claimed")
    grant = await tx.get(BusinessGrant, row.grant_id)
    business = await tx.get(Business, row.business_id)
    if not grant or not business:
        raise ControlError(404, "not_found")
    statement = select(TeamEvent).join(Task, Task.id == TeamEvent.task_id).where(TeamEvent.team_thread_id == thread.id,
        Task.sequence < task.sequence, TeamEvent.sequence <= thread.event_sequence)
    total = await tx.scalar(select(func.count()).select_from(statement.subquery()))
    rows = list(await tx.scalars(statement.order_by(TeamEvent.sequence.desc()).limit(MAX_HISTORY)))
    owner = await tx.get(TeamEvent, turn.owner_event_id)
    reply = await tx.get(TeamEvent, owner.reply_to_event_id) if owner.reply_to_event_id else None
    if reply:
        reply_task = await tx.get(Task, reply.task_id)
        if not reply_task or reply.team_thread_id != thread.id or reply_task.sequence > task.sequence:
            raise ControlError(503, "source_unavailable")
    context = {"business": {"display_name": grant.display_name, "site_id": business.site_id,
        "canonical_host": business.canonical_host, "evidence_basis": "registration_metadata_only"},
        "message": task.message, "reply": event_view(reply, row) if reply else None,
        "history": [{"event": event_view(e, row), "turn_status": (await tx.get(Task, e.task_id)).status} for e in reversed(rows)], "omitted_history_events": max(0, total-len(rows)),
        "history_cutoff": thread.event_sequence, "roster": roster_items(row, admitted=True),
        "roster_sha256": turn.roster_sha256, "old_notes": "excluded_without_explicit_new_intent"}
    from . import directory
    session = await tx.get(Session, task.session_id)
    context["configured_agents"] = await directory.context(tx, session, row)
    if turn.agent_creation_id is not None:
        from .preparation import SCOPE_KEY
        context[SCOPE_KEY] = tx.info["workspace_agent_scopes"][task.id]
        context["agent_preparation"] = {"purpose": turn.agent_purpose, "outcome": "native_draft_only",
            "calibration": "separate_required_checks", "activation": "not_authorized"}
    turn.context, turn.context_sha256, turn.context_cutoff = context, digest(context), thread.event_sequence
    turn.deadline = min(turn.deadline, utcnow()+timedelta(seconds=3*settings().chat_runner_seconds+30))
    tx.info["workspace_team_deadlines"][task.id] = turn.deadline
    await tx.flush()
    return {**context, "_task_id": task.id, "_user_id": task.user_id, "_team_context_sha256": turn.context_sha256}
