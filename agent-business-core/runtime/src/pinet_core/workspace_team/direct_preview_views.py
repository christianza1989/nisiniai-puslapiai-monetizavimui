"""Native author provenance and retained per-prefix Quality; no adviser impersonation."""
from sqlalchemy import select, text

from ..control.routes import ControlError
from ..creation.service import digest
from ..customer_agents import evidence, preview, quality, review
from ..models import Artifact, Conversation, Event, Job
from ..tasks.service import TERMINAL
from ..workspace_topics import service as topics
from . import calibration_budget
from .direct_preview_budget import binding_row, plan_from
from .direct_wire import DirectTurn


async def proof(tx, task, chat, plan, conversation, *, required_job_id=None, for_completion=False):
    native = await binding_row(tx, chat)
    frozen = conversation.payload.get("customer_text_binding", {}) if conversation else {}
    if (not conversation or conversation.id != native.conversation_id or conversation.id != str(plan.conversation_id)
            or conversation.business_id != task.business_id or conversation.environment_id != task.environment_id
            or frozen.get("task_calibration") != native.snapshot):
        raise ControlError(503, "native_preview_binding_invalid")
    where = (Event.conversation_id == conversation.id, Event.business_id == task.business_id,
        Event.environment_id == task.environment_id)
    events = list(await tx.scalars(select(Event).where(*where).order_by(Event.sequence).limit(evidence.EVENT_LIMIT + 1)))
    if len(events) > evidence.EVENT_LIMIT:
        raise ControlError(503, "native_preview_evidence_unavailable")
    results = [event for event in events if event.event_key == "result:" + str(plan.text_request_id)
        and event.kind == "customer_text_result" and event.payload.get("status") == "succeeded"]
    native_event = results[0] if len(results) == 1 else None
    jobs = list(await tx.scalars(select(Job).where(Job.conversation_id == conversation.id, Job.business_id == task.business_id,
        Job.environment_id == task.environment_id, Job.kind == "quality",
        Job.payload["direct_preview_version"].astext == preview.QUALITY_VERSION,
        Job.payload["direct_preview_turn_id"].astext == task.id).limit(2)))
    if len(jobs) > 1:
        raise ControlError(503, "native_preview_evidence_unavailable")
    job = jobs[0] if jobs else None
    artifacts = []
    if job:
        artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == conversation.id,
            Artifact.business_id == task.business_id, Artifact.environment_id == task.environment_id,
            Artifact.kind == "quality", Artifact.payload["quality_job_id"].astext == job.id,
            Artifact.revision == job.payload.get("transcript_revision")).limit(2)))
    if len(artifacts) > 1:
        raise ControlError(503, "native_preview_evidence_unavailable")
    judgment = evidence.judgment(conversation, quality.Binding.model_validate(frozen), events, jobs, artifacts, False)
    native_rows = [event for event in events if event.kind in {"client_transcript", "customer_text_result"}]
    current_revision = sum(event.kind == "client_transcript" for event in native_rows)
    current = bool(job and job.payload.get("transcript_revision") == current_revision
        and job.payload.get("transcript_sha256") == preview.transcript_hash(native_rows)
        and judgment.get("applies_to_latest_transcript") and judgment["state"] == "succeeded" and len(artifacts) == 1)
    if job and artifacts and (artifacts[0].payload.get("direct_preview") != {key: job.payload[key] for key in (
            "direct_preview_version", "direct_preview_turn_id", "transcript_revision", "transcript_sha256")}):
        raise ControlError(503, "native_preview_evidence_unavailable")
    if required_job_id is not None and (not job or job.id != required_job_id):
        raise ControlError(503, "native_preview_evidence_unavailable")
    if for_completion:
        if (not native_event or not job or not current or len(artifacts) != 1
                or not isinstance(native_event.payload.get("reply"), str) or not 1 <= len(native_event.payload["reply"]) <= 4000
                or digest(await review.input_data(tx, conversation)) != job.payload.get("input_sha256")):
            raise ControlError(409, "native_preview_review_changed")
    state = judgment["state"]
    if state not in {"not_requested", "running", "failed", "succeeded", "UNVERIFIED"}:
        state = "UNVERIFIED"
    artifact = artifacts[0] if artifacts else None
    return {"native_event": native_event, "job": job, "artifact": artifact, "preview": {
        "conversation_id": conversation.id, "configuration_sha256": plan.snapshot.config_sha256,
        "transcript_revision": job.payload["transcript_revision"] if job else current_revision,
        "quality_state": state, "quality_current": current,
        "quality_artifact_id": artifact.id if artifact else None,
        "quality_artifact_sha256": digest(artifact.payload) if artifact else None,
        "module_admission": "not_admitted", "activation": "not_performed"}}


async def observed(tx, task, chat):
    header = await calibration_budget.allocation(tx, task.id)
    plan = plan_from(header)
    await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": task.business_id})
    native = await binding_row(tx, chat)
    conversation = await tx.get(Conversation, native.conversation_id, populate_existing=True)
    result = task.result if isinstance(task.result, dict) else {}
    details = await proof(tx, task, chat, plan, conversation, required_job_id=result.get("quality_job_id"))
    usage = await tx.scalar(text("SELECT workspace_calibration_run_usage(:t,:r,:u,:e)"),
        {"t": task.id, "r": header["run_id"], "u": task.user_id, "e": task.environment_id}) if header["run_id"] else None
    usage = usage or {"usage": None, "reserved_calls": 0, "settled_calls": 0, "usage_complete": False}
    return plan, details, usage


async def turn_view(tx, session, row, chat, task):
    _, details, usage = await observed(tx, task, chat)
    tokens = usage["usage"] or {}
    return topics.project(DirectTurn, task_id=task.id, chat_id=chat.id, mode="agent_preview", sequence=task.sequence,
        idempotency_key=task.idempotency_key, status=task.status, can_cancel=task.status not in TERMINAL and session.user_id == task.user_id,
        failure_code=task.failure_code, call_limit=3,
        usage={"reserved_calls": usage["reserved_calls"], "settled_calls": usage["settled_calls"],
            "usage_complete": usage["usage_complete"], "input_tokens": tokens.get("input_tokens"),
            "output_tokens": tokens.get("output_tokens"), "cost_status": "UNVERIFIED"}, preview=details["preview"],
        source_revision=task.source_revision, created_at=task.created_at, updated_at=task.updated_at)


async def author(tx, chat, task, event):
    plan, details, _ = await observed(tx, task, chat)
    result = task.result if isinstance(task.result, dict) else {}
    native_event, artifact = details["native_event"], details["artifact"]
    if (task.status != "succeeded" or event.author_type != "saved_agent" or event.kind != "answer"
            or event.native_episode_task_id != task.id or event.attempt_id is not None or event.participant_id is not None
            or event.author_user_id is not None or not native_event or not artifact
            or native_event.id != result.get("native_event_id") or native_event.payload.get("reply") != event.content
            or event.id != result.get("event_id") or artifact.id != result.get("quality_artifact_id")
            or digest(artifact.payload) != result.get("quality_artifact_sha256")
            or result.get("configuration_sha256") != plan.snapshot.config_sha256):
        raise ControlError(503, "native_preview_author_invalid")
    return {"kind": "saved_agent", "agent_id": str(plan.snapshot.agent_id),
        "configuration_sha256": plan.snapshot.config_sha256, "conversation_id": str(plan.conversation_id),
        "native_event_id": native_event.id}
