"""Pure diagnostic report bridge to the maintained protected comparison.

Input references/checks/usage are supplied evidence, never generated receipts.
Today's typed reports are seen-regression diagnostics. This bridge ALWAYS
rejects adoption; native verification and a protected trial binding are absent.
"""
import json
import re
from dataclasses import dataclass
from uuid import UUID

from .. import learning_controller as controller
from ..creation.service import digest
from . import protection, typed_checks
from .learning_target import (
    LearningInputError,
    LearningTarget,
    hash_value,
    json_value,
    native_binding,
    operation_key,
    parent_hash,
    require_same_parent,
    target_key,
)

CHECKS = frozenset(("no_core_tool_errors", "requested_contact_captured", "corrected_need_saved",
    "respect_contact_refusal", "contact_announcement_has_ack", "no_email_without_email_contact",
    "reviewed_customer_projection_used", "independent_review_helpful", "no_critical_issues",
    "competent_service_scores"))
PINS = ("corpus_sha256", "manifest_sha256", "expectations_sha256",
    "origin_manifest_sha256", "evaluation_plan_sha256")


@dataclass(frozen=True)
class ReportPlan:
    target: LearningTarget
    pins_json: str
    cases_json: str


@dataclass(frozen=True)
class CaseReport:
    plan: ReportPlan
    observed_target: LearningTarget
    material_json: str


@dataclass(frozen=True)
class ReplicaReport:
    plan: ReportPlan
    replicate: int
    instruction_hash: str
    cases: tuple[CaseReport, ...]


@dataclass(frozen=True)
class ReportSet:
    plan: ReportPlan
    replicas: tuple[ReplicaReport, ...]


def report_plan(target, cases, **pins):
    operation_key(target)
    if set(pins) != set(PINS):
        raise LearningInputError("exact_learning_report_pins_required")
    for value in pins.values():
        hash_value(value)
    expected = digest({"version": typed_checks.VERSION,
        "source_case_corpus_sha256": pins["corpus_sha256"], "expectations_sha256": pins["expectations_sha256"],
        "origin_manifest_sha256": pins["origin_manifest_sha256"]})
    if pins["evaluation_plan_sha256"] != expected:
        raise LearningInputError("typed_plan_fingerprint_conflict")
    if not isinstance(cases, (list, tuple)) or not 1 <= len(cases) <= 100:
        raise LearningInputError("bounded_learning_cases_required")
    identities, scripts, clean = set(), set(), []
    for case in cases:
        if (not isinstance(case, dict) or set(case) != {"case_id", "split", "script_sha256"}
                or not isinstance(case["case_id"], str) or re.fullmatch(r"[A-Za-z0-9_-]{1,100}", case["case_id"]) is None
                or case["split"] not in {"train", "holdout"}):
            raise LearningInputError("invalid_learning_case")
        hash_value(case["script_sha256"])
        if case["case_id"] in identities or case["script_sha256"] in scripts:
            raise LearningInputError("duplicate_learning_case_or_script")
        identities.add(case["case_id"])
        scripts.add(case["script_sha256"])
        clean.append(dict(case))
    return ReportPlan(target, json_value(pins), json_value(clean))


def _plan(plan):
    if not isinstance(plan, ReportPlan):
        raise LearningInputError("learning_report_plan_required")
    try:
        return report_plan(plan.target, json.loads(plan.cases_json), **json.loads(plan.pins_json))
    except (ValueError, TypeError):
        raise LearningInputError("invalid_learning_report_plan") from None


def _plan_key(plan):
    plan = _plan(plan)
    return digest([operation_key(plan.target), plan.pins_json, plan.cases_json])


def _uuid(value):
    if not isinstance(value, (str, UUID)):
        raise LearningInputError("native_reference_required")
    try:
        return str(UUID(str(value)))
    except ValueError:
        raise LearningInputError("native_reference_required") from None


def _usage(value):
    fields = {"attempts", "settled", "known_receipts", "complete", "input_tokens", "output_tokens", "cost_status"}
    if not isinstance(value, dict) or set(value) != fields:
        raise LearningInputError("native_usage_required")
    for key in ("attempts", "settled", "known_receipts"):
        if type(value[key]) is not int or not 0 <= value[key] <= 10:
            raise LearningInputError("invalid_native_usage")
    if (not value["known_receipts"] <= value["settled"] <= value["attempts"]
            or type(value["complete"]) is not bool or value["cost_status"] != "UNVERIFIED"
            or value["complete"] and not (value["attempts"] > 0
                and value["attempts"] == value["settled"] == value["known_receipts"])):
        raise LearningInputError("invalid_native_usage")
    for key in ("input_tokens", "output_tokens"):
        if value[key] is not None and (type(value[key]) is not int or not 0 <= value[key] <= 1_000_000_000):
            raise LearningInputError("invalid_native_usage")
    return dict(value)


def _execution(value):
    fields = {"assistant_engine", "synthetic_core_scope", "assistant_sees_test_flag", "smtp_sent", "supplier_contacted"}
    if (not isinstance(value, dict) or set(value) != fields or not isinstance(value["assistant_engine"], str)
            or not 1 <= len(value["assistant_engine"]) <= 100
            or any(value[key] is not None and type(value[key]) is not bool for key in fields-{"assistant_engine"})):
        raise LearningInputError("explicit_execution_observations_required")
    return dict(value)


def _any_flag(values):
    return True if any(v is True for v in values) else None if any(v is None for v in values) else False


def _all_flag(values):
    return False if any(v is False for v in values) else None if any(v is None for v in values) else True


def case_report(plan, observed_target, proof, typed_report, *, replicate, conversation_id,
        quality_job_id, instruction_hash, usage, execution):
    plan = _plan(plan)
    require_same_parent(plan.target, observed_target)
    if type(replicate) is not int or not 1 <= replicate <= controller.REPLICATES:
        raise LearningInputError("fixed_replicate_required")
    hash_value(instruction_hash)  # Declared comparison label; NOT an observed behavior release.
    try:
        proof = protection.Proof.model_validate_json(proof.model_dump_json()
            if isinstance(proof, protection.Proof) else json_value(proof))
        protection.check_binding(proof, native_binding(observed_target))
    except (ValueError, TypeError):
        raise LearningInputError("protected_case_binding_conflict") from None
    pins = json.loads(plan.pins_json)
    expected = next((c for c in json.loads(plan.cases_json) if c["case_id"] == proof.case_id), None)
    if (expected != {"case_id": proof.case_id, "split": proof.split, "script_sha256": proof.script_sha256}
            or proof.manifest_sha256 != pins["manifest_sha256"] or proof.corpus_sha256 != pins["corpus_sha256"]
            or proof.evaluator_sha256 != observed_target.evaluator_sha256):
        raise LearningInputError("learning_case_plan_conflict")
    fields = {"version", "source_case_corpus_sha256", "expectations_sha256", "origin_manifest_sha256",
        "evaluation_plan_sha256", "manifest_sha256", "case_id", "purpose", "state", "checks", "checkpoints",
        "observed_receipts_sha256", "language_quality", "protected_comparison", "module_admission", "activation"}
    if not isinstance(typed_report, dict) or set(typed_report) != fields:
        raise LearningInputError("exact_native_typed_report_required")
    if (typed_report["version"] != typed_checks.REPORT or typed_report["case_id"] != proof.case_id
            or typed_report["purpose"] != "diagnostic_seen_regression"
            or typed_report["source_case_corpus_sha256"] != pins["corpus_sha256"]
            or any(typed_report[key] != pins[key] for key in PINS if key != "corpus_sha256")
            or typed_report["language_quality"] != "UNVERIFIED"
            or typed_report["protected_comparison"] != "not_performed"
            or typed_report["module_admission"] != "not_admitted" or typed_report["activation"] != "not_performed"):
        raise LearningInputError("learning_typed_report_conflict")
    checks = typed_report["checks"]
    if (not isinstance(checks, dict) or set(checks) != CHECKS or any(type(v) is not bool for v in checks.values())
            or typed_report["state"] != ("PASS" if all(checks.values()) else "FAIL")):
        raise LearningInputError("native_boolean_checks_required")
    checkpoints, ids = typed_report["checkpoints"], []
    if not isinstance(checkpoints, list) or len(checkpoints) != len(proof.message_sha256):
        raise LearningInputError("complete_native_checkpoints_required")
    for number, checkpoint in enumerate(checkpoints, 1):
        if (not isinstance(checkpoint, dict) or set(checkpoint) !=
                {"after_step", "passed", "client_event_id", "reply_event_id"}
                or type(checkpoint["after_step"]) is not int or checkpoint["after_step"] != number
                or type(checkpoint["passed"]) is not bool
                or not checkpoint["passed"] and checks["corrected_need_saved"]):
            raise LearningInputError("invalid_native_checkpoint")
        ids.extend((_uuid(checkpoint["client_event_id"]), _uuid(checkpoint["reply_event_id"])))
    if len(set(ids)) != len(ids):
        raise LearningInputError("duplicate_native_checkpoint")
    hash_value(typed_report["observed_receipts_sha256"])
    material = {"proof": proof.model_dump(mode="json"), "typed_report": typed_report,
        "replicate": replicate, "conversation_id": _uuid(conversation_id), "quality_job_id": _uuid(quality_job_id),
        "instruction_hash": instruction_hash, "usage": _usage(usage), "execution": _execution(execution)}
    return CaseReport(plan, observed_target, json_value(material))


def _case(case):
    if not isinstance(case, CaseReport):
        raise LearningInputError("native_learning_case_required")
    try:
        value = json.loads(case.material_json)
        return case_report(case.plan, case.observed_target, value.pop("proof"), value.pop("typed_report"), **value)
    except (ValueError, TypeError):
        raise LearningInputError("invalid_native_learning_case") from None


def replica_report(plan, cases, *, replicate, instruction_hash):
    if not isinstance(cases, (list, tuple)) or not 1 <= len(cases) <= 100:
        raise LearningInputError("bounded_learning_cases_required")
    value = ReplicaReport(_plan(plan), replicate, hash_value(instruction_hash), tuple(cases))
    _replica_data(value)
    return value


def _replica_data(report):
    if (not isinstance(report, ReplicaReport) or type(report.replicate) is not int
            or not 1 <= report.replicate <= controller.REPLICATES):
        raise LearningInputError("fixed_replicate_required")
    plan = _plan(report.plan)
    hash_value(report.instruction_hash)
    if not isinstance(report.cases, tuple) or not 1 <= len(report.cases) <= 100:
        raise LearningInputError("bounded_learning_cases_required")
    rows, seen, references, calls, usage, execution = [], set(), set(), 0, [], []
    for case in report.cases:
        case = _case(case)
        value = json.loads(case.material_json)
        if (_plan_key(plan) != _plan_key(case.plan) or value["replicate"] != report.replicate
                or value["instruction_hash"] != report.instruction_hash):
            raise LearningInputError("learning_replica_contract_conflict")
        proof, typed = value["proof"], value["typed_report"]
        refs = [value["conversation_id"], value["quality_job_id"],
            native_binding(case.observed_target)["task_calibration"]["episode_id"]]
        if proof["case_id"] in seen or any((kind, ref) in references for kind, ref in enumerate(refs)):
            raise LearningInputError("duplicate_learning_observation")
        seen.add(proof["case_id"])
        references.update(enumerate(refs))
        calls += value["usage"]["attempts"]
        usage.append(dict(value["usage"]))
        execution.append(value["execution"])
        rows.append({"id": proof["case_id"], "source_case_id": proof["case_id"], "split": proof["split"],
            "checks": dict(typed["checks"]), "replicate": report.replicate,
            "conversation_id": value["conversation_id"], "quality_job_id": value["quality_job_id"],
            "episode_id": refs[2], "protected_case_sha256": digest(proof),
            "typed_report_sha256": digest(typed), "observed_receipts_sha256": typed["observed_receipts_sha256"]})
    binding = native_binding(plan.target)
    engines = {e["assistant_engine"] for e in execution}
    if len(engines) != 1:
        raise LearningInputError("learning_execution_contract_changed")
    complete = seen == {c["case_id"] for c in json.loads(plan.cases_json)} and all(u["complete"] for u in usage)
    return {"site_id": binding["profile"]["site_id"], "corpus_hash": json.loads(plan.pins_json)["corpus_sha256"],
        "instruction_hash": report.instruction_hash, "evaluation_contract_hash": plan.target.evaluator_sha256,
        "assistant_engine": next(iter(engines)), "knowledge_hash": binding["profile"]["knowledge_ref"]["knowledge_hash"],
        "synthetic_core_scope": _all_flag([e["synthetic_core_scope"] for e in execution]),
        "assistant_sees_test_flag": _any_flag([e["assistant_sees_test_flag"] for e in execution]), "complete": complete,
        "all_checks_pass": complete and all(all(row["checks"].values()) for row in rows),
        "smtp_sent": _any_flag([e["smtp_sent"] for e in execution]),
        "supplier_contacted": _any_flag([e["supplier_contacted"] for e in execution]), "cli_calls": calls, "cli_usage": usage,
        "clients": rows, "expected_clients": len(json.loads(plan.cases_json)),
        "target_key": target_key(plan.target), "operation_key": operation_key(plan.target),
        "native_parent_hash": parent_hash(plan.target), "report_plan_sha256": _plan_key(plan),
        "purpose": "diagnostic_seen_regression", "native_receipts_verified": False,
        "behavior_release_observed": False}


def merge_reports(plan, replicas):
    if not isinstance(replicas, (list, tuple)):
        raise LearningInputError("fixed_replicate_count_required")
    value = ReportSet(_plan(plan), tuple(replicas))
    _merged_data(value)
    return value


def _merged_data(value):
    if (not isinstance(value, ReportSet) or not isinstance(value.replicas, tuple)
            or len(value.replicas) != controller.REPLICATES
            or any(not isinstance(r, ReplicaReport) for r in value.replicas)):
        raise LearningInputError("fixed_replicate_count_required")
    if {r.replicate for r in value.replicas} != set(range(1, controller.REPLICATES+1)):
        raise LearningInputError("distinct_replicates_required")
    docs, references = [], set()
    for report in sorted(value.replicas, key=lambda r: r.replicate):
        if _plan_key(report.plan) != _plan_key(value.plan):
            raise LearningInputError("learning_replica_contract_conflict")
        doc = _replica_data(report)
        for row in doc["clients"]:
            refs = [(kind, row[key]) for kind, key in enumerate(("conversation_id", "quality_job_id", "episode_id"))]
            if any(ref in references for ref in refs):
                raise LearningInputError("replayed_learning_observation")
            references.update(refs)
        docs.append(doc)
    merged = controller.merge_replicates(docs)
    # Preserve explicit unknowns. The maintained merge treats any non-false
    # external action as unsafe; it must not become a claim that mail was sent.
    for key in ("smtp_sent", "supplier_contacted", "assistant_sees_test_flag"):
        merged[key] = _any_flag([doc[key] for doc in docs])
    merged["synthetic_core_scope"] = _all_flag([doc["synthetic_core_scope"] for doc in docs])
    merged["all_checks_pass"] = merged["complete"] and merged["all_checks_pass"]
    return merged


def report_data(value):
    """Fresh detached conventional report; no source data is backfilled."""
    return _merged_data(value) if isinstance(value, ReportSet) else _replica_data(value)


def compare_reports(incumbent, candidate, instruction, scope):
    if not isinstance(incumbent, ReportSet) or not isinstance(candidate, ReportSet):
        raise LearningInputError("replicated_learning_reports_required")
    require_same_parent(incumbent.plan.target, candidate.plan.target)
    if _plan_key(incumbent.plan) != _plan_key(candidate.plan):
        raise LearningInputError("learning_comparison_plan_changed")
    before, after = report_data(incumbent), report_data(candidate)
    references = [{(key, row[key]) for row in doc["clients"]
        for key in ("conversation_id", "quality_job_id", "episode_id")} for doc in (before, after)]
    if references[0] & references[1]:
        raise LearningInputError("replayed_learning_observation")
    expected_parent = parent_hash(incumbent.plan.target)
    if before["instruction_hash"] != expected_parent:
        raise LearningInputError("learning_incumbent_parent_changed")
    result = controller.protected_compare(before, after, instruction, scope, before["site_id"],
        before["corpus_hash"], expected_parent, after["instruction_hash"])
    reasons = {"diagnostic_evidence_only", "native_receipts_not_verified", "behavior_trial_not_bound"}
    if before["assistant_sees_test_flag"] is not False or after["assistant_sees_test_flag"] is not False:
        reasons.add("test_metadata_not_private")
    # The existing gate is reused, but these diagnostic metadata adapters cannot
    # attest real native execution or a behavior trial that is not implemented.
    return {**result, "state": "rejected", "reasons": sorted(set(result["reasons"]) | reasons),
        "calibration_status": "UNVERIFIED", "module_admission": "not_admitted",
        "activation": "not_performed", "activated": False, "production_eligible": False}
