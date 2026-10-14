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
    if not await tx.scalar(text("SELECT to_regclass(:table) IS NOT NULL"), {"table": TABLE}):
        guards = await tx.scalar(text("SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal "
            "AND tgname IN('pipeline_model_profile_capture','pipeline_model_attempt_fence'))"))
        return "invalid" if guards else "absent"
    ready = await tx.scalar(text("""SELECT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(:table)
      AND relrowsecurity AND relforcerowsecurity)
      AND (SELECT count(*)=7 FROM pg_trigger WHERE NOT tgisinternal AND tgenabled<>'D' AND
        ((tgrelid=to_regclass(:table) AND tgname='pipeline_model_profile_immutable')
         OR (tgrelid IN(to_regclass('control_creation_jobs'),to_regclass('control_business_discovery_jobs'),
           to_regclass('control_content_work_jobs')) AND tgname='pipeline_model_profile_capture')
         OR (tgrelid IN(to_regclass('control_creation_attempts'),to_regclass('control_business_discovery_attempts'),
           to_regclass('control_content_work_attempts')) AND tgname='pipeline_model_attempt_fence')))
      AND (SELECT count(*)=4 FROM pg_constraint WHERE conrelid=to_regclass(:table) AND contype='f' AND convalidated)"""),
      {"table": TABLE})
    return "ready" if ready else "invalid"


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
    allowed = (actual_model == "gpt-6.1-sol" if profile == SOL_HIGH else
        actual_model in {"gpt-6-luna", "gpt-6.1-sol"} and (kind == "discovery" or role != "creator" or actual_model == "gpt-6-luna"))
    if not allowed:
        raise RunnerError("instructions_changed")
