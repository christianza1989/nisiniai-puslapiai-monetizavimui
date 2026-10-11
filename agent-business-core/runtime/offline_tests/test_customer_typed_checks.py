"""Precommit, chronology and unchanged-criterion boundaries; no provider calls."""

import hashlib
import inspect
import json
from copy import deepcopy
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from test_customer_agent_protection import fixture_manifest
from test_customer_need_receipts import event
from test_customer_quality import row

from pinet_core import competence
from pinet_core.control.routes import ControlError
from pinet_core.creation.service import digest
from pinet_core.customer_agents import protection, review, typed_checks
from pinet_core.models import Event

VALUES = dict(
    relevance=4,
    factual_accuracy=4,
    listening=4,
    useful_next_step=4,
    email_quality=5,
    critical_issues=[],
    explanation="Synthetic assessment",
)


def write(path, value):
    path.write_text(json.dumps(value), encoding="utf-8")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def supplement_for(origin_path, origin, mode="fields"):
    return {
        "version": typed_checks.VERSION,
        "purpose": "diagnostic_seen_regression",
        "origin": {"path": str(origin_path), "sha256": hashlib.sha256(origin_path.read_bytes()).hexdigest()},
        "source_case_corpus_sha256": origin["corpus_sha256"],
        "cases": [
            {
                "case_id": c["case_id"],
                "script_sha256": digest(c["messages"]),
                "expected_contact_channels": [],
                "email_expected": False,
                "checkpoints": [
                    {
                        "after_step": i,
                        "mode": mode,
                        **({"matches": {"goal": [message]}} if mode == "fields" else {}),
                    }
                    for i, message in enumerate(c["messages"], 1)
                ],
            }
            for c in origin["cases"]
        ],
    }


def planned(tmp_path, monkeypatch):
    origin_path, origin, ref, snapshot, messages = fixture_manifest(tmp_path, monkeypatch)
    supplement = supplement_for(origin_path, origin)
    supplement_path = tmp_path / "expectations.private.json"
    sha = write(supplement_path, supplement)
    manifest = {
        **origin,
        "contract": typed_checks.MANIFEST,
        "typed_expectations": {"path": str(supplement_path), "sha256": sha},
    }
    path = tmp_path / "typed-manifest.private.json"
    ref = {**ref, "manifest_path": str(path), "manifest_sha256": write(path, manifest)}
    proof = protection.freeze(ref, snapshot, messages)
    return manifest, supplement, supplement_path, path, ref, proof, snapshot, messages


@pytest.mark.parametrize(
    "value",
    [
        {"after_step": 1, "mode": "fields"},
        {"after_step": 1, "mode": "fields", "matches": {"budget": []}},
        {"after_step": 1, "mode": "fields", "absent": ["budget"]},
        {"after_step": 1, "mode": "fields", "matches": {"budget": [""]}},
        {"after_step": 1, "mode": "fields", "matches": {"budget": ["50"]}, "absent": ["budget"]},
        {"after_step": 1, "mode": "empty", "matches": {"budget": ["50"]}},
        {"after_step": True, "mode": "empty"},
        {"after_step": 1, "mode": "fields", "absent": ["phone"]},
    ],
)
def test_vacuous_ambiguous_unknown_or_coerced_checkpoints_rejected(value):
    with pytest.raises(ValidationError):
        typed_checks.Checkpoint.model_validate(value)


@pytest.mark.parametrize("value", [{"expected_contact_channels": ["email"]}, {"email_expected": True}])
def test_unavailable_contact_email_channels_are_not_fabricated_as_accepted(value):
    with pytest.raises(ValidationError, match="only_proves_contact_email_absence"):
        typed_checks.Case(
            case_id="case",
            script_sha256="a" * 64,
            checkpoints=[{"after_step": 1, "mode": "empty"}],
            **({"expected_contact_channels": [], "email_expected": False} | value),
        )


def test_new_plan_preserves_origin_and_old_proof_shape_but_binds_expectation_bytes(tmp_path, monkeypatch):
    manifest, _, _, _, ref, proof, _, _ = planned(tmp_path, monkeypatch)
    before = deepcopy(proof)
    binding = typed_checks.bound(ref, proof)
    assert set(proof) == set(protection.Proof.model_fields) - {"parent_hash"}
    assert proof == before and binding["source_case_corpus_sha256"] == proof["corpus_sha256"]
    assert binding["evaluation_plan_sha256"] != proof["corpus_sha256"]
    assert "matches" not in str(proof)
    assert typed_checks.plan(manifest)[2]["evaluation_plan_sha256"] == binding["evaluation_plan_sha256"]


@pytest.mark.parametrize(
    "change", ["empty", "missing_case", "missing_step", "duplicate_case", "script", "late_bytes"]
)
def test_every_case_is_validated_before_start_not_just_selected(tmp_path, monkeypatch, change):
    manifest, supplement, supplement_path, path, ref, _, snapshot, messages = planned(tmp_path, monkeypatch)
    if change == "empty":
        supplement["cases"][0]["checkpoints"][0] = {"after_step": 1, "mode": "fields"}
    elif change == "missing_case":
        supplement["cases"].pop()
    elif change == "missing_step":
        supplement["cases"][0]["checkpoints"][0]["after_step"] = 2
    elif change == "duplicate_case":
        supplement["cases"][0]["case_id"] = supplement["cases"][1]["case_id"]
    elif change == "script":
        supplement["cases"][0]["script_sha256"] = "0" * 64
    else:
        supplement_path.write_bytes(supplement_path.read_bytes() + b" ")
    if change != "late_bytes":
        manifest["typed_expectations"]["sha256"] = write(supplement_path, supplement)
        ref["manifest_sha256"] = write(path, manifest)
    with pytest.raises((ControlError, ValidationError)):
        protection.freeze(ref, snapshot, messages)


def test_post_execution_replacement_and_old_missing_expectations_fail_closed(tmp_path, monkeypatch):
    manifest, supplement, supplement_path, path, ref, proof, _, _ = planned(tmp_path, monkeypatch)
    old = deepcopy(ref)
    supplement["cases"][3]["checkpoints"][0]["matches"]["goal"] = ["Changed expected value"]
    manifest["typed_expectations"]["sha256"] = write(supplement_path, supplement)
    ref["manifest_sha256"] = write(path, manifest)
    with pytest.raises(ControlError, match="precommit"):
        typed_checks.bound(ref, proof)
    with pytest.raises(ControlError, match="conflict"):
        typed_checks.bound(old, proof)
    with pytest.raises(ControlError, match="precommit"):
        typed_checks.bound(old, None)
    assert "typed_expectations" not in review.Request.model_fields
    assert competence.report(VALUES)["typed_checks"] == "UNVERIFIED"


def test_plan_hash_cannot_equate_different_expectations_on_same_old_corpus(tmp_path, monkeypatch):
    manifest, supplement, supplement_path, _, _, _, _, _ = planned(tmp_path, monkeypatch)
    original = typed_checks.plan(manifest)[2]
    supplement["cases"][0]["checkpoints"][0]["matches"]["goal"].append("Preauthored alternative")
    manifest["typed_expectations"]["sha256"] = write(supplement_path, supplement)
    new = typed_checks.plan(manifest)[2]
    assert original["source_case_corpus_sha256"] == new["source_case_corpus_sha256"]
    assert original["evaluation_plan_sha256"] != new["evaluation_plan_sha256"]


def bound_case(checkpoints):
    return dict(
        version=typed_checks.VERSION,
        evaluation_plan_sha256="a" * 64,
        purpose="diagnostic_seen_regression",
        source_case_corpus_sha256="b" * 64,
        case_id="correction",
        case=dict(
            case_id="correction",
            script_sha256="c" * 64,
            expected_contact_channels=[],
            email_expected=False,
            checkpoints=checkpoints,
        ),
    )


def observations():
    return dict(
        checkpoints=[
            {
                "after_step": 1,
                "state_before": {},
                "state_after": {"budget": {"value": "100", "evidence": "client1"}},
                "client_event_id": "client1",
                "reply_event_id": "reply1",
            },
            {
                "after_step": 2,
                "state_before": {"budget": {"value": "100", "evidence": "client1"}},
                "state_after": {"budget": {"value": "50", "evidence": "client2"}},
                "client_event_id": "client2",
                "reply_event_id": "reply2",
            },
        ],
        channels=[],
        tools=[{"name": "need.patch", "result": {}, "turn": 1}],
        errors=[],
        followup_present=False,
    )


def result():
    return dict(outcome="helpful", issues=[], competence=competence.report(VALUES))


def test_correction_is_checked_at_each_reply_boundary_not_only_final_state():
    binding = bound_case(
        [
            {"after_step": 1, "mode": "fields", "matches": {"budget": ["100"]}},
            {"after_step": 2, "mode": "fields", "matches": {"budget": ["50"]}},
        ]
    )
    actual = observations()
    report = typed_checks.evaluate(binding, actual, result())
    assert report["state"] == "PASS" and len(report["checks"]) == 10
    assert report["module_admission"] == "not_admitted" and report["purpose"] == "diagnostic_seen_regression"
    assert "100" not in str(report) and "50" not in str(report)
    actual["checkpoints"][0]["state_after"] = actual["checkpoints"][1]["state_after"]
    bad = typed_checks.evaluate(binding, actual, result())
    assert bad["state"] == "FAIL" and not bad["checks"]["corrected_need_saved"]
    assert bad["checkpoints"][1]["passed"] and not bad["checkpoints"][0]["passed"]


def test_explicit_empty_and_unchanged_states_have_actual_checkpoint_assertions():
    binding = bound_case([{"after_step": 1, "mode": "empty"}, {"after_step": 2, "mode": "unchanged"}])
    actual = observations()
    for checkpoint in actual["checkpoints"]:
        checkpoint["state_after"] = checkpoint["state_before"] = {}
    assert typed_checks.evaluate(binding, actual, result())["state"] == "PASS"
    actual["checkpoints"][1]["state_after"] = {"budget": {"value": "50"}}
    assert not typed_checks.evaluate(binding, actual, result())["checks"]["corrected_need_saved"]


def test_actual_followup_presence_and_low_existing_scores_fail_existing_criteria():
    binding = bound_case(
        [
            {"after_step": 1, "mode": "fields", "matches": {"budget": ["100"]}},
            {"after_step": 2, "mode": "fields", "matches": {"budget": ["50"]}},
        ]
    )
    actual = observations()
    actual["followup_present"] = True
    assert not typed_checks.evaluate(binding, actual, result())["checks"]["no_email_without_email_contact"]
    low = result()
    low["competence"] = competence.report({**VALUES, "listening": 3})
    assert not typed_checks.evaluate(binding, actual, low)["checks"]["competent_service_scores"]


def test_exact_legacy_matcher_is_factored_without_semantic_changes():
    import ast

    tree = ast.parse(inspect.getsource(competence.expected_matches))
    assert (
        hashlib.sha256(ast.dump(tree.body[0]).encode()).hexdigest()
        == "ada8f2c9754bbf1fa96412be9db7320e7980e2c0bd50ac832ea9907c3ef98839"
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["missing_usage", "wrong_run", "unknown_usage"])
async def test_no_patch_turn_still_requires_real_provider_receipt_chain(change):
    value = row()
    value.id, value.need_revision = "row", 0
    events = [
        event(1, "client_transcript", "client:request", {"text": "Synthetic unchanged need"}),
        event(
            2,
            "provider_attempt",
            "attempt:request",
            {"request_id": "request", "run_id": "run", "epoch": 1, "need_revision": 0, "model": "gpt-6-luna"},
        ),
        event(
            3,
            "provider_usage",
            "usage:request",
            {
                "request_id": "request",
                "run_id": "run",
                "model": "gpt-6-luna",
                "failure_code": None,
                "usage": {"known": False, "tokens": None},
            },
        ),
        event(
            4,
            "customer_text_result",
            "result:request",
            {"request_id": "request", "status": "succeeded", "reply": "Useful unchanged synthetic answer"},
        ),
    ]
    if change == "missing_usage":
        events.pop(2)
    elif change == "wrong_run":
        events[2].payload["run_id"] = "foreign"

    async def scalars(query):
        return events if query.column_descriptions[0]["entity"] is Event else []

    tx = SimpleNamespace(scalars=scalars)
    if change == "unknown_usage":
        actual = await typed_checks.capture(tx, value)
        assert actual["checkpoints"][0]["state_after"] == {}
        assert actual["errors"] == []  # Unknown tokens do not erase a real structured result.
    else:
        with pytest.raises(ControlError, match="typed_text_receipt_conflict"):
            await typed_checks.capture(tx, value)
