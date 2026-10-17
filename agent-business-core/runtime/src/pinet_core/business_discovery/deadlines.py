"""Fixed local High Discovery budgets; every role uses one persisted job deadline."""
from ..config import settings
from ..creation import execution_profiles as profiles
from ..tasks.codex_transport import RunnerError


def policy(profile):
    if profile == profiles.DEFAULT:
        return None  # Preserve default execution identity, including historical hashes.
    if profile != profiles.SOL_HIGH:
        raise RunnerError("review_invalid")
    return {"revision": "local-high-discovery-deadline.v2", "job_seconds": 900,
        "creator_seconds": 660, "critic_seconds": 90, "coordinator_seconds": 90,
        "creator_reserve_seconds": 180, "critic_reserve_seconds": 90}


def job_seconds(profile):
    value = policy(profile)
    return value["job_seconds"] if value else min(600, settings().creation_runner_seconds * 2)


def role_seconds(profile, role, remaining):
    if role not in {"creator", "critic", "coordinator"}:
        raise RunnerError("review_invalid")
    value = policy(profile)
    if value is None:
        return min(remaining, settings().creation_runner_seconds)
    reserve = value.get(role + "_reserve_seconds", 0)
    return min(value[role + "_seconds"], remaining - reserve)
