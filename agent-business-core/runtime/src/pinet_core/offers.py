"""Generic public-price evidence for preliminary local offers; no commercial writes."""
import re
from datetime import date
from html import escape
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator

from .contracts import Strict
from .invoicing import money, resale_price
from .security import digest


class PublicOffer(Strict):
    id: str
    seller: str = Field(min_length=2, max_length=150)
    country: str = Field(pattern=r"^[A-Z]{2}$")
    product: str = Field(min_length=3, max_length=300)
    attributes: dict[str, str]
    unit_price: str
    currency: Literal["EUR"]
    price_basis: str
    display_vat: Literal["included", "excluded", "unknown"]
    url: str = Field(max_length=1000)
    observed_stock_text: str
    shipping_scope: str
    fitment: Literal["unverified"]
    data_issue: str
    evidence_excerpt: str = Field(max_length=180)

    @field_validator("unit_price")
    @classmethod
    def positive_price(cls, value):
        if money(value) <= 0:
            raise ValueError("positive_public_price_required")
        return value

    @field_validator("url")
    @classmethod
    def evidence_url(cls, value):
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("https_source_url_required")
        return value


class OfferSnapshot(Strict):
    site_id: str
    checked_at: date
    purpose: str

    commercial_authority: Literal[False]
    required_match_fields: list[str] = Field(min_length=1, max_length=15)
    offers: list[PublicOffer] = Field(max_length=30)


def match(snapshot: OfferSnapshot, need, site_id, today=None):
    if snapshot.site_id != site_id:
        raise ValueError("cross_site_offer_snapshot")
    observed = snapshot.checked_at
    # This local snapshot is valid only on the day it was checked; production needs refresh.
    if observed != (today or date.today()):
        return []

    def normalized(value):
        return "".join(value.upper().split())

    return [offer for offer in snapshot.offers if all(
        need.get(key, {}).get("value") and normalized(offer.attributes.get(key, "")) ==
        normalized(need[key]["value"]) for key in snapshot.required_match_fields)]


def preliminary_options(need, snapshot: OfferSnapshot, site_id):
    matched = match(snapshot, need, site_id)
    if not matched:
        return "\n\nKonkrečius variantus pateiksime patikslinus specifikaciją ir patikrinus aktualius šaltinius.", []
    lines = ["\n\nPRELIMINARŪS VARIANTAI PAGAL JŪSŲ POREIKĮ"]
    quantity = need.get("quantity", {}).get("value", "")
    for number, offer in enumerate(matched, 1):
        price = money(offer.unit_price)
        vat_label = {"included": "su PVM, kaip rodoma šaltinyje", "excluded": "be PVM, kaip rodoma šaltinyje",
                     "unknown": "PVM pagrindas šaltinyje nepatvirtintas"}[offer.display_vat]
        lines.append(f"\n{number}. {offer.product}\nPardavėjas: {offer.seller} ({offer.country}). "
                     f"Vieša kaina: {price} EUR/vnt. {vat_label}.")
        if re.fullmatch(r"[1-9][0-9]{0,3}", quantity):
            lines.append(f"{quantity} vnt. prekių suma pagal viešą kainą: {money(price * int(quantity))} EUR. "
                         "Pristatymas ir konkretaus sandorio PVM dar neįvertinti.")
        lines.append(offer.url)
        if offer.data_issue:
            lines.append("Prieš pasirinkimą: " + offer.data_issue)
    lines.append(f"\nŠaltiniai patikrinti {snapshot.checked_at}. Prekės tinkamumas, aktualus likutis, "
                 "pristatymas ir sandorio mokesčiai dar nepatvirtinti. Čia rodomos tiekėjų viešos kainos, "
                 "be mūsų antkainio; galutiniam mūsų pasiūlymui reikia patvirtintų sąlygų. "
                 "Prekių nerezervavome ir neužsakėme.")
    return "\n".join(lines), [offer.id for offer in matched]


def email_html(body, operator):
    # Escape first; no source HTML or model markup reaches the mail client.
    text = escape(body)
    text = re.sub(r"https://[^\s<>]+", lambda hit: '<a href="' + hit.group(0) + '">' + hit.group(0) + '</a>', text)
    return '<!doctype html><html lang="lt"><meta charset="utf-8"><body style="margin:0;background:#f4f5f0;font:16px Arial;color:#26362d">' + \
        '<main style="max-width:720px;margin:24px auto;background:white;padding:32px;border-top:5px solid #36543f">' + \
        '<p style="color:#52725d">' + escape(operator) + '</p>' + \
        '<div style="white-space:pre-wrap;line-height:1.65;overflow-wrap:anywhere">' + text + '</div></main></body></html>'


class PricingPolicy(Strict):
    site_id: str
    markup_percent: str
    cost_basis: Literal['displayed_gross_nonrecoverable_vat']
    seller_vat_registered: Literal[False]
    policy_ref: str = Field(min_length=3, max_length=150)
    synthetic_only: Literal[True]


def retail_options(need, snapshot: OfferSnapshot, site_id, policy: PricingPolicy):
    """Separate supplier evidence from the strictly projected customer proposal."""
    if policy.site_id != site_id:
        raise ValueError('cross_site_pricing_policy')
    products = match(snapshot, need, site_id)
    qty_text = need.get('quantity', {}).get('value', '')
    quantity = int(qty_text) if re.fullmatch(r'[1-9][0-9]{0,3}', qty_text) else None
    items = []
    for offer in products:
        if offer.display_vat != 'included':
            continue  # Unknown/excluding VAT cannot be treated as a gross nonrecoverable cost.
        price = resale_price(offer.unit_price, policy.markup_percent)
        items.append({'product': offer.product, 'unit_price': str(price), 'quantity': quantity,
            'total': str(money(price * quantity)) if quantity else None,
            'currency': 'EUR', 'tax_treatment': 'not_registered',
            'source_quote_ref': 'retail:' + digest(site_id + ':' + offer.id + ':' + str(price) + ':' + policy.policy_ref),
            'internal': {'supplier_offer_id': offer.id, 'source_url': offer.url, 'supplier_cost': offer.unit_price,
                'checked_at': snapshot.checked_at.isoformat(), 'pricing_policy': policy.model_dump()}})
    if not items:
        return '\n\nKad parinktume konkrečius variantus ir pateiktume kainą, patikslinkite reikiamą specifikaciją.', []
    lines = ['\n\nJUMS SIŪLOMI VARIANTAI']
    for index, item in enumerate(items, 1):
        lines.append(f"\n{index}. {item['product']}\nMūsų kaina: {item['unit_price']} EUR/vnt.")
        if quantity:
            lines.append(f"{quantity} vnt. prekių suma: {item['total']} EUR.")
    lines.append('\nPVM neskaičiuojamas. Tai preliminari prekių kaina. Pristatymo kaina, terminas ir '
        'prekės tinkamumas bus patvirtinti prieš galutinį užsakymą. Parašykite, kuris variantas domina, '
        'ir pristatymo vietą — patikslinsime bendrą pasiūlymą.')
    return '\n'.join(lines), items
