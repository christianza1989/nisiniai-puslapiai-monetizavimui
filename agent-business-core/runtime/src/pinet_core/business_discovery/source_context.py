"""Bounded, historical external claims from one report's own captured research.

No network/files, factual admission or catalogue completion is performed here.
The private marker opts new captures in; legacy omission remains byte-compatible.
"""
import hashlib
import json
import re
from copy import deepcopy
from datetime import datetime
from uuid import UUID

from ..control.routes import ControlError
from ..creation.service import binding, digest
from ..public_projects.projection import public_url

VERSION = "discovery-source-context.v1"
MARKER = "source_context_version"
MAX_BYTES, MAX_SOURCES, EXCERPT_CHARS = 65536, 12, 9000
MAX_CAPTURE_BYTES, MAX_CAPTURE_COUNT = 2 * 1048576, 2000
COVERAGE = {"readerReportedComplete", "capturedCount", "includedCount", "omittedCount",
            "remainingUrlCount", "capturedClippedCount", "includedClippedCount"}
HEADER = {"version", "creationId", "discoveryId", "reportId", "reportRevision", "reportSha256", "planSha256",
          "discoveryJobId", "sourceRevision", "capturedSourcesSha256", "sources", "coverage", "claimStatus",
          "independentVerification", "excerptLimitChars", "contextSha256"}
OBSERVED = {"url", "status", "title", "observedAt", "httpStatus", "responseBytes", "bodySha256",
            "textSha256", "text", "textChars", "textMayBeClipped"}


def invalid():
    raise ControlError(503, "invalid_discovery_source_context")


def encoded(value):
    try:
        return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    except (ValueError, TypeError, UnicodeError):
        invalid()


def keys(value, expected):
    if not isinstance(value, dict) or set(value) != expected:
        invalid()


def integer(value, maximum, minimum=0):
    if type(value) is not int or not minimum <= value <= maximum:
        invalid()


def text(value, maximum, minimum=0):
    if not isinstance(value, str) or not minimum <= len(value) <= maximum:
        invalid()
    try:
        value.encode("utf-8")
    except UnicodeError:
        invalid()


def hexadecimal(value, length=64):
    if not isinstance(value, str) or len(value) != length or any(c not in "0123456789abcdef" for c in value):
        invalid()


def identity(value):
    try:
        if not isinstance(value, str) or str(UUID(value)) != value:
            invalid()
    except ValueError:
        invalid()


def url(value):
    text(value, 1024, 1)
    try:
        public_url(value)
    except ValueError:
        invalid()


def observed(value):
    keys(value, OBSERVED)
    url(value["url"])
    if value["status"] != "observed":
        invalid()
    text(value["title"], 180)
    text(value["observedAt"], 64, 1)
    try:
        at = datetime.fromisoformat(value["observedAt"].replace("Z", "+00:00"))
        if (at.utcoffset() is None or at.year < 1970
                or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)", value["observedAt"])):
            invalid()
    except ValueError:
        invalid()
    integer(value["httpStatus"], 299, 200)
    integer(value["responseBytes"], 800000, 1)
    hexadecimal(value["bodySha256"])
    hexadecimal(value["textSha256"])
    text(value["text"], EXCERPT_CHARS, 1)
    integer(value["textChars"], EXCERPT_CHARS, 1)
    if (value["textChars"] != len(value["text"]) or type(value["textMayBeClipped"]) is not bool
            or value["textMayBeClipped"] != (len(value["text"]) == EXCERPT_CHARS)
            or hashlib.sha256(value["text"].encode()).hexdigest() != value["textSha256"]):
        invalid()


def source(value):
    if not isinstance(value, dict):
        invalid()
    if value.get("status") == "observed":
        observed(value)
    else:
        keys(value, {"url", "status", "error"})
        url(value["url"])
        text(value["error"], 80, 1)
        if value["status"] != "unavailable":
            invalid()


def validate(value, *, creation_id=None):
    keys(value, HEADER)
    if (len(encoded(value)) > MAX_BYTES or value["version"] != VERSION
            or value["claimStatus"] != "external_source_claims" or value["independentVerification"] != "UNVERIFIED"
            or type(value["excerptLimitChars"]) is not int or value["excerptLimitChars"] != EXCERPT_CHARS):
        invalid()
    for field in ("creationId", "discoveryId", "reportId", "discoveryJobId"):
        identity(value[field])
    if creation_id is not None and value["creationId"] != creation_id:
        invalid()
    integer(value["reportRevision"], 2147483647, 1)
    for field in ("reportSha256", "planSha256", "capturedSourcesSha256", "contextSha256"):
        hexadecimal(value[field])
    hexadecimal(value["sourceRevision"], 40)
    if not isinstance(value["sources"], list) or len(value["sources"]) > MAX_SOURCES:
        invalid()
    for item in value["sources"]:
        source(item)
    coverage = value["coverage"]
    keys(coverage, COVERAGE)
    if type(coverage["readerReportedComplete"]) is not bool:
        invalid()
    for field in COVERAGE - {"readerReportedComplete"}:
        integer(coverage[field], MAX_CAPTURE_COUNT)
    clipped = sum(s.get("textMayBeClipped", False) for s in value["sources"])
    if (coverage["includedCount"] != len(value["sources"])
            or coverage["capturedCount"] != coverage["includedCount"] + coverage["omittedCount"]
            or coverage["includedClippedCount"] != clipped
            or not clipped <= coverage["capturedClippedCount"] <= coverage["capturedCount"]
            or coverage["capturedClippedCount"] > clipped + coverage["omittedCount"]
            or coverage["readerReportedComplete"] and (coverage["remainingUrlCount"]
                or any(s["status"] == "unavailable" for s in value["sources"]))
            or value["contextSha256"] != digest({k: v for k, v in value.items() if k != "contextSha256"})):
        invalid()
    return deepcopy(value)


def capture(raw):
    keys(raw, {"pages", "remaining_urls", "complete", "independent_fact_verification"})
    if (len(encoded(raw)) > MAX_CAPTURE_BYTES or not isinstance(raw["pages"], list)
            or len(raw["pages"]) > MAX_CAPTURE_COUNT or not isinstance(raw["remaining_urls"], list)
            or len(raw["remaining_urls"]) > MAX_CAPTURE_COUNT or type(raw["complete"]) is not bool
            or raw["independent_fact_verification"] != "UNVERIFIED"):
        invalid()
    for remaining in raw["remaining_urls"]:
        url(remaining)
    result = []
    for page in raw["pages"]:
        if not isinstance(page, dict):
            invalid()
        if page.get("status") == "observed":
            keys(page, {"url", "status", "http_status", "observed_at", "title", "body_sha256", "text_sha256",
                        "response_bytes", "text", "links"})
            if not isinstance(page["links"], list) or len(page["links"]) > MAX_CAPTURE_COUNT:
                invalid()
            for link in page["links"]:
                url(link)
            value = {key: page[old] for key, old in {"url": "url", "status": "status", "title": "title",
                "observedAt": "observed_at", "httpStatus": "http_status", "bodySha256": "body_sha256",
                "textSha256": "text_sha256", "responseBytes": "response_bytes", "text": "text"}.items()}
            text(value["text"], EXCERPT_CHARS, 1)
            value.update(textChars=len(value["text"]), textMayBeClipped=len(value["text"]) == EXCERPT_CHARS)
        else:
            value = deepcopy(page)
        source(value)
        result.append(value)
    if raw["complete"] != (not raw["remaining_urls"] and all(s["status"] == "observed" for s in result)):
        invalid()
    return result


def build(creation, parent, report, job, plan):
    if (job is None or job.id != report.job_id or job.discovery_id != report.discovery_id or parent.id != report.discovery_id
            or any(binding(row) != binding(creation) for row in (parent, report, job))
            or job.status != "succeeded" or job.source_revision != report.source_revision):
        invalid()
    usage = {} if job.usage is None else job.usage
    if not isinstance(usage, dict):
        invalid()
    if MARKER not in usage:
        return None
    if usage[MARKER] != VERSION or "source_reads" not in usage:
        invalid()
    raw = usage["source_reads"]
    sources = capture(raw)
    value = {"version": VERSION, "creationId": creation.id, "discoveryId": parent.id, "reportId": report.id,
        "reportRevision": report.revision, "reportSha256": report.material_hash, "planSha256": digest(plan),
        "discoveryJobId": job.id, "sourceRevision": report.source_revision, "capturedSourcesSha256": digest(raw),
        "sources": [], "coverage": {"readerReportedComplete": raw["complete"], "capturedCount": len(sources),
            "includedCount": 0, "omittedCount": len(sources), "remainingUrlCount": len(raw["remaining_urls"]),
            "capturedClippedCount": sum(s.get("textMayBeClipped", False) for s in sources), "includedClippedCount": 0},
        "claimStatus": "external_source_claims", "independentVerification": "UNVERIFIED", "excerptLimitChars": EXCERPT_CHARS,
        "contextSha256": "0" * 64}
    for item in sources:
        if len(value["sources"]) >= MAX_SOURCES:
            break
        candidate = deepcopy(value)
        candidate["sources"].append(item)
        candidate["coverage"].update(includedCount=len(candidate["sources"]), omittedCount=len(sources)-len(candidate["sources"]),
            includedClippedCount=sum(s.get("textMayBeClipped", False) for s in candidate["sources"]))
        if len(encoded(candidate)) <= MAX_BYTES:
            value = candidate
    value["contextSha256"] = digest({k: v for k, v in value.items() if k != "contextSha256"})
    return validate(value, creation_id=creation.id)
