"""A new normal revision admission can produce the proof needed by S6; provider0."""
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_site_build import approved, business_roles, creation, customers  # noqa: F401
from test_site_build import build as build_fixture

from pinet_core.config import settings
from pinet_core.control.models import Session
from pinet_core.control.routes import ControlError, token_hash
from pinet_core.creation import studio
from pinet_core.creation.models import Creation, Job
from pinet_core.models import utcnow
from pinet_core.site_build import service, worker

build = build_fixture


async def test_new_current_source_job_executes_without_rewriting_old_approval_or_job(build, monkeypatch):
    c = build
    cid, auth = await approved(c)
    # This is a preserved historical failed local job fixture, not a provider retry.
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        parent = await tx.get(Creation, cid)
        old_id = parent.active_job_id
        old = await tx.get(Job, old_id)
        old_source = old.source_revision
        old.status, old.failure_code = "failed", "run_timeout"
        parent.status, parent.stage, parent.failure_code, parent.active_job_id = "failed", "failed", "run_timeout", None
        original = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        new_token = uuid4().hex+uuid4().hex
        tx.add(Session(user_id=original.user_id, environment_id=original.environment_id,
            token_hash=token_hash(new_token), expires_at=utcnow()+timedelta(hours=1)))
    monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
    assert (await service.advance(cid))["code"] == "site_build_source_stale"

    async with AsyncSession(c["admin"]) as tx, tx.begin():
        original = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        original.expires_at = utcnow()-timedelta(seconds=1)
    fresh_auth = {"Authorization": "Bearer "+new_token}
    response = await c["client"].post(f"/customer/v2/creations/{cid}/revisions", headers=fresh_auth,
        json={"base_revision": 0, "message": "Parenk to paties peržiūrėto plano privačią svetainės versiją.", "idempotency_key": str(uuid4())})
    assert response.status_code == 202, response.text
    state = await service.advance(cid)
    assert state["phase"] == "business_draft" and state["state"] == "queued", state
    assert state["job_id"] != old_id
    # The draft must execute under the new admitted Session. After acceptance,
    # the supervisor cannot reuse the expired historical approval Session for GUIDE.
    with pytest.raises(ControlError) as held:
        await worker.tick(cid, creation_role_runner=business_roles(), intake_runner=studio.import_draft)
    assert held.value.status == 401
    async with AsyncSession(c["admin"]) as tx:
        old = await tx.get(Job, old_id)
        parent = await tx.get(Creation, cid)
        assert old.status == "failed" and old.failure_code == "run_timeout" and old.source_revision == old_source
        assert parent.current_revision == 1 and parent.source_revision == old_source
    # Accepted native proof exists now, but GUIDE still requires explicit S6 adoption.
    with pytest.raises(ControlError) as held:
        await service.advance(cid)
    assert held.value.status == 401
    from pinet_core.site_build import foundation
    monkeypatch.setattr(foundation, "source_current", lambda: True)
    resumed = await c["client"].post(f"/customer/v2/creations/{cid}/build-continuations", headers=fresh_auth,
        json={"accepted_revision": 1, "idempotency_key": str(uuid4())})
    assert resumed.status_code == 200, resumed.text
    assert (await service.advance(cid))["phase"] == "initial_content"


@pytest.mark.parametrize("case", ["old_source_job", "revoked_session", "archived"])
async def test_source_adoption_never_executes_unadmitted_old_or_revoked_work(build, monkeypatch, case):
    c = build
    cid, auth = await approved(c)
    if case != "old_source_job":
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            parent = await tx.get(Creation, cid)
            old = await tx.get(Job, parent.active_job_id)
            old.status, old.failure_code = "failed", "run_timeout"
            parent.status, parent.stage, parent.active_job_id = "failed", "failed", None
    monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
    if case != "old_source_job":
        response = await c["client"].post(f"/customer/v2/creations/{cid}/revisions", headers=auth,
            json={"base_revision": 0, "message": "Nauja privataus juodraščio versija.", "idempotency_key": str(uuid4())})
        assert response.status_code == 202, response.text
    if case == "revoked_session":
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
            session.revoked_at = utcnow()
    if case == "archived":
        response = await c["client"].post(f"/customer/v2/creations/{cid}/archive", headers=auth,
            json={"idempotency_key": str(uuid4())})
        assert response.status_code == 200, response.text
    value = await service.advance(cid)
    assert value["state"] == "blocked" and value["code"] in {
        "site_build_source_stale", "authorization_revoked", "build_approval_unavailable", "creation_archived"}, value
