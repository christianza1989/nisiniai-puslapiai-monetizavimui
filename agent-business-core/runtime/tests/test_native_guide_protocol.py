"""Malformed native critic observations remain rejected without output repair."""
from copy import deepcopy

import pytest

from pinet_core.config import settings
from pinet_core.content_work import review
from pinet_core.tasks.codex_transport import RunnerError


@pytest.fixture
def native_review(monkeypatch):
    monkeypatch.setattr(settings(), "creation_language_review_enabled", False)
    output = {"title": "Kaip palyginti du užduoties atlikimo būdus", "description":
              "Palyginkite tą pačią užduotį pagal iš anksto užrašytas sąlygas ir rezultatą.",
              "intent": "Padėti užrašyti abiejų bandymo būdų rezultatą.",
              "body": [{"type": "paragraph", "text": "Abiem būdams naudokite tą patį išgalvotą klausimą."}],
              "factChecks": ["Tikras paslaugos vykdymas dar nepatvirtintas."]}
    receipts = review.observations(output)
    report = {"schema_version": "creation.critic.v1", "role": "critic",
              "draft_sha256": review.shared.canonical_sha256(output), "stage": "content", "round_number": 1,
              "verdict": "accept_draft", "summary": "Privatus juodraštis priimtas, faktinės patikros dar neatliktos.",
              "findings": [], "checks": [{"kind": r["kind"], "status": r["status"],
                  "evidence_refs": [r["id"]], "summary": r["summary"]} for r in receipts]}
    prepared = {"pageData": {"planningBrief": {}}, "siteData": {}}
    context = review.context(output, 1, receipts, prepared)
    return output, receipts, report, context


def test_valid_nine_single_observations_stay_unverified_in_paused_pilot(native_review):
    output, receipts, report, _ = native_review
    assert len(receipts) == 9
    assert all(r["status"] == "UNVERIFIED" and not r["observed"] for r in receipts)
    assert review.critic(report, output=output, round_number=1, receipts=receipts) == report


@pytest.mark.parametrize("defect", ["duplicate", "unknown", "wrong_kind", "wrong_status", "missing"])
def test_bad_native_check_is_rejected_and_raw_report_preserved(native_review, defect):
    output, receipts, valid, context = native_review
    report = deepcopy(valid)
    check = next(c for c in report["checks"] if c["kind"] == "language_quality")
    if defect == "duplicate":
        check["evidence_refs"] = ["r_language_quality", "r_language_quality"]
    elif defect == "unknown":
        check["evidence_refs"] = ["r_not_supplied"]
    elif defect == "wrong_kind":
        check["evidence_refs"] = [next(r["id"] for r in receipts if r["kind"] != check["kind"])]
    elif defect == "wrong_status":
        check["status"] = "PASS"
    else:
        check["evidence_refs"] = []
    original = deepcopy(report)
    with pytest.raises(RunnerError, match="review_invalid"):
        review.critic(report, output=output, round_number=1, receipts=receipts)
    assert report == original
    refs = review.output_schema("critic", context)["$defs"]["ReviewCheck"]["properties"]["evidence_refs"]
    assert refs["minItems"] == refs["maxItems"] == 1
    assert refs["items"]["enum"] == [r["id"] for r in receipts]
    # The actual duplicate failure is excluded at the provider boundary as well.
    if defect in {"duplicate", "missing"}:
        assert not refs["minItems"] <= len(check["evidence_refs"]) <= refs["maxItems"]
    elif defect == "unknown":
        assert check["evidence_refs"][0] not in refs["items"]["enum"]
