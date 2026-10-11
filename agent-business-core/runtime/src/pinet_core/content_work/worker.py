"""One bounded native GUIDE team under the shared provider execution mutex."""
import asyncio
from datetime import timedelta
from types import SimpleNamespace

from sqlalchemy import func, select, text

from ..config import settings
from ..control.routes import ControlError, scope
from ..creation import language_mode
from ..creation.service import ACTIVE, binding
from ..creation.team import usage_view
from ..models import new_id, utcnow
from ..tasks.codex_transport import RunnerError
from . import adapter, continuation, review, service, studio
from .models import GuideAttempt

ROLE_SUMMARIES = {"creator": "Kūrėjas rengia pasirinkto gido tekstą pagal tikrą planavimo briefą.",
    "critic": "Kritikas vertina konkretaus gido turinį, kalbą ir likusias nežinomybes.",
    "coordinator": "Koordinatorius tikrina kritiko išvadą ir sprendžia dėl privataus gido įrašymo."}
REPAIRABLE = {"writer_output_invalid", "writer_unknown_link", "writer_unverified_external_link",
              "writer_unknown_asset", "writer_notes_overflow"}


async def claim():
    try:
        service.enabled()
    except ControlError:
        return None
    cfg = settings()
    async with scope() as tx:
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                         {"k": "content-work-claim:" + cfg.environment})
        rows = (await tx.execute(text("SELECT * FROM control_content_work_candidates(:e)"),
                                 {"e": cfg.environment})).mappings().all()
        old_running = (await tx.execute(text("SELECT * FROM control_creation_candidates(:e)"),
                                        {"e": cfg.environment})).mappings().all()
        if any(row["status"] == "running" and row["lease_until"] and row["lease_until"] > utcnow()
               for row in [*rows, *old_running]):
            return None
        for row in rows:
            async with scope(user=row["user_id"]) as owned:
                creation, job = await service.locked(owned, row["id"], row["user_id"])
                if not job or job.status not in ACTIVE:
                    continue
                if job.status == "running":
                    await service.fail(owned, job, "worker_interrupted")
                    continue
                if not await service.authority(owned, job, creation):
                    await service.fail(owned, job, "authorization_revoked")
                    continue
                job.status, job.run_id = "running", new_id()
                job.deadline_at = utcnow() + timedelta(seconds=min(300, cfg.creation_runner_seconds))
                job.lease_until = service.lease(job)
                return {"job_id": job.id, "user_id": job.user_id, "run_id": job.run_id,
                    "target": SimpleNamespace(creation_id=creation.id, accepted_revision=job.accepted_revision,
                        page_id=job.page_id, source_hash=job.source_hash, canonical_host=creation.canonical_host),
                    "binding": dict(job.binding), "deadline_at": job.deadline_at}
    return None


def remaining(claimed):
    seconds = (claimed["deadline_at"] - utcnow()).total_seconds()
    if seconds <= 0:
        raise RunnerError("run_timeout")
    return seconds


async def current(tx, claimed):
    creation, job = await service.locked(tx, claimed["job_id"], claimed["user_id"])
    if not job or job.status != "running" or job.run_id != claimed["run_id"]:
        raise RunnerError("authorization_revoked")
    if (not job.lease_until or job.lease_until <= utcnow() or not job.deadline_at
            or job.deadline_at <= utcnow() or not await service.authority(tx, job, creation)):
        raise RunnerError("authorization_revoked" if not job.deadline_at or job.deadline_at > utcnow() else "run_timeout")
    return creation, job


async def heartbeat(claimed):
    async with scope(user=claimed["user_id"]) as tx:
        try:
            _, job = await current(tx, claimed)
        except RunnerError:
            return False
        job.lease_until = service.lease(job)
        return True


async def reserve(claimed, role, round_number, prepared):
    async with scope(user=claimed["user_id"]) as tx:
        _, job = await current(tx, claimed)
        await service.quota(tx)
        sequence = (await tx.scalar(select(func.max(GuideAttempt.sequence)).where(GuideAttempt.job_id == job.id)) or 0) + 1
        if sequence > 6 or round_number not in (1, 2) or role not in ROLE_SUMMARIES:
            raise RunnerError("review_limit")
        attempt = GuideAttempt(id=new_id(), creation_id=job.creation_id, job_id=job.id, run_id=job.run_id,
            sequence=sequence, role=role, round_number=round_number, stage="content", source_revision=job.source_revision,
            instruction_hash=adapter.instruction_hash(role, prepared), model="gpt-6-luna", **binding(job))
        tx.add(attempt)
        await tx.flush()
        await service.event(tx, job, "reserved", ROLE_SUMMARIES[role], attempt=attempt)
        return attempt


async def finish(claimed, attempt, state, payload):
    async with scope(user=claimed["user_id"]) as tx:
        _, job = await current(tx, claimed)
        if attempt.job_id != job.id or attempt.run_id != job.run_id:
            raise RunnerError("authorization_revoked")
        await service.event(tx, job, state, "Gido rengimo bandymo rezultatas išsaugotas.", payload, attempt)


async def apply(claimed, prepared, output, writer):
    # The User -> Session -> Creation -> Job locks linearize revoke/cancel/revision
    # against this one private CAS write. No provider executes while these locks are held.
    async with scope(user=claimed["user_id"]) as tx:
        creation, job = await current(tx, claimed)
        async def authorized():
            return job.deadline_at > utcnow() and await service.authority(tx, job, creation)
        receipt = await writer(claimed["target"], "apply", authorized,
                               seconds=remaining(claimed), prepared=prepared, output=output)
        if not await authorized():
            await service.fail(tx, job, "apply_completion_uncertain")
            return
        job.result, job.status, job.lease_until, job.finished_at = receipt, "succeeded", None, utcnow()
        await service.event(tx, job, "applied", "Gido juodraštis įrašytas į studiją. Viešo publikavimo patikros lieka neatliktos.",
                            {"output_sha256": receipt["outputHash"]})


async def run(claimed, role_runner, writer):
    async def authorized():
        return await heartbeat(claimed)
    prepared = await writer(claimed["target"], "prepare", authorized, seconds=remaining(claimed))
    if any(prepared.get(key) != claimed["binding"][key] for key in studio.BINDING_KEYS):
        raise RunnerError("writer_context_stale")
    async with scope(user=claimed["user_id"]) as tx:
        _, job = await current(tx, claimed)
        previous, feedback = await continuation.load(tx, job, prepared)
    for round_number in (1, 2):
        output, receipts, critic = None, None, None
        repair_creator = False
        for role in ("creator", "critic", "coordinator"):
            if not await authorized():
                raise RunnerError("authorization_revoked")
            remaining(claimed)
            try:
                attempt = await reserve(claimed, role, round_number, prepared)
            except ControlError as error:
                raise RunnerError(error.code) from None
            receipt = {}
            context = {"prepared": prepared, "expected_instruction_hash": attempt.instruction_hash,
                "previous_candidate": previous, "critic_feedback": feedback}
            if role != "creator":
                context["review"] = review.context(output, round_number, receipts, prepared, critic)
            try:
                value, receipt = await role_runner(context, authorized, role=role, seconds=remaining(claimed))
                payload = {"language_review_mode": language_mode.mode(), "usage": usage_view(receipt), "trace_sha256": receipt.get("trace_sha256")}
                if role == "creator":
                    validated = await writer(claimed["target"], "validate", authorized,
                        seconds=remaining(claimed), prepared=prepared, output=value)
                    output = review.candidate(validated["output"])
                    receipts = review.observations(output)
                    payload.update(candidate=output, output_sha256=validated["outputHash"], checks=receipts)
                elif role == "critic":
                    critic = review.critic(value, output=output, round_number=round_number, receipts=receipts)
                    payload.update(critic=critic, output_sha256=critic["draft_sha256"])
                else:
                    decision = review.coordinator(value, output=output, critic_value=critic,
                        round_number=round_number, receipts=receipts)
                    payload.update(coordinator=decision, output_sha256=decision["draft_sha256"])
                await finish(claimed, attempt, "succeeded", payload)
            except RunnerError as error:
                receipt = error.receipt or receipt
                try:
                    await finish(claimed, attempt, "failed", {"failure_code": error.code, "usage": usage_view(receipt),
                                                           "trace_sha256": receipt.get("trace_sha256")})
                except RunnerError:
                    pass  # Original private process output and immutable reservation remain.
                if role == "creator" and round_number == 1 and error.code in REPAIRABLE:
                    # A real failed attempt stays failed and charged. Only a new
                    # creator dispatch may fix native structure/targets; no fake
                    # critic verdict or additional third round is synthesized.
                    previous = None
                    feedback = {"validation": {"code": error.code,
                        "correction": "Pataisyk native V2 schemą ir naudok tik pateiktus tikrus nuorodų bei vaizdų ID. Nepatikrintų išorinių adresų nenaudok."}}
                    repair_creator = True
                    break
                raise
        if repair_creator:
            continue
        if decision["decision"] == "accept_draft":
            if not language_mode.receipt_satisfies(receipts[0], mode=language_mode.mode(), digest=review.shared.canonical_sha256(output)):
                raise RunnerError("language_quality_failed")
            await apply(claimed, prepared, output, writer)
            return
        if decision["decision"] == "blocked":
            raise RunnerError("review_blocked")
        previous = review.projection(output)[0]
        feedback = {"critic": critic, "coordinator": decision}
    raise RunnerError("review_limit")


async def execute_once(*, role_runner=None, writer=None):
    async with scope() as execution:
        if not await execution.scalar(text("SELECT pg_try_advisory_xact_lock(hashtextextended(:k,0))"),
                                      {"k": "creation-execution:" + settings().environment}):
            return False
        claimed = await claim()
        if not claimed:
            return False
        try:
            await run(claimed, role_runner or adapter.run_role, writer or studio.invoke)
        except RunnerError as error:
            async with scope(user=claimed["user_id"]) as tx:
                _, job = await service.locked(tx, claimed["job_id"], claimed["user_id"])
                if job and job.status == "running" and job.run_id == claimed["run_id"]:
                    await service.fail(tx, job, error.code)
        return True


async def loop(source_check):
    while True:
        source_check()
        if not await execute_once():
            await asyncio.sleep(1)
