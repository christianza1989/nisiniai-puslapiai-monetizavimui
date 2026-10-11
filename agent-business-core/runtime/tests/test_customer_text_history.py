"""Actual restricted-PG retained-history discovery; no model or live channel."""
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import logged, verified
from test_customer_text import (  # noqa: F401 - canonical shared fixture chain
    assert_no_channels,
    begin,
    creation,
    customers,
    prepared,
    profile,
    public_source,
    registration,
    stored,
)
from test_customer_text import text_customer as text_customer_fixture

from pinet_core.api import app
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_profile.models import Admission
from pinet_core.customer_text import adapter, service
from pinet_core.customer_text.wire import Start
from pinet_core.db import db
from pinet_core.models import Conversation, KnowledgeState, utcnow
from pinet_core.service import add_event

text_customer = text_customer_fixture


async def start_again(c):
    return await service.start(c["token"], c["request"]["creation_id"], Start(request_id=uuid4(),
        admission_id=c["admitted"]["admission_id"], notice_version="customer-text.local.v1", consent=True))


async def add_history(c, conversation_id, count):
    async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
        row = await tx.scalar(select(Conversation).where(Conversation.id == conversation_id).with_for_update())
        for index in range(count):
            await add_event(tx, row, "synthetic-history:" + str(index), "client_transcript", {"text": "Synthetic history " + str(index)})


def history_path(c, conversation_id=None):
    base = f"/customer/v2/creations/{c['request']['creation_id']}/text-sessions"
    return base if conversation_id is None else base + "/" + conversation_id + "/events"


async def test_server_discovers_original_history_after_fresh_login_with_runner_off(text_customer, monkeypatch):
    c = text_customer
    original = await begin(c)
    auth = await logged(c, c["account"])
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    monkeypatch.setattr(adapter, "runner_ready", lambda: False)

    async def forbidden_provider(*args, **kwargs):
        raise AssertionError("History discovery must not dispatch a model")

    monkeypatch.setattr(adapter, "run", forbidden_provider)
    base = f"/customer/v2/creations/{c['request']['creation_id']}/text-sessions"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        response = await client.get(base, headers=auth)
        assert response.status_code == 200, response.text
        data = response.json()["data"]
        assert [item["conversation_id"] for item in data["sessions"]] == [original["conversation_id"]]
        assert data["creation_id"] == c["request"]["creation_id"]
        assert data["has_more"] is False and data.get("next_cursor") is None
        assert response.headers["Cache-Control"] == "private, no-store"
    await assert_no_channels(c)


async def test_list_pages_equal_timestamp_sessions_without_content_or_mutation(text_customer, monkeypatch):
    c = text_customer
    created = [await start_again(c) for _ in range(5)]
    ids = [row["conversation_id"] for row in created]
    same_time = utcnow() - timedelta(seconds=20)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Conversation).where(Conversation.id.in_(ids)).values(created_at=same_time))
    before = [(await stored(c, cid))[0].payload for cid in ids]
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    auth = await logged(c, c["account"])
    seen, cursor = [], None
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        for expected_more in (True, True, False):
            response = await client.get(history_path(c), headers=auth,
                params={"limit": 2, **({"cursor": cursor} if cursor else {})})
            assert response.status_code == 200, response.text
            data = response.json()["data"]
            assert data["has_more"] is expected_more
            for summary in data["sessions"]:
                assert set(summary) == {"conversation_id", "created_at", "state", "need_revision"}
                assert summary["state"] == "created" and summary["need_revision"] == 0
                seen.append(summary["conversation_id"])
            cursor = data.get("next_cursor")
            assert bool(cursor) is expected_more
    assert seen == sorted(ids, reverse=True)
    assert len(seen) == len(set(seen)) == 5
    assert before == [(await stored(c, cid))[0].payload for cid in ids]
    await assert_no_channels(c)


async def test_earlier_event_pages_traverse_every_original_event_after_expiry(text_customer, monkeypatch):
    c = text_customer
    started = await begin(c)
    cid = started["conversation_id"]
    await add_history(c, cid, 205)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Conversation).where(Conversation.id == cid).values(expires_at=utcnow() - timedelta(seconds=1)))
        await tx.execute(update(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"])
            .values(refreshed_at=utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)))
    before, original = await stored(c, cid)
    snapshot = before.payload, before.state, before.owner, before.epoch, before.need_revision, before.expires_at
    original_ids = {event.id for event in original}
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    auth = await logged(c, c["account"])
    combined, cursor = [], None
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        latest = await client.get(history_path(c, cid).removesuffix("/events"), headers=auth)
        assert latest.status_code == 200 and latest.json()["data"]["history_truncated"] is True
        assert len(latest.json()["data"]["events"]) == 100
        for _ in range(6):
            response = await client.get(history_path(c, cid), headers=auth,
                params={"limit": 41, **({"cursor": cursor} if cursor else {})})
            assert response.status_code == 200, response.text
            data = response.json()["data"]
            seq = [event["sequence"] for event in data["events"]]
            assert seq == sorted(seq) and len(seq) <= 41
            combined = data["events"] + combined
            cursor = data.get("next_cursor")
            assert bool(cursor) is data["has_more"]
            if not cursor:
                break
        else:
            pytest.fail("History pagination did not terminate")
    assert [event["sequence"] for event in combined] == list(range(1, 207))
    assert {event["event_id"] for event in combined} == original_ids and len(combined) == len(original_ids)
    after, retained = await stored(c, cid)
    assert snapshot == (after.payload, after.state, after.owner, after.epoch, after.need_revision, after.expires_at)
    assert original_ids == {event.id for event in retained}
    await assert_no_channels(c)


@pytest.mark.parametrize("change", ["grant", "membership", "session", "account"])
async def test_discovery_and_event_pages_deny_revoked_current_owner(text_customer, monkeypatch, change):
    c = text_customer
    started = await begin(c)
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if change == "grant":
            await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == c["saved"]["business_id"]).values(enabled=False))
        elif change == "membership":
            await tx.execute(update(Membership).where(Membership.environment_id == c["environment"]).values(enabled=False))
        elif change == "session":
            await tx.execute(update(Session).where(Session.id == c["request"]["authorizing_session_id"]).values(revoked_at=utcnow()))
        else:
            user_id = (await tx.get(Session, c["request"]["authorizing_session_id"])).user_id
            await tx.execute(update(User).where(User.id == user_id).values(enabled=False))
    before, original = await stored(c, started["conversation_id"])
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        for path in (history_path(c), history_path(c, started["conversation_id"])):
            response = await client.get(path, headers=c["auth"])
            assert response.status_code in {401, 404}, response.text
            assert response.json()["code"] not in {"customer_text_unavailable", "control_unavailable"}
    after, retained = await stored(c, started["conversation_id"])
    assert before.payload == after.payload and {event.id for event in original} == {event.id for event in retained}
    await assert_no_channels(c)


@pytest.mark.parametrize("change", ["module", "smtp", "voice", "source"])
async def test_paging_keeps_local_module_channel_and_source_guards(text_customer, monkeypatch, change):
    c = text_customer
    started = await begin(c)
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    if change == "source":
        monkeypatch.setattr(adapter, "source_current", lambda: False)
    else:
        monkeypatch.setattr(settings(), {"module": "customer_text_enabled", "smtp": "smtp_enabled", "voice": "voice_enabled"}[change], change != "module")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        for path in (history_path(c), history_path(c, started["conversation_id"])):
            response = await client.get(path, headers=c["auth"])
            assert response.status_code == (503 if change == "source" else 403), response.text
            assert response.json()["code"] == ("source_unavailable" if change == "source" else "customer_text_unavailable")
    await assert_no_channels(c)


async def test_empty_and_invalid_scoped_cursors_never_expose_unowned_pages(text_customer):
    c = text_customer
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        empty = await client.get(history_path(c), headers=c["auth"])
        assert empty.status_code == 200 and empty.json()["data"]["sessions"] == []
        one, two = await begin(c), await start_again(c)
        await add_history(c, one["conversation_id"], 2)
        listing = await client.get(history_path(c), headers=c["auth"], params={"limit": 1})
        list_cursor = listing.json()["data"]["next_cursor"]
        page = await client.get(history_path(c, one["conversation_id"]), headers=c["auth"], params={"limit": 1})
        event_cursor = page.json()["data"]["next_cursor"]
        probes = [(history_path(c), {"cursor": "invalid"}),
            (history_path(c), {"cursor": event_cursor}),
            (history_path(c, one["conversation_id"]), {"cursor": list_cursor}),
            (history_path(c, two["conversation_id"]), {"cursor": event_cursor}),
            (history_path(c).replace(c["request"]["creation_id"], str(uuid4())), {"cursor": list_cursor}),
            (history_path(c), {"limit": 0}), (history_path(c), {"limit": 51}),
            (history_path(c, one["conversation_id"]), {"limit": 101}),
            (history_path(c), {"cursor": "x" * 2049})]
        for path, params in probes:
            response = await client.get(path, headers=c["auth"], params=params)
            assert response.status_code in {400, 409}, response.text
            assert response.json()["code"] in {"invalid_request", "invalid_cursor", "snapshot_expired"}
        assert (await client.get(history_path(c, str(uuid4())), headers=c["auth"])).status_code == 404
        _, foreign_auth, _ = await verified(c)
        for path in (history_path(c), history_path(c, one["conversation_id"])):
            denied = await client.get(path, headers=foreign_auth)
            assert denied.status_code == 404, denied.text
        assert (await client.get(history_path(c), headers=foreign_auth, params={"cursor": list_cursor})).status_code == 400
    await assert_no_channels(c)


@pytest.mark.parametrize("terminal", ["profile", "registration"])
async def test_terminal_execution_identity_does_not_hide_retained_pages(text_customer, monkeypatch, terminal):
    c = text_customer
    started = await begin(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        model, row_id = (Admission, c["admitted"]["admission_id"]) if terminal == "profile" else (Registration, c["saved"]["registration_id"])
        await tx.execute(update(model).where(model.id == row_id).values(revoked_at=utcnow()))
    monkeypatch.setattr(settings(), "customer_text_runner_enabled", False)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        listing = await client.get(history_path(c), headers=c["auth"])
        assert listing.status_code == 200, listing.text
        assert [item["conversation_id"] for item in listing.json()["data"]["sessions"]] == [started["conversation_id"]]
        page = await client.get(history_path(c, started["conversation_id"]), headers=c["auth"])
        assert page.status_code == 200, page.text
        assert len(page.json()["data"]["events"]) == 1
    await assert_no_channels(c)
