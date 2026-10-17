"""Same-Conversation saved-agent preview on canonical native text and Quality."""
import asyncio
import json
from datetime import timedelta
from uuid import uuid5

from sqlalchemy import select, text

from ..config import settings
from ..control.routes import ControlError, scope
from ..creation.models import Creation
from ..creation.service import binding, digest
from ..creation_registration.models import Registration
from ..customer_agents import lab, preview, provisioning, review
from ..customer_agents.models import Agent, Config
from ..customer_agents.session import TaskFence
from ..customer_profile import service as profiles
from ..customer_profile.models import Admission
from ..customer_text import execution
from ..customer_text import service as native_text
from ..customer_text.wire import Start, Turn
from ..models import Conversation, utcnow
from ..tasks.codex import RunnerError
from . import calibration_budget, direct
from . import direct_preview_budget as budget
from .direct_preview_plan import ADAPTER, PreviewTurnPlan
from .models import DirectChat, DirectPreview, TeamEvent


def guard(user_id):
    from .episode import guard as native_guard
    native_guard(user_id)
    lab.guard()
    execution.current(execution.capture_high())


def same_snapshot(observed, frozen):
    # Only this new explicit protocol permits a current re-login while retaining
    # the original native binding identity. It never grants the old Session life.
    return {key: value for key, value in observed.items() if key != "session_id"} == {
        key: value for key, value in frozen.items() if key != "session_id"}


async def blockers(tx, session, row, chat):
    try:
        await budget.schema_ready(tx)
        guard(session.user_id)
    except (ControlError, RunnerError):
        return ["preview_not_admitted"]
    native = await budget.binding_row(tx, chat)
    snapshot, _ = budget.checked(chat, native)
    agent = await tx.get(Agent, str(snapshot.agent_id), populate_existing=True)
    config = await tx.get(Config, str(snapshot.config_revision_id), populate_existing=True)
    registry = await tx.get(Registration, str(snapshot.registration_id), populate_existing=True)
    admission = await tx.get(Admission, str(snapshot.admission_id), populate_existing=True)
    creation = await tx.get(Creation, str(snapshot.creation_id), populate_existing=True)
    if (not agent or not config or not registry or not admission or not creation or agent.purpose != "site_chat"
            or binding(agent) != binding(row) or agent.business_id != chat.business_id or agent.grant_id != chat.grant_id
            or agent.current_revision != snapshot.config_revision or config.agent_id != agent.id
            or config.config_sha256 != snapshot.config_sha256 or registry.revoked_at is not None
            or registry.fingerprint != snapshot.registration_fingerprint or admission.revoked_at is not None
            or admission.fingerprint != snapshot.admission_fingerprint
            or creation.current_revision != registry.accepted_revision or creation.active_job_id is not None
            or snapshot.execution_source_revision != settings().control_source_revision):
        return ["configuration_changed"]
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": chat.business_id})
    conversation = await tx.get(Conversation, native.conversation_id, populate_existing=True)
    events = await preview.transcript(tx, native.conversation_id)
    completed = {event.event_key.removeprefix("result:") for event in events
        if event.kind == "customer_text_result" and event.payload.get("status") == "succeeded"}
    incomplete = any(event.kind == "client_transcript" and event.event_key.removeprefix("client:") not in completed for event in events)
    if (not conversation or conversation.expires_at <= utcnow() or conversation.state == "finalized"
            or incomplete and not (conversation.owner and conversation.lease_until and conversation.lease_until > utcnow())
            or any(event.kind == "customer_text_result" and event.payload.get("status") != "succeeded" for event in events)):
        return ["preview_not_admitted"]
    return []


async def contact_blockers(tx, session, row, item):
    try:
        await budget.schema_ready(tx)
        guard(session.user_id)
        if item["purpose"] != "site_chat" or item["business_state"] != "current":
            return ["recipient_not_admitted"]
        agent = await tx.get(Agent, item["agent_id"], populate_existing=True)
        creation = await tx.get(Creation, item["creation_id"], populate_existing=True)
        if not agent or not creation or binding(agent) != binding(row) or agent.business_id != row.business_id or agent.grant_id != row.grant_id:
            return ["recipient_not_current"]
        current = await profiles.projection(tx, session, creation,
            registration_identity=(agent.registration_id, agent.registration_fingerprint))
        return [] if current["profile_current"] else ["preview_not_admitted"]
    except (ControlError, RunnerError):
        return ["preview_not_admitted"]


async def capture(session, row, recipient):
    if row.anchor_kind != "business" or not row.business_id or not row.grant_id or recipient.kind != "saved_agent":
        raise ControlError(409, "workspace_execution_binding_required")
    guard(session.user_id)
    pin = execution.capture_high()
    # Commit metadata/Profile/policy/index/native locks before Task admission.
    async with scope(user=session.user_id) as tx:
        await budget.schema_ready(tx)
        current = await direct.parent(tx, session, row.portfolio_id, row.id)
        expected = await provisioning.capture(tx, session, str(recipient.creation_id), business_id=current.business_id,
            grant_id=current.grant_id, source_revision=settings().control_source_revision)
        actual_session = await provisioning.authorizing_session(tx, expected)
        snapshot = await lab.snapshot_in_transaction(tx, actual_session, str(recipient.creation_id),
            str(recipient.agent_id), recipient.revision, execution_profile=pin)
        if snapshot["config_revision_id"] != str(recipient.revision_id) or snapshot["config_sha256"] != recipient.configuration_sha256:
            raise ControlError(409, "recipient_not_current")
        return expected, snapshot


async def preflight_send(session, row, chat):
    from ..tasks.direct_scope import checked
    expected, fresh = await capture(session, row, checked(chat)["recipient"])
    async with scope(user=session.user_id) as tx:
        native = await budget.binding_row(tx, chat)
        frozen = {key: native.snapshot[key] for key in lab.Snapshot.model_fields}
        if not same_snapshot(fresh, frozen):
            raise ControlError(409, "configuration_changed")
    return expected


async def create(tx, session, portfolio_id, topic_id, value):
    row = await direct.parent(tx, session, portfolio_id, topic_id)
    fingerprint = direct.create_fingerprint(row, value)
    old = await tx.scalar(select(DirectChat).where(DirectChat.idempotency_key == str(value.idempotency_key)))
    if old:
        if old.request_fingerprint != fingerprint or old.parent_topic_id != row.id or binding(old) != binding(row):
            raise ControlError(409, "idempotency_conflict")
        return await direct.chat_view(tx, session, row, old)
    expected, observed = await capture(session, row, value.recipient)
    chat_id = uuid5(direct.NAMESPACE, digest(["native-direct-preview.v1", binding(row), row.id, str(value.idempotency_key)]))
    frozen = preview.PreviewSnapshot.model_validate_json(json.dumps({**observed, "preview_id": str(chat_id),
        "episode_id": str(chat_id), "script_sha256": preview.descriptor(observed, chat_id)}))

    class MetadataOnly(TaskFence):
        async def check(self, native_tx):
            guard(session.user_id)
            current = await direct.parent(native_tx, session, portfolio_id, topic_id)
            if binding(current) != expected.owner_binding() or current.business_id != str(expected.business_id) or current.grant_id != str(expected.grant_id):
                raise ControlError(409, "preview_not_admitted")

        async def reserve(self, native_tx, call):
            raise ControlError(403, "preview_task_required")

    principal = preview.principal(expected, MetadataOnly(), frozen.model_dump(mode="json"))
    created = await principal.start(str(frozen.creation_id), Start(request_id=chat_id, admission_id=frozen.admission_id,
        notice_version="customer-text.local.v1", consent=True), calibration=frozen.model_dump(mode="json"))
    # No native locks/provider run while this outer current-owner admission locks.
    async with tx.begin_nested():
        row = await direct.parent(tx, session, portfolio_id, topic_id, lock=True)
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
            {"k": "chat-admission:" + row.environment_id + ":" + row.user_id})
        old = await tx.scalar(select(DirectChat).where(DirectChat.idempotency_key == str(value.idempotency_key)))
        if old:
            if old.request_fingerprint != fingerprint:
                raise ControlError(409, "idempotency_conflict")
            return await direct.chat_view(tx, session, row, old)
        if expected.owner_binding() != binding(row) or str(expected.business_id) != row.business_id or str(expected.grant_id) != row.grant_id:
            raise ControlError(409, "preview_not_admitted")
        reasons = await direct.blockers(tx, session, row)
        if reasons:
            raise ControlError(409, reasons[0])
        chat = await direct.persist_chat(tx, session, row, value, chat_id=str(chat_id))
        tx.add(DirectPreview(id=chat.id, **binding(row), business_id=row.business_id, grant_id=row.grant_id,
            conversation_id=created["conversation_id"], snapshot=frozen.model_dump(mode="json"),
            snapshot_sha256=digest(frozen.model_dump(mode="json")), native_scope=expected.model_dump(mode="json"),
            native_scope_sha256=digest(expected.model_dump(mode="json"))))
        await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": row.business_id})
        await tx.flush()
        await direct.parent(tx, session, portfolio_id, topic_id, lock=True)
        return await direct.chat_view(tx, session, row, chat)


def quality_request(plan, context):
    return review.SessionPreviewRequest(conversation_id=plan.conversation_id, request_id=plan.quality_request_id,
        episode=plan.snapshot, preview_turn_id=plan.task_id, text_request_id=plan.text_request_id,
        base_transcript_revision=context["native_base_revision"], base_transcript_sha256=context["native_base_sha256"],
        score_competence=True)


async def context_for(tx, task, row, chat, turn):
    header = await calibration_budget.allocation(tx, task.id)
    plan = budget.plan_from(header)
    native = await budget.binding_row(tx, chat)
    if turn.context is not None or str(plan.task_id) != task.id or native.conversation_id != str(plan.conversation_id):
        raise ControlError(409, "native_preview_task_not_current")
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": task.business_id})
    conversation = await tx.get(Conversation, native.conversation_id, populate_existing=True)
    events = await preview.transcript(tx, native.conversation_id)
    revision = sum(event.kind == "client_transcript" for event in events)
    if (not conversation or conversation.expires_at <= utcnow() or conversation.state == "finalized" or revision >= 20
            or conversation.payload.get("customer_text_binding", {}).get("task_calibration") != native.snapshot):
        raise ControlError(409, "preview_not_admitted")
    context = {budget.CONTEXT_KEY: header["plan_sha256"], "native_base_revision": revision,
        "native_base_sha256": preview.transcript_hash(events), "native_need_revision": conversation.need_revision}
    context["quality_request_sha256"] = review.request_intent_sha256(quality_request(plan, context))
    # Finish query-triggered autoflush observations before mutating the one-time
    # context/hash/cutoff bundle protected by the unchanged immediate SQL CHECK.
    owner = await tx.get(TeamEvent, turn.owner_event_id)
    if (not owner or owner.id != turn.owner_event_id or owner.task_id != task.id
            or owner.team_thread_id != chat.team_thread_id or binding(owner) != binding(chat)
            or owner.author_type != "user" or owner.kind != "owner_message" or owner.author_user_id != task.user_id
            or owner.content != task.message or owner.source_revision != task.source_revision
            or type(owner.sequence) is not int or owner.sequence < 1):
        raise ControlError(503, "direct_history_invalid")
    deadline = min(turn.deadline, header["expires_at"], conversation.expires_at,
        utcnow() + timedelta(seconds=3 * settings().chat_runner_seconds + 30))
    turn.context, turn.context_sha256, turn.context_cutoff, turn.deadline = context, digest(context), owner.sequence, deadline
    tx.info["direct_deadlines"][task.id] = turn.deadline
    await tx.flush()
    return {**context, "_task_id": task.id, "_user_id": task.user_id, "_chat_id": chat.id,
        "_direct_context_sha256": turn.context_sha256, "_direct_preview_plan": plan.model_dump(mode="json")}


async def execute(context, heartbeat):
    plan = PreviewTurnPlan.model_validate_json(json.dumps(context["_direct_preview_plan"]))
    pin = execution.current(plan.snapshot.execution_profile)
    fence = budget.task_fence(context["_task_id"], context["_run_id"], plan, context["_direct_context_sha256"])
    principal = preview.principal(plan.scope, fence, plan.snapshot.model_dump(mode="json"), turn_id=plan.task_id)

    async def operation():
        turn = await principal.turn(str(plan.scope.creation_id), str(plan.conversation_id),
            Turn(request_id=plan.text_request_id, base_need_revision=context["native_need_revision"], message=plan.message),
            calibration=plan.snapshot.model_dump(mode="json"))
        if turn["turn"]["status"] != "succeeded":
            raise RunnerError("native_preview_turn_failed")
        request = quality_request(plan, context)
        if review.request_intent_sha256(request) != context["quality_request_sha256"]:
            raise RunnerError("native_preview_input_changed")
        reviewed = await review.run_session(principal, request)
        if reviewed["status"] != "succeeded":
            raise RunnerError("native_preview_review_failed")
        execution.current(pin)
        return {"version": ADAPTER, "context_sha256": context["_direct_context_sha256"],
            "plan_sha256": digest(plan.model_dump(mode="json")), "conversation_id": str(plan.conversation_id),
            "quality_job_id": reviewed["job_id"]}

    async def pulse():
        while await heartbeat():
            await asyncio.sleep(2)

    action, monitor = asyncio.create_task(operation()), asyncio.create_task(pulse())
    try:
        done, _ = await asyncio.wait({action, monitor}, return_when=asyncio.FIRST_COMPLETED)
        if monitor in done:
            action.cancel()
            await asyncio.gather(action, return_exceptions=True)
            raise RunnerError("authorization_revoked")
        return await action, None
    finally:
        for item in (action, monitor):
            if not item.done():
                item.cancel()
        await asyncio.gather(action, monitor, return_exceptions=True)


async def completion_locks(tx, context):
    plan = PreviewTurnPlan.model_validate_json(json.dumps(context["_direct_preview_plan"]))
    await provisioning.verify(tx, plan.scope, lock=True)


async def complete(tx, task, chat, turn, result):
    from .direct_preview_views import proof
    header = await calibration_budget.allocation(tx, task.id)
    plan = budget.plan_from(header)
    if (not isinstance(result, dict) or set(result) != {"version", "context_sha256", "plan_sha256", "conversation_id", "quality_job_id"}
            or result["version"] != ADAPTER or result["context_sha256"] != turn.context_sha256
            or result["plan_sha256"] != header["plan_sha256"] or result["conversation_id"] != str(plan.conversation_id)):
        raise RunnerError("output_invalid")
    fence = budget.task_fence(task.id, task.run_id, plan, turn.context_sha256)
    principal = preview.principal(plan.scope, fence, plan.snapshot.model_dump(mode="json"), turn_id=plan.task_id)
    session = await provisioning.authorizing_session(tx, plan.scope)
    async with native_text.transaction_authority(tx, session, str(plan.scope.creation_id),
            calibration=plan.snapshot.model_dump(mode="json"), principal=principal) as (_, session, creation, identity, _, native_binding):
        conversation = await native_text.locked(tx, str(plan.conversation_id), native_binding)
        details = await proof(tx, task, chat, plan, conversation, required_job_id=result["quality_job_id"], for_completion=True)
        if not details["preview"]["quality_current"] or details["preview"]["quality_state"] != "succeeded":
            raise RunnerError("native_preview_review_changed")
        await native_text.final_authority(tx, session, creation, identity, native_binding)
        event = await direct.add_event(tx, chat, task, "saved_agent", details["native_event"].payload["reply"],
            reply=turn.owner_event_id)
        await fence.check(tx)
        await tx.execute(text("SET CONSTRAINTS workspace_team_fence IMMEDIATE"))
        await tx.execute(text("SET CONSTRAINTS workspace_team_fence DEFERRED"))
        return {**result, "public_events_saved": 1, "event_id": event.id,
            "native_event_id": details["native_event"].id, "quality_artifact_id": details["artifact"].id,
            "quality_artifact_sha256": digest(details["artifact"].payload),
            "transcript_revision": details["preview"]["transcript_revision"], "configuration_sha256": plan.snapshot.config_sha256,
            "module_admission": "not_admitted", "activation": "not_performed"}
