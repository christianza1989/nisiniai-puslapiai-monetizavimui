"""Owned recipient-bound persistence on existing Topic/Team/Task primitives."""
import asyncio
import hashlib
from datetime import timedelta
from uuid import UUID, uuid5

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError, identifier
from ..creation.service import binding, digest
from ..customer_text.adapter import source_current
from ..models import new_id, utcnow
from ..tasks import direct_scope
from ..tasks.models import Task, Thread
from ..tasks.service import append_event
from ..workspace_topics import service as topics
from ..workspace_topics.models import Topic
from ..workspace_topics.wire import Create
from . import adapter, direct_policy
from .direct_wire import DirectAccepted
from .direct_wire import DirectChat as ChatView
from .models import DirectChat, Member, TeamEvent, TeamThread, TeamTurn
from .policy import CAPABILITIES, participant_id, roster_hash, roster_items
from .quota import call_slot

NAMESPACE = UUID("7fe2a393-48eb-4e36-a4ec-a9f849269adb")


async def schema_ready(tx):
    return bool(await tx.scalar(text("""SELECT
      EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.control_workspace_direct_chats') AND relrowsecurity AND relforcerowsecurity)
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conname='control_task_business_execution_check' AND conrelid=to_regclass('public.control_tasks') AND convalidated)
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.workspace_direct_team_check(character varying,jsonb)') AND NOT prosecdef)
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.workspace_direct_run_usage(character varying,character varying,character varying,character varying,character varying)') AND prosecdef)
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.workspace_direct_task_boundary(character varying,jsonb)') AND prosecdef)
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.control_workspace_team_fence()') AND pg_get_functiondef(oid) LIKE '%workspace_direct_team_check%')
      AND(SELECT count(*)=6 FROM pg_trigger WHERE tgname IN('direct_task_fence','direct_binding_fence','direct_binding_immutable')
        AND tgrelid IN(to_regclass('public.control_task_threads'),to_regclass('public.control_tasks'),to_regclass('public.control_task_runs'),
          to_regclass('public.control_task_events'),to_regclass('public.control_workspace_direct_chats')) AND tgenabled IN('O','A') AND NOT tgisinternal)
      AND NOT has_table_privilege(current_user,to_regclass('public.control_workspace_direct_chats'),'UPDATE,DELETE')""")))


async def parent(tx, session, portfolio_id, topic_id, *, lock=False):
    topics.guard()
    if not settings().workspace_team_enabled:
        raise ControlError(403, "workspace_team_unavailable")
    return await topics.owned_topic(tx, session, portfolio_id, topic_id, lock=lock)


def execution_for(row):
    common = {"portfolio_id": row.portfolio_id, "parent_topic_id": row.id}
    if row.anchor_kind == "business":
        return {"kind": "business", **common, "business_id": row.business_id, "grant_id": row.grant_id}
    return {"kind": "workspace", **common, "anchor": topics.anchor_of(row).model_dump(mode="json")}


async def blockers(tx, session, row, *, chat=None):
    result = []
    cfg = settings()
    if not await schema_ready(tx):
        result.append("schema_unavailable")
    if (not cfg.workspace_team_runner_enabled or session.user_id not in cfg.workspace_team_actor_ids
            or not 1 <= cfg.chat_daily_limit <= 100 or not await asyncio.to_thread(adapter.runner_ready)
            or not await asyncio.to_thread(source_current)):
        result.append("execution_disabled")
    if row.archived_at is not None:
        result.append("topic_archived")
    if chat is not None:
        observed = direct_scope.checked(chat)
        if chat.mode != "consultant":
            from .direct_preview import blockers as native_blockers
            result.extend(await native_blockers(tx, session, row, chat))
        elif observed["recipient"].model_dump(mode="json") != direct_policy.recipient(row, observed["recipient"].role):
            result.append("recipient_not_current")
        child = await tx.get(Topic, chat.child_topic_id, populate_existing=True)
        native = await tx.get(Thread, chat.task_thread_id, populate_existing=True)
        if not child or not native:
            raise ControlError(503, "direct_scope_invalid")
        if child.archived_at is not None:
            result.append("chat_archived")
        if native.last_sequence >= 20:
            result.append("chat_full")
    return result


async def owned(tx, session, portfolio_id, topic_id, chat_id, *, lock=False):
    row = await parent(tx, session, portfolio_id, topic_id, lock=lock)
    if not await schema_ready(tx):
        raise ControlError(503, "direct_schema_unavailable")
    statement = select(DirectChat).where(DirectChat.id == identifier(chat_id), DirectChat.parent_topic_id == row.id,
        *topics.constraints(DirectChat, binding(row)))
    # The binding is append-only and has no UPDATE privilege. Current parent/
    # actor locks serialize admission; immutable rows need no FOR SHARE grant.
    chat = await tx.scalar(statement.execution_options(populate_existing=True))
    if not chat:
        raise ControlError(404, "not_found")
    direct_scope.checked(chat)
    return row, chat


async def chat_view(tx, session, row, chat):
    observed = direct_scope.checked(chat)
    reasons = await blockers(tx, session, row, chat=chat)
    native = await tx.get(Thread, chat.task_thread_id, populate_existing=True)
    preview = chat.mode == "agent_preview"
    conversation_id = None
    if preview:
        from .direct_preview_budget import binding_row
        conversation_id = (await binding_row(tx, chat)).conversation_id
    return topics.project(ChatView, chat_id=chat.id, portfolio_id=row.portfolio_id, parent_topic_id=row.id,
        anchor=topics.anchor_of(row), execution_scope=observed["execution"], recipient=observed["recipient"], mode=chat.mode,
        native_state={"configuration_state": "draft", "calibration_status": "UNVERIFIED", "module_admission": "not_admitted",
            "channel_activation": "not_performed", "preview_admitted": not reasons} if preview else None,
        native_conversation_id=conversation_id, can_send=not reasons, blockers=reasons, turn_count=native.last_sequence, turn_limit=20,
        created_at=chat.created_at, created_source_revision=chat.source_revision, tools=[], external_actions=False)


async def detail(tx, session, portfolio_id, topic_id, chat_id):
    row, chat = await owned(tx, session, portfolio_id, topic_id, chat_id)
    value = await chat_view(tx, session, row, chat)
    await parent(tx, session, portfolio_id, topic_id)
    return value


def create_fingerprint(row, value):
    return digest({"version": "workspace-direct-create.v1", "parent_topic_id": row.id, "binding": binding(row),
        "anchor": topics.anchor_of(row).model_dump(mode="json"), "request": value.model_dump(mode="json")})


async def create(tx, session, portfolio_id, topic_id, value):
    if value.mode == "agent_preview":
        from .direct_preview import create as native_create
        return await native_create(tx, session, portfolio_id, topic_id, value)
    async with tx.begin_nested():
        row = await parent(tx, session, portfolio_id, topic_id, lock=True)
        if not await schema_ready(tx):
            raise ControlError(503, "direct_schema_unavailable")
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
            {"k": "chat-admission:" + row.environment_id + ":" + row.user_id})
        fingerprint = create_fingerprint(row, value)
        previous = await tx.scalar(select(DirectChat).where(DirectChat.idempotency_key == str(value.idempotency_key)))
        if previous:
            if previous.request_fingerprint != fingerprint or previous.parent_topic_id != row.id or binding(previous) != binding(row):
                raise ControlError(409, "idempotency_conflict")
            return await chat_view(tx, session, row, previous)
        reasons = await blockers(tx, session, row)
        if reasons:
            raise ControlError(409, reasons[0])
        if value.mode != "consultant" or value.recipient.kind != "consultant":
            raise ControlError(409, "preview_not_admitted")
        if value.recipient.model_dump(mode="json") != direct_policy.recipient(row, value.recipient.role):
            raise ControlError(409, "recipient_not_current")
        chat = await persist_chat(tx, session, row, value)
        await parent(tx, session, portfolio_id, topic_id, lock=True)
        return await chat_view(tx, session, row, chat)


async def persist_chat(tx, session, row, value, *, chat_id=None):
    child = await topics.create(tx, session, row.portfolio_id, Create(idempotency_key=uuid5(NAMESPACE,
        digest([binding(row), row.id, str(value.idempotency_key)])), anchor=topics.anchor_of(row),
        title=CAPABILITIES[value.recipient.role][1] if value.mode == "consultant" else "Agento peržiūra"))
    child_id = child["current_topic"]["topic_id"]
    native_id, team_id = new_id(), new_id()
    recipient = value.recipient.model_dump(mode="json")
    execution = execution_for(row)
    chat = DirectChat(id=chat_id or new_id(), **binding(row), parent_topic_id=row.id, child_topic_id=child_id,
        task_thread_id=native_id, team_thread_id=team_id, business_id=row.business_id if execution["kind"] == "business" else None,
        grant_id=row.grant_id if execution["kind"] == "business" else None, mode=value.mode,
        recipient=recipient, recipient_sha256=digest(recipient), execution_scope=execution, execution_sha256=digest(execution),
        session_id=session.id, source_revision=settings().control_source_revision, idempotency_key=str(value.idempotency_key),
        request_fingerprint=create_fingerprint(row, value))
    tx.add(chat)
    await tx.flush()  # RLS sees the owned mapping before inserting nullable task parents.
    tx.add(Thread(id=native_id, business_id=chat.business_id, organization_id=row.organization_id,
        user_id=row.user_id, environment_id=row.environment_id, last_sequence=0))
    await tx.flush()
    tx.add(TeamThread(id=team_id, **binding(row), topic_id=child_id, task_thread_id=native_id,
        business_id=chat.business_id, grant_id=chat.grant_id, event_sequence=0))
    await tx.flush()
    child_row = await tx.get(Topic, child_id)
    for role, capability in CAPABILITIES.items():
        tx.add(Member(id=participant_id(child_row, role), **binding(row), team_thread_id=team_id,
            role=role, capability_id=capability[0]))
    await tx.flush()
    return chat

def send_fingerprint(chat, value):
    return digest({"kind": direct_scope.KIND, "chat_id": chat.id, "parent_topic_id": chat.parent_topic_id,
        "binding": binding(chat), "recipient_sha256": chat.recipient_sha256, "execution_sha256": chat.execution_sha256,
        "request": value.model_dump(mode="json")})


async def add_event(tx, chat, task, author, content, *, event_id=None, reply=None, attempt=None):
    thread = await tx.scalar(select(TeamThread).where(TeamThread.id == chat.team_thread_id).with_for_update())
    child = await tx.get(Topic, chat.child_topic_id)
    if not thread or not child or thread.event_sequence >= 2147483647:
        raise ControlError(409, "direct_history_unavailable")
    thread.event_sequence += 1
    event = TeamEvent(id=event_id or new_id(), **binding(chat), task_id=task.id, team_thread_id=thread.id,
        sequence=thread.event_sequence, author_type=author, author_user_id=chat.user_id if author == "user" else None,
        participant_id=None if author in {"user", "saved_agent"} else participant_id(child, author), attempt_id=attempt,
        native_episode_task_id=task.id if author == "saved_agent" else None,
        kind="owner_message" if author == "user" else "answer", reply_to_event_id=reply,
        content=content, content_sha256=hashlib.sha256(content.encode()).hexdigest(), source_revision=task.source_revision)
    tx.add(event)
    await tx.flush()
    return event


async def send(tx, session, portfolio_id, topic_id, chat_id, value, *, _preview_scope=None):
    from .direct_projection import event_view, turn_view
    if _preview_scope is None:
        row, chat = await owned(tx, session, portfolio_id, topic_id, chat_id)
        old = await tx.scalar(select(Task.id).where(Task.idempotency_key == str(value.idempotency_key)))
        if chat.mode == "agent_preview" and old is None:
            from .direct_preview import preflight_send
            _preview_scope = await preflight_send(session, row, chat)
    try:
        async with tx.begin_nested():
            row, chat = await owned(tx, session, portfolio_id, topic_id, chat_id, lock=True)
            await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                {"k": "chat-admission:" + row.environment_id + ":" + row.user_id})
            fingerprint = send_fingerprint(chat, value)
            old = await tx.scalar(select(Task).where(Task.idempotency_key == str(value.idempotency_key)))
            if old:
                if old.kind != direct_scope.KIND or old.fingerprint != fingerprint or not direct_scope.matches(old, chat):
                    raise ControlError(409, "idempotency_conflict")
                turn = await tx.get(TeamTurn, old.id)
                event = await tx.get(TeamEvent, turn.owner_event_id)
                return topics.project(DirectAccepted, chat_id=chat.id, turn=await turn_view(tx, session, row, chat, old),
                    event=await event_view(tx, chat, event))
            reasons = await blockers(tx, session, row, chat=chat)
            if reasons:
                raise ControlError(409, reasons[0])
            from ..tasks.codex import RunnerError
            try:
                await call_slot(tx, row.user_id, additional=3 if chat.mode == "agent_preview" else 1)
            except RunnerError as error:
                raise ControlError(429, error.code) from None
            native = await tx.scalar(select(Thread).where(Thread.id == chat.task_thread_id).with_for_update())
            if not native or native.last_sequence >= 20:
                raise ControlError(409, "chat_full")
            reply = str(value.reply_to_event_id) if value.reply_to_event_id else None
            if reply and not await tx.scalar(select(TeamEvent.id).where(TeamEvent.id == reply, TeamEvent.team_thread_id == chat.team_thread_id)):
                raise ControlError(404, "not_found")
            native.last_sequence += 1
            task = Task(id=new_id(), business_id=chat.business_id, organization_id=row.organization_id,
                user_id=row.user_id, environment_id=row.environment_id, session_id=session.id, thread_id=native.id,
                sequence=native.last_sequence, kind=direct_scope.KIND, idempotency_key=str(value.idempotency_key),
                fingerprint=fingerprint, message=value.content, source_revision=settings().control_source_revision,
                status="queued", event_sequence=0)
            tx.add(task)
            await tx.flush()
            owner_id = new_id()
            child = await tx.get(Topic, chat.child_topic_id)
            tx.add(TeamTurn(id=task.id, **binding(chat), team_thread_id=chat.team_thread_id, topic_id=chat.child_topic_id,
                task_thread_id=chat.task_thread_id, business_id=chat.business_id, task_kind=direct_scope.KIND,
                owner_event_id=owner_id, roster_sha256=roster_hash(roster_items(child, admitted=True)),
                deadline=utcnow()+timedelta(hours=24)))
            await tx.flush()
            event = await add_event(tx, chat, task, "user", value.content, event_id=owner_id, reply=reply)
            if chat.mode == "agent_preview":
                from .direct_preview_budget import allocate, binding_row
                if _preview_scope is None:
                    raise ControlError(409, "preview_not_admitted")
                await allocate(tx, task, chat, await tx.get(TeamTurn, task.id), await binding_row(tx, chat), _preview_scope)
            await append_event(tx, task)
            await parent(tx, session, portfolio_id, topic_id, lock=True)
            return topics.project(DirectAccepted, chat_id=chat.id, turn=await turn_view(tx, session, row, chat, task),
                event=await event_view(tx, chat, event))
    except IntegrityError as error:
        if getattr(getattr(error, "orig", None), "sqlstate", None) == "23505":
            raise ControlError(409, "idempotency_conflict") from None
        raise


async def task_scope(tx, task, *, lock=False):
    cfg = settings()
    if (task.kind != direct_scope.KIND or task.source_revision != cfg.control_source_revision
            or not await asyncio.to_thread(source_current)):
        raise ControlError(403, "direct_execution_disabled")
    session = await tx.get(Session, task.session_id, populate_existing=True)
    if not session or session.user_id != task.user_id:
        raise ControlError(401, "unauthenticated")
    chat = await tx.scalar(select(DirectChat).where(DirectChat.task_thread_id == task.thread_id).execution_options(populate_existing=True))
    if not chat or not direct_scope.matches(task, chat):
        raise ControlError(404, "not_found")
    row, chat = await owned(tx, session, chat.portfolio_id, chat.parent_topic_id, chat.id, lock=lock)
    reasons = await blockers(tx, session, row, chat=chat)
    # The admission cap blocks NEW turns, not the already accepted twentieth one.
    reasons = [reason for reason in reasons if reason != "chat_full"]
    if reasons:
        raise ControlError(403, reasons[0])
    turn = await tx.get(TeamTurn, task.id, populate_existing=True)
    child = await tx.get(Topic, chat.child_topic_id, populate_existing=True)
    if (not turn or not child or turn.team_thread_id != chat.team_thread_id or turn.topic_id != chat.child_topic_id
            or turn.task_kind != direct_scope.KIND or turn.business_id != chat.business_id
            or binding(turn) != binding(chat) or turn.roster_sha256 != roster_hash(roster_items(child, admitted=True))):
        raise ControlError(503, "direct_scope_invalid")
    owner = await tx.get(TeamEvent, turn.owner_event_id, populate_existing=True)
    if (not owner or owner.task_id != task.id or owner.team_thread_id != chat.team_thread_id
            or owner.author_type != "user" or owner.kind != "owner_message" or owner.content != task.message
            or owner.source_revision != task.source_revision):
        raise ControlError(503, "direct_scope_invalid")
    tx.info.setdefault("direct_deadlines", {})[task.id] = min(turn.deadline, session.expires_at)
    return row, chat, turn, session


async def saved_usage(tx, task_id, run_id, user_id, environment_id, source_revision):
    # Retained accounting must survive a revoked grant hiding Task/allocation
    # rows from RLS. The existing narrow definer checks the exact run and actor;
    # a visibility probe cannot decide which immutable ledger owns this charge.
    native = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
        {"t": task_id, "r": run_id, "u": user_id, "e": environment_id})
    if native is not None:
        return native["usage"]
    return await tx.scalar(text("SELECT workspace_direct_run_usage(:t,:r,:u,:e,:s)"),
        {"t": task_id, "r": run_id, "u": user_id, "e": environment_id, "s": source_revision})
