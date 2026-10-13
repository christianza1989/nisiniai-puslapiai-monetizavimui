"""Provider-zero contract, source identity and cursor-family regression."""
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql

from pinet_core.config import settings
from pinet_core.control.routes import ControlError, seal_cursor
from pinet_core.models import utcnow
from pinet_core.workspace_read import contract, service
from pinet_core.workspace_read.wire import Page


def topic(kind="discovery", *, id=None, portfolio=None):
    id, portfolio = id or str(uuid4()), portfolio or str(uuid4())
    return {"kind": kind, "id": id, "topic": {"kind": kind, "topic_id": id, "portfolio_id": portfolio},
            "title": "Sintetinis pokalbis", "stored_status": "plan_ready", "current_revision": 1,
            "parent_business_id": None, "association_state": "unregistered",
            "created_at": utcnow(), "updated_at": utcnow()}


def page(items):
    return {"selection": {"portfolio_id": items[0]["topic"]["portfolio_id"], "kind": "portfolio",
            "selection_id": items[0]["topic"]["portfolio_id"]}, "collection": "topics",
            "items": items, "next_cursor": None}


def test_same_uuid_in_two_legacy_sources_retains_distinct_typed_identity():
    did, portfolio = str(uuid4()), str(uuid4())
    value = Page(**page([topic(id=did, portfolio=portfolio), topic("creation", id=did, portfolio=portfolio)]))
    assert len(value.items) == 2 and value.team_protocol == "not_implemented"
    assert all(item.author_semantics == "legacy_user_assistant" for item in value.items)


@pytest.mark.parametrize("fault", ["repeated", "foreign_portfolio", "wrong_parent", "wrong_collection", "spoofed_author"])
def test_projection_rejects_cross_context_or_invented_identity(fault):
    item = topic()
    value = page([item])
    if fault == "repeated":
        value["items"].append(dict(item))
    elif fault == "foreign_portfolio":
        item["topic"]["portfolio_id"] = str(uuid4())
    elif fault == "wrong_parent":
        item["topic"]["kind"] = "creation"
    elif fault == "wrong_collection":
        value["collection"] = "tasks"
    else:
        item["participant_id"] = str(uuid4())
    with pytest.raises(ValidationError):
        Page(**value)


def test_latest_revoked_registration_never_falls_back_to_older_valid_identity():
    old = SimpleNamespace(creation_id="one", accepted_revision=1, revoked_at=None)
    latest = SimpleNamespace(creation_id="one", accepted_revision=2, revoked_at=utcnow())
    other = SimpleNamespace(creation_id="two", accepted_revision=1, revoked_at=None)
    assert service.latest_registrations([old, other, latest]) == [latest, other]


def test_cursor_is_bound_to_current_session_source_selection_collection_and_query(monkeypatch):
    monkeypatch.setattr(settings(), "control_cursor_secret", "x" * 64)
    session = SimpleNamespace(user_id=str(uuid4()), id=str(uuid4()))
    portfolio = str(uuid4())
    scope = SimpleNamespace(selection={"portfolio_id": portfolio}, snapshot="a" * 64)
    snapshot = service.cursor_scope(scope, "topics", "dizainas")
    now = utcnow()
    cursor = seal_cursor({"binding": [session.user_id, session.id, portfolio, settings().environment],
        "snapshot": snapshot, "expires": int((now + timedelta(minutes=10)).timestamp()),
        "after": str(uuid4()), "after_kind": "discovery", "after_time": now.isoformat(), "cutoff": now.isoformat()})
    assert service.cursor_anchor(cursor, session, scope, snapshot)[0][1] == "discovery"
    for other in [service.cursor_scope(scope, "tasks", "dizainas"), service.cursor_scope(scope, "topics", "kitas")]:
        with pytest.raises(ControlError) as error:
            service.cursor_anchor(cursor, session, scope, other)
        assert error.value.status == 409
    with pytest.raises(ControlError) as error:
        service.cursor_anchor(cursor, SimpleNamespace(user_id=session.user_id, id=str(uuid4())), scope, snapshot)
    assert error.value.status == 400


@pytest.mark.parametrize("query", ["x" * 101, "tekstas\x00", "tekstas\n"])
def test_search_rejects_oversized_and_control_input(query):
    with pytest.raises(ControlError) as error:
        service.query_text(query)
    assert error.value.status == 400


def test_result_families_are_grouped_before_limit_and_search_escapes_wildcards():
    from pinet_core.creation.models import Artifact
    expected = {"user_id": "one", "portfolio_id": "two", "organization_id": "three", "environment_id": "test-unit"}
    statement = service.page_query(Artifact, expected, "creation_id", [str(uuid4())],
        "creation_artifact", 1, "%_", Artifact.display_name, utcnow(), None)
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "max(control_creation_artifacts.revision)" in sql
    assert "GROUP BY control_creation_artifacts.creation_id, control_creation_artifacts.kind" in sql
    assert "JOIN" in sql and "LIMIT" in sql
    assert "ESCAPE" in sql


def test_additive_contract_has_only_fixed_get_and_strict_envelope():
    document = contract.document()
    assert document["info"]["version"] == "workspace-read.v1"
    assert all(set(methods) == {"get"} for methods in document["paths"].values())
    assert document["components"]["schemas"]["Envelope"]["additionalProperties"] is False
    assert "participant_id" not in str(document)
