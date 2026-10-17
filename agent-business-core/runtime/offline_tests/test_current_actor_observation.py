"""Canonical actor code over synthetic SQL and modeled ORM identity-map semantics."""
import copy
from datetime import timedelta
from types import SimpleNamespace as Row
from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql

from pinet_core.config import settings
from pinet_core.control.models import Membership, Portfolio, Session, User
from pinet_core.control.routes import ControlError
from pinet_core.creation import service
from pinet_core.customer.models import Account
from pinet_core.models import utcnow


@pytest.fixture
def actor(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "environment", "test-actor-joined")
    owner, organization = str(uuid4()), str(uuid4())
    f = Row(clock=utcnow(), queries=[], hidden=set(), cache={}, after_statement=None)
    f.rows = {
        User: Row(id=owner, environment_id=cfg.environment, enabled=True),
        Session: Row(id=str(uuid4()), user_id=owner, environment_id=cfg.environment,
            revoked_at=None, expires_at=f.clock+timedelta(hours=1)),
        Account: Row(id=str(uuid4()), user_id=owner, environment_id=cfg.environment,
            verified_at=f.clock, display_name="Original synthetic account"),
        Portfolio: Row(id=str(uuid4()), environment_id=cfg.environment, organization_id=organization,
            display_name="Original synthetic portfolio"),
        Membership: Row(id=str(uuid4()), user_id=owner, environment_id=cfg.environment,
            organization_id=organization, role="owner", enabled=True),
    }
    f.session = copy.deepcopy(f.rows[Session])
    f.portfolio_id = f.rows[Portfolio].id
    monkeypatch.setattr(service, "utcnow", lambda: f.clock)
    def visible(model):
        row = f.rows.get(model)
        if row is None or model in f.hidden or row.environment_id != cfg.environment:
            return None
        if model is Portfolio:
            member = f.rows.get(Membership)
            if not member or not member.enabled or member.organization_id != row.organization_id:
                return None
        return row
    def hydrate(model, row, refresh):
        if row is None:
            return None
        key = model, row.id
        if key not in f.cache:
            f.cache[key] = copy.deepcopy(row)
        elif refresh:
            vars(f.cache[key]).clear()
            vars(f.cache[key]).update(copy.deepcopy(vars(row)))
        return f.cache[key]
    class Tx:
        async def scalar(self, statement):
            model = statement.column_descriptions[0]["entity"]
            f.queries.append((model.__name__, statement))
            params = statement.compile().params
            row = visible(model)
            if model is Session and row and (params.get("id_1") != row.id
                    or params.get("user_id_1") != row.user_id
                    or params.get("environment_id_1") != row.environment_id):
                row = None
            if model is Account and row and row.verified_at is None:
                row = None
            if model is Membership:
                return row.id if row and row.enabled and row.role == "owner" and (
                    params.get("organization_id_1") == row.organization_id) else None
            return hydrate(model, row, bool(statement.get_execution_options().get("populate_existing")))
        async def get(self, model, identity, **options):
            f.queries.append((model.__name__, None))
            key = model, identity
            if key in f.cache and not options.get("populate_existing"):
                return f.cache[key]  # Actual get semantics: cached Portfolio bypasses fresh RLS.
            return hydrate(model, visible(model), bool(options.get("populate_existing")))
        async def execute(self, statement):
            f.queries.append(("joined", statement))
            params = statement.compile().params
            user, session, account = visible(User), visible(Session), visible(Account)
            if session and (session.id != f.session.id or session.user_id != f.session.user_id
                    or session.environment_id != cfg.environment):
                session = None
            if account and account.verified_at is None:
                account = None
            populate = bool(statement.get_execution_options().get("populate_existing"))
            columns = statement.column_descriptions
            result = None if user is None else [hydrate(User, user, populate),
                hydrate(Session, session, populate), hydrate(Account, account, populate)]
            if result is not None and any(c["entity"] is Portfolio for c in columns):
                portfolio = visible(Portfolio)
                if portfolio and params.get("id_2") not in {None, portfolio.id}:
                    portfolio = None
                member = visible(Membership)
                member_id = member.id if portfolio and member and member.enabled and member.role == "owner" and (
                    member.organization_id == portfolio.organization_id and member.user_id == user.id) else None
                result.extend([hydrate(Portfolio, portfolio, populate), member_id])
            if f.after_statement:
                f.after_statement()
            return Row(one_or_none=lambda: tuple(result) if result is not None else None)
    f.tx = Tx()
    return f


@pytest.mark.parametrize("portfolio", [False, True])
async def test_nonlocking_actor_is_one_fresh_statement_with_optional_outer_joins(actor, portfolio):
    f = actor
    result = await service.current_actor(f.tx, f.session, f.portfolio_id if portfolio else None)
    assert result.id == f.rows[Portfolio if portfolio else Account].id
    assert len(f.queries) == 1, [name for name, _ in f.queries]
    name, statement = f.queries[0]
    assert name == "joined" and statement.get_execution_options()["populate_existing"] is True
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert sql.count("LEFT OUTER JOIN") == (4 if portfolio else 2)
    assert "FOR UPDATE" not in sql and "FOR SHARE" not in sql
    where = sql.split("WHERE ")[-1]
    assert "control_users.id =" in where
    assert "control_customer_accounts.verified_at" not in where
    assert "control_memberships.role" not in where
    assert "control_sessions.id =" in sql and "control_sessions.user_id = control_users.id" in sql
    assert "control_customer_accounts.verified_at IS NOT NULL" in sql


@pytest.mark.parametrize("change,status", [("user_missing", 401), ("user_disabled", 401),
    ("session_hidden", 401), ("session_revoked", 401), ("session_expired", 401),
    ("session_foreign_user", 401), ("session_foreign_environment", 401),
    ("account_missing", 404), ("account_unverified", 404), ("portfolio_missing", 404),
    ("membership_disabled", 404), ("membership_viewer", 404)])
async def test_canonical_typed_hierarchy_still_distinguishes_actor_and_owner(actor, change, status):
    f = actor
    if change == "user_missing":
        f.hidden.add(User)
    elif change == "user_disabled":
        f.rows[User].enabled = False
    elif change == "session_hidden":
        f.hidden.add(Session)
    elif change == "session_revoked":
        f.rows[Session].revoked_at = f.clock
    elif change == "session_expired":
        f.rows[Session].expires_at = f.clock
    elif change == "session_foreign_user":
        f.rows[Session].user_id = str(uuid4())
    elif change == "session_foreign_environment":
        f.rows[Session].environment_id = "test-other"
    elif change == "account_missing":
        f.hidden.add(Account)
    elif change == "account_unverified":
        f.rows[Account].verified_at = None
    elif change == "portfolio_missing":
        f.hidden.add(Portfolio)
    elif change == "membership_disabled":
        f.rows[Membership].enabled = False
    else:
        f.rows[Membership].role = "viewer"
    with pytest.raises(ControlError) as error:
        await service.current_actor(f.tx, f.session, f.portfolio_id)
    assert (error.value.status, error.value.code) == (status, "unauthenticated" if status == 401 else "not_found")


@pytest.mark.parametrize("portfolio", [False, True])
async def test_missing_children_cannot_mask_disabled_user_or_invalid_session(actor, portfolio):
    f = actor
    f.hidden.update({Account, Portfolio, Membership})
    for change in (User, Session):
        f.hidden.add(change)
        with pytest.raises(ControlError) as error:
            await service.current_actor(f.tx, f.session, f.portfolio_id if portfolio else None)
        assert (error.value.status, error.value.code) == (401, "unauthenticated")
        f.hidden.remove(change)


@pytest.mark.parametrize("model,field,value", [(Account, "display_name", "Changed account"),
    (Portfolio, "display_name", "Changed portfolio")])
async def test_valid_returned_orm_entity_is_refreshed_in_same_transaction(actor, model, field, value):
    f = actor
    portfolio = f.portfolio_id if model is Portfolio else None
    first = await service.current_actor(f.tx, f.session, portfolio)
    setattr(f.rows[model], field, value)
    second = await service.current_actor(f.tx, f.session, portfolio)
    assert second is first and getattr(second, field) == value


async def test_cached_portfolio_organization_cannot_keep_old_membership_authority(actor):
    f = actor
    await service.current_actor(f.tx, f.session, f.portfolio_id)
    f.rows[Portfolio].organization_id = str(uuid4())
    with pytest.raises(ControlError) as error:
        await service.current_actor(f.tx, f.session, f.portfolio_id)
    assert (error.value.status, error.value.code) == (404, "not_found")


@pytest.mark.parametrize("model,field,value,status", [(User, "enabled", False, 401),
    (Session, "revoked_at", True, 401), (Account, "verified_at", None, 404),
    (Membership, "enabled", False, 404)])
async def test_prior_success_never_authorizes_changed_user_session_account_or_membership(actor, model, field, value, status):
    f = actor
    await service.current_actor(f.tx, f.session, f.portfolio_id)
    setattr(f.rows[model], field, value)
    with pytest.raises(ControlError) as error:
        await service.current_actor(f.tx, f.session, f.portfolio_id)
    assert error.value.status == status


async def test_locking_branch_keeps_original_five_read_order_and_row_lock_modes(actor):
    f = actor
    await service.current_actor(f.tx, f.session, f.portfolio_id, lock=True)
    assert [name for name, _ in f.queries] == ["User", "Session", "Account", "Portfolio", "Membership"]
    assert "FOR UPDATE" in str(f.queries[0][1].compile(dialect=postgresql.dialect()))
    assert "FOR SHARE" in str(f.queries[1][1].compile(dialect=postgresql.dialect()))
    assert f.queries[0][1].get_execution_options()["populate_existing"] is True
    assert f.queries[1][1].get_execution_options()["populate_existing"] is True
