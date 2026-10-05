"""Domain extraction, resumable Codex CLI analysis, and genuine BIFF8 XLS export."""
from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from dataclasses import dataclass
from datetime import datetime, timezone
import errno
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import threading
import time

import idna
import xlwt

APP_DIR = Path(__file__).resolve().parent
ROOT = APP_DIR.parent
DEFAULT_INPUT = ROOT / "domenai_raw_not_filtered.txt"
DEFAULT_OUTPUT = APP_DIR / "output" / "domenai_sukategorizuoti.xls"
VERSION = "2026-09-30-sol61-xhigh-v4-strategy"
SCREEN_VERSION = "2026-09-30-sol61-xhigh-v5-screening"
STAGE_LABELS = {'screen': 'Pirminė atranka', 'strategy': 'Išsami strategija'}
CATEGORIES = {
    "construction": "Statyba ir remontas",
    "home": "Namai, interjeras ir baldai",
    "energy": "Energetika, šildymas ir inžinerija",
    "property": "Nekilnojamasis turtas",
    "auto": "Automobiliai ir transportas",
    "finance": "Finansai, draudimas ir apskaita",
    "legal": "Teisinės paslaugos",
    "business": "Verslas ir B2B paslaugos",
    "tech": "IT, programinė įranga ir AI",
    "marketing": "Rinkodara, dizainas ir interneto svetainės",
    "health": "Sveikata, odontologija ir medicina",
    "beauty": "Grožis ir asmens priežiūra",
    "sport": "Sportas ir aktyvus laisvalaikis",
    "food": "Maistas, receptai ir gėrimai",
    "tourism": "Kelionės, turizmas ir apgyvendinimas",
    "events": "Renginiai, šventės ir vestuvės",
    "education": "Mokslas, mokymai ir kalbos",
    "jobs": "Darbas, karjera ir personalas",
    "family": "Vaikai, šeima ir tėvystė",
    "pets": "Gyvūnai ir veterinarija",
    "agriculture": "Žemės ūkis, sodas ir miškininkystė",
    "industry": "Pramonė, įranga ir gamyba",
    "logistics": "Logistika, sandėliavimas ir siuntos",
    "commerce": "Prekyba ir bendri parduotuvių vardai",
    "fashion": "Mada, drabužiai ir aksesuarai",
    "gifts": "Dovanos, rankdarbiai ir personalizacija",
    "electronics": "Elektronika ir buitinė technika",
    "cleaning": "Valymas ir buitinės paslaugos",
    "security": "Apsauga ir saugumas",
    "entertainment": "Pramogos, žaidimai ir hobiai",
    "media": "Medija, kultūra ir naujienos",
    "community": "Bendruomenės, miestai ir organizacijos",
    "adult": "Suaugusiųjų turinys ir pažintys",
    "gambling": "Azartiniai lošimai",
    "other": "Kita aiški niša",
    "unclear": "Neaiškūs arba tik prekės ženklo vardai",
}
MONETIZATION = {
    "leads": "Užklausos ir klientų nukreipimas",
    "affiliate": "Partnerių komisiniai",
    "ads": "Turinio reklama",
    "directory": "Mokami katalogo įrašai",
    "digital": "Skaitmeniniai produktai ir prenumerata",
    "service": "Nuosavos paslaugos (vėlesnė fazė)",
    "shop": "Prekyba (vėlesnė fazė)",
    "brand": "Prekės ženklo vystymas",
    "unclear": "Neaiškus monetizavimo kelias",
}
RISKS = {
    "none": "Specifinė rizika nepastebėta; patikra neatlikta",
    "brand": "Galimas prekės ženklo sutapimas; būtina patikra",
    "regulated": "Reguliuojama niša arba ekspertinio turinio poreikis",
    "ambiguous": "Neaiški pavadinimo reikšmė",
    "adult": "Suaugusiųjų turinio ribojimai",
    "gambling": "Lošimų reguliavimas ir reklamos ribojimai",
}
WEIGHTS = {"k": 30, "d": 20, "v": 25, "s": 10, "b": 15}
NAME_TYPES = {"keyword": "Tikslinis raktažodis / frazė", "modified": "Raktažodžio modifikacija",
              "brand": "Prekės ženklo vardas", "unclear": "Neaiškus vardas"}
FIT_FACTORS = {0: 0.55, 1: 0.64, 2: 0.73, 3: 0.82, 4: 0.91, 5: 1.0}
STRATEGY_TEXT_LIMITS = {"t": 120, "u": 160, "p": 220, "e": 180, "z": 200, "h": 180, "l": 180}
# Boundaries prevent partial matches inside email addresses or malformed hosts.
DOMAIN_PATTERN = re.compile(
    r"(?<![\w@.\-])(?:[\w-]+\.)+(?:[^\W\d_]{2,63}|xn--[a-z0-9-]{2,59})(?![\w.\-])",
    re.IGNORECASE,
)


class AppError(Exception):
    pass


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def configured_model():
    return DEFAULT_MODEL


def normalize_domain(value):
    value = value.strip().rstrip(".").lower()
    if value.startswith("www."):
        value = value[4:]
    try:
        ascii_host = idna.encode(value, uts46=True).decode("ascii")
    except (idna.IDNAError, UnicodeError):
        return None
    if len(ascii_host) > 253 or "." not in ascii_host:
        return None
    labels = ascii_host.split(".")
    if any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", part) for part in labels):
        return None
    if not (re.fullmatch(r"[a-z]{2,63}", labels[-1]) or labels[-1].startswith("xn--")):
        return None
    return ascii_host


@dataclass
class Extraction:
    domains: list[str]
    occurrences: Counter
    first_lines: dict[str, int]
    stats: dict


def extract_domains(path):
    source = Path(path)
    try:
        raw = source.read_bytes()
    except OSError as exc:
        raise AppError("Nepavyko perskaityti domenų failo.") from exc
    encoding = "utf-8-sig"
    try:
        content = raw.decode(encoding)
    except UnicodeDecodeError:
        encoding = "cp1257"
        content = raw.decode(encoding)
    occurrences, first_lines = Counter(), {}
    invalid, excluded_sources = 0, 0
    lines = content.splitlines()
    for line_no, line in enumerate(lines, 1):
        # An email address is contact data, not a listed domain.
        line = re.sub(r"[\w.+-]+@[^\s<>]+", " ", line)
        for candidate in DOMAIN_PATTERN.findall(line):
            domain = normalize_domain(candidate)
            if domain in {"expireddomains.net", "seo.domains"}:
                excluded_sources += 1
                continue
            if domain is None:
                invalid += 1
                continue
            occurrences[domain] += 1
            first_lines.setdefault(domain, line_no)
    domains = list(occurrences)
    return Extraction(domains, occurrences, first_lines, {
        "source_file": source.name, "source_sha256": hashlib.sha256(raw).hexdigest(),
        "encoding": encoding, "lines": len(lines), "matches": sum(occurrences.values()),
        "unique_domains": len(domains), "duplicates_removed": sum(occurrences.values()) - len(domains),
        "invalid_candidates": invalid,
        "excluded_source_mentions": excluded_sources,
    })


SYSTEM_PROMPT = (APP_DIR / "prompts" / "domain_strategy_v4.md").read_text(encoding="utf-8")
SCREEN_PROMPT = (APP_DIR / "prompts" / "domain_screening_v5.md").read_text(encoding="utf-8")

def response_schema(stage='strategy'):
    properties = {"i": {"type": "integer"}, "c": {"type": "string", "enum": list(CATEGORIES)},
                  "n": {"type": "string"}, "m": {"type": "string", "enum": list(MONETIZATION)},
                  "f": {"type": "string", "enum": list(NAME_TYPES)},
                  "a": {"type": "integer", "minimum": 0, "maximum": 5},
                  "q": {"type": "integer", "minimum": 0, "maximum": 100},
                  "r": {"type": "string", "enum": list(RISKS)}, "w": {"type": "string"}}
    properties.update({key: {"type": "string"} for key in (('t',) if stage == 'screen' else STRATEGY_TEXT_LIMITS)})
    properties.update({key: {"type": "integer", "minimum": 0, "maximum": 5} for key in WEIGHTS})
    return {"type": "object", "properties": {"items": {"type": "array", "items": {
        "type": "object", "properties": properties, "required": list(properties),
        "additionalProperties": False}}}, "required": ["items"], "additionalProperties": False}


def potential_score(item):
    base = sum(item[key] / 5 * weight for key, weight in WEIGHTS.items())
    # Unclear names and semantic uncertainty must not outrank descriptive commercial domains.
    keyword_cap = {"keyword": 5, "modified": 3, "brand": 1, "unclear": 1}[item['f']]
    base -= max(0, item['k'] - keyword_cap) / 5 * WEIGHTS['k']
    fit = min(item['a'], 3 if item['r'] == 'regulated' else 1 if item['r'] == 'brand' else 5)
    score = base * (0.5 + item["q"] / 200) * FIT_FACTORS[fit]
    if item["c"] == "unclear" or item["m"] == "unclear" or item['f'] == 'unclear':
        score = min(score, 25)
    if item['f'] == 'brand':
        score = min(score, 35)
    return round(score, 1)


def validate_items(response, batch, stage='strategy'):
    expected = {i: domain for i, domain in batch}
    if not isinstance(response, dict) or set(response) != {"items"} or not isinstance(response["items"], list):
        raise AppError("AI atsakymo struktūra netinkama.")
    result, seen = [], set()
    required = set(response_schema(stage)["properties"]["items"]["items"]["required"])
    for item in response["items"]:
        if not isinstance(item, dict) or set(item) != required:
            raise AppError("AI pateikė netinkamus laukus.")
        i = item["i"]
        if type(i) is not int or i not in expected or i in seen:
            raise AppError("AI pakeitė, pridėjo arba pakartojo domeno ID.")
        if (item["c"] not in CATEGORIES or item["m"] not in MONETIZATION or
                item["r"] not in RISKS or item['f'] not in NAME_TYPES):
            raise AppError("AI pateikė nežinomą kategoriją.")
        for key, max_value in {**{key: 5 for key in WEIGHTS}, "a": 5, "q": 100}.items():
            if type(item[key]) is not int or not 0 <= item[key] <= max_value:
                raise AppError("AI balas yra už leistinų ribų.")
        for key, max_length in (("n", 140), ("w", 160 if stage == 'screen' else 500)):
            if not isinstance(item[key], str) or not item[key].strip() or len(item[key]) > max_length:
                raise AppError("AI teksto laukas netinkamas.")
        for key, max_length in ({'t': 80} if stage == 'screen' else STRATEGY_TEXT_LIMITS).items():
            if not isinstance(item[key], str) or len(item[key]) > max_length:
                raise AppError("AI strategijos laukas netinkamas.")
        if item['f'] == 'unclear' or item['c'] == 'unclear' or item['m'] == 'unclear':
            if any(item[key].strip() for key in (('t',) if stage == 'screen' else ('t', 'u', 'p', 'e', 'z', 'h'))):
                raise AppError("AI neaiškiam vardui išgalvojo strategiją.")
        elif item['f'] != 'brand' and not all(item[key].strip() for key in (('t',) if stage == 'screen' else ('t', 'u', 'p', 'e', 'h', 'l'))):
            raise AppError("AI aiškiam domenui praleido strategijos išvadą.")
        clean = dict(item)
        if stage == 'screen':
            clean.update({key: '' for key in STRATEGY_TEXT_LIMITS if key != 't'})
        clean['evaluation_stage'] = stage
        adjustments = []
        cap = {"keyword": 5, "modified": 3, "brand": 1, "unclear": 1}[clean['f']]
        if clean['k'] > cap:
            adjustments.append(f"k:{clean['k']}→{cap}")
            clean['k'] = cap
        fit_cap = 3 if clean['r'] == 'regulated' else 1 if clean['r'] == 'brand' else 5
        if clean['a'] > fit_cap:
            adjustments.append(f"a:{clean['a']}→{fit_cap}")
            clean['a'] = fit_cap
        if clean['f'] == 'unclear' or clean['c'] == 'unclear' or clean['m'] == 'unclear':
            clean.update(f='unclear', c='unclear', m='unclear', a=0, r='ambiguous', q=min(clean['q'], 35))
            for key in WEIGHTS:
                clean[key] = min(clean[key], 1)
        clean['rule_adjustments'] = adjustments
        clean.update(domain=expected[i], score=potential_score(clean))
        clean["n"] = " ".join(clean["n"].split()).strip().rstrip(".")
        seen.add(i)
        result.append(clean)
    if seen != set(expected):
        raise AppError("AI praleido domenus; visa grupė bus kartojama.")
    return result


class Store:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path)
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.executescript("""
            CREATE TABLE IF NOT EXISTS analysis (
              signature TEXT NOT NULL, domain TEXT NOT NULL, payload TEXT NOT NULL,
              analyzed_at TEXT NOT NULL, PRIMARY KEY(signature, domain));
            CREATE TABLE IF NOT EXISTS calls (
              id INTEGER PRIMARY KEY, signature TEXT NOT NULL, created_at TEXT NOT NULL,
              model TEXT NOT NULL, tokens_in INTEGER, tokens_out INTEGER, cost REAL NOT NULL,
              cost_source TEXT NOT NULL, generation_id TEXT);
        """)

    def load(self, signature):
        return {domain: json.loads(payload) for domain, payload in self.connection.execute(
            "SELECT domain,payload FROM analysis WHERE signature=?", (signature,))}

    def save(self, signature, items):
        when = utc_now()
        with self.connection:
            for item in items:
                item["analyzed_at"] = when
                self.connection.execute("INSERT OR REPLACE INTO analysis VALUES(?,?,?,?)",
                                        (signature, item["domain"], json.dumps(item, ensure_ascii=False), when))

    def record_call(self, signature, info):
        with self.connection:
            self.connection.execute("""INSERT INTO calls
                (signature,created_at,model,tokens_in,tokens_out,cost,cost_source,generation_id)
                VALUES(?,?,?,?,?,?,?,?)""", (signature, utc_now(), info["model"], info["input"],
                info["output"], info["cost"], info["cost_source"], info["id"]))

    def close(self):
        self.connection.close()


def signature_for(model, stage='strategy'):
    definition = json.dumps([SCREEN_VERSION if stage == 'screen' else VERSION, model, REASONING_EFFORT,
                             SCREEN_PROMPT if stage == 'screen' else SYSTEM_PROMPT, response_schema(stage), CATEGORIES,
                             MONETIZATION, RISKS, WEIGHTS, NAME_TYPES, FIT_FACTORS,
                             STRATEGY_TEXT_LIMITS], ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(definition.encode()).hexdigest()


def ranked(items):
    return sorted(items, key=lambda item: (-item["score"], -item["q"], item["domain"]))


def priority(score):
    return "A – aukštas" if score >= 75 else "B – vidutinis" if score >= 50 else "C – žemas"


from codex_provider import CodexCLI, CodexError, DEFAULT_MODEL, REASONING_EFFORT


HEADERS = ["Vieta", "Domenas", "Kategorija", "Niša", "Potencialas (0–100)",
           "Monetizavimo būdas", "Pagrindimas", "Prioritetas", "Semantikos aiškumas (%)", "Pagrindinė rizika",
           "Komercinis ketinimas (0–5)", "Marža / kliento vertė (0–5)", "SEO įgyvendinamumas (0–5)",
           "Raktažodžio stiprumas (0–5)", "Monetizavimo įvairovė (0–5)", "DR (Ahrefs)", "DR patikrinta", "DR būsena",
           "AI būsena", "AI modelis", "AI vertinta (UTC)", "Šaltinio eilutė", "Pasikartojimai"]


CSV_HEADERS = ["Vieta", "Domenas", "Kategorija", "Niša", "Potencialas (0–100)",
               "Prioritetas", "Monetizavimo būdas", "Pagrindimas", "Pagrindinė rizika",
               "Semantikos aiškumas (%)", "AI modelis", "AI vertinta (UTC)",
               "Pagrindinis raktažodis", "Klientas ir poreikis", "Pirmos svetainės idėja",
               "Kas mokėtų ir už ką", "Alternatyvūs pajamų keliai", "Pirmas paklausos testas",
               "Svarbiausia kliūtis", "Pavadinimo tipas", "Starto tinkamumas (0–5)", "Vertinimo versija", "Vertinimo etapas"]
SCREEN_CSV_INDICES = [*range(13), 19, 20, 21, 22]
SCREEN_CSV_HEADERS = [CSV_HEADERS[index] for index in SCREEN_CSV_INDICES]


def _csv_cell(value):
    if isinstance(value, float):
        return f"{value:.1f}".replace(".", ",")
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def write_csv(directory, extraction, analyses, meta):
    """Native Python CSV output: completed rows only, literal text, atomic files."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    complete = ranked([analyses[d] for d in extraction.domains if d in analyses])
    pending = [d for d in extraction.domains if d not in analyses]
    lock = (directory / '.csv-export.lock').open('a+b')
    try:
        if lock.tell() == 0:
            lock.write(b'0')
            lock.flush()
        lock.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            return None  # Another exporter owns this snapshot; retry on the next tick.
        status_path = directory / 'csv_status.json'
        try:
            previous = json.loads(status_path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            previous = {}
        source_hash = extraction.stats['source_sha256']
        if (previous.get('signature') == meta.get('signature') and
                previous.get('source_sha256') == source_hash and
                previous.get('categorized', 0) > len(complete)):
            return previous  # A delayed reader must not replace a newer snapshot.
        rows = []
        for place, item in enumerate(complete, 1):
            rows.append([place, item['domain'], CATEGORIES[item['c']], item['n'], item['score'],
                         priority(item['score']), MONETIZATION[item['m']], item['w'], RISKS[item['r']],
                         item['q'], meta['model'], item.get('analyzed_at', ''),
                         item['t'], item['u'], item['p'], item['e'], item['z'], item['h'], item['l'],
                         NAME_TYPES[item['f']], item['a'], meta.get('evaluation_version', VERSION),
                         STAGE_LABELS[meta.get('evaluation_stage', 'strategy')]])
        headings = CSV_HEADERS
        if meta.get('evaluation_stage') == 'screen':
            rows = [[row[index] for index in SCREEN_CSV_INDICES] for row in rows]
            headings = SCREEN_CSV_HEADERS
        category_best = {}
        for row in rows:
            category_best[row[2]] = max(category_best.get(row[2], 0), row[4])
        grouped = sorted(rows, key=lambda row: (-category_best[row[2]], row[2], row[0]))
        definitions = {
            'domenai_reitingas.csv': (headings, rows),
            'domenai_pagal_kategorijas.csv': (headings, grouped),
            'domenai_laukia_ai.csv': (["Domenas", "Būsena"],
                                    ([d, "Laukia Codex vertinimo"] for d in pending)),
        }
        checksums = {}
        for name, (headings, records) in definitions.items():
            destination = directory / name
            temporary = destination.with_name(destination.name + '.tmp')
            try:
                with temporary.open('w', encoding='utf-8-sig', newline='') as handle:
                    writer = csv.writer(handle, delimiter=';')
                    writer.writerow(headings)
                    writer.writerows([_csv_cell(cell) for cell in row] for row in records)
                os.replace(temporary, destination)
                checksums[name] = hashlib.sha256(destination.read_bytes()).hexdigest()
            except OSError as exc:
                temporary.unlink(missing_ok=True)
                raise AppError(f"Nepavyko atnaujinti CSV: {name}. Uždarykite užrakintą failą.") from exc
        status = {
            'categorized': len(complete), 'pending': len(pending), 'total': len(extraction.domains),
            'analysis_status': 'complete' if not pending else meta.get('status', 'partial'),
            'model': meta['model'], 'reasoning_effort': meta.get('reasoning_effort', REASONING_EFFORT),
            'signature': meta.get('signature'), 'source_sha256': source_hash,
            'evaluation_version': meta.get('evaluation_version', VERSION),
            'evaluation_stage': meta.get('evaluation_stage', 'strategy'),
            'exported_at': utc_now(), 'delimiter': ';', 'encoding': 'UTF-8 BOM',
            'score_decimal_separator': ',', 'files_sha256': checksums,
        }
        temporary = status_path.with_name(status_path.name + '.tmp')
        temporary.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding='utf-8')
        os.replace(temporary, status_path)
        return status
    finally:
        lock.close()


def write_xls(path, extraction, analyses, meta):
    """Write real .xls, never HTML or renamed .xlsx. Unknown metrics stay blank."""
    destination = Path(path)
    if destination.suffix.lower() != ".xls":
        raise AppError("Išvesties failo plėtinys turi būti .xls.")
    workbook = xlwt.Workbook(encoding="utf-8")
    header = xlwt.easyxf("font: name Arial, height 200, bold on, colour white;"
                         "pattern: pattern solid, fore_colour dark_blue;"
                         "alignment: horiz center, vert center, wrap on;")
    normal = xlwt.easyxf("font: name Arial, height 200; alignment: vert center, wrap on;")
    numeric = xlwt.easyxf("font: name Arial, height 200; alignment: horiz right, vert center;", num_format_str="0.0")
    integer = xlwt.easyxf("font: name Arial, height 200; alignment: horiz right, vert center;", num_format_str="#,##0")
    title_style = xlwt.easyxf("font: name Arial, height 280, bold on; alignment: vert center;")
    note_style = xlwt.easyxf("font: name Arial, height 200, italic on; alignment: vert center, wrap on;")

    def sheet(name, headers, widths, title=None, note=None):
        s = workbook.add_sheet(name)
        s.show_grid = False
        start = 0
        if title:
            s.write_merge(1, 1, 0, min(5, len(headers) - 1), title, title_style)
            s.row(1).height = 420
            if note:
                s.write_merge(2, 2, 0, min(5, len(headers) - 1), note, note_style)
                s.row(2).height = 650
            s.write_merge(3, 3, 0, min(5, len(headers) - 1),
                          f"AI: {meta['model']} / {meta.get('reasoning_effort', 'neužfiksuota')} | Eksportas UTC: {utc_now()}", note_style)
            s.row(3).height = 420
            start = 4
        s.row(start).height = 700
        for col, heading in enumerate(headers):
            s.write(start, col, heading, header)
            s.col(col).width = int(widths[col] * 256)
        s.set_panes_frozen(True)
        s.set_horz_split_pos(start + 1)
        s.set_vert_split_pos(2 if len(headers) > 10 else 1)
        return s, start + 1

    def write_row(s, row, values):
        s.row(row).height = 1100
        for col, value in enumerate(values):
            style = integer if isinstance(value, int) else numeric if isinstance(value, float) else normal
            if value is None:
                s.write(row, col, "", style)
            else:
                # xlwt stores strings literally, including strings beginning with =/+/@.
                s.write(row, col, value, style)

    complete = ranked([analyses[d] for d in extraction.domains if d in analyses])
    pending = [d for d in extraction.domains if d not in analyses]
    stage = meta.get('evaluation_stage', 'strategy')
    all_rows = []
    for place, item in enumerate(complete, 1):
        d = item["domain"]
        all_rows.append([place, d, CATEGORIES[item["c"]], item["n"], item["score"],
                         MONETIZATION[item["m"]], item["w"], priority(item["score"]), item["q"], RISKS[item["r"]],
                         item["d"], item["v"], item["s"], item["k"], item["b"], None, None, "Dar nematuota",
                         STAGE_LABELS[stage], meta["model"], item.get("analyzed_at", ""),
                         extraction.first_lines[d], extraction.occurrences[d]])
    widths = [7, 27, 32, 30, 15, 32, 70, 18, 17, 65, 18, 18, 22, 22, 22, 14, 20, 20, 20, 34, 28, 17, 17]
    # BIFF8 has 65,536 rows: split rather than drop any domain when input grows.
    for part, offset in enumerate(range(0, max(len(all_rows), 1), 65530), 1):
        s, first = sheet("Reitingas" if part == 1 else f"Reitingas {part}", HEADERS, widths,
                         "Domenų atranka — " + ("TARPINIS reitingas" if pending else "visų domenų reitingas"),
                         f"{STAGE_LABELS[stage]}. {'ANALIZĖ NEBAIGTA. ' if pending else 'ETAPAS BAIGTAS. '}Įvertinta {len(complete):,} / {len(extraction.domains):,} ({len(complete) / len(extraction.domains):.1%}). "
                         f"Čia tik įvertinti domenai. Dar {len(pending):,} laukia lape „Laukia AI“.")
        for row, values in enumerate(all_rows[offset:offset + 65530], first):
            write_row(s, row, values)

    by_cat, by_niche = defaultdict(list), defaultdict(list)
    for item in complete:
        by_cat[item["c"]].append(item)
        by_niche[(item["c"], item["n"].casefold())].append(item)

    def group_row(key, group, niche=False):
        best = ranked(group)[0]
        return ([CATEGORIES[key[0]], best["n"]] if niche else [CATEGORIES[key]]) + [
            len(group), round(sum(x["score"] for x in group) / len(group), 1), best["score"],
            best["domain"], sum(x["score"] >= 75 for x in group),
            MONETIZATION[Counter(x["m"] for x in group).most_common(1)[0][0]]]

    cats = sorted(by_cat.items(), key=lambda pair: (-max(x["score"] for x in pair[1]),
                  -sum(x["score"] for x in pair[1]) / len(pair[1]), CATEGORIES[pair[0]]))
    s, first = sheet("Kategorijos", ["Kategorija", "Domenų skaičius", "Vidurkis (0–100)",
                    "Geriausias balas", "Geriausias domenas", "A prioriteto domenai", "Dažniausia monetizacija"],
                    [44, 20, 22, 20, 38, 24, 44], "Kategorijų suvestinė",
                    "Rikiuota pagal geriausią domeną, tada vidurkį. Tik įvertinti domenai.")
    for row, (key, group) in enumerate(cats, first):
        write_row(s, row, group_row(key, group))
    niches = sorted(by_niche.items(), key=lambda pair: (-max(x["score"] for x in pair[1]),
                    -sum(x["score"] for x in pair[1]) / len(pair[1]), pair[0]))
    s, first = sheet("Nišos", ["Kategorija", "Niša", "Domenų skaičius", "Vidurkis (0–100)",
                    "Geriausias balas", "Geriausias domenas", "A prioriteto domenai", "Dažniausia monetizacija"],
                    [44, 36, 20, 22, 20, 38, 24, 44], "Nišų suvestinė",
                    "Nišų pavadinimai iš AI; sinonimus galima suvienodinti vėlesniame etape.")
    for row, (key, group) in enumerate(niches, first):
        write_row(s, row, group_row(key, group, True))

    grouped = [item for _, group in cats for item in ranked(group)]
    for part, offset in enumerate(range(0, max(len(grouped), 1), 65530), 1):
        s, first = sheet("Pagal kategorijas" if part == 1 else f"Pagal kategorijas {part}",
                         ["Kategorija", "Niša", "Domenas", "Potencialas (0–100)", "Monetizavimas", "Pagrindimas"],
                         [34, 32, 30, 18, 34, 70], "Domenai sugrupuoti pagal kategorijas",
                         "Kiekvienos kategorijos viduje stipriausi domenai viršuje. Tik AI įvertinti domenai.")
        for row, item in enumerate(grouped[offset:offset + 65530], first):
            write_row(s, row, [CATEGORIES[item['c']], item['n'], item['domain'], item['score'],
                               MONETIZATION[item['m']], item['w']])

    for part, offset in enumerate(range(0, max(len(pending), 1), 65530), 1):
        s, first = sheet("Laukia AI" if part == 1 else f"Laukia AI {part}",
                         ["Domenas", "Būsena", "Šaltinio eilutė", "Pasikartojimai"], [36, 42, 22, 22],
                         "Dar neįvertinti domenai",
                         f"{len(pending):,} domenų dar laukia AI. Kategorijos ir balai bus pridėti po vertinimo; jų nėra reitinge.")
        for row, domain in enumerate(pending[offset:offset + 65530], first):
            write_row(s, row, [domain, "Laukia Codex vertinimo", extraction.first_lines[domain], extraction.occurrences[domain]])
    for part, offset in (enumerate(range(0, max(len(complete), 1), 65530), 1) if stage == 'strategy' else []):
        s, first = sheet("Idėjos" if part == 1 else f"Idėjos {part}",
                         ["Domenas", "Pagrindinis raktažodis", "Klientas ir poreikis", "Pirmos svetainės idėja",
                          "Kas mokėtų ir už ką", "Alternatyvūs pajamų keliai", "Pirmas paklausos testas",
                          "Svarbiausia kliūtis", "Starto tinkamumas (0–5)", "Pavadinimo tipas"],
                         [28, 32, 48, 65, 55, 55, 55, 55, 22, 35],
                         "Konkrečios strateginės hipotezės",
                         "Tai idėjos pagal pavadinimą. Paklausa, partneriai ir vieneto ekonomika dar nepatikrinti.")
        for row, item in enumerate(complete[offset:offset + 65530], first):
            write_row(s, row, [item['domain'], item['t'], item['u'], item['p'], item['e'], item['z'],
                               item['h'], item['l'], item['a'], NAME_TYPES[item['f']]])
    s, first = sheet("Metodika", ["Rodiklis", "Reikšmė"], [38, 150], "Vertinimo metodika")
    facts = {
        "Šaltinis": extraction.stats["source_file"], "Šaltinio SHA-256": extraction.stats["source_sha256"],
        "Šaltinio eilučių": extraction.stats["lines"], "Domenų paminėjimų": extraction.stats["matches"],
        "Unikalių domenų": len(extraction.domains), "Pašalinta pasikartojimų": extraction.stats["duplicates_removed"],
        "Sukategorizuota": len(complete), "Laukia AI": len(pending), "AI modelis": meta["model"],
        "Mąstymo lygis": meta.get("reasoning_effort", "Neužfiksuota šiame eksporte"),
        "Vertinimo versija": meta.get('evaluation_version', VERSION), "Vertinimo etapas": STAGE_LABELS[stage], "Eksportuota (UTC)": utc_now(),
        "AI tiekėjas": "Codex CLI per esamą prisijungimą",
        "Naudojimas": "Codex CLI grąžina tokenų skaičių, bet ne patikimą USD kainą. Gemini/OpenRouter nekviečiami.",
        "Balas": "Svertinė suma (k30/d20/v25/s10/b15) × (0,5 + semantikos aiškumas/200) × starto koeficientas: a0=0,55; a1=0,64; a2=0,73; a3=0,82; a4=0,91; a5=1.",
        "Kalibracija": "Modifikuotas raktažodis k≤3, brandas k≤1 ir balas≤35. Reguliuojamos nišos a≤3, galima svetimo ženklo rizika a≤1. Tai portfelio atrankos politika, ne išmatuota rinkos tikimybė.",
        "Neaiškūs vardai": "Neaiški kategorija arba monetizacija: galutinis balas neviršija 25.",
        "Prioritetai": "A: ≥75; B: ≥50 ir <75; C: <50. Vienodas balas: AI pasitikėjimas, tada domenas abėcėlės tvarka.",
        "Vertinimo ribos": "AI hipotezės tik pagal domeno pavadinimą. Paklausa, CPC, konkurencija, pajamos ir istorija nematuoti.",
        "DR": "Ahrefs šiame etape nekviečiamas. Tuščias DR reiškia nematuota, o ne 0.",
        "Domeno būsena": "Nuosavybė, registravimo prieinamumas ir prekės ženklų teisės netikrinti.",
        "Kategorijos": "Fiksuota 36 kategorijų taksonomija; kiekvienas domenas turi vieną pagrindinę kategoriją ir konkrečią nišą.",
        "Nišų grupavimas": "Grupuojama pagal kategoriją ir AI nišos pavadinimą, ignoruojant raidžių dydį; sinonimai nejungiami automatiškai.",
        "Atnaujinimas": "Reitingas ir suvestinės yra šio eksporto momentinė kopija. Po pakeitimų eksportuoti iš programos iš naujo.",
        "Google Sheets": "Į Google Sheets importuota kopija pati neatsinaujina. Norint matyti vėlesnius rezultatus reikia importuoti naują XLS.",
        "Lapų paskirtis": "Reitingas: stipriausi įvertinti domenai; Kategorijos/Nišos: suvestinės; Pagal kategorijas: domenų grupės; Laukia AI: dar neįvertinti. " + ("Idėjos: išsami strategija." if stage == 'strategy' else "Išsamios idėjos kuriamos atskirame finalistų etape, šiame faile jų nėra."),
        "Strategija": "Pirma turinys ir tikrų užklausų matavimas; tiekėjai, partnerystės ar produktai tik po rezultatų.",
        "Expired domenų patikra": "Sąrašas yra šaltinio kandidatai. DR, nuorodų kokybė, istorijos teminis atitikimas ir registravimo būsena dar netikrinti.",
        "Domenų valymas": "Unikalūs mažosiomis raidėmis, IDN punycode, pašalintas www. El. pašto adresai ir skaitiniai lentelės duomenys ignoruojami.",
        "Šaltinio platformos": "ExpiredDomains.net ir Seo.Domains paminėjimai pašalinti: tai sąrašo platformų duomenys.",
    }
    for row, values in enumerate(facts.items(), first):
        write_row(s, row, list(values))
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".tmp")
    try:
        workbook.save(str(temporary))
        os.replace(temporary, destination)
    except PermissionError:
        raise AppError("XLS failas užrakintas. Uždarykite jį Excel ir pakartokite eksportą.") from None
    except OSError as exc:
        if exc.errno == errno.ENOSPC:
            raise AppError("XLS eksportui diske nepakanka vietos. Ankstesnis XLS neperrašytas.") from None
        raise AppError(f"Nepavyko įrašyti XLS (OS klaida {exc.errno}). Ankstesnis XLS neperrašytas.") from None
    finally:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass


@dataclass
class Options:
    input: Path = DEFAULT_INPUT
    output: Path = DEFAULT_OUTPUT
    model: str | None = None
    batch_size: int = 6
    workers: int = 2
    limit: int = 0
    extract_only: bool = False
    export_only: bool = False
    priority_file: Path | None = None
    stage: str = 'strategy'
    cache_file: Path | None = None
    selected_domains: list[str] | None = None
    stop_file: Path | None = None
    owner_lock_directory: Path | None = None


def _run(options, report=print, stop=None):
    stop = stop or threading.Event()
    if not 1 <= options.batch_size <= 300 or not 1 <= options.workers <= 4 or options.limit < 0:
        raise AppError("Grupė 1–300, Codex procesų skaičius 1–4, domenų limitas ≥0.")
    extraction = extract_domains(options.input)
    if not extraction.domains:
        raise AppError("Faile nerasta domenų.")
    if options.stage not in STAGE_LABELS:
        raise AppError('Nežinomas vertinimo etapas.')
    if options.selected_domains is not None:
        selected = options.selected_domains
        if not selected or len(set(selected)) != len(selected) or not set(selected).issubset(extraction.domains):
            raise AppError('Atrinkti domenai turi būti unikalūs ir priklausyti šaltiniui.')
        extraction = Extraction(list(selected), extraction.occurrences, extraction.first_lines,
                                {**extraction.stats, 'selection_total': len(selected)})
    output = Path(options.output)
    if output.suffix.lower() != ".xls":
        raise AppError("Išvestis turi būti .xls.")
    output.parent.mkdir(parents=True, exist_ok=True)
    model = options.model or configured_model()
    signature = signature_for(model, options.stage)
    report(f"Ištraukta {len(extraction.domains):,} unikalių domenų; pašalinta {extraction.stats['duplicates_removed']:,} pasikartojimų.")
    (output.parent / "domenai_clean.txt").write_text("\n".join(extraction.domains) + "\n", encoding="utf-8")
    cache_file = Path(options.cache_file or output.parent / 'analysis.sqlite3').resolve()
    store = Store(cache_file)
    analyses = store.load(signature)
    meta = {"model": model, "reasoning_effort": REASONING_EFFORT, "provider": "Codex CLI",
            "signature": signature, "worker_pid": os.getpid(),
            "evaluation_stage": options.stage, 'evaluation_version': SCREEN_VERSION if options.stage == 'screen' else VERSION,
            'cache_file': str(cache_file),
            'owner_lock_directory': str(Path(options.owner_lock_directory or output.parent).resolve())}
    pending = [(i, d) for i, d in enumerate(extraction.domains) if d not in analyses]
    if options.priority_file:
        try:
            with Path(options.priority_file).open(encoding='utf-8-sig', newline='') as handle:
                previous_order = {row['Domenas']: rank for rank, row in enumerate(csv.DictReader(handle, delimiter=';'))}
            pending.sort(key=lambda pair: (pair[1] not in previous_order, previous_order.get(pair[1], pair[0])))
            report("Prioritetinis CSV nustato AI apdorojimo eilę; galutinius vertinimus skiria dabartinė AI versija.")
        except (OSError, KeyError, csv.Error) as exc:
            raise AppError("Nepavyko perskaityti peržiūros prioriteto CSV.") from exc
    if options.limit:
        pending = pending[:options.limit]

    def export(status):
        meta.update(status=status, categorized=sum(d in analyses for d in extraction.domains),
                    total=len(extraction.domains), updated_at=utc_now(), source=extraction.stats)
        meta['export_errors'] = []
        try:
            write_csv(output.parent, extraction, analyses, meta)
        except (AppError, OSError) as exc:
            meta['export_errors'].append('CSV: ' + str(exc))
            report(str(exc) + " AI eiga saugoma SQLite; CSV galima eksportuoti vėliau.")
        xls_error = None
        try:
            write_xls(output, extraction, analyses, meta)
        except AppError as exc:
            xls_error = exc
            meta['export_errors'].append('XLS: ' + str(exc))
        summary = output.parent / 'run_summary.json'
        temporary = summary.with_name(summary.name + '.tmp')
        try:
            temporary.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
            os.replace(temporary, summary)
        except OSError:
            raise AppError('Nepavyko įrašyti eigos suvestinės; patikrinkite laisvą vietą ir failų prieigą.') from None
        finally:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass
        if xls_error:
            raise xls_error

    try:
        stop_request = options.stop_file or output.parent / '.stop.request'
        if options.stop_file is None:
            stop_request.unlink(missing_ok=True)
        if options.extract_only or options.export_only or not pending:
            export("complete" if all(d in analyses for d in extraction.domains) else "partial")
            report(f"Eksportas atliktas (CSV / XLS). AI: {meta['categorized']:,}/{meta['total']:,}.")
            return meta
        client = CodexCLI(model, response_schema(options.stage), SCREEN_PROMPT if options.stage == 'screen' else SYSTEM_PROMPT,
                          {"categories": CATEGORIES, "monetization": MONETIZATION, "risk": RISKS},
                          lambda response, batch: validate_items(response, batch, options.stage), stop,
                          timeout=1800 if options.stage == 'screen' else 900)
        client.preflight()
        report(f"AI: Codex CLI ({model}, {REASONING_EFFORT} / Extra high). DR bus matuojamas vėliau.")
        try:
            export("running")
        except AppError as exc:
            report(str(exc) + " Analizė tęsiama, eiga saugoma SQLite.")
        tasks = [(pending[i:i + options.batch_size], 0) for i in range(0, len(pending), options.batch_size)]
        inflight, error = {}, None
        deferred = []
        meta['deferred_domains'] = deferred
        last_export = time.monotonic()
        with ThreadPoolExecutor(max_workers=options.workers) as executor:
            while tasks or inflight:
                if stop_request.exists():
                    stop.set()
                    stop_request.unlink(missing_ok=True)
                while tasks and len(inflight) < options.workers and not stop.is_set() and error is None:
                    batch, attempt = tasks.pop(0)
                    inflight[executor.submit(client.classify, batch)] = (batch, attempt)
                if not inflight:
                    break
                done, _ = wait(inflight, timeout=0.5, return_when=FIRST_COMPLETED)
                for future in done:
                    batch, attempt = inflight.pop(future)
                    try:
                        items, info, validation_error = future.result()
                        store.record_call(signature, info)
                        if items:
                            received = [item['domain'] for item in items]
                            if len(received) != len(set(received)) or not set(received).issubset(domain for _,domain in batch):
                                raise AppError('Grupės rezultatai neatitinka jos domenų.')
                            store.save(signature, items)
                            analyses.update({item['domain']: item for item in items})
                            count = sum(d in analyses for d in extraction.domains)
                            report(f"AI: {count:,}/{len(extraction.domains):,} | +{len(items)} | išvesties tokenų {info['output']:,}")
                        if validation_error:
                            batch = [(index,domain) for index,domain in batch if domain not in analyses]
                            if batch:
                                raise CodexError(validation_error, 'limitas' not in validation_error,
                                                 kind=info.get('failure_kind','transient'))
                    except CodexError as exc:
                        if stop.is_set():
                            continue
                        isolate_validation = exc.kind == 'validation' and exc.retryable
                        if exc.retryable and error is None and (attempt < 2 or (isolate_validation and len(batch) > 1)):
                            # Split invalid/timeout groups to avoid repeatedly losing a large batch.
                            if len(batch) > 1:
                                middle = len(batch) // 2
                                parts = [batch[:middle], batch[middle:]]
                                tasks[0:0] = [(part, 0 if len(part) == 1 and isolate_validation else attempt + 1)
                                              for part in parts]
                            else:
                                tasks.insert(0, (batch, attempt + 1))
                            report(f"Kartojama Codex grupė ({len(batch)} domenų); taisyklingi rezultatai išsaugoti: {exc}")
                        elif isolate_validation and len(batch) == 1 and error is None:
                            deferred.append({'domain':batch[0][1], 'reason':str(exc)})
                            report(f'Atidėtas netinkamas atsakymas: {batch[0][1]}. Kitų domenų analizė tęsiama.')
                        else:
                            error = exc
                            report(f"Sustabdyta: {exc}")
                    except Exception:
                        error = AppError("Grupės išsaugojimo arba proceso klaida; patikrinkite failų prieigą.")
                        report(str(error))
                if time.monotonic() - last_export >= 60:
                    try:
                        export("running")
                    except AppError as exc:
                        report(str(exc) + " Eiga išsaugota SQLite.")
                    last_export = time.monotonic()
        complete = all(d in analyses for d in extraction.domains)
        status = 'complete' if complete else 'error' if error else 'stopped' if stop.is_set() else 'partial'
        export(status)
        if deferred:
            report(f'{len(deferred)} domenų liko neįvertinti po individualių bandymų; '
                   'jie lieka „Laukia AI“, visas etapas nepažymimas baigtu.')
        report(f"Eksportas atliktas (CSV / XLS). AI: {meta['categorized']:,}/{meta['total']:,}.")
        if error:
            raise error
        return meta
    finally:
        store.close()


@contextmanager
def run_lock(directory):
    """One writer, held across every stage of a pipeline."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    lock = (directory / '.run.lock').open('a+b')
    try:
        if lock.tell() == 0:
            lock.write(b'0')
            lock.flush()
        lock.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise AppError('Šiame išvesties kataloge jau vyksta darbas. Palaukite arba sustabdykite kitą paleidimą.') from None
        yield
    finally:
        lock.close()


def run(options, report=print, stop=None):
    with run_lock(Path(options.output).parent):
        return _run(options, report, stop)


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    parser = argparse.ArgumentParser(description='Domenai → Codex CLI → nišų reitingas CSV ir XLS.')
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--model', default=None, help='Numatyta: gpt-6.1-sol, xhigh (Extra high).')
    parser.add_argument('--batch-size', type=int, default=6)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--limit', type=int, default=0, help='Kiek naujų domenų vertinti (0=visus).')
    parser.add_argument('--extract-only', action='store_true')
    parser.add_argument('--export-only', action='store_true')
    parser.add_argument('--priority-file', type=Path, default=None, help='Ankstesnio CSV domenų eilė; neimportuoja senų balų.')
    parser.add_argument('--stage', choices=list(STAGE_LABELS), default='strategy')
    args = parser.parse_args()
    stop = threading.Event()
    import signal
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    try:
        result = run(Options(**vars(args)), stop=stop)
        return 0 if result['status'] == 'complete' or args.extract_only or args.export_only or args.limit else 2
    except (AppError, CodexError) as exc:
        print(f'Klaida: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
