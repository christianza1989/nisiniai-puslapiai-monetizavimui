"""Dashboard projections reuse the accepted task/session/grant authority."""
import hashlib
import json

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select

from ..config import settings
from ..control.routes import (
    ControlError,
    SafeRoute,
    authenticated,
    identifier,
    open_cursor,
    seal_cursor,
)
from ..models import utcnow
from .models import Task, TaskRun
from .service import chat_guard, get_task, grant_for, submit, task_view

router = APIRouter(prefix="/operator/v2", route_class=SafeRoute)
AGENT_ID = "business-planner"
STATES = ("queued", "running", "succeeded", "failed", "cancelled")


def envelope(request, response, data):
    cfg = settings()
    response.headers["Cache-Control"] = "private, no-store"
    return {"contract_version": "operations.v1", "environment": "test" if cfg.environment.startswith("test-")
            else cfg.environment, "source_revision": cfg.control_source_revision, "observed_at": utcnow().isoformat(),
            "request_id": request.state.control_request_id, "data": data}


def agent_view(user_id):
    cfg = settings()
    if not cfg.chat_enabled or not cfg.chat_operator_user_id or not 1 <= cfg.chat_daily_limit <= 100:
        reason = "chat_unavailable"
    elif user_id != cfg.chat_operator_user_id:
        reason = "operator_required"
    elif not cfg.chat_runner_enabled:
        reason = "runner_unavailable"
    elif not cfg.chat_codex_executable or not cfg.chat_codex_sha256 or not cfg.chat_workspace:
        reason = "runner_not_configured"
    else:
        reason = None
    # Configuration availability is distinct from a current worker/provider health proof.
    return {"agent_id": AGENT_ID, "display_name": "Automatizavimo konsultantas", "kind": "chat.consult",
            "description": "Verslo poreikių aptarimas ir automatizavimo plano pasiūlymai.",
            "availability": "available" if reason is None else "unavailable", "unavailable_reason": reason,
            "model": cfg.chat_model, "effort": "medium", "tools": [], "system_writes": False,
            "worker_health": "unknown", "daily_task_limit": cfg.chat_daily_limit}


class TaskInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    agent_id: str = Field(pattern=r"^business-planner$")
    message: str = Field(min_length=1, max_length=1000)
    idempotency_key: str


@router.get("/businesses/{business_id}/agents")
async def agents(business_id: str, request: Request, response: Response,
                 context=Depends(authenticated, scope="function")):
    tx, session = context
    business_id = identifier(business_id)
    await grant_for(tx, business_id, session.user_id)
    return envelope(request, response, {"business_id": business_id, "items": [agent_view(session.user_id)]})


@router.post("/businesses/{business_id}/tasks", status_code=202)
async def create_task(business_id: str, value: TaskInput, request: Request, response: Response,
                      context=Depends(authenticated, scope="function")):
    tx, session = context
    business_id = identifier(business_id)
    await grant_for(tx, business_id, session.user_id)
    available = agent_view(session.user_id)
    if available["unavailable_reason"]:
        raise ControlError(403, available["unavailable_reason"])
    if not value.message.strip():
        raise ControlError(400, "invalid_request")
    task = await submit(tx, session, target=business_id, message=value.message,
                        key=identifier(value.idempotency_key), start=True)
    return envelope(request, response, {"business_id": business_id, "agent_id": AGENT_ID,
                    "thread_id": task.thread_id, "task": task_view(task)})


def cursor_binding(session, business_id, status):
    # Existing cursor primitive supplies signature, expiry, actor/session/environment binding.
    return f"tasks:{business_id}:{status or 'all'}"


@router.get("/businesses/{business_id}/tasks")
async def history(business_id: str, request: Request, response: Response, limit: int = Query(20, ge=1, le=50),
                  cursor: str | None = Query(None, min_length=1, max_length=2048),
                  status: str | None = Query(None, pattern=r"^(queued|running|succeeded|failed|cancelled)$"),
                  context=Depends(authenticated, scope="function")):
    chat_guard()
    tx, session = context
    business_id = identifier(business_id)
    await grant_for(tx, business_id, session.user_id)
    query = select(Task.id, Task.created_at).where(Task.business_id == business_id)
    if status:
        query = query.where(Task.status == status)
    # The visible creation set binds each page; inserting a task requires an explicit reload.
    # Task status is live; the status-filter snapshot expires when membership in that set changes.
    rows = (await tx.execute(query.order_by(Task.created_at.desc(), Task.id.desc()))).all()
    snapshot = hashlib.sha256(json.dumps([settings().control_source_revision,
                             [[t.id, t.created_at.isoformat()] for t in rows]], separators=(",", ":")).encode()).hexdigest()
    expires = int(utcnow().timestamp()) + 300
    if cursor:
        after, expires = open_cursor(cursor, session, cursor_binding(session, business_id, status), snapshot)
        index = next((i for i, task in enumerate(rows) if task.id == after), None)
        if index is None:
            raise ControlError(409, "snapshot_expired")
        rows = rows[index + 1:]
    page_ids = [row.id for row in rows[:limit]]
    page = list(await tx.scalars(select(Task).where(Task.id.in_(page_ids))
                                .order_by(Task.created_at.desc(), Task.id.desc())))
    next_cursor = seal_cursor({"binding": [session.user_id, session.id,
                  cursor_binding(session, business_id, status), settings().environment],
                  "snapshot": snapshot, "after": page[-1].id, "expires": expires}) if len(rows) > limit else None
    return envelope(request, response, {"business_id": business_id, "items": [task_view(t) for t in page],
                    "next_cursor": next_cursor, "snapshot_id": snapshot})


@router.get("/businesses/{business_id}/overview")
async def overview(business_id: str, request: Request, response: Response,
                   context=Depends(authenticated, scope="function")):
    tx, session = context
    business_id = identifier(business_id)
    await grant_for(tx, business_id, session.user_id)
    counts = dict((await tx.execute(select(Task.status, func.count()).where(Task.business_id == business_id)
                                   .group_by(Task.status))).all())
    last = await tx.scalar(select(func.max(Task.created_at)).where(Task.business_id == business_id))
    return envelope(request, response, {"business_id": business_id,
                    "task_counts": {state: counts.get(state, 0) for state in STATES},
                    "last_task_at": last.isoformat() if last else None, "agent": agent_view(session.user_id)})


@router.get("/tasks/{task_id}/report")
async def report(task_id: str, request: Request, response: Response,
                 context=Depends(authenticated, scope="function")):
    chat_guard()
    tx, _ = context
    task = await get_task(tx, identifier(task_id))
    run = await tx.scalar(select(TaskRun).where(TaskRun.task_id == task.id, TaskRun.id == task.run_id)) if task.run_id else None
    execution = None
    if run:
        # No executable paths, prompts, CLI logs, private configuration or inferred USD prices.
        usage = {k: v for k, v in (run.usage or {}).items()
                 if k.endswith("_tokens") and isinstance(v, int) and not isinstance(v, bool) and v >= 0}
        execution = {"run_id": run.id, "status": run.status, "model": run.model, "effort": run.effort,
                     "adapter_revision": run.adapter_revision, "started_at": run.created_at.isoformat(),
                     "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                     "usage": usage if run.usage is not None else None, "cost_microusd": run.cost_microusd}
    return envelope(request, response, {"agent_id": AGENT_ID, "task": task_view(task), "execution": execution,
                    "source_revision": task.source_revision})
