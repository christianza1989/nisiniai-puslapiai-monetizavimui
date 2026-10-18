"""Model-visible UTC snapshot from the canonical server admission only."""

from datetime import UTC, datetime

from ..tasks.codex import RunnerError


def model_context(checked_at, deadline):
    if any(not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None
           for value in (checked_at, deadline)) or deadline <= checked_at:
        raise RunnerError("agent_role_runtime_clock_unavailable")
    return {
        "clock": "database_utc",
        "checked_at_utc": checked_at.astimezone(UTC).isoformat(),
        "execution_deadline_utc": deadline.astimezone(UTC).isoformat(),
        "campaign_and_evidence_time_checks_passed": True,
    }
