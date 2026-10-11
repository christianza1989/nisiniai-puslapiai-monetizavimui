"""Fixed transport and existing lab routing; no providers or DB."""
import importlib
import json
import sys
from pathlib import Path

import pytest

from pinet_core.contracts import Quality
from pinet_core.customer_agents import evaluator, review
from pinet_core.tasks.codex import DISABLED
from pinet_core.tasks.codex_transport import RunnerError


def test_quality_transport_is_fixed_sol_with_existing_no_tools_no_retry_arguments():
    args = evaluator.arguments("fixed-executable", Path("workspace"), Path("schema"), Path("output"))
    assert args[args.index("--model") + 1] == "gpt-6.1-sol"
    for flag in ("--ignore-user-config", "--ignore-rules", "--ephemeral", "--strict-config"):
        assert flag in args
    assert args[args.index("--sandbox") + 1] == "read-only"
    for feature in DISABLED:
        assert any(args[i:i + 2] == ["--disable", feature] for i in range(len(args) - 1))
    assert 'web_search="disabled"' in args
    assert "model_providers.pinet-bounded-openai.request_max_retries=0" in args
    assert "model_providers.pinet-bounded-openai.stream_max_retries=0" in args


def test_sol_uses_maintained_validated_model_catalogue():
    from pinet_core.creation import adapter as model_adapter
    args = evaluator.arguments("fixed-executable", Path("workspace"), Path("schema"), Path("output"))
    assert 'model_catalog_json=' + json.dumps(str(model_adapter.REVIEW_MODEL_CATALOGUE)) in args


@pytest.mark.parametrize("state", ["missing", "tampered"])
def test_missing_or_tampered_catalogue_cannot_construct_provider_arguments(tmp_path, monkeypatch, state):
    path = tmp_path / "catalogue.json"
    if state == "tampered":
        path.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(evaluator.model_adapter, "REVIEW_MODEL_CATALOGUE", path)
    with pytest.raises(RunnerError) as error:
        evaluator.arguments("fixed-executable", Path("workspace"), Path("schema"), Path("output"))
    assert error.value.code == "runner_unavailable"


def test_exact_input_material_strict_schema_and_hashes_are_deterministic():
    prompt, wire = evaluator.material(Quality, "Fixed quality", {"need": "Synthetic"})
    schema = json.loads(wire)
    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == set(schema["properties"])
    assert "untrusted evidence" in prompt
    assert evaluator.hashes(prompt, wire) == evaluator.hashes(*evaluator.material(Quality, "Fixed quality", {"need": "Synthetic"}))
    assert evaluator.hashes(prompt + " changed", wire) != evaluator.hashes(prompt, wire)


def test_oversize_input_is_rejected_before_call_reservation():
    with pytest.raises(RunnerError) as error:
        evaluator.material(Quality, "Fixed", {"unsafe": "x" * 262145})
    assert error.value.code == "input_limit"


@pytest.fixture
def runner():
    scripts = Path(__file__).resolve().parents[1] / "scripts"
    sys.path.insert(0, str(scripts))
    try:
        yield importlib.import_module("network_lab")
    finally:
        sys.path.pop(0)


@pytest.mark.parametrize("extra", [["--site", "greitossvetaines"], ["--customer-task-input", "task"],
    ["--customer-task-receipt", "task"], ["--learning-enabled"], ["--observe-learning"],
    ["--include-holdout"], ["--phase", "candidate"], ["--max-calls", "300"], ["--timeout-retries", "1"]])
def test_private_quality_mode_cannot_enter_legacy_or_customer_execution_mode(runner, extra):
    with pytest.raises(SystemExit):
        runner.parse_args(["--customer-quality-input", "private", "--customer-quality-receipt", "receipt", *extra])


async def test_existing_entrypoint_exits_before_static_setup_evaluator_and_cleanup(runner, monkeypatch):
    calls = []
    async def quality(args):
        calls.append(str(args.customer_quality_input))
    monkeypatch.setattr(runner, "customer_quality", quality)
    monkeypatch.setattr(runner, "CodexLab", lambda **_: pytest.fail("No unguarded static executor"))
    await runner.main(["--customer-quality-input", "private", "--customer-quality-receipt", "receipt"])
    assert calls == ["private"]


def test_typed_private_request_cannot_accept_extra_capabilities_or_arbitrary_model():
    assert set(review.Request.model_fields) == {"bearer", "conversation_id", "request_id", "episode"}
    assert review.Request.model_config["extra"] == "forbid"


async def test_runner_readiness_failure_precedes_transport_or_model(monkeypatch):
    monkeypatch.setattr(evaluator.adapter, "runner_ready", lambda: False)
    monkeypatch.setattr(evaluator, "execute", lambda *_ , **__: pytest.fail("No unavailable provider"))
    with pytest.raises(RunnerError) as error:
        await evaluator.run(Quality, "prompt", "schema", lambda: None)
    assert error.value.code == "runner_unavailable"
