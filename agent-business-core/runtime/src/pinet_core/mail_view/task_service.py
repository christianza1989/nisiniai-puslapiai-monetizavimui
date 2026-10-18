"""Committed-mail materialization and read projection; GET never queues work."""
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError, scope
from ..creation.service import digest
from ..models import MailMessage, new_id, utcnow
from ..tasks.models import Task, TaskRun, Thread
from ..tasks.service import append_event, task_view
from . import task_authority as authority
from .task_contract import KIND, Enqueue
from .task_models import DisplayJob, DisplayPolicy
from .translations import POLICY_SHA, record_path, source_digest
from .wire import Translation


async def schema_ready(tx):
    rows = (await tx.execute(text("""SELECT relname,relrowsecurity,relforcerowsecurity,
        has_table_privilege(current_user,oid,'SELECT'),has_table_privilege(current_user,oid,'INSERT'),
        has_table_privilege(current_user,oid,'UPDATE'),has_table_privilege(current_user,oid,'DELETE')
        FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(:names)"""),
        {"names": ["control_mail_display_policies", "control_mail_display_jobs"]})).all()
    expected = {"control_mail_display_policies": (True, True, True, False, False, False),
        "control_mail_display_jobs": (True, True, True, True, False, False)}
    if len(rows) != 2 or not all(tuple(row[1:]) == expected[row[0]] for row in rows):
        return False
    return bool(await tx.scalar(text("SELECT coalesce(has_function_privilege(current_user,to_regprocedure("
        "'public.mail_display_projection(character varying,character varying,character varying,character varying,character varying,character varying)'),"
        "'EXECUTE'),false)")))


async def shared_projection(tx, business_id, mail_id, sha):
    return await tx.scalar(text("SELECT mail_display_projection(:b,:m,"
        "CAST(current_setting('pinet.control_user',true) AS VARCHAR),:e,:s,:i)"),
        {"b": business_id, "m": mail_id, "e": settings().environment, "s": sha, "i": POLICY_SHA})


def source_conflict(error):
    pending, seen = [error], set()
    while pending:
        item = pending.pop()
        if id(item) in seen:
            continue
        seen.add(id(item))
        if getattr(item, "constraint_name", None) == "uq_mail_display_source" and getattr(item, "sqlstate", None) == "23505":
            return True
        pending.extend(value for value in (getattr(item, "orig", None), item.__cause__, item.__context__) if value is not None)
    return False


def legacy_claim(business_id, environment, original):
    root = settings().mail_display_directory
    if not root:
        return False
    current = source_digest(business_id, environment, original)
    normalized = "test" if environment.startswith("test-") else environment
    # Prior normalized-test attempts retain their original uncertainty as well.
    for env in dict.fromkeys((environment, normalized)):
        hashed = current if env == environment else source_digest(business_id, env, original)
        final = record_path(root, business_id, env, original["mail_id"], hashed)
        for target in (final, final.with_suffix(".attempt.json")):
            if target.is_symlink() or target.exists():
                return True
    return False


def identity(business_id, environment, mail_id, sha):
    return {"business_id": business_id, "environment_id": environment, "mail_id": mail_id,
        "source_sha256": sha, "instruction_sha256": POLICY_SHA, "target_language": "lt"}


def predicate(value):
    return tuple(getattr(DisplayJob, key) == expected for key, expected in value.items())


async def new_task(tx, policy, session, key, *, legacy=False):
    now = utcnow()
    thread = Thread(id=new_id(), business_id=policy.business_id, organization_id=policy.organization_id,
        user_id=policy.user_id, environment_id=policy.environment_id, created_at=now, last_sequence=1)
    tx.add(thread)
    await tx.flush()
    prefix = "pinet:mail-display-legacy:" if legacy else "pinet:mail-display:"
    task = Task(id=new_id(), thread_id=thread.id, session_id=session.id,
        business_id=policy.business_id, organization_id=policy.organization_id,
        user_id=policy.user_id, environment_id=policy.environment_id, sequence=1, kind=KIND,
        status="cancelled" if legacy else "queued", idempotency_key=str(uuid5(NAMESPACE_URL,prefix+digest(key))),
        fingerprint=digest({"legacy": key}) if legacy else digest({"source": key,"policy_fingerprint":policy.fingerprint}),
        message="Ankstesnis laiško vertimo bandymas" if legacy else "Laiško vertimas į lietuvių kalbą",
        source_revision=settings().control_source_revision if legacy else policy.source_revision,
        created_at=now, updated_at=now, event_sequence=0,
        result={"state":"legacy_retained",**{name:key[name] for name in (
            "mail_id","source_sha256","instruction_sha256","target_language")}} if legacy else None,
        failure_code="mail_display_legacy_retained" if legacy else None)
    tx.add(task)
    await tx.flush()
    return task


async def enqueue(tx, session, request):
    value = Enqueue.model_validate(request)
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "chat-admission:"+settings().environment+":"+session.user_id})
    policy = await authority.history(tx, value.policy_id, session)
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": policy.business_id})
    mail, original, sha = await authority.original(tx, policy, value.mail_id)
    key = identity(policy.business_id, policy.environment_id, mail.id, sha)
    old = await tx.scalar(select(DisplayJob).where(*predicate(key)))
    if old is not None:
        task = await tx.get(Task, old.task_id)
        if task is None:
            raise ControlError(503, "mail_display_task_unavailable")
        return {"state": "existing", "task_id": task.id, "status": task.status}
    shared = await shared_projection(tx, policy.business_id, mail.id, sha)
    if shared is not None:
        return {"state": "legacy_retained" if shared["state"] == "legacy_retained" else "existing_shared",
            "task_id": None, "status": "retained"}
    if legacy_claim(policy.business_id, policy.environment_id, original):
        marker = await new_task(tx, policy, session, key, legacy=True)
        await append_event(tx, marker)
        return {"state": "legacy_retained", "task_id": None, "status": "not_queued"}
    async with authority.current(tx, policy.id, session.id) as (policy, _):
        # Recheck after all source/actor waits; no user supplied body or scope.
        mail, original, fresh = await authority.original(tx, policy, value.mail_id)
        if fresh != sha:
            raise ControlError(409, "mail_display_original_changed")
        occupied = await tx.scalar(select(func.count()).select_from(DisplayJob).join(Task,
            Task.id == DisplayJob.task_id).where(DisplayJob.policy_id == policy.id,
                or_(DisplayJob.reserved_at.is_not(None), Task.status.in_(("queued", "running")))))
        if occupied >= policy.maximum_calls:
            raise ControlError(409, "mail_display_budget_exhausted")
        try:
            async with tx.begin_nested():
                task = await new_task(tx, policy, session, key)
                tx.add(DisplayJob(task_id=task.id, policy_id=policy.id, business_id=policy.business_id,
                    organization_id=policy.organization_id, user_id=policy.user_id, environment_id=policy.environment_id,
                    kind=KIND, mail_id=mail.id, case_id=mail.case_id, source_sha256=sha,
                    instruction_sha256=POLICY_SHA, target_language="lt", run_id=None, reserved_at=None,
                    record=None, created_at=utcnow()))
                await append_event(tx, task)
        except IntegrityError as error:
            if not source_conflict(error):
                raise
            return {"state": "existing_shared", "task_id": None, "status": "retained"}
        return {"state": "queued", "task_id": task.id, "status": task.status}


async def reconcile(user_id):
    """The common worker calls this after mail commit, before its claim lock."""
    authority.guard(execution=True)
    if user_id not in settings().mail_display_actor_ids:
        return
    async with scope(user=user_id) as tx:
        if not await schema_ready(tx):
            return
        now = await tx.scalar(text("SELECT clock_timestamp()"))
        policies = list(await tx.scalars(select(DisplayPolicy).where(DisplayPolicy.user_id == user_id,
            DisplayPolicy.environment_id == settings().environment, DisplayPolicy.enabled,
            DisplayPolicy.source_revision == settings().control_source_revision,
            DisplayPolicy.instruction_sha256 == POLICY_SHA, DisplayPolicy.expires_at > now)
            .order_by(DisplayPolicy.approved_at.desc(), DisplayPolicy.id).limit(32)))
        seen = set()
        for policy in policies:
            if policy.business_id in seen:
                continue
            seen.add(policy.business_id)
            session = await tx.get(Session, policy.session_id)
            if session is None:
                continue
            await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": policy.business_id})
            # Sealed messages are immutable; changed legacy content requires an
            # explicit source-bound enqueue, never an automatic paid retry.
            candidates = list(await tx.scalars(select(MailMessage.id).where(
                MailMessage.business_id == policy.business_id, MailMessage.environment_id == policy.environment_id,
                MailMessage.created_at >= policy.mail_created_after,
                func.mail_display_projection(policy.business_id, MailMessage.id, user_id,
                    policy.environment_id, None, POLICY_SHA).is_(None))
                .order_by(MailMessage.created_at, MailMessage.id).limit(30)))
            for mail_id in candidates:
                try:
                    async with tx.begin_nested():
                        await enqueue(tx, session, {"policy_id": policy.id, "mail_id": mail_id})
                except (ControlError, ValueError):
                    # Current fences/cap do not authorize a model or a retry.
                    break


async def projection(tx, business_id, original):
    """A read-only derived cache; no policy renewal, enqueue or model dispatch."""
    if not settings().mail_display_tasks_enabled:
        return None
    sha = source_digest(business_id, settings().environment, original)
    unavailable = Translation(status="unavailable", source_sha256=sha)
    if not await schema_ready(tx):
        return unavailable
    value = await shared_projection(tx, business_id, original["mail_id"], sha)
    if value is None or value["state"] == "legacy_retained":
        return None  # Only an unclaimed source may use its historical sidecar.
    if value["state"] != "ready" or value.get("record") is None:
        return Translation(status="missing" if value["state"] == "pending" else "unavailable", source_sha256=sha)
    try:
        record = authority.checked_record(value["record"], original, business_id=business_id,
            environment_id=settings().environment, expected_sha256=sha)
    except (ValueError, TypeError, KeyError):
        return unavailable
    return Translation(status="ready", source_sha256=sha, subject=record.text.subject,
        body=record.text.body, translated_at=record.translated_at, model=record.model)


async def read(tx, session, task_id):
    task = await tx.scalar(select(Task).where(Task.id == str(task_id), Task.kind == KIND))
    job = await tx.get(DisplayJob, task.id) if task else None
    if task is None or job is None:
        raise ControlError(404, "not_found")
    await authority.history(tx, job.policy_id, session)
    run = await tx.get(TaskRun, task.run_id) if task.run_id else None
    return {"task": task_view(task), "mail_id": job.mail_id,
        "execution": None if run is None else {"run_id": run.id, "status": run.status,
            "usage": run.usage, "model": run.model, "effort": run.effort, "cost_microusd": run.cost_microusd}}
