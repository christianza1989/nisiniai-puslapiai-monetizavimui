"""Source-bound local High website draft clocks; default execution stays exact."""
from ..config import settings
from ..tasks.codex_transport import RunnerError
from . import execution_profiles as profiles


def policy(profile):
    if profile == profiles.DEFAULT:
        return None
    if profile != profiles.SOL_HIGH:
        raise RunnerError("review_invalid")
    return {"revision": "local-high-creation-deadline.v1", "job_seconds": 900,
        "creator_seconds": 600, "critic_seconds": 150, "coordinator_seconds": 150,
        "creator_reserve_seconds": 300, "critic_reserve_seconds": 150}


def job_seconds(profile):
    value = policy(profile)
    return value["job_seconds"] if value else 2 * settings().creation_runner_seconds


def role_seconds(profile, role, remaining):
    if role not in {"creator", "critic", "coordinator"}:
        raise RunnerError("review_invalid")
    value = policy(profile)
    if value is None:
        return min(remaining, settings().creation_runner_seconds)
    return min(value[role + "_seconds"], remaining - value.get(role + "_reserve_seconds", 0))
