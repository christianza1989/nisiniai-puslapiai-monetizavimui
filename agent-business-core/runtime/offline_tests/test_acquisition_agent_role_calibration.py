"""Known inert grade/stop fixtures only; no protected corpus or native dispatch."""

from copy import deepcopy
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from pydantic import ValidationError
from test_acquisition_model_adapter import inert, yes  # noqa: F401
from test_acquisition_native_chain import inputs

from pinet_core.acquisition import model_adapter
from pinet_core.acquisition.agent_role_calibration import (
    SixRoleGrade,
    SixRoleWorkflow,
    validate_corpus,
    validate_corpus_file,
)
from pinet_core.acquisition.agent_role_contract import OUTPUT, ROLES
from pinet_core.acquisition.contracts import Campaign, Prospect
from pinet_core.acquisition.dialogue_lab import DialogueGrade, LabCase, run_case
from pinet_core.tasks.codex import RunnerError


def workflow(executed=ROLES):
    value = SixRoleWorkflow.__new__(SixRoleWorkflow)
    value.receipts, value.stop_cause, value.evaluation_events = [], None, []
    value.frozen = {"bindings": {}}
    value.provenance = {"synthetic_fixture": True}
    for role in ROLES:
        expected = {
            "agent_id": str(uuid4()),
            "config_id": str(uuid4()),
            "config_revision": 2,
            "config_sha256": "a" * 64,
        }
        value.frozen["bindings"][role] = expected
        if role in executed:
            value.receipts.append(
                {
                    "role": role,
                    "result": expected.copy(),
                    "execution": {
                        "run_id": str(uuid4()),
                        "status": "succeeded",
                        "model": "gpt-6.1-sol",
                        "effort": "high",
                        "usage": {"model_calls": 1, "unknown_usage_calls": 0, "usage_complete": True},
                    },
                }
            )
    return value


def grade():
    return {
        "factual": True,
        "appropriate": True,
        "respects_stop": True,
        "follows_corrected_need": True,
        "no_false_activation": True,
        "reason": "Actual scoped evidence is complete.",
        "role_status": {role: "PASS" for role in ROLES},
        "na_reasons": {},
    }


def test_grade_requires_every_role_and_no_false_or_unknown_pass():
    value = workflow()
    assert value.grade_pass(grade())
    changed = grade()
    changed["role_status"]["reply"] = "FAIL"
    assert not value.grade_pass(changed)
    changed = grade()
    changed["role_status"]["reply"] = "NA"
    changed["na_reasons"]["reply"] = "Unjustified skip of executed Config."
    assert not value.grade_pass(changed)
    changed = grade()
    changed["role_status"].pop("quality")
    with pytest.raises(ValidationError):
        value.grade_pass(changed)
    assert not value.grade_pass(grade() | {"factual": False})


def test_role_labels_without_own_config_run_known_usage_do_not_pass():
    for field in ("agent_id", "config_id", "config_revision", "config_sha256"):
        value = workflow()
        value.receipts[-1]["result"][field] = "another-config"
        assert not value.grade_pass(grade())
    for change in (
        {"status": "failed"},
        {"run_id": None},
        {"model": "other"},
        {"effort": "low"},
        {"usage": {"model_calls": 1, "unknown_usage_calls": 1}},
        {"usage": {"model_calls": 1, "unknown_usage_calls": 0, "usage_complete": False}},
    ):
        value = workflow()
        value.receipts[-1]["execution"].update(change)
        assert not value.grade_pass(grade())


def test_justified_na_only_for_unexecuted_roles_after_observed_stop():
    executed = ("coordinator", "research", "qualification")
    value = workflow(executed)
    result = grade()
    for role in set(ROLES) - set(executed):
        result["role_status"][role] = "NA"
        result["na_reasons"][role] = "Actual qualification stopped before drafting."
    assert not value.grade_pass(result)
    value.stop_cause = "not_qualified"
    assert value.grade_pass(result)
    result["role_status"]["writer"] = "PASS"
    assert not value.grade_pass(result)


async def test_early_stop_uses_independent_evaluator_in_same_runner(tmp_path):
    data, _ = inputs()
    campaign = Campaign.model_validate(data["campaign"])
    case = LabCase(
        id="known-six-stop",
        split="train",
        prospect=Prospect.model_validate(data["prospect"]),
        recipient=data["recipient"],
        persona="Known synthetic buyer.",
        expected_classifications=[],
        expected_initial="research",
    )
    value = workflow(("coordinator", "research", "qualification"))
    value.stop_cause = "not_qualified"
    value.validate = lambda *args: None

    async def prepare(*args):
        return {"state": "research", "external_sent": False}

    value.prepare = prepare

    class Evaluator:
        calls = 0

        async def ask(self, schema, instruction, payload):
            self.calls += 1
            assert schema is SixRoleGrade and len(payload["native_receipts"]) == 3
            result = grade()
            for role in ("writer", "reply", "quality"):
                result["role_status"][role] = "NA"
                result["na_reasons"][role] = "Native qualification stopped work."
            return schema.model_validate(result)

    evaluator = Evaluator()
    row = await run_case(
        campaign,
        case,
        None,
        None,
        evaluator,
        tmp_path / "early",
        datetime.now(UTC),
        max_turns=1,
        workflow=value,
    )
    assert row["passed"] and row["grade_pass"] and evaluator.calls == 1
    with pytest.raises(ValueError, match="workflow_turn_limit"):
        await run_case(
            campaign,
            case,
            None,
            None,
            evaluator,
            tmp_path / "excess",
            datetime.now(UTC),
            max_turns=2,
            workflow=value,
        )
    assert evaluator.calls == 1 and not (tmp_path / "excess").exists()


async def test_legacy_early_stop_without_hook_stays_exactly_ungraded(tmp_path):
    data, _ = inputs()
    campaign = Campaign.model_validate(data["campaign"])
    case = LabCase(
        id="known-legacy-stop",
        split="train",
        prospect=Prospect.model_validate(data["prospect"]),
        recipient=data["recipient"],
        persona="Known synthetic buyer.",
        expected_classifications=[],
        expected_initial="research",
    )

    class Legacy:
        receipts, provenance = [], {}

        def validate(self, *args):
            pass

        async def prepare(self, *args):
            return {"state": "research", "external_sent": False}

    class Never:
        async def ask(self, *args):
            pytest.fail("Legacy early stop never invoked a grader")

    row = await run_case(
        campaign, case, None, None, Never(), tmp_path / "legacy", datetime.now(UTC), workflow=Legacy()
    )
    assert row["passed"] and "grade" not in row


@pytest.mark.parametrize("role", ROLES)
async def test_six_fixed_schemas_share_same_bounded_high_transport(inert, monkeypatch, role):  # noqa: F811
    values = {
        "research": {
            "fit": "yes",
            "intent": "unknown",
            "reasons": "Approved source.",
            "evidence_ids": [],
            "offer_fact_ids": [],
            "next_action": "research",
            "subject": "",
            "body": "",
        },
        "qualification": {
            "fit": "unknown",
            "intent": "unknown",
            "eligible_for_draft": False,
            "evidence_ids": [],
            "reason": "Need current evidence.",
        },
        "reply": {
            "classification": "refusal",
            "action": "stop",
            "subject": "",
            "body": "",
            "offer_fact_ids": [],
            "reason": "Respect the refusal.",
        },
        "quality": {
            "factual": True,
            "relevant": True,
            "one_clear_next_step": True,
            "no_unverified_promises": True,
            "no_source_instructions": True,
            "reason": "Exact copy reviewed.",
            "artifact_sha256": "a" * 64,
        },
        "coordinator": {"action": "stop", "next_role": None, "reason": "No further authority."},
    }
    values["writer"] = deepcopy(values["research"])
    calls = []

    async def execute(args, **kwargs):
        calls.append(args)
        return values[role], {"input_tokens": 1, "output_tokens": 1}

    monkeypatch.setattr(model_adapter.codex, "execute", execute)
    value, usage = await model_adapter.run_role(
        role, OUTPUT[role], "Fixed saved-role instruction", {}, yes, datetime.now(UTC) + timedelta(seconds=30)
    )
    assert isinstance(value, OUTPUT[role]) and len(calls) == 1
    assert calls[0][calls[0].index("--model") + 1] == "gpt-6.1-sol"
    assert 'model_reasoning_effort="high"' in calls[0]
    with pytest.raises(RunnerError):
        await model_adapter.run_role(
            role, DialogueGrade, "Wrong custom schema", {}, yes, datetime.now(UTC) + timedelta(seconds=30)
        )
    assert len(calls) == 1


def corpus():
    data, _ = inputs()
    return {
        "synthetic": True,
        "now": datetime.now(UTC).isoformat(),
        "campaign": data["campaign"],
        "cases": [
            {
                "id": "known-schema-" + str(n),
                "split": "train" if n < 3 else "holdout",
                "prospect": data["prospect"],
                "recipient": data["recipient"],
                "persona": "Known independent synthetic data-only persona " + str(n),
                "expected_classifications": ["question"],
                "expected_initial": "draft_ready",
            }
            for n in range(6)
        ],
    }


@pytest.mark.parametrize("change", ["naive", "duplicate", "site", "recipient", "split", "unknown_field"])
def test_data_only_corpus_validator_rejects_invalid_custody_without_exposing_input(change):
    source = corpus()
    validate_corpus(source)
    if change == "naive":
        source["now"] = "2026-10-18T15:00:00"
    elif change == "duplicate":
        source["cases"][-1]["persona"] = source["cases"][0]["persona"]
    elif change == "site":
        source["cases"][-1]["prospect"] = source["cases"][-1]["prospect"] | {"site_id": "foreign-site"}
    elif change == "recipient":
        source["cases"][-1]["recipient"] = "person@real.example.com"
    elif change == "split":
        source["cases"][-1]["split"] = "regression"
    else:
        source["private_unknown"] = "Do not expose this private fixture text"
    with pytest.raises(RunnerError) as failure:
        validate_corpus(source)
    assert str(failure.value) == "agent_role_corpus_invalid"


def test_offline_sealed_file_validator_only_exports_counts_and_hashes(tmp_path, monkeypatch):
    import hashlib
    import json

    from pinet_core.acquisition import native_calibration

    monkeypatch.setattr(native_calibration, "ROOT", tmp_path)
    path = tmp_path / "known-private-corpus.json"
    path.write_text(json.dumps(corpus()), encoding="utf-8")
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    result = validate_corpus_file(str(path), checksum)
    assert result["case_count"] == 6 and result["split_counts"]["holdout"] == 3
    assert result["model_calls"] == result["database_calls"] == 0 and result["private_text_exported"] is False
    assert "persona" not in json.dumps(result)
    path.write_text("{}", encoding="utf-8")
    with pytest.raises(RunnerError, match="agent_role_protected_source_changed"):
        validate_corpus_file(str(path), checksum)
