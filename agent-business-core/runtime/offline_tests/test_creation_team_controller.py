"""No provider: shared transport retains actually observed terminal usage before later failure."""
import asyncio
import json
import sys

import pytest

from pinet_core.creation.adapter import Trace
from pinet_core.tasks.codex_transport import RunnerError, execute


@pytest.mark.parametrize("mode", ["nonzero", "invalid_output", "timeout_after_usage"])
async def test_failed_owned_process_preserves_terminal_usage(tmp_path, mode):
    output = tmp_path / "output.private.json"
    script = ("import sys,json,time;sys.stdin.read();"
              "print(json.dumps({'type':'turn.completed','usage':{'input_tokens':17,'output_tokens':4}}),flush=True);")
    script += {"nonzero": "sys.exit(1)", "invalid_output": "sys.exit(0)",
               "timeout_after_usage": "time.sleep(10)"}[mode]
    async def authorized():
        return True
    with pytest.raises(RunnerError) as error:
        await execute([sys.executable, "-c", script], prompt="Synthetic no-provider process test", cwd=tmp_path,
            env=None, output=output, seconds=2, still_authorized=authorized, parse_trace=Trace(False).parse)
    assert error.value.code == {"nonzero": "provider_error", "invalid_output": "output_invalid",
                               "timeout_after_usage": "run_timeout"}[mode]
    assert error.value.receipt["usage"] == {"input_tokens": 17, "output_tokens": 4}


@pytest.mark.parametrize("event,code", [
    ({"type": "error", "message": "Reconnecting... 2/5 (Incomplete response returned, reason: max_output_tokens)"},
     "provider_error"),
    ({"type": "item.completed", "item": {"type": "error", "message": "stream disconnected"}}, "provider_error"),
    ({"type": "item.completed", "item": {"type": "error", "message": "Model not supported"}}, "model_unavailable"),
    ({"type": "item.started", "item": {"type": "command_execution"}}, "tool_attempted"),
    ("{invalid}", "output_invalid"),
])
@pytest.mark.parametrize("completed_usage", [False, True])
async def test_owned_child_stops_on_terminal_error_before_later_output(monkeypatch, tmp_path, event, code, completed_usage):
    output, trace_file = tmp_path / "output.private.json", tmp_path / "trace.private.jsonl"
    prior = {"type":"turn.completed", "usage":{"input_tokens":17,"output_tokens":4}}
    encoded = (json.dumps(prior) + "\n" if completed_usage else "") + (event if isinstance(event, str) else json.dumps(event))
    script = ("import sys,time;from pathlib import Path;sys.stdin.read();"
              "print(sys.argv[1],flush=True);time.sleep(8);Path(sys.argv[2]).write_text('{}')")
    children, create = [], asyncio.create_subprocess_exec
    async def owned_child(*args, **kwargs):
        child = await create(*args, **kwargs)
        children.append(child)
        return child
    monkeypatch.setattr(asyncio, "create_subprocess_exec", owned_child)
    async def authorized():
        return True
    trace = Trace(False)
    with pytest.raises(RunnerError) as error:
        await asyncio.wait_for(execute([sys.executable, "-c", script, encoded, str(output)],
            prompt="Synthetic process error, no provider", cwd=tmp_path, env=None, output=output, seconds=6,
            still_authorized=authorized, parse_trace=trace.parse, on_event=trace.event, trace_file=trace_file), timeout=4)
    assert error.value.code == code
    assert error.value.receipt == ({"usage":{"input_tokens":17,"output_tokens":4},"web_search_count":0}
                                  if completed_usage else {})
    assert children and children[0].returncode is not None and not output.exists()
    assert trace_file.read_text("utf-8").strip() == encoded
    assert not trace.searches
