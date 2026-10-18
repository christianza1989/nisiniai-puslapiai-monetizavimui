"""Successful transport EOF is not proof of natural renderer expiry."""
import asyncio
from datetime import timedelta

import pytest
import test_live_preview_runtime as protocol

from pinet_core.site_build import live_preview as live

fixture = protocol.fixture


async def completion(f, monkeypatch, result, *, elapsed=False, publish=True):
    original = live.studio._execute

    async def execute(args, body, *rest, **kwargs):
        value = await original(args, body, *rest, **kwargs)
        return result if body["action"] == "serve" else value

    monkeypatch.setattr(live.studio, "_execute", execute)
    lease = await protocol.ready(f) if publish else await protocol.started(f)
    if elapsed:
        observed = live.now() + timedelta(seconds=81)
        monkeypatch.setattr(live, "now", lambda: observed)
    f.finish.set()
    await asyncio.wait_for(lease.task, 3)
    return lease


@pytest.mark.parametrize("result", [None, [], {}, {"state": "expired"},
    {"version": "customer-live-preview-completed.v1", "state": "closed"},
    {"version": "customer-live-preview-completed.v1", "state": "expired", "extra": True}])
async def test_malformed_successful_completion_is_not_natural_expiry(fixture, monkeypatch, result):
    lease = await completion(fixture, monkeypatch, result)
    assert lease.view["state"] == "failed"
    assert lease.view["failure_code"] == "live_preview_process_finished"
    assert lease.view["preview_url"] is None and not fixture.manager.store.busy()
    assert fixture.joined == 1


@pytest.mark.parametrize("publish", [False, True])
async def test_early_valid_successful_completion_is_not_natural_expiry(fixture, monkeypatch, publish):
    result = {"version": "customer-live-preview-completed.v1", "state": "expired"}
    lease = await completion(fixture, monkeypatch, result, publish=publish)
    assert lease.view["state"] == "failed"
    assert lease.view["failure_code"] == "live_preview_process_finished"
    assert lease.view["preview_url"] is None and not fixture.manager.store.busy()


async def test_exact_completion_after_recorded_expiry_is_normal_expiry(fixture, monkeypatch):
    result = {"version": "customer-live-preview-completed.v1", "state": "expired"}
    lease = await completion(fixture, monkeypatch, result, elapsed=True)
    assert lease.view["state"] == "expired" and lease.view["failure_code"] == "live_preview_expired"
    assert lease.view["preview_url"] is None and not fixture.manager.store.busy()
    assert fixture.joined == 1
