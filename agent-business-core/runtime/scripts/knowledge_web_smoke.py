"""Real signed background manifest + session refresh through the public edge.
Synthetic session is marked and removed. No microphone, provider or email calls.
"""
import asyncio
import json
from datetime import timedelta

import httpx
from sqlalchemy import delete

from pinet_core import knowledge
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, Conversation, utcnow
from pinet_core.service import business


async def main():
    cfg = settings()
    if cfg.environment != "local" or cfg.voice_enabled or cfg.smtp_enabled or not cfg.allow_simulation:
        raise RuntimeError("local synthetic knowledge smoke only")
    item = await business("traktoriupadangos")
    cid = None
    headers = {"Authorization": f"Bearer {cfg.worker_secret}"}
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8840", timeout=15) as core, \
            httpx.AsyncClient(base_url="http://127.0.0.1:5187", timeout=15, headers={
                "Host": "traktoriupadangos.lt", "Origin": "http://traktoriupadangos.lt"}) as web:
        try:
            assert (await web.get("/pokalbis/manifestas")).status_code == 401
            async with db.transaction(item.id, cfg.environment) as tx:
                state = await knowledge.current(tx)
                if state:
                    state.refreshed_at = utcnow() - timedelta(seconds=cfg.knowledge_ttl_seconds + 1)
            result = await knowledge.refresh_from_edge(item)
            assert result["status"] in {"refreshed", "fresh"}, result
            async with db.transaction(item.id, cfg.environment) as tx:
                approved = await knowledge.projection(tx)
                assert approved and approved["pages"]
                assert not any(p["id"] == "explicit-test-page" for p in approved["pages"])
                allowed = {p["id"] for p in approved["pages"]}
                payload = {k: v for k, v in approved.items() if k != "knowledge_revision"}
            response = await core.post("/internal/sites/traktoriupadangos/simulation", headers=headers, json={
                "knowledge": payload, "notice_version": "synthetic-source-smoke", "consent": True, "mode": "simulation"})
            response.raise_for_status()
            session = response.json()
            cid = session["conversation_id"]
            receipt = await web.post("/pokalbis/zinios", headers={"x-voice-session": session["session_token"]},
                json={"conversation_id": cid, "knowledge": {"injected": "not an approved source"}})
            receipt.raise_for_status()
            prefix = f"/internal/sites/traktoriupadangos/sessions/{cid}"
            claimed = await core.post(prefix + "/claim", headers=headers, json={"owner": "source-smoke"})
            claimed.raise_for_status()
            sources = await core.post(prefix + "/tools", headers=headers, json={"epoch": claimed.json()["epoch"],
                "call_id": "approved-sources", "name": "knowledge.resolve", "arguments": {"query": "padangos"}})
            sources.raise_for_status()
            assert sources.json()["sources"] and all(p["id"] in allowed for p in sources.json()["sources"])
            print(json.dumps({"status": "pass", "real_background_hmac": True, "real_session_edge_refresh": True,
                "approved_pages": len(allowed), "browser_cannot_replace_manifest": True,
                "audio_test": False, "mail_sent": False}))
        finally:
            if cid:
                async with db.transaction(item.id, cfg.environment) as tx:
                    row = await tx.get(Conversation, cid)
                    if row and row.payload.get("test") is True:
                        await tx.execute(delete(Case).where(Case.id == row.case_id))
            await db.engine.dispose()


asyncio.run(main())
