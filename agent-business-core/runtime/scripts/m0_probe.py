"""Explicit real Gemini setup probe. Does not activate voice or claim audio UX certification."""
import argparse
import asyncio
import json
import sys
import wave
from importlib.metadata import version
from pathlib import Path
from uuid import uuid4

from google import genai
from google.genai import types

from pinet_core import budget, policy, pricing
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.service import business
from pinet_core.profiles import PROFILES


async def probe(site='traktoriupadangos', input_text=None):
    cfg = settings()
    metadata = {"site_id": site, "model": cfg.live_model, "google_genai": version("google-genai"),
                "livekit_google": version("livekit-plugins-google"), "full_m0_pass": False}
    if not cfg.google_api_key:
        return {**metadata, "status": "blocked_missing_google_api_key"}
    if cfg.global_daily_budget_microusd <= 0 or cfg.voice_cost_ceiling_microusd <= 0:
        return {**metadata, "status": "blocked_missing_explicit_budget"}
    if cfg.live_model != "gemini-3.8-live" or not pricing.current():
        return {**metadata, "status": "blocked_model_or_rate_review"}
    # The probe also reserves its maximum declared cost in the shared ledger.
    # It never flips M0 or opens public voice admission.
    if site not in PROFILES or site not in cfg.voice_sites:
        raise ValueError('site_not_admitted_for_probe')
    if input_text is None:
        if site != 'traktoriupadangos':
            raise ValueError('explicit_synthetic_input_required')
        input_text = ('Man reikia dviejų traktoriaus padangų 420/85 R30. '
                      'Pasiūlymą norėčiau gauti el. paštu. Prašau atidaryti kontaktų langą.')
    if not 10 <= len(input_text) <= 1500:
        raise ValueError('bounded_synthetic_input_required')
    item = await business(site)
    async with db.transaction(item.id, cfg.environment) as tx:
        await policy.lock(tx, item.id, cfg.environment)
        authority, _ = await policy.read(tx)
        if not authority.enabled or authority.paused:
            return {**metadata, "status": "blocked_site_policy"}
        await budget.reserve(tx, item.id, authority, f"m0-probe:{uuid4()}", cfg.voice_cost_ceiling_microusd)
    config = types.LiveConnectConfig(response_modalities=["AUDIO"],
        system_instruction="Kalbėk lietuviškai. Tai pažymėtas techninis testas.",
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig())
    client = genai.Client(api_key=cfg.google_api_key)
    audio_parts, transcription_parts = 0, 0
    async with asyncio.timeout(25):
        async with client.aio.live.connect(model=cfg.live_model, config=config) as session:
            await session.send_client_content(turns={"role": "user", "parts": [{"text":
                'Perskaityk tik šį tekstą lietuviškai: ' + input_text}]}, turn_complete=True)
            pcm = bytearray()
            async for message in session.receive():
                content = message.server_content
                if content:
                    if content.model_turn:
                        audio_parts += sum(bool(p.inline_data) for p in content.model_turn.parts)
                        for part in content.model_turn.parts:
                            if part.inline_data and part.inline_data.data:
                                pcm.extend(part.inline_data.data)
                    transcription_parts += int(bool(content.output_transcription))
    if pcm:
        output = Path('artifacts') / ('tractor-voice' if site == 'traktoriupadangos' else site + '-voice') / 'client-input.wav'
        output.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(output), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(pcm)
    result = {**metadata, "status": "setup_and_output_checked", "audio_parts": audio_parts,
              "transcription_parts": transcription_parts, "api_key_logged": False,
              "declared_cost_reserved": True, "invoice_verified": False,
              "audio_file_saved": bool(pcm)}
    return result


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', choices=sorted(PROFILES), default='traktoriupadangos')
    parser.add_argument('--input-text-file', type=Path, help='Private synthetic client wording; 10–1500 characters')
    args = parser.parse_args()
    try:
        result = await probe(args.site, args.input_text_file.read_text(encoding='utf-8') if args.input_text_file else None)
    except Exception:
        # SDK exceptions may contain request URLs or private provider details.
        result = {"status": "probe_failed", "full_m0_pass": False, "private_error_logged": False}
    finally:
        await db.engine.dispose()
    path = Path('artifacts/m0-probe.json') if args.site == 'traktoriupadangos' else Path('artifacts') / (args.site + '-voice') / 'm0-probe.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result))
    if result["status"] != "setup_and_output_checked" or not result.get("audio_parts"):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
