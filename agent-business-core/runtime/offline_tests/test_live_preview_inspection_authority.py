"""Real project/inspection composition; only native bytes and SQL authority are fake."""
import asyncio
import copy
from types import SimpleNamespace

import pytest
from test_live_preview_runtime import fixture, ready  # noqa: F401

from pinet_core.control.routes import ControlError
from pinet_core.site_build import live_preview as live
from pinet_core.tasks.codex_transport import RunnerError


async def test_ready_inspection_joins_the_owned_inflight_authority(fixture, monkeypatch):  # noqa: F811
    f = fixture
    lease = await ready(f)
    native_entered, invoke_native, authority_entered, release = (asyncio.Event() for _ in range(4))
    state = SimpleNamespace(calls=0, active=0, maximum=0, callbacks=0)
    original = live.studio._execute

    async def verify(expected):
        assert expected is lease.scope
        state.calls += 1
        number = state.calls
        state.active += 1
        state.maximum = max(state.maximum, state.active)
        try:
            if number >= 2:
                authority_entered.set()
                await release.wait()
        finally:
            state.active -= 1

    async def execute(args, body, env, permitted, seconds, **kwargs):
        if body['action'] != 'inspect':
            return await original(args, body, env, permitted, seconds, **kwargs)
        native_entered.set()
        await invoke_native.wait()
        state.callbacks += 1
        if not await permitted():
            raise RunnerError('authorization_revoked')
        return {'version': 'customer-live-preview-inspection.v1', 'scope_sha256': f.pin.fingerprint(),
                'site_context_sha256': f.pin.site_context_sha256, 'can_start': True, 'blocked_reasons': []}

    monkeypatch.setattr(lease.authority, 'verify', verify)
    monkeypatch.setattr(live.studio, '_execute', execute)
    projection = asyncio.create_task(f.manager.project(lease.record, check=True))
    background = None
    try:
        await asyncio.wait_for(native_entered.wait(), 2)
        # Initial project authorization is finished. Hold the next normal lease
        # check, then let the actual inspection callback attempt authorization.
        background = asyncio.create_task(f.manager.permitted(lease))
        await asyncio.wait_for(authority_entered.wait(), 2)
        invoke_native.set()
        for _ in range(12):
            await asyncio.sleep(0)
        concurrent = state.maximum
        release.set()
        value = await projection
        assert await background
        assert value['state'] == 'ready' and state.callbacks == 1
        assert concurrent == 1, 'Native inspection must join the exact live lease check, not compete with it'
        assert state.calls == 3, 'Initial check, shared in-flight check and fresh final check are distinct'
        # A later completed operation must perform fresh checks again.
        before = state.calls
        await f.manager.project(lease.record, check=True)
        assert state.calls > before and state.active == 0
    finally:
        release.set()
        invoke_native.set()
        await asyncio.gather(projection, *([background] if background else []), return_exceptions=True)


@pytest.mark.parametrize('binding', ['foreign_token', 'foreign_scope', 'ambiguous', 'missing_token',
                                   'completed_producer', 'inactive_state'])
async def test_unrelated_or_ambiguous_inspection_never_borrows_a_live_check(fixture, monkeypatch, binding):  # noqa: F811
    f = fixture
    lease = await ready(f)
    entered, release = asyncio.Event(), asyncio.Event()
    calls = SimpleNamespace(live=0, independent=0)
    expected = lease.scope
    token = lease.authority.token
    original_task, original_view = lease.task, copy.deepcopy(lease.view)
    duplicate = None
    if binding == 'foreign_token':
        token = 'another-synthetic-token'
    elif binding == 'foreign_scope':
        expected = expected.model_copy(update={'site_context_sha256': 'f'*64})
    elif binding == 'missing_token':
        token = None
    elif binding == 'ambiguous':
        duplicate = copy.copy(lease)
        duplicate.view = copy.deepcopy(lease.view)
        duplicate.auth_task = None
        duplicate.task = asyncio.get_running_loop().create_future()
        f.manager.leases['synthetic-ambiguous-owner'] = duplicate
    elif binding == 'completed_producer':
        lease.task = asyncio.get_running_loop().create_future()
        lease.task.set_result(None)
    elif binding == 'inactive_state':
        lease.view['state'] = 'failed'
    async def live_verify(scope):
        assert scope is lease.scope
        calls.live += 1
        entered.set()
        await release.wait()
    async def independent_verify(scope):
        assert scope is expected
        calls.independent += 1
    async def execute(args, body, env, permitted, seconds, **kwargs):
        assert body['action'] == 'inspect'
        if not await permitted():
            raise RunnerError('authorization_revoked')
        return {'version': 'customer-live-preview-inspection.v1', 'scope_sha256': expected.fingerprint(),
                'site_context_sha256': expected.site_context_sha256, 'can_start': True, 'blocked_reasons': []}
    monkeypatch.setattr(lease.authority, 'verify', live_verify)
    monkeypatch.setattr(live.studio, '_execute', execute)
    background = asyncio.create_task(f.manager.permitted(lease))
    try:
        await asyncio.wait_for(entered.wait(), 2)
        authority = SimpleNamespace(token=token, verify=independent_verify)
        inspected = await asyncio.wait_for(f.manager.inspect(authority, expected), 2)
        assert inspected['can_start'] and calls.independent == 2 and calls.live == 1
        assert not background.done()
    finally:
        f.manager.leases.pop('synthetic-ambiguous-owner', None)
        if duplicate is not None:
            duplicate.task.cancel()
        lease.task, lease.view = original_task, original_view
        release.set()
        await asyncio.gather(background, return_exceptions=True)


@pytest.mark.parametrize('checkpoint', ['callback', 'final'])
@pytest.mark.parametrize('status,code', [(401, 'unauthenticated'), (404, 'not_found'),
                                      (409, 'private_intake_missing'), (503, 'source_unavailable')])
async def test_matching_inspection_keeps_original_typed_refusal(fixture, monkeypatch, checkpoint, status, code):  # noqa: F811
    f = fixture
    lease = await ready(f)
    denied = ControlError(status, code)
    calls = 0
    async def verify(expected):
        nonlocal calls
        assert expected is lease.scope
        calls += 1
        if checkpoint == 'callback' or calls == 2:
            raise denied
    async def execute(args, body, env, permitted, seconds, **kwargs):
        if not await permitted():
            raise RunnerError('authorization_revoked')
        return {'version': 'customer-live-preview-inspection.v1', 'scope_sha256': f.pin.fingerprint(),
                'site_context_sha256': f.pin.site_context_sha256, 'can_start': True, 'blocked_reasons': []}
    monkeypatch.setattr(lease.authority, 'verify', verify)
    monkeypatch.setattr(live.studio, '_execute', execute)
    with pytest.raises(ControlError) as error:
        await f.manager.inspect(lease.authority, lease.scope)
    assert error.value is denied and (error.value.status, error.value.code) == (status, code)
    assert lease.view['state'] == 'revoked' and lease.view['failure_code'] == code
    assert lease.view['preview_url'] is None
    assert not await f.manager.permitted(lease)


async def test_post_output_check_starts_after_output_even_when_an_older_check_is_inflight(fixture, monkeypatch):  # noqa: F811
    f = fixture
    lease = await ready(f)
    older_entered, output, release = (asyncio.Event() for _ in range(3))
    state = SimpleNamespace(calls=0, valid=True, background=None)
    denied = ControlError(401, 'unauthenticated')
    async def verify(expected):
        assert expected is lease.scope
        state.calls += 1
        number, was_valid = state.calls, state.valid
        if number == 2:
            older_entered.set()
            await release.wait()
        if not was_valid:
            raise denied
    async def execute(args, body, env, permitted, seconds, **kwargs):
        assert await permitted()
        state.background = asyncio.create_task(f.manager.permitted(lease))
        await older_entered.wait()
        output.set()
        return {'version': 'customer-live-preview-inspection.v1', 'scope_sha256': f.pin.fingerprint(),
                'site_context_sha256': f.pin.site_context_sha256, 'can_start': True, 'blocked_reasons': []}
    monkeypatch.setattr(lease.authority, 'verify', verify)
    monkeypatch.setattr(live.studio, '_execute', execute)
    inspection = asyncio.create_task(f.manager.inspect(lease.authority, lease.scope))
    try:
        await asyncio.wait_for(output.wait(), 2)
        for _ in range(8):
            await asyncio.sleep(0)
        assert state.calls == 2 and not inspection.done()
        # The older running observation already read its actor. A final check
        # must start a new observation after output, rather than reuse that read.
        state.valid = False
        release.set()
        with pytest.raises(ControlError) as error:
            await inspection
        assert error.value is denied and state.calls == 3
        assert lease.view['preview_url'] is None and lease.view['state'] == 'revoked'
    finally:
        release.set()
        await asyncio.gather(inspection, *([state.background] if state.background else []), return_exceptions=True)


@pytest.mark.parametrize('checkpoint', ['callback', 'final'])
async def test_closed_matching_lease_false_never_authorizes_native_output(fixture, monkeypatch, checkpoint):  # noqa: F811
    f = fixture
    lease = await ready(f)
    async def execute(args, body, env, permitted, seconds, **kwargs):
        if checkpoint == 'callback':
            f.manager.stop(lease, 'closed', 'live_preview_closed', cancel=False)
        if not await permitted():
            raise RunnerError('authorization_revoked')
        if checkpoint == 'final':
            f.manager.stop(lease, 'closed', 'live_preview_closed', cancel=False)
        return {'version': 'customer-live-preview-inspection.v1', 'scope_sha256': f.pin.fingerprint(),
                'site_context_sha256': f.pin.site_context_sha256, 'can_start': True, 'blocked_reasons': []}
    monkeypatch.setattr(live.studio, '_execute', execute)
    with pytest.raises(ControlError) as error:
        await f.manager.inspect(lease.authority, lease.scope)
    assert (error.value.status, error.value.code) == (409, 'authorization_revoked')
    assert lease.stop_reason == 'closed' and lease.view['preview_url'] is None
