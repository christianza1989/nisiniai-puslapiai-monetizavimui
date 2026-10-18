"""Boundary semantics without transport, models, credentials or customer data."""
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from fastapi import FastAPI
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql

from pinet_core.control.routes import authenticated
from pinet_core.mail_view import routes, statistics
from pinet_core.mail_view.statistics_wire import RecordCounts, Window

B = str(uuid4())
START = datetime(2026, 9, 1, tzinfo=UTC)
WINDOW = Window(start=START, end=START+timedelta(days=1))


def test_bounded_window_normalizes_timezones_and_requires_aware_dates():
    value = Window(start="2026-09-01T02:00:00+02:00", end="2026-09-02T02:00:00+02:00")
    assert value == WINDOW
    for start, end in [(START, START), (START, START-timedelta(seconds=1)),
                       (START, START+timedelta(days=31, microseconds=1)),
                       (START.replace(tzinfo=None), START+timedelta(days=1))]:
        with pytest.raises(ValidationError):
            Window(start=start, end=end)
    assert Window(start=START, end=START+timedelta(days=31))


def test_empty_snapshot_has_known_zero_records_but_no_provider_kpis():
    value = statistics.projection(B, WINDOW, []).model_dump(mode="json")
    assert value["source"] == "canonical_mail_messages"
    assert all(group["total"] == 0 for group in value["records"].values())
    assert len(value["provider_metrics"]) == 7
    assert all(metric["status"] == "unavailable" and metric["value"] is None
               for metric in value["provider_metrics"].values())


def test_snapshot_separates_test_provenance_and_does_not_infer_replies_from_inbound():
    value = statistics.projection(B, WINDOW, [
        ("non_synthetic", "outbound_accepted_by_smtp", 3),
        ("synthetic", "outbound_accepted_by_smtp", 100),
        ("unclassified", "inbound_received", 2),
    ])
    assert value.records.non_synthetic.total == 3 and value.records.synthetic.total == 100
    assert value.records.unclassified.total == 2
    assert value.provider_metrics.human_replies.value is None
    assert value.provider_metrics.reply_rate.value is None
    with pytest.raises(ValidationError):
        RecordCounts(total=1)  # A total cannot disagree with its component counts.


@pytest.mark.parametrize("row", [
    ("invented", "outbound_draft", 1), ("synthetic", "invented", 1),
    ("synthetic", "total", 1), ("synthetic", "outbound_draft", -1),
    ("synthetic", "outbound_draft", True),
])
def test_malformed_aggregate_is_not_silently_accepted(row):
    with pytest.raises(ValueError):
        statistics.projection(B, WINDOW, [row])


def test_statement_selects_only_fixed_aggregates_and_half_open_scope():
    compiled = statistics.statement(B, WINDOW).compile(dialect=postgresql.dialect())
    sql = str(compiled)
    assert "mail_messages.created_at >=" in sql and "mail_messages.created_at <" in sql
    assert "mail_messages.business_id =" in sql and "mail_messages.environment_id =" in sql
    assert "jsonb_typeof" in sql and "GROUP BY" in sql and "count(*)" in sql
    assert all(key not in sql for key in ("subject", "sender", "recipient", "body"))


async def nothing():
    return None


@pytest.mark.asyncio
async def test_route_rejects_unbounded_ambiguous_inputs_before_data_read(monkeypatch):
    app = FastAPI()
    app.include_router(routes.router)
    app.dependency_overrides[authenticated] = lambda: (None, SimpleNamespace(user_id="owner"))
    monkeypatch.setattr("pinet_core.control.bridge.transport_guard", lambda request: nothing())
    async def must_not_read(*args):
        pytest.fail("invalid request reached mail source")
    monkeypatch.setattr(statistics, "read", must_not_read)
    base = f"/operator/v2/businesses/{B}/mail-statistics"
    good = {"start": START.isoformat(), "end": (START+timedelta(days=1)).isoformat()}
    params = [{}, {"start": good["start"]}, {**good, "case_id": B},
              {**good, "start": "2026-09-01T00:00:00"},
              {**good, "start": "1756684800"}, {**good, "start": "x"*65},
              {**good, "end": good["start"]}, {**good, "end": "2026-11-01T00:00:00Z"},
              [("start", good["start"]), ("start", good["start"]), ("end", good["end"])]]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1") as client:
        for query in params:
            response = await client.get(base, params=query)
            assert response.status_code == 400, response.text
        assert (await client.request("GET", base, params=good, content="x")).status_code == 400
        assert (await client.post(base, params=good)).status_code == 405
