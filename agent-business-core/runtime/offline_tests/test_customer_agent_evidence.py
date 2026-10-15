"""No database/provider: conservative accounting and canonical wire boundaries."""
from types import SimpleNamespace

import pytest

from pinet_core.contracts import Quality
from pinet_core.creation.service import digest
from pinet_core.customer_agents import contract, evidence, wire


def event(kind, **payload):
    return SimpleNamespace(kind=kind, payload=payload)


def text_pair(**usage):
    common = {"request_id": "request", "run_id": "run", "model": "gpt-6-luna"}
    return [event("provider_attempt", **common), event("provider_usage", **common,
        usage={"known": True, "tokens": usage})]


def test_exact_pairs_sum_only_known_nonnegative_integer_tokens():
    result = evidence.usage(text_pair(input_tokens=9, output_tokens=5))
    assert result["complete"] and result["input_tokens"] == 9 and result["output_tokens"] == 5
    assert result["cost_status"] == "UNVERIFIED"


@pytest.mark.parametrize("change", ["duplicate", "wrong_run", "wrong_model", "unknown", "boolean", "negative"])
def test_incomplete_or_mismatched_accounting_never_invents_complete_tokens(change):
    rows = text_pair(input_tokens=9, output_tokens=5)
    if change == "duplicate":
        rows += rows
    elif change == "wrong_run":
        rows[-1].payload["run_id"] = "foreign"
    elif change == "wrong_model":
        rows[-1].payload["model"] = "other"
    elif change == "unknown":
        rows[-1].payload["usage"] = {"known": False, "tokens": None}
    elif change == "boolean":
        rows[-1].payload["usage"]["tokens"]["input_tokens"] = True
    else:
        rows[-1].payload["usage"]["tokens"]["input_tokens"] = -1
    result = evidence.usage(rows)
    assert result["input_tokens"] is None
    if change not in {"boolean", "negative"}:
        assert not result["complete"]


def test_additive_get_contract_retains_false_readiness_and_contains_no_private_payload():
    doc = contract.document()
    path = "/customer/v2/creations/{creation_id}/agents/{agent_id}/test-runs"
    assert set(doc["paths"][path]) == {"get"}
    assert doc["paths"][path]["get"]["operationId"] == "listCustomerAgentTestEvidence"
    schemas = doc["components"]["schemas"]
    assert schemas["TestRuns"]["properties"]["provider_execution"]["const"] is False
    assert schemas["Readiness"]["properties"]["can_calibrate"]["const"] is False
    assert schemas["TestRuns"]["properties"]["calibration_status"]["const"] == "UNVERIFIED"
    assert not {"transcript", "prompt", "specification", "bearer", "session_id", "contacts"} & set(wire.TestRun.model_fields)


@pytest.fixture
def quality_case(monkeypatch):
    frozen = SimpleNamespace(model_dump=lambda **_: {"retained": "binding"})
    payload = {"dispatch": evidence.review.VERSION, "model": "gpt-6.1-sol", "fingerprint": "a" * 64,
        "binding_sha256": digest(frozen.model_dump()), "input_sha256": "b" * 64,
        "evaluator_sha256": "c" * 64, "model_profile": {"fixed": "profile"}}
    request = event("quality_request", job_id="job", **payload)
    request.sequence = 2
    client = event("client_transcript")
    client.sequence = 1
    monkeypatch.setattr(evidence.quality, "parent", lambda _: "d" * 64)
    artifact = SimpleNamespace(payload={**Quality(outcome="helpful", issues=[], evidence_event_ids=[],
        improvement_hint="").model_dump(), "release_hash": "d" * 64, "coverage": "complete"})
    attempt = event("quality_provider_attempt", job_id="job", number=1, **payload)
    attempt.event_key, attempt.sequence = "quality-attempt:job:1", 3
    settled = event("quality_provider_usage", job_id="job", number=1, model="gpt-6.1-sol",
        failure_code=None, output_sha256="e" * 64)
    settled.event_key, settled.sequence = "quality-usage:job:1", 4
    return frozen, SimpleNamespace(id="job", payload=payload, state="succeeded"), [client, request, attempt, settled], artifact


def judge(case):
    frozen, job, events, artifact = case
    return evidence.judgment(None, frozen, events, [job], [artifact], False)


def test_exact_reserved_and_settled_quality_exposes_historical_outcome(quality_case):
    result = judge(quality_case)
    assert result["state"] == "succeeded" and result["outcome"] == "helpful"
    assert result["applies_to_latest_transcript"]


@pytest.mark.parametrize("change", ["missing_attempt", "missing_usage", "duplicate_attempt", "duplicate_usage",
    "model", "binding_sha256", "input_sha256", "evaluator_sha256", "fingerprint", "model_profile",
    "number", "reservation_key", "usage_key", "failure", "output", "chronology"])
def test_unproven_quality_cannot_expose_successful_outcome(quality_case, change):
    events = quality_case[2]
    if change == "missing_attempt":
        events.remove(events[2])
    elif change == "missing_usage":
        events.pop()
    elif change == "duplicate_attempt":
        events.append(events[2])
    elif change == "duplicate_usage":
        events.append(events[3])
    elif change == "number":
        events[2].payload["number"] = True
    elif change == "reservation_key":
        events[2].event_key = "foreign"
    elif change == "usage_key":
        events[3].event_key = "foreign"
    elif change == "failure":
        events[3].payload["failure_code"] = "run_timeout"
    elif change == "output":
        events[3].payload["output_sha256"] = None
    elif change == "chronology":
        events[3].sequence = 1
    else:
        events[2].payload[change] = "foreign"
    result = judge(quality_case)
    assert result["state"] == "UNVERIFIED" and "outcome" not in result


@pytest.mark.parametrize("state", ["running", "failed"])
def test_job_before_first_reservation_retains_state_without_an_outcome(quality_case, state):
    quality_case[1].state = state
    del quality_case[2][2:]
    result = judge(quality_case)
    assert result["state"] == state and "outcome" not in result


def test_truncated_event_prefix_never_presents_token_subtotals_as_episode_totals():
    events = text_pair(input_tokens=9, output_tokens=5)
    events += [event("other") for _ in range(evidence.EVENT_LIMIT - len(events))]
    events += [event("provider_attempt", request_id="later", run_id="later", model="gpt-6-luna")]
    assert len(events) == evidence.EVENT_LIMIT + 1
    result = evidence.usage(events[:evidence.EVENT_LIMIT], truncated=True)
    assert result["attempts"] == result["settled"] == 1
    assert not result["complete"] and result["input_tokens"] is result["output_tokens"] is None
