"""Detached V2 target metadata, never current authority or an instruction release.

No filesystem, settings, clock, database or provider is consulted. A caller must
still obtain canonical current authority before every future native operation.
"""
import json
import re
from dataclasses import dataclass

from ..creation.service import digest
from ..customer_text import execution
from . import lab, provisioning, quality


class LearningInputError(ValueError):
    pass


def hash_value(value):
    if not isinstance(value, str) or re.fullmatch(r"[a-f0-9]{64}", value) is None:
        raise LearningInputError("learning_digest_required")
    return value


def json_value(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def _model(model, value):
    try:
        raw = value.model_dump_json() if isinstance(value, model) else json_value(value)
        return model.model_validate_json(raw)
    except (ValueError, TypeError, OverflowError):
        raise LearningInputError("invalid_learning_target") from None


@dataclass(frozen=True)
class LearningTarget:
    """JSON strings keep nested caller objects detached and mutation-free."""
    scope_json: str
    binding_json: str
    evaluator_sha256: str


def _native(scope, binding, evaluator_sha256):
    scope = _model(provisioning.ProvisioningScope, scope)
    binding = _model(quality.Binding, binding)
    hash_value(evaluator_sha256)
    task, profile = binding.task_calibration, binding.profile
    if not isinstance(task, lab.Episode):
        raise LearningInputError("saved_config_episode_required")
    # Retained pins are validated only as data; current() would assert a
    # runtime admission that this pure adapter neither observes nor grants.
    try:
        pin = execution.binding_pin(binding.model_dump(mode="json"))
    except ValueError:
        raise LearningInputError("learning_execution_profile_conflict") from None
    if pin is None or binding.model != pin.text.model:
        raise LearningInputError("learning_high_profile_required")
    for key in ("creation_id", "user_id", "session_id", "environment_id",
            "registration_id", "registration_fingerprint"):
        if getattr(binding, key) != getattr(scope, key) or getattr(task, key) != getattr(scope, key):
            raise LearningInputError("learning_native_scope_conflict")
    if (profile.business_id != scope.business_id or profile.registration_id != scope.registration_id
            or profile.admission_id != binding.admission_id or task.admission_id != binding.admission_id
            or task.admission_fingerprint != binding.admission_fingerprint or profile.revoked_at is not None
            or task.execution_source_revision != scope.source_revision
            or profile.execution_source_revision != scope.source_revision):
        raise LearningInputError("learning_native_parent_conflict")
    return scope, binding


def capture_target(scope, binding, evaluator_sha256):
    """Validate supplied native metadata without asserting it was executed."""
    scope, binding = _native(scope, binding, evaluator_sha256)
    return LearningTarget(json_value(scope.model_dump(mode="json")),
        json_value(binding.model_dump(mode="json")), evaluator_sha256)


def _parts(target):
    if not isinstance(target, LearningTarget):
        raise LearningInputError("learning_target_required")
    try:
        return _native(json.loads(target.scope_json), json.loads(target.binding_json), target.evaluator_sha256)
    except (ValueError, TypeError):
        raise LearningInputError("invalid_learning_target") from None


def parent_hash(target):
    """Canonical native Config/Profile parent, not a fabricated prompt hash."""
    return quality.parent_binding(_parts(target)[1])


def target_key(target):
    """Stable across logins/scripts; isolated by every native owner/Config pin."""
    scope, binding = _parts(target)
    return digest({"version": "customer-learning-target.v1",
        "scope": scope.model_dump(mode="json", exclude={"session_id"}),
        "parent_hash": quality.parent_binding(binding), "evaluator_sha256": target.evaluator_sha256})


def operation_key(target):
    """A comparison also keeps the original authorizing Session exact."""
    scope, _ = _parts(target)
    return digest({"target_key": target_key(target), "session_id": str(scope.session_id)})


def require_same_parent(expected, observed):
    if target_key(expected) != target_key(observed) or operation_key(expected) != operation_key(observed):
        raise LearningInputError("learning_target_or_parent_changed")


def native_binding(target):
    return _parts(target)[1].model_dump(mode="json")


def native_snapshot(target):
    task = _parts(target)[1].task_calibration.model_dump(mode="json")
    return lab.Snapshot.model_validate({key: value for key, value in task.items()
        if key not in {"episode_id", "script_sha256"}}).model_dump(mode="json")
