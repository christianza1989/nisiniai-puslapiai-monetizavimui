"""Bounded source import and data fences, no DB/provider/operating artifacts."""
from datetime import UTC, datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from pinet_core.business_attachment import admin, service
from pinet_core.business_attachment.models import Binding
from pinet_core.business_attachment.wire import Approve, SourcePayload
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest


def payload():
    return {"version": "external-business-source.v1", "external_revision": "reviewed-example-v1",
        "artifact_ref": "private://synthetic/source-v1", "artifact_sha256": "a"*64,
        "knowledge_sha256": "b"*64, "profile_sha256": None,
        "review_evidence_refs": ["private://synthetic/review-v1"],
        "facts": [{"id": "source-fact", "text": "Sintetinis šaltinis: café, \"reviewed\".\nNo delivery promise.",
            "source_ref": "private://synthetic/source-v1#fact"}]}


def source():
    now = datetime(2026, 10, 18, 7, 30, 0, 123456, tzinfo=UTC)
    row = Binding(**{key: str(uuid4()) for key in ("id", "user_id", "organization_id", "portfolio_id", "business_id",
        "grant_id", "authorizing_session_id", "request_id")}, environment_id="test-source",
        site_id="synthetic-source", canonical_host="synthetic.example.test", sequence=1, payload=payload(),
        source_revision="a"*40, request_fingerprint="c"*64, reviewed_at=now, expires_at=now+timedelta(days=30),
        revoked_at=None, created_at=now)
    row.fingerprint = digest(service.material(row))
    return row


def approval():
    return {"business_id": str(uuid4()), "authorizing_session_id": str(uuid4()), "request_id": str(uuid4()),
        "source_revision": "a"*40, "duration_seconds": 3600, "payload": payload()}


@pytest.mark.parametrize("change", [
    {"version": "unreviewed.v1"}, {"artifact_sha256": "x"*64}, {"facts": [{"id": "one", "text": "ok!", "source_ref": "x"}]*2},
    {"review_evidence_refs": ["same", "same"]}, {"artifact_ref": "\t\n "}, {"external_revision": "bad\x7f"},
    {"facts": [{"id": "one", "text": "bad\rtext", "source_ref": "x"}]}, {"executable": "ignored?"},
    {"facts": [{"id": f"f{n}", "text": "x"*2000, "source_ref": "x"} for n in range(20)]},
])
def test_unbounded_or_ambiguous_source_is_rejected(change):
    with pytest.raises(ValidationError):
        SourcePayload.model_validate({**payload(), **change})


@pytest.mark.parametrize("duration", [True, "3600", 29, 2592001])
def test_source_approval_is_bounded(duration):
    with pytest.raises(ValidationError):
        Approve.model_validate({**approval(), "duration_seconds": duration})


def test_fingerprint_preserves_historical_source_and_normalizes_timezone():
    row = source()
    original = service.material(row)
    row.reviewed_at = row.reviewed_at.astimezone(timezone(timedelta(hours=3)))
    row.expires_at = row.expires_at.astimezone(timezone(timedelta(hours=-5)))
    row.revoked_at = row.reviewed_at + timedelta(seconds=1)
    assert service.material(row) == original
    assert service.validated(row) is row
    row.payload = {**row.payload, "external_revision": "changed"}
    with pytest.raises(ControlError) as failed:
        service.validated(row)
    assert failed.value.code == "invalid_business_source"


def test_replay_can_use_new_current_consumer_without_rewriting_reviewer():
    first = Approve.model_validate(approval())
    second = first.model_copy(update={"authorizing_session_id": uuid4()})
    owner = {"user_id": str(uuid4()), "environment_id": "test-source"}
    assert admin.request_material(first, owner) == admin.request_material(second, owner)
    assert admin.request_material(first, owner) != admin.request_material(
        second.model_copy(update={"payload": SourcePayload.model_validate({**payload(), "external_revision": "next"})}), owner)


async def test_is_current_observes_fresh_sql_without_source_or_filesystem_wait(monkeypatch):
    row = source()
    monkeypatch.setattr(service, "execution_fence", AsyncMock(side_effect=AssertionError("No Git wait")))
    monkeypatch.setattr(service, "source_current", lambda: pytest.fail("No filesystem wait"))
    tx = SimpleNamespace(scalar=AsyncMock(side_effect=[True, False]))
    assert await service.is_current(tx, row)
    assert not await service.is_current(tx, row)
    assert tx.scalar.await_count == 2


async def test_current_uses_final_sql_session_clock_even_when_cached_session_is_live(monkeypatch):
    row = source()
    session = SimpleNamespace(id=str(uuid4()), user_id=row.user_id, revoked_at=None,
        expires_at=row.expires_at + timedelta(days=10))
    monkeypatch.setattr(service, "guard", lambda: None)
    monkeypatch.setattr(service, "settings", lambda: SimpleNamespace(environment=row.environment_id))
    monkeypatch.setattr(service, "owned_business", AsyncMock(return_value=(
        SimpleNamespace(id=row.portfolio_id, organization_id=row.organization_id), SimpleNamespace(id=row.grant_id),
        SimpleNamespace(id=row.business_id, site_id=row.site_id, canonical_host=row.canonical_host))))
    tx = SimpleNamespace(scalar=AsyncMock(return_value=row),
        execute=AsyncMock(return_value=SimpleNamespace(one=lambda: (False, True))))
    with pytest.raises(ControlError) as failed:
        await service.current(tx, session, row, writing=True)
    assert failed.value.status == 401


async def test_transaction_fences_data_after_final_execution_wait(monkeypatch):
    row, events = source(), []

    async def execution(expected=None):
        events.append(("execution", expected))
        return "b"*40

    async def current(tx, session, value, writing=False):
        events.append(("data", writing))
        return value

    monkeypatch.setattr(service, "execution_fence", execution)
    monkeypatch.setattr(service, "current", current)
    monkeypatch.setattr(service, "schema_ready", AsyncMock(return_value=True))
    monkeypatch.setattr(service, "owned_business", AsyncMock())
    monkeypatch.setattr(service, "lifetime", AsyncMock())
    monkeypatch.setattr(service, "settings", lambda: SimpleNamespace(environment=row.environment_id))
    tx = SimpleNamespace(scalar=AsyncMock(return_value=row))
    async with service.transaction_authority(tx, SimpleNamespace(user_id=row.user_id), row.business_id,
            row.id, writing=True) as result:
        assert result.source_revision == "a"*40  # Review provenance may predate today's execution pin.
        events.append(("consumer", None))
    assert events == [("execution", None), ("data", True), ("consumer", None),
        ("execution", "b"*40), ("data", True)]
    service.lifetime.assert_awaited_once_with(tx, row.business_id, exclusive=True)


def test_material_rejects_naive_timestamps_and_receipt_does_not_expose_payload():
    row = source()
    value = admin.receipt(row, action="inspect", replayed=False, current=False)
    assert not {"payload", "authorizing_session_id", "source_revision", "request_fingerprint"} & value.keys()
    assert value["configuration_only"] and not value["model_dispatch_performed"]
    assert value["channel_activation"] == "not_performed"
    row.reviewed_at = row.reviewed_at.replace(tzinfo=None)
    with pytest.raises(ControlError):
        service.material(row)
