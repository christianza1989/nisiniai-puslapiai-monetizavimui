"""Explicit owner/source continuation through real HTTP/RLS/native intake; provider0."""
import asyncio
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import verified
from test_site_build import approved, business_roles, creation, customers, roles  # noqa: F401
from test_site_build import build as build_fixture

from pinet_core.business_discovery.models import BuildApproval, Report
from pinet_core.config import settings
from pinet_core.content_work.models import GuideJob
from pinet_core.control.models import Membership, Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation import studio
from pinet_core.creation import worker as creation_worker
from pinet_core.creation.models import Creation, Job, Revision
from pinet_core.customer.models import Account
from pinet_core.models import utcnow
from pinet_core.site_build import foundation, service, worker
from pinet_core.site_build.continuation_models import BuildContinuation

build = build_fixture


async def accepted(c, monkeypatch):
    monkeypatch.setattr(foundation, "source_current", lambda: True)
    cid, auth = await approved(c)
    assert await creation_worker.execute_once(creation_id=cid, role_runner=business_roles(), intake_runner=studio.import_draft)
    return cid, auth


def request():
    return {"accepted_revision": 1, "idempotency_key": str(uuid4())}


def path(cid):
    return f"/customer/v2/creations/{cid}/build-continuations"


async def snapshot(c, cid):
    async with AsyncSession(c["admin"]) as tx:
        creation_row = await tx.get(Creation, cid)
        approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == cid))
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == cid))
        report = await tx.get(Report, approval.report_id)
        job = await tx.get(Job, revision.job_id)
        return {"creation_source": creation_row.source_revision, "approval_session": approval.session_id,
            "approval_fingerprint": approval.fingerprint, "report_source": report.source_revision,
            "report_hash": report.material_hash, "revision_source": revision.source_revision,
            "revision_hash": revision.material_hash, "intake": job.usage["content_intake"]}


async def test_explicit_resume_adopts_current_source_and_new_session_without_historical_rewrite(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    before = await snapshot(c, cid)
    monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
    blocked = await service.advance(cid)
    assert blocked["code"] == "site_build_source_stale"
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        original = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        new_token = uuid4().hex+uuid4().hex
        fresh_id = str(uuid4())
        fresh = Session(id=fresh_id, user_id=original.user_id, environment_id=original.environment_id,
            token_hash=token_hash(new_token), expires_at=utcnow()+timedelta(hours=1))
        tx.add(fresh)
        original.expires_at = utcnow()-timedelta(seconds=1)
    fresh_auth = {"Authorization": "Bearer "+new_token}
    result = await c["client"].post(path(cid), headers=fresh_auth, json=request())
    assert result.status_code == 200, result.text
    assert result.json()["data"]["current"] and result.json()["data"]["execution_source_revision"] == "f"*40
    assert result.json()["data"]["accepted_source_revision"] == before["revision_source"]
    assert await snapshot(c, cid) == before
    advance = await service.advance(cid)
    assert advance["state"] == "queued" and advance["phase"] == "initial_content"
    async with AsyncSession(c["admin"]) as tx:
        job = await tx.get(GuideJob, advance["job_id"])
        assert job.source_revision == "f"*40 and job.session_id == fresh_id
    repeat = await worker.tick(cid, guide_role_runner=roles())
    assert repeat["executed"] and repeat["completed_initial_guides"] == 1
    assert await snapshot(c, cid) == before
    view = await c["client"].get(path(cid), headers=fresh_auth)
    assert view.status_code == 200 and view.json()["data"]["latest"]["current"]


async def test_concurrent_exact_replay_conflict_and_foreign_owner_are_scoped(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    payload = request()
    responses = await asyncio.gather(*(c["client"].post(path(cid), headers=auth, json=payload) for _ in range(2)))
    assert all(r.status_code == 200 for r in responses), [r.status_code for r in responses]
    assert len({r.json()["data"]["continuation_id"] for r in responses}) == 1
    conflict = await c["client"].post(path(cid), headers=auth, json={**payload, "accepted_revision": 2})
    assert conflict.status_code == 409 and conflict.json()["code"] == "idempotency_conflict"
    _, other_auth, _ = await verified(c)
    denied = await c["client"].get(path(cid), headers=other_auth)
    assert denied.status_code == 404
    denied = await c["client"].post(path(cid), headers=other_auth, json=payload)
    assert denied.status_code == 404
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(BuildContinuation).where(BuildContinuation.creation_id == cid)) == 1


async def test_source_drift_replay_does_not_renew_and_revocation_fences_controller(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    payload = request()
    response = await c["client"].post(path(cid), headers=auth, json=payload)
    assert response.status_code == 200, response.text
    identity = response.json()["data"]["continuation_id"]
    monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
    replay = await c["client"].post(path(cid), headers=auth, json=payload)
    assert replay.status_code == 200 and not replay.json()["data"]["current"]
    assert replay.json()["data"]["continuation_id"] == identity
    blocked = await service.advance(cid)
    assert blocked["code"] == "build_continuation_stale"
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])).values(revoked_at=utcnow()))
    with pytest.raises(ControlError) as error:
        await service.advance(cid)
    assert error.value.status == 401
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id == cid)) == 0


async def test_storage_is_immutable_and_runtime_cannot_update_or_delete(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    response = await c["client"].post(path(cid), headers=auth, json=request())
    assert response.status_code == 200, response.text
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.scalar(select(BuildContinuation).where(BuildContinuation.creation_id == cid))
        identity, owner = row.id, row.user_id
    async with scope(user=owner) as tx:
        privileges = (await tx.execute(text("SELECT has_table_privilege(current_user,'control_site_build_continuations','UPDATE'), "
            "has_table_privilege(current_user,'control_site_build_continuations','DELETE')"))).one()
        assert tuple(privileges) == (False, False)
    with pytest.raises(Exception, match="immutable build continuation"):
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(BuildContinuation).where(BuildContinuation.id == identity).values(context_sha256="f"*64))


async def test_archive_stops_resume_and_retained_controller_authority(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    assert (await c["client"].post(path(cid), headers=auth, json=request())).status_code == 200
    archived = await c["client"].post(f"/customer/v2/creations/{cid}/archive", headers=auth,
        json={"idempotency_key": str(uuid4())})
    assert archived.status_code == 200
    denied = await c["client"].post(path(cid), headers=auth, json=request())
    assert denied.status_code == 409
    assert (await service.advance(cid))["state"] == "blocked"


@pytest.mark.parametrize("change", ["session_expiry", "disabled_user", "membership_revoked"])
async def test_current_actor_loss_stops_continued_admission(build, monkeypatch, change):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    assert (await c["client"].post(path(cid), headers=auth, json=request())).status_code == 200
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        if change == "session_expiry":
            session.expires_at = utcnow()-timedelta(seconds=1)
        elif change == "disabled_user":
            await tx.execute(update(User).where(User.id == session.user_id).values(enabled=False))
        else:
            await tx.execute(update(Membership).where(Membership.user_id == session.user_id).values(enabled=False))
    if change == "session_expiry":
        with pytest.raises(ControlError) as denied:
            await service.advance(cid)
        assert denied.value.status == 401
    else:
        # Forced RLS hides the revoked owner's approval before controller admission.
        blocked = await service.advance(cid)
        assert blocked["state"] == "blocked" and blocked["code"] == "authorization_revoked"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id == cid)) == 0


@pytest.mark.parametrize("change", ["session_expiry", "membership_revoked", "account_unverified"])
async def test_deferred_sql_fence_rejects_actor_loss_after_insert(build, monkeypatch, change):
    from pinet_core.creation.service import digest
    c = build
    cid, auth = await accepted(c, monkeypatch)
    assert (await c["client"].post(path(cid), headers=auth, json=request())).status_code == 200
    async with AsyncSession(c["admin"]) as tx:
        retained = await tx.scalar(select(BuildContinuation).where(BuildContinuation.creation_id == cid))
        values = {column.name: getattr(retained, column.name) for column in BuildContinuation.__table__.columns}
        owner, session_id = retained.user_id, retained.session_id
    values.update(id=str(uuid4()), idempotency_key=str(uuid4()))
    values["request_fingerprint"] = digest({"creation_id": cid, "accepted_revision": 1,
        "idempotency_key": values["idempotency_key"]})
    with pytest.raises(Exception, match="current continuation actor required"):
        async with scope(user=owner) as tx:
            tx.add(BuildContinuation(**values))
            await tx.flush()
            async with AsyncSession(c["admin"]) as admin, admin.begin():
                if change == "session_expiry":
                    await admin.execute(update(Session).where(Session.id == session_id).values(expires_at=utcnow()-timedelta(seconds=1)))
                elif change == "membership_revoked":
                    await admin.execute(update(Membership).where(Membership.user_id == owner,
                        Membership.environment_id == c["environment"]).values(enabled=False))
                else:
                    await admin.execute(update(Account).where(Account.user_id == owner,
                        Account.environment_id == c["environment"]).values(verified_at=None))
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(BuildContinuation).where(BuildContinuation.creation_id == cid)) == 1


async def test_superseded_replay_is_never_current_even_when_latest_session_is_revoked(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    payload = request()
    first = await c["client"].post(path(cid), headers=auth, json=payload)
    assert first.status_code == 200 and first.json()["data"]["current"]
    before = await snapshot(c, cid)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        original = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        new_token, fresh_id = uuid4().hex+uuid4().hex, str(uuid4())
        tx.add(Session(id=fresh_id, user_id=original.user_id, environment_id=original.environment_id,
            token_hash=token_hash(new_token), expires_at=utcnow()+timedelta(hours=1)))
    newer = await c["client"].post(path(cid), headers={"Authorization": "Bearer "+new_token}, json=request())
    assert newer.status_code == 200 and newer.json()["data"]["current"]
    replay = await c["client"].post(path(cid), headers=auth, json=payload)
    assert replay.status_code == 200 and not replay.json()["data"]["current"]
    assert replay.json()["data"]["continuation_id"] == first.json()["data"]["continuation_id"]
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Session).where(Session.id == fresh_id).values(revoked_at=utcnow()))
    replay = await c["client"].post(path(cid), headers=auth, json=payload)
    assert replay.status_code == 200 and not replay.json()["data"]["current"]
    observed = await c["client"].get(path(cid), headers=auth)
    assert observed.status_code == 200
    assert observed.json()["data"]["latest"]["continuation_id"] == newer.json()["data"]["continuation_id"]
    assert not observed.json()["data"]["latest"]["current"]
    with pytest.raises(ControlError) as denied:
        await service.advance(cid)
    assert denied.value.status == 401
    assert await snapshot(c, cid) == before
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(BuildContinuation).where(BuildContinuation.creation_id == cid)) == 2
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id == cid)) == 0


async def test_missing_new_actor_trigger_blocks_admission_but_preserves_latest_history(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    payload = request()
    first = await c["client"].post(path(cid), headers=auth, json=payload)
    assert first.status_code == 200
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(text("ALTER TABLE control_site_build_continuations DISABLE TRIGGER build_continuation_actor_fence"))
    try:
        refused = await c["client"].post(path(cid), headers=auth, json=request())
        assert refused.status_code == 503 and refused.json()["code"] == "build_continuation_schema_unavailable"
        observed = await c["client"].get(path(cid), headers=auth)
        assert observed.status_code == 200
        assert observed.json()["data"]["latest"]["continuation_id"] == first.json()["data"]["continuation_id"]
        assert observed.json()["data"]["latest"]["current"]
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(text("ALTER TABLE control_site_build_continuations ENABLE TRIGGER build_continuation_actor_fence"))


@pytest.mark.parametrize("change", ["public_source", "accepted_revision"])
async def test_changed_material_blocks_without_fallback_to_original_approval(build, monkeypatch, change):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    response = await c["client"].post(path(cid), headers=auth, json=request())
    assert response.status_code == 200
    if change == "public_source":
        original = foundation.source_pins
        monkeypatch.setattr(foundation, "source_pins", lambda: original().model_copy(update={"public_source_revision": "d"*40}))
    else:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Creation).where(Creation.id == cid).values(current_revision=2))
    blocked = await service.advance(cid)
    assert blocked["state"] == "blocked" and blocked["code"] == "build_continuation_stale"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id == cid)) == 0


async def test_explicit_continuation_does_not_retry_failed_guide_or_erase_history(build, monkeypatch):
    c = build
    cid, auth = await accepted(c, monkeypatch)
    assert (await c["client"].post(path(cid), headers=auth, json=request())).status_code == 200
    first = await service.advance(cid)
    assert first["state"] == "queued"
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(GuideJob).where(GuideJob.id == first["job_id"]).values(status="failed",
            failure_code="worker_interrupted", finished_at=utcnow()))
    assert (await c["client"].post(path(cid), headers=auth, json=request())).status_code == 200
    blocked = await service.advance(cid)
    assert blocked["state"] == "blocked" and blocked["job_id"] == first["job_id"]
    assert blocked["code"] == "worker_interrupted"
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideJob).where(GuideJob.creation_id == cid)) == 1
