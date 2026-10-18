"""Opt-in dedicated PG: immutable registration survives native S37 renewal.

Uses maintained owner/role/Node/private-intake fixtures and retains append-only
synthetic history. No provider, channel or operational database is permitted.
"""
import asyncio
import copy
import os
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_private_native_continuity_pg import paired_native  # noqa: F401
from test_private_preview_pg import accepted, path, preview  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import scope, token_hash
from pinet_core.creation import private_preview
from pinet_core.creation.models import Creation, PrivateIntakeReceipt, PrivateIntakeRequest
from pinet_core.creation.routes import owned
from pinet_core.creation_registration import admin, service
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_text.service import customer_session
from pinet_core.models import utcnow

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Requires explicitly supplied EMPTY dedicated PostgreSQL QA and retained synthetic history")


async def registration_request(c, cid, auth):
    token = auth["Authorization"].split()[1]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        creation = await owned(tx, session, cid, lock=True)
        proof = await service.accepted_proof(tx, creation)
        return {"creation_id": cid, "accepted_revision": proof["accepted_revision"],
            "candidate_sha256": proof["candidate_sha256"], "accepted_source_revision": proof["accepted_source_revision"],
            "authorizing_session_id": session.id}


async def provision(c, request):
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await admin.provision(tx, environment=c["environment"], **request)


async def immutable_snapshot(c, cid):
    async with AsyncSession(c["admin"]) as tx:
        registered = await tx.scalar(select(Registration).where(Registration.creation_id == cid))
        requests = list(await tx.scalars(select(PrivateIntakeRequest).where(PrivateIntakeRequest.creation_id == cid)))
        receipts = list(await tx.scalars(select(PrivateIntakeReceipt).join(PrivateIntakeRequest,
            PrivateIntakeRequest.id == PrivateIntakeReceipt.recovery_id).where(PrivateIntakeRequest.creation_id == cid)))
        values = {row.id: {column.name: copy.deepcopy(getattr(row, column.name)) for column in row.__table__.columns}
            for row in (*requests, *receipts, *((registered,) if registered else ()))}
        return values


async def registered_private(c):
    cid, auth, body, _ = await accepted(c)
    initial = await c["client"].post(path(cid), headers=auth, json=body)
    assert initial.status_code == 200 and initial.json()["data"]["state"] == "private_draft_imported", initial.text
    request = await registration_request(c, cid, auth)
    registered = await provision(c, request)
    return cid, auth, body, request, registered


@pytest.mark.parametrize("register_after_first_renewal", [False, True])
async def test_registration_read_and_replay_survive_explicit_source_renewal(preview, monkeypatch,  # noqa: F811
        register_after_first_renewal):
    c = preview
    cid, auth, body, _ = await accepted(c)
    initial = await c["client"].post(path(cid), headers=auth, json=body)
    assert initial.status_code == 200 and initial.json()["data"]["state"] == "private_draft_imported", initial.text
    if register_after_first_renewal:
        monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
        renewed = await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})
        assert renewed.status_code == 200 and renewed.json()["data"]["state"] == "private_draft_imported", renewed.text
    request = await registration_request(c, cid, auth)
    registered = await provision(c, request)
    url = f"/customer/v2/creations/{cid}/registration"
    before = await c["client"].get(url, headers=auth)
    assert before.status_code == 200 and before.json()["data"]["state"] == "current", before.text
    original = await immutable_snapshot(c, cid)
    monkeypatch.setattr(settings(), "control_source_revision", ("c" if register_after_first_renewal else "b")*40)
    stale = await c["client"].get(path(cid), headers=auth)
    assert stale.status_code == 200 and stale.json()["data"]["state"] == "stale", stale.text
    renewed = await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})
    assert renewed.status_code == 200 and renewed.json()["data"]["state"] == "private_draft_imported", renewed.text
    current = await immutable_snapshot(c, cid)
    assert all(current[key] == value for key, value in original.items())
    after = await c["client"].get(url, headers=auth)
    assert after.status_code == 200, after.text
    value = after.json()["data"]
    assert value["state"] == "current" and value["binding_current"]
    assert value["registration"] == before.json()["data"]["registration"]
    assert not value["public_source_admitted"] and not value["profile_admitted"]
    assert value["full_f1_status"] == value["launch_status"] == "UNVERIFIED"
    assert value["channel_activation"] == "not_performed"
    replayed = await provision(c, request)
    assert replayed == {**registered, "replayed": True}
    assert await immutable_snapshot(c, cid) == current
    async with AsyncSession(c["admin"]) as tx:
        creation = await tx.get(Creation, cid)
        assert creation.current_revision == 1 and creation.canonical_host is None


async def test_registration_from_paired_continuity_keeps_identity_after_next_real_consumer_upgrade(
        paired_native, monkeypatch):  # noqa: F811
    p = paired_native
    first = await p.c["client"].post(path(p.cid), headers=p.auth, json={**p.body, "idempotency_key": str(uuid4())})
    assert first.status_code == 200 and first.json()["data"]["state"] == "private_draft_imported", first.text
    request = await registration_request(p.c, p.cid, p.auth)
    registered = await provision(p.c, request)
    original = await immutable_snapshot(p.c, p.cid)
    files = {str(f.relative_to(p.directory)): f.read_bytes() for f in p.directory.rglob("*") if f.is_file()}
    public = p.network.parent.parent
    (public / "consumer-version.txt").write_text("Second explicit synthetic consumer upgrade, unchanged network.")
    p.git("add", "consumer-version.txt")
    p.git("commit", "-m", "synthetic next consumer")
    monkeypatch.setattr(settings(), "control_source_revision", "c"*40)
    renewed = await p.c["client"].post(path(p.cid), headers=p.auth, json={**p.body, "idempotency_key": str(uuid4())})
    assert renewed.status_code == 200 and renewed.json()["data"]["state"] == "private_draft_imported", renewed.text
    response = await p.c["client"].get(f"/customer/v2/creations/{p.cid}/registration", headers=p.auth)
    assert response.status_code == 200 and response.json()["data"]["binding_current"], response.text
    assert response.json()["data"]["registration"]["registration_id"] == registered["registration_id"]
    assert (await provision(p.c, request))["replayed"]
    after = await immutable_snapshot(p.c, p.cid)
    assert all(after[key] == value for key, value in original.items())
    assert {str(f.relative_to(p.directory)): f.read_bytes() for f in p.directory.rglob("*") if f.is_file()} == files


async def test_stale_or_failed_current_intake_cannot_fall_back_to_registered_history(preview, monkeypatch):  # noqa: F811
    c = preview
    cid, auth, body, _, _ = await registered_private(c)
    original = await immutable_snapshot(c, cid)
    monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
    url = f"/customer/v2/creations/{cid}/registration"
    stale = await c["client"].get(url, headers=auth)
    assert stale.status_code == 409 and stale.json()["code"] == "private_intake_missing", stale.text
    from pinet_core.creation import studio
    _, _, artifacts, _ = studio.configuration()
    directory = artifacts / "customer-content" / cid / "revision-1"
    target = directory / "source-draft.json"
    target.write_bytes(target.read_bytes() + b"\n")
    failed = await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})
    assert failed.status_code == 200 and failed.json()["data"]["state"] == "failed", failed.text
    refused = await c["client"].get(url, headers=auth)
    assert refused.status_code == 409 and refused.json()["code"] == "private_intake_missing", refused.text
    after = await immutable_snapshot(c, cid)
    assert all(after[key] == value for key, value in original.items())


async def test_authorizing_session_expiry_during_historical_lookup_is_rechecked(preview, monkeypatch):  # noqa: F811
    c = preview
    cid, auth, body, request, _ = await registered_private(c)
    monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
    renewed = await c["client"].post(path(cid), headers=auth, json={**body, "idempotency_key": str(uuid4())})
    assert renewed.status_code == 200 and renewed.json()["data"]["state"] == "private_draft_imported", renewed.text
    expires = utcnow() + timedelta(seconds=10)
    async with AsyncSession(c["admin"]) as admin_tx, admin_tx.begin():
        await admin_tx.execute(update(Session).where(Session.id == request["authorizing_session_id"])
            .values(expires_at=expires))
    latest, observed = private_preview.latest, []
    async def expire_at_final_selection(tx, creation):
        row = await latest(tx, creation)
        observed.append(row.id)
        if len(observed) == 3:
            # Current actor locks correctly fence UPDATE. Let the real clock
            # expire the already-pinned Session instead of blocking on a write.
            await asyncio.sleep(max(0, (expires-utcnow()).total_seconds()) + 0.05)
        return row
    monkeypatch.setattr(private_preview, "latest", expire_at_final_selection)
    response = await c["client"].get(f"/customer/v2/creations/{cid}/registration", headers=auth)
    assert len(observed) == 3
    assert response.status_code in {401, 409}, response.text
