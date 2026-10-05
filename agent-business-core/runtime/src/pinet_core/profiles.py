"""Typed niche behaviour. Profiles grant no business facts or paid tool authority."""
from dataclasses import dataclass

from fastapi import HTTPException


@dataclass(frozen=True)
class Profile:
    site_id: str
    canonical_host: str
    clarification: str
    need_fields: frozenset[str]
    next_details: str
    email_subject: str
    field_notes: dict[str, str] | None = None


PROFILES = {
    "traktoriupadangos": Profile("traktoriupadangos", "traktoriupadangos.lt",
        "Padangų matmenis ir žmogaus pataisymus patikslink; nežinomų laukų neužpildyk spėjimu.",
        frozenset({"goal", "tyre_marking", "tractor_model", "use", "quantity", "urgency", "location"}),
        "padangos žymėjimą, traktoriaus modelį bei naudojimo sąlygas", "Jūsų klausimai apie traktorių padangas",
        {"tyre_marking": "Tik ant šoninės sienelės perskaitytas žymėjimas, pvz. 420/85 R28. "
         "Ašies arba padėties teksto į šį lauką nepridėk; tokią detalę išsaugok goal ar use. "
         "R jau reiškia radialinę konstrukciją; neklausk, ar tokiu R pažymėta padanga yra radialinė."}),
    "greitossvetaines": Profile("greitossvetaines", "greitossvetaines.lt",
        "Patikslink svetainės tikslą, reikalingus puslapius ir terminą; nežinomų laukų neužpildyk spėjimu.",
        frozenset({"goal", "website_type", "pages", "deadline", "budget", "location"}),
        "svetainės tikslą, reikalingus puslapius ir pageidaujamą terminą", "Jūsų klausimai apie svetainę"),
    "akmenas": Profile("akmenas", "akmenas.lt",
        "Išsiaiškink stalviršio naudojimą, medžiagą, preliminarius matmenis ir projekto etapą.",
        frozenset({"goal", "material", "dimensions", "use", "stage", "budget", "deadline", "location"}),
        "stalviršio paskirtį, medžiagos pasirinkimą, preliminarius matmenis ir vietovę",
        "Jūsų klausimai apie akmens stalviršį"),
    "roletaiklaipedoje": Profile("roletaiklaipedoje", "roletaiklaipedoje.lt",
        "Patikslink kambario šviesos ir privatumo poreikį, langus bei matavimo būdą.",
        frozenset({"goal", "product_type", "dimensions", "quantity", "use", "requirements", "budget", "deadline", "location"}),
        "kambario poreikį, langų kiekį, matavimo būdą ir pageidaujamą audinį",
        "Jūsų klausimai apie roletus"),
    "laiptucentras": Profile("laiptucentras", "laiptucentras.lt",
        "Patikslink vidaus laiptų darbų apimtį, etapą, medžiagos kryptį ir turimą projekto informaciją.",
        frozenset({"goal", "job_type", "material", "dimensions", "stage", "requirements", "budget", "deadline", "location"}),
        "vidaus laiptų darbų apimtį, projekto etapą, turimus brėžinius ir vietovę",
        "Jūsų klausimai apie vidaus laiptus"),
    "auksarankiams": Profile("auksarankiams", "auksarankiams.lt",
        "Padėk aiškiai aprašyti kelių smulkių namų darbų apimtį; nepriimk nepatvirtinto vykdytojo užsakymo.",
        frozenset({"goal", "job_type", "quantity", "dimensions", "requirements", "urgency", "budget", "deadline", "location"}),
        "darbų sąrašą, baldų modelius ar instrukcijas, vietovę ir pageidaujamą laiką",
        "Jūsų smulkių namų darbų poreikis"),
}


def get(site_id, canonical_host):
    profile = PROFILES.get(site_id)
    if not profile or profile.canonical_host != canonical_host:
        raise HTTPException(503, "business_profile_not_ready")
    return profile
