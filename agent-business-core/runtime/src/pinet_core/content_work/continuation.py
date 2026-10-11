"""Exact-context retained feedback is untrusted input, never an acceptance."""
from sqlalchemy import select

from ..creation import language_mode
from ..creation.models import BINDING
from ..tasks.codex_transport import RunnerError
from . import adapter, review, studio
from .models import GuideAttempt, GuideEvent, GuideJob
from .wire import EventPayload

IDENTITY = (*BINDING[1:], "creation_id", "revision_id", "accepted_revision", "source_hash", "page_id")
ROLES = ("creator", "critic", "coordinator")


def seed(job, prior, attempts, events, prepared):
    """Reject incompatible or incomplete history without searching farther back."""
    try:
        if (not prior or prior.status != "failed" or prior.failure_code != "review_limit"
                or prior.result or not prior.finished_at or not prior.run_id
                or prior.sequence >= job.sequence or any(e.state == "applied" for e in events)
                or any(getattr(prior, key) != getattr(job, key) for key in IDENTITY)
                or any((prior.binding or {}).get(key) != prepared[key] for key in studio.BINDING_KEYS)):
            return None, None
        final = attempts[-3:]
        if (len(final) != 3 or tuple(a.role for a in final) != ROLES
                or any(a.round_number != 2 or a.stage != "content" or a.model != adapter.role_model(a.role) or a.run_id != prior.run_id
                       or a.source_revision != prior.source_revision or a.job_id != prior.id
                       or any(getattr(a, key) != getattr(prior, key) for key in (*BINDING[1:], "creation_id"))
                       or a.instruction_hash != adapter.instruction_hash(a.role, prepared) for a in final)
                or [a.sequence for a in final] != list(range(final[0].sequence, final[0].sequence + 3))):
            return None, None
        payloads = []
        for attempt in final:
            completed = [e for e in events if e.attempt_id == attempt.id and e.state in ("succeeded", "failed")]
            if len(completed) != 1:
                return None, None
            event = completed[0]
            if (event.state != "succeeded" or event.job_id != prior.id
                    or any(getattr(event, key) != getattr(prior, key) for key in (*BINDING[1:], "creation_id"))
                    or event.payload.get("language_review_mode") != language_mode.mode()):
                return None, None
            payloads.append(EventPayload.model_validate(event.payload).model_dump(mode="json"))
        creator, critic, coordinator = payloads
        if (not creator["candidate"] or creator["critic"] or creator["coordinator"]
                or not critic["critic"] or critic["candidate"] or critic["coordinator"]
                or not coordinator["coordinator"] or coordinator["candidate"] or coordinator["critic"]
                or any(p["failure_code"] for p in payloads)):
            return None, None
        output = review.candidate(creator["candidate"])
        digest = review.shared.canonical_sha256(output)
        if (any(p["output_sha256"] != digest for p in payloads)
                or creator["checks"] != review.observations(output)):
            return None, None
        report = review.critic(critic["critic"], output=output, round_number=2, receipts=creator["checks"])
        decision = review.coordinator(coordinator["coordinator"], output=output, critic_value=report,
                                      round_number=2, receipts=creator["checks"])
        if decision["decision"] != "revise":
            return None, None
        previous, feedback = review.projection(output)[0], {"critic": report, "coordinator": decision}
        if len(adapter.creator_prompt(prepared, previous, feedback).encode()) > adapter.MAX_PROMPT_BYTES:
            return None, None
        return previous, feedback
    except (RunnerError, ValueError, TypeError, KeyError, IndexError, AttributeError):
        return None, None


async def load(tx, job, prepared):
    # Current owner/auth/source locks are checked by the caller. This read is
    # bounded and completes before any subprocess/heartbeat/provider dispatch.
    prior = await tx.scalar(select(GuideJob).where(
        *(getattr(GuideJob, key) == getattr(job, key) for key in (*BINDING[1:], "creation_id", "page_id")),
        GuideJob.sequence < job.sequence).order_by(GuideJob.sequence.desc()).limit(1))
    if not prior:
        return None, None
    attempts = list(await tx.scalars(select(GuideAttempt).where(GuideAttempt.job_id == prior.id)
                                   .order_by(GuideAttempt.sequence).limit(6)))
    events = list(await tx.scalars(select(GuideEvent).where(GuideEvent.job_id == prior.id)
                                 .order_by(GuideEvent.sequence).limit(100)))
    return seed(job, prior, attempts, events, prepared)
