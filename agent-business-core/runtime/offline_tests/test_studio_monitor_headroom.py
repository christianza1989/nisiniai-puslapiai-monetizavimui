"""Deterministic serial monitor timing; no DB, renderer, provider or real clock."""
from types import SimpleNamespace

import pytest
import test_live_preview_monitor_cadence as protocol

from pinet_core.creation import studio
from pinet_core.tasks.codex_transport import RunnerError

transport = protocol.transport


@pytest.mark.parametrize("cost", [0, .15, .2, 1.45, 5.32])
async def test_live_opt_in_retains_interruptible_idle_after_each_fresh_check(transport, monkeypatch, cost):
    clock = SimpleNamespace(now=0., checks=0)
    monkeypatch.setattr(studio, "monotonic", lambda: clock.now)

    async def authorized():
        clock.checks += 1
        if clock.checks == 2:
            clock.now += cost
        return clock.checks < 3

    with pytest.raises(RunnerError, match="authorization_revoked"):
        await studio._execute(["node", "fixed-inert-fixture"], {}, {}, authorized, 20,
                              authorization_interval=.2, authorization_completion_paced=True)
    assert transport.intervals == [.2]
    assert clock.checks == 3 and transport.stopped == 1


@pytest.mark.parametrize("value", [None, 0, 1, ".2", [], {}])
async def test_invalid_pacing_is_refused_before_authorization_or_spawn(monkeypatch, value):
    async def forbidden(*args, **kwargs):
        pytest.fail("Invalid pacing must fail before any authority or subprocess work")

    monkeypatch.setattr(studio.asyncio, "create_subprocess_exec", forbidden)
    with pytest.raises(RunnerError, match="studio_authorization_pacing"):
        await studio._execute(["node", "fixed-inert-fixture"], {}, {}, forbidden, 20,
                              authorization_completion_paced=value)


async def test_unrelated_fast_call_keeps_start_pacing_without_opt_in(transport, monkeypatch):
    clock = SimpleNamespace(now=0., checks=0)
    monkeypatch.setattr(studio, "monotonic", lambda: clock.now)

    async def authorized():
        clock.checks += 1
        if clock.checks == 2:
            clock.now += 1.45
        return clock.checks < 3

    with pytest.raises(RunnerError, match="authorization_revoked"):
        await studio._execute(["node", "fixed-inert-fixture"], {}, {}, authorized, 20,
                              authorization_interval=.2)
    assert transport.intervals == []
    assert clock.checks == 3 and transport.stopped == 1
