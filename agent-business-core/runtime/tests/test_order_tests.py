from uuid import uuid4

from pinet_core import order_tests
from pinet_core.config import settings


def auth():
    return {"Authorization": "Bearer " + settings().operator_secret}


def quote():
    return {"request_id": str(uuid4()), "buyer": {"name": "Testinis klientas", "kind": "consumer"},
        "currency": "EUR", "synthetic": True,
        "lines": [{"description": "Testinė bendro core paslauga", "quantity": 2, "unit": "pasl.",
                   "unit_net_eur": "10.00", "price_basis": "net_excluding_vat", "source_quote_ref": "synthetic-only"}]}


def profile(tax="unconfigured"):
    return {"issuer": {"name": "TEST Įmonė", "kind": "business", "registration_code": "TESTCODE", "address": "TEST Adresas"},
        "tax_treatment": tax, "vat_rate_percent": "0", "tax_policy_ref": "synthetic-tax-policy" if tax != "unconfigured" else ""}


async def test_confirmation_exact_version_and_tax_gate(client, monkeypatch):
    monkeypatch.setattr(order_tests, "issuer_profile", profile)
    path = "/operator/sites/traktoriupadangos/order-tests"
    payload = quote()
    assert (await client.post(path, json=payload)).status_code == 401
    created = (await client.post(path, json=payload, headers=auth())).json()
    again = (await client.post(path, json=payload, headers=auth())).json()
    assert again["quote_hash"] == created["quote_hash"] and again["case_id"] == created["case_id"]
    confirmation = {"quote_hash": "0" * 64, "confirmation_text": "Patvirtinu testą", "synthetic": True}
    action = path + "/" + created["case_id"] + "/confirm"
    assert (await client.post(action, json=confirmation, headers=auth())).status_code == 409
    assert (await client.post(action.replace("traktoriupadangos", "greitossvetaines"), json=confirmation, headers=auth())).status_code == 404
    confirmation["quote_hash"] = created["quote_hash"]
    result = (await client.post(action, json=confirmation, headers=auth())).json()
    assert result["state"] == "invoice_draft_pending_configuration" and result["mail_id"] is None
    assert result["invoice_snapshot"]["gross"] is None and not result["real_order_created"]


async def test_other_business_confirmation_prepares_invoice_mail_once(client, monkeypatch):
    monkeypatch.setattr(order_tests, "issuer_profile", lambda: profile("not_registered"))
    monkeypatch.setattr(settings(), "lab_mail_recipient", "owner@example.org")
    path = "/operator/sites/greitossvetaines/order-tests"
    created = (await client.post(path, json=quote(), headers=auth())).json()
    action = path + "/" + created["case_id"] + "/confirm"
    confirmation = {"quote_hash": created["quote_hash"], "confirmation_text": "Testinis patvirtinimas", "synthetic": True}
    result = (await client.post(action, json=confirmation, headers=auth())).json()
    assert result["state"] == "invoice_test_ready" and result["invoice_snapshot"]["gross"] == "20.00"
    assert not result["invoice_snapshot"]["issued"]
    again = (await client.post(action, json=confirmation, headers=auth())).json()
    assert again["mail_id"] == result["mail_id"]
    messages = (await client.get("/operator/sites/greitossvetaines/mail", headers=auth())).json()["messages"]
    assert len(messages) == 1 and messages[0]["state"] == "draft"
    detail = (await client.get('/operator/sites/greitossvetaines/mail/' + result['mail_id'], headers=auth())).json()
    assert 'TEST' not in detail['subject'] and 'sintetin' not in detail['body'].lower()
    assert detail['attachments'][0]['content_type'] == 'application/pdf'
    download = '/operator/sites/greitossvetaines/mail/' + result['mail_id'] + '/attachments/0'
    assert (await client.get(download)).status_code == 401
    assert (await client.get(download.replace('greitossvetaines', 'traktoriupadangos'), headers=auth())).status_code == 404
    response = await client.get(download, headers=auth())
    assert response.status_code == 200 and response.content.startswith(b'%PDF-')
    assert response.headers['content-type'] == 'application/pdf'
    assert 'no-store' in response.headers['cache-control']
