"""One unpublished retry; real lease service, private ledger, mocked producer/authority."""
import asyncio
import copy
from datetime import timedelta

import pytest
from test_live_preview_runtime import fixture, publish  # noqa: F401

from pinet_core.control.routes import ControlError
from pinet_core.site_build import live_preview as live
from pinet_core.tasks.codex_transport import RunnerError


def diagnostic(f, lease, suffix):
    return f.manager.store.directory / (lease.view["lease_id"] + "." + suffix + ".json")


def closed_receipt(f, lease, body, *, guard_patch=None, closed_patch=None):
    guard = {"version": "customer-live-preview-guard-failure.v1", "lease_id": lease.view["lease_id"],
        "scope_sha256": f.pin.fingerprint(), "stage": "heartbeat", "code": "heartbeat_expired",
        "checkpoint": "before_context", "observed_at": live.now().isoformat(),
        "elapsed_ms": 1, "pulse_margin_ms": -1} | (guard_patch or {})
    closed = {"version": "customer-live-preview-startup-closed.v1", "lease_id": lease.view["lease_id"],
        "instance_id": f.manager.instance_id, "nonce": lease.record["nonce"],
        "request_sha256": live.digest(lease.record), "scope_sha256": f.pin.fingerprint(),
        "prepared_sha256": lease.proof.artifact_sha256, "hard_end_ms": body["hard_end_ms"],
        "attempt_index": 0, "guard_sha256": live.digest(guard), "cause": "heartbeat_expired",
        "closed_at": live.now().isoformat()} | (closed_patch or {})
    f.manager.store.exclusive(diagnostic(f, lease, "guard-failure"), guard)
    f.manager.store.exclusive(diagnostic(f, lease, "startup-closed"), closed)


def execute_with(f, monkeypatch, first, *, second_failure=False):
    attempts = []
    async def execute(args, body, env, permitted, seconds, **kwargs):
        if body["action"] == "inspect":
            return {"version": "customer-live-preview-inspection.v1", "scope_sha256": f.pin.fingerprint(),
                "site_context_sha256": f.pin.site_context_sha256, "can_start": True, "blocked_reasons": []}
        attempts.append((copy.deepcopy(body), seconds))
        lease = f.manager.leases[body["lease_id"]]
        if len(attempts) == 1:
            assert await permitted()
            await first(lease, body)
            raise RunnerError("authorization_revoked")
        if second_failure:
            raise RunnerError("studio_unavailable")
        assert await permitted()
        publish(f, lease)
        f.entered.set()
        await f.finish.wait()
        return {"state": "expired"}
    monkeypatch.setattr(live.studio, "_execute", execute)
    return attempts


async def start(f):
    value = await f.manager.start("session", f.cid, f.request)
    return f.manager.leases[value["lease_id"]]


async def ready_or_terminal(f, lease):
    waiting = asyncio.create_task(f.entered.wait())
    try:
        await asyncio.wait_for(asyncio.wait({lease.task, waiting}, return_when=asyncio.FIRST_COMPLETED), 2)
    finally:
        waiting.cancel()
        await asyncio.gather(waiting, return_exceptions=True)


async def test_unpublished_expiry_retries_after_join_and_a_new_authority_observation(fixture, monkeypatch):
    f = fixture
    joined, drain, draining = asyncio.Event(), asyncio.Event(), asyncio.Event()
    original, checks = {}, []
    async def first(lease, body):
        closed_receipt(f, lease, body)
        original.update({s: diagnostic(f, lease, s).read_bytes() for s in ("guard-failure", "startup-closed")})
        checks.append(f.verified)
        async def old_authority():
            draining.set()
            await drain.wait()
        lease.auth_task = asyncio.create_task(old_authority())
        joined.set()
    attempts = execute_with(f, monkeypatch, first)
    lease = await start(f)
    await asyncio.wait_for(draining.wait(), 2)
    assert joined.is_set() and len(attempts) == 1 and not f.entered.is_set()
    drain.set()
    await ready_or_terminal(f, lease)
    assert f.entered.is_set() and len(attempts) == 2 and f.verified > checks[0]
    bodies = [item[0].copy() for item in attempts]
    assert [b.pop("attempt_index") for b in bodies] == [0, 1] and bodies[0] == bodies[1]
    assert 0 < attempts[1][1] <= attempts[0][1] == 149
    assert live.now().timestamp()*1000 < bodies[0]["hard_end_ms"] <= (live.now().timestamp()+120)*1000
    await f.manager.ready(lease)
    assert (await f.manager.detail("session", f.cid, lease.view["lease_id"]))["state"] == "ready"
    for suffix, raw in original.items():
        assert diagnostic(f, lease, suffix).read_bytes() == raw
    f.finish.set()
    await lease.task
    assert lease.view["state"] == "expired" and len(attempts) == 2


@pytest.mark.parametrize("change", ["no-closed", "no-guard", "nonce", "scope", "request", "proof",
    "extra-key", "bool-attempt", "bool-deadline", "guard-code", "guard-margin", "guard-elapsed",
    "future-time", "unknown-cleanup", "valid-ready", "invalid-ready", "deny", "lost-claim"])
async def test_missing_malformed_or_nontransient_evidence_never_retries(fixture, monkeypatch, change):
    f = fixture
    async def first(lease, body):
        guard_patch, closed_patch = {}, {}
        if change in {"nonce", "scope", "request", "proof"}:
            key = {"scope": "scope_sha256", "request": "request_sha256", "proof": "prepared_sha256"}.get(change, change)
            closed_patch[key] = "0"*64
        if change == "extra-key": closed_patch["unexpected"] = True
        if change == "bool-attempt": closed_patch["attempt_index"] = False
        if change == "bool-deadline": closed_patch["hard_end_ms"] = True
        if change == "guard-code": guard_patch["code"] = "heartbeat_binding_mismatch"
        if change == "guard-margin": guard_patch["pulse_margin_ms"] = 1
        if change == "guard-elapsed": guard_patch["elapsed_ms"] = -1
        if change == "future-time": closed_patch["closed_at"] = (live.now()+timedelta(hours=1)).isoformat()
        closed_receipt(f, lease, body, guard_patch=guard_patch, closed_patch=closed_patch)
        if change == "no-closed": diagnostic(f, lease, "startup-closed").unlink()
        if change == "no-guard": diagnostic(f, lease, "guard-failure").unlink()
        if change == "valid-ready": publish(f, lease)
        if change == "invalid-ready": f.manager.store.file(lease.view["lease_id"], "ready").write_text("invalid")
        if change == "deny": f.valid = False
        if change == "lost-claim": f.manager.store.release(lease.record)
        if change == "unknown-cleanup": raise RunnerError("output_invalid")
    attempts = execute_with(f, monkeypatch, first)
    lease = await start(f)
    await asyncio.wait_for(lease.task, 2)
    assert len(attempts) == 1 and lease.view["state"] in {"failed", "revoked"}
    assert lease.view["preview_url"] is None


@pytest.mark.parametrize("change", ["exception", "cancelled"])
async def test_done_old_authority_failure_is_not_discarded(fixture, monkeypatch, change):
    f = fixture
    async def first(lease, body):
        closed_receipt(f, lease, body)
        async def previous():
            if change == "exception": raise ControlError(401, "unauthenticated")
            raise asyncio.CancelledError
        lease.auth_task = asyncio.create_task(previous())
        await asyncio.sleep(0)
        assert lease.auth_task.done()
    attempts = execute_with(f, monkeypatch, first)
    lease = await start(f)
    await asyncio.wait_for(lease.task, 2)
    assert len(attempts) == 1 and lease.view["state"] == "revoked" and lease.view["preview_url"] is None


@pytest.mark.parametrize("stage", ["before-fresh", "after-fresh"])
async def test_ready_racing_with_retry_fence_never_starts_second_producer(fixture, monkeypatch, stage):
    f = fixture
    async def first(lease, body): closed_receipt(f, lease, body)
    attempts = execute_with(f, monkeypatch, first)
    original = f.manager.verify_lease
    async def verify(lease, *, fresh=False):
        if fresh and stage == "before-fresh": publish(f, lease)
        result = await original(lease, fresh=fresh)
        if fresh and stage == "after-fresh": publish(f, lease)
        return result
    monkeypatch.setattr(f.manager, "verify_lease", verify)
    lease = await start(f)
    await asyncio.wait_for(lease.task, 2)
    assert len(attempts) == 1 and lease.view["state"] == "failed" and lease.view["preview_url"] is None


async def test_second_failure_preserves_first_receipts_and_cannot_retry_again(fixture, monkeypatch):
    f = fixture
    original = {}
    async def first(lease, body):
        closed_receipt(f, lease, body)
        original.update({s: diagnostic(f, lease, s).read_bytes() for s in ("guard-failure", "startup-closed")})
    attempts = execute_with(f, monkeypatch, first, second_failure=True)
    lease = await start(f)
    await asyncio.wait_for(lease.task, 2)
    assert len(attempts) == 2 and lease.view["failure_code"] == "studio_unavailable"
    for suffix, raw in original.items(): assert diagnostic(f, lease, suffix).read_bytes() == raw
    assert (await f.manager.start("session", f.cid, f.request))["state"] == "failed" and len(attempts) == 2


@pytest.mark.parametrize("change", ["close", "claim", "deadline"])
async def test_post_authorization_fence_keeps_late_close_claim_or_deadline_terminal(fixture, monkeypatch, change):
    f = fixture
    async def first(lease, body): closed_receipt(f, lease, body)
    attempts = execute_with(f, monkeypatch, first)
    original_verify, original_now = f.manager.verify_lease, live.now
    async def verify(lease, *, fresh=False):
        result = await original_verify(lease, fresh=fresh)
        if fresh:
            if change == "close": f.manager.stop(lease, "closed", "live_preview_closed", cancel=False)
            if change == "claim": f.manager.store.release(lease.record)
            if change == "deadline": monkeypatch.setattr(live, "now", lambda: original_now()+timedelta(seconds=121))
        return result
    monkeypatch.setattr(f.manager, "verify_lease", verify)
    lease = await start(f)
    await asyncio.wait_for(lease.task, 2)
    assert len(attempts) == 1 and lease.view["preview_url"] is None
    assert lease.view["state"] == ("closed" if change == "close" else "failed")


@pytest.mark.parametrize("stage", ["drain", "fresh"])
async def test_one_outer_deadline_covers_draining_and_new_authorization(fixture, monkeypatch, stage):
    f = fixture
    original_timeout = asyncio.timeout
    monkeypatch.setattr(asyncio, "timeout", lambda seconds: original_timeout(.08 if seconds == 149 else seconds))
    entered = asyncio.Event()
    async def blocked():
        entered.set()
        await asyncio.Event().wait()
    async def first(lease, body):
        closed_receipt(f, lease, body)
        if stage == "drain": lease.auth_task = asyncio.create_task(blocked())
    attempts = execute_with(f, monkeypatch, first)
    if stage == "fresh":
        original = f.manager.verify_lease
        async def verify(lease, *, fresh=False):
            if fresh: await blocked()
            return await original(lease, fresh=fresh)
        monkeypatch.setattr(f.manager, "verify_lease", verify)
    lease = await start(f)
    await asyncio.wait_for(lease.task, 2)
    assert entered.is_set() and len(attempts) == 1 and lease.view["failure_code"] == "studio_timeout"
    assert lease.view["preview_url"] is None and not f.manager.store.busy()
