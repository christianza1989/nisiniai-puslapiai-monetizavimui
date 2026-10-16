"""Root-run SQL authorization regression. Helper collects only; transport is inert."""
import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401
from test_foundation_bridge_pg import current, prepared
from test_site_build import build, creation  # noqa: F401

from pinet_core.control.models import Session, User
from pinet_core.control.routes import ControlError, scope
from pinet_core.models import utcnow
from pinet_core.site_build import foundation


@pytest.mark.parametrize("mutation", ["revoked", "disabled"])
async def test_preparation_rechecks_real_sql_authority_before_transport(build, monkeypatch, mutation):  # noqa: F811
    identity, _, owner, session_id = await prepared(build, monkeypatch)
    async with scope(user=owner) as tx:
        pin = await foundation.capture(tx, await current(tx, session_id), identity)
    async with AsyncSession(build["admin"]) as admin, admin.begin():
        if mutation == "revoked":
            await admin.execute(update(Session).where(Session.id == session_id).values(revoked_at=utcnow()))
        else:
            await admin.execute(update(User).where(User.id == owner).values(enabled=False))
    calls = []
    async def authorization():
        try:
            async with scope(user=owner) as tx:
                await foundation.verify(tx, pin)
                return True
        except ControlError:
            return False
    async def no_transport(*args):
        calls.append(args)
        raise AssertionError("Revoked SQL authority must not reach Node/build")
    monkeypatch.setattr(foundation.studio, "_execute", no_transport)
    with pytest.raises(ControlError, match="unauthenticated"):
        await foundation.prepare_preview(pin, still_authorized=authorization)
    assert not calls
