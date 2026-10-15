"""Safe current document/media identity and integrity; no provider or activation."""

import base64
import hashlib
import json
import runpy
from copy import deepcopy
from types import SimpleNamespace

import pytest

from pinet_core.content_completion.service import parse_media, parse_page
from pinet_core.control.routes import ControlError
from pinet_core.creation.adapter import ROOT
from pinet_core.creation.review import canonical_sha256


def source():
    # Standalone synthetic reader input: offline collection must not depend on
    # whether a PostgreSQL/test directory happened to be added to sys.path.
    creation = SimpleNamespace(id="05c7097b-0c06-4831-b067-7f7aff7826f9", status="draft_ready", active_job_id=None)
    proof = {"accepted_revision": 2, "candidate_sha256": "a" * 64, "accepted_source_revision": "b" * 40,
             "site_id": "creation-05c7097b0c064831b0677f7aff7826f9", "canonical_host": "test.example.lt"}
    item = {"pageId": "page-85b2000754b5eb53d4d460db", "title": "Privatus gidas",
            "revisionHash": "c" * 64, "reviewCurrent": False, "hasApprovedRevision": False,
            "state": "blocked", "blockers": ["Trūksta aktualios redakcinės peržiūros."],
            "internalPlanned": 0, "internalAttached": 0}
    detail = {**item, "type": "guide", "path": "/gidai/bandymas/", "planningHash": "d" * 64,
              "factChecks": ["Paslaugos vykdymas dar nepatvirtintas."], "externalLinks": [],
              "mediaCount": 0, "mediaFilesPresent": True, "reviewedAt": None, "reviewer": None,
              "approvedRevisionHash": None}
    node = {"version": "customer-content-workflow.v1", "state": "current", "creationId": creation.id,
            "acceptedRevision": 2, "sourceHash": proof["candidate_sha256"], "siteId": proof["site_id"],
            "canonicalHost": proof["canonical_host"], "release": "UNVERIFIED", "observedAt": "2026-10-11T02:00:00Z",
            "expectedSiteHash": "e" * 64, "workflow": {"siteId": proof["site_id"], "canonicalHost": proof["canonical_host"],
                "workflowVersion": 1, "deployment": "not-verified-by-studio", "pages": [item]}, "pages": [detail]}
    return creation, proof, node


def current():
    creation, proof, node = source()
    page = node["pages"][0]
    node["pageDocument"] = {
        "pageId": page["pageId"],
        "revisionHash": page["revisionHash"],
        "title": page["title"],
        "description": "Aktualus privatus skaitymo pavyzdys.",
        "intent": "Perskaityti dabartinį tekstą.",
        "body": [{"type": "paragraph", "text": "Current synthetic body."}],
        "media": [],
        "links": [],
    }
    node["pageDocumentHash"] = canonical_sha256(node["pageDocument"])
    return creation, proof, node, page["pageId"]


def test_current_document_is_exact_read_only_and_not_historical_candidate():
    creation, proof, node, pid = current()
    before = deepcopy(node)
    view = parse_page(node, creation, proof, pid)
    assert node == before and view["observation_scope"] == "current_private_page"
    assert view["document_sha256"] == node["pageDocumentHash"]
    assert view["permitted_actions"] == ["refresh", "read_media"]
    assert view["completion"]["private_release_status"] == "UNVERIFIED"
    assert "siteSnapshot" not in view["document"] and "candidate" not in view


@pytest.mark.parametrize("change", ["id", "hash", "title", "body", "extra", "media_count", "foreign_link"])
def test_document_binding_or_extra_private_data_fails_closed(change):
    creation, proof, node, pid = current()
    if change == "id":
        node["pageDocument"]["pageId"] = "foreign-page"
    if change == "hash":
        node["pageDocument"]["revisionHash"] = "0" * 64
    if change == "title":
        node["pageDocument"]["title"] = "Other title"
    if change == "body":
        node["pageDocument"]["body"][0]["text"] = "Tampered after hash"
    if change == "extra":
        node["pageDocument"]["prompt"] = "Private source"
    if change == "media_count":
        node["pages"][0]["mediaCount"] = 1
    if change == "foreign_link":
        node["pageDocument"]["links"] = [{"pageId": "foreign-page", "path": "/other/", "title": "Other"}]
    if change != "body":
        node["pageDocumentHash"] = canonical_sha256(node["pageDocument"])
    with pytest.raises(ControlError, match="invalid_content_page_source"):
        parse_page(node, creation, proof, pid)


def media():
    creation, proof, node, pid = current()
    raw = b"RIFFsyntheticWEBPbytes"
    node["mediaData"] = {
        "pageId": pid,
        "revisionHash": "c" * 64,
        "asset": {
            "id": "synthetic-asset",
            "alt": "Synthetic",
            "width": 360,
            "height": 240,
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "credit": "",
            "mime": "image/webp",
        },
        "base64": base64.b64encode(raw).decode(),
    }
    return creation, proof, node, pid, raw


def test_current_media_bytes_mime_and_hash_are_bound():
    creation, proof, node, pid, raw = media()
    assert parse_media(node, creation, proof, pid, "synthetic-asset", "c" * 64) == ("image/webp", raw)


@pytest.mark.parametrize("change", ["page", "hash", "asset", "bytes", "mime", "encoding", "private"])
def test_media_corruption_or_scope_mismatch_never_returns_bytes(change):
    creation, proof, node, pid, _ = media()
    item = node["mediaData"]
    if change == "page":
        item["pageId"] = "foreign-page"
    if change == "hash":
        item["revisionHash"] = "0" * 64
    if change == "asset":
        item["asset"]["id"] = "foreign-asset"
    if change == "bytes":
        item["base64"] = base64.b64encode(b"bad").decode()
    if change == "mime":
        item["asset"]["mime"] = "text/html"
    if change == "encoding":
        item["base64"] = "not base64"
    if change == "private":
        item["asset"]["prompt"] = "Private prompt"
    with pytest.raises(ControlError, match="invalid_content_media_source"):
        parse_media(node, creation, proof, pid, "synthetic-asset", "c" * 64)


def test_current_page_contract_matches_export_and_shared_native_union(monkeypatch):
    scripts = ROOT / "agent-business-core/runtime/scripts"
    monkeypatch.syspath_prepend(str(scripts))
    exported = runpy.run_path(str(scripts / "customer_content_page_contract.py"))["contract"]()
    assert json.loads((ROOT / "docs/contracts/verslomatika-customer-content-page.openapi.json").read_bytes()) == exported
    schemas = exported["components"]["schemas"]
    native = json.loads((ROOT / "content-studio/schemas/content-package.v2.schema.json").read_bytes())
    assert all("Native_" + name in schemas for name in native["$defs"])
    assert schemas["Document"]["properties"]["body"]["items"] == {"$ref": "#/components/schemas/Native_block"}
    assert set(schemas["Media"]["properties"]) == {"id", "alt", "width", "height", "bytes", "sha256", "credit", "mime"}
    operation = next(value["get"] for path, value in exported["paths"].items() if "/media/" in path)
    assert set(operation["responses"]["200"]["content"]) == {"image/webp", "image/avif"}
    assert operation["x-unknown-query-parameters"] == operation["x-duplicate-query-parameters"] == "rejected"
