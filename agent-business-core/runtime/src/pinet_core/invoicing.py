"""Deterministic monetary draft. No fiscal issuance, numbering or mail authority."""
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from html import escape
from typing import Literal

from pydantic import Field

from .contracts import Strict
from .security import digest


def money(value):
    if isinstance(value, (bool, float)):
        raise ValueError("exact_decimal_required")
    try:
        amount = Decimal(value)
        if not amount.is_finite() or amount < 0 or amount > Decimal("10000000"):
            raise ValueError("invalid_money")
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError):
        raise ValueError("invalid_money") from None


class Party(Strict):
    name: str = Field(min_length=2, max_length=150)
    kind: Literal["business", "consumer"]
    registration_code: str = Field(default="", max_length=50)
    address: str = Field(default="", max_length=300)
    vat_id: str = Field(default="", max_length=50)
    vat_registered: bool | None = None
    phone: str = Field(default="", max_length=50)


class Line(Strict):
    description: str = Field(min_length=3, max_length=300)
    quantity: int = Field(ge=1, le=10000, strict=True)
    unit: Literal["vnt.", "pasl."]
    unit_net_eur: str = Field(max_length=30)
    price_basis: Literal["net_excluding_vat"]
    source_quote_ref: str = Field(min_length=3, max_length=150)


class Draft(Strict):
    site_id: str = Field(min_length=3, max_length=100, pattern=r"^[a-z0-9-]+$")
    request_id: str = Field(min_length=3, max_length=100)
    issuer: Party
    buyer: Party
    document_date: date
    currency: Literal["EUR"]
    lines: list[Line] = Field(min_length=1, max_length=30)
    tax_treatment: Literal["unconfigured", "domestic_standard", "not_registered"]
    vat_rate_percent: str = Field(max_length=10)
    tax_policy_ref: str = Field(max_length=150)
    accepted_quote_ref: str = Field(max_length=150)
    synthetic: bool


def render(value: Draft):
    if ((value.tax_treatment == "not_registered" and value.issuer.vat_registered is True) or
            (value.tax_treatment == "domestic_standard" and value.issuer.vat_registered is False)):
        raise ValueError("issuer_tax_status_conflict")
    missing = []
    if value.issuer.kind != "business" or not value.issuer.registration_code or not value.issuer.address:
        missing.append("verified_issuer_details")
    if value.buyer.kind == "business" and (not value.buyer.registration_code or not value.buyer.address):
        missing.append("buyer_business_details")
    if not value.accepted_quote_ref:
        missing.append("accepted_quote")
    if not value.tax_policy_ref or value.tax_treatment == "unconfigured":
        missing.append("approved_tax_policy")
    if value.tax_treatment == "domestic_standard" and not value.issuer.vat_id:
        missing.append("issuer_vat_id")
    rate = money(value.vat_rate_percent)
    if rate > 100 or (value.tax_treatment == "not_registered" and rate != 0):
        raise ValueError("tax_policy_conflict")
    rows, net = [], Decimal("0")
    for line in value.lines:
        unit = money(line.unit_net_eur)
        if unit <= 0:
            raise ValueError("positive_price_required")
        total = money(unit * line.quantity)
        rows.append({"description": line.description, "quantity": line.quantity, "unit": line.unit,
                     "unit_net": str(unit), "net": str(total), "source_quote_ref": line.source_quote_ref})
        net += total
    tax = money(net * rate / 100) if value.tax_treatment != "unconfigured" else None
    gross = money(net + tax) if tax is not None else None
    # This prototype never assigns a fiscal invoice number, even with all fields.
    snapshot = {"site_id": value.site_id, "request_id": value.request_id, "document_type": "invoice_draft", "date": value.document_date.isoformat(),
        "currency": "EUR", "issuer": value.issuer.model_dump(), "buyer": value.buyer.model_dump(),
        "lines": rows, "net": str(net), "tax": str(tax) if tax is not None else None,
        "gross": str(gross) if gross is not None else None,
        "vat_rate_percent": str(rate) if value.tax_treatment != "unconfigured" else None,
        "tax_treatment": value.tax_treatment, "tax_policy_ref": value.tax_policy_ref,
        "accepted_quote_ref": value.accepted_quote_ref, "missing": missing, "synthetic": value.synthetic,
        "issued": False, "invoice_number": None, "payment_requested": False, "send_allowed": False}
    import json
    snapshot["hash"] = digest(json.dumps(snapshot, sort_keys=True))
    def cell(text):
        return escape(str(text))
    table = "".join(f"<tr><td>{cell(r['description'])}</td><td>{r['quantity']} {cell(r['unit'])}</td>"
                    f"<td>{r['unit_net']}</td><td>{r['net']}</td></tr>" for r in rows)
    tax_display = "Neskaičiuojamas" if value.tax_treatment == "not_registered" else (str(tax) + " EUR" if tax is not None else "Tikslinama")
    html = f'''<!doctype html><html lang="lt"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
    <title>Išankstinė sąskaita</title><style>body{{font:16px system-ui;max-width:900px;margin:40px auto;padding:24px;color:#26362d}}
    .notice{{background:#fff1c9;padding:18px}}table{{width:100%;border-collapse:collapse;margin:30px 0}}td,th{{border-bottom:1px solid #ddd;padding:14px;text-align:left}}h1{{font-size:32px}}.sum{{text-align:right}}@media print{{body{{margin:0}}}}</style>
    <h1>Išankstinė sąskaita</h1><p>PF-{value.document_date.strftime('%Y%m%d')}-{snapshot['hash'][:8].upper()} · {cell(value.document_date)} · EUR</p>
    <h2>Pardavėjas</h2><p>{cell(value.issuer.name)}<br>{cell(value.issuer.registration_code or 'Kodas nepatvirtintas')}<br>{cell(value.issuer.address or 'Adresas nepatvirtintas')}<br>{cell(value.issuer.phone)}</p>
    <h2>Pirkėjas</h2><p>{cell(value.buyer.name)}<br>{cell(value.buyer.registration_code)}<br>{cell(value.buyer.address)}</p>
    <table><tr><th>Prekė / paslauga</th><th>Kiekis</th><th>Vnt. be PVM</th><th>Suma be PVM</th></tr>{table}</table>
    <div class="sum"><p>Be PVM: {net:.2f} EUR</p><p>PVM: {cell(tax_display)}</p>
    <h2>Iš viso: {cell(snapshot['gross'] if gross is not None else 'nepatvirtinta')} EUR</h2></div>
    <p>Ačiū, kad kreipėtės. Dėl užsakymo detalių susisieksime el. paštu.</p></html>'''
    return snapshot, html


def resale_price(landed_net, markup_percent):
    cost, markup = money(landed_net), money(markup_percent)
    if markup > 100:
        raise ValueError("markup_outside_declared_range")
    # Markup on cost is distinct from gross-margin percentage.
    return money(cost * (1 + markup / 100))
