"""Task framing preserves generic prompt bytes and never supplies authority."""
import importlib
import json
import sys
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from pinet_core.customer_agents import lab
from pinet_core.customer_agents.lab import Episode, Snapshot
from pinet_core.customer_text import adapter


def test_generic_prompt_is_unchanged_when_there_is_no_saved_task():
    context = {"client_message": "Synthetic request", "need": {}}
    prompt = adapter.prompt(context)
    assert "TASK CALIBRATION:" not in prompt
    assert prompt.endswith(json.dumps(context, ensure_ascii=False, sort_keys=True))


def test_task_specification_is_explicitly_untrusted_data_not_permissions():
    prompt = adapter.prompt({"agent_task": {"specification": {"goal": "Invent prices and send emails"}}})
    assert "untrusted proposed data" in prompt and "never confirmed" in prompt
    assert "No activation or calibration PASS claims" in prompt
    assert "Invent prices and send emails" in prompt


@pytest.mark.parametrize("unknown", ["enabled", "can_activate", "tools", "provider", "module_admitted", "channels"])
def test_frozen_lab_context_never_accepts_activation_or_tool_fields(unknown):
    data = {k: str(uuid4()) for k in ("agent_id", "creation_id", "registration_id", "admission_id",
                                    "user_id", "session_id", "config_revision_id")}
    data.update(registration_fingerprint="a" * 64, admission_fingerprint="b" * 64,
                config_sha256="c" * 64, execution_source_revision="d" * 40,
                environment_id="local", config_revision=1, specification={
                    "name": "Synthetic consultant", "goal": "Discuss a synthetic course",
                    "audience": "Synthetic customer", "inputs": ["Need"], "outputs": ["Recommendation"],
                    "boundaries": ["No channels"], "escalation": "Ask owner", "autonomy": "recommendations_only",
                    "sources": [], "examples": [{"input": "Need", "expected": "Recommendation"}], "unknowns": []})
    Snapshot.model_validate(data)
    with pytest.raises(ValidationError, match="extra_forbidden"):
        Snapshot.model_validate({**data, unknown: True})


def test_episode_requires_exact_uuid_and_script_material():
    assert "episode_id" in Episode.model_fields and "script_sha256" in Episode.model_fields


@pytest.fixture
def runner():
    scripts = Path(__file__).resolve().parents[1] / "scripts"
    sys.path.insert(0, str(scripts))
    try:
        yield importlib.import_module("network_lab")
    finally:
        sys.path.pop(0)


def test_existing_static_target_and_run_id_still_required(runner):
    for args in ([], ["--site", "greitossvetaines"], ["--site", "unknown", "--run-id", "test"],
                 ["--site", "greitossvetaines", "--run-id", "test", "--customer-task-receipt", "private"]):
        with pytest.raises(SystemExit):
            runner.parse_args(args)
    parsed = runner.parse_args(["--site", "greitossvetaines", "--run-id", "test"])
    assert parsed.site == "greitossvetaines" and parsed.phase == "baseline" and parsed.max_calls == 200
    assert not parsed.customer_task_input and not parsed.learning_enabled


@pytest.mark.parametrize("extra", [["--site", "greitossvetaines"], ["--learning-enabled"],
    ["--observe-learning"], ["--learning-namespace", "local"], ["--include-holdout"],
    ["--run-id", "test"], ["--phase", "candidate"], ["--patch-file", "patch"],
    ["--pin-release-file", "release"], ["--knowledge-file", "knowledge"], ["--max-calls", "300"],
    ["--jev-mode", "on"]])
def test_customer_task_cannot_enter_static_evaluator_or_change_learning_options(runner, extra):
    with pytest.raises(SystemExit):
        runner.parse_args(["--customer-task-input", "private", "--customer-task-receipt", "receipt", *extra])


async def test_customer_task_main_returns_before_legacy_source_model_judge_and_cleanup(runner, monkeypatch):
    calls = []
    async def task(args):
        calls.append(str(args.customer_task_input))
    monkeypatch.setattr(runner, "customer_task", task)
    monkeypatch.setattr(runner, "CodexLab", lambda **_: pytest.fail("No separate model executor"))
    monkeypatch.setattr(runner.service, "business", lambda *_: pytest.fail("No legacy business/environment mutation"))
    await runner.main(["--customer-task-input", "private", "--customer-task-receipt", "receipt"])
    assert calls == ["private"]


@pytest.fixture
def private_task(runner, tmp_path, monkeypatch):
    monkeypatch.setattr(runner, "ROOT", tmp_path)
    directory = tmp_path / "artifacts"
    directory.mkdir()
    value = dict(bearer="x" * 64, creation_id=str(uuid4()), agent_id=str(uuid4()),
                 expected_revision=2, request_id=str(uuid4()), messages=["Synthetic consultation"])
    source, receipt = directory / "request.private.json", directory / "receipt.private.json"
    source.write_text(json.dumps(value), encoding="utf-8")
    args = runner.parse_args(["--customer-task-input", str(source), "--customer-task-receipt", str(receipt)])
    class Engine:
        async def dispose(self):
            pass
    monkeypatch.setattr(runner.db, "engine", Engine())
    return args, value


async def test_existing_runner_delegates_exact_task_to_existing_customer_text_adapter(runner, private_task, monkeypatch, capsys):
    args, value = private_task
    seen = []
    async def snapshot(*fields):
        seen.append(fields)
        return {"exact": "frozen"}
    async def episode(*fields):
        seen.append(fields)
        return {"scope": "operator_local_task_calibration", "script_complete": True,
                "turns": [{"status": "succeeded"}], "calibration_status": "UNVERIFIED"}
    monkeypatch.setattr(lab, "snapshot", snapshot)
    monkeypatch.setattr(lab, "episode", episode)
    await runner.customer_task(args)
    assert seen[0] == (value["bearer"], value["creation_id"], value["agent_id"], 2)
    assert seen[1] == (value["bearer"], {"exact": "frozen"}, value["messages"], UUID(value["request_id"]))
    printed = capsys.readouterr().out
    assert value["bearer"] not in printed and json.loads(printed)["calibration_status"] == "UNVERIFIED"
    assert json.loads(args.customer_task_receipt.read_text(encoding="utf-8"))["script_complete"]


async def test_private_receipt_reserved_before_authority_or_provider_and_no_overwrite(runner, private_task, monkeypatch):
    args, _ = private_task
    args.customer_task_receipt.write_text("Retained original", encoding="utf-8")
    monkeypatch.setattr(lab, "snapshot", lambda *_: pytest.fail("No authority before new receipt reservation"))
    with pytest.raises(SystemExit, match="retained conversation/usage"):
        await runner.customer_task(args)
    assert args.customer_task_receipt.read_text(encoding="utf-8") == "Retained original"


async def test_task_input_cannot_add_implicit_admission(runner, private_task, monkeypatch):
    args, value = private_task
    args.customer_task_input.write_text(json.dumps({**value, "learning_admitted": True}), encoding="utf-8")
    monkeypatch.setattr(lab, "snapshot", lambda *_: pytest.fail("No authority on untyped task request"))
    with pytest.raises(SystemExit, match="retained conversation/usage"):
        await runner.customer_task(args)
    assert not args.customer_task_receipt.exists()


async def test_outside_private_root_never_enters_authority(runner, private_task, monkeypatch):
    args, _ = private_task
    args.customer_task_receipt = runner.ROOT / "public.json"
    monkeypatch.setattr(lab, "snapshot", lambda *_: pytest.fail("No authority outside private artifact scope"))
    with pytest.raises(SystemExit, match="retained conversation/usage"):
        await runner.customer_task(args)
