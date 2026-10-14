import pytest

from pinet_core.config import settings
from pinet_core.creation import adapter, deadlines
from pinet_core.creation import execution_profiles as profiles
from pinet_core.tasks.codex_transport import RunnerError


def test_default_clock_and_instruction_hash_preserve_exact_legacy_semantics(monkeypatch):
    monkeypatch.setattr(settings(), "creation_runner_seconds", 300)
    assert deadlines.policy(profiles.DEFAULT) is None
    assert deadlines.job_seconds(profiles.DEFAULT) == 600
    assert deadlines.role_seconds(profiles.DEFAULT, "creator", 450) == 300
    assert deadlines.role_seconds(profiles.DEFAULT, "critic", 65) == 65
    assert adapter.pipeline_instruction_hash("a"*64, "creator", execution_profile=profiles.DEFAULT) == "a"*64


def test_high_shared_clock_leaves_reviews_and_refuses_unreviewable_late_repair():
    assert deadlines.job_seconds(profiles.SOL_HIGH) == 900
    assert deadlines.role_seconds(profiles.SOL_HIGH, "creator", 900) == 600
    assert deadlines.role_seconds(profiles.SOL_HIGH, "creator", 400) == 100
    assert deadlines.role_seconds(profiles.SOL_HIGH, "creator", 300) == 0
    assert deadlines.role_seconds(profiles.SOL_HIGH, "critic", 300) == 150
    assert deadlines.role_seconds(profiles.SOL_HIGH, "critic", 150) == 0
    assert deadlines.role_seconds(profiles.SOL_HIGH, "coordinator", 80) == 80
    assert deadlines.role_seconds(profiles.SOL_HIGH, "coordinator", 0) == 0


@pytest.mark.parametrize("role", ["creator", "critic", "coordinator"])
def test_high_timing_changes_invalidate_instruction_pin_without_touching_models(monkeypatch, role):
    before = adapter.pipeline_instruction_hash("a"*64, role, execution_profile=profiles.SOL_HIGH)
    original = deadlines.policy
    monkeypatch.setattr(deadlines, "policy", lambda profile: {**original(profile), "job_seconds": 901})
    after = adapter.pipeline_instruction_hash("a"*64, role, execution_profile=profiles.SOL_HIGH)
    assert before != after
    assert adapter.pipeline_profile(role, execution_profile=profiles.SOL_HIGH)["model"] == "gpt-6.1-sol"


def test_unknown_profile_or_role_fails_closed():
    with pytest.raises(RunnerError):
        deadlines.job_seconds("customer-chosen")
    with pytest.raises(RunnerError):
        deadlines.role_seconds(profiles.SOL_HIGH, "customer-role", 900)


async def test_high_transport_gets_one_role_budget_with_setup_time_deducted(tmp_path, monkeypatch):
    import sys
    from pathlib import Path
    cfg = settings()
    for field, value in {"creation_execution_profile": profiles.SOL_HIGH, "control_mode": "local",
                         "environment": "local", "creation_runner_seconds": 300,
                         "creation_web_search_enabled": False}.items():
        monkeypatch.setattr(cfg, field, value)
    monkeypatch.setattr(adapter, "available", lambda: (Path(sys.executable), tmp_path))
    clock = iter([10., 12.])
    monkeypatch.setattr(adapter, "monotonic", lambda: next(clock))
    observed = []
    async def inert(*args, **kwargs):
        observed.append(kwargs["seconds"])
        raise RunnerError("provider_error")
    monkeypatch.setattr(adapter, "execute", inert)
    pin = adapter.role_instruction_hash("creator")
    context = {"expected_instruction_hash": pin, "permitted_web_actions": 0,
        "_expected_execution": {"model": "gpt-6.1-sol", "reasoning_effort": "high", "instruction_hash": pin}}
    async def authorized():
        return True
    with pytest.raises(RunnerError) as failure:
        await adapter.run_role(context, authorized, role="creator", seconds=900)
    assert failure.value.code == "provider_error" and observed == [598.]
