"""Typed private draft, escaped preview and downloads. No arbitrary HTML/CSS/JS or public approval."""
import hashlib
import html
import json
import re
import unicodedata
from functools import lru_cache
from typing import Annotated, Literal

from lingua import Language, LanguageDetectorBuilder
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ..public_projects.projection import public_url
from ..tasks.codex import RunnerError

# Match the maintained studio's safe nested slug grammar, bounded by its 150-char path.
PAGE_PATH_PATTERN = r"^/(?:[a-z0-9]+(?:[-/][a-z0-9]+)*/?)?$"
GUIDE_PATH_PATTERN = r"^/[a-z0-9]+(?:[-/][a-z0-9]+)*/?$"
CanonicalPath = Annotated[str, Field(pattern=PAGE_PATH_PATTERN, max_length=150)]
# Provider schema only: historical readers retain the exact authoritative public_url validation.
PublicSourceURL = Annotated[str, Field(json_schema_extra={"pattern": r"^[hH][tT][tT][pP][sS]://[^\s?#\\]+$"})]


def canonical_path(value):
    if not value:
        return value
    slug = value.strip("/")
    if slug.split("/", 1)[0] in {"api", "niche"}:
        raise ValueError("Reserved application path")
    result = "/" + slug + "/" if slug else "/"
    if len(result) > 150:
        raise ValueError("Canonical path too long")
    return result


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class BusinessPlan(Strict):
    customer: str = Field(min_length=20, max_length=800)
    paid_result: str = Field(min_length=20, max_length=800)
    payer: str = Field(min_length=10, max_length=500)
    offer: str = Field(min_length=30, max_length=1500)
    monetization: str = Field(min_length=20, max_length=1000)
    interest_test: str = Field(min_length=20, max_length=1000)
    alternatives: list[str] = Field(min_length=1, max_length=5)
    execution_steps: list[str] = Field(min_length=3, max_length=10)
    expansion_criteria: list[str] = Field(min_length=2, max_length=6)


class Research(Strict):
    title: str = Field(min_length=1, max_length=160)
    url: PublicSourceURL = Field(max_length=1024)
    market: str = Field(min_length=1, max_length=100)
    finding: str = Field(min_length=20, max_length=700)
    is_counterevidence: bool
    _url = field_validator("url")(public_url)


class ToolPlan(Strict):
    area: str = Field(min_length=1, max_length=100)
    tool: str = Field(min_length=1, max_length=160)
    purpose: str = Field(min_length=10, max_length=500)
    phase: Literal["draft", "phase_one", "later"]
    limitation: str = Field(min_length=1, max_length=500)


class Section(Strict):
    heading: str = Field(min_length=1, max_length=160)
    body: str = Field(min_length=20, max_length=1800)
    items: list[str] = Field(max_length=8)
    layout: Literal["prose", "steps", "comparison", "checklist"]


class Page(Strict):
    path: CanonicalPath
    title: str = Field(min_length=1, max_length=160)
    navigation_label: str = Field(min_length=1, max_length=50)
    meta_description: str = Field(min_length=30, max_length=220)
    intent: str = Field(min_length=10, max_length=300)
    sections: list[Section] = Field(min_length=2, max_length=7)
    _path = field_validator("path")(canonical_path)


class Brand(Strict):
    accent: Literal["indigo", "teal", "clay", "forest", "cobalt", "plum"]
    composition: Literal["editorial", "catalogue", "service", "studio"]
    rationale: str = Field(min_length=20, max_length=600)


class ContentPlanItem(Strict):
    path: str = Field(pattern=GUIDE_PATH_PATTERN, max_length=150)
    title: str = Field(min_length=10, max_length=160)
    intent: str = Field(min_length=20, max_length=300)
    head_query: str = Field(min_length=5, max_length=160)
    audience_problem: str = Field(min_length=20, max_length=1000)
    business_goal: str = Field(min_length=20, max_length=1000)
    primary_topic: str = Field(min_length=5, max_length=120)
    reason: str = Field(min_length=30, max_length=1000)
    month: str = Field(pattern=r"^(?:|[0-9]{4}-(?:0[1-9]|1[0-2]))$")
    seasonal_hook: str = Field(max_length=300)
    pillar_path: str = Field(pattern=r"^(?:|/[a-z0-9]+(?:[-/][a-z0-9]+)*/?)$", max_length=150)
    outline: list[str] = Field(min_length=3, max_length=8)
    source_queries: list[str] = Field(max_length=6)
    source_urls: list[PublicSourceURL] = Field(max_length=6)
    internal_links: list[CanonicalPath] = Field(max_length=8)
    media_brief: str = Field(min_length=40, max_length=1000)
    media_alt: str = Field(min_length=10, max_length=250)
    priority: Literal["initial", "later"]
    _paths = field_validator("path", "pillar_path")(canonical_path)

    @field_validator("internal_links")
    @classmethod
    def links(cls, values):
        return [canonical_path(value) for value in values]

    @field_validator("source_urls")
    @classmethod
    def sources(cls, values):
        return [public_url(value) for value in values]

    @model_validator(mode="after")
    def meaningful(self):
        if not self.month and self.seasonal_hook:
            raise ValueError("Unscheduled evergreen plan cannot invent a seasonal hook")
        for values in (self.outline, self.source_queries):
            if any(not text.strip() or len(text) > 500 for text in values):
                raise ValueError("Meaningful bounded planning briefs required")
        if any(not re.fullmatch(PAGE_PATH_PATTERN, target) for target in self.internal_links):
            raise ValueError("Same-site canonical paths required")
        if len(self.internal_links) != len(set(self.internal_links)) or self.path in self.internal_links:
            raise ValueError("Distinct useful non-self links required")
        return self


class DraftFields(Strict):
    business_name: str = Field(min_length=1, max_length=100)
    tagline: str = Field(min_length=10, max_length=200)
    assistant_reply: str = Field(min_length=30, max_length=2500)
    business: BusinessPlan
    confirmed_facts: list[str] = Field(max_length=15)
    assumptions: list[str] = Field(min_length=1, max_length=15)
    open_questions: list[str] = Field(max_length=12)
    research: list[Research] = Field(max_length=8)
    tools: list[ToolPlan] = Field(min_length=2, max_length=8)
    brand: Brand
    pages: list[Page] = Field(min_length=3, max_length=8)
    # Historical immutable v1 payloads had no plan. New creator schema below requires it.
    content_plan: list[ContentPlanItem] = Field(default_factory=list, max_length=12)
    language_review: str = Field(min_length=30, max_length=1000)
    remaining_gates: list[str] = Field(min_length=3, max_length=15)

    @model_validator(mode="after")
    def meaningful(self):
        for collection in (self.confirmed_facts, self.assumptions, self.open_questions, self.remaining_gates,
                self.business.alternatives, self.business.execution_steps, self.business.expansion_criteria,
                *[s.items for p in self.pages for s in p.sections]):
            if any(not text.strip() or len(text) > 800 for text in collection):
                raise ValueError("Bounded meaningful list entries required")
        if len(self.model_dump_json().encode()) > 200000:
            raise ValueError("Draft too large")
        return self


def graph_issues(draft):
    """Deterministic feedback on a typed, bounded candidate; never a mutation."""
    issues = []

    def issue(field, message):
        if len(issues) < 8:
            issues.append({"field": "draft:/" + field, "message": message})

    paths = [page.path for page in draft.pages]
    if paths[0] != "/" or len(paths) != len(set(paths)):
        issue("pages", "Pirmas puslapis turi būti pradžios puslapis; kiekvienas puslapis turi turėti atskirą adresą.")
    plan_paths = [item.path for item in draft.content_plan]
    if len(plan_paths) != len(set(plan_paths)):
        issue("content_plan", "Kiekvienam skirtingam gidui reikia atskiro pilno adreso; vieno adreso kartoti negalima.")
    known = set(paths + plan_paths)
    positions = {path: index for index, path in enumerate(plan_paths)}
    for index, item in enumerate(draft.content_plan):
        if any(target not in known for target in item.internal_links):
            issue(f"content_plan/{index}/internal_links", "Nuorodos turi vesti į tikrai pateiktą puslapį arba planuojamą gidą.")
        parent = item.pillar_path
        if parent and (parent == item.path or parent not in known
                or parent in positions and positions[parent] >= positions[item.path]):
            issue(f"content_plan/{index}/pillar_path", "Plataus pagrindinio gido tėvinis adresas turi būti tuščias. Kitų gidų tėvinis puslapis turi egzistuoti ir būti pateiktas anksčiau; savęs ar vėlesnio gido nurodyti negalima.")
    return issues


class Draft(DraftFields):
    @model_validator(mode="after")
    def bounded(self):
        if issues := graph_issues(self):
            raise ValueError(issues[0]["message"])
        return self


class CreatorCandidate(DraftFields):
    """Private repair context only. This type cannot authorize artifacts/intake/promotion."""
    content_plan: list[ContentPlanItem] = Field(min_length=3, max_length=12)


class CreatorDraft(Draft):
    content_plan: list[ContentPlanItem] = Field(min_length=3, max_length=12)


def normalize(value):
    try:
        return Draft.model_validate(value).model_dump(mode="json")
    except (ValueError, TypeError):
        raise RunnerError("output_invalid") from None


def normalize_creator(value):
    try:
        return CreatorDraft.model_validate(value).model_dump(mode="json")
    except (ValueError, TypeError):
        raise RunnerError("output_invalid") from None


@lru_cache(maxsize=1)
def language_detector():
    # The first real output mixed Finnish/Estonian with Lithuanian. This is an
    # independent screen for obvious drift, not grammar or editorial acceptance.
    return LanguageDetectorBuilder.from_languages(Language.LITHUANIAN, Language.ENGLISH,
        Language.FINNISH, Language.ESTONIAN, Language.LATVIAN, Language.POLISH,
        Language.RUSSIAN, Language.GERMAN).build()


def language_screening(value):
    draft = Draft.model_validate(value)
    names = [draft.business_name, *[r.title for r in draft.research], *[t.tool for t in draft.tools]]
    excluded = {"business_name", "url", "title", "tool", "path", "accent", "composition", "phase", "layout",
                "month", "pillar_path", "internal_links", "source_urls", "source_queries", "priority"}

    def prose(item, key=""):
        if isinstance(item, dict):
            for name, child in item.items():
                # Page titles are prose; official research titles are names.
                if name not in excluded or (name == "title" and "intent" in item):
                    yield from prose(child, name)
        elif isinstance(item, list):
            for child in item:
                yield from prose(child, key)
        elif isinstance(item, str):
            yield item

    return screen_language(prose(draft.model_dump()), names)


def screen_language(texts, names=()):
    count = 0
    for original in texts:
        text = re.sub(r"https?://\S+|[\w.+-]+@[\w.-]+", " ", original)
        for name in names:
            text = text.replace(name, " ")
        words = re.findall(r"[^\W\d_]+", text)
        if any(len(word) >= 2 and any("LATIN" not in unicodedata.name(c, "") for c in word) for word in words):
            raise RunnerError("language_quality_failed")
        for sentence in [text, *re.split(r"(?<=[.!?;])\s+|\n+", text)]:
            words = re.findall(r"[^\W\d_]+", sentence)
            if len(words) < 5 or sum(map(len, words)) < 24:
                continue
            count += 1
            scores = language_detector().compute_language_confidence_values(sentence)
            if (scores[0].language != Language.LITHUANIAN and scores[0].value >= .80
                    and scores[0].value - scores[1].value >= .45):
                raise RunnerError("language_quality_failed")
    return {"status": "PASS", "check": "obvious_language_drift.v1", "locale": "lt",
            "detector": "lingua-2.2.0", "segments": count, "editorial_acceptance": "UNVERIFIED"}


def context_projection(value):
    """Partial model context, never an edited replacement for immutable source."""
    return _context_projection(Draft.model_validate(value))


def structural_repair_context(value):
    """Only a well-shaped candidate with graph issues qualifies for one bounded correction."""
    try:
        candidate = CreatorCandidate.model_validate(value)
        if not (issues := graph_issues(candidate)):
            return None
        projected, projection = _context_projection(candidate)
        return {"check": "creator-graph.v1", "issues": issues, "candidate": projected, "projection": projection,
                "unaccepted_candidate_sha256": hashlib.sha256(json.dumps(candidate.model_dump(mode="json"),
                    ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()}
    except (ValueError, TypeError):
        return None


def _context_projection(draft):
    names = [draft.business_name, *[r.title for r in draft.research], *[t.tool for t in draft.tools]]
    omitted = []

    def project(item, path=""):
        if isinstance(item, dict):
            output = {}
            for key, child in item.items():
                child_path = path + "." + key
                if key in {"assistant_reply", "language_review"}:
                    omitted.append(child_path)
                    continue
                result = project(child, child_path)
                if result is not None:
                    output[key] = result
            return output
        if isinstance(item, list):
            return [result for i, child in enumerate(item) if (result := project(child, path + f"[{i}]")) is not None]
        if isinstance(item, str):
            # These are official names, identifiers or validated URLs, not prose.
            if (".source_queries[" in path or path.endswith((".business_name", ".title", ".tool", ".path", ".url", ".accent", ".composition", ".phase", ".layout"))):
                return item
            try:
                screen_language([item], names)
            except RunnerError:
                omitted.append(path)
                return None
        return item

    return project(draft.model_dump()), {"projection": "prior-draft-context.v1", "omitted_fields": omitted,
        "reason": "Self-review claims and demonstrably invalid language are omitted from model input only; original revision unchanged."}


COLORS = {"indigo": "#3730a3", "teal": "#115e59", "clay": "#9a3412", "forest": "#166534", "cobalt": "#1e40af", "plum": "#6b21a8"}
CSS = """
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f9f8f4;color:#202323;font:17px/1.7 system-ui,sans-serif}
a{color:var(--accent);text-underline-offset:5px}header{padding:24px 5vw;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:30px;flex-wrap:wrap}
.wordmark{font-weight:800;letter-spacing:-1px;font-size:25px;color:#202323}nav{display:flex;gap:20px;flex-wrap:wrap}nav a{font-size:14px}
main{max-width:1160px;margin:auto;padding:0 30px}article{padding:70px 0;border-bottom:1px solid #ddd;scroll-margin-top:20px}
.hero{padding:80px 0 55px;display:grid;grid-template-columns:1.3fr 1fr;gap:60px;align-items:center}
h1{font-size:clamp(34px,5vw,70px);line-height:1.08;letter-spacing:-2px;max-width:800px;margin:12px 0 25px}
h2{font-size:clamp(26px,3vw,38px);line-height:1.2;letter-spacing:-.8px}p{max-width:760px}ul,ol{padding-left:24px}li{margin:9px 0}
.path{font-size:13px;color:#686c6a}.lead{font-size:22px;line-height:1.5}.visual{border:1px solid #ccc;padding:35px;border-radius:24px;background:white}
.visual h2{font-size:25px;margin-top:0}.visual ol{margin:0}.section{margin:42px 0;padding-top:12px}.comparison ul{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;list-style:none;padding:0}
.comparison li{border-top:3px solid var(--accent);padding:16px;background:#fff}.steps ol li{padding-bottom:12px;border-bottom:1px solid #ddd}
.checklist li::marker{color:var(--accent)}.catalogue .section{padding:25px;background:white;border:1px solid #ddd}
.editorial article:not(:first-child){max-width:840px}.editorial h1{font-family:Georgia,serif;font-weight:500}.service .hero{background:#fff;padding:55px 35px;border-radius:25px}
.studio h1{font-size:clamp(38px,6vw,80px)}.studio .visual{background:var(--accent);color:white}.studio .visual h2{color:white}
footer{max-width:1160px;margin:auto;padding:35px 30px;color:#606562;font-size:14px}footer a{margin-right:20px}
@media(max-width:650px){body{font-size:16px}header{padding:20px}nav{gap:12px}main{padding:0 20px}.hero{padding:45px 0 30px;grid-template-columns:1fr;gap:25px}h1{letter-spacing:-1px}.visual{padding:24px}article{padding:42px 0}.comparison ul{grid-template-columns:1fr}.service .hero{padding:30px 20px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
"""


def preview(value):
    draft = Draft.model_validate(value)
    e = html.escape
    csp = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'"
    nav = "".join(f'<a href="#page-{i}">{e(p.navigation_label)}</a>' for i, p in enumerate(draft.pages))
    articles = []
    for i, page in enumerate(draft.pages):
        sections = []
        for section in page.sections:
            tag = "ol" if section.layout == "steps" else "ul"
            items = (f"<{tag}>" + "".join(f"<li>{e(v)}</li>" for v in section.items) + f"</{tag}>") if section.items else ""
            body = "".join(f"<p>{e(p)}</p>" for p in section.body.split("\n\n") if p.strip())
            sections.append(f'<section class="section {section.layout}"><h2>{e(section.heading)}</h2>{body}{items}</section>')
        if i == 0:
            steps = "".join(f"<li>{e(v)}</li>" for v in draft.business.execution_steps[:3])
            intro = f'<div class="hero"><div><p class="path">{e(draft.business_name)}</p><h1>{e(page.title)}</h1><p class="lead">{e(draft.tagline)}</p><a href="#section-start">Sužinoti daugiau</a></div><aside class="visual"><h2>Kaip pradėti</h2><ol>{steps}</ol></aside></div><div id="section-start"></div>'
        else:
            intro = f'<p class="path">{e(page.path)}</p><h1>{e(page.title)}</h1><p class="lead">{e(page.meta_description)}</p>'
        articles.append(f'<article id="page-{i}">{intro}{"".join(sections)}</article>')
    return (f'<!doctype html><html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="{e(csp,quote=True)}">'
        f'<title>{e(draft.business_name)}</title><style>:root{{--accent:{COLORS[draft.brand.accent]}}}{CSS}</style></head>'
        f'<body class="{draft.brand.composition}"><header><span class="wordmark">{e(draft.business_name)}</span><nav>{nav}</nav></header>'
        f'<main>{"".join(articles)}</main><footer>{nav}</footer></body></html>')


def plan_markdown(value, research_receipt):
    draft = Draft.model_validate(value)
    b = draft.business
    parts = ["# " + draft.business_name, draft.assistant_reply]
    for title, content in (("Klientas", b.customer), ("Mokamas rezultatas", b.paid_result), ("Kas mokės", b.payer),
            ("Pasiūlymas", b.offer), ("Pajamų modelis", b.monetization), ("Paklausos bandymas", b.interest_test)):
        parts.extend(["## " + title, content])
    for title, values in (("Alternatyvos", b.alternatives), ("Vykdymo planas", b.execution_steps), ("Plėtros kriterijai", b.expansion_criteria),
            ("Kliento pateikti faktai", draft.confirmed_facts), ("Prielaidos", draft.assumptions), ("Atviri klausimai", draft.open_questions),
            ("Likę priėmimo darbai", draft.remaining_gates)):
        parts.extend(["## " + title, "\n".join("- " + text for text in values) or "Nenurodyta."])
    parts.extend(["## Tyrimo šaltiniai", "Šaltinių prieigos kvitas: " + research_receipt])
    for source in draft.research:
        title = source.title.replace('[', '').replace(']', '')
        parts.append(f"- [{title}]({source.url}) ({source.market}). {source.finding}")
    parts.extend(["## Turinio planas", "Tai privačios puslapių užduotys; šaltinių kandidatai nėra patikros įrodymas, o mėnuo nėra publikavimo data."])
    if not draft.content_plan:
        parts.append("Šioje ankstesnėje versijoje turinio planas dar neparengtas.")
    for item in draft.content_plan:
        parts.extend(["### " + item.title, "URL: " + item.path + "\n\nKlausimas: " + item.head_query,
            item.intent + "\n\n" + item.audience_problem, "Verslo tikslas: " + item.business_goal,
            "Sprendimo priežastis: " + item.reason, "\n".join("- " + text for text in item.outline),
            "Šaltinių patikros užklausos: " + "; ".join(item.source_queries),
            "Šaltinių kandidatai: " + "; ".join(item.source_urls),
            "Vidiniai ryšiai: " + ", ".join(item.internal_links),
            "Planavimo mėnuo: " + (item.month or "neparinktas") + "; sezoniškumas: " + (item.seasonal_hook or "nėra"),
            "Vaizdo užduotis: " + item.media_brief + "\n\nAlt: " + item.media_alt])
    parts.extend(["## Įrankių planas", "\n".join(f"- {t.area}: {t.tool}. {t.purpose} Etapas: {t.phase}. {t.limitation}" for t in draft.tools),
                  "## Dizaino pasirinkimas", draft.brand.rationale, "## Kalbos saviredakcija", draft.language_review,
                  "Šis rezultatas yra privatus verslo ir svetainės juodraštis. Viešas paleidimas ir pilnas pirmos fazės priėmimas dar neatlikti."])
    return "\n\n".join(parts) + "\n"


def artifacts(value, *, creation_id, revision, receipt):
    value = normalize(value)
    research = ("Atlikta " + str(receipt.get("web_search_count", 0)) + " paieškos veiksmų. Atskirų šaltinių pilna peržiūra nepatvirtinta.") if receipt.get("web_search_count") else "Šiame vykdyme interneto tyrimas neatliktas; šaltinių teiginius reikia patikrinti."
    package = {"schemaVersion": "verslomatika.business-draft.v2" if value["content_plan"] else "verslomatika.business-draft.v1", "creationId": creation_id, "revision": revision,
               "publicationApproved": False, "draft": value, "researchReceipt": research}
    outputs = [("business_plan", "Verslo pasiūlymas.md", "text/markdown", plan_markdown(value, research)),
               ("website_preview", "Svetainės peržiūra.html", "text/html", preview(value)),
               ("content_package", "Privatus svetainės juodraštis.json", "application/json", json.dumps(package, ensure_ascii=False, indent=2) + "\n")]
    result = []
    for kind, name, media, content in outputs:
        raw = content.encode()
        if len(raw) > 524288:
            raise RunnerError("output_invalid")
        result.append({"kind": kind, "display_name": name, "media_type": media, "content": content,
                       "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
    return result
