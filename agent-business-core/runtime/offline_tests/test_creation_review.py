from copy import deepcopy

import pytest
from pydantic import ValidationError

from pinet_core.creation.review import (
    CHECK_KINDS,
    CoordinatorDecision,
    CriticReview,
    EvidenceReceipt,
    coordinator_prompt,
    critic_prompt,
    critic_sha256,
    draft_sha256,
    normalize_coordinator,
    normalize_critic,
    role_instruction_hash,
)
from pinet_core.tasks.codex_transport import RunnerError


@pytest.fixture
def draft():
    section = {
        "heading": "Pasirinkite vieną darbo užduotį",
        "body": "Komanda gali pradėti nuo pasikartojančios užduoties ir palyginti įprastą darbą su nauju būdu.",
        "items": [], "layout": "prose",
    }
    return {
        "business_name": "Komandos dirbtuvės", "tagline": "Praktinis mokymas mažų įmonių komandoms",
        "assistant_reply": "Parengiau verslo pasiūlymo juodraštį. Tikrus vykdymo duomenis dar reikia patvirtinti.",
        "business": {
            "customer": "Mažų įmonių komandos, norinčios sumažinti pasikartojantį darbą.",
            "paid_result": "Parengtas vienos darbo užduoties atlikimo būdas ir jo praktinis išbandymas.",
            "payer": "Mokantis įmonės vadovas arba už komandos mokymą atsakingas asmuo.",
            "offer": "Praktinės dirbtuvės vienai darbo užduočiai, pasirinktos pagal tikrą komandos poreikį.",
            "monetization": "Įmonė mokėtų už dirbtuves, tačiau kaina ir vykdymo sąnaudos dar nepatvirtintos.",
            "interest_test": "Surinkti tikras užklausas ir patikrinti, kokį rezultatą komanda norėtų pirkti.",
            "alternatives": ["Palyginti individualų konsultavimą ir nedidelės komandos mokymą."],
            "execution_steps": [
                "Pasirinkti konkrečią pasikartojančią darbo užduotį.",
                "Patikrinti mokytojo kompetenciją ir vykdymo galimybes.",
                "Apskaičiuoti išlaidas prieš siūlant mokamą vykdymą.",
            ],
            "expansion_criteria": ["Gauti tinkamų klientų užklausų.", "Patikrinti pajamas ir vykdymo sąnaudas."],
        },
        "confirmed_facts": [], "assumptions": ["Mažoms komandoms gali būti naudinga siaura dirbtuvių tema."],
        "open_questions": ["Kas galėtų patikimai vesti pirmąsias dirbtuves?"], "research": [],
        "tools": [{"area": area, "tool": "Turinio studija", "purpose": "Parengti ir patikrinti turinio juodraštį.",
                   "phase": "draft", "limitation": "Tikras publikavimas dar nepatikrintas."}
                  for area in ("Turinys", "Peržiūra")],
        "brand": {"accent": "indigo", "composition": "editorial",
                  "rationale": "Aiški teksto struktūra padeda palyginti praktinio mokymo galimybes."},
        "pages": [{"path": path, "title": title, "navigation_label": title,
                   "meta_description": "Praktinio komandos mokymo pasirinkimas pagal vieną konkrečią darbo užduotį.",
                   "intent": "Padėti pasirinkti tinkamą mokymo užduotį.",
                   "sections": [deepcopy(section), deepcopy(section)]}
                  for path, title in (("/", "Pradžia"), ("/pasirinkimas/", "Pasirinkimas"),
                                      ("/pasiruosimas/", "Pasiruošimas"))],
        "language_review": "Perskaičiau visą pateiktą tekstą ir patikrinau sakinių prasmę bei aiškumą.",
        "remaining_gates": ["Patikrinti tikrus kontaktus.", "Patikrinti visą svetainės publikavimą.",
                            "Atlikti faktinį SEO ir GEO auditą."],
    }


def report(draft, verdict="revise"):
    return {
        "schema_version": "creation.critic.v1", "role": "critic", "draft_sha256": draft_sha256(draft),
        "stage": "private_draft", "round_number": 1, "verdict": verdict,
        "summary": "Pasiūlymo kryptis aiški, tačiau būtina išskirti skirtingų puslapių paskirtį.",
        "findings": [] if verdict == "accept_draft" else [{
            "id": "f_1", "severity": "required", "area": "content",
            "explanation": "Pasirinkimo puslapis kartoja pradžios puslapio tekstą ir nepadeda palyginti variantų.",
            "correction": "Pasirinkimo puslapyje pateikti skirtingų mokymo būdų palyginimą pagal tikrą poreikį.",
            "evidence_refs": ["draft:/pages/1/sections/0/body"],
        }],
        "checks": [{"kind": kind, "status": "UNVERIFIED", "evidence_refs": [],
                    "summary": "Šios patikros faktinių stebėjimų kvitas dar nepateiktas."} for kind in CHECK_KINDS],
    }


def decision(draft, critic):
    return {
        "schema_version": "creation.coordinator.v1", "role": "coordinator",
        "draft_sha256": draft_sha256(draft), "critic_sha256": critic_sha256(critic),
        "stage": "private_draft", "round_number": 1, "decision": critic["verdict"],
        "summary": "Tęsiame šio privataus juodraščio rengimą pagal konkrečias kritiko pastabas.",
        "correction_ids": [item["id"] for item in critic["findings"] if item["severity"] != "suggestion"],
        "remaining_checks": [item["kind"] for item in critic["checks"] if item["status"] in ("FAIL", "UNVERIFIED")],
        "next_actions": ["Patikrinti tikrus duomenis ir užbaigti likusias nurodyto etapo patikras."],
        "full_f1_status": "UNVERIFIED", "launch_status": "UNVERIFIED",
    }


def receipt(draft, *, kind="language_quality", status="PASS", identifier="r_language"):
    return {"id": identifier, "draft_sha256": draft_sha256(draft), "kind": kind, "status": status,
            "observed": status in ("PASS", "FAIL"),
            "summary": "Atlikta tik nepriklausoma akivaizdaus kalbos nukrypimo patikra."}


def verify(value, draft, receipts=()):
    return normalize_critic(value, draft=draft, expected_stage="private_draft", expected_round=1, receipts=receipts)


def verify_decision(value, draft, critic, receipts=()):
    return normalize_coordinator(value, draft=draft, critic=critic, expected_stage="private_draft",
                                 expected_round=1, receipts=receipts)


def bind(value, evidence):
    check = next(item for item in value["checks"] if item["kind"] == evidence["kind"])
    check["status"] = evidence["status"]
    check["evidence_refs"].append(evidence["id"])


def test_actual_corrections_and_unknown_checks_survive_coordinator(draft):
    critic = verify(report(draft), draft)
    final = verify_decision(decision(draft, critic), draft, critic)
    assert final["decision"] == "revise" and final["correction_ids"] == ["f_1"]
    assert set(final["remaining_checks"]) == set(CHECK_KINDS)
    assert final["full_f1_status"] == final["launch_status"] == "UNVERIFIED"


def test_private_draft_acceptance_preserves_separate_real_world_gates(draft):
    critic = report(draft, "accept_draft")
    evidence = receipt(draft)
    bind(critic, evidence)
    critic = verify(critic, draft, [evidence])
    final = verify_decision(decision(draft, critic), draft, critic, [evidence])
    assert final["decision"] == "accept_draft"
    assert "language_quality" not in final["remaining_checks"] and "seo_geo" in final["remaining_checks"]
    assert final["launch_status"] == "UNVERIFIED"


def test_root_nine_receipt_projection_keeps_unobserved_stages_explicit(draft):
    critic = report(draft, "accept_draft")
    receipts = [receipt(draft, kind=kind, status="PASS" if kind == "language_quality" else "UNVERIFIED",
                        identifier="r_" + kind) for kind in CHECK_KINDS]
    for evidence in receipts:
        bind(critic, evidence)
    critic = verify(critic, draft, receipts)
    final = verify_decision(decision(draft, critic), draft, critic, receipts)
    assert len(final["remaining_checks"]) == 8 and final["decision"] == "accept_draft"
    assert all(item["status"] == "UNVERIFIED" for item in critic["checks"][1:])


@pytest.mark.parametrize("field,value", [("draft_sha256", "0" * 64), ("stage", "research"),
                                         ("round_number", 2)])
def test_wrong_draft_stage_round_rejected(draft, field, value):
    critic = report(draft)
    critic[field] = value
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft)


def test_draft_edit_invalidates_old_review_and_hash_is_stable_across_key_order(draft):
    original = report(draft)
    assert draft_sha256(draft) == draft_sha256(dict(reversed(list(draft.items()))))
    draft["pages"][1]["sections"][0]["body"] += " Naujas pakeitimas reikalauja naujos peržiūros."
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(original, draft)


@pytest.mark.parametrize("reference", ["draft:/pages/99/body", "draft:/pages/01/title", "draft:/missing",
                                      "draft:/confirmed_facts", "draft:/pages/0/title~2",
                                      "receipt:r_unknown", "https://invented.example/evidence"])
def test_unknown_empty_and_malformed_finding_references_rejected(draft, reference):
    critic = report(draft)
    critic["findings"][0]["evidence_refs"] = [reference]
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft)


def test_receipt_reference_is_bound_to_real_supplied_observation(draft):
    critic = report(draft)
    evidence = receipt(draft, status="FAIL")
    bind(critic, evidence)
    critic["findings"][0]["evidence_refs"] = ["receipt:r_language"]
    assert verify(critic, draft, [evidence])["checks"][0]["status"] == "FAIL"
    evidence["draft_sha256"] = "0" * 64
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft, [evidence])


@pytest.mark.parametrize("kind", CHECK_KINDS)
def test_no_observation_can_be_forged_as_pass_or_na(draft, kind):
    for status in ("PASS", "NA"):
        critic = report(draft)
        next(item for item in critic["checks"] if item["kind"] == kind)["status"] = status
        with pytest.raises(RunnerError, match="review_invalid"):
            verify(critic, draft)


def test_known_failed_observation_cannot_be_omitted_or_outvoted(draft):
    critic = report(draft)
    passed = receipt(draft, kind="source", identifier="r_source_pass")
    failed = receipt(draft, kind="source", status="FAIL", identifier="r_source_fail")
    bind(critic, passed)
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft, [passed, failed])
    bind(critic, failed)
    assert next(item for item in verify(critic, draft, [passed, failed])["checks"]
                if item["kind"] == "source")["status"] == "FAIL"


def test_wrong_kind_duplicate_receipts_and_unobserved_pass_rejected(draft):
    critic = report(draft)
    evidence = receipt(draft)
    bind(critic, evidence)
    wrong_kind = deepcopy(evidence)
    wrong_kind["kind"] = "browser"
    for receipts in ([wrong_kind], [evidence, evidence], [{**evidence, "observed": False}]):
        with pytest.raises(RunnerError, match="review_invalid"):
            verify(critic, draft, receipts)


@pytest.mark.parametrize("severity,verdict", [("required", "accept_draft"), ("blocker", "revise"),
                                            ("blocker", "accept_draft"), ("suggestion", "blocked")])
def test_acceptance_cannot_contradict_actionable_findings(draft, severity, verdict):
    critic = report(draft)
    critic["verdict"] = verdict
    critic["findings"][0]["severity"] = severity
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft)


@pytest.mark.parametrize("kind", CHECK_KINDS)
def test_any_known_failure_blocks_draft_acceptance(draft, kind):
    critic = report(draft, "accept_draft")
    evidence = receipt(draft, kind=kind, status="FAIL")
    bind(critic, evidence)
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft, [evidence])


@pytest.mark.parametrize("field,value", [
    ("critic_sha256", "0" * 64), ("draft_sha256", "0" * 64), ("correction_ids", []),
    ("remaining_checks", []), ("decision", "accept_draft"), ("launch_status", "PASS"),
    ("full_f1_status", "PASS"), ("round_number", 2),
])
def test_coordinator_cannot_hide_disagreement_or_promote_launch(draft, field, value):
    critic = verify(report(draft), draft)
    final = decision(draft, critic)
    final[field] = value
    with pytest.raises(RunnerError, match="review_invalid"):
        verify_decision(final, draft, critic)


def test_blocker_is_preserved_as_blocked_decision(draft):
    critic = report(draft)
    critic["verdict"] = "blocked"
    critic["findings"][0]["severity"] = "blocker"
    critic = verify(critic, draft)
    assert verify_decision(decision(draft, critic), draft, critic)["decision"] == "blocked"


def test_known_na_requires_a_caller_applicability_receipt(draft):
    critic = report(draft)
    evidence = receipt(draft, kind="demand", status="NA", identifier="r_no_demand_stage")
    bind(critic, evidence)
    critic = verify(critic, draft, [evidence])
    assert "demand" not in verify_decision(decision(draft, critic), draft, critic, [evidence])["remaining_checks"]


def test_foreign_language_in_critic_or_coordinator_is_rejected(draft):
    critic = report(draft)
    critic["summary"] = "Ennen julkistamista tarvitaan tosiasialliset yhteystiedot ja toimiva kyselyiden vastaanotto."
    with pytest.raises(RunnerError, match="language_quality_failed"):
        verify(critic, draft)
    critic = verify(report(draft), draft)
    final = decision(draft, critic)
    final["next_actions"] = ["Kliento įrankių хэрэгцээ dar nepatikrintas."]
    with pytest.raises(RunnerError, match="language_quality_failed"):
        verify_decision(final, draft, critic)


def test_extra_reasoning_tools_and_unbounded_output_are_rejected(draft):
    critic = report(draft)
    for update in ({"analysis": "private reasoning"}, {"tools": ["shell"]},
                   {"summary": "x" * 901}, {"round_number": 6}, {"round_number": True}):
        with pytest.raises(RunnerError, match="review_invalid"):
            verify({**critic, **update}, draft)
    for model in (CriticReview, CoordinatorDecision, EvidenceReceipt):
        assert model.model_json_schema()["additionalProperties"] is False
    with pytest.raises(ValidationError):
        EvidenceReceipt.model_validate({**receipt(draft), "summary": "\n" * 12})


def test_duplicate_findings_and_missing_required_check_rejected(draft):
    critic = report(draft)
    critic["findings"].append(deepcopy(critic["findings"][0]))
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft)
    critic = report(draft)
    critic["checks"][1] = deepcopy(critic["checks"][0])
    with pytest.raises(RunnerError, match="review_invalid"):
        verify(critic, draft)


def test_prompts_use_only_bounded_current_context_and_validate_before_provider(draft):
    evidence = receipt(draft)
    critic = report(draft)
    bind(critic, evidence)
    critic = verify(critic, draft, [evidence])
    first = critic_prompt(draft=draft, stage="private_draft", round_number=1, receipts=[evidence])
    second = coordinator_prompt(draft=draft, critic=critic, stage="private_draft", round_number=1,
                                receipts=[evidence])
    assert "NEPATIKIMI_DUOMENYS_JSON" in first and "Nenaudok\njokių įrankių" in first
    assert draft_sha256(draft) in first and critic_sha256(critic) in second
    assert len(first.encode()) < 15000 and len(second.encode()) < 21000
    assert role_instruction_hash("critic") != role_instruction_hash("coordinator")
    assert len(role_instruction_hash("critic")) == 64
    with pytest.raises(RunnerError, match="review_invalid"):
        critic_prompt(draft=draft, stage="unbounded_tool", round_number=1)
    with pytest.raises(RunnerError, match="review_invalid"):
        role_instruction_hash("creator_override")
