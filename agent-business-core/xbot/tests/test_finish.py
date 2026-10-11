import asyncio
import base64
import io
import json
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace

import httpx
import pytest
from PIL import Image
from test_runtime import FakeTransport, queue

from xbot.agent import Agent
from xbot.assets import import_asset
from xbot.cli import seed
from xbot.codex import CodexRunner
from xbot.config import Config
from xbot.contracts import Profile
from xbot.module import Authority, Binding, Command, Manifest, ModuleAdapter
from xbot.server import create_app
from xbot.service import Service
from xbot.store import Conflict, Store, fingerprint
from xbot.treg import Receipt, Treg

pytest_plugins = ["test_runtime"]


def binding(profile, **overrides):
    return Binding(
        organization_id="org-one",
        business_id="business-one",
        environment_id="test",
        site_id=profile["site_id"],
        registration_id="registration-one",
        admission_id="admission-one",
        accepted_revision=1,
        candidate_sha256="a" * 64,
        accepted_source_revision="b" * 40,
        execution_source_revision="c" * 40,
        instruction_sha256="d" * 64,
        knowledge_ref={
            "schema_version": 2,
            "knowledge_revision": 1,
            "knowledge_hash": "e" * 64,
            "deployment_id": "test-deploy",
        },
        index_receipt_sha256="f" * 64,
        facts_sha256=fingerprint(profile["facts"]),
        expires_at=time.time() + 600,
        profile_current=True,
        module_admitted=True,
    ).model_copy(update=overrides)


def bound(env):
    store, config = env
    original = store.profile("phonebridger")
    fresh = binding(original["profile"])
    service = Service(store, config, FakeTransport())
    adapter = ModuleAdapter(service, lambda authority: fresh.model_dump())
    auth = Authority(
        "org-one", "business-one", "test", "phonebridger", frozenset({"xbot.read", "xbot.control", "xbot.configure"})
    )
    adapter.bind(auth, original["profile"], original["revision"])
    return adapter, auth, fresh


def test_module_identity_current_admission_and_no_private_snapshot(env):
    adapter, auth, _ = bound(env)
    snapshot = adapter.snapshot(auth)
    assert snapshot.state == "disabled" and snapshot.evidence.knowledge_ref.schema_version == 2
    assert "text" not in snapshot.model_dump_json() and "test-token" not in snapshot.model_dump_json()
    with pytest.raises(Conflict, match="scope_forbidden"):
        adapter.snapshot(Authority("other-org", auth.business_id, auth.environment_id, auth.site_id, auth.capabilities))
    assert Manifest().grants_live_authority is False


def test_module_command_is_atomic_idempotent_local_only_and_pause_survives_expiry(env):
    adapter, auth, fresh = bound(env)
    rev = adapter.store.profile(auth.site_id)["revision"]
    command = Command(request_id="request-00000000001", expected_revision=rev, action="enable")
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(lambda _: adapter.command(auth, command), range(2)))
    assert results[0] == results[1] and results[0]["revision"] == rev + 1
    assert not adapter.store.profile(auth.site_id)["profile"]["live_write"]
    adapter.resolver = lambda authority: fresh.model_copy(update={"expires_at": 1}).model_dump()
    assert adapter.snapshot(auth).state == "blocked"
    paused = adapter.command(auth, Command(request_id="request-00000000002", expected_revision=rev + 1, action="pause"))
    assert paused["state"] == "paused"
    with pytest.raises(Conflict, match="request_id_conflict"):
        adapter.command(auth, command.model_copy(update={"action": "pause"}))


async def test_core_revocation_during_generation_discards_result(env):
    adapter, auth, fresh = bound(env)
    rev = adapter.store.profile(auth.site_id)["revision"]
    adapter.command(auth, Command(request_id="request-00000000001", expected_revision=rev, action="enable"))

    class AgentWithRevocation:
        async def run(self, *args):
            adapter.resolver = lambda authority: fresh.model_copy(update={"profile_current": False}).model_dump()
            return {
                "draft": {"text": "Useful Android workflow.", "media_brief": "", "fact_indices": [0]},
                "review": {"approved": True, "unsupported_claims": [], "reasons": []},
                "usage": [],
            }

    adapter.service.agent_factory = AgentWithRevocation
    queue(adapter.store, "draft", payload={"title": "A useful workflow"}, review=False)
    result = await adapter.service.run_once(auth.site_id)
    assert result["reason"] == "core_source_or_admission_changed"
    assert not adapter.store.records(auth.site_id, "draft")


def test_core_false_module_admission_cannot_enable(env):
    adapter, auth, fresh = bound(env)
    adapter.resolver = lambda authority: fresh.model_copy(update={"module_admitted": False}).model_dump()
    with pytest.raises(Conflict, match="admission_changed"):
        adapter.command(auth, Command(request_id="request-00000000001", expected_revision=2, action="enable"))


def test_global_model_cap_is_atomic_across_businesses(env):
    store, config = env

    def reserve(n):
        try:
            store.reserve_model("phonebridger" if n % 2 else "other-site", str(n), 2, 4)
            return True
        except Conflict:
            return False

    with ThreadPoolExecutor(4) as pool:
        assert sum(pool.map(reserve, range(4))) == 2


def test_two_sites_share_the_same_actor_action_quota(env):
    store, _ = env
    current = store.profile("phonebridger")
    original = Profile.model_validate(current["profile"]).model_copy(update={"max_posts_per_day": 1})
    store.update_profile(original.model_dump(), current["revision"], "Fixture account quota")
    other = original.model_copy(update={"site_id": "other-site", "canonical": "https://example.com"})
    store.update_profile(other.model_dump(), 0, "Fixture second niche, same actor")
    store.reserve("phonebridger", "123", 15000, "fixture-a", operation="post")
    with pytest.raises(Conflict, match="daily_action_quota_exhausted"):
        store.reserve("other-site", "123", 15000, "fixture-b", operation="post")


async def test_actual_asset_api_and_inbound_optout_never_create_case(env):
    store, config = env
    image = io.BytesIO()
    Image.new("RGB", (30, 20), (20, 40, 60)).save(image, format="PNG")
    store.record(
        "phonebridger",
        "inbound",
        "777",
        {"call_id": "fixture-call", "author_id": "888", "text": "A real fixture inbound"},
    )
    app = create_app(config, store, Service(store, config, FakeTransport()))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
        headers={"Authorization": f"Bearer {config.operator_key}"},
    ) as client:
        imported = await client.post(
            "/api/sites/phonebridger/assets",
            json={
                "content_base64": base64.b64encode(image.getvalue()).decode(),
                "source": "Synthetic original fixture",
                "alt": "An original rectangular fixture",
                "rights_verified": True,
            },
        )
        assert imported.status_code == 200
        preview = await client.get(f"/api/sites/phonebridger/assets/{imported.json()['asset_id']}")
        assert preview.status_code == 200 and preview.content == image.getvalue()
        for opted_out in [True, False]:
            result = await client.post(
                "/api/sites/phonebridger/intake",
                json={
                    "interaction_id": "777",
                    "optin_evidence": "Fixture initiated request",
                    "explicit_need": True,
                    "opted_out": opted_out,
                },
            )
            assert result.status_code == 200 and result.json()["case_created"] is False
        assert store.records("phonebridger", "inbound")[0]["payload"]["opted_out"] is True


def test_post_cannot_bypass_reply_gate_or_inject_proxy_path(env):
    store, _ = env
    with pytest.raises(ValueError, match="invalid_job_payload"):
        queue(store, payload={"text": "A cold reply.", "parent_id": "777"})
    with pytest.raises(ValueError, match="numeric_provider_id"):
        queue(store, "metrics", payload={"post_id": "../users/me"})


async def test_durable_receipt_failure_after_send_is_uncertain_and_paused(env, monkeypatch):
    store, config = env
    queue(store)
    original = store.record

    def fail_once(site, kind, key, payload, tx=None):
        if kind == "published":
            raise sqlite3.OperationalError("fixture failure after provider accepted")
        return original(site, kind, key, payload, tx)

    monkeypatch.setattr(store, "record", fail_once)
    transport = FakeTransport()
    result = await Service(store, config, transport).run_once("phonebridger")
    assert result["state"] == "uncertain" and store.profile("phonebridger")["profile"]["paused"]
    assert len(transport.calls) == 1 and store.spending("phonebridger")[0]["actual"] == 15000


def test_expired_lease_prevents_provider_reservation(env):
    store, _ = env
    queue(store)
    job = store.claim("phonebridger", "fixture-owner", time.time() - 600)
    # Queue was scheduled after the old clock. Claim with current time, then expire both leases.
    if not job:
        job = store.claim("phonebridger", "fixture-owner")
    with store.tx() as tx:
        tx.execute("UPDATE jobs SET lease_until=1 WHERE id=?", (job["id"],))
        tx.execute("UPDATE leases SET expires=1")
    with pytest.raises(Conflict, match="expired_job_lease"):
        store.reserve("phonebridger", "123", 200000, job["id"], job=job, operation="post")


def test_seed_never_imports_historical_actor_or_grants_budget(tmp_path):
    config = Config(data=tmp_path)
    (tmp_path / "actor-probe.json").write_text(json.dumps({"response": {"data": {"id": "123", "username": "old"}}}))
    store = Store(tmp_path / "db.sqlite")
    seed(store, config)
    assert store.sites() == []
    seed(store, config, "example-site", "https://example.com")
    p = store.profile("example-site")["profile"]
    assert not p["enabled"] and p["paused"] and p["actor_verified_at"] == 0 and store.budgets()["daily"] == 0


async def test_registered_tool_routes_and_current_headers_are_exact():
    requests = []

    def respond(request):
        requests.append(request)
        return httpx.Response(
            201, json={"data": {"id": "456"}}, headers={"X-Treg-Cost-Micro": "15000", "X-Treg-Call-Id": "fixture-call"}
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        r = await Treg("fixture-token", client).call(
            "post",
            {"site_id": "example-site", "treg_tool": "x-customer-two"},
            {"text": "Useful content."},
            "same-unique-key",
        )
    assert requests[0].url.path == "/call/x-customer-two/2/tweets"
    assert requests[0].headers["idempotency-key"] == "same-unique-key" and r.charged_micro == 15000


def test_codex_runner_is_independent_of_old_shared_constructor():
    agent = Agent(model="configured-model")
    assert isinstance(agent.runner, CodexRunner) and agent.runner.model == "configured-model"
    args = agent.runner.command("schema.json", "out.json")
    assert (
        args[args.index("--model") + 1] == "configured-model"
        and "--ignore-user-config" in args
        and "--ignore-rules" in args
    )


async def test_assets_are_scoped_and_bound_profile_policy_cannot_escape(env):
    store, config = env
    adapter, auth, _ = bound(env)
    blob = io.BytesIO()
    Image.new("RGB", (20, 20), (20, 40, 60)).save(blob, format="PNG")
    value = import_asset(
        store,
        config,
        "phonebridger",
        blob.getvalue(),
        "Original generated fixture",
        True,
        "An illustrative test square",
    )
    app = create_app(config, store, adapter.service)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
        headers={"Authorization": f"Bearer {config.operator_key}"},
    ) as client:
        assert (await client.get(f"/api/sites/phonebridger/assets/{value['asset_id']}")).status_code == 200
        assert (await client.get(f"/api/sites/other-site/assets/{value['asset_id']}")).status_code == 409
        p = store.profile("phonebridger")
        r = await client.put(
            "/api/sites/phonebridger/policy",
            json={
                "base_revision": p["revision"],
                "profile": {**p["profile"], "source_binding": {}},
                "reason": "Try removing binding",
            },
        )
        assert r.status_code == 409
        r = await client.post(
            "/api/sites/phonebridger/intake",
            json={"interaction_id": "42", "optin_evidence": "A search is not consent", "explicit_need": True},
        )
        assert r.status_code == 409


def test_asset_invalid_bytes_and_rights_are_rejected(env):
    store, config = env
    with pytest.raises(Conflict, match="rights_source"):
        import_asset(store, config, "phonebridger", b"fake", "Fixture", False, "Invalid picture")
    with pytest.raises(Conflict, match="invalid_image"):
        import_asset(store, config, "phonebridger", b"fake", "Fixture", True, "Invalid picture")


async def test_media_budget_rejection_does_not_poison_attempt_then_accepted_upload_reuses(env):
    store, config = env
    blob = io.BytesIO()
    Image.new("RGB", (20, 20), (20, 40, 60)).save(blob, format="PNG")
    value = import_asset(
        store,
        config,
        "phonebridger",
        blob.getvalue(),
        "Original synthetic fixture",
        True,
        "A useful illustrative test square",
    )
    current = store.profile("phonebridger")
    store.update_profile(
        {**current["profile"], "media_enabled": True, "daily_cap_micro": 10000},
        current["revision"],
        "Fixture small budget",
    )
    transport = FakeTransport(
        [
            Receipt(201, {"data": {"id": "456", "expires_after_secs": 3600}}, "fixture-upload", 15000),
            Receipt(200, {"data": {"id": "456"}}, "fixture-alt", 5000),
        ]
    )
    service = Service(store, config, transport)
    with pytest.raises(Conflict, match="budget_exhausted"):
        await service.upload("phonebridger", value["asset_id"], value["alt"])
    assert not transport.calls and not store.records("phonebridger", "media_attempt")
    current = store.profile("phonebridger")
    store.update_profile(
        {**current["profile"], "daily_cap_micro": 1000000}, current["revision"], "Fixture sufficient budget"
    )
    assert (await service.upload("phonebridger", value["asset_id"], value["alt"]))["media_id"] == "456"
    assert (await service.upload("phonebridger", value["asset_id"], value["alt"]))["reused"]
    assert len(transport.calls) == 2


@pytest.mark.parametrize(
    "field,value",
    [("organization_id", "other-org"), ("business_id", "other-business"), ("environment_id", "production")],
)
def test_bound_site_identity_cannot_be_reassigned(env, field, value):
    adapter, auth, fresh = bound(env)
    other_auth = replace(auth, **{field: value})
    adapter.resolver = lambda authority: fresh.model_copy(update={field: value}).model_dump()
    current = adapter.store.profile(auth.site_id)
    with pytest.raises(Conflict, match="module_bound_scope_immutable"):
        adapter.bind(other_auth, current["profile"], current["revision"])
    assert adapter.store.profile(auth.site_id) == current


def test_store_environment_pin_serializes_different_site_first_binds(env):
    store, config = env
    base_profile = store.profile("phonebridger")["profile"]
    adapter = ModuleAdapter(
        Service(store, config, FakeTransport()),
        lambda authority: binding(
            {**base_profile, "site_id": authority.site_id}, environment_id=authority.environment_id
        ).model_dump(),
    )
    authorities = [
        Authority("org-one", "business-one", environment, site, frozenset({"xbot.configure"}))
        for environment, site in [("test", "first-site"), ("production", "second-site")]
    ]

    def bind_once(authority):
        try:
            adapter.bind(authority, {**base_profile, "site_id": authority.site_id}, 0)
            return "accepted"
        except Conflict as error:
            return str(error)

    with ThreadPoolExecutor(2) as pool:
        assert sorted(pool.map(bind_once, authorities)) == ["accepted", "module_store_environment_conflict"]
    assert sum(site in store.sites() for site in ["first-site", "second-site"]) == 1


def test_first_binding_cannot_adopt_unscoped_prior_work(env):
    store, config = env
    original = store.profile("phonebridger")
    queue(store)
    fresh = binding(original["profile"])
    adapter = ModuleAdapter(Service(store, config, FakeTransport()), lambda authority: fresh.model_dump())
    auth = Authority("org-one", "business-one", "test", "phonebridger", frozenset({"xbot.configure"}))
    with pytest.raises(Conflict, match="module_unscoped_history_requires_migration"):
        adapter.bind(auth, original["profile"], original["revision"])
    assert store.profile(auth.site_id) == original
    assert store.jobs(auth.site_id)[0]["state"] == "queued"


def test_same_scope_rebind_cancels_prior_queue_preserving_history(env):
    adapter, auth, fresh = bound(env)
    queued = queue(adapter.store, "draft", payload={"title": "A previous scope draft"}, review=False)
    adapter.store.record(auth.site_id, "signal", "fixture-history", {"source": "owned scope fixture"})
    adapter.resolver = lambda authority: fresh.model_copy(
        update={"admission_id": "admission-two", "accepted_revision": 2}
    ).model_dump()
    before = adapter.store.profile(auth.site_id)
    new = adapter.bind(auth, before["profile"], before["revision"])
    assert new["revision"] == before["revision"] + 1 and not new["profile"]["enabled"]
    old_job = next(job for job in adapter.store.jobs(auth.site_id) if job["id"] == queued["id"])
    assert old_job["state"] == "cancelled" and old_job["result"]["reason"] == "core_profile_rebound"
    assert adapter.store.records(auth.site_id, "signal")[0]["key"] == "fixture-history"


async def test_known_usage_survives_post_generation_revocation(env):
    adapter, auth, fresh = bound(env)
    current = adapter.store.profile(auth.site_id)
    adapter.command(
        auth, Command(request_id="usage-revoke-0000001", expected_revision=current["revision"], action="enable")
    )

    class RevokingAgent:
        async def run(self, *args):
            adapter.resolver = lambda authority: fresh.model_copy(update={"profile_current": False}).model_dump()
            return {
                "draft": {"text": "Known fixture content", "fact_indices": [0]},
                "review": {"approved": True, "unsupported_claims": []},
                "usage": [{"input_tokens": 17, "output_tokens": 3}],
            }

    adapter.service.agent_factory = RevokingAgent
    queue(adapter.store, "draft", payload={"title": "Useful fixture"}, review=False)
    assert (await adapter.service.run_once(auth.site_id))["state"] == "blocked"
    assert not adapter.store.records(auth.site_id, "draft")
    assert adapter.store.records(auth.site_id, "model_usage")[0]["payload"]["usage"]["input_tokens"] == 17


@pytest.mark.parametrize("cancel", [False, True])
async def test_first_call_usage_survives_second_failure_or_cancel(env, cancel):
    store, config = env

    class PartialRunner:
        calls = 0
        usage = []

        async def ask(self, schema, *args):
            self.calls += 1
            if self.calls == 1:
                self.usage = [{"input_tokens": 19, "output_tokens": 4}]
                return schema.model_validate({"text": "A useful fixture", "media_brief": "", "fact_indices": [0]})
            if cancel:
                raise asyncio.CancelledError()
            raise RuntimeError("codex_lab_schema_rejected")

    queue(store, "draft", payload={"title": "Useful fixture"}, review=False)
    service = Service(store, config, FakeTransport(), lambda: Agent(runner=PartialRunner()))
    if cancel:
        with pytest.raises(asyncio.CancelledError):
            await service.run_once("phonebridger")
        assert store.jobs("phonebridger")[0]["state"] == "cancelled"
    else:
        assert (await service.run_once("phonebridger"))["state"] == "blocked"
    receipts = store.records("phonebridger", "model_usage")
    assert sum(r["payload"]["usage"].get("input_tokens", 0) for r in receipts) == 19
    assert not store.records("phonebridger", "draft")


async def test_cli_completed_usage_is_preserved_on_nonzero_exit(monkeypatch):
    runner = CodexRunner()
    observed = []
    runner.receipt_sink = observed.append
    event = json.dumps({"type": "turn.completed", "usage": {"input_tokens": 23, "output_tokens": 5}})
    monkeypatch.setattr(
        runner, "command", lambda *args: [sys.executable, "-c", f"print({event!r},flush=True);raise SystemExit(1)"]
    )
    from xbot.agent import Review

    with pytest.raises(RuntimeError, match="failed"):
        await runner.ask(Review, "Synthetic instructions", {})
    assert runner.usage[0]["input_tokens"] == 23
    assert observed[0]["usage"]["output_tokens"] == 5


def test_snapshot_known_usage_is_not_truncated_by_other_records(env):
    adapter, auth, _ = bound(env)
    with adapter.store.tx() as tx:
        adapter.store.record(
            auth.site_id,
            "model_usage",
            "old-call",
            {"usage": {"input_tokens": 29, "output_tokens": 6}, "tokens_known": True, "outcome": "completed"},
            tx,
        )
        for n in range(1005):
            adapter.store.record(auth.site_id, "audit", f"unrelated-{n}", {"event": "fixture"}, tx)
    assert adapter.snapshot(auth).usage.model_token_usage["input_tokens"] == 29


@pytest.mark.parametrize("cancel", [False, True])
async def test_real_cli_buffered_usage_survives_timeout_or_cancel(tmp_path, monkeypatch, cancel):
    runner = CodexRunner(timeout=1 if not cancel else 10)
    observed = []
    runner.receipt_sink = observed.append
    ready = tmp_path / "child-ready"
    event = json.dumps({"type": "turn.completed", "usage": {"input_tokens": 31, "output_tokens": 7}})
    script = f"import pathlib,time;print({event!r},flush=True);pathlib.Path({str(ready)!r}).touch();time.sleep(30)"
    monkeypatch.setattr(runner, "command", lambda *args: [sys.executable, "-c", script])
    from xbot.agent import Review

    task = asyncio.create_task(runner.ask(Review, "Synthetic instructions", {}))
    if cancel:
        for _ in range(500):
            if ready.exists() or task.done():
                break
            await asyncio.sleep(0.01)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert ready.exists()
    else:
        with pytest.raises(RuntimeError, match="timeout"):
            await task
    assert runner.usage == [{"input_tokens": 31, "output_tokens": 7}]
    assert observed[0]["outcome"] == ("cancelled" if cancel else "timeout")


def test_usage_preserves_legacy_without_double_counting_new_receipts(env):
    adapter, auth, _ = bound(env)
    store = adapter.store
    store.record(auth.site_id, "draft", "old-job", {"usage": [{"input_tokens": 11}]})
    store.record(auth.site_id, "draft", "new-job", {"usage": [{"input_tokens": 13}]})
    store.record_model_usage(
        auth.site_id, "new-job", {"attempt": 1, "usage": {"input_tokens": 13}, "outcome": "completed"}
    )
    store.record_model_usage(auth.site_id, "new-job", {"attempt": 2, "usage": {}, "outcome": "failed"})
    usage = adapter.snapshot(auth).usage
    assert usage.period == "store_lifetime" and usage.model_token_usage == {"input_tokens": 24}
    assert usage.model_known_usage_receipts == 2 and usage.model_unknown_usage_receipts == 1
    assert not usage.model_cost_verified


async def test_cancelled_outbound_holds_budget_and_never_resends(env):
    store, config = env
    queue(store)

    class CancelledTransport(FakeTransport):
        async def call(self, *args):
            self.calls.append(args)
            raise asyncio.CancelledError()

    transport = CancelledTransport()
    service = Service(store, config, transport)
    with pytest.raises(asyncio.CancelledError):
        await service.run_once("phonebridger")
    assert store.jobs("phonebridger")[0]["state"] == "uncertain"
    assert store.profile("phonebridger")["profile"]["paused"]
    assert store.spending("phonebridger")[0]["state"] == "unknown"
    assert (await service.run_once("phonebridger"))["state"] == "idle"
    assert len(transport.calls) == 1
