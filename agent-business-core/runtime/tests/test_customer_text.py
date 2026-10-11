"""Restricted real PG/customer/V2 authority, with frozen zero-provider text adapters."""
import asyncio
import hashlib
import json
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_profile import (  # noqa: F401 - canonical shared fixture chain
    admit,
    creation,
    customers,
    prepared,
    public_source,
    registration,
    revoke,
)
from test_customer_profile import profile as profile_fixture
from test_customer_public import logged, verified

from pinet_core import knowledge, policy
from pinet_core.api import app
from pinet_core.config import settings
from pinet_core.contracts import KnowledgeRevocation, Policy, PolicyUpdate
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.control.routes import ControlError
from pinet_core.creation_registration.models import Registration
from pinet_core.customer_text import adapter, service
from pinet_core.customer_text.wire import Start, Turn
from pinet_core.db import db
from pinet_core.models import Case, Contact, Conversation, Event, Job, KnowledgeState, Outbox, utcnow
from pinet_core.tasks.codex_transport import RunnerError

profile = profile_fixture


@pytest.fixture
async def text_customer(profile, monkeypatch):
    cfg = settings()
    for key, value in {"customer_text_enabled": True, "customer_text_runner_enabled": True,
            "chat_enabled": False, "chat_runner_enabled": False, "chat_runner_seconds": 60,
            "smtp_enabled": False, "voice_enabled": False}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(adapter, "source_current", lambda: True)
    monkeypatch.setattr(adapter, "runner_ready", lambda: True)
    c = profile
    request, saved, admission_request, account, auth, _ = await prepared(c)
    admitted = await admit(c, admission_request)
    token = auth["Authorization"][7:]
    value = Start(request_id=uuid4(), admission_id=admitted["admission_id"],
        notice_version="customer-text.local.v1", consent=True)
    try:
        yield {**c, "request": request, "saved": saved, "admitted": admitted,
            "auth": auth, "token": token, "start": value, "account": account,
            "admission_request": admission_request}
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(delete(Case).where(Case.environment_id == c["environment"]))


def turn_value(revision=0, message="I need a synthetic result", request_id=None):
    return Turn(request_id=request_id or uuid4(), base_need_revision=revision, message=message)


async def begin(c):
    return await service.start(c["token"], c["request"]["creation_id"], c["start"])


async def stored(c, conversation_id):
    async with AsyncSession(c["admin"]) as tx:
        row = await tx.get(Conversation, conversation_id)
        events = list(await tx.scalars(select(Event).where(Event.conversation_id == conversation_id)))
        return row, events


async def assert_no_channels(c):
    async with AsyncSession(c["admin"]) as tx:
        for model in (Job, Contact, Outbox):
            assert not list(await tx.scalars(select(model).where(model.environment_id == c["environment"])))


async def test_legacy_worker_cannot_read_or_mutate_customer_text(text_customer):
    c = text_customer
    row = await begin(c)
    dispatch = await service.prepare(c["token"], c["request"]["creation_id"], row["conversation_id"], turn_value())
    before, events = await stored(c, row["conversation_id"])
    snapshot = (before.payload, before.state, before.owner, before.epoch, before.need_revision,
        [(e.id, e.payload) for e in events])
    prefix = f"/internal/sites/{c['saved']['site_id']}/sessions/{row['conversation_id']}"
    headers = {"Authorization": f"Bearer {settings().worker_secret}"}
    probes = [("POST", "/events", {"epoch": dispatch.epoch, "event_key": "legacy-bypass",
        "kind": "client_transcript", "text": "Must never be accepted"}),
        ("POST", "/claim", {"owner": "legacy-worker"}),
        ("POST", "/tools", {"epoch": dispatch.epoch, "call_id": "legacy-tool",
            "name": "ui.open_contact_form", "arguments": {}}),
        ("POST", "/end", {"epoch": dispatch.epoch}), ("GET", "", None)]
    probes.append(("POST", "/usage", {"epoch": dispatch.epoch, "report_id": str(uuid4()),
        "total_microusd": 0}))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        for method, suffix, body in probes:
            response = await client.request(method, prefix + suffix, headers=headers, json=body)
            assert response.status_code == 409, (suffix, response.status_code)
            assert response.json()["detail"] == "customer_text_transport_required"
    after, events = await stored(c, row["conversation_id"])
    assert snapshot == (after.payload, after.state, after.owner, after.epoch, after.need_revision,
        [(e.id, e.payload) for e in events])
    await assert_no_channels(c)


async def test_actual_full_http_start_turn_correction_replay_restart_and_no_channels(text_customer, monkeypatch):
    c = text_customer
    calls = []

    async def run(context, event, revision, authorized):
        assert await authorized()
        # This transaction can acquire the conversation lock while provider is running.
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            await tx.scalar(select(Conversation).with_for_update(nowait=True))
        calls.append(context)
        typed = adapter.schema(event, revision).model_validate({"reply": "Synthetic supported next step",
            "calls": [{"name": "need.patch", "arguments": {"base_revision": revision,
                "evidence_event_id": event, "fields": [{"field": "goal", "value": context["client_message"]}]}}]})
        return typed, {"input_tokens": 33, "output_tokens": 12}

    monkeypatch.setattr(adapter, "run", run)
    base = "/customer/v2/creations/" + c["request"]["creation_id"] + "/text-sessions"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        assert (await client.post(base, json=c["start"].model_dump(mode="json"))).status_code == 401
        async with AsyncSession(c["admin"]) as tx:
            source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"]))
            before = (source.refreshed_at, source.payload)
        capability = await client.get(base.removesuffix("text-sessions") + "text-capability", headers=c["auth"])
        assert capability.status_code == 200, capability.text
        assert capability.json()["data"]["can_start_text_session"] is True
        async with AsyncSession(c["admin"]) as tx:
            source = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"]))
            assert before == (source.refreshed_at, source.payload)
            assert not list(await tx.scalars(select(Conversation).where(Conversation.environment_id == c["environment"])))
        response = await client.post(base, headers=c["auth"], json=c["start"].model_dump(mode="json"))
        assert response.status_code == 200, response.text
        first = response.json()["data"]
        assert response.json()["contract_version"] == "customer-text.v1"
        assert (await begin(c))["conversation_id"] == first["conversation_id"]
        path = base + "/" + first["conversation_id"]
        escaped = json.dumps(turn_value(message="😀" * 4000).model_dump(mode="json"), ensure_ascii=True)
        assert (await client.post(path + "/turns", content=escaped,
            headers={"Content-Type": "application/json"})).status_code == 401
        value = turn_value()
        one = await client.post(path + "/turns", headers=c["auth"], json=value.model_dump(mode="json"))
        assert one.status_code == 200, one.text
        assert one.json()["data"]["need_revision"] == 1
        assert (await client.post(path + "/turns", headers=c["auth"], json=value.model_dump(mode="json"))).json()["data"]["turn"] == one.json()["data"]["turn"]
        conflict = turn_value(message="Different content", request_id=value.request_id)
        assert (await client.post(path + "/turns", headers=c["auth"], json=conflict.model_dump(mode="json"))).status_code == 409
        correction = turn_value(1, "Correction: I only need draft email evaluation")
        two = await client.post(path + "/turns", headers=c["auth"], json=correction.model_dump(mode="json"))
        assert two.status_code == 200, two.text
        assert two.json()["data"]["need_revision"] == 2
        assert two.json()["data"]["need"]["goal"]["value"] == correction.message
        assert (await client.post(path + "/turns", headers=c["auth"],
            json=turn_value(0).model_dump(mode="json"))).status_code == 409
        assert len(calls) == 2
        assert "historical_source" not in calls[0] and calls[0]["knowledge"]["commercial_tools"] == "disabled"
        await db.engine.dispose()
        assert (await client.get(path, headers=c["auth"])).json()["data"]["need_revision"] == 2
        assert (await client.post(path + "/end", headers=c["auth"])).json()["data"]["state"] == "finalized"
        assert (await client.post(path + "/turns", headers=c["auth"], json=turn_value(2).model_dump(mode="json"))).status_code == 409
    await assert_no_channels(c)


@pytest.mark.parametrize("change", ["login", "knowledge_expiry", "conversation_expiry", "readmit",
    "profile_revoke", "registration_revoke", "execution_source", "instructions"])
async def test_current_owner_history_end_survive_execution_change_without_resuming(text_customer, monkeypatch, change):
    c = text_customer
    calls = []

    async def run(context, event, revision, authorized):
        assert await authorized()
        calls.append(context)
        return adapter.schema(event, revision).model_validate({"reply": "Synthetic persisted reply", "calls": []}), {"input_tokens": 11}

    monkeypatch.setattr(adapter, "run", run)
    first = await begin(c)
    cid, creation_id = first["conversation_id"], c["request"]["creation_id"]
    await service.turn(c["token"], creation_id, cid, turn_value())
    original, _ = await stored(c, cid)
    frozen = original.payload["customer_text_binding"]
    auth = c["auth"]
    if change == "login":
        auth = await logged(c, c["account"])
    elif change == "readmit":
        reference = await public_source(c, c["saved"])
        fresh = await admit(c, {**c["admission_request"], "knowledge_ref": reference})
        assert fresh["admission_id"] != c["admitted"]["admission_id"]
    elif change == "profile_revoke":
        await revoke(c, c["admitted"])
    elif change in {"knowledge_expiry", "conversation_expiry", "registration_revoke"}:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            if change == "knowledge_expiry":
                await tx.execute(update(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"])
                    .values(refreshed_at=utcnow() - timedelta(seconds=settings().knowledge_ttl_seconds + 1)))
            elif change == "conversation_expiry":
                await tx.execute(update(Conversation).where(Conversation.id == cid).values(expires_at=utcnow() - timedelta(seconds=1)))
            else:
                await tx.execute(update(Registration).where(Registration.id == c["saved"]["registration_id"]).values(revoked_at=utcnow()))
    elif change == "execution_source":
        monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    else:
        monkeypatch.setattr(service.instructions, "manifest", lambda: (_ for _ in ()).throw(ValueError("Changed instructions")))
    async with AsyncSession(c["admin"]) as tx:
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"]))
        source_before = state.refreshed_at, state.payload
    path = f"/customer/v2/creations/{creation_id}/text-sessions/{cid}"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        history = await client.get(path, headers=auth)
        assert history.status_code == 200, history.text
        assert history.json()["data"]["state"] == "created"
        assert any(e["data"].get("reply") == "Synthetic persisted reply" for e in history.json()["data"]["events"])
        # Historical access must not convert this stale/original-session binding into execution authority.
        assert (await client.post(path + "/turns", headers=auth, json=turn_value().model_dump(mode="json"))).status_code in {404, 409}
        ended = await client.post(path + "/end", headers=auth)
        assert ended.status_code == 200, ended.text
        assert ended.json()["data"]["state"] == "finalized"
        assert (await client.get(path, headers=auth)).json()["data"]["state"] == "finalized"
    after, events = await stored(c, cid)
    assert after.payload["customer_text_binding"] == frozen and after.owner is None
    assert sum(e.kind == "provider_attempt" for e in events) == sum(e.kind == "provider_usage" for e in events) == len(calls) == 1
    async with AsyncSession(c["admin"]) as tx:
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.business_id == c["saved"]["business_id"]))
        assert source_before == (state.refreshed_at, state.payload)
    await assert_no_channels(c)


@pytest.mark.parametrize("change", ["foreign_owner", "unknown_conversation", "grant", "membership", "session", "account"])
async def test_historical_read_and_end_still_deny_foreign_or_revoked_owner(text_customer, change):
    c = text_customer
    first = await begin(c)
    cid, auth = first["conversation_id"], c["auth"]
    if change == "foreign_owner":
        _, auth, _ = await verified(c)
    elif change == "unknown_conversation":
        cid = str(uuid4())
    else:
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
    before, before_events = await stored(c, first["conversation_id"])
    snapshot = before.payload, before.state, before.epoch, [(e.id, e.payload) for e in before_events]
    path = f"/customer/v2/creations/{c['request']['creation_id']}/text-sessions/{cid}"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        for method, suffix in (("GET", ""), ("POST", "/end")):
            reply = await client.request(method, path + suffix, headers=auth)
            assert reply.status_code in {401, 403, 404}, reply.text
            assert reply.json()["code"] != "control_unavailable", reply.text
    after, events = await stored(c, first["conversation_id"])
    assert snapshot == (after.payload, after.state, after.epoch, [(e.id, e.payload) for e in events])
    await assert_no_channels(c)


@pytest.mark.parametrize("change", ["session", "grant", "membership", "profile", "knowledge", "expiry", "cancel",
    "policy", "source", "instructions", "need_revision", "lease"])
async def test_inflight_authority_loss_denies_reply_and_preserves_known_usage(text_customer, monkeypatch, change):
    c = text_customer
    row = await begin(c)
    entered, release = asyncio.Event(), asyncio.Event()

    async def run(context, event, revision, authorized):
        assert await authorized()
        entered.set()
        await release.wait()
        return adapter.schema(event, revision).model_validate({"reply": "Must never be published", "calls": []}), {
            "input_tokens": 91, "output_tokens": 4}

    monkeypatch.setattr(adapter, "run", run)
    task = asyncio.create_task(service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], turn_value()))
    await asyncio.wait_for(entered.wait(), 10)
    if change in {"session", "grant", "membership"}:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            if change == "session":
                await tx.execute(update(Session).where(Session.id == c["request"]["authorizing_session_id"]).values(revoked_at=utcnow()))
            elif change == "grant":
                await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == c["saved"]["business_id"]).values(enabled=False))
            else:
                await tx.execute(update(Membership).where(Membership.environment_id == c["environment"]).values(enabled=False))
    elif change == "profile":
        await revoke(c, c["admitted"])
    elif change == "source":
        monkeypatch.setattr(adapter, "source_current", lambda: False)
    elif change == "instructions":
        monkeypatch.setattr(service.instructions, "HASHES", {"conversation": "0" * 64, "quality": "0" * 64})
    elif change in {"need_revision", "lease"}:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            mutation = ({"need_revision": 1} if change == "need_revision" else
                {"lease_until": utcnow() - timedelta(seconds=1)})
            await tx.execute(update(Conversation).where(Conversation.id == row["conversation_id"]).values(**mutation))
    elif change == "expiry":
        monkeypatch.setattr(knowledge, "utcnow", lambda: utcnow() + timedelta(seconds=181))
    elif change == "knowledge":
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            await policy.lock(tx, c["saved"]["business_id"], c["environment"], exclusive=True)
            await knowledge.revoke(tx, KnowledgeRevocation(base_revision=1, revision_hashes=["d" * 64], reason="synthetic test"))
    elif change == "policy":
        async with db.transaction(c["saved"]["business_id"], c["environment"]) as tx:
            await policy.lock(tx, c["saved"]["business_id"], c["environment"], exclusive=True)
            await policy.update(tx, c["saved"]["business_id"], c["environment"], PolicyUpdate(
                base_revision=0, policy=Policy(paused=True), reason="synthetic test"))
    else:
        await service.end(c["token"], c["request"]["creation_id"], row["conversation_id"])
    release.set()
    with pytest.raises(ControlError) as denied:
        await asyncio.wait_for(task, 10)
    assert denied.value.code == "text_authorization_changed"
    conversation, values = await stored(c, row["conversation_id"])
    usage = [e for e in values if e.kind == "provider_usage"]
    assert len(usage) == 1 and usage[0].payload["usage"]["tokens"]["input_tokens"] == 91
    assert not any(e.payload.get("reply") for e in values)
    assert conversation.need_revision == (1 if change == "need_revision" else 0)
    await assert_no_channels(c)


async def test_duplicate_need_output_fails_before_settlement_and_replays_without_provider(text_customer, monkeypatch):
    c = text_customer
    row = await begin(c)
    count = 0

    async def duplicate(context, event, revision, authorized):
        nonlocal count
        count += 1
        value = {"reply": "Must not be shown", "calls": [{"name": "need.patch", "arguments": {
            "base_revision": revision, "evidence_event_id": event,
            "fields": [{"field": "goal", "value": "first"}, {"field": "goal", "value": "second"}]}}]}
        return adapter.normalize(value, adapter.schema(event, revision), {"input_tokens": 19}), {}

    monkeypatch.setattr(adapter, "run", duplicate)
    value = turn_value()
    first = await service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], value)
    assert first["turn"]["failure_code"] == "output_invalid" and "reply" not in first["turn"]
    assert (await service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], value))["turn"] == first["turn"]
    conversation, events = await stored(c, row["conversation_id"])
    assert conversation.need_revision == 0 and conversation.owner is None and count == 1
    usage = next(e.payload for e in events if e.kind == "provider_usage")
    assert usage["usage"]["tokens"]["input_tokens"] == 19 and usage["failure_code"] == "output_invalid"
    await assert_no_channels(c)


async def test_concurrent_turn_and_interrupted_restart_never_redispatch(text_customer, monkeypatch):
    c = text_customer
    row = await begin(c)
    entered = asyncio.Event()
    count = 0

    async def interrupted(*args):
        nonlocal count
        count += 1
        entered.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            raise adapter.RequestInterrupted({"input_tokens": 29, "output_tokens": 2}) from None

    monkeypatch.setattr(adapter, "run", interrupted)
    value = turn_value()
    task = asyncio.create_task(service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], value))
    await asyncio.wait_for(entered.wait(), 10)
    repeated = await service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], value)
    assert repeated["turn"]["status"] == "running" and count == 1
    with pytest.raises(ControlError, match="customer_text_busy"):
        await service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], turn_value())
    conversation, events = await stored(c, row["conversation_id"])
    attempt = next(e.payload for e in events if e.kind == "provider_attempt")
    client_event = next(e for e in events if e.kind == "client_transcript")
    knowledge_event = next(e for e in events if e.kind == "tool")
    context = {"client_message": value.message, "need_revision": 0, "need": {},
        "knowledge": knowledge_event.payload["result"], "history": [{"event_id": client_event.id,
            "sequence": client_event.sequence, "kind": client_event.kind, "data": client_event.payload}],
        "evidence_event_id": client_event.id}
    _, input_text, schema_text = adapter.material(context, client_event.id, 0)
    assert attempt["prompt_sha256"] == hashlib.sha256(input_text.encode()).hexdigest()
    assert attempt["schema_sha256"] == hashlib.sha256(schema_text.encode()).hexdigest()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await asyncio.wait_for(task, 10)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Conversation).where(Conversation.id == row["conversation_id"])
            .values(lease_until=utcnow() - timedelta(seconds=1)))
    await db.engine.dispose()
    replayed = await service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], value)
    assert replayed["turn"]["status"] == "interrupted" and count == 1
    _, events = await stored(c, row["conversation_id"])
    usage = next(e.payload for e in events if e.kind == "provider_usage")
    assert usage["failure_code"] == "request_interrupted" and usage["usage"]["tokens"]["input_tokens"] == 29
    assert not any(e.payload.get("reply") for e in events)
    await assert_no_channels(c)


@pytest.mark.parametrize("usage", [None, {"input_tokens": 19, "output_tokens": 3}])
async def test_failed_provider_retains_usage_and_cached_failure_without_retry(text_customer, monkeypatch, usage):
    c = text_customer
    row = await begin(c)
    count = 0

    async def invalid(*args):
        nonlocal count
        count += 1
        raise RunnerError("output_invalid", usage)

    monkeypatch.setattr(adapter, "run", invalid)
    value = turn_value()
    result = await service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], value)
    assert result["turn"]["status"] == "failed" and "reply" not in result["turn"]
    assert (await service.turn(c["token"], c["request"]["creation_id"], row["conversation_id"], value))["turn"] == result["turn"]
    assert count == 1
    _, events = await stored(c, row["conversation_id"])
    observed = next(e.payload["usage"] for e in events if e.kind == "provider_usage")
    assert observed["known"] == bool(usage) and observed["cost_usd"] is None
    await assert_no_channels(c)
