"""Fail-closed transport and observation boundaries; no provider or database."""
from copy import deepcopy
from types import SimpleNamespace

import pytest

from pinet_core.content_completion.service import parse_node
from pinet_core.control.routes import ControlError


def source():
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
    value = {"version": "customer-content-workflow.v1", "state": "current", "creationId": creation.id,
        "acceptedRevision": 2, "sourceHash": proof["candidate_sha256"], "siteId": proof["site_id"],
        "canonicalHost": proof["canonical_host"], "release": "UNVERIFIED", "observedAt": "2026-10-11T02:00:00Z",
        "expectedSiteHash": "e" * 64, "workflow": {"siteId": proof["site_id"],
            "canonicalHost": proof["canonical_host"], "workflowVersion": 1, "deployment": "not-verified-by-studio", "pages": [item]},
        "pages": [detail]}
    return creation, proof, value


def test_current_observation_is_separate_from_intake_and_release():
    creation, proof, value = source()
    view = parse_node(value, creation, proof)
    assert view["observation_scope"] == "current_private_workflow"
    assert view["accepted_source_revision"] == "b" * 40
    assert view["private_release_status"] == view["seo_geo_status"] == view["full_f1_status"] == view["launch_status"] == "UNVERIFIED"
    assert view["permitted_actions"] == ["refresh"]
    assert view["pages"][0]["blockers"] == value["workflow"]["pages"][0]["blockers"]
    assert "dataDir" not in str(view) and "body" not in view["pages"][0]


@pytest.mark.parametrize("key,new", [("creationId", "bad"), ("acceptedRevision", 1), ("sourceHash", "0" * 64),
    ("siteId", "creation-" + "0" * 32), ("canonicalHost", "foreign.example.lt"), ("version", "legacy"),
    ("state", "published"), ("release", "PASS"), ("expectedSiteHash", "bad")])
def test_identity_and_unobserved_gate_claims_fail_closed(key, new):
    creation, proof, value = source()
    value[key] = new
    with pytest.raises(ControlError) as failed:
        parse_node(value, creation, proof)
    assert failed.value.code == "invalid_content_completion_source"


@pytest.mark.parametrize("change", ["missing", "duplicate", "foreign", "hash", "review", "approval", "approval_hash", "media_type", "unsafe_path"])
def test_current_canonical_inventory_must_match_details(change):
    creation, proof, value = source()
    if change == "missing":
        value["pages"] = []
    elif change == "duplicate":
        value["workflow"]["pages"].append(deepcopy(value["workflow"]["pages"][0]))
    elif change == "foreign":
        value["pages"][0]["pageId"] = "foreign-page"
    elif change == "hash":
        value["pages"][0]["revisionHash"] = "f" * 64
    elif change == "review":
        value["pages"][0]["reviewCurrent"] = True
    elif change == "approval":
        value["pages"][0]["hasApprovedRevision"] = True
    elif change == "approval_hash":
        value["pages"][0]["approvedRevisionHash"] = "f" * 64
    elif change == "media_type":
        value["pages"][0]["mediaCount"] = True
    elif change == "unsafe_path":
        value["pages"][0]["path"] = "C:/private/secret.txt"
    with pytest.raises(ControlError):
        parse_node(value, creation, proof)


def test_changed_current_draft_keeps_old_approved_identity_distinct():
    creation, proof, value = source()
    for item in (value["workflow"]["pages"][0], value["pages"][0]):
        item["hasApprovedRevision"] = True
    value["pages"][0]["approvedRevisionHash"] = "f" * 64
    view = parse_node(value, creation, proof)
    page = view["pages"][0]
    assert page["revision_sha256"] != page["approved_revision_sha256"]
    assert page["state"] == "blocked" and not page["review_current"]
