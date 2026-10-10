import hashlib
import json
import sys
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace

import pytest
from test_creation_review import draft as draft
from test_creation_review import receipt, report

from pinet_core.creation import adapter, review
from pinet_core.tasks.codex_transport import RunnerError


def context(candidate, receipts=()):
    return {"draft": candidate, "stage": "private_draft", "round_number": 1, "receipts": list(receipts)}


def compact(candidate, verdict="revise"):
    value = report(candidate, verdict)
    value["schema_version"] = "creation.business-critic-output.v2"
    value["check_summaries"] = {item["kind"]: item["summary"] for item in value.pop("checks")}
    references = review._prompt_context(**context(candidate))["allowed_finding_refs"]
    for finding in value["findings"]:
        finding["evidence_ref_indices"] = [references.index(ref) for ref in finding.pop("evidence_refs")]
    return value


def selected_findings(candidate, value, receipts=()):
    findings = deepcopy(value["findings"])
    references = review._prompt_context(**context(candidate, receipts))["allowed_finding_refs"]
    for finding in findings:
        finding["evidence_refs"] = [references[index] for index in finding.pop("evidence_ref_indices")]
    return findings


@pytest.mark.parametrize("statuses,expected", [
    ([], "UNVERIFIED"), (["PASS"], "PASS"), (["NA"], "NA"),
    (["PASS", "NA"], "UNVERIFIED"), (["PASS", "UNVERIFIED"], "UNVERIFIED"),
    (["PASS", "FAIL"], "FAIL"), (["UNVERIFIED", "FAIL", "NA"], "FAIL"),
])
def test_complete_hydration_retains_every_observation_and_exact_model_findings(draft, statuses, expected):
    evidence = [receipt(draft, kind="source", status=status, identifier=f"r_source_{i}")
                for i, status in enumerate(statuses)]
    value = compact(draft)
    full = review.hydrate_business_critic(value, context(draft, evidence))
    assert full["findings"] == report(draft)["findings"] and full["verdict"] == value["verdict"]
    assert full["draft_sha256"] == value["draft_sha256"]
    assert [item["kind"] for item in full["checks"]] == list(review.CHECK_KINDS)
    check = next(item for item in full["checks"] if item["kind"] == "source")
    assert check["status"] == expected
    assert check["evidence_refs"] == [item["id"] for item in evidence]
    assert check["summary"] == value["check_summaries"]["source"]
    assert "check_summaries" not in full and full["schema_version"] == "creation.critic.v1"


@pytest.mark.parametrize("defect", ["missing_kind", "extra_kind", "extra_status", "hash", "stage", "round",
                                    "unknown_ref", "duplicate_finding", "foreign_receipt", "unobserved_pass"])
def test_compact_output_cannot_hide_checks_or_change_candidate_authority(draft, defect):
    value, bound = compact(draft), context(draft)
    if defect == "missing_kind":
        del value["check_summaries"]["media"]
    elif defect == "extra_kind":
        value["check_summaries"]["invented"] = "Patikra dar neatlikta."
    elif defect == "extra_status":
        value["checks"] = [{"kind": "source", "status": "PASS"}]
    elif defect == "hash":
        value["draft_sha256"] = "0" * 64
    elif defect == "stage":
        value["stage"] = "research"
    elif defect == "round":
        value["round_number"] = 2
    elif defect == "unknown_ref":
        value["findings"][0]["evidence_ref_indices"] = [1000000]
    elif defect == "duplicate_finding":
        value["findings"].append(deepcopy(value["findings"][0]))
    elif defect == "foreign_receipt":
        bound["receipts"] = [{**receipt(draft), "draft_sha256": "0" * 64}]
    else:
        bound["receipts"] = [{**receipt(draft), "observed": False}]
    with pytest.raises(RunnerError, match="review_invalid"):
        review.hydrate_business_critic(value, bound)


@pytest.mark.parametrize("kind", review.CHECK_KINDS)
def test_known_fail_is_never_overruled_by_generated_acceptance(draft, kind):
    value = compact(draft, "accept_draft")
    evidence = receipt(draft, kind=kind, status="FAIL")
    with pytest.raises(RunnerError, match="review_invalid"):
        review.hydrate_business_critic(value, context(draft, [evidence]))


def test_compact_hydration_still_screens_all_generated_prose(draft):
    value = compact(draft)
    value["check_summaries"]["media"] = "Ennen julkaisua tarvitaan tarkistettu kuva."
    with pytest.raises(RunnerError, match="language_quality_failed"):
        review.hydrate_business_critic(value, context(draft))


def test_twelve_distinct_model_findings_are_retained_without_a_new_ceiling(draft):
    value = compact(draft)
    value["findings"] = [{**deepcopy(value["findings"][0]), "id": f"f_{i}"} for i in range(1, 13)]
    full = review.hydrate_business_critic(value, context(draft))
    assert full["findings"] == selected_findings(draft, value) and len(full["checks"]) == 9


@pytest.mark.parametrize("field", ["explanation", "correction"])
@pytest.mark.parametrize("length", [240, 241])
def test_business_provider_prose_bounds_are_also_authoritative_on_hydration(draft, field, length):
    value = compact(draft)
    value["findings"][0][field] = ("Palyginti mokymo būdus pagal konkretų komandos poreikį. " * 6)[:length]
    assert len(value["findings"][0][field]) == length
    if length == 240:
        assert review.hydrate_business_critic(value, context(draft))["findings"] == selected_findings(draft, value)
    else:
        with pytest.raises(RunnerError, match="review_invalid"):
            review.hydrate_business_critic(value, context(draft))


def test_business_wire_is_complete_and_native_guide_profiles_remain_exact(draft):
    schema = review.output_schema("critic", context(draft))
    summaries = schema["$defs"]["CheckSummaries"]
    assert set(summaries["required"]) == set(review.CHECK_KINDS)
    assert summaries["additionalProperties"] is False and schema["additionalProperties"] is False
    assert schema["properties"]["findings"]["maxItems"] == 12
    assert schema["properties"]["draft_sha256"]["const"] == review.draft_sha256(draft)
    assert schema["properties"]["stage"]["const"] == "private_draft"
    assert schema["properties"]["round_number"]["const"] == 1
    assert adapter.role_instruction_hash("critic") == review.business_role_instruction_hash("critic")
    assert adapter.role_instruction_hash("critic") != review.role_instruction_hash("critic")
    originals = {
        "critic": ("a0c8e55448d8e498f72bca50d835f7b8af46155ab45696b1970b6fdd48efee74",
                   "01c2b28da79a73b3b4054d918c71339647abf0db80421557a746456b06f329b0"),
        "coordinator": ("26c108ed4e031854a97e1f69bfa76bbd42981b2e64d4cc16c8e0b8d7e5a5c3a8",
                        "36d61ad8bc3b4f23a62ce25edd80d8f8b186652dc352530e55184f26dd0f962c"),
    }
    for role, (policy_hash, schema_hash) in originals.items():
        assert review.role_instruction_hash(role) == policy_hash
        assert hashlib.sha256(json.dumps(review.model_output_schema(role), sort_keys=True).encode()).hexdigest() == schema_hash


@pytest.mark.parametrize("mode", ["valid", "missing_summary", "invalid_index"])
async def test_actual_adapter_hydrates_provider_output_and_retains_paid_failure_usage(draft, tmp_path, monkeypatch, mode):
    monkeypatch.setattr(adapter, "available", lambda: (Path(sys.executable), tmp_path))
    monkeypatch.setattr(adapter, "settings", lambda: SimpleNamespace(
        creation_runner_seconds=30, creation_web_search_enabled=False))
    value = compact(draft)
    if mode == "missing_summary":
        del value["check_summaries"]["launch"]
    elif mode == "invalid_index":
        value["findings"][0]["evidence_ref_indices"] = [
            len(review._prompt_context(**context(draft))["allowed_finding_refs"])]
    usage = {"input_tokens": 42, "output_tokens": 19}

    async def execute(args, **kwargs):
        wire = json.loads((kwargs["output"].parent / "output.schema.json").read_bytes())
        assert "check_summaries" in wire["required"] and "checks" not in wire["properties"]
        assert "vienos eilutės JSON" in kwargs["prompt"]
        return value, {"usage": usage}

    async def authorized():
        return True

    monkeypatch.setattr(adapter, "execute", execute)
    if mode == "valid":
        full, evidence = await adapter.run_role(context(draft), authorized, role="critic", seconds=30)
        assert len(full["checks"]) == 9 and full["findings"] == report(draft)["findings"]
        assert evidence["usage"] == usage and evidence["model"] == "gpt-6-luna"
    else:
        with pytest.raises(RunnerError, match="review_invalid") as error:
            await adapter.run_role(context(draft), authorized, role="critic", seconds=30)
        assert error.value.receipt["usage"] == usage
        failures = list(tmp_path.glob("**/failure.private.json"))
        assert len(failures) == 1
        assert json.loads(failures[0].read_bytes())["receipt"]["usage"] == usage


@pytest.mark.parametrize("index", [True, False, 1.5, "0", -1, 1000000, None])
def test_reference_indices_require_strict_current_bounded_integers(draft, index):
    value = compact(draft)
    value["findings"][0]["evidence_ref_indices"] = [index]
    with pytest.raises(RunnerError, match="review_invalid"):
        review.hydrate_business_critic(value, context(draft))


def test_duplicate_indices_and_legacy_string_transport_are_rejected(draft):
    value = compact(draft)
    index = value["findings"][0]["evidence_ref_indices"][0]
    value["findings"][0]["evidence_ref_indices"] = [index, index]
    with pytest.raises(RunnerError, match="review_invalid"):
        review.hydrate_business_critic(value, context(draft))
    legacy = report(draft)
    legacy["schema_version"] = "creation.business-critic-output.v1"
    legacy["check_summaries"] = {item["kind"]: item["summary"] for item in legacy.pop("checks")}
    with pytest.raises(RunnerError, match="review_invalid"):
        review.hydrate_business_critic(legacy, context(draft))
    # Historical full reviews remain valid and readable.
    assert review.normalize_critic(report(draft), draft=draft, expected_stage="private_draft",
                                  expected_round=1)["findings"] == report(draft)["findings"]


def test_selected_indices_restore_all_exact_draft_and_receipt_references(draft):
    evidence = [receipt(draft, status="FAIL")]
    value = compact(draft)
    selected = ["draft:/pages/1/sections/0/body", "draft:/business/alternatives/0",
                "draft:/pages/0/sections", "receipt:r_language"]
    prompt = review.critic_prompt(**context(draft, evidence))
    payload = json.loads(prompt.split("NEPATIKIMI_DUOMENYS_JSON\n", 1)[1])
    table = payload["finding_reference_table"]
    assert "allowed_finding_refs" not in payload
    assert [entry["index"] for entry in table] == list(range(len(table)))
    assert len({entry["reference"] for entry in table}) == len(table)
    value["findings"][0]["evidence_ref_indices"] = [
        next(entry["index"] for entry in table if entry["reference"] == ref) for ref in selected]
    full = review.hydrate_business_critic(value, context(draft, evidence))
    assert full["findings"][0]["evidence_refs"] == selected
    assert "evidence_ref_indices" not in full["findings"][0]
    assert full["verdict"] == "revise" and full["checks"][0]["status"] == "FAIL"
    schema = review.output_schema("critic", context(draft, evidence))
    fields = schema["$defs"]["BusinessFinding"]["properties"]
    assert "evidence_refs" not in fields
    assert fields["evidence_ref_indices"]["items"] == {
        "type": "integer", "minimum": 0, "maximum": len(table) - 1}
    assert schema["properties"]["schema_version"]["const"] == "creation.business-critic-output.v2"


@pytest.mark.parametrize("defect", ["missing_required", "accept_with_required", "blocked_without_blocker"])
def test_index_transport_retains_every_mandatory_correction_gate(draft, defect):
    value = compact(draft)
    if defect == "missing_required":
        value["findings"] = []
    elif defect == "accept_with_required":
        value["verdict"] = "accept_draft"
    else:
        value["verdict"] = "blocked"
    with pytest.raises(RunnerError, match="review_invalid"):
        review.hydrate_business_critic(value, context(draft))


def test_large_reference_table_restores_first_middle_and_last_selected_paths(draft):
    for page in draft["pages"]:
        section = deepcopy(page["sections"][0])
        section["items"] = ["Palyginti konkrečios darbo užduoties atlikimo būdus." for _ in range(8)]
        page["sections"] = [deepcopy(section) for _ in range(7)]
    value = compact(draft)
    payload = json.loads(review.critic_prompt(**context(draft)).split("NEPATIKIMI_DUOMENYS_JSON\n", 1)[1])
    table = payload["finding_reference_table"]
    assert len(table) >= 337
    indices = [0, len(table) // 2, len(table) - 1]
    value["findings"][0]["evidence_ref_indices"] = indices
    full = review.hydrate_business_critic(value, context(draft))
    assert full["findings"][0]["evidence_refs"] == [table[index]["reference"] for index in indices]
    schema = review.output_schema("critic", context(draft))
    assert schema["$defs"]["BusinessFinding"]["properties"]["evidence_ref_indices"]["items"]["maximum"] == len(table) - 1
    assert len(json.dumps(schema, separators=(",", ":")).encode()) < 4000
