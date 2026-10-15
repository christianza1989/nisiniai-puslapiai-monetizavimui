"""Actual borrowed SQL callback lifetime over an inert owned child, provider zero."""
import asyncio
import os
import sys
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_customer_public import customers  # noqa: F401

from pinet_core.control.routes import scope
from pinet_core.creation import studio
from pinet_core.tasks.codex_transport import RunnerError


def environment():
    return {key: value for key, value in os.environ.items()
        if key.upper() in {"SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "COMSPEC", "PATHEXT"}}


@pytest.fixture
def children(monkeypatch):
    processes = []
    spawn = asyncio.create_subprocess_exec

    async def tracked(*args, **kwargs):
        process = await spawn(*args, **kwargs)
        processes.append(process)
        return process

    monkeypatch.setattr(asyncio, "create_subprocess_exec", tracked)
    return processes


def arguments(*, delay=0.06, output='print("{}")'):
    return [sys.executable, "-c", f"import sys,time; sys.stdin.read(); time.sleep({delay}); {output}"]


async def test_success_eof_drains_borrowed_sql_authorization_before_return(customers):  # noqa: F811
    checks, finished, active = 0, asyncio.Event(), asyncio.Event()
    async with scope(user=str(uuid4())) as tx:
        async def authorized():
            nonlocal checks
            checks += 1
            if checks == 2:
                active.set()
                await tx.execute(text("SELECT pg_sleep(0.3)"))
                finished.set()
            return True
        value = await studio._execute(arguments(), {}, environment(), authorized, 5)
        assert value == {} and active.is_set()
        # Actual subsequent SQL exposes a cancelled/invalidation state, not a mocked error.
        assert await tx.scalar(text("SELECT 1")) == 1
        assert finished.is_set() and checks == 3


async def test_eof_drains_then_final_revocation_rejects_output(children):
    checks, active, maximum = 0, 0, 0
    finished, callbacks = asyncio.Event(), []

    async def authorized():
        nonlocal checks, active, maximum
        checks += 1
        active += 1
        maximum = max(maximum, active)
        callbacks.append(asyncio.current_task())
        try:
            if checks == 2:
                await asyncio.sleep(0.2)
                finished.set()
            return checks < 3
        finally:
            active -= 1

    with pytest.raises(RunnerError, match="authorization_revoked"):
        await studio._execute(arguments(), {}, environment(), authorized, 3)
    assert checks == 3 and maximum == 1 and active == 0 and finished.is_set()
    assert all(task.done() for task in callbacks[1:]) and children[0].returncode == 0
    await asyncio.sleep(1.05)
    assert checks == 3  # No further periodic callbacks after EOF or failure.


@pytest.mark.parametrize("mode", ["timeout", "caller_cancel", "failure"])
async def test_failure_joins_callback_cleanup_and_owned_child(children, mode):
    checks, callbacks = 0, []
    entered, cleaning, release, finished = (asyncio.Event() for _ in range(4))

    async def authorized():
        nonlocal checks
        checks += 1
        if checks == 1:
            return True
        callbacks.append(asyncio.current_task())
        entered.set()
        try:
            await asyncio.Event().wait()
        finally:
            cleaning.set()
            await release.wait()
            finished.set()

    output = 'print("x"*1100000)' if mode == "failure" else 'print("{}")'
    operation = asyncio.create_task(studio._execute(arguments(delay=0.1 if mode == "failure" else 20,
        output=output), {}, environment(), authorized, 0.2 if mode == "timeout" else 5))
    try:
        await asyncio.wait_for(entered.wait(), 2)
        if mode == "caller_cancel":
            operation.cancel()
        await asyncio.wait_for(cleaning.wait(), 2)
        assert not operation.done() and not finished.is_set()
        # A second cancellation cannot interrupt the callback's owned cleanup.
        if mode == "caller_cancel":
            operation.cancel()
            await asyncio.sleep(0.02)
            assert not operation.done() and not finished.is_set()
        release.set()
        if mode == "caller_cancel":
            with pytest.raises(asyncio.CancelledError):
                await operation
        else:
            with pytest.raises(RunnerError, match="studio_timeout" if mode == "timeout" else "studio_output_limit"):
                await operation
        assert finished.is_set() and all(task.done() for task in callbacks)
        assert children[0].returncode is not None and checks == 2
        await asyncio.sleep(1.05)
        assert checks == 2
    finally:
        release.set()
        if not operation.done():
            operation.cancel()
        await asyncio.gather(operation, return_exceptions=True)


@pytest.mark.parametrize("mode", ["timeout", "caller_cancel"])
async def test_final_authorization_stays_under_deadline_and_is_joined(children, mode):
    checks, callbacks = 0, []
    entered, finished = asyncio.Event(), asyncio.Event()

    async def authorized():
        nonlocal checks
        checks += 1
        callbacks.append(asyncio.current_task())
        if checks == 3:
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                await asyncio.sleep(0.04)
                finished.set()
        return True

    operation = asyncio.create_task(studio._execute(arguments(), {}, environment(), authorized,
        0.25 if mode == "timeout" else 3))
    try:
        await asyncio.wait_for(entered.wait(), 2)
        if mode == "caller_cancel":
            operation.cancel()
            with pytest.raises(asyncio.CancelledError):
                await operation
        else:
            with pytest.raises(RunnerError, match="studio_timeout"):
                await operation
    finally:
        if not operation.done():
            operation.cancel()
        await asyncio.gather(operation, return_exceptions=True)
    assert entered.is_set() and finished.is_set() and checks == 3
    assert children[0].returncode == 0 and all(task.done() for task in callbacks[1:])


async def test_inflight_monitor_drain_obeys_deadline(children):
    checks, finished = 0, asyncio.Event()

    async def authorized():
        nonlocal checks
        checks += 1
        if checks == 2:
            try:
                await asyncio.Event().wait()
            finally:
                await asyncio.sleep(0.04)
                finished.set()
        return True

    with pytest.raises(RunnerError, match="studio_timeout"):
        await studio._execute(arguments(), {}, environment(), authorized, 0.25)
    assert finished.is_set() and checks == 2 and children[0].returncode == 0


async def test_monitor_exception_is_propagated_and_child_stopped(children):
    checks = 0

    async def authorized():
        nonlocal checks
        checks += 1
        if checks == 2:
            raise RuntimeError("owned_callback_failure")
        return True

    with pytest.raises(RuntimeError, match="owned_callback_failure"):
        await studio._execute(arguments(delay=20), {}, environment(), authorized, 3)
    assert checks == 2 and children[0].returncode is not None
