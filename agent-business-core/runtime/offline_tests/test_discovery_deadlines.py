"""Actual fixed adapter budget builder; injected execute never pays a provider."""
import sys

import pytest

from pinet_core.business_discovery import adapter
from pinet_core.config import settings
from pinet_core.creation import execution_profiles as profiles
from pinet_core.tasks.codex_transport import RunnerError


@pytest.mark.parametrize("role,remaining,expected", [("creator", 900, 660), ("creator", 800, 620),
    ("creator", 600, 420), ("critic", 600, 90),
    ("coordinator", 600, 90), ("creator", 400, 220), ("critic", 100, 10), ("coordinator", 40, 40)])
async def test_high_discovery_dispatch_clips_to_one_deadline_with_review_reserves(tmp_path, monkeypatch, role, remaining, expected):
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.SOL_HIGH)
    monkeypatch.setattr(cfg, "creation_runner_seconds", 300)
    monkeypatch.setattr(adapter, "available", lambda: (sys.executable, tmp_path))
    monkeypatch.setattr(adapter, "monotonic", lambda: 0)
    captured = []
    async def execute(argv, **kwargs):
        captured.append(kwargs["seconds"])
        assert argv[argv.index("--model")+1] == "gpt-6.1-sol"
        raise RunnerError("provider_error")
    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    with pytest.raises(RunnerError, match="provider_error"):
        await adapter.run_role({"expected_instruction_hash": adapter.instructions(role)[1],
            "candidate_sha256": "a"*64}, authorized, role=role, seconds=remaining)
    assert captured == [expected]


@pytest.mark.parametrize("role", ["creator", "critic", "coordinator"])
async def test_default_discovery_keeps_original_cap_and_setup_subtraction(tmp_path, monkeypatch, role):
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.DEFAULT)
    monkeypatch.setattr(cfg, "creation_runner_seconds", 180)
    monkeypatch.setattr(adapter, "available", lambda: (sys.executable, tmp_path))
    times = iter([0, 3])
    monkeypatch.setattr(adapter, "monotonic", lambda: next(times))
    captured = []
    async def execute(argv, **kwargs):
        captured.append(kwargs["seconds"])
        raise RunnerError("provider_error")
    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    with pytest.raises(RunnerError, match="provider_error"):
        await adapter.run_role({"expected_instruction_hash": adapter.instructions(role)[1],
            "candidate_sha256": "a"*64}, authorized, role=role, seconds=600)
    assert captured == [177]


def test_only_high_discovery_fingerprint_includes_timing_policy(monkeypatch):
    from pinet_core.content_work import adapter as guide
    from pinet_core.creation import adapter as creation
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.DEFAULT)
    defaults = (adapter.fingerprint(), creation.team_instruction_hash(), guide.execution_hash())
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.SOL_HIGH)
    before = (adapter.fingerprint(), creation.team_instruction_hash(), guide.execution_hash())
    real = adapter.deadlines.policy
    def changed(profile):
        value = real(profile)
        return {**value, "creator_seconds": 419} if value else None
    monkeypatch.setattr(adapter.deadlines, "policy", changed)
    after = (adapter.fingerprint(), creation.team_instruction_hash(), guide.execution_hash())
    assert before[0] != after[0] and before[1:] == after[1:]
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.DEFAULT)
    assert defaults == (adapter.fingerprint(), creation.team_instruction_hash(), guide.execution_hash())


@pytest.mark.parametrize("profile,seconds,expected", [(profiles.DEFAULT, 180, 360),
    (profiles.DEFAULT, 300, 600), (profiles.SOL_HIGH, 180, 900), (profiles.SOL_HIGH, 300, 900)])
def test_job_budget_preserves_default_and_fixes_only_selected_discovery(profile, seconds, expected, monkeypatch):
    monkeypatch.setattr(settings(), "creation_runner_seconds", seconds)
    assert adapter.deadlines.job_seconds(profile) == expected


async def test_old_v1_high_snapshot_cannot_dispatch_under_measured_v2_policy(tmp_path, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.SOL_HIGH)
    monkeypatch.setattr(adapter, "available", lambda: (sys.executable, tmp_path))
    current = adapter.deadlines.policy
    def historical(profile):
        value = current(profile)
        return {**value, "revision": "local-high-discovery-deadline.v1", "job_seconds": 600,
                "creator_seconds": 420} if value else None
    monkeypatch.setattr(adapter.deadlines, "policy", historical)
    old_pin = adapter.instructions("creator")[1]
    monkeypatch.setattr(adapter.deadlines, "policy", current)
    dispatched = []
    async def execute(*args, **kwargs):
        dispatched.append(True)
        raise AssertionError("An old timing snapshot must fail before provider dispatch")
    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    with pytest.raises(RunnerError, match="instructions_changed"):
        await adapter.run_role({"expected_instruction_hash": old_pin}, authorized, role="creator", seconds=900)
    assert not dispatched
