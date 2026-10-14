"""Current native RLS/Node pins on a synthetic approved case, provider zero."""
import subprocess
from uuid import uuid4

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401
from test_site_build import build, creation, first  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation.adapter import ROOT
from pinet_core.site_build import foundation


async def prepared(c, monkeypatch):
    source = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    monkeypatch.setattr(settings(), "control_source_revision", source)
    monkeypatch.setattr(foundation, "source_current", lambda: True)
    cid, auth, _ = await first(c)
    async with AsyncSession(c["admin"]) as tx:
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        return cid, auth, session.user_id, session.id


async def current(tx, session_id):
    return await tx.get(Session, session_id, populate_existing=True)


async def test_native_capture_keeps_approval_intake_and_observation_session_without_admission(build, monkeypatch):  # noqa: F811
    cid, _, owner, session_id = await prepared(build, monkeypatch)
    async with scope(user=owner) as tx:
        pin = await foundation.capture(tx, await current(tx, session_id), cid)
        assert str(pin.creation_id) == cid and str(pin.session_id) == session_id
        assert str(pin.approval_session_id) == session_id and pin.accepted.accepted_revision == 1
        assert pin.accepted.site_id == "creation-"+cid.replace("-", "")
        assert len(pin.required_page_ids) >= 4
        assert pin.language_review_mode == "paused_local_pilot"
        await foundation.verify(tx, pin)
    async with scope(user=str(uuid4())) as tx:
        with pytest.raises(ControlError):
            await foundation.capture(tx, Session(id=session_id, user_id=owner), cid)


async def test_new_owner_revision_invalidates_previous_pin_without_rewriting_intake(build, monkeypatch):  # noqa: F811
    cid, auth, owner, session_id = await prepared(build, monkeypatch)
    async with scope(user=owner) as tx:
        pin = await foundation.capture(tx, await current(tx, session_id), cid)
    response = await build["client"].post("/customer/v2/creations/"+cid+"/revisions", headers=auth,
        json={"idempotency_key": str(uuid4()), "base_revision": 1, "message": "Pakeiskite sintetinį dabartinį aprašą."})
    assert response.status_code == 202, response.text
    async with scope(user=owner) as tx:
        with pytest.raises(ControlError) as error:
            await foundation.verify(tx, pin)
        assert error.value.code == "foundation_revision_unavailable"


async def test_cached_disabled_owner_and_source_change_cannot_reuse_a_pin(build, monkeypatch):  # noqa: F811
    cid, _, owner, session_id = await prepared(build, monkeypatch)
    async with scope(user=owner) as tx:
        pin = await foundation.capture(tx, await current(tx, session_id), cid)
    monkeypatch.setattr(settings(), "control_source_revision", "f"*40)
    async with scope(user=owner) as tx:
        with pytest.raises(ControlError) as error:
            await foundation.verify(tx, pin)
        assert error.value.code == "foundation_context_stale"
    monkeypatch.setattr(settings(), "control_source_revision", pin.sources.execution_source_revision)
    async with scope(user=owner) as tx:
        cached = await tx.get(User, owner)
        assert cached.enabled
        async with AsyncSession(build["admin"]) as admin, admin.begin():
            await admin.execute(update(User).where(User.id == owner).values(enabled=False))
        with pytest.raises(ControlError) as error:
            await foundation.verify(tx, pin)
        assert error.value.code == "unauthenticated"
