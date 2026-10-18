"""Mail-record aggregates on isolated restricted PostgreSQL, never a provider."""
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_control_portfolio import login, pilot  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant
from pinet_core.db import db
from pinet_core.models import Case, MailMessage

START = datetime(2026, 9, 1, tzinfo=UTC)
END = START + timedelta(days=1)
PARAMS = {"start": START.isoformat(), "end": END.isoformat()}


@pytest.fixture
async def statistics_pilot(pilot):  # noqa: F811
    p = pilot
    business_id = p["receipts"][0]["business_ids"][0]
    env, case_id = settings().environment, str(uuid4())
    # Plaintext bodies/identities are canaries; only exact boolean provenance counts.
    entries = [
        ("outbound", "accepted_by_smtp", False, 0),
        ("outbound", "accepted_by_smtp", False, 1),
        ("outbound", "draft", False, 2),
        ("outbound", "rejected", False, 3),
        ("outbound", "delivery_unknown", False, 4),
        ("outbound", "new_provider_state", False, 5),
        ("inbound", "received", False, 6),
        ("inbound", "captured", False, 7),
        ("inbound", "auto_reply_not_classified", False, 8),
        ("invalid_direction", "received", False, 9),
        ("outbound", "accepted_by_smtp", True, 10),
        ("inbound", "received", True, 11),
        ("outbound", "accepted_by_smtp", "false", 12),
        ("inbound", "received", 0, 13),
        ("outbound", "draft", "missing", 14),
        ("inbound", "received", None, 15),
        ("inbound", "received", [False], 16),
        ("inbound", "received", {"value": False}, 17),
        ("outbound", "accepted_by_smtp", False, -1),  # Before start excluded.
        ("inbound", "received", False, 86400),  # Exact end excluded.
    ]
    async with db.transaction(business_id, env) as tx:
        tx.add(Case(id=case_id, business_id=business_id, environment_id=env, payload={"test": True}))
        await tx.flush()
        rows = []
        for direction, state, synthetic, seconds in entries:
            payload = {"sender": "statistics-canary@example.test", "recipient": "canary@example.test",
                       "subject": "PRIVATE_STATISTICS_CANARY", "body": "PRIVATE_BODY_CANARY"}
            if synthetic != "missing":
                payload["synthetic"] = synthetic
            row = MailMessage(id=str(uuid4()), business_id=business_id, environment_id=env,
                case_id=case_id, message_id=f"<{uuid4()}@example.test>", direction=direction,
                state=state, created_at=START+timedelta(seconds=seconds), payload=payload)
            tx.add(row)
            rows.append(row)
    other_env, other_case = env + "-other", str(uuid4())
    async with db.transaction(business_id, other_env) as tx:
        tx.add(Case(id=other_case, business_id=business_id, environment_id=other_env, payload={"test": True}))
        await tx.flush()
        tx.add(MailMessage(id=str(uuid4()), business_id=business_id, environment_id=other_env,
            case_id=other_case, message_id=f"<{uuid4()}@example.test>", direction="outbound",
            state="accepted_by_smtp", created_at=START, payload={"synthetic": False}))
    try:
        yield {**p, "business_id": business_id, "case_id": case_id, "rows": rows,
               "path": f"/operator/v2/businesses/{business_id}/mail-statistics"}
    finally:
        async with AsyncSession(p["admin"]) as tx, tx.begin():
            await tx.execute(delete(Case).where(Case.id == case_id, Case.business_id == business_id,
                                                Case.environment_id == env))
            await tx.execute(delete(Case).where(Case.id == other_case, Case.business_id == business_id,
                                                Case.environment_id == other_env))


async def test_current_records_are_windowed_and_provenance_separated(statistics_pilot):
    p = statistics_pilot
    headers = await login(p)
    before = [(row.id, row.state, deepcopy(row.payload)) for row in p["rows"]]
    response = await p["client"].get(p["path"], params=PARAMS, headers=headers)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "private, no-store"
    assert response.json()["contract_version"] == "mail-statistics.v1"
    data = response.json()["data"]
    assert data["business_id"] == p["business_id"]
    assert data["time_basis"] == "mail_message_created_at"
    assert data["measure"] == "current_record_state_snapshot"
    assert data["records"]["non_synthetic"] == {
        "total": 10, "outbound_draft": 1, "outbound_accepted_by_smtp": 2,
        "outbound_sending": 0, "outbound_accepted_by_gmail": 0,
        "outbound_rejected": 1, "outbound_delivery_unknown": 1, "outbound_other": 1,
        "inbound_received": 1, "inbound_captured": 1, "inbound_other": 1, "other_direction": 1}
    assert data["records"]["synthetic"]["total"] == 2
    assert data["records"]["unclassified"]["total"] == 6
    assert all(metric["value"] is None and metric["status"] == "unavailable"
               for metric in data["provider_metrics"].values())
    for canary in ("PRIVATE_", "@example.test", p["case_id"], p["rows"][0].id, "new_provider_state"):
        assert canary not in response.text
    await db.engine.dispose()  # New pool reads the same canonical rows, not a process cache.
    again = await p["client"].get(p["path"], params=PARAMS, headers=headers)
    assert again.status_code == 200 and again.json()["data"] == data
    async with db.transaction(p["business_id"], settings().environment) as tx:
        actual = {row.id: row for row in await tx.scalars(select(MailMessage).where(MailMessage.case_id == p["case_id"]))}
        assert [(key, actual[key].state, actual[key].payload) for key, _, _ in before] == before


async def test_current_owner_grant_and_empty_scope(statistics_pilot):
    p = statistics_pilot
    owner, foreign = await login(p), await login(p, 1)
    assert (await p["client"].get(p["path"], params=PARAMS)).status_code == 401
    assert (await p["client"].get(p["path"], params=PARAMS, headers=foreign)).status_code == 404
    empty_id = p["receipts"][0]["business_ids"][1]
    empty = await p["client"].get(f"/operator/v2/businesses/{empty_id}/mail-statistics", params=PARAMS, headers=owner)
    assert empty.status_code == 200, empty.text
    assert all(group["total"] == 0 for group in empty.json()["data"]["records"].values())
    assert empty.json()["data"]["provider_metrics"]["opened"]["value"] is None
    async with AsyncSession(p["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == p["business_id"],
            BusinessGrant.environment_id == settings().environment).values(enabled=False))
    assert (await p["client"].get(p["path"], params=PARAMS, headers=owner)).status_code == 404


async def test_gmail_states_are_named_boolean_scoped_current_snapshots(statistics_pilot):
    p = statistics_pilot
    added = []
    async with db.transaction(p["business_id"], settings().environment) as tx:
        entries = [("accepted_by_gmail", False, 30), ("accepted_by_gmail", False, 31),
                   ("sending", False, 32), ("accepted_by_gmail", True, 33), ("sending", True, 34),
                   ("accepted_by_gmail", "false", 35), ("sending", "false", 36),
                   ("accepted_by_gmail", False, -1), ("sending", False, 86400)]
        for state, synthetic, seconds in entries:
            row = MailMessage(id=str(uuid4()), business_id=p["business_id"], environment_id=settings().environment,
                case_id=p["case_id"], message_id=f"<{uuid4()}@example.test>", direction="outbound", state=state,
                created_at=START+timedelta(seconds=seconds), payload={"synthetic": synthetic,
                    "subject": "PRIVATE_GMAIL_STATISTICS_CANARY", "body": "PRIVATE_GMAIL_BODY_CANARY",
                    "recipient": "private-gmail-statistics@example.test"})
            tx.add(row)
            added.append(row)
    headers = await login(p)
    response = await p["client"].get(p["path"], params=PARAMS, headers=headers)
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    # Existing unknown state remains one; Gmail accepted/sending must not join it.
    assert data["records"]["non_synthetic"]["outbound_other"] == 1
    assert data["records"]["non_synthetic"]["outbound_accepted_by_gmail"] == 2
    assert data["records"]["non_synthetic"]["outbound_sending"] == 1
    assert data["records"]["non_synthetic"]["total"] == 13
    for group, total in (("synthetic", 4), ("unclassified", 8)):
        assert data["records"][group]["outbound_accepted_by_gmail"] == 1
        assert data["records"][group]["outbound_sending"] == 1
        assert data["records"][group]["total"] == total
    assert all(metric["value"] is None and metric["status"] == "unavailable"
               for metric in data["provider_metrics"].values())
    assert all(marker not in response.text for marker in ("PRIVATE_", "@example.test", p["case_id"], added[0].id))
    async with db.transaction(p["business_id"], settings().environment) as tx:
        await tx.execute(update(MailMessage).where(MailMessage.id == added[2].id).values(state="accepted_by_gmail"))
    changed = await p["client"].get(p["path"], params=PARAMS, headers=headers)
    assert changed.status_code == 200, changed.text
    current = changed.json()["data"]
    assert current["records"]["non_synthetic"]["outbound_sending"] == 0
    assert current["records"]["non_synthetic"]["outbound_accepted_by_gmail"] == 3
    assert current["records"]["non_synthetic"]["total"] == 13
    assert current["window"] == data["window"] and current["time_basis"] == "mail_message_created_at"
    assert current["measure"] == "current_record_state_snapshot"
