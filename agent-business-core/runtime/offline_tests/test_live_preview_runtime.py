"""Owned lease protocol only: mocked transport/authority, isolated private ledger, no process or SQL."""
import asyncio
import copy
import json
from contextlib import asynccontextmanager
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from test_foundation_bridge import scope

from pinet_core.control.routes import ControlError
from pinet_core.site_build import live_preview as live
from pinet_core.site_build.live_preview_store import Store
from pinet_core.site_build.live_preview_wire import Start


@pytest.fixture
async def fixture(tmp_path, monkeypatch):
    pin = scope()
    state = SimpleNamespace(pin=pin, valid=True, blocked=False, prepared=0, served=0, inspected=0,
        verified=0, joined=0, finish=asyncio.Event(), cleanup=asyncio.Event(), entered=asyncio.Event())
    state.cleanup.set()
    class Authority:
        def __init__(self, token, identity):
            self.token, self.identity = token, identity
        async def authenticate(self):
            if self.token == "unauthenticated":
                raise ControlError(401, "unauthenticated")
            return {"user_id": str(pin.user_id), "session_id": str(pin.session_id) if self.token == "session" else str(uuid4()),
                "environment": pin.environment_id, "creation_id": self.identity}
        async def capture(self):
            await self.verify(state.pin)
            return state.pin
        async def verify(self, expected):
            state.verified += 1
            if not state.valid:
                raise ControlError(401, "unauthenticated")
            if expected != state.pin:
                raise ControlError(409, "foundation_context_stale")
    async def prepare(expected, *, still_authorized):
        if not await still_authorized():
            raise ControlError(401, "unauthenticated")
        state.prepared += 1
        return SimpleNamespace(artifact_sha256="b"*64, model_dump=lambda **_: {"artifact_sha256": "b"*64})
    async def execute(args, body, env, permitted, seconds, *, authorization_interval=1.0):
        assert args[1] == live.SCRIPT and await permitted()
        if body["action"] == "inspect":
            state.inspected += 1
            assert seconds == 20
            assert authorization_interval == 1
            return {"version": "customer-live-preview-inspection.v1", "scope_sha256": state.pin.fingerprint(),
                "site_context_sha256": state.pin.site_context_sha256, "can_start": not state.blocked,
                "blocked_reasons": ["review_missing:page-one"] if state.blocked else []}
        state.served += 1
        assert authorization_interval == .2
        assert seconds == 149 and '"session"' not in json.dumps(body)
        assert set(body) == {"action", "scope", "creationId", "acceptedRevision", "sourceHash", "canonicalHost",
            "artifactsRoot", "dataDir", "outputDir", "prepared", "lease_id", "instance_id", "nonce", "request_sha256"}
        state.body = body
        state.entered.set()
        try:
            await state.finish.wait()
            return {"state": "expired"}
        finally:
            await state.cleanup.wait()
            state.joined += 1
    monkeypatch.setattr(live, "settings", lambda: SimpleNamespace(control_source_revision=pin.sources.execution_source_revision))
    monkeypatch.setattr(live.foundation, "prepare_preview", prepare)
    monkeypatch.setattr(live.studio, "configuration", lambda: ("node", None, tmp_path, {}))
    monkeypatch.setattr(live.studio, "_execute", execute)
    manager = live.Service(authority=Authority, store=Store(tmp_path))
    request = Start(accepted_revision=1, site_context_sha256=pin.site_context_sha256, idempotency_key=uuid4())
    state.manager, state.request, state.cid = manager, request, str(pin.creation_id)
    yield state
    state.cleanup.set()
    await manager.close()


async def started(f):
    value = await f.manager.start("session", f.cid, f.request)
    await asyncio.wait_for(f.entered.wait(), 3)
    lease = f.manager.leases[value["lease_id"]]
    assert lease.view["state"] == "starting"
    return lease


def publish(f, lease, **patch):
    value = {"version": "customer-live-preview-ready.v1", "lease_id": lease.view["lease_id"],
        "nonce": lease.record["nonce"], "scope_sha256": lease.scope.fingerprint(), "prepared_sha256": "b"*64,
        "preview_url": "http://127.0.0.1:12345/", "expires_at": (live.now()+timedelta(seconds=80)).isoformat()} | patch
    f.manager.store.exclusive(f.manager.store.file(lease.view["lease_id"], "ready"), value)


async def ready(f):
    lease = await started(f)
    publish(f, lease)
    await f.manager.ready(lease)
    return lease


async def test_availability_is_readonly_and_cannot_prepare_or_adopt_a_preview(fixture):
    f = fixture
    value = await f.manager.availability("session", f.cid)
    assert value["can_start"] and value["latest_lease"] is None and f.prepared == f.served == 0
    assert not f.manager.store.directory.exists()
    f.blocked = True
    value = await f.manager.availability("session", f.cid)
    assert not value["can_start"] and value["blocked_reasons"] == ["review_missing:page-one"]
    assert not f.manager.store.directory.exists()


async def test_replay_acknowledges_original_uuid_and_terminal_replay_never_starts_again(fixture):
    f = fixture
    lease = await ready(f)
    value = await f.manager.start("session", f.cid, f.request)
    assert value["lease_id"] == lease.view["lease_id"] and value["idempotency_key"] == str(f.request.idempotency_key)
    assert value["preview_url"] == "http://127.0.0.1:12345/" and f.prepared == f.served == 1
    closed = await f.manager.detail("session", f.cid, value["lease_id"], close=True)
    assert closed["state"] == "closed" and closed["preview_url"] is None and f.joined == 1
    assert not f.manager.store.busy() and lease.authority.token is None
    assert (await f.manager.start("session", f.cid, f.request))["state"] == "closed"
    assert f.served == 1
    assert "session\"" not in b"".join(p.read_bytes() for p in f.manager.store.directory.iterdir()).decode()


@pytest.mark.parametrize("change", ["hash", "revision", "session", "request"])
async def test_stale_click_or_foreign_session_cannot_rebase_or_replay(fixture, change):
    f = fixture
    if change in {"session", "request"}:
        await started(f)
    request, token = f.request, "session"
    if change == "hash":
        request = request.model_copy(update={"site_context_sha256": "0"*64})
    elif change == "revision":
        request = request.model_copy(update={"accepted_revision": 2})
    elif change == "request":
        request = request.model_copy(update={"site_context_sha256": "0"*64})
    else:
        token = "new-session"
    try:
        with pytest.raises(ControlError) as error:
            await f.manager.start(token, f.cid, request)
        assert error.value.status == 409
        assert error.value.code == ("idempotency_conflict" if change in {"session", "request"} else "live_preview_context_stale")
    finally:
        await f.manager.close()


@pytest.mark.parametrize("change", ["revocation", "native", "media", "finished", "expiry", "source"])
async def test_live_url_disappears_before_cleanup_on_any_lost_authority(fixture, monkeypatch, change):
    f = fixture
    lease = await ready(f)
    f.cleanup.clear()
    if change == "revocation":
        f.valid = False
    elif change == "native":
        f.pin = f.pin.model_copy(update={"site_context_sha256": "0"*64})
    elif change == "media":
        f.blocked = True
    elif change == "finished":
        f.finish.set()
        f.cleanup.set()
        await lease.task
    elif change == "expiry":
        lease.view["expires_at"] = (live.now()-timedelta(seconds=1)).isoformat()
    else:
        monkeypatch.setattr(live, "settings", lambda: SimpleNamespace(control_source_revision="0"*40))
    value = await f.manager.project(lease.record, check=True)
    assert value["preview_url"] is None and value["state"] in {"expired", "revoked", "failed"}
    if not lease.task.done():
        assert f.manager.store.busy()  # Cannot reopen the shared renderer until its owner has joined.
    f.cleanup.set()
    await f.manager.close()
    assert lease.task.done() and f.joined == 1


@pytest.mark.parametrize("patch", [{"nonce": "0"*64}, {"scope_sha256": "0"*64}, {"prepared_sha256": "0"*64},
    {"preview_url": "https://example.org/"}, {"preview_url": "http://127.0.0.1:65536/"},
    {"expires_at": "2026-01-01T00:00:00Z"}, {"unexpected": True}])
async def test_private_ready_receipt_is_exact_and_opaque_not_url_authority(fixture, patch):
    f = fixture
    lease = await started(f)
    publish(f, lease, **patch)
    try:
        with pytest.raises((ControlError, ValueError)):
            await f.manager.ready(lease)
        assert lease.view["preview_url"] is None
    finally:
        await f.manager.close()


async def test_heartbeat_advances_only_after_actual_successful_verification(fixture):
    f = fixture
    lease = await started(f)
    file = f.manager.store.file(lease.view["lease_id"], "heartbeat")
    before = file.read_bytes()
    f.valid = False
    assert not await f.manager.permitted(lease)
    assert file.read_bytes() == before and lease.view["preview_url"] is None
    await f.manager.close()


async def test_restart_never_adopts_pid_url_or_proof_and_unknown_lock_remains_held(fixture):
    f = fixture
    lease = await ready(f)
    restarted = live.Service(authority=f.manager.authority_factory, store=f.manager.store)
    value = await restarted.start("session", f.cid, f.request)
    assert value["state"] == "failed" and value["failure_code"] == "live_preview_service_restarted"
    assert value["preview_url"] is None and f.served == 1
    availability = await restarted.availability("session", f.cid)
    assert not availability["can_start"] and "live_preview_busy" in availability["blocked_reasons"]
    await restarted.close()
    assert f.manager.store.busy()
    await f.manager.close()
    assert lease.task.done()


async def test_repeated_shutdown_cancellation_waits_for_owned_transport_cleanup(fixture):
    f = fixture
    lease = await ready(f)
    f.cleanup.clear()
    closing = asyncio.create_task(f.manager.close())
    for _ in range(4):
        await asyncio.sleep(0)
        closing.cancel()
    assert not closing.done() and lease.view["preview_url"] is None and f.manager.store.busy()
    f.cleanup.set()
    with pytest.raises(asyncio.CancelledError):
        await closing
    assert lease.task.done() and f.joined == 1 and not f.manager.store.busy()


async def test_shutdown_serializes_against_inflight_start_admission(fixture, monkeypatch):
    f = fixture
    original = f.manager.inspect
    entered, proceed = asyncio.Event(), asyncio.Event()
    async def delayed(*args):
        entered.set()
        await proceed.wait()
        return await original(*args)
    monkeypatch.setattr(f.manager, "inspect", delayed)
    start = asyncio.create_task(f.manager.start("session", f.cid, f.request))
    await entered.wait()
    close = asyncio.create_task(f.manager.close())
    await asyncio.sleep(0)
    close.cancel()
    await asyncio.sleep(0)
    premature = close.done()
    proceed.set()
    await start
    with pytest.raises(asyncio.CancelledError):
        await close
    assert not premature
    assert all(lease.task.done() for lease in f.manager.leases.values())
    assert not f.manager.store.busy()


def test_ledger_rejects_malformed_claim_and_retains_capacity_without_eviction(tmp_path):
    store = Store(tmp_path)
    assert store.records() == [] and not store.directory.exists()
    store.exclusive(store.directory / "active.json", None)
    with pytest.raises(ControlError):
        store.busy()


async def test_ledger_owner_values_are_not_trusted_or_normalized(fixture):
    f = fixture
    lease = await started(f)
    await f.manager.close()
    file = f.manager.store.file(lease.view["lease_id"], "request")
    record = copy.deepcopy(lease.record)
    record["owner"]["session_id"] = "not-a-session"
    file.write_text(json.dumps(record), encoding="utf-8")
    with pytest.raises(ControlError):
        f.manager.store.records()


async def test_capacity_is_bounded_and_old_uuid_tombstones_are_never_evicted(fixture):
    f = fixture
    lease = await started(f)
    await f.manager.close()
    for _ in range(63):
        record = copy.deepcopy(lease.record)
        record["view"]["lease_id"] = str(uuid4())
        key = str(uuid4())
        record["request"]["idempotency_key"] = record["view"]["idempotency_key"] = key
        f.manager.store.claim(record)
        f.manager.store.release(record)
    assert len(f.manager.store.records()) == 64
    restarted = live.Service(authority=f.manager.authority_factory, store=f.manager.store)
    before = {p.name: p.read_bytes() for p in f.manager.store.directory.iterdir()}
    with pytest.raises(ControlError, match="live_preview_capacity"):
        await restarted.start("session", f.cid, f.request.model_copy(update={"idempotency_key": uuid4()}))
    assert {p.name: p.read_bytes() for p in f.manager.store.directory.iterdir()} == before
    assert (await restarted.start("session", f.cid, f.request))["state"] == "closed"


async def test_uncertain_transport_cleanup_keeps_claim_and_url_hidden(fixture, monkeypatch):
    f = fixture
    original = live.studio._execute
    async def broken(*args, **kwargs):
        if args[1]["action"] == "inspect":
            return await original(*args, **kwargs)
        raise OSError("synthetic cleanup failure; never disclose")
    monkeypatch.setattr(live.studio, "_execute", broken)
    value = await f.manager.start("session", f.cid, f.request)
    lease = f.manager.leases[value["lease_id"]]
    await lease.task
    assert lease.view["state"] == "failed" and lease.view["preview_url"] is None
    assert lease.view["failure_code"] == "live_preview_cleanup_unavailable" and f.manager.store.busy()
    assert "synthetic" not in json.dumps(lease.view)


async def test_authority_reuses_current_token_scope_owned_native_s6_and_foundation(monkeypatch):
    from pinet_core.creation import routes as creation_routes
    pin = scope()
    session = SimpleNamespace(id=str(pin.session_id), user_id=str(pin.user_id), environment_id=pin.environment_id)
    calls, tx = [], object()
    @asynccontextmanager
    async def transaction(**kwargs):
        assert kwargs == {"token": live.token_hash("private-token")}
        calls.append("scope")
        yield tx
    async def customer(actual, token):
        assert actual is tx and token == "private-token"
        calls.append("session")
        return session
    async def owned(actual, actor, identity):
        assert actual is tx and actor is session and identity == str(pin.creation_id)
        calls.append("owned")
        return SimpleNamespace(id=str(pin.creation_id), portfolio_id=str(pin.portfolio_id), environment_id=pin.environment_id)
    async def capture(actual, actor, identity):
        assert actual is tx and actor is session
        calls.append("capture")
        return pin
    def native(actual, actor, identity, request, **kwargs):
        assert actual is tx and actor is session
        assert vars(request) == {"accepted_revision": 1, "candidate_sha256": pin.accepted.candidate_sha256,
            "canonical_host": pin.accepted.canonical_host}
        async def check():
            calls.append("native_s6")
        return check
    async def verify(actual, expected):
        assert actual is tx and expected is pin
        calls.append("verify")
    monkeypatch.setattr(live, "scope", transaction)
    monkeypatch.setattr(live, "customer_session", customer)
    monkeypatch.setattr(live, "owned", owned)
    monkeypatch.setattr(creation_routes, "owned", owned)
    monkeypatch.setattr(live.foundation, "capture", capture)
    monkeypatch.setattr(live.foundation, "verify", verify)
    monkeypatch.setattr(live.media, "native_mutation_guard", native)
    authority = live.Authority("private-token", str(pin.creation_id))
    await authority.authenticate()
    assert await authority.capture() is pin
    await authority.verify(pin)
    assert calls == ["scope", "session", "owned", "scope", "session", "owned", "capture", "native_s6",
        "capture", "native_s6", "scope", "session", "native_s6", "verify", "native_s6", "verify"]
    session.id = str(uuid4())
    with pytest.raises(ControlError, match="unauthenticated"):
        await authority.verify(pin)
    assert calls[-2:] == ["scope", "session"]


async def test_router_four_operations_strict_bodies_current_wire_and_no_start_on_get(fixture, monkeypatch):
    from pinet_core.config import settings
    from pinet_core.control import bridge
    from pinet_core.customer.service import customer_guard
    from pinet_core.site_build import live_preview_routes as routes
    f = fixture
    monkeypatch.setattr(settings(), "environment", f.pin.environment_id)
    monkeypatch.setattr(settings(), "control_source_revision", f.pin.sources.execution_source_revision)
    async def trusted_local_transport(_):
        return None
    monkeypatch.setattr(bridge, "transport_guard", trusted_local_transport)
    factory = f.manager.authority_factory
    f.manager.authority_factory = lambda token, cid: factory("session" if token == "A"*64 else "unauthenticated", cid)
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[customer_guard] = lambda: None
    app.dependency_overrides[routes.builds.enabled] = lambda: None
    app.state.customer_live_preview_service = f.manager
    url = f"/customer/v2/creations/{f.cid}/live-previews"
    headers = {"Authorization": "Bearer "+"A"*64}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        value = await client.get(url, headers=headers)
        assert value.status_code == 200 and value.json()["contract_version"] == "customer-live-preview.v1"
        assert value.json()["data"]["can_start"] and f.prepared == f.served == 0
        assert not f.manager.store.directory.exists()
        assert (await client.get(url)).status_code == 401
        for method, target, body in [("GET", url+"?origin=forged", None), ("GET", url, b"{}"),
                ("POST", url, b" "*4097), ("POST", url, json.dumps(f.request.model_dump(mode="json")|{"origin": "forged"}).encode())]:
            response = await client.request(method, target, headers=headers, content=body)
            assert response.status_code == 400, response.text
            assert response.headers["cache-control"] == "private, no-store"
        admitted = await client.post(url, headers=headers, json=f.request.model_dump(mode="json"))
        assert admitted.status_code == 202, admitted.text
        lid = admitted.json()["data"]["lease_id"]
        detail = url+"/"+lid
        assert (await client.get(detail, headers=headers)).status_code == 200
        assert (await client.request("DELETE", detail, headers=headers, content=b"{}")).status_code == 400
        assert (await client.get(url+"/"+str(uuid4()), headers=headers)).status_code == 404
        closed = await client.delete(detail, headers=headers)
        assert closed.status_code == 200 and closed.json()["data"]["preview_url"] is None
        assert closed.json()["data"]["state"] == "closed"
    import ast
    import inspect

    from pinet_core import api, control_api
    for module in (api, control_api):
        operations = module.app.openapi()["paths"]
        collection = url.replace(f.cid, "{creation_id}")
        assert set(operations[collection]) == {"get", "post"}
        assert set(operations[collection+"/{lease_id}"]) == {"get", "delete"}
        # Both actual lifetime functions must await the owner cleanup before DB disposal.
        source = inspect.getsource(module.lifespan)
        ast.parse(source)
        assert source.index("await close_live_previews(app)") < source.index("await db.engine.dispose()")


async def test_router_lifespan_is_lazy_and_repeated_lifetimes_never_reuse_a_closed_manager():
    from pinet_core.site_build.live_preview_routes import lifespan
    app = FastAPI()
    async with lifespan(app):
        first = app.state.customer_live_preview_service
        assert first.store is None and not first.leases
    assert first.closing
    async with lifespan(app):
        second = app.state.customer_live_preview_service
        assert second is not first and not second.closing and second.store is None
    assert second.closing


async def test_failed_collection_observation_never_exposes_an_old_ready_url(fixture, monkeypatch):
    f = fixture
    lease = await ready(f)
    factory = f.manager.authority_factory
    def failing_capture(token, identity):
        authority = factory(token, identity)
        async def capture():
            raise ControlError(409, "foundation_context_stale")
        authority.capture = capture
        return authority
    monkeypatch.setattr(f.manager, "authority_factory", failing_capture)
    value = await f.manager.availability("session", f.cid)
    assert value["current_revision"] is None and value["site_context_sha256"] is None
    assert value["latest_lease"]["state"] == "revoked" and value["latest_lease"]["preview_url"] is None
    assert lease.view["preview_url"] is None


@pytest.mark.parametrize("value", [None, [], {"version": "forged"}])
async def test_malformed_readonly_bridge_reply_is_safe_503(fixture, monkeypatch, value):
    f = fixture
    async def invalid(*args):
        return value
    monkeypatch.setattr(live.studio, "_execute", invalid)
    with pytest.raises(ControlError, match="live_preview_inspection_invalid") as error:
        await f.manager.availability("session", f.cid)
    assert error.value.status == 503 and not f.manager.store.directory.exists()


async def delayed_authority(f, lease, monkeypatch):
    entered, proceed = asyncio.Event(), asyncio.Event()
    original = lease.authority.verify
    calls = []
    async def verify(expected):
        calls.append(expected)
        entered.set()
        await proceed.wait()
        return await original(expected)
    monkeypatch.setattr(lease.authority, "verify", verify)
    return entered, proceed, calls


async def test_concurrent_same_lease_authority_is_inflight_only_not_a_finished_result_cache(fixture, monkeypatch):
    f = fixture
    lease = await ready(f)
    entered, proceed, calls = await delayed_authority(f, lease, monkeypatch)
    first = asyncio.create_task(f.manager.permitted(lease))
    await entered.wait()
    second = asyncio.create_task(f.manager.permitted(lease))
    await asyncio.sleep(0)
    proceed.set()
    assert await asyncio.gather(first, second) == [True, True]
    assert len(calls) == 1
    assert await f.manager.permitted(lease)
    assert len(calls) == 2, "A completed observation cannot authorize a subsequent call"


async def test_cancelling_one_waiter_cannot_cancel_another_same_lease_authority_check(fixture, monkeypatch):
    f = fixture
    lease = await ready(f)
    entered, proceed, calls = await delayed_authority(f, lease, monkeypatch)
    first = asyncio.create_task(f.manager.permitted(lease))
    await entered.wait()
    second = asyncio.create_task(f.manager.permitted(lease))
    await asyncio.sleep(0)
    first.cancel()
    with pytest.raises(asyncio.CancelledError):
        await first
    proceed.set()
    assert await second
    assert len(calls) == 1


@pytest.mark.parametrize("change", ["stop", "expiry", "revoked"])
async def test_authority_completion_never_renews_a_stopped_expired_or_revoked_lease(fixture, monkeypatch, change):
    f = fixture
    lease = await ready(f)
    entered, proceed, _ = await delayed_authority(f, lease, monkeypatch)
    pulses = []
    monkeypatch.setattr(f.manager.store, "heartbeat", lambda *args, **kwargs: pulses.append(True))
    pending = asyncio.create_task(f.manager.permitted(lease))
    await entered.wait()
    if change == "stop":
        f.manager.stop(lease, "closed", cancel=False)
    elif change == "expiry":
        lease.view["expires_at"] = (live.now()-timedelta(seconds=1)).isoformat()
    else:
        f.valid = False
    pulses.clear()  # Earlier authorized work is not a late post-stop heartbeat.
    proceed.set()
    assert not await pending
    assert not pulses


async def test_shutdown_joins_the_exact_owned_inflight_authority_before_returning(fixture, monkeypatch):
    f = fixture
    lease = await ready(f)
    entered, proceed, _ = await delayed_authority(f, lease, monkeypatch)
    pending = asyncio.create_task(f.manager.permitted(lease))
    await entered.wait()
    closing = asyncio.create_task(f.manager.close())
    for _ in range(8):
        await asyncio.sleep(0)
    premature = closing.done()
    proceed.set()
    await closing
    assert not await pending
    assert not premature


async def test_unknown_producer_cleanup_still_joins_inflight_authority_and_retains_claim(fixture, monkeypatch):
    f = fixture
    original = live.studio._execute
    async def uncertain(*args, **kwargs):
        result = await original(*args, **kwargs)
        if args[1]["action"] == "serve":
            raise OSError("synthetic uncertain producer cleanup")
        return result
    monkeypatch.setattr(live.studio, "_execute", uncertain)
    lease = await ready(f)
    entered, proceed, _ = await delayed_authority(f, lease, monkeypatch)
    exited = asyncio.Event()
    verify = lease.authority.verify
    async def tracked(expected):
        try:
            return await verify(expected)
        finally:
            exited.set()
    monkeypatch.setattr(lease.authority, "verify", tracked)
    pending = asyncio.create_task(f.manager.permitted(lease))
    await entered.wait()
    f.finish.set()
    await asyncio.wait_for(lease.task, 3)
    joined = exited.is_set()
    proceed.set()
    assert not await pending
    assert joined, "Unknown producer cleanup cannot orphan its authority read"
    assert f.manager.store.busy() and lease.view["preview_url"] is None
    assert lease.view["failure_code"] == "live_preview_cleanup_unavailable"


def source_authority(f, monkeypatch, *, fail_exit=False, reject=False):
    from pinet_core.creation import routes as creation_routes
    events = []
    session = SimpleNamespace(id=str(f.pin.session_id), user_id=str(f.pin.user_id), environment_id=f.pin.environment_id)
    creation = SimpleNamespace(id=f.cid, portfolio_id=str(f.pin.portfolio_id), environment_id=f.pin.environment_id)
    @asynccontextmanager
    async def source_operation():
        events.append("source-enter")
        try:
            yield
            events.append("source-fence")
            if fail_exit:
                raise live.SourceObservationError()
        finally:
            events.append("source-closed")
    @asynccontextmanager
    async def transaction(**kwargs):
        yield object()
    async def current(*args):
        return session
    async def owned(*args):
        return creation
    async def capture(*args):
        events.append("native-capture")
        return f.pin
    async def verify(*args):
        events.append("native-verify")
    async def native(*args):
        events.append("native-authority")
        if reject:
            raise ControlError(401, "unauthenticated")
    monkeypatch.setattr(live, "git_source_operation", source_operation)
    monkeypatch.setattr(live, "scope", transaction)
    monkeypatch.setattr(live, "customer_session", current)
    monkeypatch.setattr(live, "owned", owned)
    monkeypatch.setattr(creation_routes, "owned", owned)
    monkeypatch.setattr(live.foundation, "capture", capture)
    monkeypatch.setattr(live.foundation, "verify", verify)
    authority = live.Authority("session", f.cid)
    monkeypatch.setattr(authority, "native", native)
    return authority, events


async def test_each_actual_authority_capture_and_verify_has_its_own_completed_source_fence(fixture, monkeypatch):
    f = fixture
    authority, events = source_authority(f, monkeypatch)
    assert await authority.capture() == f.pin
    await authority.verify(f.pin)
    assert events == ["source-enter", "native-capture", "native-authority", "native-capture", "native-authority",
        "source-fence", "source-closed", "source-enter", "native-authority", "native-verify",
        "native-authority", "native-verify", "source-fence", "source-closed"]


@pytest.mark.parametrize("operation", ["capture", "verify"])
async def test_source_exit_refusal_cannot_escape_as_a_successful_authority_result(fixture, monkeypatch, operation):
    f = fixture
    authority, events = source_authority(f, monkeypatch, fail_exit=True)
    with pytest.raises(ControlError) as error:
        if operation == "capture":
            await authority.capture()
        else:
            await authority.verify(f.pin)
    assert error.value.status == 503 and error.value.code == "source_unavailable"
    assert events[-1] == "source-closed"


@pytest.mark.parametrize("fail_exit", [False, True])
async def test_actual_authority_source_exit_must_finish_before_any_lease_heartbeat(fixture, monkeypatch, fail_exit):
    f = fixture
    lease = await ready(f)
    authority, events = source_authority(f, monkeypatch, fail_exit=fail_exit)
    lease.authority = authority
    monkeypatch.setattr(f.manager.store, "heartbeat", lambda *args, **kwargs: events.append("heartbeat"))
    assert await f.manager.permitted(lease) is not fail_exit
    assert ("heartbeat" in events) is not fail_exit
    if not fail_exit:
        assert events[-2:] == ["source-closed", "heartbeat"]


async def test_original_owner_refusal_is_preserved_by_the_source_operation(fixture, monkeypatch):
    f = fixture
    authority, events = source_authority(f, monkeypatch, reject=True)
    with pytest.raises(ControlError) as error:
        await authority.verify(f.pin)
    assert error.value.status == 401 and error.value.code == "unauthenticated"
    assert "source-fence" not in events and events[-1] == "source-closed"
