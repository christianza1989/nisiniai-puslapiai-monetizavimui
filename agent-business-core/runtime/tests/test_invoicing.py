from copy import deepcopy
from decimal import Decimal
from pathlib import Path

import pytest
from pydantic import ValidationError

from pinet_core.invoicing import Draft, money, render, resale_price

ROOT = Path(__file__).resolve().parents[1]


def fixture():
    return Draft.model_validate_json((ROOT / "evals/invoice-draft.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("bad", [True, 0.1, "NaN", "Infinity", "-1", "10000001"])
def test_invalid_money(bad):
    with pytest.raises(ValueError):
        money(bad)


def test_draft_never_issues_and_unknown_tax_not_guessed():
    snapshot, _ = render(fixture())
    assert snapshot["net"] == "1000.00"
    assert snapshot["gross"] is None and snapshot["tax"] is None
    assert snapshot["vat_rate_percent"] is None
    assert {"verified_issuer_details", "accepted_quote", "approved_tax_policy"} <= set(snapshot["missing"])
    assert not snapshot["issued"] and not snapshot["send_allowed"]
    assert snapshot["invoice_number"] is None and not snapshot["payment_requested"]


def test_explicit_synthetic_tax_math_and_site_independent():
    value = fixture().model_dump(mode="json")
    value.update(site_id="greitossvetaines", tax_treatment="domestic_standard", vat_rate_percent="21",
                 tax_policy_ref="synthetic-tax-21", accepted_quote_ref="synthetic-accepted")
    value["issuer"].update(registration_code="TEST", address="Sintetinis adresas", vat_id="TESTVAT")
    value["lines"][0].update(description="Svetainės kūrimo testinė paslauga", unit="pasl.", unit_net_eur="10.005")
    snapshot, html = render(Draft.model_validate(value))
    assert snapshot["net"] == "20.02" and snapshot["tax"] == "4.20" and snapshot["gross"] == "24.22"
    assert snapshot["site_id"] == "greitossvetaines" and not snapshot["issued"]
    assert "Išankstinė sąskaita" in html and 'SINTETINIS' not in html


def test_markup_is_on_cost_not_margin():
    assert resale_price("440.00", "15") == Decimal("506.00")
    with pytest.raises(ValueError):
        resale_price("440", "101")


def test_explicit_non_vat_test_profile_and_conflicting_status():
    value = fixture().model_dump(mode="json")
    value.update(tax_treatment="not_registered", tax_policy_ref="owner-temporary-test")
    value["issuer"]["vat_registered"] = False
    snapshot, html = render(Draft.model_validate(value))
    assert snapshot["net"] == snapshot["gross"] == "1000.00" and snapshot["tax"] == "0.00"
    assert "Neskaičiuojamas" in html and not snapshot["issued"]
    value["issuer"]["vat_registered"] = True
    with pytest.raises(ValueError, match="issuer_tax_status_conflict"):
        render(Draft.model_validate(value))


def test_input_and_html_escape_and_date():
    value = fixture().model_dump(mode="json")
    value["buyer"]["name"] = '<script>alert("unsafe")</script>'
    one, html = render(Draft.model_validate(value))
    assert "<script>" not in html and "&lt;script&gt;" in html
    assert render(Draft.model_validate(value))[0]["hash"] == one["hash"]
    other = deepcopy(value)
    other["site_id"] = "greitossvetaines"
    assert render(Draft.model_validate(other))[0]["hash"] != one["hash"]
    value["document_date"] = "2026-02-30"
    with pytest.raises(ValidationError):
        Draft.model_validate(value)


def test_gross_price_cannot_silently_be_net():
    value = fixture().model_dump(mode="json")
    value["lines"][0]["price_basis"] = "VAT_included"
    with pytest.raises(ValidationError):
        Draft.model_validate(value)
    value = fixture().model_dump(mode="json")
    value.update(tax_treatment="not_registered", vat_rate_percent="21")
    with pytest.raises(ValueError, match="tax_policy_conflict"):
        render(Draft.model_validate(value))
