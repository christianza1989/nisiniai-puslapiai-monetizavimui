"""Pure native metadata identity; no DB, active pointer or permission lookup."""
import json
from copy import deepcopy
from dataclasses import FrozenInstanceError, replace
from importlib import import_module
from uuid import uuid4

import pytest
from test_customer_quality import row, saved_task

from pinet_core.customer_agents import quality
from pinet_core.customer_text import execution


def native():
    conversation = row()
    binding = conversation.payload["customer_text_binding"]
    task = saved_task(conversation)
    role = {"model": "gpt-6.1-sol", "reasoning_effort": "high", "verbosity": None,
        "model_catalogue_sha256": "9"*64}
    pin = {"version": "customer-agent-execution.v1", "name": "local_sol61_high_v1",
        "text": dict(role), "quality": dict(role)}
    task["execution_profile"] = pin
    binding.update(model="gpt-6.1-sol", execution_profile=pin)
    scope = {key: binding[key] for key in ("user_id", "session_id", "environment_id",
        "creation_id", "registration_id", "registration_fingerprint")}
    scope.update(organization_id=str(uuid4()), portfolio_id=str(uuid4()), business_id=conversation.business_id,
        grant_id=str(uuid4()), source_revision=task["execution_source_revision"])
    return scope, binding


def test_new_target_keeps_the_canonical_native_parent_without_executing_it():
    adapter = import_module("pinet_core.customer_agents.learning_target")
    scope, binding = native()
    target = adapter.capture_target(scope, binding, "8"*64)
    assert adapter.parent_hash(target) == quality.parent_binding(binding)
    assert len(adapter.target_key(target)) == len(adapter.operation_key(target)) == 64


def test_existing_native_parent_is_already_independent_of_script_and_episode():
    scope, binding = native()
    first = quality.parent_binding(binding)
    binding["task_calibration"].update(episode_id=str(uuid4()), script_sha256="7"*64)
    assert quality.parent_binding(binding) == first
    assert json.loads(json.dumps(scope)) == scope


def api():
    return import_module("pinet_core.customer_agents.learning_target")


def test_native_objects_are_detached_and_output_mutation_cannot_change_the_target():
    scope, binding = native()
    target = api().capture_target(scope, binding, "8"*64)
    first = api().target_key(target)
    scope["grant_id"], binding["profile"]["canonical_host"] = str(uuid4()), "changed.example"
    copy = api().native_snapshot(target)
    copy["specification"]["goal"] = "A changed synthetic goal."
    assert api().target_key(target) == first
    assert api().native_snapshot(target)["specification"]["goal"] != copy["specification"]["goal"]
    with pytest.raises(FrozenInstanceError):
        target.evaluator_sha256 = "7"*64


def test_scripts_and_episode_ids_change_without_rebinding_the_comparison():
    scope, binding = native()
    left = api().capture_target(scope, binding, "8"*64)
    binding["task_calibration"].update(episode_id=str(uuid4()), script_sha256="7"*64)
    right = api().capture_target(scope, binding, "8"*64)
    api().require_same_parent(left, right)
    assert api().operation_key(left) == api().operation_key(right)


def test_another_login_keeps_the_target_namespace_but_cannot_renew_the_operation():
    scope, binding = native()
    first = api().capture_target(scope, binding, "8"*64)
    scope["session_id"] = binding["session_id"] = binding["task_calibration"]["session_id"] = str(uuid4())
    other = api().capture_target(scope, binding, "8"*64)
    assert api().target_key(first) == api().target_key(other)
    assert api().operation_key(first) != api().operation_key(other)
    with pytest.raises(api().LearningInputError):
        api().require_same_parent(first, other)


@pytest.mark.parametrize("field", ["organization_id", "portfolio_id", "grant_id"])
def test_owner_scope_components_not_present_in_profile_still_isolate_targets(field):
    scope, binding = native()
    first = api().capture_target(scope, binding, "8"*64)
    scope[field] = str(uuid4())
    other = api().capture_target(scope, binding, "8"*64)
    with pytest.raises(api().LearningInputError):
        api().require_same_parent(first, other)


@pytest.mark.parametrize("field", ["creation_id", "user_id", "session_id", "environment_id",
    "registration_id", "registration_fingerprint"])
def test_binding_cannot_contradict_the_original_scope(field):
    scope, binding = native()
    binding[field] = "other" if field == "environment_id" else "7"*64 if field.endswith("fingerprint") else str(uuid4())
    with pytest.raises(api().LearningInputError):
        api().capture_target(scope, binding, "8"*64)


@pytest.mark.parametrize("field", ["creation_id", "user_id", "session_id", "environment_id",
    "registration_id", "registration_fingerprint", "admission_id", "admission_fingerprint", "execution_source_revision"])
def test_nested_episode_cannot_contradict_its_native_binding(field):
    scope, binding = native()
    binding["task_calibration"][field] = ("other" if field == "environment_id" else "7"*40
        if field == "execution_source_revision" else "7"*64 if field.endswith("fingerprint") else str(uuid4()))
    with pytest.raises(api().LearningInputError):
        api().capture_target(scope, binding, "8"*64)


@pytest.mark.parametrize("field", ["business_id", "registration_id", "admission_id", "execution_source_revision", "revoked_at"])
def test_profile_must_describe_the_same_unrevoked_native_parent(field):
    scope, binding = native()
    binding["profile"][field] = ("2026-10-18T00:00:00Z" if field == "revoked_at"
        else "7"*40 if field == "execution_source_revision" else str(uuid4()))
    with pytest.raises(api().LearningInputError):
        api().capture_target(scope, binding, "8"*64)


@pytest.mark.parametrize("field", ["agent_id", "config_revision_id", "config_revision", "config_sha256", "specification"])
def test_another_saved_config_never_shares_the_same_parent(field):
    scope, binding = native()
    first = api().capture_target(scope, binding, "8"*64)
    task = binding["task_calibration"]
    task[field] = ({**task[field], "goal": "Another synthetic behavior description."} if field == "specification"
        else 3 if field == "config_revision" else "7"*64 if field == "config_sha256" else str(uuid4()))
    other = api().capture_target(scope, binding, "8"*64)
    with pytest.raises(api().LearningInputError):
        api().require_same_parent(first, other)


@pytest.mark.parametrize("field", ["knowledge_hash", "knowledge_revision", "deployment_id"])
def test_knowledge_identity_cannot_drift_between_arms(field):
    scope, binding = native()
    first = api().capture_target(scope, binding, "8"*64)
    binding["profile"]["knowledge_ref"][field] = (2 if field == "knowledge_revision"
        else "7"*64 if field == "knowledge_hash" else "another-deployment")
    other = api().capture_target(scope, binding, "8"*64)
    with pytest.raises(api().LearningInputError):
        api().require_same_parent(first, other)


@pytest.mark.parametrize("change", ["missing_task", "missing_pin", "different_pin", "different_model", "evaluator"])
def test_no_default_profile_or_evaluator_is_invented(change):
    scope, binding = native()
    if change == "missing_task":
        binding["task_calibration"] = None
    elif change == "missing_pin":
        binding["execution_profile"] = binding["task_calibration"]["execution_profile"] = None
    elif change == "different_pin":
        binding["execution_profile"] = deepcopy(binding["execution_profile"])
        binding["execution_profile"]["quality"]["model_catalogue_sha256"] = "7"*64
    elif change == "different_model":
        binding["model"] = "gpt-6-luna"
    with pytest.raises(api().LearningInputError):
        api().capture_target(scope, binding, "not-a-digest" if change == "evaluator" else "8"*64)


def test_changed_evaluator_and_original_source_are_part_of_comparison_identity():
    scope, binding = native()
    first = api().capture_target(scope, binding, "8"*64)
    other = api().capture_target(scope, binding, "7"*64)
    with pytest.raises(api().LearningInputError):
        api().require_same_parent(first, other)
    scope["source_revision"] = binding["profile"]["execution_source_revision"] = binding["task_calibration"]["execution_source_revision"] = "7"*40
    other = api().capture_target(scope, binding, "8"*64)
    with pytest.raises(api().LearningInputError):
        api().require_same_parent(first, other)


def test_internal_model_construct_and_dataclass_replacement_do_not_skip_validation():
    from pinet_core.customer_agents.provisioning import ProvisioningScope
    scope, binding = native()
    valid = api().capture_target(scope, binding, "8"*64)
    invalid = ProvisioningScope.model_construct(**ProvisioningScope.model_validate_json(json.dumps(scope)).model_dump())
    with pytest.raises(api().LearningInputError):
        api().capture_target(invalid.model_copy(update={"source_revision": "invalid"}), binding, "8"*64)
    for changed in (replace(valid, scope_json="null"), replace(valid, binding_json="{}"),
            replace(valid, evaluator_sha256="invalid")):
        with pytest.raises(api().LearningInputError):
            api().target_key(changed)


def test_target_validation_never_observes_current_runtime_or_releases(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("A pure target cannot obtain current execution authority")
    monkeypatch.setattr(execution, "current", forbidden)
    monkeypatch.setattr(execution, "capture_high", forbidden)
    scope, binding = native()
    target = api().capture_target(scope, binding, "8"*64)
    assert len(api().target_key(target)) == 64
    assert "authority" not in target.__dataclass_fields__
