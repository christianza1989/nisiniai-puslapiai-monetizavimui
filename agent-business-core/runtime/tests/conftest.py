import json
import time
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from pinet_core.api import app
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import (
    Admission,
    BusinessPolicy,
    Case,
    CostReservation,
    KnowledgeState,
    PolicyRevision,
    SourceCheckpoint,
    Visitor,
)
from pinet_core.security import edge_signature
from pinet_core.service import business


@pytest.fixture
async def client(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "environment", f"test-{uuid4()}")
    monkeypatch.setattr(cfg, "allow_simulation", True)
    monkeypatch.setattr(cfg, "google_api_key", "")
    monkeypatch.setattr(cfg, 'learning_enabled', False)
    monkeypatch.setattr(cfg, 'learning_namespace', '')
    # Each fixture owns and disposes its engine. Match runtime connection pooling;
    # reconnecting for every poll makes the two-second offline UI contract a TLS/
    # connection-churn benchmark instead of an adapter acknowledgement test.
    db.engine = create_async_engine(cfg.database_url, pool_pre_ping=True)
    db.sessions = async_sessionmaker(db.engine, expire_on_commit=False)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://core.test") as client:
            yield client
        for site in ["traktoriupadangos", "greitossvetaines"]:
            item = await business(site)
            async with db.transaction(item.id, cfg.environment) as tx:
                await tx.execute(delete(Case))
                await tx.execute(delete(Visitor))
                await tx.execute(delete(BusinessPolicy))
                await tx.execute(delete(PolicyRevision))
                await tx.execute(delete(KnowledgeState))
                await tx.execute(delete(SourceCheckpoint))
        async with db.registry() as tx:
            await tx.execute(delete(Admission).where(Admission.environment_id == cfg.environment))
            await tx.execute(delete(CostReservation).where(CostReservation.environment_id == cfg.environment))


def knowledge(site="traktoriupadangos"):
    host = f"{site}.lt"
    return {"site_id": site, "canonical_host": host, "contact_email": "info@pinet.lt",
        "operator": "MB Pinet", "deployment_id": "explicit-test-fixture", "generated_at": "2026-09-30T00:00:00Z",
        "pages": [{"id": "fixture", "title": "Testinis padangų žymėjimo tekstas", "url": f"https://{host}/gidas",
                   "text": "Tai sintetinė testo medžiaga apie padangos žymėjimą.",
                   "revision_hash": "a" * 64, "projection_hash": "b" * 64}]}


async def start(client, site="traktoriupadangos"):
    response = await client.post(f"/internal/sites/{site}/simulation", json={"knowledge": knowledge(site),
        "notice_version": "test-only", "consent": True, "mode": "simulation"},
        headers={"Authorization": f"Bearer {settings().worker_secret}"})
    assert response.status_code == 200, response.text
    return response.json()


async def edge(client, method, site, session, action="", body=None, headers=None):
    path = f"/v1/sites/{site}/sessions/{session['conversation_id']}{action}"
    content = json.dumps(body or {}).encode() if method == "POST" else b""
    stamp, nonce = str(int(time.time())), str(uuid4())
    signed = {"x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
              "x-pinet-signature": edge_signature(settings().edge_secret, stamp, nonce, method, path, content),
              "x-pinet-session": session["session_token"], "Content-Type": "application/json", **(headers or {})}
    return await client.request(method, path, content=content, headers=signed)


async def worker(client, session, action, body=None, site="traktoriupadangos", method="POST"):
    return await client.request(method, f"/internal/sites/{site}/sessions/{session['conversation_id']}{action}",
        json=body if method == "POST" else None, headers={"Authorization": f"Bearer {settings().worker_secret}"})


async def claim(client, session, owner="test-worker"):
    response = await worker(client, session, "/claim", {"owner": owner})
    assert response.status_code == 200
    return response.json()["epoch"]


async def utterance(client, session, epoch, key="client-1", text="Man reikia 420/85 R28 padangų.", kind="client_transcript"):
    return await worker(client, session, "/events", {"epoch": epoch, "event_key": key, "kind": kind, "text": text})
