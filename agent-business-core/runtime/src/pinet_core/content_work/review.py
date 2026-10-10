"""Native output review with exact JSON pointers/receipts; no business-Draft conversion."""
import json
import re

from pydantic import TypeAdapter

from ..creation import review as shared
from ..creation.renderer import screen_language
from ..tasks.codex_transport import RunnerError
from .wire import NativeOutput

REFERENCE_PATTERN = TypeAdapter(shared.Reference).json_schema()["pattern"]

POLICY = """Vertini vieną native V2 gido puslapį pagal jo visą tikrą planningBrief ir pateiktus svetainės
duomenis. draft yra penkių laukų gido tekstas, ne verslo plano Draft. Vertink atsakymą į head_query,
praktinę naudą, minties eigą, prielaidas ir taisyklingą lietuvių kalbą. Rich body struktūros nekeisk į
business/pages/sections. Negali teigti, kad šaltiniai, vaizdai, svetainė ar publikavimas patikrinti,
nes modelių sutarimas nėra bendro workflow review. Puslapis lieka privatus. Etapas tik content.
Naudok tik allowed_finding_refs; native JSONpointer body/0/content/0/text ir panašūs.
Nežinomi verslo faktai netampa tikrais vien todėl, kad pateikti hipotezėje. Įrankiai išjungti.
"""


def candidate(value):
    try:
        output = NativeOutput.model_validate(value).model_dump()
        if (len(json.dumps(output, ensure_ascii=False).encode()) > 200000
                or any(not note.strip() or len(note) > 600 for note in output["factChecks"])):
            raise ValueError("Bounded output required")
        return output
    except (ValueError, TypeError):
        raise RunnerError("writer_output_invalid") from None


def projection(value):
    omitted, references, prose = [], [], []
    excluded = {"type", "kind", "url", "pageId", "assetId"}
    bad_groups = []
    def groups(item, pointer=""):
        if isinstance(item, dict):
            for key, child in item.items():
                groups(child, pointer + "/" + key)
        elif isinstance(item, list):
            if item and all(isinstance(child, dict) and child.get("type") in ("text", "link") for child in item):
                # A rendered sentence can span short formatting/link nodes. Screen
                # that sentence too, not only each individually short fragment.
                text = "".join(child.get("text", "") for child in item)
                prose.append(text)
                try:
                    screen_language([text])
                except RunnerError as error:
                    if error.code != "language_quality_failed":
                        raise
                    bad_groups.append(pointer + "/")
            for i, child in enumerate(item):
                groups(child, pointer + "/" + str(i))
    groups(value)
    def visit(item, pointer="", visible=True):
        if pointer and item not in (None, "", [], {}) and re.fullmatch(REFERENCE_PATTERN,
                                                                     "draft:" + pointer):
            references.append("draft:" + pointer)
        if isinstance(item, dict):
            return {key: visit(child, pointer + "/" + key, visible and key not in excluded)
                    for key, child in item.items()}
        if isinstance(item, list):
            return [visit(child, pointer + "/" + str(i), visible) for i, child in enumerate(item)]
        if isinstance(item, str) and visible:
            prose.append(item)
            try:
                if any(pointer.startswith(group) for group in bad_groups):
                    raise RunnerError("language_quality_failed")
                screen_language([item])
            except RunnerError as error:
                if error.code != "language_quality_failed":
                    raise
                omitted.append("draft:" + pointer)
                return "[Šį tekstą atmetė automatinė kalbos patikra; originalas saugomas privačiai.]"
        return item
    projected = visit(value)
    return projected, references, omitted, prose


def observations(output):
    digest = shared.canonical_sha256(output)
    _, _, _, prose = projection(output)
    try:
        screen_language(prose)
        language = "PASS"
    except RunnerError as error:
        if error.code != "language_quality_failed":
            raise
        language = "FAIL"
    return [{"id": "r_" + kind, "draft_sha256": digest, "kind": kind,
        "status": language if kind == "language_quality" else "UNVERIFIED",
        "observed": kind == "language_quality",
        "summary": ("Automatinė viso gido teksto kalbos patikra; prasminę kokybę vertina kritikas."
                    if kind == "language_quality" else "Šios gido versijos faktinė patikra dar neatlikta.")}
        for kind in shared.CHECK_KINDS]


def critic(value, *, output, round_number, receipts):
    try:
        output = candidate(output)
        report = shared.CriticReview.model_validate(value)
        digest = shared.canonical_sha256(output)
        if report.draft_sha256 != digest or report.stage != "content" or report.round_number != round_number:
            raise ValueError("Wrong native candidate")
        observed = shared._receipts(receipts, digest)
        for finding in report.findings:
            if len(set(finding.evidence_refs)) != len(finding.evidence_refs):
                raise ValueError("Duplicate references")
            for reference in finding.evidence_refs:
                if reference.startswith("receipt:"):
                    observed[reference[8:]]
                else:
                    shared._draft_reference(reference, output)
        for check in report.checks:
            shared._check_evidence(check, observed)
        if report.verdict == "accept_draft" and any(check.status == "FAIL" for check in report.checks):
            raise ValueError("Known FAIL")
        screen_language([report.summary, *[text for finding in report.findings
            for text in (finding.explanation, finding.correction)], *[check.summary for check in report.checks]])
        return report.model_dump(mode="json")
    except (ValueError, TypeError, KeyError, IndexError):
        raise RunnerError("review_invalid") from None


def coordinator(value, *, output, critic_value, round_number, receipts):
    try:
        report = shared.CriticReview.model_validate(critic(critic_value, output=output,
            round_number=round_number, receipts=receipts))
        decision = shared.CoordinatorDecision.model_validate(value)
        if (decision.draft_sha256 != report.draft_sha256 or decision.critic_sha256 != shared.critic_sha256(report)
                or decision.stage != "content" or decision.round_number != round_number
                or decision.decision != report.verdict
                or set(decision.correction_ids) != {f.id for f in report.findings if f.severity != "suggestion"}
                or len(set(decision.correction_ids)) != len(decision.correction_ids)
                or set(decision.remaining_checks) != {c.kind for c in report.checks if c.status in ("FAIL", "UNVERIFIED")}
                or len(set(decision.remaining_checks)) != len(decision.remaining_checks)):
            raise ValueError("Coordinator cannot conceal native defects")
        screen_language([decision.summary, *decision.next_actions])
        return decision.model_dump(mode="json")
    except (ValueError, TypeError, KeyError, IndexError):
        raise RunnerError("review_invalid") from None


def context(output, round_number, receipts, prepared, critic_value=None):
    output = candidate(output)
    digest = shared.canonical_sha256(output)
    observed = shared._receipts(receipts, digest)
    projected, references, omitted, _ = projection(output)
    value = {"draft": projected, "draft_sha256": digest, "original_draft_sha256": digest,
        "stage": "content", "round_number": round_number,
        "context_projection": {"scope": "partial_model_input", "original_preserved": True, "omitted_fields": omitted},
        "allowed_finding_refs": [*references, *["receipt:" + key for key in observed]],
        "receipts": receipts, "planningBrief": prepared["pageData"]["planningBrief"],
        "siteData": prepared["siteData"]}
    if critic_value:
        value["critic"] = critic(critic_value, output=output, round_number=round_number, receipts=receipts)
        value["critic_sha256"] = shared.canonical_sha256(value["critic"])
        value["allowed_next_actions"] = shared.coordinator_actions(value["critic"])
    return value


def policy(role):
    return {"critic": shared.CRITIC_POLICY, "coordinator": shared.COORDINATOR_POLICY}[role] + "\n" + POLICY


def output_schema(role, value):
    if role == "critic":
        schema = shared.CriticReview.model_json_schema()
        schema["$defs"]["Finding"]["properties"]["evidence_refs"]["items"]["enum"] = value["allowed_finding_refs"]
    else:
        schema = shared.CoordinatorDecision.model_json_schema()
        schema["properties"]["critic_sha256"]["const"] = value["critic_sha256"]
        schema["properties"]["decision"]["const"] = value["critic"]["verdict"]
        schema["properties"]["next_actions"]["items"]["enum"] = shared.coordinator_actions(value["critic"])
    for key in ("draft_sha256", "stage", "round_number"):
        schema["properties"][key]["const"] = value[key]
    return schema
