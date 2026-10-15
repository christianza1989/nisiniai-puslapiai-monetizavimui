"""Normal owner API + shared typed reader over the canonical Task/Run/Event rows."""

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import and_, func, or_, select, text

from ..config import settings
from ..control.models import Session, User
from ..control.routes import ControlError, SafeRoute, authenticated, identifier, open_cursor, seal_cursor
from ..db import db
from ..tasks.models import Task, TaskEvent, TaskRun
from ..tasks.service import TERMINAL, append_event, grant_for, task_view
from .correspondence import seal
from .ledger import LedgerError, apply_scope, conditions, scope_values
from .module_models import ModuleBinding
from .task_interfaces import (
    EventsEnvelope,
    Execution,
    PageEnvelope,
    ReportEnvelope,
    TaskEnvelope,
    TaskReport,
    TaskView,
)
from .task_models import TaskBinding
from .task_schema import KIND
from .tasks import validate_storage
from .work_config import ready

router = APIRouter(prefix="/operator/v2", route_class=SafeRoute)


async def available(app, database):
    ready(app)
    try:
        await validate_storage(database)
    except LedgerError as error:
        raise ControlError(error.status, error.code) from None


async def authorized(tx, app, *, business_id, user_id, session_id):
    cfg, reg = settings(), ready(app)
    await tx.execute(
        text(
            "SELECT set_config('pinet.environment',:e,true),set_config('pinet.control_user',:u,true),set_config('pinet.business',:b,true)"
        ),
        {"e": cfg.environment, "u": user_id, "b": business_id},
    )
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    session, user = await tx.get(Session, session_id), await tx.get(User, user_id)
    if (
        not session
        or session.user_id != user_id
        or session.revoked_at
        or session.expires_at <= now
        or not user
        or not user.enabled
    ):
        raise ControlError(401, "unauthenticated")
    grant = await grant_for(tx, business_id, user_id)
    module = await tx.get(ModuleBinding, (business_id, cfg.environment))
    entry = next(
        (
            e
            for e in reg.entries
            if e.scope.business_id == business_id and e.scope.environment_id == cfg.environment
        ),
        None,
    )
    if (
        not module
        or not entry
        or module.site_id != entry.scope.site_id
        or module.adapter_id != entry.adapter_id
        or module.organization_id != grant.organization_id
    ):
        raise ControlError(503, "acquisition_tasks_not_connected")
    if "acquisition.work.read" not in module.permissions:
        raise ControlError(403, "acquisition_task_read_denied")
    # History and cancellation survive marketing stop/expiry. They never grant execution.
    await apply_scope(tx, entry.scope, entry.adapter_id)
    return scope_values(entry.scope, entry.adapter_id)


def query_for(values):
    return (
        select(Task)
        .join(TaskBinding, TaskBinding.task_id == Task.id)
        .where(Task.kind == KIND, *conditions(TaskBinding, values))
    )


def view(task):
    return TaskView.model_validate_json(json.dumps(task_view(task)))


async def read_task(app, database, *, task_id, user_id, session_id, report=False, after_sequence=None):
    await available(app, database)
    async with database.registry() as tx:
        await tx.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        await tx.execute(
            text("SELECT set_config('pinet.environment',:e,true),set_config('pinet.control_user',:u,true)"),
            {"e": settings().environment, "u": user_id},
        )
        task = await tx.scalar(select(Task).where(Task.id == task_id, Task.kind == KIND))
        if not task:
            raise ControlError(404, "not_found")
        values = await authorized(
            tx, app, business_id=task.business_id, user_id=user_id, session_id=session_id
        )
        task = await tx.scalar(query_for(values).where(Task.id == task_id))
        if not task:
            raise ControlError(404, "not_found")
        if after_sequence is not None:
            events = list(
                await tx.scalars(
                    select(TaskEvent)
                    .where(TaskEvent.task_id == task.id, TaskEvent.sequence > after_sequence)
                    .order_by(TaskEvent.sequence)
                    .limit(50)
                )
            )
            return {
                "task_id": task.id,
                "items": tuple(
                    {
                        "task_id": e.task_id,
                        "sequence": e.sequence,
                        "status": e.status,
                        "failure_code": e.failure_code,
                        "created_at": e.created_at,
                    }
                    for e in events
                ),
                "next_sequence": events[-1].sequence if events else after_sequence,
            }
        if not report:
            return view(task)
        run = (
            await tx.scalar(select(TaskRun).where(TaskRun.id == task.run_id, TaskRun.task_id == task.id))
            if task.run_id
            else None
        )
        execution = None
        if run:
            execution = Execution(
                run_id=run.id,
                status=run.status,
                model=run.model,
                effort=run.effort,
                adapter_revision=run.adapter_revision,
                started_at=run.created_at,
                finished_at=run.finished_at,
                model_calls=0 if run.usage == {"model_calls": 0} else None,
                cost_microusd=None,
            )
        return TaskReport(task=view(task), execution=execution, source_revision=task.source_revision)


async def read_page(app, database, *, business_id, user_id, session_id, limit=20, cursor=None):
    if not 1 <= limit <= 50:
        raise ControlError(400, "invalid_request")
    await available(app, database)
    async with database.registry() as tx:
        await tx.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        values = await authorized(tx, app, business_id=business_id, user_id=user_id, session_id=session_id)
        base = query_for(values)
        aggregate = (
            await tx.execute(
                select(func.count(Task.id), func.max(Task.created_at))
                .join(TaskBinding, TaskBinding.task_id == Task.id)
                .where(Task.kind == KIND, *conditions(TaskBinding, values))
            )
        ).one()
        snapshot = seal(
            [
                values,
                user_id,
                settings().control_source_revision,
                aggregate[0],
                aggregate[1].isoformat() if aggregate[1] else None,
            ]
        )
        session = await tx.get(Session, session_id)
        binding = "acquisition-tasks:" + business_id
        expires = int((await tx.scalar(text("SELECT clock_timestamp()"))).timestamp()) + 300
        if cursor:
            after, expires = open_cursor(cursor, session, binding, snapshot)
            anchor = await tx.scalar(base.where(Task.id == after))
            if not anchor:
                raise ControlError(409, "snapshot_expired")
            base = base.where(
                or_(
                    Task.created_at < anchor.created_at,
                    and_(Task.created_at == anchor.created_at, Task.id < anchor.id),
                )
            )
        tasks = list(await tx.scalars(base.order_by(Task.created_at.desc(), Task.id.desc()).limit(limit + 1)))
        items = tasks[:limit]
        next_cursor = (
            seal_cursor(
                {
                    "binding": [user_id, session_id, binding, settings().environment],
                    "snapshot": snapshot,
                    "after": items[-1].id,
                    "expires": expires,
                }
            )
            if len(tasks) > limit
            else None
        )
        return {
            "business_id": business_id,
            "items": tuple(view(t) for t in items),
            "next_cursor": next_cursor,
            "snapshot_id": snapshot,
        }


async def cancel_task(app, database, *, task_id, user_id, session_id):
    await available(app, database)
    async with database.registry() as tx:
        await tx.execute(
            text("SELECT set_config('pinet.environment',:e,true),set_config('pinet.control_user',:u,true)"),
            {"e": settings().environment, "u": user_id},
        )
        task = await tx.scalar(select(Task).where(Task.id == task_id, Task.kind == KIND).with_for_update())
        if not task:
            raise ControlError(404, "not_found")
        values = await authorized(
            tx, app, business_id=task.business_id, user_id=user_id, session_id=session_id
        )
        if not await tx.scalar(query_for(values).where(Task.id == task_id)):
            raise ControlError(404, "not_found")
        if task.status not in TERMINAL:
            task.status, task.failure_code, task.lease_until = "cancelled", None, None
            await append_event(tx, task)
        return view(task)


def envelope(model, request, response, data):
    response.headers["Cache-Control"] = "private, no-store"
    cfg = settings()
    return model(
        environment="test" if cfg.environment.startswith("test-") else cfg.environment,
        source_revision=cfg.control_source_revision,
        observed_at=datetime.now(UTC),
        request_id=request.state.control_request_id,
        data=data,
    ).model_dump(mode="json")


@router.get("/businesses/{business_id}/acquisition-tasks")
async def history(
    business_id: str,
    request: Request,
    response: Response,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = Query(None, max_length=2048),
    context=Depends(authenticated, scope="function"),
):
    _, session = context
    data = await read_page(
        request.app,
        db,
        business_id=identifier(business_id),
        user_id=session.user_id,
        session_id=session.id,
        limit=limit,
        cursor=cursor,
    )
    return envelope(PageEnvelope, request, response, data)


@router.get("/acquisition-tasks/{task_id}")
async def task(
    task_id: str, request: Request, response: Response, context=Depends(authenticated, scope="function")
):
    _, session = context
    data = await read_task(
        request.app, db, task_id=identifier(task_id), user_id=session.user_id, session_id=session.id
    )
    return envelope(TaskEnvelope, request, response, data)


@router.get("/acquisition-tasks/{task_id}/report")
async def report(
    task_id: str, request: Request, response: Response, context=Depends(authenticated, scope="function")
):
    _, session = context
    data = await read_task(
        request.app,
        db,
        task_id=identifier(task_id),
        user_id=session.user_id,
        session_id=session.id,
        report=True,
    )
    return envelope(ReportEnvelope, request, response, data)


@router.get("/acquisition-tasks/{task_id}/events")
async def events(
    task_id: str,
    request: Request,
    response: Response,
    after_sequence: int = Query(0, ge=0),
    context=Depends(authenticated, scope="function"),
):
    _, session = context
    data = await read_task(
        request.app,
        db,
        task_id=identifier(task_id),
        user_id=session.user_id,
        session_id=session.id,
        after_sequence=after_sequence,
    )
    return envelope(EventsEnvelope, request, response, data)


@router.post("/acquisition-tasks/{task_id}/cancel")
async def cancel(
    task_id: str, request: Request, response: Response, context=Depends(authenticated, scope="function")
):
    _, session = context
    data = await cancel_task(
        request.app, db, task_id=identifier(task_id), user_id=session.user_id, session_id=session.id
    )
    return envelope(TaskEnvelope, request, response, data)
