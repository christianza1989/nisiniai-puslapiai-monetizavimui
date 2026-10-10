import asyncio
import hashlib
import json
import sys
from pathlib import Path

import pytest

from pinet_core.config import settings
from pinet_core.tasks import codex
from pinet_core.tasks.codex import (
    DISABLED,
    RunnerError,
    arguments,
    check_trace_event,
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


@pytest.mark.parametrize("event,code", [
    ({"type": "item.completed", "item": {"type": "error", "message": "stream disconnected"}}, "provider_error"),
    ({"type": "item.completed", "item": {"type": "error", "message": "Model not supported"}}, "model_unavailable"),
    ({"type": "error", "message": "Reconnecting... reason: max_output_tokens"}, "provider_error"),
    ({"type": "turn.failed", "error": {"message": "stream disconnected"}}, "provider_error"),
])
def test_cli_error_is_not_a_tool_and_never_accepts_partial_completion(event, code):
    with pytest.raises(RunnerError) as error:
        parse_trace(json.dumps(event))
    assert error.value.code == code and error.value.receipt == {}
    with pytest.raises(RunnerError) as error:
        parse_trace(json.dumps({"type": "turn.completed", "usage": {"input_tokens": 12}}) + "\n" + json.dumps(event))
    assert error.value.code == code and error.value.receipt == {"input_tokens": 12}


def test_network_reconnect_notice_can_finish_without_fabricated_usage():
    raw = '\n'.join(json.dumps(event) for event in [
        {"type": "error", "message": "Reconnecting... connection reset"},
        {"type": "item.completed", "item": {"type": "agent_message", "text": "Complete response"}},
        {"type": "turn.completed"},
    ])
    assert parse_trace(raw) is None
    with pytest.raises(RunnerError, match="tool_attempted"):
        check_trace_event({"type": "error", "item": {"type": "command_execution", "message": "not supported"}})


@pytest.mark.parametrize("event", [[], {"item": None}, {"item": []}])
def test_malformed_trace_is_bounded_output_failure(event):
    with pytest.raises(RunnerError, match="output_invalid"):
        parse_trace(json.dumps(event))


@pytest.mark.parametrize("value", [{"answer": " ", "limitations": []}, {"answer": "x", "limitations": [], "shell": "x"},
                                   {"answer": 3, "limitations": []}, {"answer": "x", "limitations": ["x"*301]}])
def test_structured_result_bounds(value):
    with pytest.raises(RunnerError) as error:
        normalize_answer(value)
    assert error.value.code == "output_invalid"


async def test_deadline_covers_child_that_never_reads_stdin(monkeypatch, tmp_path):
    cfg = settings()
    monkeypatch.setattr(cfg, "chat_runner_enabled", True)
    monkeypatch.setattr(cfg, "chat_codex_executable", sys.executable)
    monkeypatch.setattr(cfg, "chat_codex_sha256", hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest())
    monkeypatch.setattr(cfg, "chat_workspace", str(tmp_path))
    monkeypatch.setattr(cfg, "chat_runner_seconds", 10)
    monkeypatch.setattr(codex, "arguments", lambda *_: [sys.executable, "-c", "import time; time.sleep(60)"])
    children = []
    create = asyncio.create_subprocess_exec
    async def owned_child(*args, **kwargs):
        child = await create(*args, **kwargs)
        children.append(child)
        return child
    monkeypatch.setattr(asyncio, "create_subprocess_exec", owned_child)
    async def authorized():
        return True
    try:
        with pytest.raises(RunnerError) as error:
            # Synthetic pipe backpressure only. No Codex/model, auth, DB or customer data.
            await asyncio.wait_for(codex.run({"message": "x"*262144}, authorized), timeout=14)
        assert error.value.code == "run_timeout"
        assert children and children[0].returncode is not None
    finally:
        for child in children:
            await codex.stop_process(child)


@pytest.mark.parametrize("permitted", [True, False])
async def test_process_pumps_structured_completion_and_authority_stop(monkeypatch, tmp_path, permitted):
    cfg = settings()
    for key, value in {"chat_runner_enabled": True, "chat_codex_executable": sys.executable,
                       "chat_codex_sha256": hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest(),
                       "chat_workspace": str(tmp_path), "chat_runner_seconds": 10}.items():
        monkeypatch.setattr(cfg, key, value)
    script = ("import sys,json,time; from pathlib import Path; "
              "sys.stdin.read(); time.sleep(.2); "
              "Path(sys.argv[1]).write_text(json.dumps({'answer':'Synthetic process answer','limitations':[]})); "
              "print(json.dumps({'type':'turn.completed','usage':{'input_tokens':7}}))")
    monkeypatch.setattr(codex, "arguments", lambda _e, _w, _s, output: [sys.executable, "-c", script, str(output)])
    async def authorized():
        return permitted
    if permitted:
        result, usage = await codex.run({"message": "Synthetic no-provider process test"}, authorized)
        assert result == {"answer": "Synthetic process answer", "limitations": []}
        assert usage == {"input_tokens": 7}
    else:
        with pytest.raises(RunnerError) as error:
            await codex.run({"message": "x"*262144}, authorized)
        assert error.value.code == "authorization_revoked"
    assert not list(tmp_path.glob("consult-*"))
