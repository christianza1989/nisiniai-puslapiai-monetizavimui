"""Explicit owner-controlled language policy for private local development only."""
from typing import Literal

from ..config import settings

LanguageReviewMode = Literal["required", "paused_local_pilot"]
PAUSED_SUMMARY = "Kalbos tikrinimas ir taisymas laikinai išjungti bandomajame režime; kalbos kokybė netikrinta."
PAUSED_POLICY = """
Savininko nustatytas laikinas vietinio bandymo režimas: paused_local_pilot.
Kalbos klaidų, gramatikos, rašybos, stiliaus ar kalbų maišymosi šiame etape netikrink ir netaisyk.
Nekurk language radinių ir nereikalauk kalbos pataisų kitų sričių radiniuose. Tai pakeičia ankstesnius
kalbos peržiūros reikalavimus tik šiam privačiam bandymui. Rašyk lietuviškai, bet papildomų kalbos
taisymo ciklų nevykdyk. Kalbos kokybė lieka UNVERIFIED; nerodyk PASS ir nekurk tariamo patikros kvito.
Jei schemoje yra language_review, įrašyk, kad kalbos peržiūra šiame bandyme neatlikta.
Turinio prasmę, atsakymą į kliento klausimą, verslo logiką, faktus, prielaidas, prieštaravimus,
nepagrįstus pažadus, struktūrą ir visas kitas faktines bei publikavimo patikras išsaugok.
"""


def mode() -> LanguageReviewMode:
    cfg = settings()
    return ("paused_local_pilot" if not cfg.creation_language_review_enabled
            and cfg.control_mode == "local" and cfg.environment != "production" else "required")


def policy(text):
    return text + PAUSED_POLICY if mode() == "paused_local_pilot" else text


def screen(texts, names=()):
    if mode() == "required":
        from .renderer import screen_language
        return screen_language(texts, names)
    return {"status": "UNVERIFIED", "check": "language_review_paused_local_pilot.v1"}


def draft_observation(value):
    if mode() == "required":
        from .renderer import language_screening
        return language_screening(value)
    return {"status": "UNVERIFIED", "check": "language_review_paused_local_pilot.v1"}


def receipt_satisfies(check, *, mode="required", digest=None):
    """Private acceptance only. The stored mode, not current config, owns the exception."""
    if check.get("kind") != "language_quality" or digest is not None and check.get("draft_sha256") != digest:
        return False
    if check.get("status") == "PASS" and check.get("observed") is True:
        return True
    return (mode == "paused_local_pilot" and check.get("status") == "UNVERIFIED"
            and check.get("observed") is False)


def constrain_findings(schema, definition):
    if mode() == "paused_local_pilot":
        field = schema["$defs"][definition]["properties"]["area"]
        field["enum"] = [area for area in field["enum"] if area != "language"]
    return schema
