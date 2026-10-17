"""Synthetic three-message canonical Case through normal owner mail HTTP.

Real restricted PostgreSQL/API; inert preparation/reply labs and manually reviewed
translation fixtures. No model provider, SMTP/IMAP, operating admission or UI proof.
"""
from copy import deepcopy

import pytest
from sqlalchemy import select, text

from acceptance_tests.test_acquisition_correspondence import CONFIG
from acceptance_tests.test_acquisition_correspondence import lane as correspondence_lane
from acceptance_tests.test_acquisition_headless import ReplyLab, reply_lane
from pinet_core.db import db
from pinet_core.mail_view.translations import POLICY_SHA, Record, TranslatedText, retain, source_digest
from pinet_core.models import MailMessage, utcnow

pytestmark = pytest.mark.skipif(not CONFIG, reason="Explicit Root-owned isolated acquisition QA config required")
lane = correspondence_lane


async def test_three_bound_messages_and_lithuanian_sidecars_are_visible_to_current_owner(lane, monkeypatch, tmp_path):
    monkeypatch.setattr(lane.cfg, "mail_display_directory", str(tmp_path))
    bridge, captured, received, request = await reply_lane(lane)
    lab = ReplyLab()
    replied = await bridge.reply_to_case(**request, lab=lab)
    assert lab.calls == 2 and replied["receipt"]["state"] == "reply_ready"
    first, incoming, outgoing = captured["receipt"]["mail_id"], received["receipt"]["mail_id"], replied["outbound_mail_id"]
    case_id = captured["receipt"]["case_id"]
    headers = {"Authorization": "Bearer " + lane.token}
    base = f"/operator/v2/businesses/{lane.scope.business_id}/mail"
    assert (await lane.client.get(base)).status_code == 401
    response = await lane.client.get(base + "?case_id=" + case_id, headers=headers)
    assert response.status_code == 200, response.text
    items = response.json()["data"]["items"]
    assert len(items) == 3 and {row["mail_id"] for row in items} == {first, incoming, outgoing}
    assert all(row["case_id"] == case_id and row["synthetic"] is True and row["state"] == "captured" for row in items)
    assert {row["direction"] for row in items} == {"inbound", "outbound"}
    before = {}
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        for row in await tx.scalars(select(MailMessage)):
            before[row.id] = deepcopy(row.payload)
            assert row.payload["external_sent"] is False
    translations = {
        first: ("Sintetinė bandomoji užklausa", "Ar norėtumėte peržiūrėti sintetines bandymo sąlygas?"),
        incoming: ("Prašomi reikalavimai ir klausimas apie privatumą", "Ar galėtumėte patikslinti dabartines bandymo sąlygas?\n"),
        outgoing: ("Jūsų klausimas apie bandymą", "Tai sintetinės bandymo sąlygos, skirtos tik pirminio kodo patikrai. Kurį reikalavimą norėtumėte patikslinti?"),
    }
    for mail_id, (subject, body) in translations.items():
        detail_path = base + "/" + mail_id
        original_response = await lane.client.get(detail_path, headers=headers)
        assert original_response.status_code == 200, original_response.text
        original = original_response.json()["data"]
        assert original["body"] == before[mail_id]["body"] and original["translation"]["status"] == "missing"
        retain(tmp_path, Record(version="mail-display-translation.v1", business_id=lane.scope.business_id,
            environment=lane.scope.environment_id, mail_id=mail_id,
            source_sha256=source_digest(lane.scope.business_id, lane.scope.environment_id, original),
            target_language="lt", translated_at=utcnow(), model="gpt-6.1-sol", reasoning_effort="high",
            instruction_sha256=POLICY_SHA, text=TranslatedText(subject=subject, body=body),
            usage={"input_tokens": 0, "output_tokens": 0}), original)
        translated = await lane.client.get(detail_path, headers=headers)
        assert translated.status_code == 200, translated.text
        detail = translated.json()["data"]
        assert detail["translation"]["status"] == "ready" and detail["translation"]["body"] == body
        assert detail["body"] == original["body"] and detail["subject"] == original["subject"]
    assert await bridge.reply_to_case(**request, lab=lab) == replied and lab.calls == 2
    async with db.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        after = {row.id: row.payload for row in await tx.scalars(select(MailMessage))}
    assert after == before
    async with lane.admin.begin() as tx:
        await tx.execute(text("UPDATE control_business_grants SET enabled=false WHERE id=:id AND environment_id=:e"),
            {"id": lane.ids["grant"], "e": lane.scope.environment_id})
    assert (await lane.client.get(base + "/" + outgoing, headers=headers)).status_code == 404
    assert (await lane.client.get(base + "?case_id=" + case_id, headers=headers)).status_code == 404
