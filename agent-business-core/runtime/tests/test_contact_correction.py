import asyncio

import pytest
from conftest import claim, edge, start, utterance
from sqlalchemy import select
from test_core import drain

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Artifact, Contact, Event, Outbox
from pinet_core.service import business


def contact(value="before@example.org", revision=None):
    return {"channel": "email", "value": value, "consent": True, "notice_version": "test-only",
            **({"base_revision": revision} if revision is not None else {})}


async def test_correction_supersedes_prepared_recipient_and_rebuilds_revision(client):
    session = await start(client)
    epoch = await claim(client, session)
    await utterance(client, session, epoch)
    assert (await edge(client, "POST", "traktoriupadangos", session, "/contact", contact())).json()["revision"] == 1
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    await drain(item.id)
    corrected = contact("after@example.org", 1)
    assert (await edge(client, "POST", "traktoriupadangos", session, "/contact", corrected)).json()["revision"] == 2
    assert (await edge(client, "POST", "traktoriupadangos", session, "/contact", corrected)).json()["revision"] == 2
    await drain(item.id)
    async with db.transaction(item.id, settings().environment) as tx:
        rows = list(await tx.scalars(select(Outbox).order_by(Outbox.created_at)))
        assert [r.state for r in rows] == ["superseded_contact", "prepared"]
        assert rows[-1].payload["contact_revision"] == 2
        assert (await tx.scalar(select(Contact))).value == "after@example.org"
        assert sorted(await tx.scalars(select(Artifact.revision).where(Artifact.kind == "followup"))) == [1, 2]
        assert "after@example.org" not in str([e.payload for e in await tx.scalars(select(Event))])


async def test_concurrent_different_contact_corrections_need_current_revision(client):
    session = await start(client)
    await edge(client, "POST", "traktoriupadangos", session, "/contact", contact())
    results = await asyncio.gather(*(edge(client, "POST", "traktoriupadangos", session, "/contact",
        contact(f"revision-{i}@example.org", 1)) for i in range(4)))
    assert sorted(r.status_code for r in results) == [200, 409, 409, 409]


@pytest.mark.parametrize("state", ["dispatched", "accepted", "unknown"])
async def test_started_delivery_cannot_have_its_recipient_replaced(client, state):
    session = await start(client)
    await edge(client, "POST", "traktoriupadangos", session, "/contact", contact())
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        tx.add(Outbox(conversation_id=session["conversation_id"], business_id=item.id,
            environment_id=settings().environment, kind="email", action_key="explicit-fixture:" + session["conversation_id"],
            state=state, payload={"test": True}))
    result = await edge(client, "POST", "traktoriupadangos", session, "/contact", contact("after@example.org", 1))
    assert result.status_code == 409 and result.json()["detail"] == "contact_delivery_started"
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.scalar(select(Contact))).value == "before@example.org"
