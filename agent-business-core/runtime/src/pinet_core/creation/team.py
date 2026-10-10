"""Two bounded rounds of real separate roles, immutable reservations and observed summaries."""
from time import monotonic

from sqlalchemy import func, select, text

from ..config import settings
from ..control.routes import scope
from ..models import new_id, utcnow
from . import adapter, language_patch, renderer
from .models import Attempt, Job, Revision, TeamEvent
from .service import authority, binding, daily_limit_reached
from .team_wire import AttemptView, EventData, TeamEventView, TeamView, TokenUsage

TEAM_ADAPTER = "codex-business-team.v1"
NEEDS_REVIEW = {"review_limit", "review_blocked", "review_invalid", "language_quality_failed", "draft_budget_exhausted"}
START = {"creator": "Kūrėjas rengia verslo pasiūlymą ir svetainės juodraštį.",
         "critic": "Kritikas tikrina šią juodraščio versiją ir pateiktus patikrų įrodymus.",
         "coordinator": "Koordinatorius vertina kritiko išvadą ir nustato kitą veiksmą."}


class TeamError(adapter.RunnerError):
    def __init__(self, code, attempts):
        super().__init__(code)
        self.receipt = {"adapter_revision": TEAM_ADAPTER, "model": "gpt-6-luna", "attempts": attempts,
                        "cost_microusd": None, "web_search_count": sum(r.get("web_search_count", 0) for r in attempts)}


async def _event(tx, creation, job, attempt, state, summary, payload):
    sequence = (await tx.scalar(select(func.max(TeamEvent.sequence)).where(TeamEvent.creation_id == creation.id))) or 0
    value = EventData.model_validate(payload).model_dump(mode="json")
    tx.add(TeamEvent(creation_id=creation.id, job_id=job.id, attempt_id=attempt.id, sequence=sequence + 1,
        state=state, summary=summary, payload=value, **binding(creation)))
    creation.updated_at = utcnow()
    await tx.flush()


async def reserve(claimed, role, round_number, *, structure_repair=False, language_repair=False):
    from .worker import locked
    if role not in START or round_number not in (1, 2):
        raise adapter.RunnerError("review_invalid")
    async with scope(user=claimed["user_id"]) as tx:
        creation, job = await locked(tx, claimed["job_id"], claimed["user_id"])
        if (not creation or not job or job.status != "running" or job.run_id != claimed["run_id"]
                or not job.lease_until or job.lease_until <= utcnow() or not await authority(tx, job)):
            raise adapter.RunnerError("authorization_revoked")
        if adapter.team_instruction_hash() != job.instruction_hash:
            raise adapter.RunnerError("instructions_changed")
        await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                         {"k": "creation-admission:" + settings().environment})
        start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        own = await tx.scalar(text("SELECT control_creation_own_attempt_count(:e,:s)"), {"e": settings().environment, "s": start})
        total = await tx.scalar(text("SELECT control_creation_attempt_count(:e,:s)"), {"e": settings().environment, "s": start})
        if daily_limit_reached(own, total):
            raise adapter.RunnerError("draft_budget_exhausted")
        sequence = (await tx.scalar(select(func.max(Attempt.sequence)).where(Attempt.job_id == job.id))) or 0
        if sequence >= 6:
            raise adapter.RunnerError("review_limit")
        attempt = Attempt(id=new_id(), creation_id=creation.id, job_id=job.id, run_id=job.run_id, sequence=sequence + 1,
            role=role, round_number=round_number, stage="private_draft", source_revision=job.source_revision,
            instruction_hash=adapter.role_instruction_hash(role, structure_repair=structure_repair,
                language_repair=language_repair), model="gpt-6-luna", **binding(creation))
        tx.add(attempt)
        await tx.flush()
        await _event(tx, creation, job, attempt, "reserved", START[role], {})
        return attempt.id


async def finish(claimed, attempt_id, state, summary, payload):
    from .worker import locked
    async with scope(user=claimed["user_id"]) as tx:
        creation, job = await locked(tx, claimed["job_id"], claimed["user_id"])
        if (not creation or not job or job.status != "running" or job.run_id != claimed["run_id"]
                or not job.lease_until or job.lease_until <= utcnow() or not await authority(tx, job)):
            raise adapter.RunnerError("authorization_revoked")
        attempt = await tx.get(Attempt, attempt_id)
        if not attempt or attempt.job_id != job.id or attempt.run_id != job.run_id:
            raise adapter.RunnerError("authorization_revoked")
        await _event(tx, creation, job, attempt, state, summary, payload)


def observed_checks(draft):
    from .review import CHECK_KINDS, draft_sha256
    digest = draft_sha256(draft)
    try:
        language = renderer.language_screening(draft)
        status, summary = "PASS", "Automatinė patikra neaptiko akivaizdaus kalbų maišymosi; redakcinė kokybė vertinama atskirai."
    except adapter.RunnerError as error:
        if error.code != "language_quality_failed":
            raise
        language = {"status": "FAIL", "check": "obvious_language_drift.v1"}
        status, summary = "FAIL", "Automatinė patikra aptiko kalbų maišymąsi; tokia versija negali būti priimta."
    checks = [{"id": "r_" + kind, "draft_sha256": digest, "kind": kind,
               "status": status if kind == "language_quality" else "UNVERIFIED",
               "observed": kind == "language_quality", "summary": summary if kind == "language_quality"
               else "Šio etapo faktinė patikra dar neatlikta; agento teiginys jos nepatvirtina."} for kind in CHECK_KINDS]
    return checks, language


def usage_view(receipt):
    usage = receipt.get("usage")
    if not isinstance(usage, dict):
        return None
    fields = TokenUsage.model_fields
    return TokenUsage.model_validate({key: usage[key] for key in fields if key in usage}).model_dump(mode="json")


async def run(claimed, still_authorized, role_runner=None):
    from .review import critic_sha256, draft_sha256, normalize_coordinator, normalize_critic
    context = dict(claimed["context"])
    run_role = role_runner or adapter.run_role
    deadline = monotonic() + settings().creation_runner_seconds
    remaining_web = context["permitted_web_actions"]
    receipts, candidate, critic, repair = [], None, None, None

    async def call(role, round_number, data, normalize_role):
        seconds = deadline - monotonic()
        if seconds < 1:
            raise TeamError("run_timeout", receipts)
        if not await still_authorized():
            raise TeamError("authorization_revoked", receipts)
        try:
            attempt_id = await reserve(claimed, role, round_number,
                structure_repair=role == "creator" and data.get("structure_repair") is True,
                language_repair=role == "creator" and data.get("language_repair") is True)
        except adapter.RunnerError as error:
            raise TeamError(error.code, receipts) from None
        seconds = deadline - monotonic()
        receipt, value = {}, None
        try:
            if seconds < 1:
                raise adapter.RunnerError("run_timeout")
            value, receipt = await run_role(data, still_authorized, role=role, seconds=seconds)
            value = normalize_role(value)
            if monotonic() >= deadline:
                raise adapter.RunnerError("run_timeout")
            payload = {"usage": usage_view(receipt), "web_search_count": receipt.get("web_search_count"),
                       "cost_microusd": None}
            if role == "creator":
                checks, _ = observed_checks(value)
                payload.update(candidate_sha256=draft_sha256(value), checks=checks)
                summary = ("Kūrėjas pateikė verslo pasiūlymą ir svetainės juodraštį. Toliau jį vertins kritikas."
                    if checks[0]["status"] == "PASS" else "Kūrėjo versijoje aptiktas kalbų maišymasis; kritikas turės nurodyti pataisas.")
            else:
                payload.update(candidate_sha256=value["draft_sha256"], decision=value.get("verdict", value.get("decision")))
                summary = value["summary"]
                if role == "critic":
                    payload.update(critic_sha256=critic_sha256(value), findings=value["findings"], checks=data["receipts"])
                else:
                    payload.update(critic_sha256=value["critic_sha256"], next_actions=value["next_actions"], checks=data["receipts"])
            if monotonic() >= deadline:
                raise adapter.RunnerError("run_timeout")
            await finish(claimed, attempt_id, "succeeded", summary, payload)
            receipts.append({"attempt_id": attempt_id, "role": role, "round_number": round_number, **receipt})
        except adapter.RunnerError as error:
            receipt = error.receipt or receipt
            if role == "creator" and error.code == "output_invalid" and value is not None:
                if correction := renderer.structural_repair_context(value):
                    receipt["creator_repair_context"] = correction
            receipts.append({"attempt_id": attempt_id, "role": role, "round_number": round_number,
                             "failure_code": error.code, **receipt})
            try:
                summary = ("Kūrėjo plano struktūros patikra nepraėjo; užregistruotos konkrečios klaidos pataisymui."
                    if role == "creator" and round_number == 1 and receipt.get("creator_repair_context") else
                    "Šio agento bandymas nebaigtas; patvirtintas rezultatas nesukurtas.")
                await finish(claimed, attempt_id, "failed", summary,
                             {"failure_code": error.code, "usage": usage_view(receipt),
                              "web_search_count": receipt.get("web_search_count"), "cost_microusd": None})
            except adapter.RunnerError:
                pass  # Current revocation fences public writes; retain observed accounting in the raised private receipt.
            raise TeamError(error.code, receipts) from None
        if monotonic() >= deadline:
            raise TeamError("run_timeout", receipts)
        return value, receipt

    for round_number in (1, 2):
        normalize_candidate = renderer.normalize
        creator_context = {**context, "permitted_web_actions": remaining_web,
                           "expected_instruction_hash": adapter.role_instruction_hash("creator")}
        if repair:
            creator_context.update(current_draft=repair["candidate"], prior_context_projection=repair["projection"],
                structural_feedback={key: repair[key] for key in ("check", "issues", "unaccepted_candidate_sha256")},
                structure_repair=True, permitted_web_actions=0,
                expected_instruction_hash=adapter.role_instruction_hash("creator", structure_repair=True),
                feedback="Įgyvendink tikslias serverio struktūros patikros pataisas ir grąžink visą naują juodraštį.")
        if candidate:
            if patch := language_patch.context(candidate, critic):
                # Only exact criticized string values, not a whole business rewrite or new research.
                original_candidate, original_critic = candidate, critic
                creator_context = {"language_repair": True, "language_patch_context": patch,
                    "permitted_web_actions": 0,
                    "expected_instruction_hash": adapter.role_instruction_hash("creator", language_repair=True)}
                def normalize_candidate(value):
                    return language_patch.apply(original_candidate, original_critic, value)
            else:
                prior, projection = renderer.context_projection(candidate)
                creator_context.update(current_draft=prior, prior_context_projection=projection,
                    critic_feedback=critic, feedback="Įgyvendink tikslias kritiko pataisas ir grąžink visą naują juodraštį.")
        try:
            candidate, receipt = await call("creator", round_number, creator_context, normalize_candidate)
        except TeamError as error:
            last = error.receipt["attempts"][-1] if error.receipt.get("attempts") else {}
            if (round_number == 1 and error.code == "output_invalid" and last.get("creator_repair_context")):
                repair = last["creator_repair_context"]
                remaining_web = max(0, remaining_web - last.get("web_search_count", 0))
                continue
            raise
        remaining_web = max(0, remaining_web - receipt.get("web_search_count", 0))
        checks, language = observed_checks(candidate)
        review_context = {"draft": candidate, "stage": "private_draft", "round_number": round_number, "receipts": checks}
        critic, _ = await call("critic", round_number, review_context,
            lambda value: normalize_critic(value, draft=candidate, expected_stage="private_draft", expected_round=round_number, receipts=checks))
        decision, _ = await call("coordinator", round_number, {**review_context, "critic": critic},
            lambda value: normalize_coordinator(value, draft=candidate, critic=critic, expected_stage="private_draft", expected_round=round_number, receipts=checks))
        if decision["decision"] == "accept_draft":
            renderer.language_screening(candidate)  # A real hard gate cannot be overruled by any role.
            return candidate, {"adapter_revision": TEAM_ADAPTER, "model": "gpt-6-luna", "attempts": receipts,
                "language_screening": language, "critic": critic, "coordinator": decision,
                "instruction_hash": adapter.team_instruction_hash(), "deadline_monotonic": deadline,
                "web_search_count": sum(r.get("web_search_count", 0) for r in receipts)}
        if decision["decision"] == "blocked":
            raise TeamError("review_blocked", receipts)
    raise TeamError("review_limit", receipts)


async def projection(tx, creation):
    attempts = list(await tx.scalars(select(Attempt).where(Attempt.creation_id == creation.id).order_by(Attempt.created_at, Attempt.id).limit(120)))
    events = list(await tx.scalars(select(TeamEvent).where(TeamEvent.creation_id == creation.id).order_by(TeamEvent.sequence).limit(300)))
    jobs = list(await tx.scalars(select(Job).where(Job.creation_id == creation.id).order_by(Job.sequence)))
    revision = await tx.scalar(select(Revision).where(Revision.creation_id == creation.id, Revision.sequence == creation.current_revision))
    by_attempt, job_by_id = {a.id: a for a in attempts}, {j.id: j for j in jobs}
    views = []
    for attempt in attempts:
        final = [e.state for e in events if e.attempt_id == attempt.id and e.state != "reserved"]
        state = final[-1] if final else "reserved" if job_by_id[attempt.job_id].status == "running" else "interrupted"
        views.append(AttemptView(attempt_id=attempt.id, job_id=attempt.job_id, sequence=attempt.sequence, role=attempt.role,
            round_number=attempt.round_number, stage=attempt.stage, state=state, source_revision=attempt.source_revision,
            instruction_hash=attempt.instruction_hash, model=attempt.model, created_at=attempt.created_at))
    timeline = [TeamEventView(event_id=e.id, sequence=e.sequence, job_id=e.job_id, attempt_id=e.attempt_id,
        role=by_attempt[e.attempt_id].role, round_number=by_attempt[e.attempt_id].round_number,
        stage=by_attempt[e.attempt_id].stage, state=e.state, summary=e.summary, created_at=e.created_at, data=e.payload) for e in events]
    reviewed = bool(revision and any(str(e.job_id) == revision.job_id and e.role == "coordinator" and e.state == "succeeded"
        and e.data.decision == "accept_draft" and e.data.candidate_sha256 == revision.material_hash
        and any(c.kind == "language_quality" and c.status == "PASS" and c.observed and c.draft_sha256 == revision.material_hash
                for c in e.data.checks) for e in timeline))
    return TeamView(creation_id=creation.id, status="needs_review" if creation.failure_code in NEEDS_REVIEW else creation.status,
        scope="private_business_and_website_draft", current_revision=creation.current_revision or None,
        active_job_id=creation.active_job_id, latest_job_id=jobs[-1].id if jobs else None, creation_updated_at=creation.updated_at,
        accepted_candidate_sha256=revision.material_hash if reviewed else None, max_rounds=2, max_calls_per_job=6,
        deadline_seconds=settings().creation_runner_seconds, full_f1_status="UNVERIFIED", launch_status="UNVERIFIED",
        attempts=views, events=timeline).model_dump(mode="json")
