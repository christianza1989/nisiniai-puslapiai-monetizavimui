"""One durable discovery turn, with existing fixed role transport and shared execution barrier."""
from datetime import timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select, text

from ..config import settings
from ..control.routes import scope
from ..creation import adapter as shared_adapter
from ..creation.service import binding, daily_limit_reached, digest, lease_deadline
from ..models import new_id, utcnow
from ..tasks.codex_transport import RunnerError
from . import adapter, service, sources
from .models import DiscoveryAttempt, Report
from .wire import PlanReview, Reply


async def claim(discovery_id=None):
    cfg = settings()
    if not cfg.business_discovery_runner_enabled or not cfg.business_discovery_enabled:
        return None
    async with scope() as discovery:
        if not await service.schema_ready(discovery):
            raise RunnerError("discovery_unavailable")
        await discovery.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                                {"k": "creation-worker:" + cfg.environment})
        candidates = (await discovery.execute(text("SELECT * FROM control_discovery_candidates(:e)"),
                                                {"e": cfg.environment})).mappings().all()
        global_candidates = candidates
        if discovery_id is not None:
            from ..site_build.selectors import selected
            candidates = await selected(discovery, "discovery", cfg.environment, discovery_id)
        if any(c["status"] == "running" and c["lease_until"] and c["lease_until"] > utcnow()
               for c in [*global_candidates, *candidates]):
            return None
        for candidate in candidates:
            async with scope(user=candidate["user_id"]) as tx:
                row, job = await service.locked(tx, candidate["id"], candidate["user_id"])
                if not row or not job or discovery_id and row.id != discovery_id:
                    continue
                from ..creation import execution_profiles as profiles
                await profiles.ensure_current(tx, "discovery", job)
                if job.status == "running":
                    await service.fail(tx, row, job, "worker_interrupted")
                    continue
                if row.status == "archived" or not await service.authority(tx, job):
                    await service.fail(tx, row, job, "authorization_revoked")
                    continue
                previous = await service.latest(tx, row)
                history = await service.history(tx, row, 0, 20)
                context = {"initial_message": row.initial_message, "message": job.message,
                    "history": history, "previous_report": service.report_view(previous) if previous else None,
                    "current_date": utcnow().astimezone(ZoneInfo("Europe/Vilnius")).date().isoformat(),
                    "locale": "lt-LT", "capabilities": adapter.capabilities(),
                    "scope": "business_discovery_plan_only", "permitted_web_actions": cfg.business_discovery_research_limit or None}
                job.status, job.run_id = "running", new_id()
                job.instruction_hash, job.lease_until = adapter.fingerprint(), lease_deadline()
                job.deadline_at = utcnow() + timedelta(seconds=adapter.deadlines.job_seconds(profiles.selected()))
                row.status, row.updated_at = "running", utcnow()
                await tx.flush()
                return {"job_id": job.id, "user_id": job.user_id, "run_id": job.run_id,
                        "discovery_id": row.id, "instruction_hash": job.instruction_hash, "context": context}
    return None


async def heartbeat(claimed):
    async with scope(user=claimed["user_id"]) as tx:
        row, job = await service.locked(tx, claimed["job_id"], claimed["user_id"])
        if not row or not job or job.status != "running" or job.run_id != claimed["run_id"]:
            return False
        from ..creation import execution_profiles as profiles
        try:
            await profiles.ensure_current(tx, "discovery", job)
        except RunnerError:
            return False
        code = None
        if row.status == "archived" or not await service.authority(tx, job):
            code = "authorization_revoked"
        elif not job.lease_until or job.lease_until <= utcnow() or not job.deadline_at or job.deadline_at <= utcnow():
            code = "run_timeout"
        elif adapter.fingerprint() != job.instruction_hash:
            code = "instructions_changed"
        if code:
            await service.fail(tx, row, job, code)
            return False
        job.lease_until = lease_deadline()
        return True


async def reserve(claimed, role, round_number):
    cfg = settings()
    async with scope(user=claimed["user_id"]) as tx:
        row, job = await service.locked(tx, claimed["job_id"], claimed["user_id"])
        if not row or not job or job.status != "running" or job.run_id != claimed["run_id"]:
            raise RunnerError("authorization_revoked")
        from ..creation import execution_profiles as profiles
        profile = await profiles.ensure_current(tx, "discovery", job)
        if not await service.authority(tx, job) or not job.deadline_at or job.deadline_at <= utcnow():
            raise RunnerError("authorization_revoked")
        if not job.lease_until or job.lease_until <= utcnow() or job.instruction_hash != adapter.fingerprint():
            raise RunnerError("instructions_changed")
        if profile == profiles.SOL_HIGH and adapter.deadlines.role_seconds(
                profile, role, (job.deadline_at - utcnow()).total_seconds()) <= 0:
            raise RunnerError("run_timeout")
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                         {"k": "creation-admission:" + cfg.environment})
        params = {"e": cfg.environment, "s": utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}
        own = await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"), params)
        total = await tx.scalar(text("SELECT control_creation_attempt_count(:e,:s)"), params)
        if daily_limit_reached(own, total):
            raise RunnerError("creation_daily_limit")
        count = await tx.scalar(select(func.count()).select_from(DiscoveryAttempt).where(DiscoveryAttempt.job_id == job.id))
        if count >= 6:
            raise RunnerError("attempt_limit")
        # Locks/quota reads consume the same persisted clock; never pay for an exhausted role.
        if profile == profiles.SOL_HIGH and adapter.deadlines.role_seconds(
                profile, role, (job.deadline_at - utcnow()).total_seconds()) <= 0:
            raise RunnerError("run_timeout")
        attempt = DiscoveryAttempt(id=new_id(), discovery_id=row.id, job_id=job.id,
            sequence=count + 1, role=role, round_number=round_number, run_id=job.run_id,
            source_revision=job.source_revision, instruction_hash=adapter.instructions(role)[1],
            model=shared_adapter.pipeline_model(role), **binding(row))
        tx.add(attempt)
        await tx.flush()
        return attempt.sequence, attempt.instruction_hash, (job.deadline_at - utcnow()).total_seconds()


async def retain_usage(claimed, sequence, role, receipt, outcome, value=None):
    # Raw provider outputs/traces stay in fixed private folders, not this API projection.
    async with scope(user=claimed["user_id"]) as tx:
        row, job = await service.locked(tx, claimed["job_id"], claimed["user_id"])
        if not row or not job:
            return
        roles = list((job.usage or {}).get("roles", []))
        if any(r["sequence"] == sequence for r in roles):
            return
        roles.append({"sequence": sequence, "role": role, "outcome": outcome,
            "model": receipt.get("model"), "instruction_hash": receipt.get("instruction_hash"),
            "usage": receipt.get("usage"), "web_search_count": receipt.get("web_search_count"),
            "cost_microusd": receipt.get("cost_microusd"), "output_sha256": digest(value) if value else None})
        job.usage = {**(job.usage or {}), "roles": roles, "cost_status": "UNVERIFIED"}
        await tx.flush()


async def run_team(claimed, role_runner, *, progress=None):
    progress = progress if progress is not None else {}
    context = claimed["context"]
    if role_runner is adapter.run_role:
        _, workspace = adapter.available()
        source_folder = workspace / ("ds-" + claimed["job_id"])
        try:
            observations = await sources.collect(context["initial_message"] + " " + context["message"],
                lambda: heartbeat(claimed), snapshot_dir=source_folder)
        except RuntimeError:
            raise RunnerError("authorization_revoked") from None
        context = {**context, "primary_sources": observations}
        async with scope(user=claimed["user_id"]) as tx:
            row, job = await service.locked(tx, claimed["job_id"], claimed["user_id"])
            if not row or not job or not await service.authority(tx, job) or job.status != "running":
                raise RunnerError("authorization_revoked")
            job.usage = {**(job.usage or {}), "source_reads": observations}
    reviews = []
    for round_number in (1, 2):
        sequence, pin, seconds = await reserve(claimed, "creator", round_number)
        creator_context = {**context, "expected_instruction_hash": pin}
        try:
            value, receipt = await role_runner(creator_context, lambda: heartbeat(claimed),
                role="creator", seconds=seconds)
            reply = Reply.model_validate(value)
            adapter.check_tools(reply, context["capabilities"])
        except (RunnerError, ValueError) as error:
            await retain_usage(claimed, sequence, "creator", getattr(error, "receipt", {}) or {}, "failed")
            raise error if isinstance(error, RunnerError) else RunnerError("output_invalid")
        await retain_usage(claimed, sequence, "creator", receipt, "succeeded", value)
        if reply.state == "needs_input":
            return {"reply": reply.model_dump(mode="json"), "reviews": []}
        reviews = []
        # Keep the exact validated candidate and completed reviews if a later
        # provider stream fails. This is a failed, non-buildable report, not approval.
        progress["payload"] = {"reply": reply.model_dump(mode="json"), "reviews": reviews}
        for role in ("critic", "coordinator"):
            sequence, pin, seconds = await reserve(claimed, role, round_number)
            review_context = {**context, "candidate": reply.model_dump(mode="json"),
                              "candidate_sha256": digest(reply.model_dump(mode="json")),
                              "reviews": reviews, "permitted_web_actions": 0, "expected_instruction_hash": pin}
            try:
                review, receipt = await role_runner(review_context, lambda: heartbeat(claimed),
                                                    role=role, seconds=seconds)
                review = PlanReview.model_validate(review).model_dump(mode="json")
                if review["candidate_sha256"] != review_context["candidate_sha256"]:
                    raise RunnerError("review_candidate_mismatch", receipt)
            except (RunnerError, ValueError) as error:
                await retain_usage(claimed, sequence, role, getattr(error, "receipt", {}) or {}, "failed")
                raise error if isinstance(error, RunnerError) else RunnerError("output_invalid")
            await retain_usage(claimed, sequence, role, receipt, "succeeded", review)
            reviews.append(review)
        if all(r["approved"] for r in reviews):
            return {"reply": reply.model_dump(mode="json"), "reviews": reviews}
        context = {**context, "candidate": reply.model_dump(mode="json"), "required_reviews": reviews,
                   "permitted_web_actions": settings().business_discovery_research_limit or None}
    raise RunnerError("plan_review_failed")


async def execute_once(*, discovery_id=None, role_runner=None):
    async with scope() as execution:
        acquired = await execution.scalar(text("SELECT pg_try_advisory_xact_lock(hashtextextended(:k,0))"),
                                           {"k": "creation-execution:" + settings().environment})
        if not acquired:
            return False
        claimed = await claim(discovery_id)
        if not claimed:
            return False
        payload, failure = None, None
        progress = {}
        try:
            payload = await run_team(claimed, role_runner or adapter.run_role, progress=progress)
        except RunnerError as error:
            failure = error.code
            payload = progress.get("payload")
        async with scope(user=claimed["user_id"]) as tx:
            row, job = await service.locked(tx, claimed["job_id"], claimed["user_id"])
            if not row or not job or job.status != "running" or job.run_id != claimed["run_id"]:
                return True
            result_allowed = True
            from ..creation import execution_profiles as profiles
            try:
                await profiles.ensure_current(tx, "discovery", job)
            except RunnerError:
                failure, result_allowed = "instructions_changed", False
            if not await service.authority(tx, job) or row.status == "archived":
                failure = "authorization_revoked"
                result_allowed = False
            elif row.current_revision != job.base_revision:
                failure = "stale_report"
                result_allowed = False
            elif not job.deadline_at or job.deadline_at <= utcnow() or not job.lease_until or job.lease_until <= utcnow():
                failure = "run_timeout"
                result_allowed = False
            elif job.instruction_hash != adapter.fingerprint():
                failure = "instructions_changed"
                result_allowed = False
            if payload and result_allowed:
                report = Report(id=new_id(), discovery_id=row.id, job_id=job.id, revision=row.current_revision + 1,
                    payload=payload, material_hash=digest(payload), source_revision=job.source_revision, **binding(row))
                tx.add(report)
                row.current_revision = report.revision
                if plan := payload["reply"]["plan"]:
                    row.title = plan["business_name"]
            if failure:
                await service.fail(tx, row, job, failure)
                return True
            row.status = payload["reply"]["state"]
            row.active_job_id, row.updated_at = None, utcnow()
            job.status, job.finished_at, job.lease_until = "succeeded", utcnow(), None
            await tx.flush()
        return True
