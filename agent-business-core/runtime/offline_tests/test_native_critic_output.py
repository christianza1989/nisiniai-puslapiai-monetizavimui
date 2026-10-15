"""Compact provider prose restores exact native receipts; no provider or database."""
import json
from copy import deepcopy

import pytest
from test_content_work_review import critic as legacy_critic
from test_content_work_review import output

from pinet_core.content_work import adapter, review
from pinet_core.creation.review import CriticReview
from pinet_core.tasks.codex_transport import RunnerError

VERSION = "content-work.critic-output.v2"


def compact(candidate, receipts, verdict="accept_draft"):
    report = legacy_critic(candidate, receipts, verdict)
    prepared = {"pageData": {"planningBrief": {}}, "siteData": {}}
    context = review.context(candidate, 1, receipts, prepared)
    findings = []
    for finding in report["findings"]:
        item = {key: value for key, value in finding.items() if key != "evidence_refs"}
        item["evidence_ref_indices"] = [context["allowed_finding_refs"].index(ref) for ref in finding["evidence_refs"]]
        findings.append(item)
    return {**{key: value for key, value in report.items() if key not in {"findings", "checks"}},
        "schema_version": VERSION, "findings": findings,
        "check_summaries": {check["kind"]: check["summary"] for check in report["checks"]}}, context, report


def test_native_provider_schema_avoids_literal_reference_enum_and_mechanical_checks():
    candidate = output()
    candidate["body"] *= 80
    receipts = review.observations(candidate)
    _, context, _ = compact(candidate, receipts)
    schema = review.output_schema("critic", context)
    assert schema["properties"]["schema_version"]["const"] == VERSION
    assert "checks" not in schema["properties"] and "check_summaries" in schema["required"]
    assert len(schema["$defs"]["CheckSummaries"]["required"]) == 9
    indices = schema["$defs"]["BusinessFinding"]["properties"]["evidence_ref_indices"]
    assert indices["items"]["maximum"] == len(context["allowed_finding_refs"])-1
    assert indices["maxItems"] == 6 and schema["properties"]["findings"]["maxItems"] == 12
    encoded = json.dumps(schema)
    assert '"evidence_refs"' not in encoded and "draft:/body/" not in encoded and len(encoded) < 6000


def test_native_compact_and_legacy_reviews_normalize_identically_without_candidate_mutation():
    candidate = output()
    saved = deepcopy(candidate)
    receipts = review.observations(candidate)
    value, _, expected = compact(candidate, receipts, "revise")
    actual = review.critic(value, output=candidate, round_number=1, receipts=receipts)
    assert actual == expected and actual["schema_version"] == "creation.critic.v1"
    assert candidate == saved
    assert CriticReview.model_validate(actual).verdict == "revise"
    decision = __import__("test_content_work_review").coordinator(candidate, actual)
    assert review.coordinator(decision, output=candidate, critic_value=actual,
        round_number=1, receipts=receipts)["remaining_checks"] == decision["remaining_checks"]


def test_compact_native_keeps_twelve_findings_six_exact_refs_and_every_receipt_status():
    candidate = output()
    candidate["body"] *= 5
    receipts = review.observations(candidate)
    value, context, _ = compact(candidate, receipts, "revise")
    indices = [index for index, ref in enumerate(context["allowed_finding_refs"]) if ref.startswith("draft:/")][:6]
    template = value["findings"][0]
    value["findings"] = [{**template, "id": f"f_{number}", "evidence_ref_indices": indices} for number in range(1, 13)]
    actual = review.critic(value, output=candidate, round_number=1, receipts=receipts)
    assert len(actual["findings"]) == 12 and len(actual["checks"]) == 9
    expected = [context["allowed_finding_refs"][index] for index in indices]
    assert all(finding["evidence_refs"] == expected for finding in actual["findings"])
    assert [check["status"] for check in actual["checks"]] == [receipt["status"] for receipt in receipts]


def test_multiple_same_kind_receipts_restore_all_ids_and_do_not_invent_pass():
    candidate = output()
    receipts = review.observations(candidate)
    value, _, _ = compact(candidate, receipts, "revise")
    receipts.append({**receipts[1], "id": "r_source_additional", "status": "PASS", "observed": True})
    actual = review.critic(value, output=candidate, round_number=1, receipts=receipts)
    source = next(check for check in actual["checks"] if check["kind"] == "source")
    assert source["status"] == "UNVERIFIED" and source["evidence_refs"] == ["r_source", "r_source_additional"]


@pytest.mark.parametrize("change", ["hash", "stage", "round", "negative", "overflow", "boolean", "duplicate",
    "missing_summary", "extra_status", "wrong_version", "extra_pointer", "receipt_hash", "receipt_unobserved", "accept_fail"])
def test_compact_native_review_cannot_change_binding_or_forge_mechanics(change):
    candidate = output()
    receipts = review.observations(candidate)
    value, _, _ = compact(candidate, receipts, "revise")
    if change == "hash":
        value["draft_sha256"] = "0"*64
    elif change == "stage":
        value["stage"] = "private_draft"
    elif change == "round":
        value["round_number"] = 2
    elif change in {"negative", "overflow", "boolean", "duplicate"}:
        value["findings"][0]["evidence_ref_indices"] = {"negative": [-1], "overflow": [99999],
            "boolean": [True], "duplicate": [0, 0]}[change]
    elif change == "missing_summary":
        value["check_summaries"].pop("source")
    elif change == "extra_status":
        value["checks"] = [{"kind": "source", "status": "PASS"}]
    elif change == "wrong_version":
        value["schema_version"] = "content-work.critic-output.v999"
    elif change == "extra_pointer":
        value["findings"][0]["evidence_refs"] = ["draft:/body/0/content/0/text"]
    elif change == "receipt_hash":
        receipts[0]["draft_sha256"] = "0"*64
    elif change == "receipt_unobserved":
        receipts[0]["observed"] = False
    else:
        value["findings"] = []
        value["verdict"] = "accept_draft"
        receipts[0]["status"] = "FAIL"
    with pytest.raises(RunnerError, match="review_invalid"):
        review.critic(value, output=candidate, round_number=1, receipts=receipts)


def test_native_provider_prompt_has_one_exact_catalog_and_preserves_rich_content():
    candidate = output()
    receipts = review.observations(candidate)
    _, context, _ = compact(candidate, receipts)
    saved = deepcopy(context)
    prompt = review.critic_prompt(context)
    data = json.loads(prompt.split("NEPATIKIMI_DUOMENYS_JSON\n", 1)[1])
    assert "allowed_finding_refs" not in data
    assert data["finding_reference_table"] == [{"index": index, "reference": ref}
        for index, ref in enumerate(context["allowed_finding_refs"])]
    assert data["draft"]["body"][0]["type"] == "richParagraph" and context == saved
    assert "check_summaries" in prompt and "evidence_ref_indices" in prompt
    assert "Kiekvienai iš devynių schemos patikrų grąžink vieną būseną" not in prompt


def test_native_coordinator_already_reuses_s34_private_prose_and_restores_exact_sets():
    candidate = output()
    receipts = review.observations(candidate)
    value, _, _ = compact(candidate, receipts, "revise")
    report = review.critic(value, output=candidate, round_number=1, receipts=receipts)
    prepared = {"pageData": {"planningBrief": {}}, "siteData": {}}
    context = review.context(candidate, 1, receipts, prepared, report)
    schema = review.output_schema("coordinator", context)
    assert schema["properties"]["schema_version"]["const"] == review.shared.COORDINATOR_PROSE_VERSION
    assert "correction_ids" not in schema["properties"] and "remaining_checks" not in schema["properties"]
    legacy = __import__("test_content_work_review").coordinator(candidate, report)
    legacy["next_actions"] = review.shared.coordinator_actions(report)[:5]
    prose = {key: val for key, val in legacy.items() if key not in {"correction_ids", "remaining_checks"}}
    prose["schema_version"] = review.shared.COORDINATOR_PROSE_VERSION
    assert review.coordinator(prose, output=candidate, critic_value=report, round_number=1, receipts=receipts) == legacy
    for changes in ({"correction_ids": []}, {"remaining_checks": []}, {"decision": "accept_draft"},
            {"critic_sha256": "0"*64}, {"next_actions": ["Išgalvota atlikta patikra."]}):
        with pytest.raises(RunnerError, match="review_invalid"):
            review.coordinator({**prose, **changes}, output=candidate, critic_value=report,
                round_number=1, receipts=receipts)


@pytest.mark.parametrize("valid", [True, False])
async def test_actual_adapter_requires_private_native_format_and_keeps_usage(tmp_path, monkeypatch, valid):
    import sys
    from pathlib import Path

    prepared = {"instructionHash": "a"*64, "instructions": "Sintetinės native gido instrukcijos."}
    candidate = output()
    receipts = review.observations(candidate)
    value, context, legacy = compact(candidate, receipts)
    monkeypatch.setattr(adapter, "available", lambda: (Path(sys.executable), tmp_path))
    calls = []
    async def execute(argv, **kwargs):
        calls.append(True)
        schema = json.loads((kwargs["cwd"]/"output.schema.json").read_text("utf-8"))
        assert schema["properties"]["schema_version"]["const"] == VERSION
        assert kwargs["output_limit"] == 200000 and kwargs["seconds"] == 20
        assert 'web_search="disabled"' in argv and "--strict-config" in argv
        return value if valid else legacy, {"usage": {"input_tokens": 7, "output_tokens": 9}}
    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    arguments = {"prepared": prepared, "review": context, "expected_model": adapter.role_model("critic"),
        "expected_instruction_hash": adapter.instruction_hash("critic", prepared)}
    if valid:
        result, receipt = await adapter.run_role(arguments, authorized, role="critic", seconds=20)
        assert result == value and receipt["usage"]["output_tokens"] == 9
    else:
        with pytest.raises(RunnerError) as error:
            await adapter.run_role(arguments, authorized, role="critic", seconds=20)
        assert error.value.code == "review_invalid" and error.value.receipt["usage"]["output_tokens"] == 9
    assert len(calls) == 1
