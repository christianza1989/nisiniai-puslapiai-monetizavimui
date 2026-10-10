"""Exact native rich candidate binding, known language FAIL and no fake evidence; no provider."""
from copy import deepcopy

import pytest

from pinet_core.content_work import adapter, review
from pinet_core.creation.review import canonical_sha256
from pinet_core.tasks.codex_transport import RunnerError


def output():
    return {"title": "Kaip pasirinkti komandos užduotį", "description": "Pasirinkite mažą užduotį ir palyginkite bandymo rezultatą su įprastu darbu.",
        "intent": "Padėti komandai pasirinkti konkrečią naudingą darbo užduotį.",
        "body": [{"type": "richParagraph", "content": [{"type": "text",
            "text": "Pasirinkite pasikartojančią užduotį ir aprašykite rezultatą, kurį norite palyginti."}]}],
        "factChecks": ["Mokamo vykdymo sąlygos dar nepatvirtintos."]}


def critic(candidate, receipts, verdict="accept_draft"):
    return {"schema_version": "creation.critic.v1", "role": "critic", "draft_sha256": canonical_sha256(candidate),
        "stage": "content", "round_number": 1, "verdict": verdict,
        "summary": "Gidas atsako į klausimą, o nepatikrintos sąlygos aiškiai išskirtos.",
        "findings": [] if verdict == "accept_draft" else [{"id": "f_1", "severity": "required", "area": "content",
            "explanation": "Tekste trūksta konkretaus palyginimo pavyzdžio.",
            "correction": "Pridėkite aiškiai pažymėtą palyginimo pavyzdį.",
            "evidence_refs": ["draft:/body/0/content/0/text"]}],
        "checks": [{"kind": r["kind"], "status": r["status"], "evidence_refs": [r["id"]],
            "summary": r["summary"]} for r in receipts]}


def coordinator(candidate, report):
    return {"schema_version": "creation.coordinator.v1", "role": "coordinator",
        "draft_sha256": canonical_sha256(candidate), "critic_sha256": canonical_sha256(report),
        "stage": "content", "round_number": 1, "decision": report["verdict"],
        "summary": "Privatus gidas priimtas rengimui, o viešo publikavimo patikros lieka neatliktos.",
        "correction_ids": [f["id"] for f in report["findings"] if f["severity"] != "suggestion"],
        "remaining_checks": [c["kind"] for c in report["checks"] if c["status"] in ("FAIL", "UNVERIFIED")],
        "next_actions": ["Patikrinti gido šaltinius ir reikalingą temos vaizdą."],
        "full_f1_status": "UNVERIFIED", "launch_status": "UNVERIFIED"}


def test_native_rich_output_is_not_flattened_and_review_is_exact():
    candidate = output()
    receipts = review.observations(candidate)
    report = review.critic(critic(candidate, receipts), output=candidate, round_number=1, receipts=receipts)
    decision = review.coordinator(coordinator(candidate, report), output=candidate,
        critic_value=report, round_number=1, receipts=receipts)
    assert decision["decision"] == "accept_draft"
    assert candidate["body"][0]["type"] == "richParagraph"
    assert len(decision["remaining_checks"]) == 8


@pytest.mark.parametrize("defect", ["hash", "stage", "pointer", "receipt", "invented_pass", "dot_pointer", "changed_candidate"])
def test_native_critic_cannot_forge_exact_observations_or_candidate(defect):
    candidate = output()
    receipts = review.observations(candidate)
    report = critic(candidate, receipts, "revise")
    if defect == "hash":
        report["draft_sha256"] = "b" * 64
    elif defect == "stage":
        report["stage"] = "private_draft"
    elif defect == "pointer":
        report["findings"][0]["evidence_refs"] = ["draft:/body/9/content/0/text"]
    elif defect == "receipt":
        report["checks"][0]["evidence_refs"] = []
    elif defect == "invented_pass":
        report["checks"][1]["status"] = "PASS"
    elif defect == "dot_pointer":
        report["findings"][0]["evidence_refs"] = ["draft:/body.0.content.0.text"]
    else:
        candidate["body"][0]["content"][0]["text"] += " Tai kita versija."
    with pytest.raises(RunnerError):
        review.critic(report, output=candidate, round_number=1, receipts=receipts)


def test_native_known_language_fail_keeps_original_hash_and_exact_pointer():
    candidate = output()
    candidate["body"][0]["content"][0]["text"] = "Apskaičiuoti mokymų ettevalmistus- ja toteutuskustannukset sekä päättää hinta ennen ensimmäistä toteutusta."
    receipts = review.observations(candidate)
    assert receipts[0]["status"] == "FAIL"
    projected, refs, omitted, _ = review.projection(candidate)
    assert "draft:/body/0/content/0/text" in refs and omitted == ["draft:/body/0/content/0/text"]
    assert projected["body"][0]["content"][0]["text"] != candidate["body"][0]["content"][0]["text"]
    with pytest.raises(RunnerError):
        review.critic(critic(candidate, receipts), output=candidate, round_number=1, receipts=receipts)
    assert review.critic(critic(candidate, receipts, "revise"), output=candidate, round_number=1, receipts=receipts)["verdict"] == "revise"


def test_fragmented_rich_sentence_cannot_evade_language_screening():
    candidate = output()
    candidate["body"][0]["content"] = [{"type": "text", "text": text} for text in
        ("This guide explains ", "how a team ", "can select the ", "best starting task.")]
    receipts = review.observations(candidate)
    projected, _, omitted, _ = review.projection(candidate)
    assert receipts[0]["status"] == "FAIL" and len(omitted) == 4
    assert projected["body"][0]["content"][3]["text"] != candidate["body"][0]["content"][3]["text"]


@pytest.mark.parametrize("defect", ["critic_hash", "corrections", "remaining", "decision", "launch"])
def test_coordinator_cannot_hide_native_review_failures(defect):
    candidate = output()
    receipts = review.observations(candidate)
    report = critic(candidate, receipts, "revise")
    decision = coordinator(candidate, report)
    if defect == "critic_hash":
        decision["critic_sha256"] = "d" * 64
    elif defect == "corrections":
        decision["correction_ids"] = []
    elif defect == "remaining":
        decision["remaining_checks"] = []
    elif defect == "decision":
        decision["decision"] = "accept_draft"
    else:
        decision["launch_status"] = "PASS"
    with pytest.raises(RunnerError):
        review.coordinator(decision, output=candidate, critic_value=report, round_number=1, receipts=receipts)


def test_native_schema_pins_exact_refs_hash_round_and_instructions():
    candidate = output()
    receipts = review.observations(candidate)
    prepared = {"instructionHash": "a" * 64, "instructions": "Kanoninis gido tekstų rašymo nurodymas.",
        "pageData": {"planningBrief": {"head_query": "Kaip pasirinkti užduotį?"}}, "siteData": {}}
    ctx = review.context(candidate, 1, receipts, prepared)
    schema = review.output_schema("critic", ctx)
    assert "draft:/body/0/content/0/text" in schema["$defs"]["Finding"]["properties"]["evidence_refs"]["items"]["enum"]
    assert schema["properties"]["draft_sha256"]["const"] == canonical_sha256(candidate)
    modified = deepcopy(prepared)
    modified["instructionHash"] = "b" * 64
    assert adapter.instruction_hash("critic", prepared) != adapter.instruction_hash("critic", modified)


async def test_guide_adapter_uses_fixed_no_tools_transport_and_native_schema(tmp_path, monkeypatch):
    import json
    import sys
    from pathlib import Path

    prepared = {"instructionHash": "a" * 64, "instructions": "Rašyk tik native V2 gido tekstą.",
        "outputSchema": {"type": "object", "properties": {"body": {"type": "array"}}}}
    monkeypatch.setattr(adapter, "available", lambda: (Path(sys.executable), tmp_path))
    calls = []
    async def execute(args, **kwargs):
        calls.append((args, kwargs))
        assert kwargs["env"].get("OPENAI_API_KEY") is None
        assert 'web_search="disabled"' in args
        assert '--ignore-user-config' in args and '--strict-config' in args and '--ignore-rules' in args
        assert 'shell_tool' in args and 'apps' in args and 'plugins' in args and 'multi_agent' in args
        assert '--sandbox' in args and args[args.index('--sandbox') + 1] == 'read-only'
        assert await kwargs["still_authorized"]()
        assert json.loads((kwargs["cwd"] / "output.schema.json").read_text("utf-8")) == prepared["outputSchema"]
        return output(), {"usage": {"input_tokens": 13, "output_tokens": 21}, "trace_sha256": "d" * 64}
    monkeypatch.setattr(adapter, "execute", execute)
    async def authorized():
        return True
    value, receipt = await adapter.run_role({"prepared": prepared,
        "expected_instruction_hash": adapter.instruction_hash("creator", prepared)}, authorized, role="creator", seconds=20)
    assert value["body"][0]["type"] == "richParagraph" and receipt["model"] == "gpt-6-luna"
    assert len(calls) == 1
    with pytest.raises(RunnerError) as error:
        adapter.Trace(False, 0).event({"item": {"type": "web_search_call"}})
    assert error.value.code == "tool_attempted"
