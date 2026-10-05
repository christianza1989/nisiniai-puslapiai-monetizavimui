"""Generic, owner-only test quote acceptance -> deterministic invoice -> mail draft.

No real orders, fiscal numbers or payment requests. Tax configuration is authoritative.
"""
import json
from base64 import b64encode
from datetime import timedelta
from pathlib import Path
from typing import Literal
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

from fastapi import HTTPException
from pydantic import Field

from . import invoice_pdf, invoicing, mailbox
from .config import settings
from .contracts import Strict
from .models import Case, utcnow
from .security import digest


class QuoteInput(Strict):
    request_id: UUID = Field(default_factory=uuid4)
    case_id: str | None = None
    buyer: invoicing.Party
    currency: Literal["EUR"]
    lines: list[invoicing.Line] = Field(min_length=1, max_length=30)
    synthetic: Literal[True]


class Confirmation(Strict):
    quote_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    confirmation_text: str = Field(min_length=3, max_length=500)
    synthetic: Literal[True]


def test_only():
    if settings().environment != "local" and not settings().environment.startswith("test-"):
        raise HTTPException(503, "owner_local_test_only")


def issuer_profile():
    path = Path(__file__).resolve().parents[2] / "artifacts/billing/provisional-issuer.json"
    if not path.is_file():
        raise HTTPException(503, "issuer_profile_missing")
    return json.loads(path.read_text(encoding="utf-8"))


async def prepare(tx, item, value: QuoteInput):
    test_only()
    case_id = value.case_id or str(uuid5(NAMESPACE_URL, item.site_id + ":order-test:" + str(value.request_id)))
    case = await tx.get(Case, case_id, with_for_update=True)
    if value.case_id and not case:
        raise HTTPException(404, "case_unavailable")
    if not case:
        case = Case(id=case_id, business_id=item.id, environment_id=settings().environment,
                    payload={"test": True, "source": "owner_order_test"})
        tx.add(case)
        await tx.flush()
    if not case.payload.get("test"):
        raise HTTPException(409, "synthetic_case_required")
    data = value.model_dump(mode="json")
    fingerprint = digest(json.dumps(data, sort_keys=True))
    previous = case.payload.get("order_test")
    if previous and previous["request_id"] == data["request_id"]:
        if previous["hash"] != fingerprint:
            raise HTTPException(409, "quote_request_conflict")
        return {"case_id": case.id, "quote_hash": previous["hash"], "state": previous["state"]}
    if previous and previous["state"] != "awaiting_test_confirmation":
        raise HTTPException(409, "confirmed_test_quote_immutable")
    case.payload = {**case.payload, "order_test": {**data, "hash": fingerprint,
        "expires_at": (utcnow() + timedelta(minutes=30)).isoformat(), "state": "awaiting_test_confirmation"}}
    return {"case_id": case.id, "quote_hash": fingerprint, "state": "awaiting_test_confirmation",
            "real_order_created": False}


async def confirm(tx, item, case_id, value: Confirmation):
    from datetime import datetime
    test_only()
    case = await tx.get(Case, case_id, with_for_update=True)
    if not case or not case.payload.get("test") or not case.payload.get("order_test"):
        raise HTTPException(404, "test_quote_unavailable")
    quote = dict(case.payload["order_test"])
    if quote["hash"] != value.quote_hash:
        raise HTTPException(409, "quote_revision_conflict")
    if quote["state"] == "invoice_test_ready":
        return {"case_id": case.id, "state": quote["state"], "mail_id": quote["mail_id"], "real_order_created": False}
    if datetime.fromisoformat(quote["expires_at"]) <= utcnow():
        raise HTTPException(409, "test_quote_expired")
    profile = issuer_profile()
    document = invoicing.Draft.model_validate({"site_id": item.site_id, "request_id": "test-" + quote["hash"],
        "issuer": profile["issuer"], "buyer": quote["buyer"], "document_date": utcnow().date().isoformat(),
        "currency": quote["currency"], "lines": quote["lines"], "tax_treatment": profile["tax_treatment"],
        "vat_rate_percent": profile["vat_rate_percent"], "tax_policy_ref": profile["tax_policy_ref"],
        "accepted_quote_ref": "synthetic-confirmation:" + quote["hash"], "synthetic": True})
    snapshot, html = invoicing.render(document)
    quote.update(confirmation_text=value.confirmation_text, confirmed_at=utcnow().isoformat())
    if snapshot["missing"]:
        quote["state"] = "invoice_draft_pending_configuration"
        case.payload = {**case.payload, "order_test": quote, "invoice_test": {"snapshot": snapshot, "html": html}}
        return {"case_id": case.id, "state": quote["state"], "missing": snapshot["missing"],
                "invoice_snapshot": snapshot, "mail_id": None, "real_order_created": False}
    if not settings().lab_mail_recipient:
        raise HTTPException(503, "owner_test_recipient_not_configured")
    pdf = invoice_pdf.render(snapshot)
    body = "Sveiki,\n\nDėkojame už jūsų patvirtinimą. Prisegame išankstinę sąskaitą PDF formatu pagal pasirinktą pasiūlymą.\n\n"
    body += f"Išrašytojas: {document.issuer.name}.\nBendra suma: {snapshot['gross']} EUR.\n\n"
    body += "Jei norėtumėte patikslinti pirkėjo duomenis ar užsakymo detales, atsakykite į šį laišką.\n\nPagarbiai,\n" + document.issuer.name
    message = await mailbox.prepare(tx, item, mailbox.DraftInput(case_id=case.id,
        recipient=settings().lab_mail_recipient, subject="Jūsų išankstinė sąskaita",
        body=body, source_ref="invoice-pdf:" + snapshot["hash"]))
    message.payload = {**message.payload, "attachments": [{"filename": "isankstine-saskaita.pdf",
        "content_type": "application/pdf", "content_base64": b64encode(pdf).decode('ascii')}]}
    message.payload = {**message.payload, "hash": mailbox.fingerprint(message.payload)}
    quote.update(state="invoice_test_ready", mail_id=message.id)
    case.payload = {**case.payload, "order_test": quote, "invoice_test": {"snapshot": snapshot, "html": html}}
    return {"case_id": case.id, "state": quote["state"], "mail_id": message.id,
            "invoice_snapshot": snapshot, "real_order_created": False}
