"""Opt-in bounded private guard metadata; never retain exception text or prompts."""
import json
import re
import stat
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from ..config import settings

ROOT = Path(__file__).resolve().parents[3]/"artifacts"/"acquisition-model-guards"
PHASES = frozenset(("authority", "authority_locks", "completion_locks", "heartbeat",
    "completion_authority", "completion_deadline", "completion_lease", "role_reserve",
    "role_settle_before", "role_settle_after", "role_execution"))
ROLES = frozenset(("none", "researcher", "writer", "reviewer", "reply_coordinator",
    "research", "qualification", "reply", "quality", "coordinator"))
CODES = frozenset(("guard_error_unclassified", "authorization_revoked", "authority_denied",
    "authority_deadline_missing", "authority_deadline_expired", "task_not_running", "run_changed",
    "lease_missing", "lease_expired", "worker_interrupted", "source_unavailable", "unauthenticated",
    "not_found", "runner_unavailable", "run_timeout", "provider_error", "output_invalid",
    "acquisition_model_disabled", "acquisition_native_chain_disabled", "acquisition_native_pair_changed",
    "acquisition_native_schema_unavailable", "acquisition_model_task_invalid",
    "acquisition_model_authorization_invalid", "acquisition_model_authorization_stale",
    "acquisition_model_authorization_expired", "acquisition_model_actor_not_enabled",
    "acquisition_model_session_changed", "acquisition_model_saved_purpose_changed",
    "acquisition_model_module_changed", "acquisition_model_private_registration_changed",
    "acquisition_model_registration_changed", "acquisition_model_campaign_budget_exhausted",
    "acquisition_model_attempt_invalid", "acquisition_model_accounting_failed",
    "correspondence_decision_stale", "acquisition_reply_already_decided",
    "native_manifest_changed", "native_protected_source_changed", "native_manifest_invalid",
    "native_protected_binding_changed", "native_calibration_authorization_retained"))


def safe_code(value):
    return value if isinstance(value, str) and value in CODES else "guard_error_unclassified"


def stamp(value):
    return value.isoformat() if isinstance(value, datetime) else None


def ordinary_path(path):
    for item in (path, *path.parents):
        try:
            info = item.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 0x400:
            return False
    return True


def record(*, task_id, run_id, source_revision, phase, code, role="none", now=None,
        lease_until=None, deadline=None, prior_failure=None, usage_known=None):
    if not settings().acquisition_model_guard_observation_enabled:
        return
    try:
        if phase not in PHASES or role not in ROLES or not re.fullmatch(r"[a-f0-9]{40}", source_revision):
            return
        task_id, run_id = str(UUID(str(task_id))), str(UUID(str(run_id)))
        folder = ROOT/task_id
        if not ordinary_path(folder):
            return
        folder.mkdir(parents=True, exist_ok=True)
        value = {"version": "acquisition-model-guard-observation.v1", "task_id": task_id,
            "run_id": run_id, "source_revision": source_revision, "phase": phase, "role": role,
            "code": safe_code(code), "observed_at": stamp(now or datetime.now(UTC)),
            "clock_source": "database" if now is not None else "process",
            "lease_until": stamp(lease_until), "authority_deadline": stamp(deadline),
            "prior_failure": safe_code(prior_failure) if prior_failure is not None else None,
            "usage_known": usage_known if type(usage_known) is bool else None}
        # Fixed PHASES * fixed ROLES bound files per run. First evidence for
        # each phase/role stays immutable, including an earlier execution error.
        with (folder/f"{run_id}-{phase}-{role}.json").open("x", encoding="utf-8") as output:
            output.write(json.dumps(value, sort_keys=True)+"\n")
    except (OSError, ValueError, TypeError):
        pass  # A diagnostic failure never changes authorization/accounting.


def task_guard(tx, task, phase, code, *, now=None, prior_failure=None):
    # Reading expired ORM attributes here could itself issue forbidden implicit IO.
    value = task.__dict__
    record(task_id=value.get("id"), run_id=value.get("run_id"), source_revision=value.get("source_revision"),
        phase=phase, code=code, now=now, lease_until=value.get("lease_until"),
        deadline=tx.info.get("acquisition_model_deadlines", {}).get(value.get("id")), prior_failure=prior_failure)
