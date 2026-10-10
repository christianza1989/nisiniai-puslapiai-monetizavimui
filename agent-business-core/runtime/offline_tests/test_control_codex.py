import json

import pytest

from pinet_core.tasks.codex import (
    DISABLED,
    RunnerError,
    arguments,
    child_environment,
    normalize_answer,
    parse_trace,
)


def test_owner_runner_arguments_and_environment_strip_secrets(monkeypatch):
    monkeypatch.setenv("PINET_DATABASE_URL", "synthetic-private-db")
    monkeypatch.setenv("OPENAI_API_KEY", "synthetic-no-provider-fallback")
    monkeypatch.setenv("CODEX_HOME", "synthetic-no-auth-pool")
    env = child_environment()
    assert not set(env) & {"PINET_DATABASE_URL", "OPENAI_API_KEY", "CODEX_HOME"}
    args = arguments("fixed.exe", "fixed", "schema.json", "out.json")
    assert args[args.index("--model")+1] == "gpt-6-luna"
    assert args[args.index("--sandbox")+1] == "read-only"
    assert "--ignore-user-config" in args and "--ignore-rules" in args and "--ephemeral" in args
    assert {args[i+1] for i, a in enumerate(args[:-1]) if a == "--disable"} == set(DISABLED)


@pytest.mark.parametrize("kind", ["command_execution", "mcp_tool_call", "web_search", "file_change", "unknown"])
def test_any_tool_or_unknown_item_rejects_result(kind):
    with pytest.raises(RunnerError) as error:
        parse_trace(json.dumps({"type": "item.completed", "item": {"type": kind}}))
    assert error.value.code == "tool_attempted"


def test_usage_unknown_and_model_failure_are_truthful():
    assert parse_trace('{"type":"turn.completed"}') is None
    assert parse_trace('{"type":"turn.completed","usage":{"input_tokens":12,"output_tokens":true,"usd":0}}') == {"input_tokens": 12}
    with pytest.raises(RunnerError) as error:
        parse_trace('{"type":"error","message":"Model not supported"}')
    assert error.value.code == "model_unavailable"


@pytest.mark.parametrize("value", [{"answer": " ", "limitations": []}, {"answer": "x", "limitations": [], "shell": "x"},
                                   {"answer": 3, "limitations": []}, {"answer": "x", "limitations": ["x"*301]}])
def test_structured_result_bounds(value):
    with pytest.raises(RunnerError) as error:
        normalize_answer(value)
    assert error.value.code == "output_invalid"
