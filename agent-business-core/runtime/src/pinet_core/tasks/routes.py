from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from ..config import settings
from ..control.routes import ControlError, SafeRoute, authenticated, identifier
from ..models import utcnow
from .models import Task, TaskEvent, Thread
from .service import TERMINAL, append_event, chat_guard, get_task, grant_for, submit, task_view

router = APIRouter(prefix="/operator/v2", route_class=SafeRoute)


class MessageInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    message: str = Field(min_length=1, max_length=1000)
    idempotency_key: str


def envelope(request, response, data):
    response.headers["Cache-Control"] = "private, no-store"
    return {"contract_version": "chat.v1", "environment": "test" if settings().environment.startswith("test-") else "local",
            "source_revision": settings().control_source_revision, "observed_at": utcnow().isoformat(),
            "request_id": request.state.control_request_id, "data": data}


async def accepted(target, value, request, response, context, start):
    tx, session = context
    if not value.message.strip():
        raise ControlError(400, "invalid_request")
    task = await submit(tx, session, target=identifier(target), message=value.message,
                        key=identifier(value.idempotency_key), start=start)
    return envelope(request, response, {"thread_id": task.thread_id, "business_id": task.business_id, "task": task_view(task)})


@router.post("/businesses/{business_id}/chat/threads", status_code=202)
async def start(business_id: str, value: MessageInput, request: Request, response: Response,
                context=Depends(authenticated, scope="function")):
    return await accepted(business_id, value, request, response, context, True)


@router.post("/chat/threads/{thread_id}/messages", status_code=202)
async def message(thread_id: str, value: MessageInput, request: Request, response: Response,
                  context=Depends(authenticated, scope="function")):
    return await accepted(thread_id, value, request, response, context, False)


@router.get("/chat/threads/{thread_id}")
async def read_thread(thread_id: str, request: Request, response: Response,
                      context=Depends(authenticated, scope="function")):
    chat_guard()
    tx, session = context
    thread = await tx.get(Thread, identifier(thread_id))
    if not thread:
        raise ControlError(404, "not_found")
    await grant_for(tx, thread.business_id, session.user_id)
    tasks = list(await tx.scalars(select(Task).where(Task.thread_id == thread.id).order_by(Task.sequence)))
    return envelope(request, response, {"thread_id": thread.id, "business_id": thread.business_id,
                     "created_at": thread.created_at.isoformat(), "tasks": [task_view(t) for t in tasks]})


@router.get("/tasks/{task_id}")
async def read_task(task_id: str, request: Request, response: Response,
                    context=Depends(authenticated, scope="function")):
    chat_guard()
    task = await get_task(context[0], identifier(task_id))
    return envelope(request, response, task_view(task))


@router.get("/tasks/{task_id}/events")
async def events(task_id: str, request: Request, response: Response, after_sequence: int = Query(0, ge=0),
                 context=Depends(authenticated, scope="function")):
    chat_guard()
    tx, _ = context
    task = await get_task(tx, identifier(task_id))
    items = list(await tx.scalars(select(TaskEvent).where(TaskEvent.task_id == task.id,
               TaskEvent.sequence > after_sequence).order_by(TaskEvent.sequence).limit(50)))
    return envelope(request, response, {"task_id": task.id, "items": [{"sequence": e.sequence, "task_id": e.task_id,
                 "status": e.status, "created_at": e.created_at.isoformat(), "failure_code": e.failure_code} for e in items],
                 "next_sequence": items[-1].sequence if items else after_sequence})


@router.post("/tasks/{task_id}/cancel")
async def cancel(task_id: str, request: Request, response: Response,
                 context=Depends(authenticated, scope="function")):
    chat_guard()
    tx, _ = context
    task = await get_task(tx, identifier(task_id), lock=True)
    if task.status not in TERMINAL:
        task.status, task.failure_code, task.lease_until = "cancelled", None, None
        await append_event(tx, task)
    return envelope(request, response, task_view(task))
