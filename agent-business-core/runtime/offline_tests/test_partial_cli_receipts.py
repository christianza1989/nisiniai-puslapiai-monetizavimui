"""Only inert owned Python children; no CLI/provider or actual private trace inputs."""
import hashlib
import inspect
import json
import os
import sys

import pytest

from pinet_core.creation.adapter import Trace
from pinet_core.tasks.codex_transport import RunnerError, execute


@pytest.mark.parametrize("finish,expected", [("timeout", "run_timeout"), ("error", "provider_error")])
async def test_partial_pipeline_trace_retains_count_hash_without_invented_usage(tmp_path, finish, expected):
    trace = Trace(True, 6)
    rows = [json.dumps({"type": "item.started", "item": {"type": "web_search", "id": "one"}}),
        json.dumps({"type": "item.completed", "item": {"type": "web_search", "id": "one"}})]
    raw = ("\n".join(rows) + "\n").encode()
    code = "import sys,time;sys.stdin.read();sys.stdout.buffer.write("+repr(raw)+");sys.stdout.flush();" + (
        "time.sleep(30)" if finish == "timeout" else "sys.exit(7)")
    async def authorized():
        return True
    args = {"partial_receipt": trace.partial_receipt}
    file = tmp_path / "trace.private.jsonl"
    with pytest.raises(RunnerError) as error:
        await execute([sys.executable, "-c", code], prompt="synthetic", cwd=tmp_path, env=os.environ.copy(),
            output=tmp_path / "absent.json", seconds=1, still_authorized=authorized,
            parse_trace=trace.parse, on_event=trace.event, trace_file=file, **args)
    assert error.value.code == expected
    assert error.value.receipt == {"web_search_count": 1, "trace_sha256": hashlib.sha256(raw).hexdigest()}
    assert file.read_bytes() == raw and not (tmp_path / "absent.json").exists()
    assert "partial_receipt" in inspect.signature(execute).parameters


async def test_unrelated_default_transport_receipt_is_unchanged(tmp_path):
    async def authorized():
        return True
    def parse(raw):
        raise RunnerError("provider_error")
    with pytest.raises(RunnerError) as error:
        await execute([sys.executable, "-c", "import sys,time;sys.stdin.read();print('{}',flush=True);time.sleep(30)"],
            prompt="synthetic", cwd=tmp_path, env=os.environ.copy(), output=tmp_path / "absent.json",
            seconds=1, still_authorized=authorized, parse_trace=parse)
    assert error.value.code == "run_timeout" and error.value.receipt == {}


@pytest.mark.parametrize("suffix,expected", [(b'{invalid}\n', "output_invalid"), (b'{"partial":', "run_timeout")])
async def test_snapshot_hash_excludes_malformed_or_unfinished_suffix(tmp_path, suffix, expected):
    trace = Trace(True, 6)
    valid = json.dumps({"type": "item.completed", "item": {"type": "web_search", "id": "one"}}).encode()+b"\n"
    raw = valid+suffix
    code = "import sys,time;sys.stdin.read();sys.stdout.buffer.write("+repr(raw)+");sys.stdout.flush();time.sleep(30)"
    async def authorized():
        return True
    file = tmp_path / "trace.private.jsonl"
    with pytest.raises(RunnerError) as error:
        await execute([sys.executable, "-c", code], prompt="synthetic", cwd=tmp_path, env=os.environ.copy(),
            output=tmp_path / "absent.json", seconds=1, still_authorized=authorized, parse_trace=trace.parse,
            on_event=trace.event, trace_file=file, partial_receipt=trace.partial_receipt)
    assert error.value.code == expected
    assert error.value.receipt == {"web_search_count": 1, "trace_sha256": hashlib.sha256(valid).hexdigest()}
    assert file.read_bytes() == raw


async def test_timeout_keeps_known_terminal_usage_without_claiming_completion(tmp_path):
    trace = Trace(True, 6)
    raw = json.dumps({"type": "turn.completed", "usage": {"input_tokens": 8, "output_tokens": 3}}).encode()+b"\n"
    code = "import sys,time;sys.stdin.read();sys.stdout.buffer.write("+repr(raw)+");sys.stdout.flush();time.sleep(30)"
    async def authorized():
        return True
    with pytest.raises(RunnerError) as error:
        await execute([sys.executable, "-c", code], prompt="synthetic", cwd=tmp_path, env=os.environ.copy(),
            output=tmp_path / "absent.json", seconds=1, still_authorized=authorized, parse_trace=trace.parse,
            on_event=trace.event, trace_file=tmp_path / "trace.private.jsonl", partial_receipt=trace.partial_receipt)
    assert error.value.code == "run_timeout"
    assert error.value.receipt == {"web_search_count": 0, "trace_sha256": hashlib.sha256(raw).hexdigest(),
        "usage": {"input_tokens": 8, "output_tokens": 3}}
    assert not (tmp_path / "absent.json").exists()


def test_no_retained_valid_trace_produces_no_invented_evidence():
    trace = Trace(True)
    assert trace.partial_receipt(b"") is None
    assert trace.partial_receipt(b"{invalid}\n") is None
    assert trace.partial_receipt(b"[]\n") is None
    assert trace.partial_receipt(b'{"unfinished":') is None


@pytest.mark.parametrize("kind,expected", [("tool", "tool_attempted"), ("model", "model_unavailable"),
    ("authority", "authorization_revoked")])
async def test_observed_snapshot_cannot_replace_the_original_failure_code(tmp_path, kind, expected):
    trace = Trace(True, 6)
    rows = [json.dumps({"type": "item.completed", "item": {"type": "web_search", "id": "one"}})]
    if kind != "authority":
        rows.append(json.dumps({"type": "item.started", "item": {"type": "command_execution"}}) if kind == "tool"
            else json.dumps({"type": "error", "message": "Model not supported"}))
    raw = ("\n".join(rows)+"\n").encode()
    code = "import sys,time;sys.stdin.read();sys.stdout.buffer.write("+repr(raw)+");sys.stdout.flush();time.sleep(30)"
    async def authorized():
        return kind != "authority" or not trace.searches
    file = tmp_path / "trace.private.jsonl"
    with pytest.raises(RunnerError) as error:
        await execute([sys.executable, "-c", code], prompt="synthetic", cwd=tmp_path, env=os.environ.copy(),
            output=tmp_path / "absent.json", seconds=5, still_authorized=authorized, parse_trace=trace.parse,
            on_event=trace.event, trace_file=file, partial_receipt=trace.partial_receipt)
    assert error.value.code == expected
    assert error.value.receipt == {"web_search_count": 1, "trace_sha256": hashlib.sha256(raw).hexdigest()}
    assert file.read_bytes() == raw and not (tmp_path / "absent.json").exists()
