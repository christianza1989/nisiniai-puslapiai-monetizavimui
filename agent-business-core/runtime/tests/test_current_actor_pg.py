"""Current owner observations must not reuse cached enabled or live Session state."""
import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.control.models import Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation.service import current_actor
from pinet_core.models import utcnow


@pytest.mark.parametrize("change", ["disable_user", "revoke_session"])
async def test_cached_actor_is_rechecked_after_external_revocation(customers, change):  # noqa: F811
    c = customers
    _, auth, me = await verified(c)
    async with AsyncSession(c["admin"]) as tx:
        native = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        owner, session_id = native.user_id, native.id
    async with scope(user=owner) as tx:
        cached = await tx.get(User, owner)
        session = await tx.get(Session, session_id)
        assert cached.enabled
        await current_actor(tx, session, me["portfolios"][0]["portfolio_id"])
        async with AsyncSession(c["admin"]) as other, other.begin():
            if change == "disable_user":
                await other.execute(update(User).where(User.id == owner).values(enabled=False))
            else:
                await other.execute(update(Session).where(Session.id == session_id).values(revoked_at=utcnow()))
        with pytest.raises(ControlError) as error:
            await current_actor(tx, session, me["portfolios"][0]["portfolio_id"])
        assert error.value.status == 401 and error.value.code == "unauthenticated"
