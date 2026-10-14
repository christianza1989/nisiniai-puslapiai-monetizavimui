from datetime import timedelta

import httpx
from conftest import claim, edge, knowledge, start, worker
from sqlalchemy import select

from pinet_core import knowledge as store
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import KnowledgeState, utcnow
from pinet_core.service import business


async def lookup(client, session, epoch, call_id="read"):
    return await worker(client, session, "/tools", {"epoch": epoch, "call_id": call_id,
        "name": "knowledge.resolve", "arguments": {"query": "padangos"}})


async def test_refreshed_projection_overrides_old_tool_cache(client):
    session = await start(client)
    epoch = await claim(client, session)
    initial = (await lookup(client, session, epoch)).json()
    updated = knowledge()
    updated["pages"][0].update(text="Padangos: tik atnaujinta sintetinė informacija.",
                               revision_hash="c" * 64, projection_hash="d" * 64)
    updated["deployment_id"] = "synthetic-new-deployment"
    receipt = await edge(client, "POST", "traktoriupadangos", session, "/knowledge", updated)
    assert receipt.status_code == 200
    fresh = (await lookup(client, session, epoch)).json()
    assert fresh["knowledge_revision"] == initial["knowledge_revision"] + 1
    assert fresh["sources"][0]["revision_hash"] == "c" * 64
    assert "atnaujinta" in fresh["sources"][0]["text"]
    # Pure read retries are audited per source generation and stay deduplicated.
    assert (await lookup(client, session, epoch)).json() == fresh


async def test_expired_snapshot_refresh_restores_lookup(client):
    session = await start(client)
    epoch = await claim(client, session)
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        state = await tx.scalar(select(KnowledgeState))
        state.refreshed_at = utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)
    assert (await lookup(client, session, epoch)).json()["reason"] == "knowledge_snapshot_expired"
    assert (await edge(client, "POST", "traktoriupadangos", session, "/knowledge", knowledge())).status_code == 200
    assert (await lookup(client, session, epoch)).json()["sources"]


async def test_revocation_ends_exposed_session_and_survives_refresh(client):
    session = await start(client)
    epoch = await claim(client, session)
    assert (await lookup(client, session, epoch)).json()["sources"]
    headers = {"Authorization": f"Bearer {settings().operator_secret}"}
    path = "/operator/sites/traktoriupadangos/knowledge/revoke"
    body = {"base_revision": 1, "revision_hashes": ["a" * 64], "reason": "Synthetic factual source withdrawn"}
    result = await client.post(path, headers=headers, json=body)
    assert result.status_code == 200 and result.json()["finalized_sessions"] == 1
    assert (await edge(client, "GET", "traktoriupadangos", session)).json()["state"] == "finalized"
    assert (await client.post(path, headers=headers, json=body)).status_code == 409
    next_session = await start(client)
    next_epoch = await claim(client, next_session)
    assert (await lookup(client, next_session, next_epoch)).json()["sources"] == []
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await store.projection(tx))["pages"] == []


async def test_refresh_rejects_other_domain_and_invalid_schema(client):
    session = await start(client)
    bad = knowledge("greitossvetaines")
    assert (await edge(client, "POST", "traktoriupadangos", session, "/knowledge", bad)).status_code == 409
    body = knowledge()
    body["pages"].append(body["pages"][0])
    assert (await edge(client, "POST", "traktoriupadangos", session, "/knowledge", body)).status_code == 409
    epoch = await claim(client, session)
    call = {"epoch": epoch, "call_id": "bad-arguments", "name": "knowledge.resolve", "arguments": {"url": "http://metadata.invalid"}}
    assert (await worker(client, session, "/tools", call)).status_code == 422


async def test_background_refresh_signed_host_bound_and_bounded(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "knowledge_refresh_enabled", True)
    monkeypatch.setattr(cfg, "knowledge_source_base_url", "https://traktoriupadangos.lt")
    item = await business("traktoriupadangos")
    original = httpx.AsyncClient
    requests = []

    def handle(request):
        requests.append(request)
        assert request.url.path == "/pokalbis/manifestas"
        assert request.headers["host"] == item.canonical_host
        assert len(request.headers["x-pinet-signature"]) == 64
        return httpx.Response(200, json=knowledge())
    monkeypatch.setattr(store.httpx, "AsyncClient", lambda **kwargs: original(
        transport=httpx.MockTransport(handle), **kwargs))
    assert (await store.refresh_from_edge(item))["status"] == "refreshed"
    assert (await store.refresh_from_edge(item))["status"] == "fresh"
    assert len(requests) == 1
    monkeypatch.setattr(cfg, "knowledge_source_base_url", "http://169.254.169.254")
    async with db.transaction(item.id, cfg.environment) as tx:
        state = await store.current(tx)
        state.refreshed_at = utcnow() - timedelta(seconds=cfg.knowledge_refresh_seconds + 1)
    assert (await store.refresh_from_edge(item))["reason"] == "source_host_not_allowed"


async def test_background_refresh_rejects_redirect_and_oversize(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "knowledge_refresh_enabled", True)
    monkeypatch.setattr(cfg, "knowledge_source_base_url", "https://traktoriupadangos.lt")
    item = await business("traktoriupadangos")
    original = httpx.AsyncClient
    response = httpx.Response(302, headers={"Location": "http://metadata.invalid"})
    monkeypatch.setattr(store.httpx, "AsyncClient", lambda **kwargs: original(
        transport=httpx.MockTransport(lambda request: response), **kwargs))
    assert (await store.refresh_from_edge(item))["reason"] == "http_302"
    response = httpx.Response(200, content=b"x" * 220001)
    assert (await store.refresh_from_edge(item))["reason"] == "manifest_too_large"


async def test_preview_source_is_explicit_site_scoped_and_canonical_bound(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, 'knowledge_refresh_enabled', True)
    monkeypatch.setattr(cfg, 'knowledge_source_base_url', '')
    monkeypatch.setattr(cfg, 'knowledge_source_overrides', {'traktoriupadangos': 'https://own-preview.workers.dev'})
    item = await business('traktoriupadangos')
    original = httpx.AsyncClient
    requests = []
    manifest = knowledge()
    def handle(request):
        requests.append(request)
        assert request.headers['host'] == 'own-preview.workers.dev'
        assert len(request.headers['x-pinet-signature']) == 64
        return httpx.Response(200, json=manifest)
    monkeypatch.setattr(store.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs))
    assert (await store.refresh_from_edge(item))['status'] == 'refreshed'
    async with db.transaction(item.id, cfg.environment) as tx:
        state = await store.current(tx)
        state.refreshed_at = utcnow() - timedelta(seconds=cfg.knowledge_refresh_seconds + 1)
    manifest = knowledge('greitossvetaines')
    assert (await store.refresh_from_edge(item))['status'] == 'unavailable'
    monkeypatch.setattr(cfg, 'knowledge_source_overrides', {'other-site': 'https://own-preview.workers.dev'})
    assert (await store.refresh_from_edge(item))['status'] == 'unavailable'  # canonical host used; preview override ignored
    assert requests[-1].url.host == item.canonical_host
    monkeypatch.setattr(cfg, 'knowledge_source_overrides', {'traktoriupadangos': 'http://127.0.0.1:5197'})
    monkeypatch.setattr(cfg, 'environment', 'nonlocal-preview')
    assert (await store.refresh_from_edge(item))['reason'] == 'source_host_not_allowed'
