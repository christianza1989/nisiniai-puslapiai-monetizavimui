import smtplib

import pytest
from conftest import claim, edge, start, utterance
from sqlalchemy import select
from test_core import drain
from test_policy import configure

from pinet_core import jobs
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import Artifact, KnowledgeState, Outbox
from pinet_core.service import business


async def prepared(client, monkeypatch):
    session = await start(client)
    epoch = await claim(client, session)
    await utterance(client, session, epoch)
    await edge(client, "POST", "traktoriupadangos", session, "/contact", {
        "channel": "email", "value": "delivery-fixture@example.org", "consent": True, "notice_version": "test-only"})
    await edge(client, "POST", "traktoriupadangos", session, "/end")
    item = await business("traktoriupadangos")
    await drain(item.id)
    assert (await configure(client, enabled=True, followup_enabled=True)).status_code == 200
    monkeypatch.setattr(settings(), "smtp_enabled", True)
    async with db.transaction(item.id, settings().environment) as tx:
        artifact = await tx.scalar(select(Artifact).where(Artifact.kind == "followup"))
        # The SMTP function is mocked in every test. This only exercises transport guards.
        artifact.payload = {**artifact.payload, "test": False}
    return item


@pytest.mark.parametrize("outcome,expected", [("success", "accepted"), ("refusal", "rejected"),
                                              ("data_refusal", "rejected"), ("ambiguous", "unknown")])
async def test_outbox_never_blindly_resends_after_transport_attempt(client, monkeypatch, outcome, expected):
    item = await prepared(client, monkeypatch)
    sends = []

    def fake_send(recipient, content, message_id):
        sends.append(message_id)
        if outcome == "refusal":
            raise smtplib.SMTPRecipientsRefused({"private-fixture@example.org": (550, b"refused")})
        if outcome == "data_refusal":
            raise smtplib.SMTPDataError(550, b"refused")
        if outcome == "ambiguous":
            raise smtplib.SMTPServerDisconnected("synthetic loss after possible DATA acceptance")
    monkeypatch.setattr(jobs, "smtp_send", fake_send)
    assert await jobs.deliver_one(item.id) is True
    assert await jobs.deliver_one(item.id) is False
    assert len(sends) == 1
    async with db.transaction(item.id, settings().environment) as tx:
        outbox = await tx.scalar(select(Outbox))
        assert outbox.state == expected and outbox.payload["message_id"] == sends[0]
        assert "private-fixture@example.org" not in str(outbox.payload)


async def test_changed_body_blocked_even_if_stored_hash_unchanged(client, monkeypatch):
    item = await prepared(client, monkeypatch)
    sends = []
    monkeypatch.setattr(jobs, "smtp_send", lambda *args: sends.append(args))
    async with db.transaction(item.id, settings().environment) as tx:
        artifact = await tx.scalar(select(Artifact).where(Artifact.kind == "followup"))
        artifact.payload = {**artifact.payload, "body": artifact.payload["body"] + "Unvalidated modification"}
    assert await jobs.deliver_one(item.id)
    assert sends == []
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.scalar(select(Outbox))).state == "blocked_test_or_hash"


async def test_withdrawn_source_blocks_already_prepared_letter(client, monkeypatch):
    item = await prepared(client, monkeypatch)
    sends = []
    monkeypatch.setattr(jobs, "smtp_send", lambda *args: sends.append(args))
    async with db.transaction(item.id, settings().environment) as tx:
        state = await tx.scalar(select(KnowledgeState))
        state.payload = {**state.payload, "revoked": ["a" * 64]}
    assert await jobs.deliver_one(item.id)
    assert sends == []
    async with db.transaction(item.id, settings().environment) as tx:
        assert (await tx.scalar(select(Outbox))).state == "blocked_revoked_source"
