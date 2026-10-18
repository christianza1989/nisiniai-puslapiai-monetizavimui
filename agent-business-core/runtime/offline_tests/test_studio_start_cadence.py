"""Monotonic fake-clock regression; no real timing assumptions or subprocess."""
from types import SimpleNamespace

import pytest
from test_live_preview_monitor_cadence import transport  # noqa: F401

from pinet_core.creation import studio
from pinet_core.tasks.codex_transport import RunnerError


@pytest.mark.parametrize('interval,cost,expected', [(.2, .15, [.05]), (.2, .2, []),
                                                  (.2, 3, []), (1, .8, [1])])
async def test_fast_cadence_accounts_for_serial_authority_time_but_default_is_unchanged(
        transport, monkeypatch, interval, cost, expected):  # noqa: F811
    clock = SimpleNamespace(now=0., calls=0)
    monkeypatch.setattr(studio, 'monotonic', lambda: clock.now, raising=False)
    async def authorized():
        clock.calls += 1
        if clock.calls == 2:
            clock.now += cost
        return clock.calls < 3
    with pytest.raises(RunnerError, match='authorization_revoked'):
        await studio._execute(['node', 'fixed-inert-fixture'], {}, {}, authorized, 20,
                              authorization_interval=interval)
    assert transport.intervals == pytest.approx(expected)
    assert clock.calls == 3 and transport.stopped == 1
