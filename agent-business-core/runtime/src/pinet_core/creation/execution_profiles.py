"""Explicit pipeline selection and immutable new-job admission binding."""
from sqlalchemy import select, text

from ..config import settings
from ..tasks.codex_transport import RunnerError
from .execution_profile_models import PipelineModelProfile
from .execution_profile_schema import PARENTS, TABLE
from .service import binding

DEFAULT = "default"
SOL_HIGH = "local_sol61_high_v1"


def selected():
    cfg = settings()
    value = cfg.creation_execution_profile
    if value not in {DEFAULT, SOL_HIGH} or value == SOL_HIGH and (
        cfg.control_mode != "local" or not (cfg.environment == "local" or cfg.environment.startswith("test-"))):
        raise RunnerError("runner_unavailable")
    return value


def model(profile, role):
    if profile not in {DEFAULT, SOL_HIGH} or role not in {"creator", "critic", "coordinator"}:
        raise RunnerError("review_invalid")
    return "gpt-6.1-sol" if profile == SOL_HIGH or role != "creator" else "gpt-6-luna"


def effort(profile):
    if profile not in {DEFAULT, SOL_HIGH}:
        raise RunnerError("review_invalid")
    return "high" if profile == SOL_HIGH else "medium"


async def schema_state(tx):
    # One fresh catalog snapshot at this checkpoint. NULL represents the legacy
    # absent schema; orphan capture/fence triggers still make that state invalid.
    ready = await tx.scalar(text("""SELECT CASE WHEN to_regclass(:table) IS NULL THEN
      CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal
        AND tgname IN('pipeline_model_profile_capture','pipeline_model_attempt_fence'))
        THEN FALSE ELSE NULL END
      ELSE EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(:table)
      AND relrowsecurity AND relforcerowsecurity)
      AND (SELECT count(*)=7 FROM pg_trigger WHERE NOT tgisinternal AND tgenabled<>'D' AND
        ((tgrelid=to_regclass(:table) AND tgname='pipeline_model_profile_immutable')
         OR (tgrelid IN(to_regclass('control_creation_jobs'),to_regclass('control_business_discovery_jobs'),
           to_regclass('control_content_work_jobs')) AND tgname='pipeline_model_profile_capture')
         OR (tgrelid IN(to_regclass('control_creation_attempts'),to_regclass('control_business_discovery_attempts'),
           to_regclass('control_content_work_attempts')) AND tgname='pipeline_model_attempt_fence')))
      AND (SELECT count(*)=4 FROM pg_constraint WHERE conrelid=to_regclass(:table) AND contype='f' AND convalidated)
      END"""),
      {"table": TABLE})
    return "absent" if ready is None else "ready" if ready else "invalid"


async def require_schema(tx):
    profile = selected()
    state = await schema_state(tx)
    if state == "invalid" or state == "absent" and profile != DEFAULT:
        raise RunnerError("runner_unavailable")
    return state


async def admission(tx):
    profile = selected()
    await require_schema(tx)
    await tx.execute(text("SELECT set_config('pinet.pipeline_execution_profile',:profile,true),"
        "set_config('pinet.pipeline_execution_mode',:mode,true)"),
        {"profile": profile, "mode": settings().control_mode})
    return profile


async def stored(tx, kind, job):
    state = await schema_state(tx)
    if state == "invalid":
        raise RunnerError("runner_unavailable")
    if state == "absent":
        return DEFAULT
    field = PARENTS[kind][2]
    row = await tx.scalar(select(PipelineModelProfile).where(getattr(PipelineModelProfile, field) == job.id))
    return row_profile(row, job)


def row_profile(row, job):
    if row is None:
        return DEFAULT
    if (row.profile != SOL_HIGH or binding(row) != binding(job) or row.session_id != job.session_id
            or row.source_revision != job.source_revision
            or not (row.environment_id == "local" or row.environment_id.startswith("test-"))):
        raise RunnerError("instructions_changed")
    return row.profile


async def ensure_current(tx, kind, job):
    profile = await stored(tx, kind, job)
    if profile != selected():
        raise RunnerError("instructions_changed")
    return profile


async def validate_attempt(tx, kind, job, role, actual_model):
    profile = await stored(tx, kind, job)
    validate_model(profile, kind, role, actual_model)


def validate_model(profile, kind, role, actual_model):
    allowed = (actual_model == "gpt-6.1-sol" if profile == SOL_HIGH else
        actual_model in {"gpt-6-luna", "gpt-6.1-sol"} and (kind == "discovery" or role != "creator" or actual_model == "gpt-6-luna"))
    if not allowed:
        raise RunnerError("instructions_changed")


async def validate_attempts(tx, kind, attempts):
    """One fresh set-based profile observation; validate every historical attempt.

    No result survives this call. Existing owner/source/session/profile checks
    are identical to single-attempt validation, and schema loss is fenced again
    before a successful batch returns.
    """
    if not attempts:
        return {}
    state = await schema_state(tx)
    if state not in {"ready", "absent"}:
        raise RunnerError("runner_unavailable")
    jobs = {job.id: job for job, _, _ in attempts}
    chosen = {identity: DEFAULT for identity in jobs}
    if state == "ready":
        field = PARENTS[kind][2]
        rows = await tx.scalars(select(PipelineModelProfile).where(getattr(PipelineModelProfile, field).in_(jobs)))
        seen = set()
        for row in rows:
            identity = getattr(row, field)
            if identity not in jobs or identity in seen:
                raise RunnerError("instructions_changed")
            seen.add(identity)
            chosen[identity] = row_profile(row, jobs[identity])
    for job, role, actual_model in attempts:
        validate_model(chosen[job.id], kind, role, actual_model)
    if await schema_state(tx) != state:
        raise RunnerError("runner_unavailable")
    return chosen
