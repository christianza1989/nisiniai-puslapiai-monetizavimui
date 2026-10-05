import json
import time
from datetime import timedelta
from uuid import uuid4

from conftest import claim, edge, knowledge, utterance, worker
from sqlalchemy import select

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Conversation, Visitor, utcnow
from pinet_core.security import edge_signature
from pinet_core.service import business


async def remembered_start(client, token=None, remember=True, site="traktoriupadangos", request_id=None):
    result = await client.post(f"/internal/sites/{site}/simulation",
        headers={"Authorization": f"Bearer {settings().worker_secret}"},
        json={"request_id": request_id or str(uuid4()), "knowledge": knowledge(site),
              "notice_version": "memory-test-only", "consent": True, "mode": "simulation",
              "remember": remember, "memory_token": token})
    assert result.status_code == 200, result.text
    return result.json()


async def memory_request(client, token, method="GET", site="traktoriupadangos"):
    path = f"/v1/sites/{site}/memory"
    stamp, nonce = str(int(time.time())), str(uuid4())
    return await client.request(method, path, headers={"x-pinet-timestamp": stamp, "x-pinet-nonce": nonce,
        "x-pinet-memory": token or "", "x-pinet-signature": edge_signature(
            settings().edge_secret, stamp, nonce, method, path, b"")})


async def test_returning_device_restores_full_transcript_and_current_correction(client):
    first = await remembered_start(client)
    first_epoch = await claim(client, first)
    a = (await utterance(client, first, first_epoch, text="Reikia 420/85 R28.")).json()["event_id"]
    await utterance(client, first, first_epoch, key="correction", text="Pataisau: 420/85 R30.")
    await worker(client, first, "/tools", {"epoch": first_epoch, "call_id": "need",
        "name": "need.patch", "arguments": {"base_revision": 0, "evidence_event_id": a,
                                             "fields": {"goal": "Padangų informacija"}}})
    await edge(client, "POST", "traktoriupadangos", first, "/end")
    second = await remembered_start(client, first["memory_token"])
    assert second["conversation_id"] != first["conversation_id"]
    returned = await worker(client, second, "/claim", {"owner": "returning-worker"})
    memory = returned.json()["memory"]
    texts = [e["text"] for c in memory["conversations"] for e in c["evidence"]]
    assert texts == ["Reikia 420/85 R28.", "Pataisau: 420/85 R30."]
    assert memory["identity_assurance"] == "device_only"
    assert memory["history_is_not_current_business_truth"] is True
    assert (await memory_request(client, first["memory_token"])).json()["remembered"] is True
    assert "memory_token" not in (await edge(client, "GET", "traktoriupadangos", second)).json()


async def test_cookie_does_not_cross_business_or_environment(client):
    first = await remembered_start(client)
    epoch = await claim(client, first)
    await utterance(client, first, epoch, text="Private synthetic tractor conversation")
    second = await remembered_start(client, first["memory_token"], site="greitossvetaines")
    assert (await memory_request(client, first["memory_token"], site="greitossvetaines")).json()["remembered"] is False
    other = await worker(client, second, "/claim", {"owner": "other"}, site="greitossvetaines")
    assert other.json()["memory"]["conversations"] == []
    item = await business("traktoriupadangos")
    from pinet_core.memory import resolve
    async with db.transaction(item.id, "different-environment") as tx:
        assert await resolve(tx, first["memory_token"]) is None


async def test_declining_memory_keeps_call_anonymous(client):
    session = await remembered_start(client, remember=False)
    assert session["memory_token"] is None
    response = await worker(client, session, "/claim", {"owner": "anonymous"})
    assert response.json()["memory"]["status"] == "no_memory"
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.get(Conversation, session["conversation_id"])).visitor_id is None
        assert await tx.scalar(select(Visitor)) is None


async def test_forgotten_cookie_revoked_and_active_memory_call_closed(client):
    first = await remembered_start(client)
    epoch = await claim(client, first)
    await utterance(client, first, epoch)
    assert (await memory_request(client, first["memory_token"], "DELETE")).json()["remembered"] is False
    assert (await memory_request(client, first["memory_token"])).json()["remembered"] is False
    assert (await edge(client, "GET", "traktoriupadangos", first)).json()["state"] == "finalized"
    second = await remembered_start(client, first["memory_token"])
    result = await worker(client, second, "/claim", {"owner": "new-identity"})
    assert result.json()["memory"]["conversations"] == []
    assert second["memory_token"] != first["memory_token"]


async def test_expired_cookie_has_no_history(client):
    first = await remembered_start(client)
    epoch = await claim(client, first)
    await utterance(client, first, epoch)
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        visitor = await tx.scalar(select(Visitor))
        visitor.expires_at = utcnow() - timedelta(seconds=1)
    assert (await memory_request(client, first["memory_token"])).json()["remembered"] is False
    second = await remembered_start(client, first["memory_token"])
    assert (await worker(client, second, "/claim", {"owner": "expired-device"})).json()["memory"]["conversations"] == []


async def test_paginated_memory_can_retrieve_older_than_last_prompt_window(client):
    first = await remembered_start(client)
    epoch = await claim(client, first)
    for i in range(45):
        await utterance(client, first, epoch, key=f"long-{i}", text=f"Synthetic detail number {i}.")
    await edge(client, "POST", "traktoriupadangos", first, "/end")
    second = await remembered_start(client, first["memory_token"])
    claimed = (await worker(client, second, "/claim", {"owner": "long-memory"})).json()
    cursor = claimed["memory"]["next_event_id"]
    assert cursor
    response = await worker(client, second, "/tools", {"epoch": claimed["epoch"], "call_id": "older",
        "name": "memory.recall", "arguments": {"before_event_id": cursor}})
    evidence = response.json()["conversations"][0]["evidence"]
    assert len(evidence) == 5
    assert evidence[0]["text"] == "Synthetic detail number 0."
    assert "Synthetic detail number 44." not in json.dumps(response.json())


async def test_memory_creation_replay_preserves_one_device(client):
    request_id = str(uuid4())
    first = await remembered_start(client, request_id=request_id)
    second = await remembered_start(client, request_id=request_id)
    assert second["memory_token"] == first["memory_token"]
    assert second["conversation_id"] == first["conversation_id"]


async def test_memory_cursor_cannot_select_another_device(client):
    one = await remembered_start(client)
    epoch = await claim(client, one)
    other_event = (await utterance(client, one, epoch)).json()["event_id"]
    two = await remembered_start(client)
    second_epoch = await claim(client, two)
    call = {"epoch": second_epoch, "call_id": "foreign-cursor", "name": "memory.recall",
            "arguments": {"before_event_id": other_event}}
    assert (await worker(client, two, "/tools", call)).status_code == 422
    call["call_id"] = "unsupported-memory-argument"
    call["arguments"] = {"visitor_id": "someone-else"}
    assert (await worker(client, two, "/tools", call)).status_code == 422
