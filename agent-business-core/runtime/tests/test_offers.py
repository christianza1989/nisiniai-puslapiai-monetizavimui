import json
from datetime import date
from pathlib import Path

import pytest

from pinet_core.offers import OfferSnapshot, email_html, match, preliminary_options

ROOT = Path(__file__).resolve().parents[1]


def fixture():
    return OfferSnapshot.model_validate_json((ROOT / "evals/public-offers.json").read_text(encoding="utf-8"))


def test_exact_specification_and_day_and_scope_required():
    snapshot = fixture()
    need = {"tyre_marking": {"value": "420/85R28"}}
    assert len(match(snapshot, need, snapshot.site_id, today=date(2026, 10, 1))) == 2
    assert not match(snapshot, need, snapshot.site_id, today=date(2026, 10, 2))
    assert not match(snapshot, {"tyre_marking": {"value": "420/70R28"}}, snapshot.site_id, today=date(2026, 10, 1))
    assert not match(snapshot, {}, snapshot.site_id, today=date(2026, 10, 1))
    with pytest.raises(ValueError, match="cross_site"):
        match(snapshot, need, "greitossvetaines")


def test_same_renderer_works_for_service_profile():
    value = fixture().model_dump(mode="json")
    value.update(site_id="greitossvetaines", checked_at=date.today().isoformat(), required_match_fields=["website_type"])
    value["offers"] = [value["offers"][0]]
    value["offers"][0].update(product="Svetainės darbų testinis variantas", attributes={"website_type": "landing"})
    snapshot = OfferSnapshot.model_validate(value)
    text, ids = preliminary_options({"website_type": {"value": "landing"}, "quantity": {"value": "2"}}, snapshot, "greitossvetaines")
    assert ids == ["gtk-lt"] and "1168.10 EUR" in text
    assert "Svetainės darbų testinis variantas" in text


def test_mail_markup_is_not_executable():
    html = email_html('<script>alert(1)</script> https://example.com/a?b=1&c=2', 'Testas <img onerror="x">')
    assert "<script>" not in html and "<img" not in html
    assert 'href="https://example.com/a?b=1&amp;c=2"' in html
    json.dumps(fixture().model_dump(mode="json"))


def test_unknown_vat_not_presented_as_included():
    value = fixture().model_dump(mode="json")
    value["checked_at"] = date.today().isoformat()
    value["offers"] = [value["offers"][0]]
    value["offers"][0]["display_vat"] = "unknown"
    text, _ = preliminary_options({"tyre_marking": {"value": "420/85 R28"}}, OfferSnapshot.model_validate(value), value["site_id"])
    assert "PVM pagrindas šaltinyje nepatvirtintas" in text
    assert "su PVM, kaip rodoma" not in text


def test_our_retail_price_has_markup_without_supplier_projection():
    from pinet_core.offers import PricingPolicy, retail_options
    value = fixture().model_dump(mode='json')
    value['checked_at'] = date.today().isoformat()
    policy = PricingPolicy(site_id=value['site_id'], markup_percent='15',
        cost_basis='displayed_gross_nonrecoverable_vat', seller_vat_registered=False,
        policy_ref='fixture-pricing', synthetic_only=True)
    need = {'tyre_marking': {'value': '420/85 R28'}, 'quantity': {'value': '2'}}
    text, items = retail_options(need, OfferSnapshot.model_validate(value), value['site_id'], policy)
    assert items[0]['unit_price'] == '671.66' and items[0]['total'] == '1343.32'
    assert '671.66' in text and 'https://' not in text and '584.05' not in text
    assert all(offer['seller'] not in text for offer in value['offers'])
    assert items[0]['internal']['source_url'] == value['offers'][0]['url']
    other = policy.model_copy(update={'site_id': 'greitossvetaines'})
    with pytest.raises(ValueError, match='cross_site_pricing'):
        retail_options(need, OfferSnapshot.model_validate(value), value['site_id'], other)
    for offer in value['offers']:
        offer['display_vat'] = 'unknown'
    assert retail_options(need, OfferSnapshot.model_validate(value), value['site_id'], policy)[1] == []
