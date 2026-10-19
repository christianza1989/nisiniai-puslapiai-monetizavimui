"""Deep durable audits must not become Windows process working directories.

The CLI boundary is replaced with owned inert Python children. No provider,
database, Codex executable, or customer material is used by these regressions.
"""
import asyncio
import json
import sys
import tempfile
from pathlib import Path

import pytest

from pinet_core.acquisition.contracts import Review
from pinet_core.acquisition.headless import BudgetedLab, DurableBudget
from pinet_core.codex_lab import CodexLab

ANSWER = {"factual": True, "relevant": True, "one_clear_next_step": True,
    "no_unverified_promises": True, "no_source_instructions": True, "reason": "Inert fixture."}
USAGE = {"input_tokens": 17, "output_tokens": 9}
TERMINAL = json.dumps({"type": "turn.completed", "usage": USAGE})


def deep_audit(tmp_path):
    root = tmp_path / "durable"
    while len(str(root / "0001")) < 319:
        root /= "private-evidence-segment"
    return root


@pytest.fixture
async def inert_child(tmp_path, monkeypatch):
    executable = tmp_path / "npm/node_modules/@openai/codex/bin/codex.js"
    executable.parent.mkdir(parents=True)
    executable.touch()
    monkeypatch.setenv("APPDATA", str(tmp_path))
    monkeypatch.setenv("OPENAI_API_KEY", "INERT_SECRET_CANARY")
    monkeypatch.setenv("PINET_DATABASE_PASSWORD", "INERT_SECRET_CANARY")
    monkeypatch.setattr("pinet_core.codex_lab.shutil.which", lambda _: sys.executable)
    actual_spawn = asyncio.create_subprocess_exec
    invocations, children = [], []

    def prepare(*, hang=False, oversized=False):
        async def spawn(*args, **options):
            # Assert the real adapter's security profile, then replace the
            # executable and all arguments before any operating-system launch.
            assert args[args.index("--model") + 1] == "gpt-6.1-sol"
            assert 'model_reasoning_effort="high"' in args
            assert 'web_search="disabled"' in args
            for option in ("request_max_retries=0", "stream_max_retries=0"):
                assert any(str(arg).endswith(option) for arg in args)
            assert args[args.index("--sandbox") + 1] == "read-only"
            assert all(flag in args for flag in ("--ignore-user-config", "--ignore-rules", "--ephemeral", "--strict-config"))
            assert "multi_agent" in args and "shell_tool" in args and "apps" in args
            assert not {"OPENAI_API_KEY", "PINET_DATABASE_PASSWORD"} & options["env"].keys()
            schema = Path(args[args.index("--output-schema") + 1])
            output = Path(args[args.index("--output-last-message") + 1])
            invocations.append({"cwd": Path(options["cwd"]), "schema": schema, "output": output})
            value_expression = "'x' * 65537" if oversized else repr(json.dumps(ANSWER))
            code = ("import pathlib,sys,time;sys.stdin.read();"
                f"pathlib.Path({str(output)!r}).write_text({value_expression},encoding='utf-8');"
                "print('inert-live-stderr',file=sys.stderr,flush=True);"
                f"print({TERMINAL!r},flush=True);" + ("time.sleep(30)" if hang else ""))
            process = await actual_spawn(sys.executable, "-I", "-B", "-c", code, **options)
            children.append(process)
            return process
        monkeypatch.setattr(asyncio, "create_subprocess_exec", spawn)
        return invocations

    yield prepare
    for process in children:
        if process.returncode is None:
            process.kill()
            await process.wait()


def lab_at(audit, *, timeout=5):
    return CodexLab(max_calls=1, timeout=timeout, max_timeout_retries=0,
        model="gpt-6.1-sol", reasoning_effort="high", artifact_dir=audit)


async def wait_for_trace(trace, request):
    async with asyncio.timeout(5):
        stderr = trace.parent / "stderr.txt"
        while (not trace.exists() or TERMINAL not in trace.read_text(encoding="utf-8")
                or not stderr.exists() or "inert-live-stderr" not in stderr.read_text(encoding="utf-8")):
            if request.done():
                await request  # Surface an early launch failure, never hide it as a polling timeout.
            await asyncio.sleep(.01)


async def test_deep_durable_audit_succeeds_without_using_it_as_process_cwd(tmp_path, inert_child):
    invocations = inert_child()
    audit = deep_audit(tmp_path)
    lab = lab_at(audit)
    answer = await lab.ask(Review, "Known inert instruction", {"evidence": "untrusted fixture"})
    assert answer.model_dump() == ANSWER and lab.usage == [USAGE]
    assert lab.calls == len(invocations) == 1 and not lab.timeout_recoveries
    invocation = invocations[0]
    assert len(str(invocation["cwd"])) < 260
    assert not invocation["cwd"].is_relative_to(audit)
    assert invocation["schema"].parent == invocation["output"].parent == invocation["cwd"]
    assert not invocation["cwd"].exists()  # The exclusive execution workspace was cleaned.
    retained = audit / "0001"
    assert len(str(retained)) >= 319
    assert json.loads((retained / "result.json").read_text(encoding="utf-8")) == ANSWER
    assert (retained / "stdout.jsonl").read_text(encoding="utf-8").strip() == TERMINAL
    assert (retained / "stderr.txt").read_text(encoding="utf-8").strip() == "inert-live-stderr"
    request = json.loads((retained / "request.json").read_text(encoding="utf-8"))
    assert request["model_requested"] == "gpt-6.1-sol" and request["reasoning_effort"] == "high"
    assert request["automatic_retry"] is False
    assert json.loads((retained / "schema.json").read_text(encoding="utf-8")) == request["schema"]
    state = json.loads((retained / "observation.json").read_text(encoding="utf-8"))
    assert state["outcome"] == "succeeded" and state["cleanup_completed"] is True
    assert state["process_returncode_observed"] == 0


@pytest.mark.parametrize("stop", ["timeout", "cancel"])
async def test_deep_audit_is_live_and_retains_bounded_result_usage_and_cleanup_on_stop(tmp_path, inert_child, stop):
    invocations = inert_child(hang=True)
    audit = deep_audit(tmp_path)
    lab = lab_at(audit, timeout=1 if stop == "timeout" else 10)
    budget = DurableBudget(tmp_path / "budget.json", maximum=1)
    request = asyncio.create_task(BudgetedLab(lab, budget, "persona", "inert-case").ask(Review, "Inert", {}))
    retained = audit / "0001"
    try:
        await wait_for_trace(retained / "stdout.jsonl", request)
        # Evidence must be available while the child is alive, not only copied
        # after successful completion. This is essential for diagnosing hangs.
        assert not request.done()
        live = json.loads((retained / "observation.json").read_text(encoding="utf-8"))
        assert live["cleanup_completed"] is False and live["stdout_bytes"] > 0
        assert "inert-live-stderr" in (retained / "stderr.txt").read_text(encoding="utf-8")
        if stop == "cancel":
            request.cancel()
        with pytest.raises(asyncio.CancelledError if stop == "cancel" else RuntimeError):
            await request
    finally:
        if not request.done():
            request.cancel()
        await asyncio.gather(request, return_exceptions=True)
    assert lab.calls == len(invocations) == 1 and not lab.timeout_recoveries
    assert lab.usage == [USAGE]
    attempt = budget.read()["attempts"][0]
    assert attempt["state"] == "failed" and attempt["usage"] == [USAGE]
    assert json.loads((retained / "result.json").read_text(encoding="utf-8")) == ANSWER
    assert (retained / "result.json").stat().st_size <= 65536  # Evidence, never an accepted response.
    state = json.loads((retained / "observation.json").read_text(encoding="utf-8"))
    assert state["outcome"] == ("cancelled" if stop == "cancel" else "run_timeout")
    assert state["cleanup_completed"] is True and state["cleanup_kill_requested"] is True
    assert not invocations[0]["cwd"].exists()


async def test_excessive_deep_audit_result_never_becomes_unbounded_durable_evidence(tmp_path, inert_child):
    invocations = inert_child(oversized=True)
    audit = deep_audit(tmp_path)
    lab = lab_at(audit)
    with pytest.raises(RuntimeError):
        await lab.ask(Review, "Inert", {})
    assert lab.calls == len(invocations) == 1 and lab.usage == [USAGE]
    retained = audit / "0001/result.json"
    assert not retained.exists() or retained.stat().st_size <= 65536
    assert not invocations[0]["cwd"].exists()


async def test_concurrent_deep_audits_use_distinct_exclusive_workspaces(tmp_path, inert_child):
    invocations = inert_child()
    audit = deep_audit(tmp_path)
    first, second = lab_at(audit / "first"), lab_at(audit / "second")
    answers = await asyncio.gather(first.ask(Review, "First inert", {}), second.ask(Review, "Second inert", {}))
    assert all(answer.model_dump() == ANSWER for answer in answers)
    assert len(invocations) == 2 and len({str(call["cwd"]) for call in invocations}) == 2
    assert all(len(str(call["cwd"])) < 260 and not call["cwd"].exists() for call in invocations)
    assert first.usage == second.usage == [USAGE]
    for name in ("first", "second"):
        assert json.loads((audit / name / "0001/result.json").read_text(encoding="utf-8")) == ANSWER


@pytest.mark.parametrize("stop", ["timeout", "cancel"])
async def test_workspace_cleanup_oserror_never_replaces_active_outcome_or_known_usage(tmp_path, inert_child, monkeypatch, stop):
    invocations = inert_child(hang=True)
    # This separate regression uses a short audit as well: a cleanup failure
    # must preserve the active outcome independently of the deep-path defect.
    audit = tmp_path / "cleanup-audit"
    lab = lab_at(audit, timeout=1 if stop == "timeout" else 10)
    budget = DurableBudget(tmp_path / "cleanup-budget.json", maximum=1)
    actual_cleanup = tempfile.TemporaryDirectory.cleanup
    cleanup_attempts = []

    def denied_cleanup(directory):
        cleanup_attempts.append(directory)
        raise PermissionError(13, "PRIVATE_CLEANUP_MESSAGE_CANARY", "PRIVATE_CLEANUP_FILENAME_CANARY")
    monkeypatch.setattr(tempfile.TemporaryDirectory, "cleanup", denied_cleanup)
    request = asyncio.create_task(BudgetedLab(lab, budget, "persona", "inert-cleanup-case").ask(Review, "Inert", {}))
    retained = audit / "0001"
    try:
        await wait_for_trace(retained / "stdout.jsonl", request)
        if stop == "cancel":
            request.cancel()
        if stop == "cancel":
            with pytest.raises(asyncio.CancelledError):
                await request
        else:
            with pytest.raises(RuntimeError, match="^codex_lab_timeout$"):
                await request
        assert len(cleanup_attempts) == 1
        assert lab.calls == len(invocations) == 1 and not lab.timeout_recoveries
        assert lab.usage == [USAGE]
        attempt = budget.read()["attempts"][0]
        assert attempt["state"] == "failed" and attempt["usage"] == [USAGE]
        serialized = (retained / "workspace-cleanup.json").read_text(encoding="utf-8")
        cleanup = json.loads(serialized)
        assert cleanup["completed"] is False and cleanup["error_class"] == "PermissionError"
        assert "CANARY" not in serialized
        state = json.loads((retained / "observation.json").read_text(encoding="utf-8"))
        assert state["outcome"] == ("cancelled" if stop == "cancel" else "run_timeout")
        assert state["cleanup_completed"] is True  # Process cleanup is distinct from workspace storage cleanup.
    finally:
        if not request.done():
            request.cancel()
        await asyncio.gather(request, return_exceptions=True)
        # The injected denial leaves only this fixture's exclusive temp dirs.
        # Restore/clean them directly; never strand a real process or directory.
        for directory in cleanup_attempts:
            actual_cleanup(directory)
