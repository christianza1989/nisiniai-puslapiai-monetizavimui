"""Read existing accounted numeric assessments; never judge, tune or grant execution."""
from .. import competence
from ..contracts import Quality
from ..creation.service import digest
from ..quality_context import Attribution

DIMENSIONS = ("relevance", "factual_accuracy", "listening", "useful_next_step", "email_quality")


def original_quality(payload):
    """Only the known outer guard and inner attribution wrappers are admissible."""
    if "observable_guards" in payload:
        if not isinstance(payload["observable_guards"], list) or not payload["observable_guards"]:
            raise ValueError()
        payload = payload["model_assessment"]
    if "root_cause_attribution" in payload:
        Attribution.model_validate(payload["root_cause_attribution"])
        payload = payload["model_assessment"]
    if "model_assessment" in payload or not isinstance(payload, dict):
        raise ValueError()
    return Quality.model_validate({key: payload[key] for key in Quality.model_fields})


def projection(events, jobs, artifacts, judgment, truncated):
    result = {"state": "UNVERIFIED", "language_quality": "UNVERIFIED", "typed_checks": "UNVERIFIED",
        "protected_comparison": "not_performed", "module_admission": "not_admitted", "activation": "not_performed"}
    if not jobs and not artifacts:
        return {**result, "state": "not_requested"}
    if len(jobs) != 1:
        return result
    job = jobs[0]
    if len(artifacts) == 1 and not isinstance(artifacts[0].payload, dict):
        return result
    report = artifacts[0].payload.get("competence") if len(artifacts) == 1 else None
    if "competence_contract" not in job.payload:
        return {**result, "state": "UNVERIFIED" if report is not None else "not_requested"}
    if (job.payload.get("competence_contract") != competence.VERSION or truncated
            or judgment.get("state") != "succeeded" or "outcome" not in judgment or len(artifacts) != 1):
        return result
    try:
        requests = [e for e in events if e.kind == "quality_request" and e.payload.get("job_id") == job.id]
        if len(requests) != 1 or requests[0].payload.get("competence_contract") != competence.VERSION:
            return result
        attempts = [e for e in events if e.kind == "quality_provider_attempt" and e.payload.get("job_id") == job.id]
        settlements = [e for e in events if e.kind == "quality_provider_usage" and e.payload.get("job_id") == job.id]
        # The existing judgment validates exact request/reservation/settlement provenance.
        # Add the initial request ordering and sequential dispatch boundary here.
        if not attempts or any(e.sequence <= requests[0].sequence for e in attempts):
            return result
        first = next(e for e in settlements if e.payload.get("number") == 1)
        if len(attempts) == 2 and first.sequence >= next(e.sequence for e in attempts if e.payload["number"] == 2):
            return result
        if not isinstance(report, dict) or not isinstance(report.get("scores"), dict):
            return result
        values = report["scores"]
        if any(type(values.get(key)) is not int for key in DIMENSIONS):
            return result
        scores = competence.Scores.model_validate(values)
        canonical = competence.report(scores)
        if report != canonical:
            return result
        original = original_quality(artifacts[0].payload)
        # V2 stores agent replies as customer_text_result, not agent_transcript.
        # The enclosing item already validated the complete transcript receipts.
        refs = {e.id for e in events if e.sequence < requests[0].sequence and
            (e.kind == "client_transcript" or
            (e.kind == "customer_text_result" and e.payload.get("status") == "succeeded"))}
        if not original.evidence_event_ids or not set(original.evidence_event_ids).issubset(refs):
            return result
        if digest({"quality": original.model_dump(), "scores": scores.model_dump()}) != first.payload.get("output_sha256"):
            return result
        return {**result, "state": canonical["state"], "contract": competence.VERSION,
            "criterion_sha256": canonical["criterion_sha256"], "threshold": canonical["threshold"],
            "scores": {key: getattr(scores, key) for key in DIMENSIONS},
            "critical_issues_count": len(scores.critical_issues)}
    except (KeyError, TypeError, ValueError, AttributeError, StopIteration):
        return result
