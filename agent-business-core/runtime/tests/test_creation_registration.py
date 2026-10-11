"""Real restricted PostgreSQL, synthetic customers/team + maintained native intake; no provider calls."""
import asyncio
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_team import runner
from test_customer_creations import creation as creation_fixture
from test_customer_creations import result, start
from test_customer_public import customers, logged, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation import studio, team, worker
from pinet_core.creation.models import Attempt, Job, Revision, TeamEvent
from pinet_core.creation_registration import admin, service
from pinet_core.creation_registration.models import Registration
from pinet_core.customer.models import Account
from pinet_core.models import Business, BusinessPolicy, KnowledgeState, utcnow
from pinet_core.tasks.codex_transport import RunnerError

creation = creation_fixture


@pytest.fixture
async def registration(creation):
    c = creation
    c["registered_business_ids"] = set()
    (studio.RUNTIME / "artifacts").mkdir(exist_ok=True)
    try:
        yield c
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            # This random test environment owns these records; never touch another environment.
            ids = list(await tx.scalars(select(Registration.business_id).where(Registration.environment_id == c["environment"])))
            ids += list(c["registered_business_ids"])
            await tx.execute(delete(Registration).where(Registration.environment_id == c["environment"]))
            await tx.execute(delete(BusinessGrant).where(BusinessGrant.environment_id == c["environment"]))
            if ids:
                await tx.execute(delete(Business).where(Business.id.in_(ids)))


async def session_id(c, auth):
    async with AsyncSession(c["admin"]) as tx:
        return await tx.scalar(select(Session.id).where(Session.environment_id == c["environment"],
            Session.token_hash == token_hash(auth["Authorization"].split(" ")[1])))


async def accepted(c, *, legacy=False, canonical_host=None):
    value, auth, me = await verified(c)
    row, _ = await start(c, auth, me, canonical_host=canonical_host or uuid4().hex + ".example.test")
    if legacy:
        assert await worker.execute_once(result, intake_runner=studio.import_draft)
    else:
        assert await worker.execute_once(role_runner=runner([]), intake_runner=studio.import_draft)
    async with AsyncSession(c["admin"]) as tx:
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == row["creation_id"], Revision.sequence == 1))
        job = await tx.get(Job, revision.job_id)
        assert job.usage["content_intake"]["state"] == "private-draft-imported", job.usage
    request = {"creation_id": row["creation_id"], "accepted_revision": 1,
        "candidate_sha256": revision.material_hash, "accepted_source_revision": revision.source_revision,
        "authorizing_session_id": await session_id(c, auth)}
    return request, value, auth, me


async def provision(c, request):
    async with AsyncSession(c["admin"], expire_on_commit=False) as tx, tx.begin():
        value = await admin.provision(tx, environment=c["environment"], **request)
    c["registered_business_ids"].add(value["business_id"])
    return value


async def read(c, request, auth, **params):
    return await c["client"].get(f"/customer/v2/creations/{request['creation_id']}/registration", headers=auth, params=params)


async def counts(c):
    async with AsyncSession(c["admin"]) as tx:
        values = []
        for model in (Registration, BusinessGrant, Attempt, Job, KnowledgeState, BusinessPolicy):
            values.append(await tx.scalar(select(func.count()).select_from(model).where(model.environment_id == c["environment"])))
        return tuple(values)


async def test_missing_registration_is_private_readonly_and_bounded(registration):
    c = registration
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    request = {"creation_id": row["creation_id"]}
    before = await counts(c)
    response = await read(c, request, auth)
    assert response.status_code == 200, response.text
    assert response.json()["contract_version"] == "creation-registration.v1"
    data = response.json()["data"]
    assert data["state"] == "missing" and data["registration"] is None and not data["binding_current"]
    assert data["revision_pending"] and response.headers["cache-control"] == "private, no-store"
    for params in ({"unknown": "1"}, {"accepted_revision": "bad"}, {"accepted_revision": 0}, {"accepted_revision": 21}):
        assert (await read(c, request, auth, **params)).status_code == 400
    assert (await read(c, request, auth, accepted_revision=1)).status_code == 409
    path = f"/customer/v2/creations/{row['creation_id']}/registration?accepted_revision=1&accepted_revision=1"
    assert (await c["client"].get(path, headers=auth)).status_code == 400
    assert (await c["client"].post(path, headers=auth)).status_code == 405
    assert await counts(c) == before


@pytest.mark.parametrize("paused_language", [False, True])
async def test_exact_provision_new_session_replay_preserves_history_and_all_activation_gates(registration, monkeypatch, paused_language):
    c = registration
    monkeypatch.setattr(settings(), "creation_language_review_enabled", not paused_language)
    request, value, auth, me = await accepted(c)
    before = await counts(c)
    # Referenced accepted source is immutable historical identity, not the new running code SHA.
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    first = await provision(c, request)
    assert first["replayed"] is False
    newer = await logged(c, value)
    second = await provision(c, {**request, "authorizing_session_id": await session_id(c, newer)})
    assert second["registration_id"] == first["registration_id"] and second["replayed"]
    after = await counts(c)
    assert after == (before[0] + 1, before[1] + 1, *before[2:])
    response = await read(c, request, newer, accepted_revision=1)
    assert response.status_code == 200, response.text
    view = response.json()["data"]
    assert view["state"] == "current" and view["binding_current"]
    assert view["registration"]["site_id"] == "creation-" + request["creation_id"].replace("-", "")
    assert view["registration"]["accepted_source_revision"] == "a" * 40
    assert response.json()["source_revision"] == "b" * 40
    assert not view["public_source_admitted"] and not view["profile_admitted"]
    assert view["hostname_authority"] == view["full_f1_status"] == view["launch_status"] == "UNVERIFIED"
    assert view["channel_activation"] == "not_performed"
    for forbidden in ("authorizing_session", "coordinator_event", "intake_sha", "info@pinet.lt", "MB Pinet", "dataDir", "manifestPath", "password"):
        assert forbidden not in response.text
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Registration, first["registration_id"])
        grant = await tx.get(BusinessGrant, row.grant_id)
        assert row.authorizing_session_id == request["authorizing_session_id"]
        assert grant.stage is None and grant.last_verified_activity_at is None
        assert grant.connection_status == "registered" and grant.runtime_status == "not_connected"
        assert await tx.scalar(select(KnowledgeState.id).where(KnowledgeState.business_id == first["business_id"])) is None
        assert await tx.scalar(select(BusinessPolicy.id).where(BusinessPolicy.business_id == first["business_id"])) is None
    assert await counts(c) == after


async def test_historical_absent_mode_keeps_original_normalized_coordinator_proof(registration, monkeypatch):
    current_event_data = team.EventData
    class HistoricalEventData(team.EventData):
        def model_dump(self, *args, **kwargs):
            value = super().model_dump(*args, **kwargs)
            value.pop("language_review_mode", None)
            value.pop("findings", None)
            value.pop("failure_code", None)
            return value

    monkeypatch.setattr(settings(), "creation_language_review_enabled", True)
    monkeypatch.setattr(team, "EventData", HistoricalEventData)
    request, _, auth, me = await accepted(registration)
    async with scope(user=me["user_id"]) as tx:
        event = await tx.scalar(select(TeamEvent).where(TeamEvent.creation_id == request["creation_id"],
            TeamEvent.state == "succeeded").order_by(TeamEvent.sequence.desc()))
        assert "language_review_mode" not in event.payload
        # Exactly the previous normalized EventData fields, before the new additive key.
        normalized = current_event_data.model_validate(event.payload).model_dump(mode="json")
        normalized.pop("language_review_mode")
        original_hash = service.digest(normalized)
        assert original_hash != service.digest(event.payload)
    first = await provision(registration, request)
    async with AsyncSession(registration["admin"]) as tx:
        saved = await tx.get(Registration, first["registration_id"])
        assert saved.coordinator_sha256 == original_hash
        fingerprint = saved.fingerprint
    assert (await read(registration, request, auth)).json()["data"]["binding_current"]
    assert (await provision(registration, request))["replayed"]
    async with AsyncSession(registration["admin"]) as tx:
        assert (await tx.get(Registration, first["registration_id"])).fingerprint == fingerprint


@pytest.mark.parametrize("changes", [{"accepted_revision": 2}, {"candidate_sha256": "f" * 64},
    {"accepted_source_revision": "b" * 40}, {"authorizing_session_id": str(uuid4())}])
async def test_wrong_expected_identity_rejected_without_partial_registration(registration, changes):
    c = registration
    request, _, _, _ = await accepted(c)
    before = await counts(c)
    with pytest.raises((ValueError, ControlError)):
        await provision(c, {**request, **changes})
    assert await counts(c) == before
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(Business.id).where(Business.site_id == service.site_id(request["creation_id"]))) is None


@pytest.mark.parametrize("field", ["siteId", "sourceHash", "creationId", "acceptedRevision", "canonicalHost", "requestHash"])
async def test_native_intake_identity_tampering_is_rejected_by_shared_validator(registration, field):
    c = registration
    request, _, _, _ = await accepted(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == request["creation_id"]))
        job = await tx.get(Job, revision.job_id)
        intake = {**job.usage["content_intake"], field: 9 if field == "acceptedRevision" else "forged"}
        job.usage = {**job.usage, "content_intake": intake}
    before = await counts(c)
    with pytest.raises((ValueError, ControlError)):
        await provision(c, request)
    assert await counts(c) == before


async def test_legacy_single_role_draft_cannot_become_accepted_registration(registration):
    c = registration
    request, _, _, _ = await accepted(c, legacy=True)
    before = await counts(c)
    with pytest.raises(ControlError, match="accepted_team_review_missing"):
        await provision(c, request)
    assert await counts(c) == before


@pytest.mark.parametrize("target", ["user", "account", "membership", "expired_session", "revoked_session", "other_environment", "foreign_session"])
async def test_current_authority_is_required_for_provision(registration, target):
    c = registration
    request, _, _, me = await accepted(c)
    if target == "foreign_session":
        _, other, _ = await verified(c)
        request["authorizing_session_id"] = await session_id(c, other)
    else:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            if target == "user":
                await tx.execute(update(User).where(User.id == me["user_id"]).values(enabled=False))
            elif target == "account":
                await tx.execute(update(Account).where(Account.user_id == me["user_id"]).values(verified_at=None))
            elif target == "membership":
                await tx.execute(update(Membership).where(Membership.user_id == me["user_id"]).values(role="viewer"))
            elif target == "expired_session":
                await tx.execute(update(Session).where(Session.id == request["authorizing_session_id"]).values(expires_at=utcnow() - timedelta(seconds=1)))
            elif target == "revoked_session":
                await tx.execute(update(Session).where(Session.id == request["authorizing_session_id"]).values(revoked_at=utcnow()))
            else:
                request["creation_id"] = str(uuid4())
    before = await counts(c)
    with pytest.raises((ValueError, ControlError)):
        await provision(c, request)
    assert await counts(c) == before


async def test_pending_revision_blocks_registration_but_failed_retry_preserves_good_revision(registration):
    c = registration
    request, _, auth, _ = await accepted(c)
    path = f"/customer/v2/creations/{request['creation_id']}/revisions"
    response = await c["client"].post(path, headers=auth, json={"base_revision": 1,
        "message": "Patikrink ankstesnę versiją ir išsaugok nepatikrintų faktų ribas.", "idempotency_key": str(uuid4())})
    assert response.status_code == 202, response.text
    with pytest.raises(ValueError, match="creation_revision_pending"):
        await provision(c, request)

    async def fail(*args, **kwargs):
        raise RunnerError("provider_error")
    assert await worker.execute_once(role_runner=fail)
    saved = await provision(c, request)
    assert saved["accepted_revision"] == 1
    assert (await read(c, request, auth)).json()["data"]["binding_current"]


async def test_new_revision_requires_new_binding_and_preserves_original_identity(registration):
    c = registration
    request, _, auth, _ = await accepted(c)
    first = await provision(c, request)
    response = await c["client"].post(f"/customer/v2/creations/{request['creation_id']}/revisions", headers=auth,
        json={"base_revision": 1, "message": "Patikrink kitą versiją, išsaugodamas verslo nežinomybes.", "idempotency_key": str(uuid4())})
    assert response.status_code == 202
    pending = (await read(c, request, auth)).json()["data"]
    assert pending["revision_pending"] and not pending["binding_current"]
    assert await worker.execute_once(role_runner=runner([]), intake_runner=studio.import_draft)
    stale = (await read(c, request, auth)).json()["data"]
    assert stale["state"] == "stale" and not stale["binding_current"]
    assert (await read(c, request, auth, accepted_revision=1)).status_code == 409
    async with AsyncSession(c["admin"]) as tx:
        current = await tx.scalar(select(Revision).where(Revision.creation_id == request["creation_id"], Revision.sequence == 2))
        original = await tx.get(Registration, first["registration_id"])
        original_bytes = service.stored_material(original), original.fingerprint, original.authorizing_session_id
    newer = {**request, "accepted_revision": 2, "candidate_sha256": current.material_hash,
        "accepted_source_revision": current.source_revision}
    second = await provision(c, newer)
    assert second["business_id"] == first["business_id"] and second["registration_id"] != first["registration_id"]
    assert (await read(c, newer, auth)).json()["data"]["binding_current"]
    async with AsyncSession(c["admin"]) as tx:
        original = await tx.get(Registration, first["registration_id"])
        assert (service.stored_material(original), original.fingerprint, original.authorizing_session_id) == original_bytes


async def test_terminal_revoke_preserves_registry_and_cannot_be_replayed_or_unrevoked(registration):
    c = registration
    request, _, auth, _ = await accepted(c)
    saved = await provision(c, request)
    before = await counts(c)
    command = {"registration_id": saved["registration_id"], "candidate_sha256": request["candidate_sha256"]}
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        first = await admin.revoke(tx, environment=c["environment"], **command)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        assert await admin.revoke(tx, environment=c["environment"], **command) == first
    assert await counts(c) == before
    assert (await read(c, request, auth)).json()["data"]["state"] == "revoked"
    with pytest.raises(ValueError, match="registration_revoked"):
        await provision(c, request)
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Registration).where(Registration.id == saved["registration_id"]).values(revoked_at=None))
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Registration, saved["registration_id"])
        assert (await tx.get(BusinessGrant, row.grant_id)).enabled
        assert await tx.get(Business, row.business_id)


async def test_disabled_grant_is_observed_and_never_reenabled(registration):
    c = registration
    request, _, auth, _ = await accepted(c)
    saved = await provision(c, request)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        row = await tx.get(Registration, saved["registration_id"])
        await tx.execute(update(BusinessGrant).where(BusinessGrant.id == row.grant_id).values(enabled=False))
    data = (await read(c, request, auth)).json()["data"]
    assert data["state"] == "grant_revoked" and not data["binding_current"]
    with pytest.raises(ValueError, match="registration_grant_conflict"):
        await provision(c, request)


async def test_current_rls_no_self_grants_cross_tenant_isolation_and_immutable_proof(registration):
    c = registration
    request, _, auth, me = await accepted(c)
    saved = await provision(c, request)
    _, foreign, foreign_me = await verified(c)
    assert (await read(c, request, foreign)).status_code == 404
    async with scope(user=foreign_me["user_id"]) as tx:
        assert list(await tx.scalars(select(Registration))) == []
    async with scope(user=me["user_id"]) as tx:
        assert await tx.get(Registration, saved["registration_id"])
        for table in ("businesses", "control_business_grants", "control_creation_registrations"):
            for privilege in ("INSERT", "UPDATE", "DELETE"):
                assert not await tx.scalar(text("SELECT has_table_privilege(current_user,:t,:p)"), {"t": table, "p": privilege})
    async with scope(user=me["user_id"]) as tx:
        await tx.execute(text("SELECT set_config('pinet.environment',:e,true)"), {"e": "test-" + str(uuid4())})
        assert list(await tx.scalars(select(Registration))) == []
    with pytest.raises(DBAPIError):
        async with scope(user=me["user_id"]) as tx:
            await tx.execute(update(Registration).values(revoked_at=utcnow()))
    with pytest.raises(ValueError, match="administrative"):
        async with scope(user=me["user_id"]) as tx:
            await admin.provision(tx, environment=c["environment"], **request)
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Registration).where(Registration.id == saved["registration_id"]).values(intake_sha256="f" * 64))
    with pytest.raises(DBAPIError):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            row = await tx.get(Registration, saved["registration_id"])
            await tx.execute(update(BusinessGrant).where(BusinessGrant.id == row.grant_id)
                .values(portfolio_id=foreign_me["portfolios"][0]["portfolio_id"],
                        organization_id=foreign_me["portfolios"][0]["organization_id"]))
    assert (await read(c, request, auth)).json()["data"]["binding_current"]


@pytest.mark.parametrize("target", ["user", "account", "membership", "expired_session", "revoked_session"])
async def test_registered_read_rejects_current_revoked_customer_authority(registration, target):
    c = registration
    request, _, auth, me = await accepted(c)
    await provision(c, request)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if target == "user":
            await tx.execute(update(User).where(User.id == me["user_id"]).values(enabled=False))
        elif target == "account":
            await tx.execute(update(Account).where(Account.user_id == me["user_id"]).values(verified_at=None))
        elif target == "membership":
            await tx.execute(update(Membership).where(Membership.user_id == me["user_id"]).values(enabled=False))
        else:
            changes = {"revoked_at": utcnow()} if target == "revoked_session" else {"expires_at": utcnow() - timedelta(seconds=1)}
            await tx.execute(update(Session).where(Session.id == request["authorizing_session_id"]).values(**changes))
    response = await read(c, request, auth)
    assert response.status_code in (401, 404), response.text
    assert "registration_id" not in response.text


async def test_unbound_existing_uuid_site_cannot_be_adopted_by_registry_match(registration):
    c = registration
    request, _, _, _ = await accepted(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == request["creation_id"]))
        job = await tx.get(Job, revision.job_id)
        existing = Business(site_id=service.site_id(request["creation_id"]), canonical_host=job.usage["content_intake"]["canonicalHost"])
        tx.add(existing)
        await tx.flush()
        c["registered_business_ids"].add(existing.id)
    before = await counts(c)
    with pytest.raises(ValueError, match="unbound_registry_conflict"):
        await provision(c, request)
    assert await counts(c) == before


async def test_administrative_environment_mismatch_is_rejected_before_registration(registration):
    c = registration
    request, _, _, _ = await accepted(c)
    before = await counts(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        with pytest.raises(ValueError, match="local_registration_only"):
            await admin.provision(tx, environment="test-" + str(uuid4()), **request)
    assert await counts(c) == before


async def test_concurrent_exact_provision_has_one_registration_and_one_registry_entry(registration):
    c = registration
    request, _, _, _ = await accepted(c)
    before = await counts(c)
    first, second = await asyncio.gather(provision(c, request), provision(c, request))
    assert first["registration_id"] == second["registration_id"]
    assert sorted([first["replayed"], second["replayed"]]) == [False, True]
    assert await counts(c) == (before[0] + 1, before[1] + 1, *before[2:])


async def test_two_accepted_creations_same_host_never_reuse_host_as_ownership(registration):
    c = registration
    hostname = uuid4().hex + ".example.test"
    first, _, _, _ = await accepted(c, canonical_host=hostname)
    second, _, _, _ = await accepted(c, canonical_host=hostname)
    results = await asyncio.gather(provision(c, first), provision(c, second), return_exceptions=True)
    assert sum(isinstance(value, dict) for value in results) == 1
    assert sum(isinstance(value, ValueError) and str(value) == "registration_host_conflict" for value in results) == 1
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(Registration).where(Registration.environment_id == c["environment"])) == 1


async def test_final_current_binding_recheck_observes_revocation_during_read(registration, monkeypatch):
    c = registration
    request, _, auth, _ = await accepted(c)
    saved = await provision(c, request)
    real = service.current_actor

    async def late_revoke(*args, **kwargs):
        value = await real(*args, **kwargs)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await admin.revoke(tx, environment=c["environment"], registration_id=saved["registration_id"],
                candidate_sha256=request["candidate_sha256"])
        return value
    monkeypatch.setattr(service, "current_actor", late_revoke)
    response = await read(c, request, auth)
    assert response.status_code == 200, response.text
    assert response.json()["data"]["state"] == "revoked" and not response.json()["data"]["binding_current"]


async def test_existing_grant_revoke_is_linearized_after_provision_and_then_observed(registration, monkeypatch):
    c = registration
    request, _, auth, _ = await accepted(c)
    saved = await provision(c, request)
    async with AsyncSession(c["admin"]) as tx:
        grant_id = (await tx.get(Registration, saved["registration_id"])).grant_id
    grant_checked, revoke_started, revoke_finished = asyncio.Event(), asyncio.Event(), asyncio.Event()
    backend = {}
    real = admin.current_actor

    async def before_provision_commit(tx, *args, **kwargs):
        value = await real(tx, *args, **kwargs)
        if kwargs.get("lock"):
            return value
        backend["provision"] = await tx.scalar(text("SELECT pg_backend_pid()"))
        grant_checked.set()
        await asyncio.wait_for(revoke_started.wait(), timeout=5)
        # Observe the database lock itself, avoiding a timing-only success assertion.
        async with AsyncSession(c["admin"]) as observation:
            deadline = asyncio.get_running_loop().time() + 5
            while not revoke_finished.is_set() and asyncio.get_running_loop().time() < deadline:
                blocked = await observation.scalar(text("SELECT :owner = ANY(pg_blocking_pids(:revoker))"),
                    {"owner": backend["provision"], "revoker": backend["revoke"]})
                if blocked:
                    break
                await asyncio.sleep(0.02)
            else:
                raise AssertionError("Grant revocation committed before provision completed its current-grant gate")
        assert not revoke_finished.is_set()
        return value

    async def concurrent_revoke():
        await asyncio.wait_for(grant_checked.wait(), timeout=5)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            backend["revoke"] = await tx.scalar(text("SELECT pg_backend_pid()"))
            revoke_started.set()
            await tx.execute(update(BusinessGrant).where(BusinessGrant.id == grant_id).values(enabled=False))
        revoke_finished.set()

    monkeypatch.setattr(admin, "current_actor", before_provision_commit)
    replay, _ = await asyncio.wait_for(asyncio.gather(provision(c, request), concurrent_revoke()), timeout=15)
    assert replay["registration_id"] == saved["registration_id"] and replay["replayed"]
    assert revoke_finished.is_set()
    response = await read(c, request, auth)
    assert response.status_code == 200, response.text
    assert response.json()["data"]["state"] == "grant_revoked" and not response.json()["data"]["binding_current"]
    async with AsyncSession(c["admin"]) as tx:
        assert not (await tx.get(BusinessGrant, grant_id)).enabled
        assert (await tx.get(Registration, saved["registration_id"])).revoked_at is None
