"""Inert owned Python children only: cancellation retains bounded accounting."""
import asyncio
import hashlib
import json
import sys

import pytest

from pinet_core.tasks import codex_transport as transport
from pinet_core.tasks.codex import child_environment, parse_trace


async def cancel_after_observed_lines(tmp_path, monkeypatch, rows, *, parse=parse_trace, partial=None):
    ready, children = asyncio.Event(), []
    create = asyncio.create_subprocess_exec

    async def owned_child(*args, **kwargs):
        child = await create(*args, **kwargs)
        children.append(child)
        return child

    monkeypatch.setattr(asyncio, "create_subprocess_exec", owned_child)
    output = tmp_path / "answer.private.json"
    observation = tmp_path / "execution.private.json"
    rows = [*rows, {"type": "fixture.ready"}]
    raw = ("\n".join(json.dumps(row) for row in rows)+"\n").encode()
    # A valid output file is already present, yet open pipes/process mean this
    # operation cannot succeed. No Codex, network, provider or child retry exists.
    code = ("import sys,time,pathlib;sys.stdin.read();"
        "pathlib.Path(sys.argv[1]).write_text('{\"answer\":\"CANARY_OUTPUT\",\"limitations\":[]}');"
        "sys.stdout.buffer.write("+repr(raw)+");sys.stdout.flush();time.sleep(30)")

    async def authorized():
        return True

    def event(row):
        if row.get("type") == "fixture.ready":
            ready.set()

    task = asyncio.create_task(transport.execute([sys.executable, "-I", "-S", "-B", "-c", code, str(output)],
        prompt="CANARY_PROMPT", cwd=tmp_path, env=child_environment(), output=output, seconds=10,
        still_authorized=authorized, parse_trace=parse, on_event=event, partial_receipt=partial,
        observation_file=observation))
    try:
        await asyncio.wait_for(ready.wait(), 5)
        assert len(children) == 1 and children[0].returncode is None and not task.done()
        task.cancel("synthetic external cancellation")
        with pytest.raises(asyncio.CancelledError) as failure:
            await task
        assert failure.value.args == ("synthetic external cancellation",) and task.cancelled()
        assert len(children) == 1 and children[0].returncode is not None
        state = json.loads(observation.read_text())
        assert state["outcome"] == "cancelled" and state["cleanup_completed"] is True
        assert state["parent_returncode_before_cleanup"] is None and state["stdout_eof_before_cleanup"] is False
        assert state["cleanup_kill_requested"] is True and state["output_exists_before_cleanup"] is True
        assert not any(not item.done() and item.get_coro().__qualname__.startswith("execute.<locals>.")
            for item in asyncio.all_tasks())
        assert "CANARY_" not in observation.read_text()
        return failure.value, raw
    finally:
        if not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        for child in children:
            await transport.stop_process(child)


async def test_cancel_after_complete_usage_preserves_sanitized_known_receipt_and_cleans_process(tmp_path, monkeypatch):
    usage = {"input_tokens": 11, "output_tokens": 5, "cached_input_tokens": 4, "reasoning_output_tokens": 2,
        "bool_tokens": True, "fraction_tokens": 1.5, "negative_tokens": -1, "huge_tokens": 1_000_000_001,
        "usd": 9, "private": "CANARY_RAW_USAGE"}
    rows = [{"type": "item.completed", "item": {"type": "agent_message", "text": "CANARY_MESSAGE"}},
        {"type": "turn.completed", "usage": usage}]
    failure, _ = await cancel_after_observed_lines(tmp_path, monkeypatch, rows)
    assert getattr(failure, "receipt", None) == {"input_tokens": 11, "output_tokens": 5,
        "cached_input_tokens": 4, "reasoning_output_tokens": 2}
    assert "CANARY_" not in json.dumps(failure.receipt)


@pytest.mark.parametrize("row", [
    {"type": "thread.started"}, {"type": "turn.completed"},
    {"type": "turn.completed", "usage": {"input_tokens": True, "output_tokens": -1}},
])
async def test_cancel_without_valid_usage_stays_unknown_without_token_zero(tmp_path, monkeypatch, row):
    failure, _ = await cancel_after_observed_lines(tmp_path, monkeypatch, [row])
    assert failure.receipt == {}


@pytest.mark.parametrize("tokens", [0, 1_000_000_000])
async def test_cancel_preserves_explicit_known_zero_and_maximum_tokens(tmp_path, monkeypatch, tokens):
    failure, _ = await cancel_after_observed_lines(tmp_path, monkeypatch,
        [{"type": "turn.completed", "usage": {"input_tokens": tokens}}])
    assert failure.receipt == {"input_tokens": tokens}


async def test_parse_failure_keeps_known_receipt_without_replacing_cancellation(tmp_path, monkeypatch):
    rows = [{"type": "turn.completed", "usage": {"input_tokens": 9}},
        {"type": "turn.failed", "error": {"message": "CANARY_PRIVATE_ERROR"}}]
    failure, _ = await cancel_after_observed_lines(tmp_path, monkeypatch, rows)
    assert failure.receipt == {"input_tokens": 9}


async def test_cancel_preserves_opt_in_pipeline_receipt_shape_without_raw_content(tmp_path, monkeypatch):
    from pinet_core.creation.adapter import Trace

    trace = Trace(False)
    rows = [{"type": "turn.completed", "usage": {"input_tokens": 8, "output_tokens": 3}}]
    failure, raw = await cancel_after_observed_lines(tmp_path, monkeypatch, rows,
        parse=trace.parse, partial=trace.partial_receipt)
    assert failure.receipt == {"usage": {"input_tokens": 8, "output_tokens": 3},
        "web_search_count": 0, "trace_sha256": hashlib.sha256(raw).hexdigest()}
