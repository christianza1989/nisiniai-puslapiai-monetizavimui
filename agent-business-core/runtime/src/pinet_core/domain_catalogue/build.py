"""Offline allowlist importer; explicit local inputs only, never reads SQLite or contacts."""

import argparse
import csv
import hashlib
import io
import json
from collections import Counter
from pathlib import Path

from .models import COLUMNS, DomainRecord, normalized_host
from .service import VERSION, DomainCatalogue, snapshot_hash
from .taxonomy import CATEGORIES, infer_category

RISK_LABELS = {
    "Specifinė rizika nepastebėta; patikra neatlikta": "none",
    "Galimas prekės ženklo sutapimas; būtina patikra": "brand",
    "Reguliuojama niša arba ekspertinio turinio poreikis": "regulated",
    "Neaiški pavadinimo reikšmė": "ambiguous",
    "Suaugusiųjų turinio ribojimai": "adult",
    "Lošimų reguliavimas ir reklamos ribojimai": "gambling",
}


def number(value):
    return float(value.replace(",", ".")) if value else None


def csv_rows(path):
    return list(csv.DictReader(io.StringIO(Path(path).read_text(encoding="utf-8-sig")), delimiter=";"))


def index_rows(rows, domains):
    result = {}
    for row in rows:
        domain = normalized_host(row["Domenas"])
        if domain not in domains or domain in result:
            raise ValueError("unknown_or_duplicate_source_domain")
        result[domain] = row
    return result


def encode_snapshot(snapshot):
    """Identical UTF-8/LF bytes on Windows and Linux; text-mode newline translation is unsafe."""
    return (json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")


def build(inventory, queue, screening, selection, research, snapshot_date):
    paths = [Path(value) for value in (inventory, queue, screening, selection, research)]
    domains = paths[0].read_text(encoding="utf-8-sig").splitlines()
    if not domains or any(normalized_host(value) != value for value in domains):
        raise ValueError("inventory_not_canonical")
    domain_set = set(domains)
    if len(domain_set) != len(domains):
        raise ValueError("duplicate_inventory")
    queue_rows = index_rows(csv_rows(paths[1]), domain_set)
    if set(queue_rows) != domain_set:
        raise ValueError("queue_inventory_mismatch")
    screening_rows = index_rows(csv_rows(paths[2]), domain_set)
    manifest = json.loads(paths[3].read_bytes())
    top_domains = manifest["domains"]
    if len(top_domains) != 200 or len(set(top_domains)) != 200 or not set(top_domains) <= domain_set:
        raise ValueError("invalid_top200_membership")
    if manifest["source"]["unique_domains"] != len(domains):
        raise ValueError("source_inventory_count_mismatch")
    research_rows = index_rows(csv_rows(paths[4]), domain_set)
    if set(research_rows) != set(top_domains):
        raise ValueError("research_top200_membership_mismatch")
    labels = {value: key for key, value in CATEGORIES.items()}
    records = []
    for source_index, domain in enumerate(domains, 1):
        item = screening_rows.get(domain)
        if item:
            category = labels[item["Kategorija"]]
            classification_source = "source_ai_screening"
            evidence = []
        else:
            category, evidence = infer_category(domain)
            classification_source = "lexical_inference" if evidence else "unclassified"
        top = None
        if domain in top_domains:
            detail = manifest["selection_details"][domain]
            researched = research_rows[domain]
            top = {
                "research_priority": detail["research_priority"],
                "potential_priority": detail["potential_priority"],
                "initial_selection_rank": detail["initial_research_priority"],
                "selection_value_heuristic": detail["selection_value_heuristic"],
                "source_niche_key": detail["niche_key"],
                "potential_tier": detail["potential_tier"],
                "research_source_priority": int(researched["Tyrimo prioritetas 1–200"]),
                "research_source_initial_rank": int(researched["Pradinė atrankos vieta"]),
                "ahrefs_dr": detail.get("ahrefs_dr"),
                "ahrefs_dr_checked_at": detail.get("ahrefs_dr_checked_at"),
                "ahrefs_dr_source": detail.get("ahrefs_dr_source") or None,
                "research_score": number(researched["Tyrimo balas"]),
                "research_evaluated_at": researched["Tyrimo data UTC"] or None,
            }
        row = DomainRecord.model_validate({
            "domain": domain, "category": category, "classification_source": classification_source,
            "category_evidence": evidence, "niche": item["Niša"] if item else None,
            "keyword": item["Pagrindinis raktažodis"] or None if item else None,
            "risk": RISK_LABELS[item["Pagrindinė rizika"]] if item else "unknown",
            "source_index": source_index, "queue_rank": int(queue_rows[domain]["Vieta eilėje"]),
            "queue_score": number(queue_rows[domain]["Eilės balas (heuristinis)"]),
            "screening_rank": int(item["Vieta"]) if item else None,
            "screening_score": number(item["Potencialas (0–100)"]) if item else None,
            "screening_evaluated_at": item["AI vertinta (UTC)"] if item else None, "top200": top,
        }).model_dump(mode="json")
        records.append(row)
    versions = sorted({item["Vertinimo versija"] for item in screening_rows.values()})
    models = sorted({item["AI modelis"] for item in screening_rows.values()})
    source_docs = [{"name": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
                   for path in paths]
    completed = sum(row["top200"] is not None and row["top200"]["research_score"] is not None
                    for row in records)
    metadata = {
        "snapshot_date": snapshot_date, "inventory_count": len(domains), "screening_count": len(screening_rows),
        "top200_count": 200, "top200_research_complete_count": completed,
        "top200_research_pending_count": 200 - completed,
        "source_documents": source_docs, "original_inventory_sha256": manifest["source"]["source_sha256"],
        "classification_counts": dict(Counter(row["classification_source"] for row in records)),
        "screening_models": models, "screening_versions": versions, "taxonomy_version": "lexical-v1",
        "selection_created_at": manifest["created_at"],
        "selection_priority_updated_at": manifest["priority_updated_at"],
        "rank_comparison": {
            "research_priority_differences": sum(
                row["top200"]["research_priority"] != row["top200"]["research_source_priority"]
                for row in records if row["top200"]),
            "initial_rank_differences": sum(
                row["top200"]["initial_selection_rank"] != row["top200"]["research_source_initial_rank"]
                for row in records if row["top200"]),
        },
        "availability": "unknown", "availability_checked_at": None,
        "notice": "Tai ankstesnis domenų inventorius. Dabartinis prieinamumas ir teisė naudoti domeną nepatikrinti.",
        "score_notice": "Ankstesni DI ir eilės balai yra atrankos vertinimai; jie neįrodo paklausos, pajamų ar pelno.",
    }
    payload = {"catalogue_version": VERSION, "metadata": metadata, "columns": COLUMNS,
               "rows": [[row[key] for key in COLUMNS] for row in records]}
    result = {"snapshot_id": snapshot_hash(payload), **payload}
    DomainCatalogue(result)  # A complete integrity check before any output write.
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "queue", "screening", "selection", "research", "snapshot-date", "output"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    result = build(args.inventory, args.queue, args.screening, args.selection, args.research, args.snapshot_date)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(encode_snapshot(result))
    print(json.dumps({"snapshot_id": result["snapshot_id"], "inventory_count": result["metadata"]["inventory_count"],
                      "screening_count": result["metadata"]["screening_count"], "top200_count": 200,
                      "classification_counts": result["metadata"]["classification_counts"]}))


if __name__ == "__main__":
    main()
