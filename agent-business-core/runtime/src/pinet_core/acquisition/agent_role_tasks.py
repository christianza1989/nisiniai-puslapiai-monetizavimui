"""Owned submission/read on the maintained common Task/Run; no model or send."""

from pydantic import ValidationError
from sqlalchemy import select

from ..config import settings
from ..control.routes import ControlError
from ..creation.service import digest
from ..customer_agents import service as agents
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


async def _read_request(tx, session, task_id):
    # The caller must authenticate with customer_session in this transaction.
    # Token-only scope intentionally cannot enumerate private model bindings.
    task = await tx.scalar(select(Task).where(
        Task.id == str(task_id), Task.kind == KIND, Task.user_id == session.user_id,
        Task.environment_id == settings().environment,
    ))
    if task is None or task.business_id is None:
        raise ControlError(404, "not_found")
    async with agents.business_transaction_authority(
        tx, session, task.business_id, writing=False, lock=True,
    ):
        bound = await tx.get(ModelTaskBinding, task.id)
        keys = ("business_id", "organization_id", "user_id", "environment_id")
        if (bound is None or bound.kind != KIND
                or any(getattr(bound, key) != getattr(task, key) for key in keys)
                or digest(bound.input) != bound.input_sha256):
            raise ControlError(503, "agent_role_task_invalid")
        policy = await authority.historical(tx, bound.authorization_id, session)
        if (any(getattr(policy, key) != getattr(task, key) for key in keys)
                or task.source_revision != policy.source_revision
                or task.fingerprint != digest({
                    "request": bound.input, "authorization_fingerprint": policy.fingerprint,
                })):
            raise ControlError(503, "agent_role_task_invalid")
        try:
            value = RoleRequest.model_validate(bound.input)
        except ValidationError as error:
            raise ControlError(503, "agent_role_task_invalid") from error
        if (str(value.authorization_id) != bound.authorization_id
                or value.role != policy.execution_role
                or getattr(value.team, value.role).fingerprint != policy.fingerprint):
            raise ControlError(503, "agent_role_task_invalid")
        return task, value


async def read_request(tx, session, task_id):
    """Typed owned historical input; never reserves, renews or permits execution."""
    _, value = await _read_request(tx, session, task_id)
    return value


async def read(tx, session, task_id):
    task, _ = await _read_request(tx, session, task_id)
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
