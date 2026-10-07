"""Bounded real Gemini session-resumption proof. Opaque handles never leave process memory."""
import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4

from google import genai
from google.genai import types

from pinet_core import budget, policy, pricing
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.service import business


async def probe():
    cfg = settings()
    if not cfg.google_api_key or not pricing.current() or cfg.live_model != "gemini-3.8-live":
        raise ValueError("provider_configuration_required")
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, cfg.environment) as tx:
        authority, _ = await policy.require(tx)
        await budget.reserve(tx, item.id, authority, f"m0-resume:{uuid4()}", cfg.voice_cost_ceiling_microusd * 2)
    handle = None
    output_text = []
    counts = [0, 0]
    client = genai.Client(api_key=cfg.google_api_key)
    try:
        for index in range(2):
            config = types.LiveConnectConfig(response_modalities=["AUDIO"],
                system_instruction="Kalbėk lietuviškai ir atsakyk vienu trumpu sakiniu.",
                output_audio_transcription=types.AudioTranscriptionConfig(),
                session_resumption=types.SessionResumptionConfig(handle=handle))
            prompt = ("Man reikia traktoriaus padangos 420/85 R30. Trumpai patvirtink matmenis."
                if index == 0 else "Kokių padangos matmenų prašiau ankstesniame sakinyje?")
            async with asyncio.timeout(30):
                async with client.aio.live.connect(model=cfg.live_model, config=config) as live:
                    await live.send_client_content(turns={"role": "user", "parts": [{"text": prompt}]}, turn_complete=True)
                    async for message in live.receive():
                        update = message.session_resumption_update
                        if update and update.resumable and update.new_handle:
                            handle = update.new_handle
                        content = message.server_content
                        if content and content.model_turn:
                            counts[index] += sum(bool(p.inline_data) for p in content.model_turn.parts)
                        if index == 1 and content and content.output_transcription:
                            output_text.append(content.output_transcription.text or "")
            if index == 0 and not handle:
                return {"status": "unverified", "resumption_handle_received": False, "full_m0_pass": False}
        text = "".join(output_text)
        return {"status": "measured", "resumption_handle_received": bool(handle),
            "new_connection_audio_parts": counts[1], "first_connection_audio_parts": counts[0],
            "resumed_transcript": text, "context_restored": all(x in text.replace(" ", "").lower() for x in ["420", "85", "30"]),
            "handle_logged": False, "full_m0_pass": False, "public_gate_changed": False}
    finally:
        await client.aio.aclose()


async def main():
    try:
        result = await probe()
    except Exception as error:
        result = {"status": "failed", "error_type": type(error).__name__, "handle_logged": False,
            "full_m0_pass": False, "public_gate_changed": False}
    finally:
        await db.engine.dispose()
    target = Path("artifacts/tractor-voice/provider-resume.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "resumed_transcript"}))
    if result["status"] != "measured" or not result.get("context_restored"):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
