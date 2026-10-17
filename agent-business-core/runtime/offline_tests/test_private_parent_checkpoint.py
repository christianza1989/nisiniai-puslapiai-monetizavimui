"""Canonical private-current path over modeled SQL; no database, process or provider."""
import asyncio
import copy
from collections import Counter
from datetime import timedelta
from types import SimpleNamespace as Row
from uuid import uuid4

import pytest
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import InvalidRequestError
from sqlalchemy.sql import visitors
from sqlalchemy.sql.elements import BinaryExpression, BindParameter
from test_authority_observation import graph  # noqa: F401
from test_current_actor_observation import actor  # noqa: F401

from pinet_core.control.models import Portfolio, Session
from pinet_core.control.routes import ControlError
from pinet_core.creation import private_preview
from pinet_core.creation.models import Creation
from pinet_core.creation.service import digest
from pinet_core.site_build import foundation
from pinet_core.site_build.authority_observation import Observation


def count_sql(monkeypatch, tx):
    """Count actual Tx boundaries, not the graph fixture's semantic row counters."""
    calls = []
    for name in ("scalar", "execute", "get", "refresh"):
        original = getattr(tx, name)
        async def measured(*args, _name=name, _original=original, **kwargs):
            calls.append(_name)
            return await _original(*args, **kwargs)
        monkeypatch.setattr(tx, name, measured)
    return calls


async def hot_request(f):
    original = f.rows["private"]
    marker, _ = await private_preview.retained_anchor(f.tx, f.creation, original.context)
    row = copy.deepcopy(original)
    row.id, row.idempotency_key, row.run_id = (str(uuid4()) for _ in range(3))
    row.context = {**row.context, "continuity": marker}
    row.context_sha256 = digest(row.context)
    row.request_fingerprint = digest({"creation_id": row.creation_id,
        "accepted_revision": row.accepted_revision,
        "candidate_sha256": row.context["accepted"]["candidate_sha256"],
        "idempotency_key": row.idempotency_key})
    return row


async def test_hot_private_current_uses_three_fresh_statements(graph, monkeypatch):  # noqa: F811
    f = graph
    calls = count_sql(monkeypatch, f.tx)
    with Observation(f.tx, f.u, f.creation.id) as observation, observation.phase():
        await foundation.capture(f.tx, f.u, f.creation.id)
        row = await hot_request(f)
        calls.clear()
        assert await private_preview.current(f.tx, f.creation, row)
        print("HOT_PRIVATE_SQL", len(calls), dict(Counter(calls)))
        assert len(calls) == 3, calls
        calls.clear()
        assert await private_preview.current(f.tx, f.creation, row)
        assert len(calls) == 3, "A second invocation must execute its own fresh checkpoint"


async def test_full_authority_keeps_ten_private_checkpoints(graph, monkeypatch):  # noqa: F811
    f = graph
    expected = await f.authority.capture()
    calls = count_sql(monkeypatch, f.tx)
    original = private_preview.current
    checkpoints = []
    async def current(*args):
        checkpoints.append(True)
        return await original(*args)
    monkeypatch.setattr(private_preview, "current", current)
    f.counts.clear()
    await f.authority.verify(expected)
    print("FULL_AUTHORITY_SQL", len(calls), dict(Counter(calls)), "PRIVATE_CHECKPOINTS", len(checkpoints))
    assert len(checkpoints) == 10
    assert f.counts["node"] == 1
    assert f.counts["material"] == 2


@pytest.fixture
def parent(actor, monkeypatch):  # noqa: F811
    f = actor
    f.native_parent = Row(id=str(uuid4()), user_id=f.session.user_id,
        portfolio_id=f.portfolio_id, organization_id=f.rows[Portfolio].organization_id,
        environment_id=f.session.environment_id, status="draft_ready", active_job_id=None, canonical_host=None,
        current_revision=1, source_revision="a"*40, display_name="Fresh synthetic parent")
    f.parent = copy.deepcopy(f.native_parent)
    f.hidden_parent, f.archive_schema, f.refreshes = False, True, 0
    execute = f.tx.execute
    async def observed(statement):
        # One statement observes every selected entity before after_statement;
        # no second select or completed permission result is synthesized.
        prefix_parent = None
        joined = any(c["name"] == "private_parent" for c in statement.column_descriptions)
        if joined:
            if not f.hidden_parent:
                prefix_parent = copy.deepcopy(f.native_parent)
        prefix = (await execute(statement)).one_or_none()
        if not joined:
            return Row(one_or_none=lambda: prefix)
        if prefix:
            environments = [p.right.value for p in visitors.iterate(statement) if isinstance(p, BinaryExpression)
                and isinstance(p.right, BindParameter) and getattr(p.left, "table", None) is Session.__table__
                and p.left.name == "environment_id"]
            if prefix[1] and any(value != prefix[1].environment_id for value in environments):
                prefix = (*prefix[:1], None, *prefix[2:])
        values = tuple(getattr(prefix_parent, c.key, None) if prefix_parent else None for c in Creation.__table__.c)
        return Row(one_or_none=lambda: (*prefix, values, f.archive_schema) if prefix else None)
    async def refresh(row):
        f.refreshes += 1
        raise InvalidRequestError("Could not refresh synthetic hidden Creation")
    monkeypatch.setattr(f.tx, "execute", observed)
    monkeypatch.setattr(f.tx, "refresh", refresh, raising=False)
    return f


@pytest.mark.parametrize("fault,status", [("user", 401), ("disabled", 401), ("session", 401),
    ("revoked", 401), ("expired", 401), ("foreign_user", 401), ("foreign_environment", 401),
    ("account", 404), ("portfolio", 404), ("member", 404)])
async def test_joined_parent_preserves_actor_before_owner_before_parent(parent, fault, status):
    from pinet_core.control.models import Membership, Portfolio, Session, User
    from pinet_core.customer.models import Account
    f = parent
    f.hidden_parent = True
    if fault == "user":
        f.hidden.add(User)
    elif fault == "disabled":
        f.rows[User].enabled = False
    elif fault == "session":
        f.hidden.add(Session)
    elif fault == "revoked":
        f.rows[Session].revoked_at = f.clock
    elif fault == "expired":
        f.rows[Session].expires_at = f.clock
    elif fault == "foreign_user":
        f.rows[Session].user_id = str(uuid4())
    elif fault == "foreign_environment":
        f.rows[Session].environment_id = "test-foreign-environment"
    elif fault == "account":
        f.hidden.add(Account)
    elif fault == "portfolio":
        f.hidden.add(Portfolio)
    elif fault == "member":
        f.rows[Membership].enabled = False
    if status == 401:
        f.hidden.add(Account)
        f.hidden.add(Portfolio)
    with pytest.raises(ControlError) as error:
        await private_preview._current_parent(f.tx, f.session, f.parent)
    assert (error.value.status, error.value.code) == (status, "unauthenticated" if status == 401 else "not_found")
    assert f.refreshes == 0, "Missing/RLS-hidden parent must not mask native actor/owner refusal"
    assert len(f.queries) == 1


async def test_hidden_parent_keeps_canonical_refresh_refusal(parent):
    f = parent
    f.hidden_parent = True
    with pytest.raises(InvalidRequestError, match="Could not refresh"):
        await private_preview.capture(f.tx, f.session, f.parent)
    assert f.refreshes == 1 and len(f.queries) == 1
    f.refreshes, f.queries[:] = 0, []
    _, snapshot, _ = await private_preview._current_parent(f.tx, f.session, f.parent)
    assert snapshot is None
    with pytest.raises(InvalidRequestError, match="Could not refresh"):
        await private_preview._populate_parent(f.tx, f.parent, snapshot)
    assert f.refreshes == 1 and len(f.queries) == 1


async def test_parent_is_populated_fresh_and_revocation_or_clock_requires_a_new_read(parent):
    from pinet_core.control.models import Session
    f = parent
    f.parent.status, f.parent.current_revision = "queued", 0
    session, snapshot, ready = await private_preview._current_parent(f.tx, f.session, f.parent)
    assert snapshot["status"] == "draft_ready" and snapshot["current_revision"] == 1 and ready
    assert f.parent.status == "queued", "Actor observation must not refresh the parent before its post-read fence"
    # Exercise real ORM committed-state loading separately from the fake SQL rows.
    current = Creation(**vars(f.parent))
    current.status = "stale-local-value"
    await private_preview._populate_parent(f.tx, current, snapshot)
    assert current.status == "draft_ready" and current.current_revision == 1
    assert {c.key: getattr(current, c.key) for c in Creation.__table__.c} == snapshot
    assert all(not inspect(current).attrs[c.key].history.has_changes() for c in Creation.__table__.c)
    assert session.id == f.session.id and len(f.queries) == 1
    statement = f.queries[-1][1]
    assert statement.get_execution_options()["populate_existing"] is True
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "LEFT OUTER JOIN control_creations" in sql
    assert "to_regclass('control_business_discoveries')" in sql
    assert "control_creation_archives" not in sql, "Absent schema must not bind its archive table"
    f.rows[Session].revoked_at = f.clock
    with pytest.raises(ControlError) as error:
        await private_preview._current_parent(f.tx, f.session, f.parent)
    assert error.value.status == 401 and len(f.queries) == 2
    f.rows[Session].revoked_at = None
    f.clock = f.rows[Session].expires_at + timedelta(milliseconds=1)
    with pytest.raises(ControlError) as error:
        await private_preview._current_parent(f.tx, f.session, f.parent)
    assert error.value.status == 401 and len(f.queries) == 3


async def test_lookup_environment_is_not_authority_and_clock_is_checked_after_sql(parent):
    f = parent
    lookup = copy.copy(f.session)
    lookup.environment_id = "test-foreign-lookup"
    with pytest.raises(ControlError) as error:
        await private_preview._current_parent(f.tx, lookup, f.parent)
    assert error.value.status == 401
    f.after_statement = lambda: setattr(f, "clock", f.rows[Session].expires_at)
    with pytest.raises(ControlError) as error:
        await private_preview._current_parent(f.tx, f.session, f.parent)
    assert error.value.status == 401 and len(f.queries) == 2


async def test_portfolio_change_still_hits_phase_post_read_binding_fence(parent):
    f = parent
    f.after_statement = lambda: setattr(f.parent, "portfolio_id", str(uuid4()))
    operation = Observation(f.tx, f.session, f.parent.id)
    with pytest.raises(ControlError) as error:
        with operation, operation.phase() as phase:
            await phase.actor(f.session, f.parent,
                parent_reader=lambda: private_preview._current_parent(f.tx, f.session, f.parent))
    assert (error.value.status, error.value.code) == (503, "source_unavailable")
    assert operation.closed and phase.closed and not phase.values


async def test_parent_reader_cannot_escape_owner_task_or_cancellation(parent):
    f = parent
    operation = Observation(f.tx, f.session, f.parent.id)
    with operation, operation.phase() as phase:
        async def foreign():
            await phase.actor(f.session, f.parent,
                parent_reader=lambda: private_preview._current_parent(f.tx, f.session, f.parent))
        with pytest.raises(ControlError) as error:
            await asyncio.create_task(foreign())
        assert error.value.code == "source_unavailable" and not f.queries
        async def cancelled():
            raise asyncio.CancelledError
        with pytest.raises(asyncio.CancelledError):
            await phase.actor(f.session, f.parent, parent_reader=cancelled)
    assert operation.closed and phase.closed and not phase.values


async def test_archive_schema_absent_short_circuits_before_missing_table(graph, monkeypatch):  # noqa: F811
    f = graph
    with Observation(f.tx, f.u, f.creation.id) as operation, operation.phase():
        await foundation.capture(f.tx, f.u, f.creation.id)
        row = await hot_request(f)
        f.schema_flags["to_regclass('control_business_discoveries')"] = False
        original = f.tx.scalar
        async def no_archive(statement, *args, **kwargs):
            assert "control_creation_archives" not in str(statement), "Absent archive schema must short-circuit"
            return await original(statement, *args, **kwargs)
        monkeypatch.setattr(f.tx, "scalar", no_archive)
        assert await private_preview.current(f.tx, f.creation, row)


@pytest.mark.parametrize("fault", ["missing", "revoked", "expired", "foreign_user", "foreign_environment",
    "disabled", "account", "member", "archive", "busy", "host"])
async def test_each_private_checkpoint_observes_current_refusal_again(graph, monkeypatch, fault):  # noqa: F811
    from pinet_core.models import utcnow
    f = graph
    with Observation(f.tx, f.u, f.creation.id) as operation, operation.phase():
        await foundation.capture(f.tx, f.u, f.creation.id)
        row = await hot_request(f)
        assert await private_preview.current(f.tx, f.creation, row)
        if fault == "missing":
            f.sessions.pop(f.p.id)
        elif fault == "revoked":
            f.p.revoked_at = utcnow()
        elif fault == "expired":
            f.p.expires_at = utcnow()
        elif fault == "foreign_user":
            f.p.user_id = str(uuid4())
        elif fault == "foreign_environment":
            f.p.environment_id = "test-foreign-environment"
        elif fault == "disabled":
            f.enabled = False
        elif fault == "account":
            f.verified = False
        elif fault == "member":
            f.member = False
        elif fault == "archive":
            f.archived = True
        elif fault == "busy":
            f.creation.active_job_id = str(uuid4())
        elif fault == "host":
            f.creation.canonical_host = "changed.example"
        assert await private_preview.current(f.tx, f.creation, row) is False


async def test_portfolio_refreshed_after_actor_keeps_original_current_refusal(graph, monkeypatch):  # noqa: F811
    f = graph
    with Observation(f.tx, f.u, f.creation.id) as operation, operation.phase():
        await foundation.capture(f.tx, f.u, f.creation.id)
        row = await hot_request(f)
        execute, refresh = f.tx.execute, f.tx.refresh
        changed_portfolio = str(uuid4())
        async def read(statement, *args, **kwargs):
            result = await execute(statement, *args, **kwargs)
            if any(c["name"] == "private_parent" for c in getattr(statement, "column_descriptions", ())):
                joined = result.one_or_none()
                values = dict(zip((c.key for c in Creation.__table__.c), joined[5], strict=True))
                values["portfolio_id"] = changed_portfolio
                return Row(one_or_none=lambda: (*joined[:5], tuple(values.values()), joined[6]))
            return result
        async def refreshed(parent, *args, **kwargs):
            result = await refresh(parent, *args, **kwargs)
            if parent is f.creation:
                parent.portfolio_id = changed_portfolio
            return result
        monkeypatch.setattr(f.tx, "execute", read)
        monkeypatch.setattr(f.tx, "refresh", refreshed)
        assert await private_preview.current(f.tx, f.creation, row) is False
