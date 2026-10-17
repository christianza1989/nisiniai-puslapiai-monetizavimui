"""Exercise the actual monitor/caller with fake streams; no process, DB or model."""
import asyncio
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.creation import studio
from pinet_core.site_build import live_preview
from pinet_core.tasks.codex_transport import RunnerError


@pytest.fixture
def transport(monkeypatch):
    monkeypatch.setattr(studio, 'monotonic', lambda: 0., raising=False)
    stopped = asyncio.Event()
    state = SimpleNamespace(intervals=[], stopped=0)
    class Stream:
        async def read(self, size):
            await stopped.wait()
            return b''
    class Input:
        def write(self, value):
            assert isinstance(value, bytes)
        async def drain(self):
            return None
        def close(self):
            return None
    process = SimpleNamespace(stdout=Stream(), stderr=Stream(), stdin=Input(), returncode=None)
    async def create(*args, **kwargs):
        return process
    async def stop(owned):
        assert owned is process
        state.stopped += 1
        process.returncode = -15
        stopped.set()
    async def observed_wait(awaitable, timeout):
        # Only the real monitor's inter-check wait is intercepted. A subsequent
        # fresh callback refuses, so normal transport cancellation cleanup runs.
        state.intervals.append(timeout)
        awaitable.close()
        raise TimeoutError
    async def authorized():
        return not state.intervals
    state.authorized = authorized
    monkeypatch.setattr(asyncio, 'create_subprocess_exec', create)
    monkeypatch.setattr(asyncio, 'wait_for', observed_wait)
    monkeypatch.setattr(studio, 'stop_process', stop)
    return state


async def test_unrelated_studio_call_keeps_original_one_second_cadence(transport):
    with pytest.raises(RunnerError, match='authorization_revoked'):
        await studio._execute(['node', 'fixed-trusted-script'], {}, {}, transport.authorized, 20)
    assert transport.intervals == [1]
    assert transport.stopped == 1


@pytest.mark.parametrize('interval', [False, True, None, '.2', 0, -1, .049, 1.01, 10**1000,
                                     float('nan'), float('inf'), float('-inf')])
async def test_invalid_interval_is_rejected_before_authorization_or_spawn(monkeypatch, interval):
    async def forbidden(*args, **kwargs):
        pytest.fail('Invalid interval must be rejected before any authorization or process work')
    monkeypatch.setattr(asyncio, 'create_subprocess_exec', forbidden)
    with pytest.raises(RunnerError, match='studio_authorization_interval'):
        await studio._execute(['node', 'fixed-trusted-script'], {}, {}, forbidden, 20,
                              authorization_interval=interval)


async def test_fast_monitor_drains_inflight_callback_then_checks_final_authority_serially(monkeypatch):
    monkeypatch.setattr(studio, 'monotonic', lambda: 0., raising=False)
    entered, release, eof = (asyncio.Event() for _ in range(3))
    state = SimpleNamespace(checks=0, active=0, maximum=0, stopped=0, events=[])
    class Output:
        def __init__(self, first):
            self.first = first
        async def read(self, size):
            await eof.wait()
            value, self.first = self.first, b''
            return value
    class Input:
        def write(self, value):
            pass
        async def drain(self):
            pass
        def close(self):
            pass
    process = SimpleNamespace(stdout=Output(b'{}'), stderr=Output(b''), stdin=Input(), returncode=0)
    async def waited():
        return 0
    process.wait = waited
    async def spawn(*args, **kwargs):
        return process
    async def stop(owned):
        assert owned is process
        state.stopped += 1
    async def authorized():
        state.checks += 1
        number = state.checks
        state.active += 1
        state.maximum = max(state.maximum, state.active)
        state.events.append(f'enter-{number}')
        try:
            if number == 2:
                entered.set()
                await release.wait()
            return number < 3
        finally:
            state.events.append(f'exit-{number}')
            state.active -= 1
    original_wait = asyncio.wait_for
    async def observed_wait(awaitable, timeout):
        assert timeout == .2 and state.active == 0
        assert state.events[-1] == 'exit-2'
        state.events.append('wait')
        eof.set()
        return await original_wait(awaitable, timeout)
    monkeypatch.setattr(asyncio, 'create_subprocess_exec', spawn)
    monkeypatch.setattr(asyncio, 'wait_for', observed_wait)
    monkeypatch.setattr(studio, 'stop_process', stop)
    operation = asyncio.create_task(studio._execute(['node', 'fixed-trusted-script'], {}, {}, authorized, 20,
                                                   authorization_interval=.2))
    try:
        await original_wait(entered.wait(), 2)
        assert not operation.done() and state.checks == 2 and state.active == 1
        release.set()
        with pytest.raises(RunnerError, match='authorization_revoked'):
            await operation
        assert state.events == ['enter-1', 'exit-1', 'enter-2', 'exit-2', 'wait', 'enter-3', 'exit-3']
        assert state.maximum == 1 and state.active == 0 and state.stopped == 1
    finally:
        release.set()
        if not operation.done():
            operation.cancel()
        await asyncio.gather(operation, return_exceptions=True)


async def test_actual_live_preview_serve_uses_faster_fresh_check_cadence(transport, monkeypatch):
    class Store:
        def __init__(self):
            self.terminal_view = None
            self.released = False
        def file(self, identity, kind):
            return kind
        def read(self, file):
            return None
        def terminal(self, record, view):
            self.terminal_view = view
        def release(self, record):
            self.released = True
    store = Store()
    service = live_preview.Service(store=store)
    identity, lease_id = str(uuid4()), str(uuid4())
    expected = SimpleNamespace(creation_id=identity, accepted=SimpleNamespace(accepted_revision=1,
        candidate_sha256='b'*64, canonical_host='fixture.preview.invalid'),
        model_dump=lambda **kwargs: {})
    proof = SimpleNamespace(model_dump=lambda **kwargs: {})
    async def prepare(*args, **kwargs):
        return proof
    async def permitted(lease):
        return await transport.authorized()
    monkeypatch.setattr(live_preview.foundation, 'prepare_preview', prepare)
    monkeypatch.setattr(service, 'permitted', permitted)
    monkeypatch.setattr(studio, 'configuration', lambda: (Path('node'), None, Path('/trusted/runtime/artifacts'), {}))
    record = {'nonce': 'a'*64}
    view = {'lease_id': lease_id, 'creation_id': identity, 'idempotency_key': str(uuid4()),
        'state': 'preparing', 'accepted_revision': 1, 'scope_sha256': 'b'*64,
        'execution_source_revision': 'a'*40, 'public_source_revision': 'c'*40,
        'site_context_sha256': 'd'*64, 'created_at': '2026-10-17T09:00:00+00:00',
        'expires_at': None, 'preview_url': None, 'failure_code': None, 'local_preview_only': True,
        'full_site_status': 'UNVERIFIED', 'launch_status': 'UNVERIFIED', 'deployment': 'not_performed'}
    lease = live_preview.Lease(record, SimpleNamespace(token='fixture'), expected, view)
    await service.drive(lease)
    assert transport.intervals == [.2], 'Long-lived serve needs fresh checks without the extra one-second idle gap'
    assert transport.stopped == 1 and store.released
    assert store.terminal_view['failure_code'] == 'authorization_revoked'
