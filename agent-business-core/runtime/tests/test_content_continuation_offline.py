"""Exact retained native feedback fences; no DB, writer, provider or acceptance."""
import hashlib
import json
from copy import deepcopy
from types import SimpleNamespace as Row

import pytest

from pinet_core.config import settings
from pinet_core.content_work import adapter, continuation, review, studio
from pinet_core.creation import language_mode


@pytest.fixture
def history(monkeypatch):
    monkeypatch.setattr(settings(), "creation_language_review_enabled", False)
    identity = {key: key + "-owned" for key in continuation.IDENTITY}
    identity.update(accepted_revision=2, source_hash="a" * 64)
    prepared = {key: str(i) * 64 for i, key in enumerate(studio.BINDING_KEYS, 1)}
    prepared["instructions"] = "Parenkite privatų gido juodraštį pagal pateiktas gaires."
    prior = Row(id="prior", sequence=1, status="failed", failure_code="review_limit", result=None,
                run_id="old-run", finished_at=True, source_revision="b" * 40, binding=deepcopy(prepared), **identity)
    job = Row(id="current", sequence=2, source_revision="c" * 40, **identity)
    output = {"title": "Kaip pasirinkti mažą komandos bandymą", "description": "Pasirinkite aiškią pasikartojančią užduotį ir susitarkite, kaip palyginsite jos rezultatą.",
        "intent": "Padėti komandai pasirinkti vieną aiškią užduotį bandymui.",
        "body": [{"type": "richParagraph", "content": [{"type": "text", "text":
            "Pasirinkite pasikartojančią užduotį ir prieš bandymą užrašykite jos sąlygas."}]}],
        "factChecks": ["Tikros paslaugos vykdymo sąlygos dar nepatvirtintos."]}
    digest = review.shared.canonical_sha256(output)
    receipts = review.observations(output)
    report = {"schema_version": "creation.critic.v1", "role": "critic", "draft_sha256": digest,
        "stage": "content", "round_number": 2, "verdict": "revise",
        "summary": "Trūksta aiškios užduoties pasirinkimo taisyklės.",
        "findings": [{"id": "f_1", "severity": "required", "area": "content",
            "explanation": "Skaitytojui reikia aiškios galutinės sprendimo taisyklės.",
            "correction": "Nurodykite, kada bandyti ir kada pirmiausia išspręsti nežinomus faktus.",
            "evidence_refs": ["draft:/body/0/content/0/text"]}],
        "checks": [{"kind": r["kind"], "status": r["status"], "evidence_refs": [r["id"]], "summary": r["summary"]} for r in receipts]}
    report = review.critic(report, output=output, round_number=2, receipts=receipts)
    decision = {"schema_version": "creation.coordinator.v1", "role": "coordinator", "draft_sha256": digest,
        "critic_sha256": review.shared.canonical_sha256(report), "stage": "content", "round_number": 2,
        "decision": "revise", "summary": "Kūrėjas turi papildyti sprendimo taisyklę, o viešos patikros dar neatliktos.",
        "correction_ids": ["f_1"], "remaining_checks": list(review.shared.CHECK_KINDS),
        "next_actions": ["Papildyti aiškią užduoties pasirinkimo taisyklę."],
        "full_f1_status": "UNVERIFIED", "launch_status": "UNVERIFIED"}
    owned = {key: identity[key] for key in (*continuation.IDENTITY[:4], "creation_id")}
    attempts = [Row(id=role, job_id=prior.id, sequence=i+4, role=role, round_number=2, stage="content",
                    model="gpt-6-luna", run_id=prior.run_id, source_revision=prior.source_revision,
                    instruction_hash=adapter.instruction_hash(role, prepared), **owned)
                for i, role in enumerate(continuation.ROLES)]
    payloads = [{"candidate": output, "checks": receipts}, {"critic": report}, {"coordinator": decision}]
    events = [Row(attempt_id=a.id, job_id=prior.id, sequence=i*2+2, state="succeeded",
                  payload={"language_review_mode": language_mode.mode(), "output_sha256": digest, **payload}, **owned)
              for i, (a, payload) in enumerate(zip(attempts, payloads))]
    return job, prior, attempts, events, prepared


def test_exact_retained_feedback_is_only_projected_input_even_when_source_commit_differs(history):
    previous, feedback = continuation.seed(*history)
    assert previous == history[3][0].payload["candidate"]
    assert feedback == {"critic": history[3][1].payload["critic"], "coordinator": history[3][2].payload["coordinator"]}
    assert feedback["coordinator"]["decision"] == "revise"
    expected = adapter.creator_policy(history[4]) + "\nNEPATIKIMI_PATAISU_DUOMENYS_JSON\n" + json.dumps({
        "critic_feedback": feedback, "previous_candidate": previous}, ensure_ascii=False)
    assert adapter.creator_prompt(history[4], previous, feedback) == expected


@pytest.mark.parametrize("role", ["creator", "critic"])
def test_precalibration_instruction_hash_cannot_reuse_old_final_roles(history, role):
    prepared = history[4]
    old_policy = (language_mode.policy(prepared["instructions"]) if role == "creator" else
                  language_mode.policy(review.shared.CRITIC_POLICY + "\n" + review.POLICY))
    old_hash = hashlib.sha256((adapter.ADAPTER + ":" + prepared["instructionHash"] + ":" + old_policy).encode()).hexdigest()
    attempt = next(item for item in history[2] if item.role == role)
    assert attempt.instruction_hash != old_hash
    attempt.instruction_hash = old_hash
    assert continuation.seed(*history) == (None, None)


@pytest.mark.parametrize("key", continuation.IDENTITY)
def test_every_owner_and_target_identity_mismatch_rejects_seed(history, key):
    setattr(history[1], key, "different")
    assert continuation.seed(*history) == (None, None)


@pytest.mark.parametrize("key", studio.BINDING_KEYS)
def test_every_prepared_binding_mismatch_rejects_seed(history, key):
    history[1].binding[key] = "f" * 64
    assert continuation.seed(*history) == (None, None)


@pytest.mark.parametrize("role", range(3))
@pytest.mark.parametrize("defect", ["instruction_hash", "owner", "run", "stage", "round", "model", "source", "missing_mode", "changed_mode", "failed_event", "event_owner"])
def test_each_final_role_must_be_current_and_explicitly_bound(history, role, defect):
    attempt, event = history[2][role], history[3][role]
    if defect == "missing_mode":
        event.payload.pop("language_review_mode")
    elif defect == "changed_mode":
        event.payload["language_review_mode"] = "required"
    elif defect == "failed_event":
        event.state = "failed"
    elif defect == "event_owner":
        event.user_id = "different"
    else:
        field = {"owner": "user_id", "run": "run_id", "round": "round_number", "source": "source_revision"}.get(defect, defect)
        setattr(attempt, field, "different")
    assert continuation.seed(*history) == (None, None)


@pytest.mark.parametrize("defect", ["cancelled", "succeeded", "running", "provider_error", "result", "applied", "incomplete", "duplicate", "stale_output", "stale_receipt", "bad_pointer", "critic_hash", "hidden_correction", "hidden_check", "accept_old"])
def test_incomplete_or_inconsistent_history_never_supplies_a_seed(history, defect):
    job, prior, attempts, events, prepared = history
    if defect in {"cancelled", "succeeded", "running"}:
        prior.status = defect
    elif defect == "provider_error":
        prior.failure_code = defect
    elif defect == "result":
        prior.result = {"state": "private-draft-written"}
    elif defect == "applied":
        events.append(Row(state="applied"))
    elif defect == "incomplete":
        attempts.pop()
    elif defect == "duplicate":
        events.append(deepcopy(events[0]))
    elif defect == "stale_output":
        events[0].payload["output_sha256"] = "f" * 64
    elif defect == "stale_receipt":
        events[0].payload["checks"][0]["draft_sha256"] = "f" * 64
    elif defect == "bad_pointer":
        events[1].payload["critic"]["findings"][0]["evidence_refs"] = ["draft:/body/90/text"]
    elif defect == "critic_hash":
        events[2].payload["coordinator"]["critic_sha256"] = "f" * 64
    elif defect == "hidden_correction":
        events[2].payload["coordinator"]["correction_ids"] = []
    elif defect == "hidden_check":
        events[2].payload["coordinator"]["remaining_checks"] = []
    else:
        events[1].payload["critic"].update(verdict="accept_draft", findings=[])
        events[2].payload["coordinator"].update(decision="accept_draft", correction_ids=[],
            critic_sha256=review.shared.canonical_sha256(events[1].payload["critic"]))
    assert continuation.seed(job, prior, attempts, events, prepared) == (None, None)


def test_reenabled_language_does_not_reuse_paused_review(history, monkeypatch):
    monkeypatch.setattr(settings(), "creation_language_review_enabled", True)
    assert continuation.seed(*history) == (None, None)


def test_native_valid_large_history_does_not_overflow_creator_prompt_after_reservation(history):
    job, prior, attempts, events, prepared = history
    prepared["instructions"] = "Patikrinkite konkrečią užduotį, tikrus faktus ir visas žinomas bandymo ribas.\n" * 1300
    output = events[0].payload["candidate"]
    output["body"] = [{"type": "paragraph", "text": "a" * 11900} for _ in range(16)]
    output = review.candidate(output)
    digest = review.shared.canonical_sha256(output)
    assert len(json.dumps(output, ensure_ascii=False, separators=(",", ":")).encode()) < 200000
    events[0].payload.update(candidate=output, checks=review.observations(output))
    report = events[1].payload["critic"]
    report["draft_sha256"] = digest
    report["findings"][0]["evidence_refs"] = ["draft:/body/0/text"]
    report["checks"] = [{"kind": r["kind"], "status": r["status"], "evidence_refs": [r["id"]], "summary": r["summary"]}
                        for r in events[0].payload["checks"]]
    events[2].payload["coordinator"].update(draft_sha256=digest, critic_sha256=review.shared.canonical_sha256(report))
    for attempt, event in zip(attempts, events):
        attempt.instruction_hash = adapter.instruction_hash(attempt.role, prepared)
        event.payload["output_sha256"] = digest
    assert len(adapter.creator_prompt(prepared, output, {"critic": report, "coordinator": events[2].payload["coordinator"]}).encode()) > adapter.MAX_PROMPT_BYTES
    reused = continuation.seed(job, prior, attempts, events, prepared)[0] is not None
    assert not reused
