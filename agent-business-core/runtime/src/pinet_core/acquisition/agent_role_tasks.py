"""Owned submission/read on the maintained common Task/Run; no model or send."""

from sqlalchemy import select

from ..control.routes import ControlError
from ..creation.service import digest
from ..models import new_id, utcnow
from ..tasks.models import Task, TaskRun, Thread
from ..tasks.service import append_event, task_view
from . import model_authority as authority
from .agent_role_authority import observe
from .agent_role_contract import KIND, RoleRequest
from .model_models import ModelTaskBinding


async def submit(tx, session, request):
    value = RoleRequest.model_validate(request)
    policy = await authority.historical(tx, value.authorization_id, session)
    material = value.model_dump(mode="json")
    fingerprint = digest({"request": material, "authorization_fingerprint": policy.fingerprint})
    old = await tx.scalar(select(Task).where(Task.idempotency_key == str(value.request_id)))
    if old is not None:
        bound = await tx.get(ModelTaskBinding, old.id)
        if (
            old.kind != KIND
            or bound is None
            or old.fingerprint != fingerprint
            or bound.input != material
            or bound.authorization_id != policy.id
            or bound.input_sha256 != digest(material)
        ):
            raise ControlError(409, "agent_role_request_conflict")
        return old
    async with authority.current(tx, policy.id, session.id) as work:
        if work.authorization.execution_role != value.role:
            raise ControlError(409, "agent_role_authorization_changed")
        await observe(tx, value, work)
        retained = await tx.scalar(
            select(ModelTaskBinding.task_id).where(
                ModelTaskBinding.kind == KIND,
                ModelTaskBinding.authorization_id == policy.id,
                ModelTaskBinding.input["campaign"]["campaign_id"].astext == value.campaign.campaign_id,
                ModelTaskBinding.input["prospect"]["organization_key"].astext
                == value.prospect.organization_key,
                ModelTaskBinding.input["role"].astext == value.role,
                ModelTaskBinding.input["parents"] == material["parents"],
            )
        )
        if retained is not None:
            raise ControlError(409, "agent_role_work_retained")
        now = utcnow()
        thread = Thread(
            id=new_id(),
            business_id=policy.business_id,
            organization_id=policy.organization_id,
            user_id=policy.user_id,
            environment_id=policy.environment_id,
            created_at=now,
            last_sequence=1,
        )
        tx.add(thread)
        await tx.flush()
        task = Task(
            id=new_id(),
            thread_id=thread.id,
            session_id=session.id,
            sequence=1,
            kind=KIND,
            status="queued",
            idempotency_key=str(value.request_id),
            fingerprint=fingerprint,
            message="Testinis konkretaus verslo agento darbas",
            source_revision=policy.source_revision,
            business_id=policy.business_id,
            organization_id=policy.organization_id,
            user_id=policy.user_id,
            environment_id=policy.environment_id,
            created_at=now,
            updated_at=now,
            event_sequence=0,
        )
        tx.add(task)
        await tx.flush()
        tx.add(
            ModelTaskBinding(
                task_id=task.id,
                authorization_id=policy.id,
                kind=KIND,
                input=material,
                input_sha256=digest(material),
                business_id=policy.business_id,
                organization_id=policy.organization_id,
                user_id=policy.user_id,
                environment_id=policy.environment_id,
                created_at=now,
            )
        )
        await append_event(tx, task)
        return task


async def read(tx, session, task_id):
    task = await tx.scalar(select(Task).where(Task.id == str(task_id), Task.kind == KIND))
    if task is None:
        raise ControlError(404, "not_found")
    bound = await tx.get(ModelTaskBinding, task.id)
    if bound is None:
        raise ControlError(503, "agent_role_task_invalid")
    await authority.historical(tx, bound.authorization_id, session)
    run = await tx.get(TaskRun, task.run_id) if task.run_id else None
    return {
        "task": task_view(task),
        "execution": None
        if run is None
        else {
            "run_id": run.id,
            "status": run.status,
            "model": run.model,
            "effort": run.effort,
            "usage": run.usage,
            "cost_microusd": run.cost_microusd,
        },
        "channel_activation": "not_performed",
    }
