import asyncio
from types import SimpleNamespace

import httpx
import pytest
from conftest import edge, start
from sqlalchemy import select

from pinet_core import voice_worker as adapter
from pinet_core.api import app
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Conversation, Event
from pinet_core.service import business


def configure_fake_transport(monkeypatch, script, fail_heartbeat=False):
    cfg = settings()
    monkeypatch.setattr(cfg, "allow_simulation", False)
    monkeypatch.setattr(cfg, "global_daily_budget_microusd", 1000000)
    monkeypatch.setattr(cfg, "voice_cost_ceiling_microusd", 10000)
    for field in ["voice_enabled", "m0_verified"]:
        monkeypatch.setattr(cfg, field, True)
    for field in ["google_api_key", "livekit_api_key", "livekit_api_secret"]:
        monkeypatch.setattr(cfg, field, "synthetic-provider-never-called")
    monkeypatch.setattr(cfg, "session_seconds", 2)
    monkeypatch.setattr(cfg, "voice_heartbeat_seconds", 0.02 if fail_heartbeat else 20)
    created, model_config = [], {}

    class FaultTransport(httpx.ASGITransport):
        claims = 0

        async def handle_async_request(self, request):
            if request.url.path.endswith("/claim"):
                self.claims += 1
                if fail_heartbeat and self.claims == 2:
                    raise httpx.ConnectError("synthetic heartbeat outage", request=request)
            return await super().handle_async_request(request)

    original_client = httpx.AsyncClient
    monkeypatch.setattr(adapter.httpx, "AsyncClient", lambda **kwargs: original_client(
        transport=FaultTransport(app=app), **kwargs))

    def fake_model(**kwargs):
        model_config.update(kwargs)
        return SimpleNamespace()
    monkeypatch.setattr(adapter.google.realtime, "RealtimeModel", fake_model)

    class FakeSession:
        def __init__(self, **kwargs):
            self.handlers, self.closed, self.replies = {}, False, []
            created.append(self)

        def on(self, name):
            def decorator(function):
                self.handlers[name] = function
                return function
            return decorator

        async def start(self, agent, room):
            self.agent = agent
            await script(self, agent)

        def emit_text(self, text, item_id="fake-client", role="user"):
            self.handlers["conversation_item_added"](SimpleNamespace(item=SimpleNamespace(
                id=item_id, role=role, text_content=text, interrupted=False)))

        def generate_reply(self, **kwargs):
            self.replies.append(kwargs)
            self.handlers["agent_state_changed"](SimpleNamespace(new_state="speaking"))

        async def aclose(self):
            if not self.closed:
                self.closed = True
                self.handlers["close"](None)
    monkeypatch.setattr(adapter, "AgentSession", FakeSession)
    return created, model_config


def context_for(session):
    async def connect():
        return None
    async def set_attributes(value):
        attributes.update(value)
    attributes = {}
    return SimpleNamespace(job=SimpleNamespace(metadata=f"traktoriupadangos:{session['conversation_id']}"),
                           room=SimpleNamespace(name=f"pinet-{session['conversation_id']}",
                               local_participant=SimpleNamespace(set_attributes=set_attributes, attributes=attributes)), connect=connect)


async def test_exact_worker_adapter_tools_transcript_and_finalization_offline(client, monkeypatch):
    session = await start(client)
    cid = session["conversation_id"]
    results = {}

    async def script(fake, agent):
        # A server history item is not a new client utterance.
        fake.emit_text("Old private historical input", item_id=f"memory-context:{cid}")
        fake.emit_text("Man reikia 420/85 R30 padangos.")
        results["knowledge"] = await agent.knowledge_resolve(None, query="padangos")
        results["need"] = await agent.need_patch(None, tyre_marking="420/85 R30")
        ui_task = asyncio.create_task(agent.ui_open_contact_form(None))
        async with asyncio.timeout(2):
            while True:
                status = (await edge(client, "GET", "traktoriupadangos", session)).json()
                if status["ui"]:
                    rid = status["ui"]["id"]
                    assert (await edge(client, "POST", "traktoriupadangos", session, "/ui",
                                       {"request_id": rid, "state": "shown"})).status_code == 200
                    break
                await asyncio.sleep(0.01)
        results["ui"] = await ui_task
        fake.emit_text("Padėsiu patikslinti jūsų poreikį.", item_id="fake-agent", role="assistant")
        await fake.aclose()

    created, model_config = configure_fake_transport(monkeypatch, script)
    worker_context = context_for(session)
    await adapter.entrypoint(worker_context)
    assert worker_context.room.local_participant.attributes == {"pinet.voice.ready": "true"}
    assert created[0].closed and created[0].replies
    assert results["ui"]["status"] == "shown"
    assert results["need"]["fields"]["tyre_marking"]["status"] == "proposed"
    assert results["knowledge"]["sources"]
    assert model_config["model"] == "gemini-3.8-live"
    assert model_config["tool_behavior"].value == "NON_BLOCKING"
    assert model_config["tool_response_scheduling"].value == "WHEN_IDLE"
    assert "thinking_config" not in model_config and "enable_affective_dialog" not in model_config
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.get(Conversation, cid)).state == "finalized"
        events = (await tx.scalars(select(Event).where(Event.kind == "client_transcript"))).all()
        assert [event.payload["text"] for event in events] == ["Man reikia 420/85 R30 padangos."]


async def test_worker_heartbeat_network_failure_closes_transport_and_marks_gap(client, monkeypatch):
    session = await start(client)

    async def script(fake, agent):
        return None  # Heartbeat must close this transport without a 900-second orphan.
    created, _ = configure_fake_transport(monkeypatch, script, fail_heartbeat=True)
    await adapter.entrypoint(context_for(session))
    assert created[0].closed
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session["conversation_id"])
        assert convo.state == "finalized" and convo.payload["coverage"] == "incomplete"


async def test_startup_timeout_is_not_silently_treated_as_normal_call_end(client, monkeypatch):
    session = await start(client)

    async def script(fake, agent):
        raise TimeoutError('synthetic transport startup timeout')
    created, _ = configure_fake_transport(monkeypatch, script)
    with pytest.raises(TimeoutError, match='startup timeout'):
        await adapter.entrypoint(context_for(session))
    assert created[0].closed
    item = await business('traktoriupadangos')
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session['conversation_id'])
        assert convo.state == 'finalized' and convo.payload['coverage'] == 'incomplete'


async def test_worker_rejects_cross_site_server_dispatch_before_provider(client, monkeypatch):
    session = await start(client)

    async def script(fake, agent):
        raise AssertionError("Invalid dispatch must not start a transport")
    created, _ = configure_fake_transport(monkeypatch, script)
    wrong = context_for(session)
    wrong.job.metadata = f"greitossvetaines:{session['conversation_id']}"
    with pytest.raises(RuntimeError, match="invalid server dispatch"):
        await adapter.entrypoint(wrong)
    assert created == []


async def test_sdk_cumulative_usage_deduplicates_and_stops_before_declared_cost(client, monkeypatch):
    from pinet_core.models import CostReservation

    session = await start(client)
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session["conversation_id"])
        convo.payload = {**convo.payload, "cost_ceiling_microusd": 10000}
        tx.add(CostReservation(business_id=item.id, environment_id=settings().environment,
            action_key=f"voice:{convo.id}", reserved_microusd=10000))

    async def script(fake, agent):
        from livekit.agents.metrics.usage import AgentSessionUsage, LLMModelUsage

        data = AgentSessionUsage(model_usage=[LLMModelUsage(provider="google", model="gemini-3.8-live",
            input_tokens=1000, input_audio_tokens=1000, output_tokens=500, output_audio_tokens=500)])
        event = SimpleNamespace(usage=data)
        fake.handlers["session_usage_updated"](event)
        fake.handlers["session_usage_updated"](event)  # A cumulative snapshot is not added twice.
    created, _ = configure_fake_transport(monkeypatch, script)
    await adapter.entrypoint(context_for(session))
    assert created[0].closed
    async with db.transaction(item.id, settings().environment) as tx:
        row = await tx.scalar(select(CostReservation).where(CostReservation.action_key == f"voice:{session['conversation_id']}"))
        assert row.observed_microusd == 9000
        reports = list(await tx.scalars(select(Event).where(Event.kind == "usage_estimate")))
        assert len(reports) == 1 and reports[0].payload["total_microusd"] == 9000


async def test_clipped_sdk_transcript_marks_coverage_incomplete(client, monkeypatch):
    session = await start(client)

    async def script(fake, agent):
        fake.emit_text("Sintetinis tekstas " * 500)
        await fake.aclose()
    configure_fake_transport(monkeypatch, script)
    await adapter.entrypoint(context_for(session))
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session["conversation_id"])
        assert convo.state == "finalized" and convo.payload["coverage"] == "incomplete"


async def test_public_end_waits_for_live_owner_final_transcript_before_postcall(client, monkeypatch):
    from pinet_core.models import Job

    session = await start(client)
    item = await business("traktoriupadangos")

    async def script(fake, agent):
        async with db.transaction(item.id, settings().environment) as tx:
            convo = await tx.get(Conversation, session["conversation_id"])
            convo.payload = {**convo.payload, "test": False}
        ended = await edge(client, "POST", "traktoriupadangos", session, "/end")
        assert ended.json()["state"] == "ending"
        async with db.transaction(item.id, settings().environment) as tx:
            assert (await tx.get(Conversation, session["conversation_id"])).state == "active"
            assert not list(await tx.scalars(select(Job)))
        fake.emit_text("Gavau jūsų poreikį ir aptarėme kitą žingsnį.", item_id="last-spoken", role="assistant")
        await fake.aclose()

    configure_fake_transport(monkeypatch, script)
    await adapter.entrypoint(context_for(session))
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.get(Conversation, session["conversation_id"])).state == "finalized"
        events = list(await tx.scalars(select(Event).where(Event.kind == "agent_transcript")))
        assert len(events) == 1 and events[0].event_key == "last-spoken"
        assert {job.kind for job in await tx.scalars(select(Job))} == {"analysis", "quality"}


async def test_private_probe_cannot_claim_an_ordinary_session(client, monkeypatch):
    session = await start(client)

    async def script(fake, agent):
        raise AssertionError("Provider must not open for an ordinary session in probe mode")

    created, _ = configure_fake_transport(monkeypatch, script)
    monkeypatch.setattr(settings(), "m0_probe_enabled", True)
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.probe_entrypoint(context_for(session))
    assert not created
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.get(Conversation, session["conversation_id"])).owner is None


async def test_private_probe_without_cost_reservation_never_opens_provider(client, monkeypatch):
    session = await start(client)
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        convo = await tx.get(Conversation, session["conversation_id"])
        convo.payload = {**convo.payload, "m0_probe": True, "cost_ceiling_microusd": 10000}

    async def script(fake, agent):
        raise AssertionError("An unreserved probe must not open a provider")

    created, _ = configure_fake_transport(monkeypatch, script)
    monkeypatch.setattr(settings(), "m0_probe_enabled", True)
    with pytest.raises(httpx.HTTPStatusError):
        await adapter.probe_entrypoint(context_for(session))
    assert not created


def test_worker_registration_marker_tracks_actual_registration_without_credentials(monkeypatch, tmp_path):
    import json

    callbacks = {}

    class Worker:
        def on(self, name):
            def register(callback):
                callbacks[name] = callback
                return callback
            return register

    monkeypatch.chdir(tmp_path)
    adapter.configure_worker_cli(Worker(), "pinet-m0-consultant")
    marker = tmp_path / "artifacts/voice-processes/consultant.registration.json"
    assert json.loads(marker.read_text())["ready"] is False
    callbacks["worker_registered"]("private-id", {"ignored": "private-details"})
    record = json.loads(marker.read_text())
    assert record["ready"] is True
    assert record["agent_name"] == "pinet-m0-consultant"
    assert set(record) == {"ready", "agent_name", "pid", "environment", "registered_at"}
    assert "private-id" not in marker.read_text() and "private-details" not in marker.read_text()
