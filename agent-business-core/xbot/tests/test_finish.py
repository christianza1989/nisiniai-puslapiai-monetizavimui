import base64
import io
import json
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor

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
    adapter, auth, _ = bound(env)
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
