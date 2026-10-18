"""Current-owner submission/read of a distinct model task on common durable rows."""
from sqlalchemy import select, text

from ..config import settings
from ..control.routes import ControlError
from ..creation.service import digest
from ..models import new_id, utcnow
from ..tasks.models import Task, TaskRun, Thread
from ..tasks.service import append_event, task_view
from . import model_authority as authority
from .model_contract import KIND, REPLY_KIND, PrepareModel, ReplyInput, ReplyRequest
from .model_models import ModelTaskBinding
from .work_models import CorrespondenceThread


async def submit(tx, session, request):
    value = PrepareModel.model_validate(request)
    # Same actor admission order as the maintained common worker, before parent locks.
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
        {"key": "chat-admission:"+settings().environment+":"+session.user_id})
    policy = await authority.historical(tx, value.authorization_id, session)
    material = value.model_dump(mode="json")
    fingerprint = digest({"request": material, "authorization_fingerprint": policy.fingerprint})
    old = await tx.scalar(select(Task).where(Task.idempotency_key == str(value.request_id)))
    if old is not None:
        binding = await tx.get(ModelTaskBinding, old.id)
        if (old.kind != KIND or old.fingerprint != fingerprint or binding is None
                or binding.authorization_id != policy.id or binding.input_sha256 != digest(material)
                or binding.input != material):
            raise ControlError(409, "acquisition_model_request_conflict")
        return old
    async with authority.current(tx, policy.id, session.id) as work:
        if value.native is not None:
            from .native_chain import check_pair, handoff
            await check_pair(tx, value, work)
            if value.stage == "email":
                await handoff(tx, value)
            prior = await tx.scalar(select(Task).join(ModelTaskBinding, ModelTaskBinding.task_id == Task.id).where(
                Task.business_id == policy.business_id, Task.environment_id == policy.environment_id,
                Task.kind == KIND, ModelTaskBinding.input["stage"].astext == value.stage,
                ModelTaskBinding.input["campaign"]["campaign_id"].astext == value.campaign.campaign_id,
                ModelTaskBinding.input["prospect"]["organization_key"].astext == value.prospect.organization_key))
            if prior is not None:
                if prior.fingerprint != fingerprint:
                    raise ControlError(409, "acquisition_native_stage_retained")
                return prior
        await authority.target(tx, work, value)
        pending = await tx.scalar(select(Task.id).join(ModelTaskBinding, ModelTaskBinding.task_id == Task.id).where(
            Task.kind == KIND, Task.business_id == policy.business_id, Task.environment_id == policy.environment_id,
            Task.status.in_(("queued", "running")),
            ModelTaskBinding.input["campaign"]["campaign_id"].astext == value.campaign.campaign_id,
            ModelTaskBinding.input["prospect"]["organization_key"].astext == value.prospect.organization_key).limit(1))
        if pending is not None:
            raise ControlError(409, "acquisition_model_target_pending")
        # A different request must not spend a second model budget for an already retained target.
        if await tx.scalar(select(CorrespondenceThread.thread_id).where(
                CorrespondenceThread.business_id == policy.business_id,
                CorrespondenceThread.environment_id == policy.environment_id,
                CorrespondenceThread.site_id == policy.site_id,
                CorrespondenceThread.adapter_id == policy.adapter_id,
                CorrespondenceThread.campaign_id == value.campaign.campaign_id,
                CorrespondenceThread.prospect_id == value.prospect.organization_key).limit(1)):
            raise ControlError(409, "acquisition_model_target_already_captured")
        now = utcnow()
        thread = Thread(id=new_id(), business_id=policy.business_id, organization_id=policy.organization_id,
            user_id=session.user_id, environment_id=policy.environment_id, created_at=now, last_sequence=1)
        tx.add(thread)
        await tx.flush()
        task = Task(id=new_id(), thread_id=thread.id, session_id=session.id, sequence=1, kind=KIND,
            status="queued", idempotency_key=str(value.request_id), fingerprint=fingerprint,
            message="Testinis klientų tyrimas ir peržiūrėto laiško juodraštis",
            source_revision=policy.source_revision, business_id=policy.business_id,
            organization_id=policy.organization_id, user_id=session.user_id, environment_id=policy.environment_id,
            created_at=now, updated_at=now, event_sequence=0)
        tx.add(task)
        await tx.flush()
        tx.add(ModelTaskBinding(task_id=task.id, authorization_id=policy.id, business_id=policy.business_id,
            organization_id=policy.organization_id, user_id=session.user_id, environment_id=policy.environment_id,
            kind=KIND, input=material, input_sha256=digest(material), created_at=now))
        await append_event(tx, task)
        return task


async def read(tx, session, task_id):
    task = await tx.scalar(select(Task).where(Task.id == str(task_id), Task.kind.in_((KIND, REPLY_KIND))))
    if task is None:
        raise ControlError(404, "not_found")
    bound = await tx.get(ModelTaskBinding, task.id)
    if bound is None:
        raise ControlError(503, "acquisition_model_task_invalid")
    await authority.historical(tx, bound.authorization_id, session)
    run = await tx.get(TaskRun, task.run_id) if task.run_id else None
    return {"task": task_view(task), "execution": None if run is None else {
        "run_id": run.id, "status": run.status, "model": run.model, "effort": run.effort,
        "usage": run.usage, "cost_microusd": run.cost_microusd}, "channel_activation": "not_performed"}


async def submit_reply(tx, session, request):
    from .model_reply import reply_context
    from .native_chain import check_pair
    value = ReplyRequest.model_validate(request)
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
        {"key": "chat-admission:"+settings().environment+":"+session.user_id})
    policy = await authority.historical(tx, value.authorization_id, session)
    old = await tx.scalar(select(Task).where(Task.idempotency_key == str(value.request_id)))
    if old is not None:
        bound = await tx.get(ModelTaskBinding, old.id)
        if (old.kind != REPLY_KIND or bound is None
                or bound.authorization_id != policy.id or bound.kind != REPLY_KIND
                or digest(bound.input) != bound.input_sha256
                or old.fingerprint != digest({"request": bound.input, "authorization_fingerprint": policy.fingerprint})
                or ReplyRequest.model_validate({key: bound.input[key] for key in ReplyRequest.model_fields if key in bound.input}) != value):
            raise ControlError(409, "acquisition_model_request_conflict")
        return old
    async with authority.current(tx, policy.id, session.id) as work:
        context = await reply_context(tx, work, value)
        if await tx.scalar(select(ModelTaskBinding.task_id).where(ModelTaskBinding.kind == REPLY_KIND,
                ModelTaskBinding.business_id == policy.business_id, ModelTaskBinding.environment_id == policy.environment_id,
                ModelTaskBinding.input["thread_id"].astext == str(value.thread_id),
                ModelTaskBinding.input["inbound_id"].astext == str(value.inbound_id))):
            raise ControlError(409, "acquisition_reply_inbound_retained")
        resolved = ReplyInput(**value.model_dump(), recipient=context["recipient"],
            campaign=context["campaign"], prospect=context["prospect"])
        await check_pair(tx, resolved, work)
        material = resolved.model_dump(mode="json")
        now = utcnow()
        thread = Thread(id=new_id(), business_id=policy.business_id, organization_id=policy.organization_id,
            user_id=policy.user_id, environment_id=policy.environment_id, created_at=now, last_sequence=1)
        tx.add(thread)
        await tx.flush()
        task = Task(id=new_id(), thread_id=thread.id, session_id=session.id, sequence=1, kind=REPLY_KIND,
            status="queued", idempotency_key=str(value.request_id),
            fingerprint=digest({"request": material, "authorization_fingerprint": policy.fingerprint}),
            message="Testinis peržiūrėtas atsakymo juodraštis", source_revision=policy.source_revision,
            business_id=policy.business_id, organization_id=policy.organization_id, user_id=policy.user_id,
            environment_id=policy.environment_id, created_at=now, updated_at=now, event_sequence=0)
        tx.add(task)
        await tx.flush()
        tx.add(ModelTaskBinding(task_id=task.id, authorization_id=policy.id, kind=REPLY_KIND,
            business_id=policy.business_id, organization_id=policy.organization_id, user_id=policy.user_id,
            environment_id=policy.environment_id, input=material, input_sha256=digest(material), created_at=now))
        await append_event(tx, task)
        return task
