"""Injected authority boundaries only: no PG, model or X provider calls."""

import asyncio
import inspect
import time
from dataclasses import replace

import pytest
from test_finish import binding
from test_runtime import FakeTransport, queue

from xbot import module
from xbot.agent import Agent
from xbot.module import Authority, Binding, Command
from xbot.service import Service
from xbot.store import Conflict
from xbot.treg import Receipt

pytest_plugins = ["test_runtime"]


class CurrentCore:
    """Current grants/source are observed anew after the actual yield."""

    def __init__(self, store, profile):
        self.store = store
        self.binding = binding(profile)
        self.permissions = {"xbot.read", "xbot.control", "xbot.configure", "xbot.execute"}
        self.calls = []
        self.after_yield = None

    async def __call__(self, authority, permission):
        self.calls.append((authority, permission))
        await asyncio.sleep(0)
        if self.after_yield:
            self.after_yield()
        if permission not in self.permissions:
            raise Conflict("revoked_server_grant")
        # A separate local write transaction proves the module holds none here.
        with self.store.tx() as tx:
            self.store.record(authority.site_id, "test-core-observation", str(len(self.calls)), {}, tx)
        return self.binding.model_dump()


async def setup(env):
    store, config = env
    profile = store.profile("phonebridger")
    core = CurrentCore(store, profile["profile"])
    adapter = module.AsyncModuleAdapter(Service(store, config, FakeTransport()), core)
    auth = Authority(
        "org-one", "business-one", "test", "phonebridger", frozenset({"xbot.read", "xbot.control", "xbot.configure"})
    )

    # First-bind history guard remains active; do not create resolver test records until bound.
    async def initial(authority, permission):
        await asyncio.sleep(0)
        return core.binding.model_dump()

    adapter.resolver = initial
    await adapter.bind(auth, profile["profile"], profile["revision"])
    adapter.resolver = core
    return adapter, auth, core


async def enable(adapter, auth):
    await adapter.command(
        auth,
        Command(
            request_id="async-enable-0000001",
            expected_revision=adapter.store.profile(auth.site_id)["revision"],
            action="enable",
        ),
    )


def test_async_module_boundary_exists():
    adapter = getattr(module, "AsyncModuleAdapter", None)
    assert adapter is not None
    assert all(inspect.iscoroutinefunction(getattr(adapter, name)) for name in ("bind", "snapshot", "command"))


def test_service_awaited_context_boundary_exists():
    assert inspect.iscoroutinefunction(getattr(Service, "check_context_async", None))


async def test_async_public_surface_default_off_and_fresh_idempotence(env):
    adapter, auth, core = await setup(env)
    p = adapter.store.profile(auth.site_id)
    assert not p["profile"]["enabled"] and not p["profile"]["live_write"]
    assert (await adapter.snapshot(auth)).state == "disabled"
    command = Command(request_id="async-enable-0000001", expected_revision=p["revision"], action="enable")
    first, second = await asyncio.gather(adapter.command(auth, command), adapter.command(auth, command))
    assert first == second and first["revision"] == p["revision"] + 1
    assert [permission for _, permission in core.calls] == ["xbot.read", "xbot.control", "xbot.control"]
    core.permissions.remove("xbot.control")
    with pytest.raises(Conflict, match="unavailable"):
        await adapter.command(auth, command)  # Even stored receipt needs fresh authority.


@pytest.mark.parametrize("operation", ["bind", "snapshot", "command"])
async def test_async_tenant_denial_never_exposes_old_context(env, operation):
    adapter, auth, core = await setup(env)
    foreign = replace(auth, organization_id="foreign-org")
    if operation == "bind":
        core.binding = core.binding.model_copy(update={"organization_id": "org-one"})
        pending = adapter.bind(
            foreign, adapter.store.profile(auth.site_id)["profile"], adapter.store.profile(auth.site_id)["revision"]
        )
    elif operation == "snapshot":
        pending = adapter.snapshot(foreign)
    else:
        pending = adapter.command(
            foreign,
            Command(
                request_id="foreign-request-00001",
                expected_revision=adapter.store.profile(auth.site_id)["revision"],
                action="pause",
            ),
        )
    with pytest.raises(Conflict, match="scope_forbidden"):
        await pending
    assert len(core.calls) == (1 if operation == "bind" else 0)


async def test_async_resolver_unavailable_or_unawaited_is_closed(env):
    adapter, auth, core = await setup(env)
    adapter.resolver = lambda *args: core.binding.model_dump()
    with pytest.raises(Conflict, match="unavailable"):
        await adapter.snapshot(auth)

    async def unavailable(*args):
        raise RuntimeError("private-database-details-never-returned")

    adapter.resolver = unavailable
    with pytest.raises(Conflict, match="^core_authority_or_source_unavailable$"):
        await adapter.snapshot(auth)


async def test_authority_revocation_during_resolver_await_is_closed(env):
    adapter, auth, core = await setup(env)
    core.after_yield = lambda: core.permissions.discard("xbot.read")
    with pytest.raises(Conflict, match="unavailable"):
        await adapter.snapshot(auth)


@pytest.mark.parametrize(
    "change",
    [
        {"registration_id": "different-registration"},
        {"admission_id": "different-admission"},
        {"accepted_revision": 2},
        {"candidate_sha256": "0" * 64},
        {"accepted_source_revision": "0" * 40},
        {"execution_source_revision": "0" * 40},
        {"instruction_sha256": "0" * 64},
        {"index_receipt_sha256": "0" * 64},
        {"facts_sha256": "0" * 64},
        {"expires_at": 1},
        {"profile_current": False},
        {"module_admitted": False},
        {
            "knowledge_ref": {
                "schema_version": 2,
                "knowledge_revision": 2,
                "knowledge_hash": "0" * 64,
                "deployment_id": "changed",
            }
        },
    ],
)
async def test_async_execute_exact_lifecycle_rejection(env, change):
    adapter, auth, core = await setup(env)
    await enable(adapter, auth)
    core.binding = Binding.model_validate({**core.binding.model_dump(), **change})
    queued = queue(adapter.store, "draft", payload={"title": "Fixture only"}, review=False)
    with pytest.raises(Conflict, match="changed"):
        await adapter.service.gate_async(queued)
    # Read grant is still current, so UI can show a blocker without granting execution.
    assert "core_source_or_admission_changed" in (await adapter.snapshot(auth)).blockers


async def test_async_pause_after_ttl_and_sync_bypass_denied(env):
    adapter, auth, core = await setup(env)
    await enable(adapter, auth)
    job = queue(adapter.store, "draft", payload={"title": "Fixture only"}, review=False)
    with pytest.raises(Conflict, match="async_context_check_required"):
        adapter.service.gate(job, time.time())
    core.binding = core.binding.model_copy(update={"expires_at": 1})
    paused = await adapter.command(
        auth,
        Command(
            request_id="async-pause-00000001",
            expected_revision=adapter.store.profile(auth.site_id)["revision"],
            action="pause",
        ),
    )
    assert paused["state"] == "paused"


@pytest.mark.parametrize("revoke", [False, True])
async def test_each_model_result_reobserved_before_review_and_usage_retained(env, revoke):
    adapter, auth, core = await setup(env)
    await enable(adapter, auth)

    class Runner:
        calls = 0
        usage = []

        async def ask(self, schema, *args):
            self.calls += 1
            self.usage = [{"input_tokens": 37, "output_tokens": 8}]
            self.receipt_sink({"attempt": 1, "usage": self.usage[0], "outcome": "completed"})
            await asyncio.sleep(0)
            if revoke:
                core.permissions.discard("xbot.execute")
            else:
                core.binding = Binding.model_validate(
                    {
                        **core.binding.model_dump(),
                        "knowledge_ref": {
                            "schema_version": 2,
                            "knowledge_revision": 2,
                            "knowledge_hash": "0" * 64,
                            "deployment_id": "changed",
                        },
                    }
                )
            return schema.model_validate(
                {"text": "A harmless fixture question?", "media_brief": "", "fact_indices": []}
            )

    runner = Runner()
    adapter.service.agent_factory = lambda: Agent(runner=runner)
    queue(adapter.store, "draft", payload={"title": "Fixture only"}, review=False)
    assert (await adapter.service.run_once(auth.site_id))["state"] == "blocked"
    assert runner.calls == 1  # Revocation prevents the second model/review call.
    assert not adapter.store.records(auth.site_id, "draft")
    assert adapter.store.model_usage_totals(auth.site_id)["usage"] == {"input_tokens": 37, "output_tokens": 8}


async def live_fixture(adapter, auth):
    p = adapter.store.profile(auth.site_id)
    adapter.store.update_profile(
        {**p["profile"], "enabled": True, "paused": False, "live_read": True, "live_write": True},
        p["revision"],
        "Synthetic transport fixture only",
    )


async def test_revocation_during_awaited_price_prevents_dispatch(env):
    adapter, auth, core = await setup(env)
    await live_fixture(adapter, auth)

    async def price(*args):
        await asyncio.sleep(0)
        core.permissions.discard("xbot.execute")
        return 15000

    transport = FakeTransport()
    transport.price = price
    adapter.service.transport = transport
    queue(adapter.store)
    assert (await adapter.service.run_once(auth.site_id))["state"] == "blocked"
    assert not transport.calls and not adapter.store.spending(auth.site_id)


async def test_post_provider_revocation_retains_receipt_without_accepting_output(env):
    adapter, auth, core = await setup(env)
    await live_fixture(adapter, auth)

    class Transport(FakeTransport):
        async def call(self, *args):
            self.calls.append(args)
            # Also succeeds only if no module write transaction spans this await.
            with adapter.store.tx() as tx:
                adapter.store.record(auth.site_id, "provider-test", "one", {}, tx)
            await asyncio.sleep(0)
            core.permissions.discard("xbot.execute")
            return Receipt(201, {"data": {"id": "456"}}, "synthetic-receipt", 15000)

    transport = Transport()
    adapter.service.transport = transport
    queue(adapter.store)
    assert (await adapter.service.run_once(auth.site_id))["state"] == "uncertain"
    assert adapter.store.spending(auth.site_id)[0]["actual"] == 15000
    assert adapter.store.records(auth.site_id, "receipt")[0]["payload"]["call_id"] == "synthetic-receipt"
    assert not adapter.store.records(auth.site_id, "published")
    assert adapter.store.profile(auth.site_id)["profile"]["paused"]
    assert (await adapter.service.run_once(auth.site_id))["state"] == "idle"
    assert len(transport.calls) == 1


async def test_unbound_profile_cannot_use_managed_async_execution(env):
    store, config = env

    async def unused(profile):
        pytest.fail("An unbound profile must be rejected before authority lookup")

    service = Service(store, config, async_context_validator=unused)
    queue(store, "draft", payload={"title": "Fixture only"}, review=False)
    result = await service.run_once("phonebridger")
    assert result == {"state": "blocked", "reason": "core_binding_required"}
    assert not store.records("phonebridger", "model_call")


async def test_async_validator_in_sync_slot_cannot_be_silently_ignored(env):
    adapter, auth, _ = await setup(env)

    async def accidentally_async(profile):
        pytest.fail("A sync slot must never silently discard an async check")

    adapter.service.async_context_validator = None
    adapter.service.context_validator = accidentally_async
    with pytest.raises(Conflict, match="async_context_check_required"):
        await adapter.service.check_context_async(adapter.store.profile(auth.site_id)["profile"])


@pytest.mark.parametrize("ending", ["accepted", "second-revoked", "local-pause"])
async def test_actual_agent_two_call_path_uses_fresh_awaited_checks(env, ending):
    adapter, auth, core = await setup(env)
    await enable(adapter, auth)

    class Runner:
        calls = 0
        usage = []

        async def ask(self, schema, *args):
            self.calls += 1
            known = {"input_tokens": 41, "output_tokens": 9}
            self.usage = [*self.usage, known]
            self.receipt_sink({"attempt": self.calls, "usage": known, "outcome": "completed"})
            await asyncio.sleep(0)
            if ending == "second-revoked" and self.calls == 2:
                core.permissions.discard("xbot.execute")
            if ending == "local-pause":

                def pause():
                    core.after_yield = None
                    adapter.service.pause(auth.site_id, "Synthetic pause during authority wait")

                core.after_yield = pause
            if self.calls == 1:
                return schema.model_validate(
                    {"text": "A harmless fixture question?", "media_brief": "", "fact_indices": []}
                )
            return schema.model_validate({"approved": True, "unsupported_claims": [], "reasons": []})

    runner = Runner()
    adapter.service.agent_factory = lambda: Agent(runner=runner)
    queue(adapter.store, "draft", payload={"title": "Fixture only"}, review=False)
    result = await adapter.service.run_once(auth.site_id)
    assert result["state"] == ("completed" if ending == "accepted" else "blocked")
    assert runner.calls == (1 if ending == "local-pause" else 2)
    assert adapter.store.model_usage_totals(auth.site_id)["usage"]["input_tokens"] == runner.calls * 41
    assert bool(adapter.store.records(auth.site_id, "draft")) == (ending == "accepted")
    assert any(permission == "xbot.execute" for _, permission in core.calls)


async def test_policy_clock_is_reobserved_after_authority_await(env, monkeypatch):
    adapter, auth, core = await setup(env)
    start = time.time()
    core.binding = core.binding.model_copy(update={"expires_at": start + 3 * 86400})
    p = adapter.store.profile(auth.site_id)
    await adapter.bind(auth, p["profile"], p["revision"])
    await live_fixture(adapter, auth)
    job = queue(adapter.store)
    job = next(row for row in adapter.store.jobs(auth.site_id) if row["id"] == job["id"])
    clock = [start]
    monkeypatch.setattr(time, "time", lambda: clock[0])
    core.after_yield = lambda: clock.__setitem__(0, start + 86401)
    with pytest.raises(Conflict, match="fresh_actor_verification_required"):
        await adapter.service.gate_async(job)
