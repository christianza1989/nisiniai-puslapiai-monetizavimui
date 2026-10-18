"""Real restricted RLS and stale identity maps at the Foundation entry checkpoint."""
from uuid import uuid4

import pytest
from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_current_actor_pg import actor_principal  # noqa: F401
from test_customer_public import customers  # noqa: F401

from pinet_core.control.models import Session, User
from pinet_core.control.routes import ControlError, scope
from pinet_core.site_build import foundation


class OwnershipReached(Exception):
    pass


@pytest.mark.parametrize('change', ['disabled_user', 'foreign_user', 'hidden_environment'])
async def test_fresh_foundation_actor_rejects_external_change_despite_cached_session(
        actor_principal, monkeypatch, change):  # noqa: F811
    c, owner, session_id, _ = actor_principal
    async def guard():
        return None
    async def owned(*args):
        raise OwnershipReached
    monkeypatch.setattr(foundation, 'guard', guard)
    monkeypatch.setattr(foundation, 'owned', owned)
    async with scope(user=owner) as tx:
        cached = await tx.get(Session, session_id)
        carried = cached
        with pytest.raises(OwnershipReached):
            await foundation.capture(tx, carried, str(uuid4()))
        if change == 'hidden_environment':
            # Change real RLS visibility without inventing an invalid foreign key.
            await tx.execute(text("SELECT set_config('pinet.environment',:value,true)"),
                {'value': 'test-hidden-foundation'})
        else:
            async with AsyncSession(c['admin']) as other, other.begin():
                if change == 'disabled_user':
                    await other.execute(update(User).where(User.id == owner).values(enabled=False))
                else:
                    from test_customer_public import verified
                    _, _, foreign = await verified(c)
                    await other.execute(update(Session).where(Session.id == session_id)
                        .values(user_id=foreign['user_id']))
        with pytest.raises(ControlError) as error:
            await foundation.capture(tx, carried, str(uuid4()))
        assert error.value.status == 401 and error.value.code == 'unauthenticated'
