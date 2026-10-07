import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest

from xbot.config import Config
from xbot.contracts import Profile, validate_text
from xbot.server import create_app
from xbot.service import Service
from xbot.store import Conflict, Store
from xbot.treg import Receipt, Treg


@pytest.fixture
def env(tmp_path):
    store = Store(tmp_path / "state.sqlite")
    config = Config(data=tmp_path, token="test-token", operator_key="test-operator-key-long-enough-12345", codex_enabled=True)
    profile = Profile(site_id="phonebridger", canonical="https://phonebridger.com", enabled=True, paused=False,
        live_read=True, live_write=True, start_hour=0, end_hour=24, actor_id="123", actor_handle="testactor",
        actor_verified_at=time.time(), credential_hash=store.credential_hash(config.token), brand_mandate="Test only",
        facts=["PhoneBridger connects Android to a desktop."], facts_source="Fixture only", facts_verified_at=time.time(),
        allowed_urls=["https://phonebridger.com"], daily_cap_micro=1_000_000, monthly_cap_micro=1_000_000,
        max_posts_per_day=4)
    store.update_profile(profile.model_dump(), 0, "Testing fixture only")
    store.budgets(1_000_000, 1_000_000)
    return store, config


class FakeTransport:
    def __init__(self, receipts=None, before_price=None):
        self.calls = []
        self.receipts = receipts or [Receipt(201, {"data": {"id": "456"}}, "fake-call", 15_000)]
        self.before_price = before_price

    async def price(self, operation, payload):
        if self.before_price:
            self.before_price()
        return Treg.estimate(operation, payload)

    async def call(self, operation, profile, payload, key):
        self.calls.append((operation, payload, key))
        return self.receipts.pop(0)


def queue(store, kind="post", key="fixture-post", payload=None, review=True):
    row = store.enqueue("phonebridger", kind, key, payload or {"text": "Useful Android desktop workflow."}, time.time() - 5)
    job = next(r for r in store.jobs("phonebridger") if r["id"] == row["id"])
    if review:
        store.review("phonebridger", job["id"], job["input_hash"], True, "Fixture reviewed exact version")
    return job


async def test_only_one_worker_publishes_exact_version(env):
    store, config = env
    queue(store)
    transport = FakeTransport()
    service = Service(store, config, transport)
    results = await asyncio.gather(service.run_once("phonebridger"), service.run_once("phonebridger"))
    assert sorted(r["state"] for r in results) == ["completed", "idle"]
    assert len(transport.calls) == 1
    assert store.spending("phonebridger")[0]["actual"] == 15_000
    assert store.records("phonebridger", "published")[0]["key"] == "456"
    assert (await service.run_once("phonebridger"))["state"] == "idle"


@pytest.mark.parametrize("change,reason", [
    ({"paused": True}, "module_disabled_or_paused"),
    ({"live_write": False}, "publication_mandate_missing"),
    ({"brand_mandate": ""}, "publication_mandate_missing"),
    ({"actor_verified_at": 0}, "fresh_actor_verification_required"),
    ({"credential_hash": "wrong"}, "credential_changed_requires_actor_verification"),
    ({"facts_verified_at": 0}, "facts_refresh_required"),
])
def test_write_gates(env, change, reason):
    store, config = env
    current = store.profile("phonebridger")
    store.update_profile({**current["profile"], **change}, current["revision"], "Fixture changed policy")
    job = queue(store)
    job = next(r for r in store.jobs("phonebridger") if r["id"] == job["id"])
    with pytest.raises(Conflict, match=reason):
        Service(store, config).gate(job, time.time())


async def test_pause_during_price_check_prevents_dispatch(env):
    store, config = env
    queue(store)
    def pause():
        current = store.profile("phonebridger")
        store.update_profile({**current["profile"], "paused": True}, current["revision"], "Paused during price check")
    transport = FakeTransport(before_price=pause)
    result = await Service(store, config, transport).run_once("phonebridger")
    assert result["state"] == "blocked"
    assert not transport.calls and not store.spending("phonebridger")


async def test_unknown_write_holds_budget_pauses_and_never_retries(env):
    store, config = env
    queue(store)
    transport = FakeTransport([Receipt(0, {"reason": "unknown"}, None, None, True)])
    service = Service(store, config, transport)
    assert (await service.run_once("phonebridger"))["state"] == "uncertain"
    assert store.profile("phonebridger")["profile"]["paused"]
    assert store.spending("phonebridger")[0]["state"] == "unknown"
    assert store.spending("phonebridger")[0]["reserved"] == 200_000
    assert (await service.run_once("phonebridger"))["state"] == "idle"
    assert len(transport.calls) == 1


def test_budget_reservations_are_atomic_and_global(env):
    store, _ = env
    def reserve(n):
        try:
            return store.reserve("phonebridger", "123", 300_000, str(n))
        except Conflict:
            return None
    with ThreadPoolExecutor(6) as pool:
        reservations = list(pool.map(reserve, range(6)))
    assert sum(bool(r) for r in reservations) == 3
    p = Profile(site_id="another-site", canonical="https://example.com", enabled=True, paused=False,
                daily_cap_micro=1_000_000, monthly_cap_micro=1_000_000)
    store.update_profile(p.model_dump(), 0, "Second tenant fixture")
    with pytest.raises(Conflict, match="budget_exhausted"):
        store.reserve("another-site", "123", 200_000, "tenant-job")
    assert not store.spending("another-site")


async def test_daily_write_quota_counts_attempts_not_just_success(env):
    store, config = env
    p = store.profile("phonebridger")
    store.update_profile({**p["profile"], "max_posts_per_day": 1}, p["revision"], "Fixture one-post daily cap")
    queue(store, key="first-post")
    queue(store, key="second-post")
    transport = FakeTransport()
    service = Service(store, config, transport)
    assert (await service.run_once("phonebridger"))["state"] == "completed"
    assert (await service.run_once("phonebridger"))["reason"] == "daily_action_quota_exhausted"
    assert len(transport.calls) == 1


def test_review_cannot_cross_tenant_or_survive_policy_revision(env):
    store, config = env
    job = queue(store)
    with pytest.raises(Conflict, match="stale_job_review"):
        store.review("another-site", job["id"], job["input_hash"], True, "Attempt cross tenant")
    p = store.profile("phonebridger")
    store.update_profile(p["profile"], p["revision"], "New exact policy revision")
    current_job = store.jobs("phonebridger")[0]
    with pytest.raises(Conflict, match="current_revision_review_required"):
        Service(store, config).gate(current_job, time.time())
    with pytest.raises(Conflict, match="job_key_conflict"):
        store.enqueue("phonebridger", "post", job["key"], {"text": "Changed text"}, job["run_at"])


async def test_mentions_pagination_preserves_optout_and_does_not_skip(env):
    store, config = env
    store.record("phonebridger", "inbound", "20", {"opted_out": True, "optin_evidence": "User initiated", "dm_requested": False})
    queue(store, "mentions", "mentions-one", {}, False)
    transport = FakeTransport([
        Receipt(200, {"data": [{"id": "20", "author_id": "7", "text": "Question"}], "meta": {"next_token": "page-2"}}, "c1", 5_000),
        Receipt(200, {"data": [{"id": "10", "author_id": "8", "text": "Earlier"}], "meta": {}}, "c2", 5_000),
    ])
    service = Service(store, config, transport)
    assert (await service.run_once("phonebridger"))["state"] == "completed"
    assert store.records("phonebridger", "cursor")[0]["payload"]["since_id"] is None
    assert store.records("phonebridger", "inbound")[0]["payload"]["opted_out"]
    queue(store, "mentions", "mentions-two", {}, False)
    assert (await service.run_once("phonebridger"))["state"] == "completed"
    assert transport.calls[1][1]["pagination_token"] == "page-2"
    assert store.records("phonebridger", "cursor")[0]["payload"]["since_id"] == "20"


async def test_reply_requires_platform_and_initiated_interaction(env):
    store, config = env
    queue(store, "reply", payload={"text": "Here is a useful answer.", "parent_id": "777", "interaction_id": "777", "recipient_id": "8"})
    transport = FakeTransport()
    result = await Service(store, config, transport).run_once("phonebridger")
    assert result["reason"] == "x_approval_or_channel_capability_missing"
    assert not transport.calls


def test_unicode_and_unapproved_domain_are_rejected():
    with pytest.raises(ValueError, match="weighted_post_length"):
        validate_text("界" * 141, [])
    with pytest.raises(ValueError, match="unapproved_url"):
        validate_text("Try https://other.example/path", ["https://phonebridger.com"])
    with pytest.raises(ValueError, match="bare_domain"):
        validate_text("Try other.example instead", [])


async def test_official_media_contract_has_nested_metadata():
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(200, json={"data": {"id": "123"}}, headers={"X-Treg-Cost-Micro": "15000"})
    async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
        treg = Treg("fixture-token", client)
        p = {"site_id": "phonebridger"}
        await treg.call("media_upload", p, {"media": "ZGF0YQ==", "media_category": "tweet_image"}, "u1")
        await treg.call("media_alt", p, {"media_id": "123", "alt": "Useful diagram"}, "u2")
    import json
    assert json.loads(requests[0].content) == {"media": "ZGF0YQ==", "media_category": "tweet_image"}
    assert json.loads(requests[1].content) == {"id": "123", "metadata": {"alt_text": {"text": "Useful diagram"}}}


async def test_admin_requires_auth_same_origin_and_hides_treg_token(env):
    store, config = env
    app = create_app(config, store, Service(store, config, FakeTransport()))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        assert (await client.get("/api/sites")).status_code == 401
        assert (await client.post("/session", json={"key": config.operator_key}, headers={"Origin": "https://evil.example"})).status_code == 403
        login = await client.post("/session", json={"key": config.operator_key})
        assert login.status_code == 200 and "HttpOnly" in login.headers["set-cookie"]
        dashboard = await client.get("/api/sites/phonebridger")
        assert dashboard.status_code == 200 and config.token not in dashboard.text
        assert (await client.get("/api/sites", headers={"Host": "evil.example"})).status_code == 403
        await client.delete("/session")
        assert (await client.get("/api/sites")).status_code == 401


class StubAgent:
    async def run(self, kind, profile, payload, signals):
        return {"draft": {"text": "Connect Android to your desktop.", "fact_indices": [0], "media_brief": ""},
                "review": {"approved": True, "unsupported_claims": [], "reasons": []}, "usage": []}


async def test_automatic_publication_is_bound_to_reviewed_facts(env):
    store, config = env
    p = store.profile("phonebridger")
    store.update_profile({**p["profile"], "auto_publish": True}, p["revision"], "Fixture automatic mode only")
    queue(store, "draft", payload={"title": "Desktop workflow"}, review=False)
    transport = FakeTransport()
    service = Service(store, config, transport, StubAgent)
    assert (await service.run_once("phonebridger"))["state"] == "completed"
    post = next(j for j in store.jobs("phonebridger") if j["kind"] == "post")
    assert post["review_hash"] == post["input_hash"]
    assert (await service.run_once("phonebridger"))["state"] == "completed"
    assert len(transport.calls) == 1


async def test_model_failure_pauses_instead_of_daily_retry(env):
    store, config = env

    class FailedAgent:
        async def run(self, *args):
            raise RuntimeError("codex_lab_failed_no_private_log")

    queue(store, "draft", payload={"title": "Typing tip"}, review=False)
    service = Service(store, config, FakeTransport(), FailedAgent)
    assert (await service.run_once("phonebridger"))["reason"] == "codex_lab_failed_no_private_log"
    assert store.profile("phonebridger")["profile"]["paused"]
    assert (await service.run_once("phonebridger"))["state"] == "idle"


def test_schedule_is_idempotent_and_handles_vilnius_dst(env):
    from datetime import UTC, datetime
    from zoneinfo import ZoneInfo

    store, config = env
    current = store.profile("phonebridger")
    store.update_profile({**current["profile"], "start_hour": 8, "end_hour": 21,
                          "queries": ["Android typing"]}, current["revision"], "DST schedule fixture")
    service = Service(store, config, FakeTransport())
    now = datetime(2026, 10, 25, 1, tzinfo=UTC).timestamp()
    first = service.schedule_day("phonebridger", now)
    second = service.schedule_day("phonebridger", now)
    assert first == second and len(store.jobs("phonebridger")) == 4
    plan = next(j for j in store.jobs("phonebridger") if j["kind"] == "plan")
    assert datetime.fromtimestamp(plan["run_at"], ZoneInfo("Europe/Vilnius")).hour == 8


async def test_media_cannot_upload_unreviewed_asset(env):
    store, config = env
    current = store.profile("phonebridger")
    store.update_profile({**current["profile"], "media_enabled": True}, current["revision"], "Media fixture enabled")
    (config.data / "assets").mkdir()
    (config.data / "assets/typing-tip.png").write_bytes(b"fixture-only")
    transport = FakeTransport()
    with pytest.raises(Conflict, match="exact_asset_rights_manifest_required"):
        await Service(store, config, transport).upload("phonebridger", "typing-tip.png", "A typing diagram")
    assert not transport.calls and not store.spending("phonebridger")


async def test_price_failure_does_not_spend_or_dispatch(env):
    store, config = env
    queue(store)

    class PriceFailure(FakeTransport):
        async def price(self, *args):
            raise ValueError("live_price_check_unavailable")

    transport = PriceFailure()
    assert (await Service(store, config, transport).run_once("phonebridger"))["state"] == "blocked"
    assert not transport.calls and not store.spending("phonebridger")


async def test_partial_success_is_uncertain_even_with_known_charge(env):
    store, config = env
    queue(store)
    transport = FakeTransport([Receipt(201, {"data": {"id": "456"}, "errors": [{"detail": "Ambiguous"}]}, "c1", 15_000)])
    assert (await Service(store, config, transport).run_once("phonebridger"))["state"] == "uncertain"
    assert store.profile("phonebridger")["profile"]["paused"]
    assert not store.records("phonebridger", "published")


async def test_reconciliation_collects_evidence_without_resending_or_guessing(env):
    store, config = env
    job = queue(store)

    class AuditTransport(FakeTransport):
        async def audit(self, call_id):
            assert call_id == "c1"
            return {"ledger": {"charged_micro": 15_000}, "result": {"stored": False}}

    transport = AuditTransport([Receipt(410, {"reason": "unknown"}, "c1", None, True)])
    service = Service(store, config, transport)
    await service.run_once("phonebridger")
    r = await service.reconcile("phonebridger", job["id"])
    assert r["state"] == "uncertain" and r["resend"] is False
    assert store.spending("phonebridger")[0]["state"] == "unknown"
    assert len(transport.calls) == 1
