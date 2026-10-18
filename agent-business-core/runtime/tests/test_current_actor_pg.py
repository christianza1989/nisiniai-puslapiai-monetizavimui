"""Current owner observations must not reuse cached enabled or live Session state."""
from uuid import uuid4

import pytest
from sqlalchemy import event, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.control.models import Membership, Organization, Portfolio, Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation.service import current_actor
from pinet_core.customer.models import Account
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


@pytest.fixture
async def actor_principal(customers):  # noqa: F811
    c = customers
    _, auth, me = await verified(c)
    async with AsyncSession(c["admin"]) as tx:
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        return c, session.user_id, session.id, me["portfolios"][0]["portfolio_id"]


@pytest.mark.parametrize("change,status", [("expired_session", 401), ("unverified_account", 404),
    ("disabled_membership", 404), ("viewer_membership", 404)])
async def test_cached_children_cannot_preserve_prior_actor_success(actor_principal, change, status):
    from datetime import timedelta
    c, owner, session_id, portfolio_id = actor_principal
    async with scope(user=owner) as tx:
        session = await tx.get(Session, session_id)
        account = await tx.scalar(select(Account).where(Account.user_id == owner))
        portfolio = await tx.get(Portfolio, portfolio_id)
        membership = await tx.scalar(select(Membership).where(Membership.user_id == owner,
            Membership.organization_id == portfolio.organization_id))
        assert await current_actor(tx, session, portfolio_id) is portfolio
        async with AsyncSession(c["admin"]) as other, other.begin():
            if change == "expired_session":
                await other.execute(update(Session).where(Session.id == session_id).values(expires_at=utcnow()-timedelta(seconds=1)))
            elif change == "unverified_account":
                await other.execute(update(Account).where(Account.id == account.id).values(verified_at=None))
            else:
                values = {"enabled": False} if change == "disabled_membership" else {"role": "viewer"}
                await other.execute(update(Membership).where(Membership.id == membership.id).values(**values))
        with pytest.raises(ControlError) as error:
            await current_actor(tx, session, portfolio_id)
        assert (error.value.status, error.value.code) == (status, "unauthenticated" if status == 401 else "not_found")


@pytest.mark.parametrize("with_portfolio", [False, True])
async def test_returned_entity_refreshes_existing_orm_object(actor_principal, with_portfolio):
    c, owner, session_id, portfolio_id = actor_principal
    model = Portfolio if with_portfolio else Account
    selected_id = portfolio_id if with_portfolio else None
    async with scope(user=owner) as tx:
        session = await tx.get(Session, session_id)
        original = await current_actor(tx, session, selected_id)
        changed = "Changed synthetic current actor entity"
        async with AsyncSession(c["admin"]) as other, other.begin():
            await other.execute(update(model).where(model.id == original.id).values(display_name=changed))
        observed = await current_actor(tx, session, selected_id)
        assert observed is original and observed.display_name == changed


async def test_cached_portfolio_cannot_keep_membership_after_organization_moves(actor_principal):
    c, owner, session_id, portfolio_id = actor_principal
    old_organization = None
    try:
        async with scope(user=owner) as tx:
            session = await tx.get(Session, session_id)
            cached = await current_actor(tx, session, portfolio_id)
            old_organization = cached.organization_id
            async with AsyncSession(c["admin"]) as other, other.begin():
                moved = Organization(id=str(uuid4()), environment_id=c["environment"], key="actor-move-"+uuid4().hex,
                    display_name="Synthetic moved actor organization", creator_user_id=owner)
                other.add(moved)
                await other.flush()
                # This actor deliberately has no Membership in the new organization.
                await other.execute(update(Portfolio).where(Portfolio.id == portfolio_id).values(organization_id=moved.id))
            with pytest.raises(ControlError) as error:
                await current_actor(tx, session, portfolio_id)
            assert (error.value.status, error.value.code) == (404, "not_found")
    finally:
        if old_organization:
            async with AsyncSession(c["admin"]) as other, other.begin():
                await other.execute(update(Portfolio).where(Portfolio.id == portfolio_id).values(organization_id=old_organization))


@pytest.mark.parametrize("with_portfolio", [False, True])
async def test_nonlocking_observation_executes_one_fresh_orm_statement(actor_principal, with_portfolio):
    _, owner, session_id, portfolio_id = actor_principal
    async with scope(user=owner) as tx:
        session = await tx.get(Session, session_id)
        observed = []
        def inspect(execution):
            observed.append(execution.statement)
        event.listen(tx.sync_session, "do_orm_execute", inspect)
        try:
            await current_actor(tx, session, portfolio_id if with_portfolio else None)
        finally:
            event.remove(tx.sync_session, "do_orm_execute", inspect)
        assert len(observed) == 1
        assert observed[0].get_execution_options()["populate_existing"] is True
        assert observed[0]._for_update_arg is None
