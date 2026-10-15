"""Actual owner HTTP/native scope/SQL integration, provider-zero blocked observations."""
import asyncio
import json
from uuid import uuid4

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_site_build import build as build_fixture
from test_site_build import creation, customers, first  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import token_hash
from pinet_core.models import utcnow
from pinet_core.site_build import foundation
from pinet_core.site_build.foundation_wire import Observation
from pinet_core.site_build.models import FoundationReceipt

build = build_fixture


def blocked(expected):
    return Observation.model_validate_json(json.dumps({"version": "native-foundation-evidence.v1", "state": "blocked",
        "scope_sha256": expected.fingerprint(), "sources": expected.sources.model_dump(mode="json"),
        "site_context_sha256": expected.site_context_sha256, "page_snapshot_sha256": expected.page_snapshot_sha256,
        "required_page_ids": expected.required_page_ids, "blockers": ["review_evidence_missing"],
        "release": None, "completion": None, "synthetic": True, "admission": "not_performed",
        "deployment": "not_performed", "channel_activation": "not_performed", "calibration_status": "UNVERIFIED"}))


def body():
    return {"accepted_revision": 1, "command": "candidate", "idempotency_key": str(uuid4())}


def prepare(monkeypatch, observer):
    monkeypatch.setattr(foundation, "source_current", lambda: True)
    monkeypatch.setattr(foundation, "observe", observer)


async def count(c, cid):
    async with AsyncSession(c["admin"]) as tx:
        return await tx.scalar(select(func.count()).select_from(FoundationReceipt).where(FoundationReceipt.creation_id == cid))


async def test_owned_http_receipt_is_durable_exact_replay_and_not_foundation_ready(build, monkeypatch):
    c = build
    cid, auth, _ = await first(c)
    calls = []
    async def observe(expected, *, command, still_authorized):
        assert command == "candidate" and await still_authorized()
        calls.append(expected.fingerprint())
        return blocked(expected)
    prepare(monkeypatch, observe)
    path, payload = f"/customer/v2/creations/{cid}/foundation/checks", body()
    response = await c["client"].post(path, headers=auth, json=payload)
    assert response.status_code == 200, response.text
    result = response.json()["data"]
    assert result["state"] == "blocked" and result["idempotency_key"] == payload["idempotency_key"]
    repeat = await c["client"].post(path, headers=auth, json=payload)
    assert repeat.status_code == 200 and repeat.json()["data"] == result
    assert len(calls) == 1 and await count(c, cid) == 1
    await c["client"].post(path, headers=auth, json={**payload, "command": "verify-local"})
    conflict = await c["client"].post(path, headers=auth, json={**payload, "command": "verify-local"})
    assert conflict.status_code == 409 and conflict.json()["code"] == "idempotency_conflict"
    view = await c["client"].get(f"/customer/v2/creations/{cid}/foundation", headers=auth)
    assert view.status_code == 200, view.text
    assert not view.json()["data"]["agent_foundation_ready"] and view.json()["data"]["foundation_status"] == "UNVERIFIED"
    assert "scope" not in result and "origin" not in result and "observation" not in result


async def test_same_uuid_concurrent_observations_keep_one_native_receipt(build, monkeypatch):
    c = build
    cid, auth, _ = await first(c)
    entered, both = [], asyncio.Event()
    async def observe(expected, *, command, still_authorized):
        assert await still_authorized()
        entered.append(expected)
        if len(entered) == 2:
            both.set()
        await asyncio.wait_for(both.wait(), 15)
        return blocked(expected)
    prepare(monkeypatch, observe)
    path, payload = f"/customer/v2/creations/{cid}/foundation/checks", body()
    responses = await asyncio.gather(*(c["client"].post(path, headers=auth, json=payload) for _ in range(2)))
    assert all(r.status_code == 200 for r in responses), [r.text for r in responses]
    assert len({r.json()["data"]["receipt_id"] for r in responses}) == 1
    assert await count(c, cid) == 1


async def test_archive_during_observation_commits_without_waiting_for_verifier_and_fences_receipt(build, monkeypatch):
    c = build
    cid, auth, _ = await first(c)
    async def observe(expected, *, command, still_authorized):
        assert await still_authorized()
        archived = await asyncio.wait_for(c["client"].post(f"/customer/v2/creations/{cid}/archive", headers=auth,
            json={"idempotency_key": str(uuid4())}), 5)
        assert archived.status_code == 200, archived.text
        return blocked(expected)
    prepare(monkeypatch, observe)
    response = await c["client"].post(f"/customer/v2/creations/{cid}/foundation/checks", headers=auth, json=body())
    assert response.status_code == 409, response.text
    assert await count(c, cid) == 0


async def test_revocation_after_observation_does_not_persist(build, monkeypatch):
    c = build
    cid, auth, _ = await first(c)
    async def observe(expected, *, command, still_authorized):
        assert await still_authorized()
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])).values(revoked_at=utcnow()))
        return blocked(expected)
    prepare(monkeypatch, observe)
    response = await c["client"].post(f"/customer/v2/creations/{cid}/foundation/checks", headers=auth, json=body())
    assert response.status_code == 401, response.text
    assert await count(c, cid) == 0


async def test_execution_source_drift_fences_new_receipt(build, monkeypatch):
    c = build
    cid, auth, _ = await first(c)
    async def observe(expected, *, command, still_authorized):
        assert await still_authorized()
        monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
        return blocked(expected)
    prepare(monkeypatch, observe)
    response = await c["client"].post(f"/customer/v2/creations/{cid}/foundation/checks", headers=auth, json=body())
    assert response.status_code in {409, 503}, response.text
    assert await count(c, cid) == 0
