"""Pulse writes are not permission reuse; each new operation remains fresh."""
import asyncio

from test_live_preview_runtime import delayed_authority, fixture, ready  # noqa: F401

from pinet_core.control.routes import ControlError


async def test_shared_observation_publishes_one_pulse_and_next_operation_is_fresh(fixture, monkeypatch):  # noqa: F811
    f = fixture
    lease = await ready(f)
    entered, proceed, checks = await delayed_authority(f, lease, monkeypatch)
    pulses = []
    monkeypatch.setattr(f.manager.store, 'heartbeat', lambda *args, **kwargs: pulses.append(True))
    waiters = [asyncio.create_task(f.manager.permitted(lease))]
    await entered.wait()
    waiters.extend(asyncio.create_task(f.manager.permitted(lease)) for _ in range(15))
    await asyncio.sleep(0)
    proceed.set()
    assert await asyncio.gather(*waiters) == [True]*16
    assert len(checks) == 1
    assert len(pulses) == 1, 'One exact successful observation needs one durable publication'
    assert await f.manager.permitted(lease)
    assert len(checks) == len(pulses) == 2, 'A completed result cannot authorize the next operation'


async def test_all_cancelled_waiters_cannot_publish_a_late_pulse(fixture, monkeypatch):  # noqa: F811
    f = fixture
    lease = await ready(f)
    entered, proceed, checks = await delayed_authority(f, lease, monkeypatch)
    pulses = []
    monkeypatch.setattr(f.manager.store, 'heartbeat', lambda *args, **kwargs: pulses.append(True))
    waiters = [asyncio.create_task(f.manager.permitted(lease)) for _ in range(2)]
    await entered.wait()
    for waiter in waiters:
        waiter.cancel()
    await asyncio.gather(*waiters, return_exceptions=True)
    proceed.set()
    await lease.auth_task
    assert len(checks) == 1 and pulses == []
    assert await f.manager.permitted(lease)
    assert len(checks) == 2 and len(pulses) == 1


async def test_delayed_old_waiter_cannot_republish_after_a_newer_check(fixture, monkeypatch):  # noqa: F811
    f = fixture
    lease = await ready(f)
    entered, proceed, checks = await delayed_authority(f, lease, monkeypatch)
    pulses = []
    monkeypatch.setattr(f.manager.store, 'heartbeat', lambda *args, **kwargs: pulses.append(True))
    first = asyncio.create_task(f.manager.permitted(lease))
    await entered.wait()
    original_check, shield = lease.auth_task, asyncio.shield
    delayed, release = asyncio.Event(), asyncio.Event()
    slow = [None]
    def gated(future):
        if future is original_check and asyncio.current_task() is slow[0]:
            async def resumed():
                result = await shield(future)
                delayed.set()
                await release.wait()
                return result
            return resumed()
        return shield(future)
    monkeypatch.setattr(asyncio, 'shield', gated)
    slow[0] = asyncio.create_task(f.manager.permitted(lease))
    await asyncio.sleep(0)
    proceed.set()
    assert await first
    await delayed.wait()
    assert await f.manager.permitted(lease)
    assert len(checks) == len(pulses) == 2
    release.set()
    assert await slow[0]
    assert len(pulses) == 2, 'A delayed old waiter must not re-publish an already published check'


async def test_failed_publication_does_not_consume_the_shared_check_pulse(fixture, monkeypatch):  # noqa: F811
    f = fixture
    lease = await ready(f)
    entered, proceed, checks = await delayed_authority(f, lease, monkeypatch)
    pulses = []
    def publish(*args, **kwargs):
        pulses.append(True)
        if len(pulses) == 1:
            raise ControlError(503, 'live_preview_store_unavailable')
    monkeypatch.setattr(f.manager.store, 'heartbeat', publish)
    waiters = [asyncio.create_task(f.manager.verify_lease(lease))]
    await entered.wait()
    waiters.append(asyncio.create_task(f.manager.verify_lease(lease)))
    await asyncio.sleep(0)
    proceed.set()
    results = await asyncio.gather(*waiters, return_exceptions=True)
    assert isinstance(results[0], ControlError) and results[0].code == 'live_preview_store_unavailable'
    assert results[1] is True and len(pulses) == 2 and len(checks) == 1
