"""Real inert child failures retain diagnostics; no provider or customer data."""
import asyncio
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from pinet_core.tasks.codex_transport import RunnerError, execute
from pinet_core.tasks.execution_observation import Observation


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
    assert state["parent_returncode_before_cleanup"] is None and state["cleanup_kill_requested"] is True
    assert state["version"] == "cli-execution-observation.v2"
    assert state["wait_done_before_cleanup"] is False and state["stdout_eof_before_cleanup"] is False
    assert state["feed_done_before_cleanup"] is True and state["stdin_closed_seconds"] is not None
    assert state["output_exists_before_cleanup"] is False and state["output_bytes_before_cleanup"] is None
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
    assert state["parent_returncode_before_cleanup"] == 7 and state["cleanup_kill_requested"] is False
    assert state["wait_done_before_cleanup"] is True
    assert state["stdout_eof_before_cleanup"] is state["stderr_eof_before_cleanup"] is True
    assert state["process_wait_done_seconds"] <= state["cleanup_started_seconds"]
    assert state["process_returncode_observed"] == 7


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


async def test_success_keeps_natural_exit_stream_times_and_output_size_without_content(tmp_path):
    output = tmp_path / "output.json"
    value = {"private": "CANARY_OUTPUT_DO_NOT_LOG"}
    code = "import sys,pathlib;sys.stdin.read();pathlib.Path('output.json').write_text(" + repr(json.dumps(value)) + ")"
    result = await execute([sys.executable, "-B", "-c", code], prompt="CANARY_PROMPT_DO_NOT_LOG", cwd=tmp_path,
        env=os.environ.copy(), output=output, seconds=5, still_authorized=authorized,
        parse_trace=lambda raw: {"unchanged_receipt": True}, observation_file=tmp_path / "execution.private.json")
    assert result == (value, {"unchanged_receipt": True})
    serialized = (tmp_path / "execution.private.json").read_text()
    state = json.loads(serialized)
    assert state["outcome"] == "succeeded" and state["parent_returncode_before_cleanup"] == state["exit_code"] == 0
    assert state["cleanup_kill_requested"] is False and state["cleanup_completed"] is True
    assert state["wait_done_before_cleanup"] is state["feed_done_before_cleanup"] is True
    assert state["stdout_done_before_cleanup"] is state["stderr_done_before_cleanup"] is True
    assert state["stdout_eof_before_cleanup"] is state["stderr_eof_before_cleanup"] is True
    assert state["output_exists_before_cleanup"] is state["output_is_file_before_cleanup"] is True
    assert state["output_bytes_before_cleanup"] == output.stat().st_size
    for field in ("stdin_closed_seconds", "stdout_eof_seconds", "stderr_eof_seconds", "process_wait_done_seconds"):
        assert 0 <= state[field] <= state["cleanup_started_seconds"] <= state["elapsed_seconds"]
    assert "CANARY_" not in serialized and "write_text" not in serialized


async def wait_for_file(file, seconds=5):
    async with asyncio.timeout(seconds):
        while not file.exists():
            await asyncio.sleep(.02)


async def test_cancellation_retains_pre_cleanup_liveness_and_propagates_cancelled_error(tmp_path):
    observation = tmp_path / "execution.private.json"
    task = asyncio.create_task(execute([sys.executable, "-B", "-c",
        "import sys,pathlib,time;sys.stdin.read();pathlib.Path('ready').touch();print('{}',flush=True);time.sleep(30)"],
        prompt="private", cwd=tmp_path, env=os.environ.copy(), output=tmp_path / "absent.json",
        seconds=5, still_authorized=authorized, parse_trace=lambda raw: {}, observation_file=observation))
    await wait_for_file(tmp_path / "ready")
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    state = json.loads(observation.read_text())
    assert state["outcome"] == "cancelled" and state["cleanup_completed"] is True
    assert state["parent_returncode_before_cleanup"] is None and state["cleanup_kill_requested"] is True
    assert state["wait_done_before_cleanup"] is False and state["feed_done_before_cleanup"] is True
    assert state["stdout_eof_before_cleanup"] is False and state["output_exists_before_cleanup"] is False


@pytest.mark.parametrize("exit_code", [0, 7], ids=["natural-success", "natural-failure"])
async def test_inherited_stdout_records_exited_parent_without_changing_timeout_outcome(tmp_path, exit_code):
    # The inert descendant lives briefly, then releases stdout by itself. No
    # process outside this fixture is signalled or adopted as a real CLI witness.
    descendant = "import pathlib,time;time.sleep(1.7);pathlib.Path('descendant-done').touch()"
    code = ("import sys,subprocess,pathlib;sys.stdin.read();"
        "subprocess.Popen([sys.executable,'-B','-c'," + repr(descendant) + "],stdin=subprocess.DEVNULL,"
        "stdout=sys.stdout,stderr=subprocess.DEVNULL,close_fds=False,creationflags=" +
        str(0x08000000 if os.name == "nt" else 0) + ");"
        "pathlib.Path('output.json').write_text('{}');print('{}',flush=True);sys.exit(" + str(exit_code) + ")")
    try:
        with pytest.raises(RunnerError) as failure:
            await execute([sys.executable, "-B", "-c", code], prompt="private", cwd=tmp_path,
                env=os.environ.copy(), output=tmp_path / "output.json", seconds=.8,
                still_authorized=authorized, parse_trace=lambda raw: {}, observation_file=tmp_path / "execution.private.json")
        assert failure.value.code == "run_timeout"  # Preserve existing drain/timeout behavior.
        state = json.loads((tmp_path / "execution.private.json").read_text())
        assert state["parent_returncode_before_cleanup"] == exit_code
        assert state["cleanup_kill_requested"] is False and state["stdout_eof_before_cleanup"] is False
        assert state["stdout_done_before_cleanup"] is False and state["feed_done_before_cleanup"] is True
        assert state["output_exists_before_cleanup"] is True and state["output_bytes_before_cleanup"] == 2
        assert state["outcome"] == "run_timeout" and state["exit_code"] == exit_code
        # Windows reports wait completion separately; on other loops wait may
        # itself await inherited pipe closure, so record that state honestly.
        if state["wait_done_before_cleanup"]:
            assert state["process_wait_done_seconds"] <= state["cleanup_started_seconds"]
    finally:
        await wait_for_file(tmp_path / "descendant-done")
        await asyncio.sleep(.05)


def test_output_metadata_read_failure_stays_unknown_and_never_reads_content(tmp_path):
    observation = Observation(tmp_path / "execution.private.json", None, "private prompt", ["private argv"], 5)
    class InaccessibleOutput:
        def stat(self):
            raise PermissionError("synthetic metadata denial")
        def read_text(self, *args, **options):
            pytest.fail("Diagnostics must not read output content")
    done = SimpleNamespace(done=lambda: True)
    observation.before_cleanup(SimpleNamespace(returncode=7), InaccessibleOutput(),
        waited=done, stdout=done, stderr=done, feeding=done)
    state = json.loads((tmp_path / "execution.private.json").read_text())
    assert state["parent_returncode_before_cleanup"] == 7 and state["cleanup_kill_requested"] is False
    assert state["output_exists_before_cleanup"] is state["output_bytes_before_cleanup"] is None
    assert state["diagnostic_read_errors"] == 1
    assert "private prompt" not in json.dumps(state) and "private argv" not in json.dumps(state)
