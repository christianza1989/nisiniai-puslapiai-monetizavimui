"""Explicit owner-paused private language policy, without provider or database."""
from copy import deepcopy

import pytest
from test_content_work_review import coordinator as native_decision
from test_content_work_review import critic as native_critic
from test_content_work_review import output as native_output
from test_creation_content_plan import planned
from test_creation_review import decision, report
from test_creation_review import draft as draft_fixture

from pinet_core.config import Settings, settings
from pinet_core.content_work import adapter as native_adapter
from pinet_core.content_work import review as native
from pinet_core.creation import adapter, language_mode, renderer, review, team
from pinet_core.tasks.codex_transport import RunnerError

draft = draft_fixture
FOREIGN = "Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto."


@pytest.fixture
def paused(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "creation_language_review_enabled", False)
    monkeypatch.setattr(cfg, "control_mode", "local")
    monkeypatch.setattr(cfg, "environment", "test-language-paused")
    return cfg


def test_default_and_nonlocal_modes_keep_language_gate(paused, monkeypatch):
    assert Settings(_env_file=None).creation_language_review_enabled is True
    assert language_mode.mode() == "paused_local_pilot"
    monkeypatch.setattr(paused, "environment", "production")
    assert language_mode.mode() == "required"
    monkeypatch.setattr(paused, "environment", "test-language-paused")
    monkeypatch.setattr(paused, "control_mode", "production")
    assert language_mode.mode() == "required"


def test_private_receipt_requires_explicit_mode_and_never_claims_pass(paused, draft, monkeypatch):
    value = renderer.normalize_creator(planned(draft))
    value["assumptions"][0] = FOREIGN
    monkeypatch.setattr(renderer, "screen_language", lambda *a, **k: pytest.fail("Language detector must not run"))
    checks, observation = team.observed_checks(value)
    first = checks[0]
    assert first["status"] == observation["status"] == "UNVERIFIED" and first["observed"] is False
    assert language_mode.receipt_satisfies(first, mode="paused_local_pilot", digest=review.draft_sha256(value))
    assert not language_mode.receipt_satisfies(first, mode="required")
    assert not language_mode.receipt_satisfies({**first, "status": "FAIL"}, mode="paused_local_pilot")
    assert not language_mode.receipt_satisfies({**first, "observed": True}, mode="paused_local_pilot")
    assert not language_mode.receipt_satisfies(first, mode="paused_local_pilot", digest="a" * 64)
    projection, _, _ = review._review_projection(value)
    assert projection == value


def test_mode_changes_bound_prompts_schema_hashes_and_preserves_other_checks(paused, draft, monkeypatch):
    value = renderer.normalize_creator(planned(draft))
    checks, _ = team.observed_checks(value)
    context = {"draft": value, "stage": "private_draft", "round_number": 1, "receipts": checks}
    schema = review.output_schema("critic", context)
    assert "language" not in schema["$defs"]["BusinessFinding"]["properties"]["area"]["enum"]
    assert "Kalbos" in review.critic_prompt(draft=value, stage="private_draft", round_number=1, receipts=checks)
    accepted = report(value, "accept_draft")
    accepted["checks"] = [{"kind": c["kind"], "status": c["status"], "evidence_refs": [c["id"]],
                           "summary": c["summary"]} for c in checks]
    assert review.normalize_critic(accepted, draft=value, expected_stage="private_draft", expected_round=1,
                                  receipts=checks)["verdict"] == "accept_draft"
    # Pausing language does not authorize source PASS or waive a known source FAIL.
    bad = deepcopy(accepted)
    bad["checks"][1]["status"] = "PASS"
    with pytest.raises(RunnerError):
        review.normalize_critic(bad, draft=value, expected_stage="private_draft", expected_round=1, receipts=checks)
    failed = deepcopy(checks)
    failed[1].update(status="FAIL", observed=True)
    bad["checks"][1]["status"] = "FAIL"
    with pytest.raises(RunnerError):
        review.normalize_critic(bad, draft=value, expected_stage="private_draft", expected_round=1, receipts=failed)
    paused_hash = adapter.team_instruction_hash()
    monkeypatch.setattr(paused, "creation_language_review_enabled", True)
    assert adapter.team_instruction_hash() != paused_hash
    assert "language" in review.output_schema("critic", context)["$defs"]["BusinessFinding"]["properties"]["area"]["enum"]


def test_native_guide_keeps_full_text_and_honest_unverified_receipt(paused, monkeypatch):
    value = native_output()
    value["body"][0]["content"][0]["text"] = FOREIGN
    monkeypatch.setattr(renderer, "screen_language", lambda *a, **k: pytest.fail("Language detector must not run"))
    original = deepcopy(value)
    receipts = native.observations(value)
    assert receipts[0]["status"] == "UNVERIFIED" and receipts[0]["observed"] is False
    projected, _, omitted, _ = native.projection(value)
    assert projected == value == original and omitted == []
    accepted = native.critic(native_critic(value, receipts), output=value, round_number=1, receipts=receipts)
    assert native.coordinator(native_decision(value, accepted), output=value, critic_value=accepted,
                              round_number=1, receipts=receipts)["decision"] == "accept_draft"
    prepared = {"pageData": {"planningBrief": {}}, "siteData": {}, "instructions": "Synthetic native instructions",
                "instructionHash": "b" * 64}
    context = native.context(value, 1, receipts, prepared)
    assert "language" not in native.output_schema("critic", context)["$defs"]["Finding"]["properties"]["area"]["enum"]
    first_hash = native_adapter.instruction_hash("creator", prepared)
    monkeypatch.setattr(paused, "creation_language_review_enabled", True)
    assert first_hash != native_adapter.instruction_hash("creator", prepared)


async def test_paused_business_uses_three_roles_without_language_repair(paused, draft, monkeypatch):
    value = renderer.normalize_creator(planned(draft))
    value["assumptions"][0] = FOREIGN
    calls, events = [], []

    async def reserve(*args, **kwargs):
        return "synthetic-attempt"

    async def finish(*args):
        events.append(args[-1])

    async def authorized():
        return True

    async def runner(data, authorized, *, role, seconds):
        calls.append(role)
        assert not data.get("language_repair")
        if role == "creator":
            result = deepcopy(value)
        elif role == "critic":
            result = report(data["draft"], "accept_draft")
            result["checks"] = [{"kind": r["kind"], "status": r["status"], "evidence_refs": [r["id"]],
                                 "summary": r["summary"]} for r in data["receipts"]]
        else:
            result = decision(data["draft"], data["critic"])
            result["next_actions"] = review.coordinator_actions(data["critic"])[:5]
        return result, {"usage": {"input_tokens": 1, "output_tokens": 1}, "web_search_count": 0}

    monkeypatch.setattr(team, "reserve", reserve)
    monkeypatch.setattr(team, "finish", finish)
    result, evidence = await team.run({"context": {"permitted_web_actions": 0}}, authorized, role_runner=runner)
    assert calls == ["creator", "critic", "coordinator"] and result == value
    assert evidence["language_review_mode"] == "paused_local_pilot"
    assert all(event["language_review_mode"] == "paused_local_pilot" for event in events)
    assert evidence["language_screening"]["status"] == "UNVERIFIED"
