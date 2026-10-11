"""Stored scores must join paid-output receipts; no transcript rejudging or providers."""

from copy import deepcopy
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from test_customer_agent_evidence import quality_case  # noqa: F401 - canonical fixture

from pinet_core import competence
from pinet_core.contracts import Quality
from pinet_core.creation.service import digest
from pinet_core.customer_agents import contract, evidence, score_evidence, wire

VALUES = dict(
    relevance=4,
    factual_accuracy=5,
    listening=4,
    useful_next_step=4,
    email_quality=5,
    critical_issues=[],
    explanation="Private synthetic explanation",
)


@pytest.fixture
def scored(quality_case):  # noqa: F811
    frozen, job, events, artifact = quality_case
    job.payload["competence_contract"] = competence.VERSION
    events[1].payload["competence_contract"] = competence.VERSION
    events[0].id = "client"
    artifact.payload["evidence_event_ids"] = ["client"]
    artifact.payload["competence"] = competence.report(VALUES)
    events[-1].payload["output_sha256"] = digest(
        {
            "quality": Quality.model_validate(
                {k: artifact.payload[k] for k in Quality.model_fields}
            ).model_dump(),
            "scores": VALUES,
        }
    )
    return frozen, job, events, artifact


def project(case, truncated=False):
    frozen, job, events, artifact = case
    judged = evidence.judgment(None, frozen, events, [job], [artifact], truncated)
    return score_evidence.projection(events, [job], [artifact], judged, truncated)


def test_exact_combined_output_exposes_only_numbers_and_counts(scored):
    result = project(scored)
    assert result["state"] == "competent" and result["critical_issues_count"] == 0
    assert result["scores"] == {k: VALUES[k] for k in score_evidence.DIMENSIONS}
    assert "explanation" not in str(result) and "Private synthetic" not in str(result)
    assert result["typed_checks"] == result["language_quality"] == "UNVERIFIED"
    assert result["activation"] == "not_performed" and result["module_admission"] == "not_admitted"
    wire.CompetenceEvidence.model_validate(result)


@pytest.mark.parametrize("payload", [[], None, "Synthetic scalar"])
def test_malformed_artifact_root_is_unverified_without_exception(scored, payload):
    assert project(scored)["state"] == "competent"
    scored[-1].payload = payload
    result = project(scored)
    assert result["state"] == "UNVERIFIED" and "scores" not in result


def test_guard_without_attribution_uses_original_paid_output(scored):
    artifact = scored[-1]
    original = deepcopy(artifact.payload)
    artifact.payload.update(
        outcome="needs_review",
        issues=["Private observable issue"],
        observable_guards=[{"code": "saved_contact_reinvited"}],
        model_assessment=original,
    )
    assert project(scored)["state"] == "competent"


def test_original_paid_output_cannot_cite_later_client_evidence(scored):
    assert project(scored)["state"] == "competent"
    scored[2][0].sequence = 7
    result = project(scored)
    assert result["state"] == "UNVERIFIED" and "scores" not in result


@pytest.mark.parametrize(
    "change",
    [
        "optin",
        "request_optin",
        "missing_report",
        "forged_state",
        "criterion",
        "bool",
        "float",
        "range",
        "foreign_evidence",
        "wrong_output",
        "failed_job",
        "truncated",
        "request_order",
        "extra_wrapper",
        "bad_attribution",
        "missing_origin",
        "second_before_first_settled",
    ],
)
def test_unproven_numeric_results_are_unverified(scored, change):
    assert project(scored)["state"] == "competent"
    _, job, events, artifact = scored
    if change == "optin":
        job.payload.pop("competence_contract")
    elif change == "request_optin":
        events[1].payload.pop("competence_contract")
    elif change == "missing_report":
        artifact.payload.pop("competence")
    elif change == "forged_state":
        artifact.payload["competence"]["state"] = "needs_review"
    elif change == "criterion":
        artifact.payload["competence"]["criterion_sha256"] = "0" * 64
    elif change in {"bool", "float", "range"}:
        artifact.payload["competence"]["scores"]["listening"] = {"bool": True, "float": 4.0, "range": 6}[
            change
        ]
    elif change == "foreign_evidence":
        artifact.payload["evidence_event_ids"] = ["foreign"]
    elif change == "wrong_output":
        events[-1].payload["output_sha256"] = "0" * 64
    elif change == "failed_job":
        job.state = "failed"
    elif change == "truncated":
        pass
    elif change == "request_order":
        events[1].sequence = 5
    elif change == "extra_wrapper":
        artifact.payload["model_assessment"] = deepcopy(artifact.payload)
    elif change == "bad_attribution":
        artifact.payload["root_cause_attribution"] = {"unexpected": "shape"}
        artifact.payload["model_assessment"] = deepcopy(artifact.payload)
    elif change == "missing_origin":
        artifact.payload["observable_guards"] = [{"code": "synthetic"}]
    else:
        second = deepcopy(events[2])
        second.sequence = 4
        second.payload["number"] = 2
        second.event_key = "quality-attempt:job:2"
        usage = deepcopy(events[-1])
        usage.sequence = 6
        usage.payload["number"] = 2
        usage.event_key = "quality-usage:job:2"
        events.extend([second, usage])
    result = project(scored, truncated=change == "truncated")
    assert result["state"] == "UNVERIFIED" and "scores" not in result


@pytest.mark.parametrize("guarded", [False, True])
def test_known_attribution_and_guard_chain_uses_original_not_final_quality(scored, guarded):
    original = deepcopy(scored[-1].payload)
    scored[-1].payload.update(
        root_cause="communication",
        suggested_scope="clarification",
        model_assessment=original,
        root_cause_attribution={
            "root_cause": "communication",
            "suggested_scope": "clarification",
            "evidence_event_ids": ["client"],
            "explanation": "Synthetic reason",
        },
    )
    if guarded:
        attributed = deepcopy(scored[-1].payload)
        scored[-1].payload.update(
            outcome="needs_review",
            issues=["Private observable issue"],
            observable_guards=[{"code": "saved_contact_reinvited"}],
            model_assessment=attributed,
        )
    result = project(scored)
    assert result["state"] == "competent" and "Private observable" not in str(result)


def test_later_client_preserves_historical_scores_but_latest_flag_is_false(scored):
    frozen, job, events, artifact = scored
    events.append(SimpleNamespace(id="later", kind="client_transcript", sequence=7, payload={}))
    judged = evidence.judgment(None, frozen, events, [job], [artifact], False)
    assert not judged["applies_to_latest_transcript"]
    assert project(scored)["state"] == "competent"


def test_legacy_unscored_artifact_is_not_requested(scored):
    _, job, events, artifact = scored
    job.payload.pop("competence_contract")
    events[1].payload.pop("competence_contract")
    artifact.payload.pop("competence")
    assert project(scored)["state"] == "not_requested"


@pytest.mark.parametrize("defect", ["low", "critical"])
def test_low_or_critical_actual_scores_are_displayed_without_admission(scored, defect):
    values = (
        {**VALUES, "listening": 3}
        if defect == "low"
        else {**VALUES, "critical_issues": ["Private critical issue"]}
    )
    artifact = scored[-1]
    artifact.payload["competence"] = competence.report(values)
    original = Quality.model_validate({key: artifact.payload[key] for key in Quality.model_fields})
    scored[2][-1].payload["output_sha256"] = digest({"quality": original.model_dump(), "scores": values})
    result = project(scored)
    assert result["state"] == "needs_review" and result["critical_issues_count"] == (defect == "critical")
    assert "Private critical issue" not in str(result) and result["module_admission"] == "not_admitted"


def test_unknown_token_accounting_does_not_erase_proven_structured_output(scored):
    scored[2][-1].payload["usage"] = {"known": False, "tokens": None}
    assert not evidence.usage(scored[2])["complete"]
    assert project(scored)["state"] == "competent"


def test_actual_v2_agent_reply_id_can_be_original_model_evidence(scored):
    reply = SimpleNamespace(
        id="reply", kind="customer_text_result", sequence=1, payload={"status": "succeeded"}
    )
    scored[2].append(reply)
    artifact = scored[-1]
    artifact.payload["evidence_event_ids"] = ["reply"]
    original = Quality.model_validate({key: artifact.payload[key] for key in Quality.model_fields})
    settlement = next(e for e in scored[2] if e.kind == "quality_provider_usage")
    settlement.payload["output_sha256"] = digest({"quality": original.model_dump(), "scores": VALUES})
    assert project(scored)["state"] == "competent"


def test_wire_rejects_missing_measured_or_unverified_numeric_fields(scored):
    result = project(scored)
    with pytest.raises(ValidationError):
        wire.CompetenceEvidence.model_validate({**result, "scores": None})
    with pytest.raises(ValidationError):
        wire.CompetenceEvidence.model_validate({**result, "state": "UNVERIFIED"})


@pytest.mark.parametrize("bad", [True, 4.0, "4", -1, 6])
def test_public_numeric_wire_rejects_non_integer_scores(bad):
    with pytest.raises(ValidationError):
        wire.NumericScores.model_validate(
            {**{k: VALUES[k] for k in score_evidence.DIMENSIONS}, "listening": bad}
        )


def test_additive_wire_retains_false_readiness_and_old_test_run_fields():
    doc = contract.document()
    path = "/customer/v2/creations/{creation_id}/agents/{agent_id}/score-evidence"
    assert set(doc["paths"][path]) == {"get"}
    assert doc["paths"][path]["get"]["operationId"] == "listCustomerAgentScoreEvidence"
    assert "competence" not in wire.TestRun.model_fields
    assert set(wire.ScoreEvidenceRun.model_fields) == set(wire.TestRun.model_fields) | {"competence"}
    assert not {"explanation", "critical_issues", "model_assessment", "proof", "session_id"} & set(
        wire.CompetenceEvidence.model_fields
    )
    assert (
        doc["components"]["schemas"]["ScoreEvidenceRuns"]["properties"]["provider_execution"]["const"]
        is False
    )
