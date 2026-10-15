"""One bounded DM transcript, selected consultant, and real typed workspace subject."""
from datetime import timedelta

from sqlalchemy import func, select

from ..business_discovery.models import Discovery
from ..config import settings
from ..control.models import BusinessGrant, Portfolio
from ..control.routes import ControlError
from ..creation.models import Creation
from ..creation.service import binding, digest
from ..models import Business, utcnow
from ..tasks.models import Task
from ..workspace_topics.models import Topic
from . import direct
from .direct_projection import event_view
from .models import TeamEvent, TeamThread
from .policy import MAX_HISTORY


async def subject(tx, row):
    result = {"anchor_kind": row.anchor_kind, "evidence_basis": "owner_workspace_metadata_only"}
    if row.anchor_kind == "business":
        grant, business = await tx.get(BusinessGrant, row.grant_id), await tx.get(Business, row.business_id)
        if not grant or not business or not grant.enabled or grant.business_id != business.id:
            raise ControlError(404, "not_found")
        return {**result, "display_name": grant.display_name, "site_id": business.site_id,
            "canonical_host": business.canonical_host, "registered": True}
    if row.anchor_kind == "portfolio":
        value = await tx.get(Portfolio, row.portfolio_id)
        if not value:
            raise ControlError(404, "not_found")
        return {**result, "display_name": value.display_name, "registered": False}
    model = Creation if row.anchor_kind == "creation" else Discovery
    value = await tx.get(model, getattr(row, row.anchor_kind + "_id"), populate_existing=True)
    if not value or binding(value) != binding(row):
        raise ControlError(404, "not_found")
    name = value.display_name if row.anchor_kind == "creation" else value.title
    return {**result, "display_name": name, "status": value.status,
        "revision": value.current_revision, "registered": False}


async def context_for(tx, task):
    row, chat, turn, _ = await direct.task_scope(tx, task)
    if turn.context is not None:
        raise ControlError(409, "direct_context_already_claimed")
    thread = await tx.get(TeamThread, chat.team_thread_id, populate_existing=True)
    child = await tx.get(Topic, chat.child_topic_id)
    if not thread or not child:
        raise ControlError(503, "direct_scope_invalid")
    query = select(TeamEvent).join(Task, Task.id == TeamEvent.task_id).where(
        TeamEvent.team_thread_id == chat.team_thread_id, Task.sequence < task.sequence,
        TeamEvent.sequence <= thread.event_sequence)
    total = await tx.scalar(select(func.count()).select_from(query.subquery()))
    rows = list(await tx.scalars(query.order_by(TeamEvent.sequence.desc()).limit(MAX_HISTORY)))
    owner = await tx.get(TeamEvent, turn.owner_event_id)
    reply = await tx.get(TeamEvent, owner.reply_to_event_id) if owner.reply_to_event_id else None
    if reply:
        prior = await tx.get(Task, reply.task_id)
        if not prior or reply.team_thread_id != chat.team_thread_id or prior.sequence > task.sequence:
            raise ControlError(503, "direct_history_invalid")
    history = [{"event": await event_view(tx, chat, event),
        "turn_status": (await tx.get(Task, event.task_id)).status} for event in reversed(rows)]
    context = {"subject": await subject(tx, row), "recipient": chat.recipient, "message": task.message,
        "reply": await event_view(tx, chat, reply) if reply else None, "history": history,
        "omitted_history_events": max(0, total-len(rows)), "history_cutoff": thread.event_sequence,
        "scope": "owned_direct_tools_disabled_consultation", "other_chats": "excluded",
        "old_notes": "excluded_without_explicit_new_intent"}
    # Recheck real current parents after every asynchronous observation before freezing.
    _, _, fresh, session = await direct.task_scope(tx, task)
    now = await tx.scalar(select(func.clock_timestamp()))
    if fresh.context is not None or fresh.deadline <= now or session.expires_at <= now:
        raise ControlError(403, "authorization_revoked")
    turn.context, turn.context_sha256, turn.context_cutoff = context, digest(context), thread.event_sequence
    turn.deadline = min(turn.deadline, session.expires_at,
        utcnow() + timedelta(seconds=settings().chat_runner_seconds + 30))
    tx.info["direct_deadlines"][task.id] = turn.deadline
    await tx.flush()
    return {**context, "_task_id": task.id, "_user_id": task.user_id, "_chat_id": chat.id,
        "_direct_context_sha256": turn.context_sha256}
