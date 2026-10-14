"""Explicit deployment profile tests; never override a model function or pay a provider."""
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from pinet_core.config import settings
from pinet_core.creation import adapter
from pinet_core.creation import execution_profiles as profiles
from pinet_core.creation.team_wire import AttemptView

TEST_PROFILE = "local_sol61_high_v1"


@pytest.mark.parametrize("role", ["creator", "critic", "coordinator"])
def test_explicit_local_profile_actual_argv_is_sol_high(monkeypatch, role):
    monkeypatch.setenv("PINET_CREATION_EXECUTION_PROFILE", TEST_PROFILE)
    settings.cache_clear()
    try:
        args = adapter.arguments("fixed", "workspace", "schema", "output", web=False,
            role=role, execution_profile=TEST_PROFILE)
        assert args[args.index("--model")+1] == "gpt-6.1-sol"
        assert 'model_reasoning_effort="high"' in args
    finally:
        settings.cache_clear()


def test_wire_can_represent_known_sol_creator_without_browser_profile_fields():
    value = dict(attempt_id=uuid4(), job_id=uuid4(), sequence=1, role="creator", round_number=1,
        stage="private_draft", state="reserved", source_revision="a"*40, instruction_hash="b"*64,
        model="gpt-6.1-sol", created_at=datetime.now(UTC))
    assert AttemptView.model_validate(value).model == "gpt-6.1-sol"


def test_native_guide_wire_can_represent_the_bound_sol_creator():
    from pinet_core.content_work.wire import AttemptView as GuideAttemptView
    value = dict(attempt_id=uuid4(), sequence=1, role="creator", round_number=1,
        stage="content", source_revision="a"*40, instruction_sha256="b"*64,
        model="gpt-6.1-sol", created_at=datetime.now(UTC))
    assert GuideAttemptView.model_validate(value).model == "gpt-6.1-sol"


@pytest.mark.parametrize("mode,environment", [("hosted", "test-profile"), ("local", "production"), ("hosted", "production")])
def test_test_profile_is_denied_for_hosted_or_production(monkeypatch, mode, environment):
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.SOL_HIGH)
    monkeypatch.setattr(cfg, "control_mode", mode)
    monkeypatch.setattr(cfg, "environment", environment)
    with pytest.raises(adapter.RunnerError, match="runner_unavailable"):
        adapter.arguments("fixed", "workspace", "schema", "output", web=False, execution_profile=profiles.SOL_HIGH)


def test_pipeline_fingerprints_change_but_unrelated_legacy_profile_and_argv_do_not(monkeypatch):
    from pinet_core.business_discovery import adapter as discovery
    from pinet_core.content_work import adapter as guides
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.DEFAULT)
    legacy = {role: (adapter.role_profile(role), adapter.arguments("fixed", "workspace", "schema", "output", web=False, role=role))
        for role in ("creator", "critic", "coordinator")}
    hashes = (adapter.team_instruction_hash(), discovery.fingerprint(), guides.execution_hash())
    role_hashes = {role: adapter.role_instruction_hash(role) for role in legacy}
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.SOL_HIGH)
    assert all(before != after for before, after in zip(hashes,
        (adapter.team_instruction_hash(), discovery.fingerprint(), guides.execution_hash()), strict=True))
    for role, (profile, arguments) in legacy.items():
        assert adapter.role_profile(role) == profile
        assert adapter.arguments("fixed", "workspace", "schema", "output", web=False, role=role) == arguments
        assert adapter.role_instruction_hash(role) != role_hashes[role]
        assert adapter.pipeline_profile(role)["model"] == "gpt-6.1-sol"
        assert adapter.pipeline_profile(role)["reasoning_effort"] == "high"
    from pinet_core.customer_agents import evaluator
    assert evaluator.profile()["reasoning_effort"] == "medium"


@pytest.mark.parametrize("role", ["creator", "critic", "coordinator"])
@pytest.mark.parametrize("failed", [False, True])
async def test_real_argument_builder_and_private_receipt_keep_captured_sol_high(tmp_path, monkeypatch, role, failed):
    import json
    import sys

    from test_creation_review import draft, report
    monkeypatch.setattr(settings(), "creation_execution_profile", profiles.SOL_HIGH)
    monkeypatch.setattr(adapter, "available", lambda: (sys.executable, tmp_path))
    context = {"expected_instruction_hash": adapter.role_instruction_hash(role), "permitted_web_actions": 0}
    if role != "creator":
        context = {"draft": draft.__wrapped__(), "stage": "private_draft", "round_number": 1, "receipts": []}
        if role == "coordinator":
            context["critic"] = report(context["draft"])
    context["_expected_execution"] = {"model": "gpt-6.1-sol", "reasoning_effort": "high",
        "instruction_hash": adapter.role_instruction_hash(role)}
    async def execute(argv, **kwargs):
        assert argv[argv.index("--model")+1] == "gpt-6.1-sol"
        assert 'model_reasoning_effort="high"' in argv
        assert "_expected_execution" not in kwargs["prompt"]
        # Simulated config drift after dispatch must never relabel the observed model.
        monkeypatch.setattr(settings(), "creation_execution_profile", profiles.DEFAULT)
        if failed:
            raise adapter.RunnerError("provider_error")
        if role == "creator":
            from test_creation_content_plan import planned
            value = planned(draft.__wrapped__())
        elif role == "critic":
            from test_creation_compact_review import compact
            value = compact(context["draft"])
        else:
            value = {}
        return value, {"usage": {"input_tokens": 1, "output_tokens": 1}}
    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    if failed:
        with pytest.raises(adapter.RunnerError, match="provider_error") as error:
            await adapter.run_role(context, authorized, role=role, seconds=30)
        receipt = error.value.receipt
        stored = json.loads(next(tmp_path.glob("business-*/failure.private.json")).read_text("utf8"))
        assert stored["model"] == "gpt-6.1-sol"
    else:
        _, receipt = await adapter.run_role(context, authorized, role=role, seconds=30)
    assert receipt["model"] == "gpt-6.1-sol" and receipt["reasoning_effort"] == "high"


@pytest.mark.parametrize("stage", ["discovery", "guide"])
@pytest.mark.parametrize("role", ["creator", "critic", "coordinator"])
async def test_pipeline_stage_failed_dispatch_keeps_captured_profile(tmp_path, monkeypatch, stage, role):
    import json
    import sys

    from pinet_core.business_discovery import adapter as discovery
    from pinet_core.content_work import adapter as guide
    chosen = discovery if stage == "discovery" else guide
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_execution_profile", profiles.SOL_HIGH)
    monkeypatch.setattr(cfg, "control_mode", "local")
    monkeypatch.setattr(cfg, "environment", "test-profile")
    monkeypatch.setattr(chosen, "available", lambda: (sys.executable, tmp_path))
    if stage == "discovery":
        context = {"expected_instruction_hash": discovery.instructions(role)[1], "candidate_sha256": "a"*64}
    else:
        from test_content_work_review import critic, output
        candidate = output()
        receipts = guide.review.observations(candidate)
        report = critic(candidate, receipts)
        prepared = {"instructionHash": "a"*64, "instructions": "Sintetinės gido instrukcijos.", "outputSchema": {"type": "object"}}
        context = {"prepared": prepared, "expected_instruction_hash": guide.instruction_hash(role, prepared),
            "expected_model": "gpt-6.1-sol", "review": {"allowed_finding_refs": ["draft:/title"],
                "receipts": receipts, "critic": report, "critic_sha256": guide.review.shared.canonical_sha256(report),
                "draft_sha256": guide.review.shared.canonical_sha256(candidate), "stage": "content", "round_number": 1}}
    async def execute(argv, **kwargs):
        assert argv[argv.index("--model")+1] == "gpt-6.1-sol"
        assert 'model_reasoning_effort="high"' in argv
        monkeypatch.setattr(cfg, "creation_execution_profile", profiles.DEFAULT)
        raise adapter.RunnerError("provider_error", {"usage": {"input_tokens": 1}})
    monkeypatch.setattr(chosen, "execute", execute)
    async def authorized():
        return True
    with pytest.raises(adapter.RunnerError, match="provider_error") as error:
        await chosen.run_role(context, authorized, role=role, seconds=600 if stage == "discovery" else 30)
    assert error.value.receipt["model"] == "gpt-6.1-sol"
    assert error.value.receipt["reasoning_effort"] == "high"
    assert error.value.receipt["instruction_hash"] == context["expected_instruction_hash"]
    assert error.value.receipt["usage"] == {"input_tokens": 1}
    stored = json.loads(next(tmp_path.glob("*/failure.private.json")).read_text("utf8"))
    assert stored["receipt"]["model"] == "gpt-6.1-sol"
    assert stored["receipt"]["reasoning_effort"] == "high"
