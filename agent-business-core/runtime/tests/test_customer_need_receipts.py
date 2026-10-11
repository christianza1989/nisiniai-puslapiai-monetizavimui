"""Real restricted PostgreSQL path; injected local provider, no model/channel calls."""

from copy import deepcopy
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agent_lab import (  # noqa: F401 - canonical fixture chain
    configured,
    creation,
    customers,
    profile,
    registration,
    stored,
    text_customer,
)

from pinet_core import jobs
from pinet_core.customer_agents import lab
from pinet_core.customer_text import adapter
from pinet_core.db import db
from pinet_core.models import Artifact, Conversation, Event, Job, Outbox


async def episode(c, monkeypatch):
    captured = []

    async def runner(context, event_id, revision, authorized):
        assert await authorized()
        captured.append(deepcopy(context))
        fields = (
            [
                dict(field="goal", value="Synthetic course"),
                dict(field="deadline", value="Tentatively next week"),
                dict(field="budget", value="100"),
            ]
            if len(captured) == 1
            else [dict(field="budget", value="50")]
        )
        calls = (
            []
            if len(captured) == 3
            else [
                dict(
                    name="need.patch",
                    arguments=dict(base_revision=revision, evidence_event_id=event_id, fields=fields),
                )
            ]
        )
        return adapter.schema(event_id, revision).model_validate(
            dict(reply="Synthetic reply", calls=calls)
        ), {"input_tokens": 9, "output_tokens": 5}

    monkeypatch.setattr(adapter, "run", runner)
    key = uuid4()
    messages = ["Synthetic first need", "Synthetic budget correction", "Synthetic no new need"]
    result = await lab.episode(c["token"], c["frozen"], messages, key)
    return result, key, messages, captured


async def test_actual_pg_receipts_reach_quality_and_replay_preserves_all_rows(configured, monkeypatch):  # noqa: F811 - imported pytest fixture
    c = configured
    result, key, messages, captured = await episode(c, monkeypatch)
    bid, cid = c["saved"]["business_id"], result["conversation"]["conversation_id"]
    before, events = await stored(c, cid)
    original = deepcopy((before.payload, before.need_revision, [(e.id, e.payload) for e in events]))
    data = await jobs.load_input(bid, cid)
    nodes = [e for e in data["timeline"] if e["kind"] == "need_patch"]
    clients = [e for e in data["evidence"] if e["speaker"] == "client"]
    assert len(nodes) == 2 and before.need_revision == 2
    assert (
        nodes[0]["state_after"]["budget"]["value"] == "100"
        and nodes[1]["state_after"]["budget"]["value"] == "50"
    )
    assert nodes[1]["state_after"]["deadline"]["evidence"] == clients[0]["id"]
    assert nodes[1]["state_after"]["budget"]["evidence"] == clients[1]["id"]
    assert len(data["evidence"]) == 6 and not any(
        e["id"] in {n["id"] for n in nodes} for e in data["evidence"]
    )
    assert nodes[-1]["state_after"] == data["need"]
    assert not any(
        key in str(nodes) for key in ("binding_sha256", "run_id", "protected_case_sha256", "session_id")
    )
    replay = await lab.episode(c["token"], c["frozen"], messages, key)
    assert replay["conversation"]["conversation_id"] == cid and len(captured) == 3
    after, retained = await stored(c, cid)
    assert original == (after.payload, after.need_revision, [(e.id, e.payload) for e in retained])
    async with db.transaction(bid, c["environment"]) as tx:
        assert not list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == cid)))
        assert not list(await tx.scalars(select(Job).where(Job.conversation_id == cid)))
        assert not list(await tx.scalars(select(Outbox)))


@pytest.mark.parametrize("change", ["missing_patch", "failed_reply", "terminal_state"])
async def test_actual_pg_conflicting_receipts_are_not_sent_to_quality(configured, monkeypatch, change):  # noqa: F811 - imported pytest fixture
    c = configured
    result, _, _, _ = await episode(c, monkeypatch)
    bid, cid = c["saved"]["business_id"], result["conversation"]["conversation_id"]
    # Prove positive authority first, so an unrelated baseline failure cannot
    # make the following targeted negative assertion pass.
    valid = await jobs.load_input(bid, cid)
    assert len([e for e in valid["timeline"] if e["kind"] == "need_patch"]) == 2
    assert valid["need"]["budget"]["value"] == "50"
    # Isolated QA fixture only. This is not a mutation of the operational history.
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        if change == "terminal_state":
            row = await tx.get(Conversation, cid)
            payload = deepcopy(row.payload)
            payload["need"]["budget"]["value"] = "999"
            row.payload = payload
        else:
            kind = "tool" if change == "missing_patch" else "customer_text_result"
            rows = list(
                await tx.scalars(
                    select(Event)
                    .where(Event.conversation_id == cid, Event.kind == kind)
                    .order_by(Event.sequence)
                )
            )
            if change == "missing_patch":
                receipt = next(e for e in rows if e.payload.get("name") == "need.patch")
                await tx.delete(receipt)
            else:
                payload = deepcopy(rows[-2].payload)
                payload["status"] = "failed"
                rows[-2].payload = payload
    with pytest.raises(ValueError, match="need_receipt_conflict"):
        await jobs.load_input(bid, cid)
    async with db.transaction(bid, c["environment"]) as tx:
        assert not list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == cid)))
        assert not list(await tx.scalars(select(Job).where(Job.conversation_id == cid)))
