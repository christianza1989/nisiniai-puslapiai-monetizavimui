"""One explicit owner test on the existing Task/lab/Quality lifecycle.

Snapshot preflight commits separately BEFORE admission/Task locks. It is metadata
only; the worker must reauthorize the exact frozen native scope for each call.
"""
import asyncio
import json
from dataclasses import dataclass
from uuid import UUID, uuid5

from sqlalchemy import select, text

from ..config import settings
from ..control.routes import ControlError, scope
from ..creation.service import binding, digest
from ..customer_agents import evidence, lab, provisioning, quality, review
from ..customer_agents.session import SessionPrincipal
from ..customer_text.wire import Turn as TextTurn
from ..models import Artifact, Conversation, Event, Job
from ..tasks.codex import RunnerError
from ..tasks.models import Task
from . import calibration_budget as budget
from .calibration_plan import EpisodePlan
from .episode_types import EpisodeView
from .episode_wire import TestAgent

NAMESPACE = UUID("f4f19b23-8e34-42f3-8be9-a4f10f731fe8")
RESULT_VERSION = "workspace-agent-episode-result.v1"
ADAPTER = "workspace-native-agent-episode.v1"


@dataclass(frozen=True)
class Capture:
    scope: provisioning.ProvisioningScope
    snapshot: lab.Snapshot
    messages: tuple[str, ...]
    scenario: str


async def schema_ready(tx):
    await budget.schema_ready(tx)
    ready = await tx.scalar(text("""SELECT EXISTS(SELECT 1 FROM pg_attribute
      WHERE attrelid='control_workspace_team_events'::regclass AND attname='native_episode_task_id' AND NOT attisdropped)
      AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('workspace_team_native_episode(character varying,character varying)')
        AND NOT prosecdef AND has_function_privilege(current_user,oid,'EXECUTE'))"""))
    if not ready:
        raise ControlError(503, "agent_episode_unavailable")


def guard(user_id):
    cfg = settings()
    if (not cfg.workspace_team_enabled or not cfg.workspace_team_runner_enabled
            or user_id not in cfg.workspace_team_actor_ids):
        raise ControlError(403, "team_execution_disabled")
    if not cfg.customer_agents_enabled or not cfg.customer_text_enabled or not cfg.customer_text_runner_enabled:
        raise ControlError(503, "agent_episode_unavailable")


async def preflight(session, topic, request: TestAgent):
    """No caller admission/native locks may be held while entering this scope."""
    from ..customer_text import execution
    guard(session.user_id)
    pin = execution.capture_high()
    target = provisioning.ProvisioningTarget.model_validate_json(json.dumps(binding(topic) | {
        "session_id": session.id, "creation_id": str(request.creation_id), "business_id": topic.business_id,
        "grant_id": topic.grant_id, "source_revision": settings().control_source_revision}))
    async with scope(user=session.user_id) as tx:
        await schema_ready(tx)
        current = await provisioning.authorizing_session(tx, target)
        native = await provisioning.capture(tx, current, str(request.creation_id),
            business_id=topic.business_id, grant_id=topic.grant_id, source_revision=target.source_revision)
        frozen = await lab.snapshot_in_transaction(tx, current, str(request.creation_id), str(request.agent_id),
            request.expected_revision, execution_profile=pin)
        snapshot = lab.Snapshot.model_validate(frozen)
        messages = request.messages
        if messages is None:
            messages = [snapshot.specification.examples[0].input]
        messages = tuple(TextTurn(request_id=UUID(int=1), base_need_revision=0, message=value).message
            for value in messages)
        result = Capture(native, snapshot, messages, "saved_example" if request.messages is None else "owner_scenario")
    # This scope has exited: policy/index/KnowledgeState/native locks are gone.
    return result


def plan_for(capture, topic_id, request):
    from ..customer_text import execution
    snapshot = capture.snapshot
    execution.current(snapshot.execution_profile)
    key = digest([capture.scope.owner_binding(), str(topic_id), str(request.idempotency_key)])
    episode_id, quality_id = uuid5(NAMESPACE, key+":episode"), uuid5(NAMESPACE, key+":quality")
    frozen = lab.Episode(**snapshot.model_dump(), episode_id=episode_id, script_sha256=digest(list(capture.messages)))
    quality = review.SessionScoredRequest(conversation_id=UUID(int=1), request_id=quality_id,
        episode=frozen, score_competence=True)
    return EpisodePlan.model_validate_json(json.dumps({"scope": capture.scope.model_dump(mode="json"),
        "snapshot": snapshot.model_dump(mode="json"), "episode_id": str(episode_id),
        "quality_request_id": str(quality_id), "messages": capture.messages,
        "quality_request_sha256": review.request_intent_sha256(quality), "protected_case_sha256": None,
        "scenario": capture.scenario}))


def capture_matches(capture, session, topic, request):
    native = capture.scope
    if (native.owner_binding() != binding(topic) or str(native.session_id) != session.id
            or str(native.creation_id) != str(request.creation_id) or str(native.business_id) != topic.business_id
            or str(native.grant_id) != topic.grant_id or capture.snapshot.agent_id != request.agent_id
            or capture.snapshot.config_revision != request.expected_revision
            or native.source_revision != settings().control_source_revision):
        raise ControlError(409, "agent_business_not_current")


async def optional_allocation(tx, task_id):
    if not await tx.scalar(text("SELECT to_regclass(:t) IS NOT NULL"), {"t": budget.ALLOCATION}):
        return None
    return await budget.allocation(tx, task_id)


async def projection(tx, task):
    header = await optional_allocation(tx, task.id)
    if not header:
        return None
    plan = budget.plan_from(header)
    observed = None
    if header["run_id"]:
        observed = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
            {"t": task.id, "r": header["run_id"], "u": task.user_id, "e": task.environment_id})
    observed = observed or {"reserved_calls": 0, "settled_calls": 0, "usage_complete": False}
    result = task.result if isinstance(task.result, dict) and task.result.get("version") == RESULT_VERSION else {}
    pin = plan.snapshot.execution_profile
    return EpisodeView(creation_id=plan.snapshot.creation_id, agent_id=plan.snapshot.agent_id,
        config_revision=plan.snapshot.config_revision, config_sha256=plan.snapshot.config_sha256,
        max_calls=plan.call_limit, reserved_calls=observed["reserved_calls"], settled_calls=observed["settled_calls"],
        usage_complete=observed["usage_complete"], scenario=header["plan"].get("scenario", "owner_scenario"),
        model=plan.model, reasoning_effort=plan.effort if pin else None,
        execution_profile_sha256=pin.fingerprint() if pin else None,
        conversation_id=result.get("conversation_id"), quality_job_id=result.get("quality_job_id")).model_dump(mode="json")


async def execute(context, heartbeat):
    """Ephemeral heartbeat around the maintained native adapters, no second worker."""
    from ..customer_text import execution
    raw = context.get("_agent_episode_plan")
    try:
        plan = EpisodePlan.model_validate_json(json.dumps(raw))
    except (ValueError, TypeError):
        raise RunnerError("task_context_unavailable") from None
    pin = execution.current(plan.snapshot.execution_profile)
    fence = budget.task_fence(context["_task_id"], context["_run_id"], plan, context["_team_context_sha256"])
    principal = SessionPrincipal(plan.scope, fence, execution_profile=pin)

    async def run_native():
        episode = await lab.episode_session(principal, plan.snapshot.model_dump(mode="json"), list(plan.messages), plan.episode_id)
        if not episode["script_complete"]:
            raise RunnerError("agent_episode_incomplete")
        value = review.SessionScoredRequest(conversation_id=episode["conversation"]["conversation_id"],
            request_id=plan.quality_request_id, episode=episode["snapshot"], score_competence=True)
        if review.request_intent_sha256(value) != plan.quality_request_sha256:
            raise RunnerError("agent_episode_input_changed")
        quality = await review.run_session(principal, value)
        if quality["status"] != "succeeded":
            raise RunnerError("agent_episode_review_failed")
        return {"version": RESULT_VERSION, "context_sha256": context["_team_context_sha256"],
            "plan_sha256": digest(plan.model_dump(mode="json")),
            "conversation_id": str(value.conversation_id), "quality_job_id": quality["job_id"]}

    async def pulse():
        while True:
            if not await heartbeat():
                return
            await asyncio.sleep(2)

    operation, monitor = asyncio.create_task(run_native()), asyncio.create_task(pulse())
    try:
        done, _ = await asyncio.wait({operation, monitor}, return_when=asyncio.FIRST_COMPLETED)
        if monitor in done:
            operation.cancel()
            await asyncio.gather(operation, return_exceptions=True)
            raise RunnerError("authorization_revoked")
        return await operation, None  # Native ledgers, not a second aggregate charge.
    finally:
        for pending in (operation, monitor):
            if not pending.done():
                pending.cancel()
        await asyncio.gather(operation, monitor, return_exceptions=True)


async def completion_locks(tx, claimed):
    """Only native parents before Task. Profile/policy/index follow Task below."""
    task = await tx.get(Task, claimed["task_id"], populate_existing=True)
    if not task or task.status != "running" or task.run_id != claimed["run_id"]:
        return
    header = await optional_allocation(tx, task.id)
    if not header:
        return
    plan = budget.plan_from(header)
    if (header["run_id"] != task.run_id or header["context_sha256"] != claimed["context"].get("_team_context_sha256")
            or not budget.matches_task({key: getattr(task, key) for key in (
                "user_id", "organization_id", "business_id", "environment_id", "session_id", "source_revision")}, plan)):
        raise ControlError(409, "calibration_task_not_current")
    await provisioning.verify(tx, plan.scope, lock=True)


async def complete(tx, task, topic, turn, result):
    from ..customer_text import execution
    from . import service
    if (not isinstance(result, dict) or set(result) != {"version", "context_sha256", "plan_sha256",
            "conversation_id", "quality_job_id"} or result["version"] != RESULT_VERSION
            or result["context_sha256"] != turn.context_sha256):
        raise RunnerError("output_invalid")
    header = await budget.allocation(tx, task.id)
    if not header or result["plan_sha256"] != header["plan_sha256"]:
        raise RunnerError("output_invalid")
    plan = budget.plan_from(header)
    pin = execution.current(plan.snapshot.execution_profile)
    current = await provisioning.authorizing_session(tx, plan.scope)
    # Parent locks were taken before Task; reentrant native locks precede the
    # canonical Profile's policy/index locks. Never call heartbeat here.
    frozen = await lab.snapshot_in_transaction(tx, current, str(plan.scope.creation_id),
        str(plan.snapshot.agent_id), plan.snapshot.config_revision, execution_profile=pin)
    if frozen != plan.snapshot.model_dump(mode="json"):
        raise ControlError(409, "conversation_task_not_current")
    fence = budget.task_fence(task.id, task.run_id, plan, turn.context_sha256)
    await fence.check(tx)
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": task.business_id})
    row = await tx.scalar(select(Conversation).where(Conversation.id == str(UUID(str(result["conversation_id"]))),
        Conversation.business_id == task.business_id, Conversation.environment_id == task.environment_id)
        .with_for_update().execution_options(populate_existing=True))
    expected = lab.Episode(**plan.snapshot.model_dump(), episode_id=plan.episode_id,
        script_sha256=plan.script_sha256).model_dump(mode="json")
    native_binding = row.payload.get("customer_text_binding", {}) if row else {}
    if (not row or native_binding.get("task_calibration") != expected
            or native_binding.get("user_id") != task.user_id or native_binding.get("session_id") != task.session_id
            or row.payload.get("customer_text_start_key") != str(plan.episode_id)):
        raise RunnerError("output_invalid")
    job = await tx.scalar(select(Job).where(Job.id == str(UUID(str(result["quality_job_id"]))),
        Job.conversation_id == row.id, Job.business_id == task.business_id,
        Job.environment_id == task.environment_id, Job.kind == "quality"))
    if (not job or job.state != "succeeded" or job.payload.get("dispatch") != review.VERSION
            or job.payload.get("request_id") != str(plan.quality_request_id)
            or job.payload.get("request_input_sha256") != plan.quality_request_sha256
            or job.payload.get("input_sha256") != digest(await review.input_data(tx, row))):
        raise RunnerError("agent_episode_review_changed")
    events = list(await tx.scalars(select(Event).where(Event.conversation_id == row.id,
        Event.business_id == task.business_id, Event.environment_id == task.environment_id)
        .order_by(Event.sequence).limit(evidence.EVENT_LIMIT+1)))
    artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == row.id,
        Artifact.business_id == task.business_id, Artifact.environment_id == task.environment_id, Artifact.kind == "quality")))
    judgment = evidence.judgment(row, quality.Binding.model_validate(native_binding), events, [job], artifacts,
        len(events) > evidence.EVENT_LIMIT)
    replies = [event.payload for event in events if event.kind == "customer_text_result" and event.payload.get("status") == "succeeded"]
    if (judgment["state"] != "succeeded" or not judgment["applies_to_latest_transcript"]
            or len(replies) != len(plan.messages)):
        raise RunnerError("agent_episode_review_changed")
    reply = replies[-1].get("reply")
    if not isinstance(reply, str) or not reply.strip() or len(reply) > 4000:
        raise RunnerError("output_invalid")
    content = f'Agento „{plan.snapshot.specification.name}“ scenarijaus bandymas baigtas.\n\nAtsakymas:\n{reply}\n\n'
    content += f'Nepriklausoma peržiūra baigta. Rastos pastabos: {judgment["issues_count"]}.\n'
    content += "Tai vieno scenarijaus bandymas. Visapusiškas kalibravimas ir agento įjungimas dar nepatvirtinti."
    thread = await service.team_thread(tx, topic, lock=True)
    event = await service.add_event(tx, topic, thread, task.id, "coordinator", "answer", content,
        reply=turn.owner_event_id, native_episode_task_id=task.id)
    service.event_view(event, topic)
    await fence.check(tx)
    await tx.flush()
    await tx.execute(text("SET CONSTRAINTS workspace_team_fence IMMEDIATE"))
    await tx.execute(text("SET CONSTRAINTS workspace_team_fence DEFERRED"))
    return {**result, "public_events_saved": 1, "event_id": event.id, "agent_id": str(plan.snapshot.agent_id),
        "config_revision": plan.snapshot.config_revision, "config_sha256": plan.snapshot.config_sha256,
        "quality_artifact_id": artifacts[0].id, "quality_artifact_sha256": digest(artifacts[0].payload),
        "judgment": judgment, "calibration_status": "UNVERIFIED", "module_admission": "not_admitted",
        "activation": "not_performed"}
