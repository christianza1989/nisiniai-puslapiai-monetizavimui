"""Safe pre-spawn diagnostics and explicit owned diagnostic-folder boundaries."""
import asyncio
import json
import os
import sys
from pathlib import Path

import pytest

from pinet_core.tasks.codex_transport import RunnerError, execute


async def authorized():
    return True


@pytest.mark.parametrize("error_type,number,windows_number", [
    (FileNotFoundError, 2, 2), (PermissionError, 13, 5), (NotADirectoryError, 20, 267),
])
async def test_spawn_os_error_preserves_safe_class_and_numbers_without_private_text(tmp_path, monkeypatch, error_type, number, windows_number):
    error = error_type(number, "PRIVATE_OS_MESSAGE_CANARY", "PRIVATE_FILENAME_CANARY")
    error.winerror = windows_number
    spawns = []

    async def fail_spawn(*args, **options):
        spawns.append(True)
        raise error
    monkeypatch.setattr(asyncio, "create_subprocess_exec", fail_spawn)
    observation = tmp_path / "observation.json"
    with pytest.raises(RunnerError) as failure:
        await execute(["PRIVATE_ARGV_CANARY"], prompt="PRIVATE_PROMPT_CANARY", cwd=tmp_path,
            env={"PRIVATE_ENV_CANARY": "PRIVATE_VALUE_CANARY"}, output=tmp_path / "result.json",
            seconds=2, still_authorized=authorized, parse_trace=lambda raw: {},
            observation_file=observation, stderr_file=tmp_path / "stderr.txt")
    assert failure.value.code == "output_invalid" and failure.value.receipt == {} and len(spawns) == 1
    serialized = observation.read_text(encoding="utf-8")
    state = json.loads(serialized)
    assert state["process_start_error_class"] == error_type.__name__
    assert state["process_start_errno"] == number and state["process_start_winerror"] == windows_number
    assert state["outcome"] == "output_invalid" and state["cleanup_completed"] is True
    assert state["last_execution_stage"] in {"starting", "spawn_failed"}
    assert state["process_returncode_observed"] is None and state["stdin_closed_seconds"] is None
    assert state["stdout_bytes"] == state["stderr_bytes"] == 0
    assert "CANARY" not in serialized


async def test_real_missing_executable_records_spawn_failure_without_a_child_or_provider(tmp_path):
    observation = tmp_path / "observation.json"
    with pytest.raises(RunnerError) as failure:
        await execute([str(tmp_path / "inert-executable-that-does-not-exist")], prompt="inert", cwd=tmp_path,
            env=os.environ.copy(), output=tmp_path / "result.json", seconds=2,
            still_authorized=authorized, parse_trace=lambda raw: {}, observation_file=observation)
    assert failure.value.code == "output_invalid" and failure.value.receipt == {}
    state = json.loads(observation.read_text(encoding="utf-8"))
    assert state["process_start_error_class"] == "FileNotFoundError" and state["process_start_errno"] == 2
    assert state["process_start_winerror"] in (None, 2)
    assert state["cleanup_completed"] is True and state["process_returncode_observed"] is None


async def test_explicit_deep_diagnostic_directory_keeps_output_in_short_execution_workspace(tmp_path):
    cwd = tmp_path / "short"
    cwd.mkdir()
    diagnostics = tmp_path / "durable"
    while len(str(diagnostics)) < 319:
        diagnostics /= "private-diagnostic-segment"
    diagnostics.mkdir(parents=True)
    output = cwd / "result.json"
    code = ("import pathlib,sys;sys.stdin.read();pathlib.Path('result.json').write_text('{}');"
        "print('inert-trace',flush=True);print('inert-stderr',file=sys.stderr,flush=True)")
    result = await execute([sys.executable, "-I", "-B", "-c", code], prompt="inert", cwd=cwd,
        env=os.environ.copy(), output=output, seconds=5, still_authorized=authorized,
        parse_trace=lambda raw: {"inert_receipt": True}, diagnostic_dir=diagnostics,
        trace_file=diagnostics / "stdout.jsonl", stderr_file=diagnostics / "stderr.txt",
        observation_file=diagnostics / "observation.json")
    assert result == ({}, {"inert_receipt": True}) and output.read_text() == "{}"
    assert (diagnostics / "stdout.jsonl").read_text().strip() == "inert-trace"
    assert (diagnostics / "stderr.txt").read_text().strip() == "inert-stderr"
    state = json.loads((diagnostics / "observation.json").read_text())
    assert state["outcome"] == "succeeded" and state["cleanup_completed"] is True


@pytest.mark.parametrize("path_key", ["trace_file", "stderr_file", "observation_file"])
@pytest.mark.parametrize("explicit", [False, True], ids=["default-cwd", "explicit-owned-folder"])
async def test_diagnostic_path_outside_exact_owned_directory_refused_before_spawn(tmp_path, monkeypatch, path_key, explicit):
    cwd, diagnostics, outside = (tmp_path / name for name in ("execution", "diagnostics", "outside"))
    for path in (cwd, diagnostics, outside):
        path.mkdir()
    spawned = []

    async def forbidden(*args, **options):
        spawned.append(True)
        pytest.fail("Invalid diagnostic path must be rejected before any child")
    monkeypatch.setattr(asyncio, "create_subprocess_exec", forbidden)
    options = {path_key: outside / "private.log"}
    if explicit:
        options["diagnostic_dir"] = diagnostics
    with pytest.raises(RunnerError) as failure:
        await execute(["inert-never-started"], prompt="inert", cwd=cwd, env={}, output=cwd / "result.json",
            seconds=1, still_authorized=authorized, parse_trace=lambda raw: {}, **options)
    assert failure.value.code == "output_invalid" and not spawned and list(outside.iterdir()) == []


@pytest.mark.parametrize("link_kind", ["symlink", "junction"])
async def test_diagnostic_directory_link_ancestor_is_refused_before_spawn(tmp_path, monkeypatch, link_kind):
    cwd, parent = tmp_path / "execution", tmp_path / "linked-ancestor"
    diagnostics = parent / "diagnostics"
    cwd.mkdir()
    diagnostics.mkdir(parents=True)
    method = "is_symlink" if link_kind == "symlink" else "is_junction"
    original = getattr(Path, method)
    monkeypatch.setattr(Path, method, lambda path: path == parent or original(path))

    async def forbidden(*args, **options):
        pytest.fail("A linked diagnostic ancestor must be rejected before any child")
    monkeypatch.setattr(asyncio, "create_subprocess_exec", forbidden)
    with pytest.raises(RunnerError) as failure:
        await execute(["inert-never-started"], prompt="inert", cwd=cwd, env={}, output=cwd / "result.json",
            seconds=1, still_authorized=authorized, parse_trace=lambda raw: {}, diagnostic_dir=diagnostics,
            observation_file=diagnostics / "observation.json")
    assert failure.value.code == "output_invalid" and list(diagnostics.iterdir()) == []


async def test_relative_diagnostic_directory_is_refused_before_spawn(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    diagnostics = Path("relative-diagnostics")
    diagnostics.mkdir()

    async def forbidden(*args, **options):
        pytest.fail("Explicit diagnostic ownership requires an absolute directory")
    monkeypatch.setattr(asyncio, "create_subprocess_exec", forbidden)
    with pytest.raises(RunnerError) as failure:
        await execute(["inert-never-started"], prompt="inert", cwd=tmp_path, env={}, output=tmp_path / "result.json",
            seconds=1, still_authorized=authorized, parse_trace=lambda raw: {}, diagnostic_dir=diagnostics,
            observation_file=diagnostics / "observation.json")
    assert failure.value.code == "output_invalid" and list(diagnostics.iterdir()) == []
