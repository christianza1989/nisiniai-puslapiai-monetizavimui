"""Actual HTTP + actual jobs process + PG smoke. Only our marked synthetic case is deleted."""
import asyncio
import json
import time
from uuid import uuid4

import httpx
from sqlalchemy import delete, select

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Artifact, Case, Conversation
from pinet_core.security import edge_signature
from pinet_core.service import business


async def main():
    cfg = settings()
    if cfg.environment != "local" or cfg.voice_enabled or cfg.smtp_enabled or not cfg.allow_simulation:
        raise RuntimeError("local smoke only")
    cid = None
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8840", timeout=15) as client:
        headers = {"Authorization": f"Bearer {cfg.worker_secret}"}
        payload = {"knowledge": {"site_id": "traktoriupadangos", "canonical_host": "traktoriupadangos.lt",
            "contact_email": "info@pinet.lt", "operator": "MB Pinet", "deployment_id": "synthetic-smoke",
            "generated_at": "2026-09-30T00:00:00Z", "pages": [{"id": "explicit-test-page",
            "title": "Sintetinis bandymo šaltinis", "url": "https://traktoriupadangos.lt/",
            "text": "Tik sintetinė žymėjimo bandymo medžiaga.", "revision_hash": "a" * 64, "projection_hash": "b" * 64}]},
            "notice_version": "synthetic-smoke", "consent": True, "mode": "simulation"}
        response = await client.post("/internal/sites/traktoriupadangos/simulation", json=payload, headers=headers)
        response.raise_for_status()
        session = response.json()
        cid = session["conversation_id"]
        prefix = f"/internal/sites/traktoriupadangos/sessions/{cid}"
        response = await client.post(f"{prefix}/claim", json={"owner": "explicit-local-smoke"}, headers=headers)
        response.raise_for_status()
        epoch = response.json()["epoch"]
        response = await client.post(f"{prefix}/events", json={"epoch": epoch, "event_key": "smoke-client-1",
            "kind": "client_transcript", "text": "Sintetinis testas: reikia patikslinti padangos dydį."}, headers=headers)
        response.raise_for_status()

        async def edge(action, data):
            path = f"/v1/sites/traktoriupadangos/sessions/{cid}/{action}"
            body = json.dumps(data).encode()
            stamp, nonce = str(int(time.time())), str(uuid4())
            result = await client.post(path, content=body, headers={"Content-Type": "application/json",
                "x-pinet-session": session["session_token"], "x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
                "x-pinet-signature": edge_signature(cfg.edge_secret, stamp, nonce, "POST", path, body)})
            result.raise_for_status()
            return result
        try:
            await edge("end", {})
            await edge("contact", {"channel": "email", "value": "explicit-voice-smoke@example.org",
                                   "consent": True, "notice_version": "synthetic-smoke"})
            item = await business("traktoriupadangos")
            async with asyncio.timeout(25):
                while True:
                    async with db.transaction(item.id, cfg.environment) as tx:
                        kinds = list(await tx.scalars(select(Artifact.kind).where(Artifact.conversation_id == cid)))
                    if {"analysis", "quality", "followup"} <= set(kinds):
                        break
                    await asyncio.sleep(0.5)
            print(json.dumps({"status": "pass", "actual_http": True, "actual_postgres": True,
                              "actual_jobs_process": True, "artifacts": sorted(kinds),
                              "audio_test": False, "mail_sent": False}))
        finally:
            item = await business("traktoriupadangos")
            async with db.transaction(item.id, cfg.environment) as tx:
                convo = await tx.get(Conversation, cid)
                if convo and convo.payload.get("test") is True:
                    await tx.execute(delete(Case).where(Case.id == convo.case_id))
            await db.engine.dispose()


asyncio.run(main())
