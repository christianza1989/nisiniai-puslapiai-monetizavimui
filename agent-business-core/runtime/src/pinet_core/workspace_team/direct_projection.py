"""Current owned reads of one immutable recipient and its actual call receipts."""
from sqlalchemy import select

from ..control.routes import ControlError, identifier, seal_cursor
from ..creation.service import binding, digest
from ..models import utcnow
from ..tasks import direct_scope
from ..tasks.models import Task
from ..tasks.service import TERMINAL, append_event
from ..workspace_topics import service as topics
from ..workspace_topics.models import Topic
from . import direct, direct_policy, directory
from .direct_wire import DirectChats, DirectContact, DirectEvent, DirectHistory, DirectRecipients, DirectTurn
from .handler import combined_usage
from .models import Attempt, DirectChat, Member, TeamEvent, TeamThread, TeamTurn
from .policy import CAPABILITIES, EFFORT, MODEL, participant_id


async def event_view(tx, chat, event):
    direct_scope.checked(chat)
    task = await tx.get(Task, event.task_id) if event else None
    if (not task or not direct_scope.matches(task, chat) or event.team_thread_id != chat.team_thread_id
            or binding(event) != binding(chat) or event.source_revision != task.source_revision):
        raise ControlError(503, "direct_history_invalid")
    turn = await tx.get(TeamTurn, task.id)
    if not turn or turn.team_thread_id != chat.team_thread_id:
        raise ControlError(503, "direct_history_invalid")
    if event.author_type == "user":
        if (event.kind != "owner_message" or event.author_user_id != chat.user_id or event.id != turn.owner_event_id
                or event.content != task.message or event.attempt_id is not None or event.participant_id is not None
                or event.native_episode_task_id is not None):
            raise ControlError(503, "direct_history_invalid")
        author = {"kind": "owner", "user_id": chat.user_id}
    elif chat.mode == "agent_preview":
        from .direct_preview_views import author as native_author
        author = await native_author(tx, chat, task, event)
    else:
        recipient = direct_scope.checked(chat)["recipient"]
        if chat.mode != "consultant":
            raise ControlError(503, "direct_history_invalid")
        child = await tx.get(Topic, chat.child_topic_id)
        member = await tx.get(Member, event.participant_id) if event.participant_id else None
        attempt = await tx.get(Attempt, event.attempt_id) if event.attempt_id else None
        if (not child or not member or not attempt or event.author_type != recipient.role or event.kind != "answer"
                or event.author_user_id is not None or event.native_episode_task_id is not None
                or member.id != participant_id(child, recipient.role) or member.team_thread_id != chat.team_thread_id
                or member.role != recipient.role or member.capability_id != recipient.capability_id
                or binding(member) != binding(chat) or attempt.task_id != task.id or attempt.run_id != task.run_id
                or attempt.team_thread_id != chat.team_thread_id or binding(attempt) != binding(chat)
                or attempt.business_id != chat.business_id or attempt.phase != "direct" or attempt.ordinal != 1
                or attempt.state != "succeeded" or attempt.source_revision != task.source_revision
                or attempt.model != MODEL or attempt.effort != EFFORT):
            raise ControlError(503, "direct_history_invalid")
        author = {"kind": "consultant", "participant_id": recipient.participant_id, "role": recipient.role,
            "attempt_id": attempt.id}
    return topics.project(DirectEvent, event_id=event.id, chat_id=chat.id, task_id=task.id, sequence=event.sequence,
        author=author, reply_to_event_id=event.reply_to_event_id, content=event.content, content_sha256=event.content_sha256,
        source_revision=event.source_revision, created_at=event.created_at)


async def turn_view(tx, session, row, chat, task):
    if not direct_scope.matches(task, chat) or binding(row) != binding(chat):
        raise ControlError(503, "direct_history_invalid")
    if chat.mode == "agent_preview":
        from .direct_preview_views import turn_view as native_turn
        return await native_turn(tx, session, row, chat, task)
    attempts = list(await tx.scalars(select(Attempt).where(Attempt.task_id == task.id).order_by(Attempt.ordinal)))
    if chat.mode != "consultant" or len(attempts) > 1 or any(
            a.ordinal != 1 or a.phase != "direct" or a.run_id != task.run_id or a.team_thread_id != chat.team_thread_id
            or a.business_id != chat.business_id or binding(a) != binding(chat) or a.source_revision != task.source_revision
            for a in attempts):
        raise ControlError(503, "direct_history_invalid")
    observed = combined_usage([a.usage for a in attempts]) or {}
    complete = bool(attempts) and all(a.state != "reserved" and a.usage is not None for a in attempts)
    return topics.project(DirectTurn, task_id=task.id, chat_id=chat.id, mode=chat.mode, sequence=task.sequence,
        idempotency_key=task.idempotency_key, status=task.status,
        can_cancel=task.status not in TERMINAL and task.user_id == session.user_id, failure_code=task.failure_code,
        call_limit=1, usage={"reserved_calls": len(attempts), "settled_calls": sum(a.state != "reserved" for a in attempts),
            "usage_complete": complete, "input_tokens": observed.get("input_tokens"),
            "output_tokens": observed.get("output_tokens"), "cost_status": "UNVERIFIED"},
        preview=None, source_revision=task.source_revision, created_at=task.created_at, updated_at=task.updated_at)


async def recipients(tx, session, portfolio_id, topic_id, *, limit=20, cursor=None):
    topics.query_checks(limit, "")
    row = await direct.parent(tx, session, portfolio_id, topic_id)
    reasons = await direct.blockers(tx, session, row)
    items = []
    if not cursor:
        for role, values in CAPABILITIES.items():
            purpose = ("Aptaria tikslą ir kitą veiksmą šiame asmeniniame pokalbyje." if role == "coordinator"
                else "Analizuoja jūsų pateiktą verslo klausimą šiame asmeniniame pokalbyje.")
            items.append(topics.project(DirectContact, recipient=direct_policy.recipient(row, role), name=values[1],
                purpose=purpose, mode="consultant", can_create_chat=not reasons, blockers=reasons,
                native_state=None, execution_scope=direct.execution_for(row), tools=[], external_actions=False))
    next_cursor = None
    if row.anchor_kind == "business":
        # Canonical native directory validates real Registration/Agent/Config ownership.
        page = await directory.read(tx, session, row, limit=limit, cursor=cursor)
        next_cursor = page["next_cursor"]
        for item in page["items"]:
            from .direct_preview import contact_blockers
            native_reasons = list(dict.fromkeys([*reasons, *await contact_blockers(tx, session, row, item)]))
            items.append(topics.project(DirectContact, recipient={"kind": "saved_agent", **{key: item[key]
                for key in ("creation_id", "agent_id", "revision_id", "revision", "configuration_sha256")}},
                name=item["name"], purpose=item["goal"], mode="agent_preview", can_create_chat=not native_reasons,
                blockers=native_reasons,
                native_state={"configuration_state": "draft", "calibration_status": "UNVERIFIED",
                    "module_admission": "not_admitted", "channel_activation": "not_performed", "preview_admitted": not native_reasons},
                execution_scope=direct.execution_for(row), tools=[], external_actions=False))
    elif cursor:
        raise ControlError(400, "invalid_cursor")
    await direct.parent(tx, session, portfolio_id, topic_id)
    return topics.project(DirectRecipients, portfolio_id=row.portfolio_id, parent_topic_id=row.id,
        anchor=topics.anchor_of(row), items=items, has_more=bool(next_cursor), next_cursor=next_cursor)


async def chats(tx, session, portfolio_id, topic_id, *, limit=20, cursor=None):
    topics.query_checks(limit, "")
    row = await direct.parent(tx, session, portfolio_id, topic_id)
    if not await direct.schema_ready(tx):
        raise ControlError(503, "direct_schema_unavailable")
    rows = list(await tx.scalars(select(DirectChat).where(DirectChat.parent_topic_id == row.id,
        *topics.constraints(DirectChat, binding(row))).order_by(DirectChat.id)))
    snapshot = digest(["workspace-direct-chats.v1", row.id, binding(row),
        [[item.id, item.recipient_sha256, item.execution_sha256] for item in rows]])
    after, expires = None, int(utcnow().timestamp()) + 300
    if cursor:
        payload, expires = topics.decoded_cursor(cursor, session, row.portfolio_id, snapshot)
        if payload.get("purpose") != "direct-chats" or payload.get("topic") != row.id or payload["after"] not in {c.id for c in rows}:
            raise ControlError(400, "invalid_cursor")
        after = payload["after"]
    remaining = [item for item in rows if after is None or item.id > after]
    page = remaining[:limit]
    values = [await direct.chat_view(tx, session, row, item) for item in page]
    next_cursor = seal_cursor({"binding": [session.user_id, session.id, row.portfolio_id, row.environment_id],
        "snapshot": snapshot, "purpose": "direct-chats", "topic": row.id, "after": page[-1].id,
        "expires": expires}) if len(remaining) > limit else None
    await direct.parent(tx, session, portfolio_id, topic_id)
    return topics.project(DirectChats, portfolio_id=row.portfolio_id, parent_topic_id=row.id, items=values, next_cursor=next_cursor)


async def history(tx, session, portfolio_id, topic_id, chat_id, *, limit=20, cursor=None):
    topics.query_checks(limit, "")
    row, chat = await direct.owned(tx, session, portfolio_id, topic_id, chat_id)
    thread = await tx.get(TeamThread, chat.team_thread_id, populate_existing=True)
    if not thread:
        raise ControlError(503, "direct_history_invalid")
    snapshot = digest(["workspace-direct-history.v1", row.id, binding(chat), chat.id, chat.team_thread_id,
        chat.recipient_sha256, chat.execution_sha256])
    cutoff, before, expires = thread.event_sequence, None, int(utcnow().timestamp()) + 300
    if cursor:
        payload, expires = topics.decoded_cursor(cursor, session, row.portfolio_id, snapshot)
        cutoff, before = payload.get("cutoff"), payload.get("before")
        if (payload.get("purpose") != "direct-history" or payload.get("chat") != chat.id
                or type(cutoff) is not int or type(before) is not int or not 1 <= before <= cutoff <= thread.event_sequence
                or not await tx.scalar(select(TeamEvent.id).where(TeamEvent.id == payload["after"],
                    TeamEvent.team_thread_id == chat.team_thread_id, TeamEvent.sequence == before))):
            raise ControlError(400, "invalid_cursor")
    query = select(TeamEvent).where(TeamEvent.team_thread_id == chat.team_thread_id, TeamEvent.sequence <= cutoff)
    if before is not None:
        query = query.where(TeamEvent.sequence < before)
    rows = list(await tx.scalars(query.order_by(TeamEvent.sequence.desc()).limit(limit + 1)))
    page = rows[:limit]
    tasks = list(await tx.scalars(select(Task).where(Task.thread_id == chat.task_thread_id,
        Task.kind == direct_scope.KIND).order_by(Task.sequence)))
    events = [await event_view(tx, chat, event) for event in reversed(page)]
    turns = [await turn_view(tx, session, row, chat, task) for task in tasks]
    next_cursor = seal_cursor({"binding": [session.user_id, session.id, row.portfolio_id, row.environment_id],
        "snapshot": snapshot, "purpose": "direct-history", "chat": chat.id, "after": page[-1].id,
        "before": page[-1].sequence, "cutoff": cutoff, "expires": expires}) if len(rows) > limit else None
    view = await direct.chat_view(tx, session, row, chat)
    await direct.parent(tx, session, portfolio_id, topic_id)
    return topics.project(DirectHistory, chat=view, events=events, turns=turns, cutoff_sequence=cutoff, next_cursor=next_cursor)


async def cancel(tx, session, portfolio_id, topic_id, chat_id, task_id):
    row, chat = await direct.owned(tx, session, portfolio_id, topic_id, chat_id, lock=True)
    task = await tx.scalar(select(Task).where(Task.id == identifier(task_id), Task.thread_id == chat.task_thread_id,
        Task.kind == direct_scope.KIND).with_for_update())
    if not task:
        raise ControlError(404, "not_found")
    direct_scope.matches(task, chat)
    if task.status not in TERMINAL:
        task.status, task.failure_code = "cancelled", None
        if task.run_id is None:
            task.lease_until = None
        await append_event(tx, task)
    value = await turn_view(tx, session, row, chat, task)
    await direct.parent(tx, session, portfolio_id, topic_id, lock=True)
    return value
