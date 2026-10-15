"""Canonical criteria compatibility and the accounted structured adapter; no providers."""
import ast
import hashlib
import inspect
from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from pinet_core import competence
from pinet_core.contracts import Quality
from pinet_core.customer_agents import review
from pinet_core.evidence_output import bound_schema
from pinet_core.tasks.codex_transport import RunnerError

# Exact legacy AST/instruction witnesses from c23a76f; no Git history needed by tests.
CLASS_SHA = "e6837e65f4628d4626d5fd57ac604e5cfec62b4a2a4f4ff5478372005499fc19"
INSTRUCTION_SHA = "801284b022746b95773cf82cc2f326db47dc9eb01a6ec0a9a1c2cd08b20b141c"
CHECKS_SHA = "deebc99895530ac8e9a215335dac37f9e229769c122787d27e11f48966672d64"
ROOT = Path(__file__).resolve().parents[1]
VALUES = dict(relevance=4, factual_accuracy=4, listening=4, useful_next_step=4,
              email_quality=5, critical_issues=[], explanation="Synthetic assessment")


def checks(tree):
    return next(n.value for n in ast.walk(tree) if isinstance(n, ast.Assign) and any(
        isinstance(t, ast.Subscript) and isinstance(t.slice, ast.Constant) and t.slice.value == "checks"
        for t in n.targets))


def test_existing_scores_instruction_and_all_ten_typed_criteria_are_exact():
    new_class = ast.parse(inspect.getsource(competence.Scores)).body[0]
    assert hashlib.sha256(ast.dump(new_class).encode()).hexdigest() == CLASS_SHA
    assert hashlib.sha256(competence.INSTRUCTION.encode()).hexdigest() == INSTRUCTION_SHA
    shared = ast.parse(inspect.getsource(competence.network_checks))
    expression = next(n.value for n in ast.walk(shared) if isinstance(n, ast.Return))
    assert hashlib.sha256(ast.dump(expression).encode()).hexdigest() == CHECKS_SHA
    assert len(expression.keys) == 10
    current = ast.parse((ROOT / "scripts/network_lab.py").read_text(encoding="utf-8"))
    call = checks(current)
    assert isinstance(call, ast.Call) and isinstance(call.func, ast.Name)
    assert call.func.id == "network_checks"
    assert any(isinstance(n, ast.ImportFrom) and n.module == "pinet_core.competence"
        and any(a.name == "network_checks" for a in n.names) for n in current.body)


def test_original_four_field_request_retained_and_explicit_scores_are_strict():
    assert set(review.Request.model_fields) == {"bearer", "conversation_id", "request_id", "episode"}
    field = review.ScoredRequest.model_fields["score_competence"]
    assert field.default is True
    for value in ("true", "false", 1, None):
        with pytest.raises(ValidationError):
            review.ScoredRequest.__pydantic_validator__.validate_assignment(
                review.ScoredRequest.model_construct(), "score_competence", value)


@pytest.mark.parametrize("low", ["relevance", "factual_accuracy", "listening", "useful_next_step", "email_quality"])
def test_each_original_dimension_requires_four_without_admission(low):
    value = competence.report({**VALUES, low: 3})
    assert value["state"] == "needs_review" and value["threshold"] == 4
    assert value["module_admission"] == "not_admitted" and value["activation"] == "not_performed"
    assert value["typed_checks"] == value["language_quality"] == "UNVERIFIED"
    assert value["protected_comparison"] == "not_performed"


def test_critical_issue_fails_despite_high_scores_and_language_override_is_explicit():
    assert competence.report(VALUES)["state"] == "competent"
    assert competence.report({**VALUES, "critical_issues": ["Synthetic privacy defect"]})["state"] == "needs_review"
    role = competence.customer_instruction()
    assert role.startswith(competence.INSTRUCTION.replace("English clients need English replies. ", ""))
    assert "UNVERIFIED" in role and "4 means competent" in role
    assert "English clients need English replies." not in role


def output_schema():
    return competence.combined(bound_schema(Quality, {"evidence": [{"id": "allowed", "speaker": "client"}]}))


def quality():
    return dict(outcome="helpful", issues=[], evidence_event_ids=["allowed"], improvement_hint="")


@pytest.mark.parametrize("change", ["foreign_evidence", "low_range", "high_range", "missing_scores", "extra"])
def test_combined_output_keeps_original_quality_evidence_and_score_bounds(change):
    value = dict(quality=quality(), scores=dict(VALUES))
    if change == "foreign_evidence":
        value["quality"]["evidence_event_ids"] = ["foreign"]
    elif change in {"low_range", "high_range"}:
        value["scores"]["listening"] = -1 if change == "low_range" else 6
    elif change == "missing_scores":
        value.pop("scores")
    else:
        value["module_admission"] = "admitted"
    with pytest.raises(ValidationError):
        output_schema().model_validate(value)


@pytest.mark.asyncio
@pytest.mark.parametrize("scored", [False, True])
async def test_first_call_combines_only_opt_in_keeps_coverage_usage_and_second_call_limit(monkeypatch, scored):
    calls, reservations, settlements = [], [], []
    dispatch = SimpleNamespace(score_competence=scored)
    async def reserve(*args):
        reservations.append(args)
    async def settle(*args):
        settlements.append(args)
    async def authorized(*_):
        return True
    async def run(schema, prompt, wire, auth):
        assert await auth() and len(reservations) == len(calls) + 1
        calls.append(prompt)
        return (schema(quality=quality(), scores=VALUES) if "quality" in schema.model_fields
                else schema(**quality())), {"input_tokens": 12, "output_tokens": 6}
    monkeypatch.setattr(review, "reserve_call", reserve)
    monkeypatch.setattr(review, "settle_known", settle)
    monkeypatch.setattr(review, "authorized", authorized)
    monkeypatch.setattr(review.evaluator, "run", run)
    accounted = review.AccountedLab("private-local-token", dispatch)
    result = await accounted.ask(Quality, "Synthetic independent Quality", {"evidence": []})
    assert isinstance(result, Quality) and result.outcome == "helpful"
    assert (accounted.scores is not None) == scored
    assert ("OWNER EVALUATION SCOPE" in calls[0]) == scored
    assert ("quality" in settlements[0][-1].model_fields) == scored
    await accounted.ask(Quality, "Synthetic second assessment", {})
    with pytest.raises(RunnerError) as error:
        await accounted.ask(Quality, "Synthetic forbidden third call", {})
    assert error.value.code == "call_limit" and accounted.calls == len(reservations) == len(settlements) == 2


@pytest.mark.asyncio
async def test_wrong_first_schema_has_zero_reservations(monkeypatch):
    async def forbidden(*_):
        pytest.fail("No provider reservation before the Quality schema")
    monkeypatch.setattr(review, "reserve_call", forbidden)
    accounted = review.AccountedLab("private-local-token", SimpleNamespace(score_competence=True))
    with pytest.raises(RunnerError) as error:
        await accounted.ask(competence.Scores, "Invalid first role", {})
    assert error.value.code == "competence_quality_required" and accounted.calls == 0
