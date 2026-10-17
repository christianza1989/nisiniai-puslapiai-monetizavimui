"""Postcommit resumption on the maintained Tasks worker, never browser dispatch.

The outbox stores authority identity and native receipts, not completed permission.
Preflight commits before admission/Task locks. Only a new explicit owner request
can create an intent; old Tasks/results/notes are never scanned for work.
"""
from datetime import timedelta
from uuid import UUID, uuid5

from sqlalchemy import select, text

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError, identifier, scope
from ..creation.service import binding, digest
from ..models import utcnow
from ..tasks.codex import RunnerError
from ..tasks.models import Task
from ..tasks.service import TERMINAL
from . import episode, service
from .episode_wire import TestAgent
from .models import DirectChat, TeamEvent, TeamThread, TeamTurn
from .preparation import NAMESPACE as PREPARATION_NAMESPACE
from .wire import Send
from .workflow_models import TABLE, AgentWorkflow
from .workflow_wire import AgentReceipt, WorkflowView

NAMESPACE = UUID("4b41d984-f389-4620-9bed-e3ccab97510e")
CHILD_MESSAGE = ("Automatiškai išbandykite ką tik išsaugotą agento aprašą su vienu jo pavyzdžiu "
    "ir pateikite atsakymą bei nepriklausomos kokybės patikros rezultatą. "
    "Vienas bandymas nepatvirtina viso kalibravimo.")


async def schema_ready(tx, *, optional=False):
    if not await tx.scalar(text("SELECT to_regclass(:t) IS NOT NULL"), {"t": TABLE}):
        if optional:
            return False
        raise ControlError(503, "agent_workflow_unavailable")
    ready = await tx.scalar(text("""SELECT
      EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(:t) AND relrowsecurity AND relforcerowsecurity)
      AND EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(:t) AND tgname='workspace_agent_workflow_fence'
        AND tgenabled IN('O','A') AND NOT tgisinternal)
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conname='fk_workspace_workflow_origin'
        AND conrelid='control_workspace_team_events'::regclass AND convalidated)
      AND NOT has_table_privilege(current_user,:t,'DELETE')
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(
        'workspace_agent_workflow_origin(character varying,character varying,character varying,character varying,boolean)')
        AND NOT prosecdef AND has_function_privilege(current_user,oid,'EXECUTE'))"""), {"t": TABLE})
    if not ready:
        raise ControlError(503, "agent_workflow_unavailable")
    return True


def receipt_of(intent):
    if intent.agent_id is None:
        return None
    try:
        return AgentReceipt(agent_id=intent.agent_id, creation_id=intent.creation_id, purpose=intent.purpose,
            revision_id=intent.config_revision_id, revision=intent.config_revision, sha256=intent.config_sha256).model_dump(mode="json")
    except (ValueError, TypeError):
        raise ControlError(503, "source_unavailable") from None


def stage(intent, parent, child, now):
    if intent.cancelled_at is not None:
        return "cancelled", None
    if intent.failure_code:
        return "failed", intent.failure_code
    expired = now >= intent.deadline or intent.source_revision != settings().control_source_revision
    if child is not None:
        if child.status in TERMINAL:
            return ("completed" if child.status == "succeeded" else child.status), child.failure_code
        if expired:
            return "failed", "authorization_revoked"
        return ("testing" if child.status == "running" else "waiting_test"), child.failure_code
    if parent.status in {"failed", "cancelled"}:
        return parent.status, parent.failure_code
    if parent.status == "succeeded" and intent.state == "pending":
        return "clarification_required", None
    if expired:
        return "failed", "authorization_revoked"
    return ("waiting_test" if parent.status == "succeeded" else
        "preparing" if parent.status == "running" else "waiting_preparation"), None


async def project(tx, row, intent):
    parent = await tx.get(Task, intent.parent_task_id, populate_existing=True)
    turn = await tx.get(TeamTurn, intent.parent_task_id)
    child = await tx.get(Task, intent.child_task_id, populate_existing=True) if intent.child_task_id else None
    if not parent or not turn or intent.child_task_id and not child:
        raise ControlError(503, "source_unavailable")
    owner = await tx.get(TeamEvent, turn.owner_event_id)
    status, failure = stage(intent, parent, child, await tx.scalar(text("SELECT clock_timestamp()")))
    return WorkflowView(workflow_id=intent.id, topic_id=row.id, creation_id=intent.creation_id, purpose=intent.purpose,
        status=status, owner_event=service.event_view(owner, row), preparation=await service.turn_view(tx, parent, row),
        test=await service.turn_view(tx, child, row) if child else None, agent=receipt_of(intent),
        failure_code=failure, cancel_requested=intent.cancelled_at is not None, deadline=intent.deadline,
        scenario="saved_example", calibration_status="UNVERIFIED", module_admission="not_admitted",
        channel_activation="not_performed", old_notes_dispatch="never_automatic").model_dump(mode="json")


async def read(tx, session, portfolio_id, topic_id, workflow_id):
    row = await service.topic(tx, session, portfolio_id, topic_id)
    await schema_ready(tx)
    intent = await tx.get(AgentWorkflow, identifier(workflow_id), populate_existing=True)
    if not intent or intent.topic_id != row.id or binding(intent) != binding(row):
        raise ControlError(404, "not_found")
    return await project(tx, row, intent)


async def accept(tx, session, portfolio_id, topic_id, value):
    async with tx.begin_nested():
        row = await service.topic(tx, session, portfolio_id, topic_id)
        await schema_ready(tx)
        owner = Send(idempotency_key=value.idempotency_key, content=value.content,
            reply_to_event_id=value.reply_to_event_id)
        fingerprint = service.request_fingerprint(row, owner, preparation=value, workflow=True)
        old = await tx.scalar(select(AgentWorkflow).where(AgentWorkflow.idempotency_key == str(value.idempotency_key)))
        if old:
            if old.topic_id != row.id or old.request_fingerprint != fingerprint:
                raise ControlError(409, "idempotency_conflict")
            return await project(tx, row, old)
        if await tx.scalar(select(DirectChat.id).where(DirectChat.team_thread_id ==
                select(TeamThread.id).where(TeamThread.topic_id == row.id).scalar_subquery())):
            raise ControlError(403, "agent_workflow_unavailable")
        accepted = await service.send(tx, session, portfolio_id, topic_id, owner, preparation=value, workflow=True)
        parent_id = accepted["turn"]["task_id"]
        # A concurrent identical acceptance may have committed while admission
        # waited. Reconcile its intent; never adopt an ordinary old preparation.
        old = await tx.scalar(select(AgentWorkflow).where(AgentWorkflow.parent_task_id == parent_id)
            .execution_options(populate_existing=True))
        if old:
            if old.request_fingerprint != fingerprint:
                raise ControlError(409, "idempotency_conflict")
            return await project(tx, row, old)
        turn = await tx.get(TeamTurn, parent_id)
        now = utcnow()
        workflow_id = str(uuid5(NAMESPACE, digest([binding(row), row.id, str(value.idempotency_key)])))
        intent = AgentWorkflow(id=workflow_id, topic_id=row.id, team_thread_id=turn.team_thread_id,
            business_id=row.business_id, grant_id=row.grant_id, creation_id=str(value.creation_id), purpose=value.purpose,
            session_id=session.id, source_revision=settings().control_source_revision,
            idempotency_key=str(value.idempotency_key), request_fingerprint=fingerprint, parent_task_id=parent_id,
            planned_child_task_id=str(uuid5(NAMESPACE, workflow_id+":task")),
            child_key=str(uuid5(NAMESPACE, workflow_id+":request")), origin_event_id=str(uuid5(NAMESPACE, workflow_id+":origin")),
            provisioning_request_id=str(uuid5(PREPARATION_NAMESPACE, parent_id)),
            created_at=now, deadline=min(turn.deadline, now+timedelta(hours=24), session.expires_at),
            state="pending", **binding(row))
        tx.add(intent)
        await tx.flush()
        return await project(tx, row, intent)


async def saved(tx, task, receipt, event_id):
    """Called INSIDE S4's existing effect savepoint, while parent is running."""
    if not await schema_ready(tx, optional=True):
        return
    intent = await tx.scalar(select(AgentWorkflow).where(AgentWorkflow.parent_task_id == task.id)
        .with_for_update().execution_options(populate_existing=True))
    if intent is None:
        return  # Historical draft-only preparations never become workflows.
    if (intent.state != "pending" or intent.cancelled_at is not None or intent.failure_code is not None
            or intent.source_revision != task.source_revision or intent.session_id != task.session_id):
        raise ControlError(403, "authorization_revoked")
    if receipt is None:
        return  # Explicit clarification is terminal; no native test is authorized.
    frozen = AgentReceipt.model_validate({key: receipt[key] for key in AgentReceipt.model_fields})
    if str(frozen.creation_id) != intent.creation_id or frozen.purpose != intent.purpose:
        raise ControlError(503, "source_unavailable")
    intent.agent_id, intent.config_revision_id = str(frozen.agent_id), str(frozen.revision_id)
    intent.config_revision, intent.config_sha256 = frozen.revision, frozen.sha256
    intent.saved_event_id, intent.state = event_id, "prepared"
    await tx.flush()


def scenario_request(intent):
    return TestAgent(idempotency_key=intent.child_key, creation_id=intent.creation_id,
        agent_id=intent.agent_id, expected_revision=intent.config_revision, content=CHILD_MESSAGE,
        reply_to_event_id=intent.saved_event_id)  # messages=None means exact saved example.


async def assert_continuation(tx, intent, session, row, capture):
    now = await tx.scalar(text("SELECT clock_timestamp()"))
    parent = await tx.get(Task, intent.parent_task_id, populate_existing=True)
    snapshot = capture.snapshot
    receipt = parent.result.get("agent_preparation") if parent and isinstance(parent.result, dict) else None
    expected = receipt_of(intent)
    if (intent.state != "prepared" or intent.child_task_id is not None
            or intent.cancelled_at is not None or intent.failure_code is not None or intent.deadline <= now
            or intent.source_revision != settings().control_source_revision or session.id != intent.session_id
            or binding(intent) != binding(row) or intent.topic_id != row.id
            or not parent or parent.status != "succeeded" or parent.session_id != intent.session_id
            or parent.source_revision != intent.source_revision or not isinstance(receipt, dict)
            or any(receipt.get(key) != val for key, val in expected.items())
            or str(snapshot.agent_id) != intent.agent_id or str(snapshot.creation_id) != intent.creation_id
            or str(snapshot.config_revision_id) != intent.config_revision_id
            or snapshot.config_revision != intent.config_revision or snapshot.config_sha256 != intent.config_sha256
            or capture.scenario != "saved_example" or str(capture.scope.session_id) != intent.session_id
            or capture.messages != (episode.TextTurn(request_id=UUID(int=1), base_need_revision=0,
                message=snapshot.specification.examples[0].input).message,)):
        raise ControlError(409, "agent_business_not_current")
    episode.capture_matches(capture, session, row, scenario_request(intent))


async def verify_child(tx, task, turn, origin):
    await schema_ready(tx)
    intent = await tx.get(AgentWorkflow, origin.native_workflow_intent_id, populate_existing=True)
    if (not intent or intent.state != "dispatched" or intent.cancelled_at is not None or intent.failure_code
            or task.id != intent.child_task_id or task.id != intent.planned_child_task_id
            or turn.owner_event_id != intent.origin_event_id or origin.id != intent.origin_event_id
            or origin.author_type != "coordinator" or origin.kind != "assignment"
            or origin.attempt_id is not None or origin.native_episode_task_id is not None
            or origin.reply_to_event_id != intent.saved_event_id or task.message != CHILD_MESSAGE
            or task.session_id != intent.session_id or task.source_revision != intent.source_revision
            or turn.topic_id != intent.topic_id or turn.team_thread_id != intent.team_thread_id
            or binding(turn) != binding(intent) or turn.deadline > intent.deadline
            or intent.deadline <= await tx.scalar(text("SELECT clock_timestamp()"))):
        raise ControlError(403, "authorization_revoked")
    header = await episode.optional_allocation(tx, task.id)
    if header is None:
        raise ControlError(503, "source_unavailable")
    plan = episode.budget.plan_from(header)
    if (str(plan.snapshot.agent_id) != intent.agent_id or str(plan.snapshot.config_revision_id) != intent.config_revision_id
            or plan.snapshot.config_revision != intent.config_revision or str(plan.snapshot.creation_id) != intent.creation_id
            or plan.snapshot.config_sha256 != intent.config_sha256 or plan.protected_case_sha256 is not None
            or plan.scenario != "saved_example" or plan.scope.owner_binding() != binding(intent)
            or str(plan.scope.session_id) != intent.session_id or str(plan.scope.business_id) != intent.business_id
            or str(plan.scope.grant_id) != intent.grant_id or plan.scope.source_revision != intent.source_revision):
        raise ControlError(503, "source_unavailable")


async def admit(tx, workflow_id, capture):
    """One atomic CAS after metadata-only preflight has completely exited."""
    await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "chat-admission:"+settings().environment+":"+str(capture.scope.user_id)})
    intent = await tx.scalar(select(AgentWorkflow).where(AgentWorkflow.id == workflow_id)
        .with_for_update().execution_options(populate_existing=True))
    if not intent or intent.state != "prepared" or intent.child_task_id or intent.cancelled_at or intent.failure_code:
        return False
    session = await tx.get(Session, intent.session_id, populate_existing=True)
    if session is None:
        raise ControlError(401, "unauthenticated")
    row = await service.topic(tx, session, intent.portfolio_id, intent.topic_id)
    await assert_continuation(tx, intent, session, row, capture)
    request = scenario_request(intent)
    owner = Send(idempotency_key=request.idempotency_key, content=request.content, reply_to_event_id=request.reply_to_event_id)
    child = await service.send(tx, session, row.portfolio_id, row.id, owner,
        episode_intent=(request, capture), continuation=intent)
    if child["turn"]["task_id"] != intent.planned_child_task_id:
        raise ControlError(503, "source_unavailable")
    intent.child_task_id, intent.state = intent.planned_child_task_id, "dispatched"
    await tx.flush()
    # Validate queued origin now, not when the child later becomes terminal.
    await tx.execute(text("SET CONSTRAINTS workspace_team_fence IMMEDIATE"))
    await tx.execute(text("SET CONSTRAINTS workspace_team_fence DEFERRED"))
    return True


async def refuse(user_id, workflow_id, code):
    async with scope(user=user_id) as tx:
        intent = await tx.scalar(select(AgentWorkflow).where(AgentWorkflow.id == workflow_id)
            .with_for_update().execution_options(populate_existing=True))
        if intent and intent.state == "prepared" and not intent.child_task_id and not intent.cancelled_at and not intent.failure_code:
            intent.failure_code = code
            await tx.flush()


async def reconcile(user_id):
    """Fixed worker maintenance; source-old tasks and historical notes are inert."""
    workflow_id = None
    try:
        async with scope(user=user_id) as tx:
            if not await schema_ready(tx, optional=True):
                return False
            intent = await tx.scalar(select(AgentWorkflow).where(AgentWorkflow.state == "prepared",
                AgentWorkflow.child_task_id.is_(None), AgentWorkflow.cancelled_at.is_(None),
                AgentWorkflow.failure_code.is_(None)).order_by(AgentWorkflow.created_at, AgentWorkflow.id).limit(1))
            if intent is None:
                return False
            workflow_id = intent.id
            session = await tx.get(Session, intent.session_id, populate_existing=True)
            if not session or intent.source_revision != settings().control_source_revision:
                raise ControlError(403, "authorization_revoked")
            row = await service.topic(tx, session, intent.portfolio_id, intent.topic_id)
            capture = await episode.preflight(session, row, scenario_request(intent))
            await assert_continuation(tx, intent, session, row, capture)
        # Neither preflight nor its caller's read transaction holds any locks now.
        async with scope(user=user_id) as tx:
            return await admit(tx, workflow_id, capture)
    except (ControlError, RunnerError) as error:
        if workflow_id:
            await refuse(user_id, workflow_id, error.code)
        return False


async def cancel(tx, session, portfolio_id, topic_id, workflow_id):
    current = await read(tx, session, portfolio_id, topic_id, workflow_id)
    if current["status"] in {"completed", "clarification_required", "failed", "cancelled"}:
        return current
    intent = await tx.get(AgentWorkflow, identifier(workflow_id))
    # S4 completion takes native parents -> parent Task -> intent. Cancellation
    # takes parent Task -> intent too; it never acquires native parents afterwards.
    parent = await tx.scalar(select(Task).where(Task.id == intent.parent_task_id)
        .with_for_update().execution_options(populate_existing=True))
    intent = await tx.scalar(select(AgentWorkflow).where(AgentWorkflow.id == intent.id)
        .with_for_update().execution_options(populate_existing=True))
    child = await tx.scalar(select(Task).where(Task.id == intent.child_task_id)
        .with_for_update().execution_options(populate_existing=True)) if intent.child_task_id else None
    # A native result may have committed while cancellation waited for its
    # Task lock. Observe that result before recording a cancellation marker.
    status, _ = stage(intent, parent, child, await tx.scalar(text("SELECT clock_timestamp()")))
    if status in {"completed", "clarification_required", "failed", "cancelled"}:
        return await read(tx, session, portfolio_id, topic_id, workflow_id)
    if intent.cancelled_at is None and intent.failure_code is None:
        intent.cancelled_at = await tx.scalar(text("SELECT clock_timestamp()"))
        await tx.flush()
        await service.cancel(tx, session, portfolio_id, topic_id, intent.parent_task_id)
        if intent.child_task_id:
            await service.cancel(tx, session, portfolio_id, topic_id, intent.child_task_id)
    return await read(tx, session, portfolio_id, topic_id, workflow_id)
