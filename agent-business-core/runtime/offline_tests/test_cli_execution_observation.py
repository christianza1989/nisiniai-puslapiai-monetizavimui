"""Real inert child failures retain diagnostics; no provider or customer data."""
import json
import os
import sys
from pathlib import Path

import pytest

from pinet_core.tasks.codex_transport import RunnerError, execute


async def authorized():
    return True


async def test_stderr_and_timing_survive_timeout_and_owned_cleanup(tmp_path):
    stderr, observation = tmp_path / "stderr.private.log", tmp_path / "execution.private.json"
    code = "import sys,time;sys.stdin.read();print('{}',flush=True);print('synthetic reconnect diagnostic',file=sys.stderr,flush=True);time.sleep(30)"
    with pytest.raises(RunnerError) as failure:
        await execute([sys.executable, "-c", code], prompt="synthetic", cwd=tmp_path,
            env=os.environ.copy(), output=tmp_path / "absent.json", seconds=1,
            still_authorized=authorized, parse_trace=lambda raw: {},
            stderr_file=stderr, observation_file=observation)
    assert failure.value.code == "run_timeout" and failure.value.receipt == {}
    assert stderr.read_text().strip() == "synthetic reconnect diagnostic"
    state = json.loads(observation.read_text())
    assert state["outcome"] == "run_timeout" and state["cleanup_completed"] is True
    assert state["stage"] == "closed" and state["last_execution_stage"] != "closed"
    assert state["stdout_bytes"] in (3, 4) and state["stderr_bytes"] > 0
    assert state["stderr_last_seconds"] <= state["elapsed_seconds"]
    assert state["prompt_bytes"] == 9 and state["exit_code"] is not None
    assert "synthetic" not in observation.read_text()


async def test_provider_exit_keeps_first_error_and_private_stderr(tmp_path):
    with pytest.raises(RunnerError) as failure:
        await execute([sys.executable, "-c", "import sys;sys.stdin.read();print('synthetic failure',file=sys.stderr,flush=True);sys.exit(7)"],
            prompt="private", cwd=tmp_path, env=os.environ.copy(), output=tmp_path / "absent.json",
            seconds=5, still_authorized=authorized, parse_trace=lambda raw: {},
            stderr_file=tmp_path / "stderr.private.log", observation_file=tmp_path / "execution.private.json")
    assert failure.value.code == "provider_error"
    state = json.loads((tmp_path / "execution.private.json").read_text())
    assert state["outcome"] == "provider_error" and state["exit_code"] == 7
    assert state["cleanup_completed"]


async def test_stderr_cap_is_retained_and_does_not_change_invalid_output(tmp_path):
    with pytest.raises(RunnerError) as failure:
        await execute([sys.executable, "-c", "import sys,time;sys.stdin.read();sys.stderr.write('x'*70000);sys.stderr.flush();time.sleep(30)"],
            prompt="private", cwd=tmp_path, env=os.environ.copy(), output=tmp_path / "absent.json",
            seconds=5, still_authorized=authorized, parse_trace=lambda raw: {},
            stderr_file=tmp_path / "stderr.private.log", observation_file=tmp_path / "execution.private.json")
    assert failure.value.code == "output_invalid"
    assert (tmp_path / "stderr.private.log").stat().st_size == 65536
    state = json.loads((tmp_path / "execution.private.json").read_text())
    assert state["stderr_bytes"] > 65536 and state["stderr_truncated"] is True
    assert state["outcome"] == "output_invalid" and state["cleanup_completed"]


@pytest.mark.parametrize("finish,expected", [("error", "provider_error"), ("timeout", "run_timeout"), ("success", None)])
async def test_diagnostic_disk_failure_never_replaces_actual_outcome(tmp_path, monkeypatch, finish, expected):
    output = tmp_path / "output.json"
    state = tmp_path / "execution.private.json"
    original = Path.write_text
    def failure(path, *args, **kwargs):
        if path.name == "execution.private.json.tmp":
            raise OSError("synthetic diagnostic disk failure")
        return original(path, *args, **kwargs)
    monkeypatch.setattr(Path, "write_text", failure)
    terminal = "sys.exit(7)" if finish == "error" else "time.sleep(30)" if finish == "timeout" else (
        "pathlib.Path('output.json').write_text('{}')")
    code = "import sys,time,pathlib;sys.stdin.read();print('synthetic stderr',file=sys.stderr,flush=True);"+terminal
    invocation = execute([sys.executable, "-c", code], prompt="synthetic", cwd=tmp_path, env=os.environ.copy(),
        output=output, seconds=1, still_authorized=authorized, parse_trace=lambda raw: {},
        stderr_file=tmp_path / "stderr.private.log", observation_file=state)
    if expected:
        with pytest.raises(RunnerError) as result:
            await invocation
        assert result.value.code == expected
    else:
        assert await invocation == ({}, {})
    assert not state.exists()


async def test_private_observation_paths_cannot_escape_owned_run_folder(tmp_path):
    with pytest.raises(RunnerError) as failure:
        await execute([sys.executable, "-c", "raise Exception('must not launch')"], prompt="synthetic",
            cwd=tmp_path, env=os.environ.copy(), output=tmp_path / "absent.json", seconds=1,
            still_authorized=authorized, parse_trace=lambda raw: {}, observation_file=tmp_path.parent / "outside.private.json")
    assert failure.value.code == "output_invalid" and not (tmp_path.parent / "outside.private.json").exists()
