"""Synthetic restricted-PG profile lifecycle. No real customer, provider or network operations."""
import asyncio
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import (  # noqa: F401
    accepted,
    creation,
    customers,
    provision,
    registration,
    session_id,
)
from test_creation_team import runner
from test_customer_creations import start
from test_customer_public import logged, verified

from pinet_core import knowledge, onboarding, policy
from pinet_core import knowledge_index as index
from pinet_core.config import settings
from pinet_core.contracts import KnowledgeReferenceV2, KnowledgeRevocation
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.control.routes import ControlError, scope
from pinet_core.creation import studio, worker
from pinet_core.creation.models import Attempt, Job
from pinet_core.creation.service import digest
from pinet_core.creation_registration import admin as registry_admin
from pinet_core.creation_registration import service as registry_service
from pinet_core.creation_registration.models import Registration
from pinet_core.customer.models import Account
from pinet_core.customer_profile import admin, instructions, routes, service
from pinet_core.customer_profile.models import Admission
from pinet_core.db import db
from pinet_core.models import Business, BusinessPolicy, Conversation, KnowledgeState, utcnow


@pytest.fixture
async def profile(registration):  # noqa: F811 - explicit imported shared fixture dependency
    c = registration
    try:
        yield c
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(Admission).where(Admission.environment_id == c["environment"]))
            for model in (KnowledgeState, BusinessPolicy):
                await tx.execute(delete(model).where(model.environment_id == c["environment"]))


async def public_source(c, saved, *, ready=True, deployment=None):
    """Maintained index transport with explicit synthetic trusted source admission, never private intake."""
    async with AsyncSession(c["admin"]) as tx:
        business = await tx.get(Business, saved["business_id"])
    metadata = {"site_id": business.site_id, "canonical_host": business.canonical_host,
        "operator": "Synthetic independently observed operator", "contact_email": "synthetic-owner@example.com",
        "deployment_id": deployment or uuid4().hex, "generated_at": utcnow().isoformat()}
    page = {"id": "public-offer", "title": "Synthetic public offer", "url": f"https://{business.canonical_host}/offer/",
        "text": "This is synthetic public source evidence; capacity and commercial price remain unconfirmed.",
        "revision_hash": "d" * 64, "projection_hash": "e" * 64}
    content_hash = index.content_hash(metadata, [page])
    transfer = uuid4().hex
    async with db.transaction(business.id, c["environment"]) as tx:
        state = await tx.scalar(select(KnowledgeState))
        await policy.lock(tx, business.id, c["environment"], exclusive=True)
        await index.begin(tx, business, index.Begin(schema_version=2, transfer_id=transfer,
            base_revision=state.revision if state else 0, metadata=metadata, page_count=1,
            fragment_count=1, content_hash=content_hash))
        await index.batch(tx, business, index.Batch(transfer_id=transfer, fragments=[index.Fragment(
            ordinal=0, page_ordinal=0, part=0, parts=1, **page)]))
        await index.commit(tx, business, index.Commit(transfer_id=transfer, content_hash=content_hash))
        await onboarding.update(tx, business, onboarding.Readiness(source_ready=ready, learning_admitted=False))
        state = await tx.scalar(select(KnowledgeState))
        return KnowledgeReferenceV2(schema_version=2, knowledge_revision=state.revision,
            knowledge_hash=state.payload["hash"], deployment_id=metadata["deployment_id"]).model_dump(mode="json")


async def prepared(c, *, ready=True):
    creation_request, value, auth, me = await accepted(c)
    saved = await provision(c, creation_request)
    reference = await public_source(c, saved, ready=ready)
    request = {"registration_id": saved["registration_id"],
        **{key: creation_request[key] for key in ("accepted_revision", "candidate_sha256", "accepted_source_revision",
            "authorizing_session_id")}, "execution_source_revision": settings().control_source_revision,
        "knowledge_ref": reference}
    return creation_request, saved, request, value, auth, me


async def admit(c, request):
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await admin.admit(tx, environment=c["environment"], **request)


async def revoke(c, saved):
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        return await admin.revoke(tx, environment=c["environment"], admission_id=saved["admission_id"],
            fingerprint=saved["fingerprint"])


async def read(c, creation_request, auth, **params):
    return await c["client"].get(f"/customer/v2/creations/{creation_request['creation_id']}/agent-profile",
        headers=auth, params=params)


async def counts(c):
    async with AsyncSession(c["admin"]) as tx:
        return tuple([await tx.scalar(select(func.count()).select_from(model).where(model.environment_id == c["environment"]))
            for model in (Admission, Registration, BusinessGrant, Job, Attempt, KnowledgeState, BusinessPolicy, Conversation)])


async def test_missing_truthful_200_query_bounds_and_no_persistence_writes(profile):
    c = profile
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    request = {"creation_id": row["creation_id"]}
    before = await counts(c)
    response = await read(c, request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert response.json()["contract_version"] == "agent-profile.v1"
    assert data["state"] == "missing" and data["admission"] is None and not data["profile_current"]
    assert {"accepted_revision_missing", "registration_missing", "profile_missing"} <= set(data["blockers"])
    assert response.headers["cache-control"] == "private, no-store"
    for params in ({"unknown": "1"}, {"accepted_revision": "bad"}, {"accepted_revision": 0}, {"accepted_revision": 21}):
        assert (await read(c, request, auth, **params)).status_code == 400
    assert (await read(c, request, auth, accepted_revision=1)).status_code == 409
    path = f"/customer/v2/creations/{row['creation_id']}/agent-profile?accepted_revision=1&accepted_revision=1"
    assert (await c["client"].get(path, headers=auth)).status_code == 400
    assert (await c["client"].post(path, headers=auth)).status_code == 405
    assert await counts(c) == before


async def test_exact_admission_replay_new_session_preserves_history_no_activation_or_ttl_renewal(profile, monkeypatch):
    c = profile
    creation_request, _, request, value, auth, _ = await prepared(c)
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    request["execution_source_revision"] = "b" * 40
    before = await counts(c)
    first = await admit(c, request)
    newer = await logged(c, value)
    new_session = await session_id(c, newer)
    second = await admit(c, {**request, "authorizing_session_id": new_session})
    assert first["admission_id"] == second["admission_id"] and second["replayed"]
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, first["admission_id"])
        source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == row.business_id))
        assert row.authorizing_session_id == request["authorizing_session_id"] != new_session
        source_time, payload = source.refreshed_at, source.payload
        session_time = (await tx.get(Session, new_session)).expires_at
    response = await read(c, creation_request, newer, accepted_revision=1)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["state"] == "current" and data["profile_current"] and data["source_state"] == "current"
    assert data["admission"]["accepted_source_revision"] == "a" * 40
    assert data["admission"]["execution_source_revision"] == response.json()["source_revision"] == "b" * 40
    assert data["need_fields"] == ["goal", "requirements", "deadline", "budget", "location"]
    for key in ("can_start_text_session", "can_call_provider", "voice_enabled", "email_enabled", "acquisition_enabled", "learning_enabled"):
        assert data[key] is False
    assert data["calibration_status"] == "UNVERIFIED" and data["channel_activation"] == "not_performed"
    for forbidden in ("authorizing_session", "synthetic-owner", "example.test/offer", "text\"", "operator\"", "MB Pinet", "info@pinet.lt", "intake_sha", "manifestPath"):
        assert forbidden not in response.text
    async with AsyncSession(c["admin"]) as tx:
        source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == row.business_id))
        assert source.refreshed_at == source_time and source.payload == payload
        assert (await tx.get(Session, new_session)).expires_at == session_time
    assert await counts(c) == (before[0] + 1, *before[1:])


async def test_wrong_identity_source_or_reference_never_partially_admits(profile):
    c = profile
    _, _, request, _, _, _ = await prepared(c)
    before = await counts(c)
    variants = [{"accepted_revision": 2}, {"candidate_sha256": "f" * 64}, {"accepted_source_revision": "f" * 40},
        {"execution_source_revision": "f" * 40}, {"authorizing_session_id": str(uuid4())},
        {"registration_id": str(uuid4())},
        {"knowledge_ref": {**request["knowledge_ref"], "knowledge_revision": 2}},
        {"knowledge_ref": {**request["knowledge_ref"], "deployment_id": "wrong"}},
        {"knowledge_ref": {**request["knowledge_ref"], "knowledge_hash": "f" * 64}}]
    for changes in variants:
        with pytest.raises((ValueError, ControlError, HTTPException)):
            await admit(c, {**request, **changes})
        assert await counts(c) == before


async def test_private_intake_registration_and_unadmitted_index_cannot_admit_profile(profile):
    c = profile
    creation_request, _, _, _ = await accepted(c)
    saved = await provision(c, creation_request)
    reference = {"schema_version": 2, "knowledge_revision": 1, "knowledge_hash": "d" * 64, "deployment_id": "missing"}
    request = {"registration_id": saved["registration_id"],
        **{key: creation_request[key] for key in ("accepted_revision", "candidate_sha256", "accepted_source_revision", "authorizing_session_id")},
        "execution_source_revision": settings().control_source_revision, "knowledge_ref": reference}
    before = await counts(c)
    with pytest.raises(HTTPException, match="public_source_not_admitted"):
        await admit(c, request)
    assert await counts(c) == before
    request["knowledge_ref"] = await public_source(c, saved, ready=False)
    before = await counts(c)
    with pytest.raises(HTTPException, match="public_source_not_admitted"):
        await admit(c, request)
    assert await counts(c) == before


async def test_current_authority_required_for_admission_and_read(profile):
    c = profile
    creation_request, _, request, _, auth, me = await prepared(c)
    await admit(c, request)
    cases = [(User, User.id == me["user_id"], "enabled", False),
        (Account, Account.user_id == me["user_id"], "verified_at", None),
        (Membership, Membership.user_id == me["user_id"], "enabled", False),
        (Session, Session.id == request["authorizing_session_id"], "expires_at", utcnow() - timedelta(seconds=1)),
        (Session, Session.id == request["authorizing_session_id"], "revoked_at", utcnow())]
    for model, where, field, value in cases:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            previous = await tx.scalar(select(getattr(model, field)).where(where))
            await tx.execute(update(model).where(where).values(**{field: value}))
        before = await counts(c)
        with pytest.raises((ValueError, ControlError)):
            await admit(c, request)
        response = await read(c, creation_request, auth)
        assert response.status_code in (401, 404), response.text
        assert "admission_id" not in response.text
        assert await counts(c) == before
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(model).where(where).values(**{field: previous}))


async def test_foreign_owner_and_environment_cannot_read_or_admit_exact_registration(profile):
    c = profile
    creation_request, _, request, _, _, me = await prepared(c)
    saved = await admit(c, request)
    _, foreign, foreign_me = await verified(c)
    assert (await read(c, creation_request, foreign)).status_code == 404
    with pytest.raises(ValueError, match="current_creation_owner_required"):
        await admit(c, {**request, "authorizing_session_id": await session_id(c, foreign)})
    async with scope(user=foreign_me["user_id"]) as tx:
        assert await tx.get(Admission, saved["admission_id"]) is None
    async with scope(user=me["user_id"]) as tx:
        await tx.execute(text("SELECT set_config('pinet.environment',:e,true)"), {"e": "test-foreign"})
        assert await tx.get(Admission, saved["admission_id"]) is None
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        with pytest.raises(ValueError, match="privileged_local_profile_admission_only"):
            await admin.admit(tx, environment="test-foreign", **request)


async def test_runtime_select_only_no_privileged_admit_or_update_delete(profile):
    c = profile
    _, _, request, _, _, me = await prepared(c)
    saved = await admit(c, request)
    async with scope(user=me["user_id"]) as tx:
        assert await tx.get(Admission, saved["admission_id"])
        with pytest.raises(ValueError, match="privileged_local_profile_admission_only"):
            await admin.admit(tx, environment=c["environment"], **request)
    for operation in ("INSERT", "UPDATE", "DELETE"):
        async with scope(user=me["user_id"]) as tx:
            assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'control_customer_profile_admissions',:op)"), {"op": operation})
    for statement in (update(Admission).where(Admission.id == saved["admission_id"]).values(revoked_at=utcnow()),
            delete(Admission).where(Admission.id == saved["admission_id"])):
        with pytest.raises(DBAPIError):
            async with scope(user=me["user_id"]) as tx:
                await tx.execute(statement)
    async with AsyncSession(c["admin"]) as tx:
        rls = (await tx.execute(text("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='control_customer_profile_admissions'::regclass"))).one()
        assert all(rls)


async def test_terminal_admin_revoke_history_is_immutable_and_replay_cannot_revive(profile):
    c = profile
    creation_request, _, request, _, auth, _ = await prepared(c)
    saved = await admit(c, request)
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        original = service.material(row), row.authorizing_session_id, row.created_at
    for changes in ({"quality_sha256": "f" * 64}, {"sequence": 2}):
        with pytest.raises(DBAPIError):
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                await tx.execute(update(Admission).where(Admission.id == saved["admission_id"]).values(**changes))
    first, second = await revoke(c, saved), await revoke(c, saved)
    assert first["revoked_at"] == second["revoked_at"]
    with pytest.raises(ValueError, match="profile_revoked"):
        await admit(c, request)
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Admission).where(Admission.id == saved["admission_id"]).values(revoked_at=None))
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    assert response.json()["data"]["state"] == "revoked" and not response.json()["data"]["profile_current"]
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        assert (service.material(row), row.authorizing_session_id, row.created_at) == original


async def test_current_code_instruction_ttl_receipt_and_source_drift_preserves_original_history(profile, monkeypatch):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    saved = await admit(c, request)
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        historical = service.material(row)
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == row.business_id))
        source_time, payload = state.refreshed_at, state.payload
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    data = (await read(c, creation_request, auth)).json()["data"]
    assert data["state"] == "stale" and "execution_source_changed" in data["blockers"]
    monkeypatch.setattr(settings(), "control_source_revision", "a" * 40)
    real_manifest = instructions.manifest
    monkeypatch.setattr(instructions, "manifest", lambda: {**real_manifest(), "quality_sha256": "f" * 64})
    assert "instructions_changed" in (await read(c, creation_request, auth)).json()["data"]["blockers"]
    monkeypatch.setattr(instructions, "manifest", real_manifest)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(KnowledgeState).where(KnowledgeState.id == state.id).values(
            refreshed_at=utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)))
    assert "public_source_expired" in (await read(c, creation_request, auth)).json()["data"]["blockers"]
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(KnowledgeState).where(KnowledgeState.id == state.id).values(refreshed_at=source_time))
        row = await tx.get(KnowledgeState, state.id)
        row.payload = {**payload, "onboarding": {"source_ready": False, "learning_admitted": False}}
    assert "public_source_not_admitted" in (await read(c, creation_request, auth)).json()["data"]["blockers"]
    await public_source(c, registry, deployment=request["knowledge_ref"]["deployment_id"])
    # Same content/deployment still changes the exact completed receipt; no silent admission renewal.
    data = (await read(c, creation_request, auth)).json()["data"]
    assert "public_source_changed" in data["blockers"] and not data["profile_current"]
    async with AsyncSession(c["admin"]) as tx:
        assert service.material(await tx.get(Admission, saved["admission_id"])) == historical


async def test_native_v2_revocation_current_revision_and_pending_are_not_profile_ready(profile):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    await admit(c, request)
    async with AsyncSession(c["admin"]) as tx:
        business = await tx.get(Business, registry["business_id"])
    async with db.transaction(business.id, c["environment"]) as tx:
        await policy.lock(tx, business.id, c["environment"])
        await index.locked(tx, business)
        await knowledge.revoke(tx, KnowledgeRevocation(base_revision=1, revision_hashes=["d" * 64], reason="Synthetic source revocation"))
    assert "public_source_changed" in (await read(c, creation_request, auth)).json()["data"]["blockers"]
    response = await c["client"].post(f"/customer/v2/creations/{creation_request['creation_id']}/revisions",
        headers=auth, json={"base_revision": 1, "message": "Patikrink pasiūlymo aiškumą ir išsaugok tikrus ribojimus.", "idempotency_key": str(uuid4())})
    assert response.status_code == 202, response.text
    assert "creation_revision_pending" in (await read(c, creation_request, auth)).json()["data"]["blockers"]
    with pytest.raises(ValueError, match="creation_revision_pending"):
        await admit(c, request)
    assert await worker.execute_once(role_runner=runner([]), intake_runner=studio.import_draft)
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    assert response.json()["data"]["state"] == "stale" and "registration_stale" in response.json()["data"]["blockers"]
    assert (await read(c, creation_request, auth, accepted_revision=1)).status_code == 409


async def test_composite_fk_rejects_cross_owner_or_different_candidate_admission(profile):
    c = profile
    _, _, request, _, _, _ = await prepared(c)
    saved = await admit(c, request)
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        metadata = service.material(row)
        authorizing = row.authorizing_session_id
    for changes in ({"candidate_sha256": "f" * 64}, {"user_id": str(uuid4())}, {"accepted_source_revision": "f" * 40}):
        with pytest.raises(DBAPIError):
            async with AsyncSession(c["admin"]) as tx, tx.begin():
                changed = {**metadata, **changes}
                tx.add(Admission(id=str(uuid4()), **changed, authorizing_session_id=authorizing,
                    sequence=2, fingerprint=digest(changed)))
                await tx.flush()


async def test_concurrent_exact_admission_has_one_immutable_history_record(profile):
    c = profile
    _, _, request, _, _, _ = await prepared(c)
    before = await counts(c)
    first, second = await asyncio.gather(admit(c, request), admit(c, request))
    assert first["admission_id"] == second["admission_id"]
    assert sorted([first["replayed"], second["replayed"]]) == [False, True]
    assert await counts(c) == (before[0] + 1, *before[1:])


async def test_malformed_readiness_receipt_or_source_cannot_admit_and_reads_blocked(profile):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    async with AsyncSession(c["admin"]) as tx:
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == registry["business_id"]))
        original = state.payload
    changes = [({"onboarding": {"source_ready": "true", "learning_admitted": False}}, "public_source_unavailable"),
        ({"index_receipt": {**original["index_receipt"], "unexpected": "untrusted"}}, "public_source_unavailable"),
        ({"index_receipt": {**original["index_receipt"], "page_count": True}}, "public_source_changed"),
        ({"knowledge": {**original["knowledge"], "operator": ""}}, "public_source_unavailable")]
    for change, blocker in changes:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(KnowledgeState).where(KnowledgeState.id == state.id).values(payload={**original, **change}))
        before = await counts(c)
        with pytest.raises((ValueError, HTTPException)):
            await admit(c, request)
        response = await read(c, creation_request, auth)
        assert response.status_code == 200, response.text
        data = response.json()["data"]
        assert not data["profile_current"] and data["source_state"] == "unavailable"
        assert blocker in data["blockers"]
        assert await counts(c) == before
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(KnowledgeState).where(KnowledgeState.id == state.id).values(payload=original))
    assert await admit(c, request)


async def blocked(c, owner, waiter):
    async with AsyncSession(c["admin"]) as observation:
        deadline = asyncio.get_running_loop().time() + 5
        while asyncio.get_running_loop().time() < deadline:
            actual = await observation.scalar(text("SELECT CAST(:owner AS integer)=ANY(pg_blocking_pids(CAST(:waiter AS integer)))"),
                {"owner": owner, "waiter": waiter})
            if actual:
                return
            await asyncio.sleep(0.02)
    raise AssertionError("The actual database revoke/admission barrier was not observed")


@pytest.mark.parametrize("target", ["registration", "grant", "source"])
async def test_current_admission_linearizes_before_concurrent_revocation_with_actual_pg_blocking(profile, monkeypatch, target):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    ready, revoking, finished = asyncio.Event(), asyncio.Event(), asyncio.Event()
    backend = {}
    real = admin.current_actor

    async def before_commit(tx, *args, **kwargs):
        value = await real(tx, *args, **kwargs)
        backend["admit"] = await tx.scalar(text("SELECT pg_backend_pid()"))
        ready.set()
        await asyncio.wait_for(revoking.wait(), 5)
        await blocked(c, backend["admit"], backend["revoke"])
        assert not finished.is_set()
        return value

    async def concurrent_revoke():
        await asyncio.wait_for(ready.wait(), 5)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            backend["revoke"] = await tx.scalar(text("SELECT pg_backend_pid()"))
            revoking.set()
            if target == "registration":
                await registry_admin.revoke(tx, environment=c["environment"], registration_id=registry["registration_id"],
                    candidate_sha256=request["candidate_sha256"])
            elif target == "grant":
                row = await tx.get(Registration, registry["registration_id"])
                await tx.execute(update(BusinessGrant).where(BusinessGrant.id == row.grant_id).values(enabled=False))
            else:
                await policy.lock(tx, registry["business_id"], c["environment"], exclusive=True)
                row = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == registry["business_id"],
                    KnowledgeState.environment_id == c["environment"]))
                row.payload = {**row.payload, "onboarding": {"source_ready": False, "learning_admitted": False}}
        finished.set()

    monkeypatch.setattr(admin, "current_actor", before_commit)
    saved, _ = await asyncio.wait_for(asyncio.gather(admit(c, request), concurrent_revoke()), 20)
    assert finished.is_set()
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        original = service.material(row), row.authorizing_session_id, row.created_at
        assert row.revoked_at is None and row.fingerprint == saved["fingerprint"]
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert not data["profile_current"]
    assert {"registration": "registration_revoked", "grant": "grant_revoked", "source": "public_source_not_admitted"}[target] in data["blockers"]
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        assert (service.material(row), row.authorizing_session_id, row.created_at) == original


async def test_registration_revoke_first_excludes_waiting_admission_without_new_history(profile, monkeypatch):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    locked, started = asyncio.Event(), asyncio.Event()
    backend = {}
    real = registry_admin.lifetime
    async with AsyncSession(c["admin"]) as tx:
        original = registry_service.stored_material(await tx.get(Registration, registry["registration_id"]))
    before = await counts(c)

    async def before_revoke(tx, *args, **kwargs):
        await real(tx, *args, **kwargs)
        backend["revoke"] = await tx.scalar(text("SELECT pg_backend_pid()"))
        locked.set()
        await asyncio.wait_for(started.wait(), 5)
        await blocked(c, backend["revoke"], backend["admit"])

    async def concurrent_admit():
        await asyncio.wait_for(locked.wait(), 5)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            backend["admit"] = await tx.scalar(text("SELECT pg_backend_pid()"))
            started.set()
            with pytest.raises(ValueError, match="registration_revoked"):
                await admin.admit(tx, environment=c["environment"], **request)

    async def registration_revoke():
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            return await registry_admin.revoke(tx, environment=c["environment"], registration_id=registry["registration_id"],
                candidate_sha256=request["candidate_sha256"])

    monkeypatch.setattr(registry_admin, "lifetime", before_revoke)
    await asyncio.wait_for(asyncio.gather(registration_revoke(), concurrent_admit()), 20)
    assert await counts(c) == before
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Registration, registry["registration_id"])
        assert registry_service.stored_material(row) == original and row.revoked_at is not None
    assert "registration_revoked" in (await read(c, creation_request, auth)).json()["data"]["blockers"]


async def test_admin_final_authority_wait_cannot_commit_an_expired_source(profile, monkeypatch):
    c = profile
    _, _, request, _, _, _ = await prepared(c)
    before = await counts(c)
    real = admin.current_actor
    future = utcnow() + timedelta(seconds=settings().knowledge_ttl_seconds + 1)

    async def after_authority_wait(tx, *args, **kwargs):
        value = await real(tx, *args, **kwargs)
        # Deterministic passage of time after the initial source check, no payload mutation.
        monkeypatch.setattr(knowledge, "utcnow", lambda: future)
        return value

    monkeypatch.setattr(admin, "current_actor", after_authority_wait)
    with pytest.raises(HTTPException, match="knowledge_snapshot_expired"):
        await admit(c, request)
    assert await counts(c) == before


async def test_reader_final_authority_wait_observes_source_expiry_without_renewal(profile, monkeypatch):
    c = profile
    creation_request, _, request, _, auth, _ = await prepared(c)
    saved = await admit(c, request)
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        original = service.material(row), row.created_at, row.authorizing_session_id
        source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == row.business_id))
        source_original = source.payload, source.refreshed_at
    real = service.current_actor
    future = utcnow() + timedelta(seconds=settings().knowledge_ttl_seconds + 1)

    async def after_authority_wait(tx, *args, **kwargs):
        value = await real(tx, *args, **kwargs)
        monkeypatch.setattr(knowledge, "utcnow", lambda: future)
        monkeypatch.setattr(service, "utcnow", lambda: future)
        return value

    monkeypatch.setattr(service, "current_actor", after_authority_wait)
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert not data["profile_current"] and data["source_state"] == "unavailable"
    assert "public_source_expired" in data["blockers"]
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        assert (service.material(row), row.created_at, row.authorizing_session_id) == original
        source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == row.business_id))
        assert (source.payload, source.refreshed_at) == source_original


async def test_superseded_replay_after_code_rollback_cannot_claim_current_admission(profile, monkeypatch):
    c = profile
    creation_request, _, request, _, auth, _ = await prepared(c)
    first = await admit(c, request)
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    second = await admit(c, {**request, "execution_source_revision": "b" * 40})
    assert first["admission_id"] != second["admission_id"]
    assert (await read(c, creation_request, auth)).json()["data"]["admission"]["sequence"] == 2
    async with AsyncSession(c["admin"]) as tx:
        rows = list(await tx.scalars(select(Admission).where(Admission.creation_id == creation_request["creation_id"])
            .order_by(Admission.sequence)))
        original = [(row.id, service.material(row), row.created_at, row.authorizing_session_id) for row in rows]
    before = await counts(c)
    monkeypatch.setattr(settings(), "control_source_revision", "a" * 40)
    with pytest.raises(ValueError, match="profile_admission_superseded"):
        await admit(c, request)
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["admission"]["admission_id"] == second["admission_id"]
    assert not data["profile_current"] and "execution_source_changed" in data["blockers"]
    assert await counts(c) == before
    async with AsyncSession(c["admin"]) as tx:
        rows = list(await tx.scalars(select(Admission).where(Admission.creation_id == creation_request["creation_id"])
            .order_by(Admission.sequence)))
        assert [(row.id, service.material(row), row.created_at, row.authorizing_session_id) for row in rows] == original


async def test_three_party_reader_admission_registration_revoke_has_bounded_progress(profile, monkeypatch):
    """Observe real row/advisory waits; a queue cycle is not assumed to cause a deadlock."""
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    reader_locked, admission_shared, revoker_started = asyncio.Event(), asyncio.Event(), asyncio.Event()
    backend = {}
    real_owned, real_admit_lifetime, real_revoke_lifetime = routes.owned, admin.lifetime, registry_admin.lifetime
    async with AsyncSession(c["admin"]) as tx:
        original = registry_service.stored_material(await tx.get(Registration, registry["registration_id"]))

    async def pause_reader_after_actor(tx, *args, **kwargs):
        result = await real_owned(tx, *args, **kwargs)
        backend["reader"] = await tx.scalar(text("SELECT pg_backend_pid()"))
        reader_locked.set()
        await asyncio.wait_for(admission_shared.wait(), 5)
        await blocked(c, backend["reader"], backend["admit"])
        await asyncio.wait_for(revoker_started.wait(), 5)
        await blocked(c, backend["admit"], backend["revoke"])
        return result

    async def observe_admission_shared(tx, *args, **kwargs):
        await real_admit_lifetime(tx, *args, **kwargs)
        backend["admit"] = await tx.scalar(text("SELECT pg_backend_pid()"))
        admission_shared.set()

    async def observe_revoke_wait(tx, *args, **kwargs):
        backend["revoke"] = await tx.scalar(text("SELECT pg_backend_pid()"))
        revoker_started.set()
        await real_revoke_lifetime(tx, *args, **kwargs)

    async def concurrent_admit():
        await asyncio.wait_for(reader_locked.wait(), 5)
        return await admit(c, request)

    async def concurrent_revoke():
        await asyncio.wait_for(admission_shared.wait(), 5)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            return await registry_admin.revoke(tx, environment=c["environment"], registration_id=registry["registration_id"],
                candidate_sha256=request["candidate_sha256"])

    monkeypatch.setattr(routes, "owned", pause_reader_after_actor)
    monkeypatch.setattr(admin, "lifetime", observe_admission_shared)
    monkeypatch.setattr(registry_admin, "lifetime", observe_revoke_wait)
    response, saved, revoked = await asyncio.wait_for(asyncio.gather(
        read(c, creation_request, auth), concurrent_admit(), concurrent_revoke()), 20)
    assert response.status_code == 200, response.text
    assert saved["profile_admitted"] and revoked["revoked_at"]
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Registration, registry["registration_id"])
        assert registry_service.stored_material(row) == original and row.revoked_at is not None
        admission = await tx.get(Admission, saved["admission_id"])
        assert admission.fingerprint == saved["fingerprint"] and admission.revoked_at is None


async def test_completed_index_replay_preserves_exact_profile_receipt_and_source_time(profile):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    saved = await admit(c, request)
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        business = await tx.get(Business, registry["business_id"])
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == business.id))
        original = state.payload, state.refreshed_at, service.material(row)
        receipt = state.payload["index_receipt"]
        assert service.IndexReceipt.model_validate(receipt).refreshed_at == state.refreshed_at
    async with db.transaction(business.id, c["environment"]) as tx:
        await policy.lock(tx, business.id, c["environment"])
        assert await index.commit(tx, business, index.Commit(
            transfer_id=receipt["transfer_id"], content_hash=receipt["content_hash"])) == receipt
    assert (await read(c, creation_request, auth)).json()["data"]["profile_current"]
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == business.id))
        assert (state.payload, state.refreshed_at, service.material(row)) == original


async def test_current_reference_to_all_revoked_pages_is_not_a_usable_profile_source(profile):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    async with AsyncSession(c["admin"]) as tx:
        business = await tx.get(Business, registry["business_id"])
    async with db.transaction(business.id, c["environment"]) as tx:
        await policy.lock(tx, business.id, c["environment"])
        await index.locked(tx, business)
        await knowledge.revoke(tx, KnowledgeRevocation(base_revision=1, revision_hashes=["d" * 64], reason="Synthetic all-page revoke"))
        state = await tx.scalar(select(KnowledgeState))
        request["knowledge_ref"] = {**request["knowledge_ref"], "knowledge_revision": state.revision}
    before = await counts(c)
    with pytest.raises(HTTPException, match="knowledge_projection_empty"):
        await admit(c, request)
    assert await counts(c) == before
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    assert "public_source_unavailable" in response.json()["data"]["blockers"]
    assert not response.json()["data"]["profile_current"]


async def test_registration_appearing_after_read_pin_is_denied_until_fresh_transaction(profile, monkeypatch):
    c = profile
    creation_request, _, auth, _ = await accepted(c)
    real = routes.owned
    provisioned = False

    async def provision_before_actor(tx, *args, **kwargs):
        nonlocal provisioned
        if not provisioned:
            await provision(c, creation_request)
            provisioned = True
        return await real(tx, *args, **kwargs)

    monkeypatch.setattr(routes, "owned", provision_before_actor)
    response = await read(c, creation_request, auth)
    assert response.status_code == 409 and response.json()["code"] == "registration_changed", response.text
    monkeypatch.setattr(routes, "owned", real)
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["registration_state"] == "current" and not data["profile_current"]
    assert {"profile_missing", "public_source_not_admitted"} <= set(data["blockers"])


async def test_unreceipted_fresh_time_change_blocks_without_rewriting_source_or_admission(profile):
    c = profile
    creation_request, registry, request, _, auth, _ = await prepared(c)
    saved = await admit(c, request)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        row = await tx.get(Admission, saved["admission_id"])
        original = service.material(row), row.created_at, row.authorizing_session_id
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == registry["business_id"]))
        changed_time = state.refreshed_at + timedelta(seconds=1)
        original_payload = state.payload
        state.refreshed_at = changed_time
    before = await counts(c)
    with pytest.raises(HTTPException, match="knowledge_index_receipt_conflict"):
        await admit(c, request)
    response = await read(c, creation_request, auth)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert not data["profile_current"] and "public_source_changed" in data["blockers"]
    assert await counts(c) == before
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Admission, saved["admission_id"])
        assert (service.material(row), row.created_at, row.authorizing_session_id) == original
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == registry["business_id"]))
        assert state.refreshed_at == changed_time and state.payload == original_payload
