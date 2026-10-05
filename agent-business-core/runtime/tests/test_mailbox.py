import pytest

from pinet_core import mailbox, service
from pinet_core.config import settings
from pinet_core.db import db
from pinet_core.models import MailMessage


def auth():
    return {"Authorization": "Bearer " + settings().operator_secret}


async def draft(client, recipient="owner@example.org", site="traktoriupadangos"):
    response = await client.post(f"/operator/sites/{site}/mail", headers=auth(), json={
        "recipient": recipient, "subject": "Preliminarūs testiniai variantai", "body": "Tai sintetinė kliento užklausa.",
        "source_ref": "explicit-test-source"})
    assert response.status_code == 200, response.text
    return response.json()


async def test_mail_private_and_cross_site_hidden(client):
    message = await draft(client)
    path = "/operator/sites/traktoriupadangos/mail/" + message["id"]
    assert (await client.get(path)).status_code == 401
    assert (await client.get(path, headers={"Authorization": "Bearer " + settings().worker_secret})).status_code == 401
    assert (await client.get(path.replace("traktoriupadangos", "greitossvetaines"), headers=auth())).status_code == 404
    assert (await client.get("/operator/sites/greitossvetaines/mail", headers=auth())).json()["messages"] == []


async def test_owner_test_transport_local_only(client, monkeypatch):
    message = await draft(client)
    cfg = settings()
    for key, value in {"environment": cfg.environment, "lab_mail_enabled": True, "lab_mail_recipient": "owner@example.org",
                       "smtp_user": "fixture", "smtp_password": "fixture"}.items():
        monkeypatch.setattr(cfg, key, value)
    # Live transport is local-only, so test the scope gate first.
    response = await client.post(f"/operator/sites/traktoriupadangos/mail/{message['id']}/send-test", headers=auth())
    assert response.status_code == 503


async def test_unknown_delivery_not_retried_and_wrong_recipient_blocked(client, monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "lab_mail_recipient", "owner@example.org")
    # Isolated fixture scope; transport substituted, no network.
    monkeypatch.setattr(mailbox, "test_transport_ready", lambda cfg: True)
    calls = []

    def uncertain(*args):
        calls.append(True)
        raise TimeoutError("fixture_uncertain_after_data")

    monkeypatch.setattr(mailbox, "smtp_test", uncertain)
    wrong = await draft(client, recipient="someone@example.org")
    response = await client.post(f"/operator/sites/traktoriupadangos/mail/{wrong['id']}/send-test", headers=auth())
    assert response.status_code == 409 and not calls
    good = await draft(client)
    path = f"/operator/sites/traktoriupadangos/mail/{good['id']}/send-test"
    assert (await client.post(path, headers=auth())).json()["state"] == "delivery_unknown"
    assert (await client.post(path, headers=auth())).json()["state"] == "delivery_unknown"
    assert len(calls) == 1


async def test_reply_is_in_same_case_and_deduplicated(client):
    value = await draft(client)
    item = await service.business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        original = await tx.get(MailMessage, value["id"])
        one = await mailbox.receive_reply(tx, original, "<fixture-reply@example.org>", "owner@example.org", "Re: testas", "Domina antras variantas.")
        again = await mailbox.receive_reply(tx, original, "<fixture-reply@example.org>", "owner@example.org", "Re: testas", "Domina antras variantas.")
        assert one.id == again.id and one.case_id == original.case_id
        with pytest.raises(ValueError, match="participant"):
            await mailbox.receive_reply(tx, original, "<foreign@example.org>", "foreign@example.org", "Svetimas", "Ne tas klientas.")


async def test_draft_conflicts_do_not_overwrite(client):
    value = await draft(client)
    item = await service.business("traktoriupadangos")
    async with db.transaction(item.id, settings().environment) as tx:
        same = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=value["case_id"], recipient="owner@example.org",
            subject="Preliminarūs testiniai variantai", body="Tai sintetinė kliento užklausa.", source_ref="explicit-test-source"))
        assert same.id == value["id"]
    response = await client.post("/operator/sites/traktoriupadangos/mail", headers=auth(), json={
        "case_id": value["case_id"], "recipient": "owner@example.org", "subject": "Pakeistas turinys",
        "body": "Naujas turinys tuo pačiu source ref.", "source_ref": "explicit-test-source"})
    assert response.status_code == 409


async def test_customer_offer_cannot_publish_supplier_source_link(client):
    payload = {'recipient': 'owner@example.org', 'subject': 'Jūsų pasiūlymas',
        'body': 'Prekė siūloma čia: https://supplier.example.org/product', 'source_ref': 'private-supplier-source'}
    path = '/operator/sites/traktoriupadangos/mail'
    response = await client.post(path, headers=auth(), json=payload)
    assert response.status_code == 409
    payload['body'] = 'Apie padangas: https://traktoriupadangos.lt/'
    response = await client.post(path, headers=auth(), json=payload)
    assert response.status_code == 200
    assert response.json()['customer_facing'] and '[TEST' not in response.json()['subject']
