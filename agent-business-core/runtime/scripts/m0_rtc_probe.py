"""Real RTC audio through the production consultant adapter, with private probe admission.

No public live gate is altered. Evidence lives in ignored artifacts; probe cases cannot send SMTP.
Run m0_probe.py first to produce a Lithuanian audio input and start m0_voice_worker separately.
"""
import argparse
import asyncio
import json
import sys
import time
import wave
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import httpx
import numpy as np
from livekit import api, rtc
from sqlalchemy import select

from pinet_core import budget, policy, service
from pinet_core.config import settings
from pinet_core.contracts import Knowledge, Start
from pinet_core.db import db
from pinet_core.models import Conversation, CostReservation, Event
from pinet_core.profiles import PROFILES
from pinet_core.security import edge_signature

ROOT = Path("artifacts/tractor-voice")


async def probe(site='traktoriupadangos'):
    root = ROOT if site == 'traktoriupadangos' else Path('artifacts') / (site + '-voice')
    cfg = settings()
    if not cfg.m0_probe_enabled or not cfg.voice_provider_ready or cfg.voice_enabled:
        raise ValueError("private_probe_requires_provider_ready_and_public_voice_off")
    if site not in PROFILES or site not in cfg.voice_sites:
        raise ValueError('site_not_admitted_for_probe')
    item = await service.business(site)
    manifest = Knowledge.model_validate_json((root / 'knowledge' / (site + '.json')).read_text(encoding='utf-8'))
    started = await service.start(item, Start(request_id=uuid4(), knowledge=manifest,
        notice_version="private-audio-acceptance-v1", consent=True, mode="simulation", remember=True), simulation=True)
    cid = started["conversation_id"]
    async with db.transaction(item.id, cfg.environment) as tx:
        authority, _ = await policy.require(tx)
        await budget.reserve(tx, item.id, authority, f"voice:{cid}", cfg.voice_cost_ceiling_microusd)
        convo = await tx.get(Conversation, cid)
        convo.payload = {**convo.payload, "m0_probe": True, "cost_ceiling_microusd": cfg.voice_cost_ceiling_microusd}

    room = rtc.Room()
    output = bytearray()
    tasks = set()
    ui_shown = False
    ready = asyncio.Event()
    headers = {"x-pinet-session": started["session_token"]}
    http = httpx.AsyncClient(base_url=cfg.core_url, timeout=10)
    prefix = f"/v1/sites/{item.site_id}/sessions/{cid}"

    async def edge(method, suffix="", body=None):
        serialized = "" if body is None else json.dumps(body)
        timestamp, nonce = str(int(time.time())), str(uuid4())
        path = prefix + suffix
        result = await http.request(method, path, content=serialized or None, headers={**headers,
            "Content-Type": "application/json", "x-pinet-timestamp": timestamp, "x-pinet-nonce": nonce,
            "x-pinet-signature": edge_signature(cfg.edge_secret, timestamp, nonce, method, path, serialized.encode())})
        result.raise_for_status()
        return result.json()

    async def receive(track):
        stream = rtc.AudioStream(track, sample_rate=24000, num_channels=1)
        try:
            async for event in stream:
                output.extend(event.frame.data)
        finally:
            await stream.aclose()

    def check_ready(*_):
        if any(p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_AGENT
               and p.attributes.get("pinet.voice.ready") == "true" for p in room.remote_participants.values()):
            ready.set()

    @room.on("track_subscribed")
    def subscribed(track, publication, participant):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            task = asyncio.create_task(receive(track))
            tasks.add(task)
            task.add_done_callback(tasks.discard)

    room.on("participant_connected", check_ready)
    room.on("participant_attributes_changed", check_ready)
    try:
        token = (api.AccessToken(cfg.livekit_api_key, cfg.livekit_api_secret)
            .with_identity(f"visitor-{cid}").with_ttl(timedelta(seconds=cfg.session_seconds))
            .with_grants(api.VideoGrants(room_join=True, room=f"pinet-{cid}", can_publish=True,
                can_subscribe=True, can_publish_data=False)).to_jwt())
        await room.connect(cfg.livekit_url, token)
        async with api.LiveKitAPI(cfg.livekit_url, cfg.livekit_api_key, cfg.livekit_api_secret) as lk:
            await lk.agent_dispatch.create_dispatch(api.CreateAgentDispatchRequest(room=f"pinet-{cid}",
                agent_name="pinet-m0-consultant", metadata=f"{item.site_id}:{cid}"))
        check_ready()
        await asyncio.wait_for(ready.wait(), 30)
        print(json.dumps({"stage": "consultant_ready", "public_gate_changed": False}), flush=True)
        source = rtc.AudioSource(16000, 1)
        track = rtc.LocalAudioTrack.create_audio_track("microphone", source)
        await room.local_participant.publish_track(track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
        await asyncio.sleep(1)  # ICE/subscription settles before the first microphone syllable.
        with wave.open(str(root / "client-input.wav"), "rb") as wav:
            original = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
            pcm = np.interp(np.arange(0, len(original), wav.getframerate()/16000), np.arange(len(original)), original).astype(np.int16)
        # Real-time PCM microphone transport, not a client text injection.
        for offset in range(0, len(pcm), 320):
            chunk = pcm[offset:offset+320]
            await source.capture_frame(rtc.AudioFrame(chunk.tobytes(), 16000, 1, len(chunk)))
        await source.wait_for_playout()
        for _ in range(35):
            await asyncio.sleep(1)
            status = await edge("GET")
            ui = status.get("ui")
            if ui and ui["state"] == "requested":
                await edge("POST", "/ui", {"request_id": ui["id"], "state": "shown"})
                ui_shown = True
            if ui_shown and len(output) > 48000:
                await asyncio.sleep(15)
                break
        await edge("POST", "/end", {})
        await room.disconnect()
        await source.aclose()
        for _ in range(25):
            if (await edge("GET"))["state"] == "finalized":
                break
            await asyncio.sleep(1)
        async with db.transaction(item.id, cfg.environment) as tx:
            events = list(await tx.scalars(select(Event).where(Event.conversation_id == cid).order_by(Event.sequence)))
            state = (await tx.get(Conversation, cid)).state
            reservation = await tx.scalar(select(CostReservation).where(CostReservation.action_key == f"voice:{cid}"))
        with wave.open(str(root / "consultant-output.wav"), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(output)
        result = {"status": "measured", "site_id": site, "canonical_host": item.canonical_host,
            "conversation_id": cid, "actual_rtc_audio": bool(output),
            "output_audio_seconds": len(output)/48000, "ui_shown_ack": ui_shown, "state": state,
            "client_transcripts": [e.payload.get("text") for e in events if e.kind == "client_transcript"],
            "agent_transcripts": [e.payload.get("text") for e in events if e.kind == "agent_transcript"],
            "tool_names": [e.payload.get("name") for e in events if e.kind == "tool"],
            "coverage_gap": any(e.kind == "coverage_gap" for e in events),
            "interrupted_events": sum(e.kind == "interrupted" for e in events),
            "observed_cost_microusd": reservation.observed_microusd if reservation else None,
            "full_m0_pass": False, "public_voice_enabled": cfg.voice_enabled,
            "smtp_sent": False, "input_channel": "recorded_synthetic_pcm_over_rtc",
            "physical_browser_microphone_verified": False}
        return result
    finally:
        await room.disconnect()
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await http.aclose()
        async with db.transaction(item.id, cfg.environment) as tx:
            convo = await tx.get(Conversation, cid)
            if convo and convo.state != "finalized":
                await service.finalize(tx, convo)


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', choices=sorted(PROFILES), default='traktoriupadangos')
    args = parser.parse_args()
    root = ROOT if args.site == 'traktoriupadangos' else Path('artifacts') / (args.site + '-voice')
    try:
        result = await probe(args.site)
    except Exception as error:
        result = {"status": "failed", "error_type": type(error).__name__, "full_m0_pass": False,
                  "private_error_logged": False, "public_gate_changed": False}
    finally:
        await db.engine.dispose()
    root.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(result, ensure_ascii=False, indent=2)
    (root / "rtc-probe.json").write_text(encoded, encoding="utf-8")
    (root / f"rtc-probe-{result.get('conversation_id', uuid4())}.json").write_text(encoded, encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k not in {"client_transcripts", "agent_transcripts"}}, ensure_ascii=False))
    if (result["status"] != "measured" or not result.get("actual_rtc_audio")
            or result.get("state") != "finalized" or result.get("coverage_gap")):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
