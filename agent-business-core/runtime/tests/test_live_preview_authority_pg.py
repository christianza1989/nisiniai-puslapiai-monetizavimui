"""Opt-in real RLS/HTTP/native authority, synthetic content, no preview producer.

Helper collects only. Root supplies/migrates the dedicated QA database and runs.
Real renderer, port ownership and browser cleanup remain a separate Root gate.
Original request/intake/native files and append-only synthetic history are retained.
"""
import os
from datetime import timedelta

import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from test_content_work import roles
from test_customer_public import customers, verified  # noqa: F401
from test_foundation_bridge_pg import prepared
from test_site_build import build, creation  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import Session, User
from pinet_core.control.routes import ControlError
from pinet_core.creation import media, studio
from pinet_core.models import utcnow
from pinet_core.site_build import live_preview, worker

pytestmark = pytest.mark.skipif(os.environ.get("PINET_LIVE_PREVIEW_QA") != "1",
    reason="Requires explicitly supplied dedicated PostgreSQL QA; helper collection is not runtime acceptance")


@pytest.fixture
async def native_case(build, monkeypatch):  # noqa: F811
    cid, auth, owner, session_id = await prepared(build, monkeypatch)
    # The shared mutation/S6 guard must see idle GUIDE work, never bypass busy checks.
    for _ in range(3):
        result = await worker.tick(cid, guide_role_runner=roles())
        assert result["executed"], result
    token = auth["Authorization"][7:]
    authority = live_preview.Authority(token, cid)
    await authority.authenticate()
    pin = await authority.capture()
    _, _, artifacts, _ = studio.configuration()
    directory = artifacts / "customer-content" / cid / "revision-1"
    originals = {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()}
    yield build, cid, auth, owner, session_id, authority, pin, directory
    assert {str(p.relative_to(directory)): p.read_bytes() for p in directory.rglob("*") if p.is_file()} == originals


async def test_actual_get_is_readonly_blocked_and_cannot_prepare_release_or_server(native_case, monkeypatch):
    c, cid, auth, _, _, authority, pin, _ = native_case
    await authority.verify(pin)
    async def forbidden(*args, **kwargs):
        pytest.fail("Read-only GET cannot prepare a release or renderer")
    monkeypatch.setattr(live_preview.foundation, "prepare_preview", forbidden)
    url = f"/customer/v2/creations/{cid}/live-previews"
    response = await c["client"].get(url, headers=auth)
    assert response.status_code == 200, response.text
    value = response.json()["data"]
    assert not value["can_start"] and value["blocked_reasons"] and value["latest_lease"] is None
    assert value["current_revision"] == 1 and value["site_context_sha256"] == pin.site_context_sha256
    assert "preview_url" not in value and value["full_site_status"] == value["launch_status"] == "UNVERIFIED"


@pytest.mark.parametrize("change", ["revoked", "expired", "disabled"])
async def test_actual_current_session_or_disabled_owner_cannot_read_or_verify_old_pin(native_case, change):
    c, cid, auth, owner, session_id, authority, pin, _ = native_case
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if change == "disabled":
            await tx.execute(update(User).where(User.id == owner).values(enabled=False))
        else:
            patch = {"revoked_at": utcnow()} if change == "revoked" else {"expires_at": utcnow()-timedelta(seconds=1)}
            await tx.execute(update(Session).where(Session.id == session_id).values(**patch))
    with pytest.raises(ControlError) as error:
        await authority.verify(pin)
    assert error.value.status == 401
    response = await c["client"].get(f"/customer/v2/creations/{cid}/live-previews", headers=auth)
    assert response.status_code == 401, response.text


async def test_actual_foreign_customer_does_not_receive_any_lease_or_blocker_metadata(native_case):
    c, cid, _, _, _, _, _, _ = native_case
    _, foreign, _ = await verified(c)
    response = await c["client"].get(f"/customer/v2/creations/{cid}/live-previews", headers=foreign)
    assert response.status_code == 404, response.text
    assert "site_context_sha256" not in response.text and "latest_lease" not in response.text


async def test_actual_changed_execution_source_cannot_bypass_private_or_s6_binding(native_case, monkeypatch):
    _, _, _, _, _, authority, pin, _ = native_case
    monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
    # Explicit synthetic source-current seam only to reach the existing private/S6
    # refusal. This does not establish physical source adoption or renew anything.
    monkeypatch.setattr(media, "source_current", lambda: True)
    with pytest.raises(ControlError) as error:
        await authority.verify(pin)
    assert error.value.status == 409
    assert error.value.code in {"private_intake_missing", "build_continuation_stale"}
