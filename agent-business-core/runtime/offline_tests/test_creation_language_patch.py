"""Exact prose correction regressions; synthetic source candidates, no provider/DB."""

import hashlib
import unicodedata
from copy import deepcopy
from types import SimpleNamespace

import pytest
from test_creation_content_plan import planned
from test_creation_review import decision, receipt, report
from test_creation_review import draft as draft_fixture

from pinet_core.creation import language_patch, review, team
from pinet_core.creation.renderer import language_screening, normalize_creator
from pinet_core.creation.review import CHECK_KINDS, normalize_critic
from pinet_core.tasks.codex_transport import RunnerError

draft = draft_fixture
FIELD = "draft:/research/6/finding"
FIXED = "Dalis mokymų skirta įmonių komandoms; kainos ir mūsų vykdymo galimybės dar nepatvirtintos."


@pytest.fixture
def candidate(draft):
    value = planned(draft)
    value["research"] = [{"title": "Sintetinis mokymo šaltinis", "url": "https://example.org/tyrimas/" + str(i),
        "market": "Lietuva", "finding": "Mokymų paskirtį ir tikrą vykdymo galimybę dar būtina patikrinti.",
        "is_counterevidence": False} for i in range(7)]
    value["research"][6]["finding"] = (
        "Osa mokymų skirta įmonių komandoms; kainos ir mūsų vykdymo galimybės dar nepatvirtintos.")
    return normalize_creator(value)


def critic(candidate, fields=(FIELD,), *, extra_findings=()):
    value = report(candidate)
    value["findings"][0].update(area="language", explanation="Šiame sakinyje liko svetimos kalbos žodis.",
        correction="Pakeisk svetimą žodį lietuvišku atitikmeniu, išlaikydamas visą sakinio prasmę.",
        evidence_refs=list(fields))
    value["findings"].extend(deepcopy(extra_findings))
    observed = [receipt(candidate, kind=kind, status="PASS" if kind == "language_quality" else "UNVERIFIED",
                        identifier="r_" + kind) for kind in CHECK_KINDS]
    value["checks"] = [{"kind": item["kind"], "status": item["status"], "evidence_refs": [item["id"]],
                        "summary": item["summary"]} for item in observed]
    return normalize_critic(value, draft=candidate, expected_stage="private_draft", expected_round=1,
                            receipts=observed)


def response(bound, values=None):
    values = values or {FIELD: FIXED}
    return {"candidate_sha256": bound["candidate_sha256"], "critic_sha256": bound["critic_sha256"],
            "edits": [{"field": field, "value": values[field]} for field in bound["allowed_refs"]]}


def test_actual_like_tiny_word_patch_keeps_every_unrelated_field_exact(candidate):
    original = deepcopy(candidate)
    verified = critic(candidate, (FIELD, "receipt:r_language_quality"))
    bound = language_patch.context(candidate, verified)
    assert bound["allowed_refs"] == [FIELD] and bound["semantic_acceptance"] == "UNVERIFIED"
    assert bound["targets"][0]["value"].startswith("Osa ")
    assert any(item["field"] == "url" for item in bound["targets"][0]["semantic_context"])
    result = language_patch.apply(candidate, verified, response(bound))
    assert result["research"][6]["finding"] == FIXED and language_screening(result)["status"] == "PASS"
    result["research"][6]["finding"] = original["research"][6]["finding"]
    assert result == original == candidate  # No assumption, plan, URL or self-review reroll.


@pytest.mark.parametrize("field", ["primary_topic", "reason"])
def test_mixed_language_and_content_leaf_repairs_preserve_every_unrelated_value(candidate, field):
    reference = "draft:/content_plan/0/" + field
    extra = deepcopy(report(candidate)["findings"][0])
    extra.update(id="f_2", area="content", explanation="Šios turinio užduoties aprašas nepilnas.",
                 correction="Užbaikite šio lauko tekstą, išsaugodami esamą temos prasmę.",
                 evidence_refs=[reference])
    verified = critic(candidate, extra_findings=[extra])
    bound = language_patch.context(candidate, verified)
    assert bound is not None and bound["scope"] == "private_prose_edits_only"
    assert bound["allowed_refs"] == [FIELD, reference]
    fixed_content = "Vienos darbo užduoties pasirinkimas ir saugus mokymo pavyzdžio paruošimas."
    values = {FIELD: FIXED, reference: fixed_content}
    original = deepcopy(candidate)
    repaired = language_patch.apply(candidate, verified, response(bound, values))
    assert repaired["research"][6]["finding"] == FIXED
    assert repaired["content_plan"][0][field] == fixed_content
    repaired["research"][6]["finding"] = original["research"][6]["finding"]
    repaired["content_plan"][0][field] = original["content_plan"][0][field]
    assert repaired == candidate == original
    assert bound["semantic_acceptance"] == "UNVERIFIED"


def test_content_only_prose_repair_still_requires_every_exact_target(candidate):
    verified = critic(candidate)
    verified["findings"][0].update(area="content", evidence_refs=["draft:/pages/1/sections/1/body"])
    verified["draft_sha256"] = language_patch.canonical_sha256(candidate)
    bound = language_patch.context(candidate, verified)
    assert bound is not None and bound["scope"] == "private_prose_edits_only"
    assert bound["allowed_refs"] == ["draft:/pages/1/sections/1/body"]
    incomplete = {"candidate_sha256": bound["candidate_sha256"], "critic_sha256": bound["critic_sha256"], "edits": []}
    with pytest.raises(RunnerError, match="output_invalid"):
        language_patch.apply(candidate, verified, incomplete)


@pytest.mark.parametrize("area", ["business", "research", "design", "seo_geo", "contact_delivery",
                                  "publication", "launch", "demand"])
def test_substantive_nonprose_areas_keep_the_full_creator_path(candidate, area):
    verified = critic(candidate)
    verified["findings"][0]["area"] = area
    assert language_patch.context(candidate, verified) is None


@pytest.mark.parametrize("reference", ["draft:/content_plan/0", "draft:/content_plan/0/path",
    "draft:/content_plan/0/source_urls/0", "draft:/pages/1/sections", "draft:/research/0/url"])
def test_content_area_does_not_expand_allowed_fields_or_bypass_full_review(candidate, reference):
    verified = critic(candidate)
    verified["findings"][0].update(area="content", evidence_refs=[reference])
    assert language_patch.context(candidate, verified) is None


@pytest.mark.parametrize("nine_fields", [False, True])
async def test_team_uses_exact_mixed_patch_then_independent_second_review(candidate, monkeypatch, nine_fields):
    calls, reservations, completions = [], [], []
    original = deepcopy(candidate)
    target = "draft:/content_plan/0/primary_topic"
    fixed_topic = "Vienos darbo užduoties pasirinkimas ir saugus mokymo pavyzdžio paruošimas."
    extra_refs = [f"draft:/research/{i}/finding" for i in range(6)] + ["draft:/business/interest_test"]
    expected_refs = [FIELD, target] + (extra_refs if nine_fields else [])
    values = {FIELD: FIXED, target: fixed_topic}
    if nine_fields:
        values.update({ref: language_patch._leaf(candidate, ref)[2] for ref in extra_refs})
    monkeypatch.setattr(team, "settings", lambda: SimpleNamespace(creation_runner_seconds=30))

    async def reserve(claimed, role, round_number, **flags):
        reservations.append((role, round_number, flags))
        return f"synthetic_attempt_{len(reservations)}"

    async def finish(claimed, attempt_id, state, summary, payload):
        completions.append((attempt_id, state, payload))

    async def authorized():
        return True

    async def runner(data, still_authorized, *, role, seconds):
        calls.append(role)
        if role == "creator":
            if calls.count(role) == 1:
                value = deepcopy(candidate)
            else:
                assert data["language_repair"] is True and data["permitted_web_actions"] == 0
                assert "current_draft" not in data and "critic_feedback" not in data
                bound = data["language_patch_context"]
                assert bound["scope"] == "private_prose_edits_only" and bound["allowed_refs"] == expected_refs
                value = response(bound, values)
        elif role == "critic":
            value = report(data["draft"], "revise" if calls.count(role) == 1 else "accept_draft")
            if value["findings"]:
                value["findings"][0].update(area="language", evidence_refs=[FIELD])
                extra = deepcopy(value["findings"][0])
                extra.update(id="f_2", area="content", evidence_refs=[target])
                value["findings"].append(extra)
                if nine_fields:
                    for index, refs in enumerate((extra_refs[:6], extra_refs[6:]), start=3):
                        extra = deepcopy(value["findings"][0])
                        extra.update(id=f"f_{index}", evidence_refs=refs)
                        value["findings"].append(extra)
            value["round_number"] = data["round_number"]
            value["checks"] = [{"kind": item["kind"], "status": item["status"],
                "evidence_refs": [item["id"]], "summary": item["summary"]} for item in data["receipts"]]
        else:
            value = decision(data["draft"], data["critic"])
            value["round_number"] = data["round_number"]
            value["next_actions"] = review.coordinator_actions(data["critic"])[:5]
        return value, {"usage": {"input_tokens": 1, "output_tokens": 1}, "web_search_count": 0}

    monkeypatch.setattr(team, "reserve", reserve)
    monkeypatch.setattr(team, "finish", finish)
    result, evidence = await team.run({"context": {"permitted_web_actions": 6}}, authorized, role_runner=runner)
    assert calls == ["creator", "critic", "coordinator"] * 2 and len(completions) == 6
    assert all(state == "succeeded" for _, state, _ in completions)
    assert reservations[3][2]["language_repair"] is True
    assert evidence["critic"]["verdict"] == "accept_draft" and evidence["coordinator"]["decision"] == "accept_draft"
    assert result["research"][6]["finding"] == FIXED and result["content_plan"][0]["primary_topic"] == fixed_topic
    result["research"][6]["finding"] = original["research"][6]["finding"]
    result["content_plan"][0]["primary_topic"] = original["content_plan"][0]["primary_topic"]
    assert result == candidate == original


def test_compact_exact_canonical_instruction_profile_and_schema(candidate):
    text, digest = language_patch.instructions()
    assert language_patch.LANGUAGE_REFERENCE in text and "Jokių įrankių" in text
    assert "Nenaudok vietaženklių" in text
    assert len(text.encode()) < 14000 and digest == hashlib.sha256(text.encode()).hexdigest()
    bound = language_patch.context(candidate, critic(candidate))
    schema = language_patch.output_schema(bound)
    assert schema["additionalProperties"] is False
    assert schema["properties"]["candidate_sha256"]["const"] == bound["candidate_sha256"]
    assert schema["properties"]["critic_sha256"]["const"] == bound["critic_sha256"]
    edits = schema["properties"]["edits"]
    assert edits["minItems"] == edits["maxItems"] == 1
    assert edits["items"]["properties"]["field"]["enum"] == [FIELD]


@pytest.mark.parametrize("defect", ["stale_draft", "stale_critic", "unknown", "duplicate", "missing",
                                    "extra", "non_string", "empty", "control", "decomposed", "too_long"])
def test_invalid_response_rejected_without_changing_original(candidate, defect):
    original = deepcopy(candidate)
    verified = critic(candidate)
    bound = language_patch.context(candidate, verified)
    output = response(bound)
    if defect == "stale_draft":
        output["candidate_sha256"] = "0" * 64
    elif defect == "stale_critic":
        output["critic_sha256"] = "0" * 64
    elif defect == "unknown":
        output["edits"][0]["field"] = "draft:/assumptions/0"
    elif defect == "duplicate":
        output["edits"].append(deepcopy(output["edits"][0]))
    elif defect == "missing":
        output["edits"] = []
    elif defect == "extra":
        output["business"] = deepcopy(candidate["business"])
    else:
        output["edits"][0]["value"] = {"non_string": 5, "empty": " ", "control": "Tekstas\x00klaida",
            "decomposed": unicodedata.normalize("NFD", FIXED), "too_long": "a" * 2501}[defect]
    with pytest.raises(RunnerError, match="output_invalid"):
        language_patch.apply(candidate, verified, output)
    assert candidate == original


@pytest.mark.parametrize("target", ["draft:/research/0/url", "draft:/research/0/title",
    "draft:/research/0/market", "draft:/research/0/is_counterevidence", "draft:/tools/0/tool",
    "draft:/tools/0/phase", "draft:/business_name", "draft:/brand/accent", "draft:/pages/0/path",
    "draft:/content_plan/0/source_queries/0", "draft:/content_plan/0/priority",
    "draft:/content_plan/0/pillar_path", "draft:/research/6", "draft:/research/7/finding",
    "draft:/research/06/finding", "draft:/business/unknown", "draft:/research/6/finding/extra",
    "receipt:r_language_quality"])
def test_unsupported_unknown_nonstring_or_unsafe_targets_fall_back(candidate, target):
    # A valid report shape is insufficient: caller verified evidence + actual
    # whitelisted STRING leaves are both required before patching.
    value = report(candidate)
    value["findings"][0].update(area="language", evidence_refs=[target])
    assert language_patch.context(candidate, value) is None


@pytest.mark.parametrize("defect", ["content", "blocked", "stale", "no_required", "other_stage", "other_fail"])
def test_mixed_substantive_or_inapplicable_critic_falls_back(candidate, defect):
    value = critic(candidate)
    if defect == "content":
        extra = deepcopy(value["findings"][0])
        extra.update(id="f_2", area="business", evidence_refs=["draft:/business/offer"])
        value["findings"].append(extra)
    elif defect == "blocked":
        value["verdict"], value["findings"][0]["severity"] = "blocked", "blocker"
    elif defect == "stale":
        value["draft_sha256"] = "0" * 64
    elif defect == "no_required":
        value["verdict"], value["findings"] = "accept_draft", []
    elif defect == "other_stage":
        value["stage"] = "final_review"
    elif defect == "other_fail":
        value["checks"][1]["status"] = "FAIL"
    assert language_patch.context(candidate, value) is None


def test_each_required_finding_needs_string_target_and_targets_cover_union(candidate):
    first = critic(candidate)
    second = deepcopy(first["findings"][0])
    second.update(id="f_2", evidence_refs=["draft:/assumptions/0", "receipt:r_language_quality"])
    first["findings"].append(second)
    bound = language_patch.context(candidate, first)
    assert bound["allowed_refs"] == [FIELD, "draft:/assumptions/0"]
    output = response(bound, {FIELD: FIXED, "draft:/assumptions/0": candidate["assumptions"][0]})
    assert language_patch.apply(candidate, first, output)["research"][6]["finding"] == FIXED
    output["edits"].pop()
    with pytest.raises(RunnerError):
        language_patch.apply(candidate, first, output)
    second["evidence_refs"] = ["receipt:r_language_quality"]
    first["findings"][-1] = second
    assert language_patch.context(candidate, first) is None


def test_shared_target_merges_corrections_but_schema_requires_one_edit(candidate):
    verified = critic(candidate)
    duplicate_target = deepcopy(verified["findings"][0])
    duplicate_target["id"] = "f_2"
    verified["findings"].append(duplicate_target)
    bound = language_patch.context(candidate, verified)
    assert bound["allowed_refs"] == [FIELD] and len(bound["targets"][0]["corrections"]) == 2
    assert language_patch.apply(candidate, verified, response(bound))["research"][6]["finding"] == FIXED


def test_changed_candidate_or_critic_rejects_prior_patch(candidate):
    verified = critic(candidate)
    bound = language_patch.context(candidate, verified)
    output = response(bound)
    changed = deepcopy(candidate)
    changed["assumptions"][0] += " Tai atskira nepatvirtinta prielaida."
    with pytest.raises(RunnerError):
        language_patch.apply(changed, critic(changed), output)
    changed_critic = deepcopy(verified)
    changed_critic["findings"][0]["correction"] += " Dar kartą perskaityk visą sakinį."
    with pytest.raises(RunnerError):
        language_patch.apply(candidate, changed_critic, output)


def test_only_supported_final_field_bounds_can_pass_and_old_unrelated_prose_is_untouched(candidate):
    verified = critic(candidate, ("draft:/pages/0/navigation_label",))
    bound = language_patch.context(candidate, verified)
    output = response(bound, {"draft:/pages/0/navigation_label": "Taisyklingas pavadinimas " * 4})
    with pytest.raises(RunnerError):
        language_patch.apply(candidate, verified, output)  # existing field bound50, not generic max2500
    assert candidate["research"][6]["finding"].startswith("Osa ")


def test_nine_mandatory_fields_are_exact_and_omission_is_rejected(candidate):
    original = deepcopy(candidate)
    value = critic(candidate)
    refs = [f"draft:/research/{i}/finding" for i in range(7)]
    refs += ["draft:/assumptions/0", "draft:/business/offer"]
    value["findings"][0]["evidence_refs"] = refs[:6]
    extra = deepcopy(value["findings"][0])
    extra.update(id="f_2", evidence_refs=refs[6:])
    value["findings"].append(extra)
    bound = language_patch.context(candidate, value)
    assert bound is not None and bound["allowed_refs"] == refs
    schema = language_patch.output_schema(bound)
    assert schema["properties"]["edits"]["minItems"] == schema["properties"]["edits"]["maxItems"] == 9
    values = {ref: language_patch._leaf(candidate, ref)[2] for ref in refs}
    values[FIELD] = FIXED
    output = response(bound, values)
    repaired = language_patch.apply(candidate, value, output)
    assert repaired["research"][6]["finding"] == FIXED
    repaired["research"][6]["finding"] = original["research"][6]["finding"]
    assert repaired == candidate == original
    output["edits"].pop()
    with pytest.raises(RunnerError, match="output_invalid"):
        language_patch.apply(candidate, value, output)
    assert candidate == original


def test_noncanonical_original_still_falls_back(candidate):
    raw = deepcopy(candidate)
    raw["pages"][1]["path"] = raw["pages"][1]["path"].rstrip("/")
    assert language_patch.context(raw, critic(normalize_creator(raw))) is None


def test_context_byte_budget_still_falls_back_without_mutating_original(candidate):
    original = deepcopy(candidate)
    value = critic(candidate)
    refs = [f"draft:/research/{i}/finding" for i in range(6)]
    template = deepcopy(value["findings"][0])
    value["findings"] = [{**deepcopy(template), "id": f"f_{i + 1}", "evidence_refs": refs,
        "explanation": "Taisyklingas sakinys. " * 30, "correction": "Išsaugok prasmę. " * 40} for i in range(12)]
    review.CriticReview.model_validate(value)  # Valid protocol; repeated correction context is too large.
    assert language_patch.context(candidate, value) is None
    assert candidate == original


def test_patch_is_not_a_language_or_semantics_acceptance_gate(candidate):
    verified = critic(candidate)
    bound = language_patch.context(candidate, verified)
    foreign = "Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto."
    result = language_patch.apply(candidate, verified, response(bound, {FIELD: foreign}))
    with pytest.raises(RunnerError, match="language_quality_failed"):
        language_screening(result)  # Parent must keep the independent hard gate and new critic/coordinator.


@pytest.mark.parametrize("kind", ["missing", "empty", "oversized", "invalid_utf8"])
def test_unavailable_canonical_profile_fails_closed(tmp_path, monkeypatch, kind):
    path = tmp_path / language_patch.LANGUAGE_REFERENCE
    path.parent.mkdir(parents=True)
    if kind != "missing":
        path.write_bytes({"empty": b" ", "oversized": b"a" * 20001, "invalid_utf8": b"\xff"}[kind])
    monkeypatch.setattr(language_patch, "ROOT", tmp_path)
    with pytest.raises(RunnerError, match="instructions_unavailable"):
        language_patch.instructions()


def test_invalid_schema_context_fails_closed(candidate):
    bound = language_patch.context(candidate, critic(candidate))
    for invalid in (None, {}, {**bound, "allowed_refs": [5]}, {**bound, "allowed_refs": [FIELD, FIELD]}):
        with pytest.raises(RunnerError, match="output_invalid"):
            language_patch.output_schema(invalid)
