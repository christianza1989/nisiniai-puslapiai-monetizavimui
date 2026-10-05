"""Local synthetic continuity through actual API + public edge; no audio or model calls."""
import asyncio
import json
from uuid import uuid4

import httpx
from sqlalchemy import delete, select

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Case, Conversation, Visitor
from pinet_core.service import business


async def main():
    cfg = settings()
    if cfg.environment != "local" or cfg.voice_enabled or cfg.smtp_enabled or not cfg.allow_simulation:
        raise RuntimeError("local synthetic memory smoke only")
    seeds, sessions = [], []
    item = await business("traktoriupadangos")
    headers = {"Authorization": f"Bearer {cfg.worker_secret}"}
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8840", timeout=15) as core, \
            httpx.AsyncClient(base_url="http://127.0.0.1:5187", timeout=15, headers={
                "Host": "traktoriupadangos.lt", "Origin": "http://traktoriupadangos.lt"}) as web:
        async def create(token=None):
            request_id = str(uuid4())
            seeds.append(request_id)
            result = await core.post("/internal/sites/traktoriupadangos/simulation", headers=headers, json={
                "request_id": request_id, "remember": True, "memory_token": token, "consent": True,
                "mode": "simulation", "notice_version": "synthetic-memory-web-smoke",
                "knowledge": {"site_id": "traktoriupadangos", "canonical_host": "traktoriupadangos.lt",
                    "contact_email": "info@pinet.lt", "operator": "MB Pinet", "deployment_id": "synthetic-smoke",
                    "generated_at": "2026-09-30T00:00:00Z", "pages": [{"id": "explicit-test-page",
                        "title": "Sintetinis bandymo šaltinis", "url": "https://traktoriupadangos.lt/",
                        "text": "Tik sintetinė bandymo medžiaga.", "revision_hash": "a" * 64, "projection_hash": "b" * 64}]}})
            result.raise_for_status()
            data = result.json()
            sessions.append(data["conversation_id"])
            return data

        try:
            first = await create()
            prefix = f"/internal/sites/traktoriupadangos/sessions/{first['conversation_id']}"
            response = await core.post(prefix + "/claim", headers=headers, json={"owner": "memory-smoke"})
            response.raise_for_status()
            epoch = response.json()["epoch"]
            response = await core.post(prefix + "/events", headers=headers, json={"epoch": epoch,
                "event_key": "synthetic-original", "kind": "client_transcript", "text": "Synthetic R30 correction only."})
            response.raise_for_status()
            response = await core.post(prefix + "/end", headers=headers, json={"epoch": epoch})
            response.raise_for_status()
            cookie = {"Cookie": f"pinet_voice_traktoriupadangos={first['memory_token']}"}
            response = await web.get("/pokalbis/atmintis", headers=cookie)
            response.raise_for_status()
            assert response.json()["remembered"] is True
            assert first["memory_token"] not in response.text
            second = await create(first["memory_token"])
            prefix = f"/internal/sites/traktoriupadangos/sessions/{second['conversation_id']}"
            returned = await core.post(prefix + "/claim", headers=headers, json={"owner": "returning-memory-smoke"})
            returned.raise_for_status()
            assert "Synthetic R30 correction only." in json.dumps(returned.json()["memory"])
            forgotten = await web.post("/pokalbis/pamirsti", headers=cookie, json={})
            forgotten.raise_for_status()
            assert forgotten.json()["remembered"] is False
            attributes = forgotten.headers.get("set-cookie", "")
            assert "HttpOnly" in attributes and "SameSite=Lax" in attributes and "Max-Age=0" in attributes
            assert (await web.get("/pokalbis/atmintis", headers=cookie)).json()["remembered"] is False
            print(json.dumps({"status": "pass", "actual_api": True, "actual_public_edge": True,
                "return_context": True, "cookie_revocation": True, "cookie_token_exposed_in_body": False,
                "audio": False, "provider_calls": False}))
        finally:
            async with db.transaction(item.id, cfg.environment) as tx:
                rows = (await tx.scalars(select(Conversation).where(Conversation.id.in_(sessions)))).all()
                case_ids = [row.case_id for row in rows if row.payload.get("test") is True]
                if case_ids:
                    await tx.execute(delete(Case).where(Case.id.in_(case_ids)))
                await tx.execute(delete(Visitor).where(Visitor.payload["creation_seed"].astext.in_(seeds),
                                                       Visitor.payload["test"].as_boolean().is_(True)))
            await db.engine.dispose()


asyncio.run(main())
