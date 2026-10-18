"""Explicit privileged owner batch; no dispatch and no predecessor mutation."""

from sqlalchemy import select, text

from ..control.models import Session
from ..control.routes import ControlError
from ..models import utcnow
from ..tasks.models import Task, TaskRun
from ..tasks.service import append_event
from . import task_authority as authority
from . import task_service as service
from .task_contract import KIND, Approve, Reauthorize
from .task_models import DisplayJob, DisplayPolicy
from .translations import POLICY_SHA


def deny():
    raise ControlError(409, "mail_display_zero_dispatch_reauthorization_unavailable")


async def reauthorize(tx, request):
    value = Reauthorize.model_validate(request)
    authority.guard()
    await authority.source(value.execution_source_revision)
    session = await tx.get(Session, str(value.authorizing_session_id), populate_existing=True)
    if session is None:
        raise ControlError(401, "unauthenticated")
    await tx.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "chat-admission:" + session.environment_id + ":" + session.user_id},
    )
    await authority.grant(tx, session, value.business_id)
    # Privileged policy CLI sessions derive SQL fence scope from the verified
    # canonical owner, just as the normal owner route scope does.
    await tx.execute(
        text("SELECT set_config('pinet.control_user',:u,true),set_config('pinet.environment',:e,true)"),
        {"u": session.user_id, "e": session.environment_id},
    )
    chains, all_jobs = [], {}
    for item in value.jobs:
        chain, seen, identity = [], set(), str(item.previous_task_id)
        while identity is not None:
            if identity in seen or len(seen) >= 33:
                deny()
            seen.add(identity)
            job = await tx.get(DisplayJob, identity, populate_existing=True)
            if job is None or (job.business_id, job.user_id, job.environment_id) != (
                str(value.business_id),
                session.user_id,
                session.environment_id,
            ):
                deny()
            chain.append(job)
            all_jobs[job.task_id] = job
            identity = job.previous_task_id
        if not chain or chain[0].source_sha256 != item.expected_source_sha256 or chain[0].generation >= 32:
            deny()
        chains.append(chain)
    # Predecessor metadata is immutable. Lock Tasks first, then Policies, then Jobs.
    tasks = {
        row.id: row
        for row in await tx.scalars(
            select(Task)
            .where(Task.id.in_(sorted(all_jobs)))
            .order_by(Task.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    }
    policies = {
        row.id: row
        for row in await tx.scalars(
            select(DisplayPolicy)
            .where(DisplayPolicy.id.in_(sorted({job.policy_id for job in all_jobs.values()})))
            .order_by(DisplayPolicy.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    }
    list(
        await tx.scalars(
            select(DisplayJob)
            .where(DisplayJob.task_id.in_(sorted(all_jobs)))
            .order_by(DisplayJob.task_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )
    if len(tasks) != len(all_jobs) or await tx.scalar(
        select(TaskRun.id).where(TaskRun.task_id.in_(sorted(all_jobs))).limit(1)
    ):
        deny()
    historical = []
    for chain in chains:
        tip = chain[0]
        if await tx.scalar(
            select(DisplayJob.task_id).where(DisplayJob.previous_task_id == tip.task_id).limit(1)
        ):
            deny()
        policy = policies.get(tip.policy_id)
        if policy is None:
            deny()
        mail, original, sha = await authority.original(tx, policy, tip.mail_id)
        if (
            mail.created_at < value.mail_created_after
            or tip.instruction_sha256 != POLICY_SHA
            or service.legacy_claim(policy.business_id, policy.environment_id, original)
        ):
            deny()
        for job in chain:
            task, previous_policy = tasks[job.task_id], policies.get(job.policy_id)
            if (
                previous_policy is None
                or previous_policy.enabled
                or previous_policy.user_id != session.user_id
                or (task.status, task.failure_code)
                not in {("queued", None), ("failed", "authorization_revoked")}
                or task.run_id is not None
                or task.lease_until is not None
                or task.result is not None
                or job.run_id is not None
                or job.reserved_at is not None
                or job.record is not None
                or (job.mail_id, job.case_id, job.source_sha256, job.instruction_sha256, job.target_language)
                != (mail.id, mail.case_id, sha, tip.instruction_sha256, "lt")
            ):
                deny()
            await authority.history(tx, previous_policy.id, session)
        historical.append(
            {
                "previous_task_id": tip.task_id,
                "previous_policy_id": policy.id,
                "previous_policy_fingerprint": policy.fingerprint,
                "previous_task_fingerprint": tasks[tip.task_id].fingerprint,
                "previous_source_revision": tasks[tip.task_id].source_revision,
                "source_sha256": sha,
                "previous_generation": tip.generation,
            }
        )
    # The new generic policy never exists without all its named slots occupied.
    from .task_policy import approve

    policy_result = await approve(
        tx, Approve.model_validate(value.model_dump(exclude={"version", "jobs"})).model_dump(mode="json")
    )
    policy = await tx.get(DisplayPolicy, str(value.policy_id))
    await tx.execute(
        text("SELECT set_config('pinet.mail_display_reauthorization',:p,true)"), {"p": policy.id}
    )
    successors = []
    for chain, proof in zip(chains, historical, strict=True):
        previous = chain[0]
        key = {
            **service.identity(
                policy.business_id, policy.environment_id, previous.mail_id, previous.source_sha256
            ),
            "previous_task_id": previous.task_id,
            "generation": previous.generation + 1,
        }
        task = await service.new_task(tx, policy, session, key)
        tx.add(
            DisplayJob(
                task_id=task.id,
                policy_id=policy.id,
                business_id=policy.business_id,
                organization_id=policy.organization_id,
                user_id=policy.user_id,
                environment_id=policy.environment_id,
                kind=KIND,
                mail_id=previous.mail_id,
                case_id=previous.case_id,
                source_sha256=previous.source_sha256,
                instruction_sha256=previous.instruction_sha256,
                target_language="lt",
                run_id=None,
                reserved_at=None,
                record=None,
                created_at=utcnow(),
                previous_task_id=previous.task_id,
                generation=previous.generation + 1,
            )
        )
        await append_event(tx, task)
        successors.append({**proof, "task_id": task.id, "generation": previous.generation + 1})
    await tx.flush()
    await tx.execute(text("SELECT set_config('pinet.mail_display_reauthorization','',true)"))
    return {
        **policy_result,
        "action": "reauthorize",
        "version": value.version,
        "successors": successors,
        "old_rows_modified": False,
        "model_dispatch_performed": False,
    }
