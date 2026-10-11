"""Owned historical task-test receipts, never calibration or execution authority."""
from pydantic import ValidationError
from sqlalchemy import or_, select, text

from ..config import settings
from ..contracts import Quality
from ..control.routes import ControlError, open_cursor
from ..creation.service import digest
from ..customer_profile import service as profiles
from ..customer_profile.models import Admission
from ..models import Artifact, Conversation, Event, Job, utcnow
from . import quality, review
from . import service as agents
from .models import Config

EVENT_LIMIT = 1000


def usage(events, *, truncated=False):
    attempts = [e for e in events if e.kind in {"provider_attempt", "quality_provider_attempt"}]
    settled = [e for e in events if e.kind in {"provider_usage", "quality_provider_usage"}]
    values = [e.payload.get("usage", {}) for e in settled]
    known = [v for v in values if v.get("known") is True and isinstance(v.get("tokens"), dict) and v["tokens"]]
    def key(event):
        p = event.payload
        if event.kind.startswith("quality_"):
            return ("quality", p.get("job_id"), p.get("number")) if (p.get("model") == "gpt-6.1-sol"
                and isinstance(p.get("job_id"), str) and type(p.get("number")) is int and 1 <= p["number"] <= 2) else None
        return ("text", p.get("request_id"), p.get("run_id")) if (p.get("model") == "gpt-6-luna"
            and isinstance(p.get("request_id"), str) and isinstance(p.get("run_id"), str)) else None
    attempted, accounted = [key(e) for e in attempts], [key(e) for e in settled]
    complete = (not truncated and bool(attempts) and None not in attempted + accounted
                and len(set(attempted)) == len(set(accounted)) == len(attempts) == len(settled) == len(known)
                and set(attempted) == set(accounted))
    totals = {}
    for key in ("input_tokens", "output_tokens"):
        numbers = [v["tokens"].get(key) for v in known]
        totals[key] = (sum(numbers) if complete and all(type(n) is int and 0 <= n <= 1_000_000_000
                       for n in numbers) else None)
    return {"attempts": len(attempts), "settled": len(settled), "known_receipts": len(known),
            "complete": complete, **totals, "cost_status": "UNVERIFIED"}


def judgment(row, frozen, events, jobs, artifacts, truncated):
    result = {"state": "not_requested", "model": "gpt-6.1-sol", "applies_to_latest_transcript": False}
    if not jobs:
        return result
    result["state"] = "UNVERIFIED"
    if len(jobs) != 1 or truncated:
        return result
    job = jobs[0]
    payload = job.payload
    requests = [e for e in events if e.kind == "quality_request" and e.payload.get("job_id") == job.id]
    attempts = [e for e in events if e.kind == "quality_provider_attempt" and e.payload.get("job_id") == job.id]
    if (payload.get("dispatch") != review.VERSION or payload.get("model") != "gpt-6.1-sol"
            or payload.get("binding_sha256") != digest(frozen.model_dump(mode="json"))
            or len(requests) != 1
            or any(requests[0].payload.get(k) != payload.get(k) for k in
                   ("fingerprint", "binding_sha256", "input_sha256", "evaluator_sha256", "model", "model_profile"))
            or not isinstance(payload.get("evaluator_sha256"), str) or len(payload["evaluator_sha256"]) != 64
            or any(c not in "0123456789abcdef" for c in payload["evaluator_sha256"])
            or not valid_attempts(job, attempts)):
        return result
    result.update(state=job.state if job.state in {"running", "failed", "succeeded"} else "UNVERIFIED",
                  evaluator_sha256=payload["evaluator_sha256"])
    clients = [e.sequence for e in events if e.kind == "client_transcript"]
    result["applies_to_latest_transcript"] = bool(clients) and max(clients) < requests[0].sequence
    if job.state != "succeeded":
        return result
    settled = [e for e in events if e.kind == "quality_provider_usage" and e.payload.get("job_id") == job.id]
    if (not attempts or len(artifacts) != 1 or not settled_attempts(job, attempts, settled)):
        return {**result, "state": "UNVERIFIED", "applies_to_latest_transcript": False}
    try:
        value = Quality.model_validate({k: artifacts[0].payload[k] for k in Quality.model_fields})
        if (artifacts[0].payload.get("release_hash") != quality.parent(row)
                or artifacts[0].payload.get("coverage") != "complete"):
            return {**result, "state": "UNVERIFIED"}
        result.update(outcome=value.outcome, issues_count=len(value.issues), root_cause=value.root_cause)
    except (KeyError, TypeError, ValueError, ValidationError):
        result["state"] = "UNVERIFIED"
    return result


def valid_attempts(job, attempts):
    """Exact server-owned reservations; zero is valid only for unfinished jobs."""
    if len(attempts) > 2:
        return False
    numbers = [e.payload.get("number") for e in attempts]
    if any(type(n) is not int for n in numbers) or set(numbers) != set(range(1, len(attempts) + 1)):
        return False
    fields = ("fingerprint", "binding_sha256", "input_sha256", "evaluator_sha256", "model", "model_profile")
    return all(e.event_key == f"quality-attempt:{job.id}:{e.payload['number']}"
        and all(e.payload.get(k) == job.payload.get(k) for k in fields) for e in attempts)


def settled_attempts(job, attempts, settled):
    if len(settled) != len(attempts):
        return False
    reservations = {e.payload["number"]: e for e in attempts}
    numbers = [e.payload.get("number") for e in settled]
    if any(type(n) is not int for n in numbers) or set(numbers) != set(reservations):
        return False
    for event in settled:
        number = event.payload["number"]
        if (event.payload.get("model") != "gpt-6.1-sol"
                or event.event_key != f"quality-usage:{job.id}:{number}"
                or event.sequence <= reservations[number].sequence):
            return False
        if number == 1:
            output = event.payload.get("output_sha256")
            if (event.payload.get("failure_code") is not None or not isinstance(output, str)
                    or len(output) != 64 or any(c not in "0123456789abcdef" for c in output)):
                return False
    return True


async def item(tx, row, agent, config, registry, *, scores=False):
    try:
        frozen = quality.retained(row)
        task = frozen.task_calibration
        if (not task or str(task.agent_id) != agent.id or str(task.creation_id) != agent.creation_id
                or str(task.user_id) != agent.user_id or str(task.registration_id) != registry.id
                or task.registration_fingerprint != registry.fingerprint
                or str(task.config_revision_id) != config.id or task.config_revision != config.revision
                or task.config_sha256 != agents.config_view(agent, config)["sha256"]
                or task.specification.model_dump(mode="json") != config.payload):
            raise ValueError("retained_task_conflict")
        admitted = await tx.get(Admission, str(task.admission_id))
        if (not admitted or admitted.user_id != agent.user_id or admitted.creation_id != agent.creation_id
                or admitted.registration_id != registry.id or admitted.fingerprint != task.admission_fingerprint):
            raise ValueError("retained_profile_conflict")
        current = profiles.admitted(admitted).model_dump(mode="json")
        historical = frozen.profile.model_dump(mode="json")
        if {k: v for k, v in current.items() if k != "revoked_at"} != {k: v for k, v in historical.items() if k != "revoked_at"}:
            raise ValueError("retained_profile_conflict")
    except (ValueError, TypeError, ValidationError):
        raise ControlError(503, "invalid_agent_test_evidence") from None
    where = (Event.conversation_id == row.id, Event.business_id == row.business_id,
             Event.environment_id == row.environment_id)
    events = list(await tx.scalars(select(Event).where(*where).order_by(Event.sequence).limit(EVENT_LIMIT + 1)))
    truncated = len(events) > EVENT_LIMIT
    events = events[:EVENT_LIMIT]
    clients = [e for e in events if e.kind == "client_transcript"]
    succeeded = [e for e in events if e.kind == "customer_text_result" and e.payload.get("status") == "succeeded"]
    try:
        _, _, coverage = quality.transcript(events)
    except (ValueError, KeyError, TypeError):
        raise ControlError(503, "invalid_agent_test_evidence") from None
    complete = not truncated and bool(clients) and coverage == "complete"
    complete = complete and digest([e.payload["text"] for e in clients]) == task.script_sha256
    jobs = list(await tx.scalars(select(Job).where(Job.conversation_id == row.id,
        Job.business_id == row.business_id, Job.environment_id == row.environment_id, Job.kind == "quality").limit(2)))
    artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == row.id,
        Artifact.business_id == row.business_id, Artifact.environment_id == row.environment_id, Artifact.kind == "quality").limit(2)))
    accounting = usage(events, truncated=truncated)
    result = {"conversation_id": row.id, "created_at": row.created_at, "need_revision": row.need_revision,
        "config_revision": config.revision, "config_sha256": config.config_sha256,
        "current_configuration": config.revision == agent.current_revision,
        "profile_admission_id": admitted.id, "profile_fingerprint": admitted.fingerprint,
        "profile_revoked": admitted.revoked_at is not None, "execution_source_revision": task.execution_source_revision,
        "execution_source_current": task.execution_source_revision == settings().control_source_revision,
        "script_sha256": task.script_sha256, "customer_turns": len(clients), "succeeded_turns": len(succeeded),
        "script_complete": complete, "events_truncated": truncated,
        "usage": accounting,
        "quality": judgment(row, frozen, events, jobs, artifacts, truncated)}
    if scores:
        from . import score_evidence
        result["competence"] = score_evidence.projection(events, jobs, artifacts, result["quality"], truncated)
    return result


async def listing(token, creation_id, agent_id, *, revision=None, limit=20, cursor=None, scores=False):
    agents.page_options(limit, cursor)
    if revision is not None and (type(revision) is not int or not 1 <= revision <= 2147483647):
        raise ControlError(400, "invalid_request")
    async with agents.authority(token, creation_id, agent_id) as (tx, session, creation, registry, agent):
        revision = revision or agent.current_revision
        config = await tx.scalar(select(Config).where(Config.agent_id == agent.id, Config.revision == revision))
        if not config:
            raise ControlError(404, "not_found")
        agents.config_view(agent, config)
        # Canonical owner/grant authority above supplies this RLS business scope.
        # It is never accepted from the browser or a retained conversation payload.
        await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": registry.business_id})
        scope_id = creation.id + ":" + agent.id + ":" + str(revision)
        statement = select(Conversation).where(Conversation.business_id == registry.business_id,
            Conversation.environment_id == registry.environment_id,
            Conversation.payload["transport"].astext == "customer-text.v1",
            Conversation.payload["customer_text_binding"]["user_id"].astext == session.user_id,
            Conversation.payload["customer_text_binding"]["creation_id"].astext == creation.id,
            Conversation.payload["customer_text_binding"]["task_calibration"]["agent_id"].astext == agent.id,
            Conversation.payload["customer_text_binding"]["task_calibration"]["config_revision_id"].astext == config.id)
        expires = int(utcnow().timestamp()) + 300
        if cursor:
            after, expires = open_cursor(cursor, session, scope_id,
                "customer-agents.score-evidence" if scores else "customer-agents.test-runs")
            anchor = await tx.scalar(statement.where(Conversation.id == after))
            if not anchor:
                raise ControlError(409, "agent_cursor_unavailable")
            statement = statement.where(or_(Conversation.created_at < anchor.created_at,
                (Conversation.created_at == anchor.created_at) & (Conversation.id < anchor.id)))
        rows = list(await tx.scalars(statement.order_by(Conversation.created_at.desc(), Conversation.id.desc()).limit(limit + 1)))
        items = [await item(tx, row, agent, config, registry, scores=scores) for row in rows[:limit]]
        return {"creation_id": creation.id, "agent_id": agent.id, "revision": revision, "items": items,
            "has_more": len(rows) > limit,
            "next_cursor": agents.cursor_value(session, scope_id,
                "score-evidence" if scores else "test-runs", rows[limit - 1].id, expires)
                if len(rows) > limit else None, "scope": "operator_local_task_calibration",
            "evidence_only": True, "calibration_status": "UNVERIFIED", "module_admission": "not_admitted",
            "activation": "not_performed", "provider_execution": False}
