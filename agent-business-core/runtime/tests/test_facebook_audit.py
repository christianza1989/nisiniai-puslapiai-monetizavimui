"""Adversarial replay tests for the private Facebook preparation queue."""
from datetime import timedelta

import pytest
import test_facebook
from test_facebook import base, headers, queue, seed

from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.facebook import service as fb
from pinet_core.models import utcnow
from pinet_core.service import business


@pytest.fixture
async def fb_audit_client(client):
    async for active in test_facebook.fb_client.__wrapped__(client):
        yield active


@pytest.mark.parametrize("legacy_hash", [False, True])
async def test_action_replay_keeps_id_when_signal_ages(fb_audit_client, monkeypatch, legacy_hash):
    fb_client = fb_audit_client
    signal = await seed(fb_client, reuse="allowed", data_class="permitted")
    instant = utcnow()
    item = await business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        row = await fb.by_id(tx, "signal", signal["id"])
        row.payload = {**row.payload, "published_at": instant.isoformat()}
    first = await queue(fb_client, signal)
    if legacy_hash:
        async with db.transaction(item.id, settings().environment) as tx:
            action = await fb.by_id(tx, "action", first["id"])
            original = {"key": "qa-action", "signal_id": signal["id"], "kind": "comment_draft",
                        "qualification": first["qualification"]}
            action.payload = {**action.payload, "input_hash": fb.fingerprint(original)}
    monkeypatch.setattr(fb, "utcnow", lambda: instant + timedelta(days=15))
    response = await fb_client.post(base() + "/actions", headers=headers(), json={
        "key": "qa-action", "signal_id": signal["id"], "kind": "comment_draft"})
    assert response.status_code == 200, response.text
    assert response.json()["id"] == first["id"]
    assert response.json()["qualification"] == first["qualification"]
    conflict = await fb_client.post(base() + "/actions", headers=headers(), json={
        "key": "qa-action", "signal_id": signal["id"], "kind": "join_draft"})
    assert conflict.status_code == 409
