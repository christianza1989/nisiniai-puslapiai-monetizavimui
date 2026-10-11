"""Private pre-turn expectations mapped to existing criteria, without a new scorer."""

import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from sqlalchemy import select

from .. import competence
from ..control.routes import ControlError
from ..creation.service import digest
from ..customer_profile.instructions import NEED_FIELDS
from ..models import Artifact, Contact, Event, Job, Outbox
from . import protection, quality
from .wire import Digest, Strict

VERSION = "customer-typed-expectations.v1"
MANIFEST = "private_customer_archetype_baseline.v2"
REPORT = "customer-typed-checks.v1"


class File(Strict):
    path: str = Field(min_length=1, max_length=1024)
    sha256: Digest


class Checkpoint(Strict):
    after_step: int = Field(ge=1, le=8, strict=True)
    mode: Literal["fields", "empty", "unchanged"]
    matches: dict[str, list[str]] = Field(default_factory=dict, max_length=20)
    absent: list[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def explicit_state(self):
        if (
            len(set(self.absent)) != len(self.absent)
            or (set(self.matches) | set(self.absent)) - set(NEED_FIELDS)
            or set(self.matches) & set(self.absent)
        ):
            raise ValueError("invalid_expected_fields")
        if self.mode == "fields":
            if not self.matches:
                raise ValueError("nonempty_state_assertion_required")
        elif self.matches or self.absent:
            raise ValueError("explicit_state_mode_conflict")
        for variants in self.matches.values():
            if (
                not 1 <= len(variants) <= 4
                or len(set(variants)) != len(variants)
                or any(not v.strip() or len(v) > 1000 for v in variants)
            ):
                raise ValueError("bounded_pre_authored_variants_required")
        return self


class Case(Strict):
    case_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,100}$")
    script_sha256: Digest
    checkpoints: list[Checkpoint] = Field(min_length=1, max_length=8)
    expected_contact_channels: list[Literal["email", "phone"]] = Field(max_length=2)
    email_expected: bool = Field(strict=True)
    refusal_at: int | None = Field(default=None, ge=1, le=8, strict=True)

    @model_validator(mode="after")
    def text_capability_scope(self):
        # Positive contact/email work requires its actual channel adapter first.
        if self.expected_contact_channels or self.email_expected:
            raise ValueError("text_channel_only_proves_contact_email_absence")
        return self


class Supplement(Strict):
    version: Literal[VERSION]
    purpose: Literal["diagnostic_seen_regression"]
    origin: File
    source_case_corpus_sha256: Digest
    cases: list[Case] = Field(min_length=6, max_length=100)


def private_file(reference):
    ref = File.model_validate(reference)
    path = Path(ref.path)
    if (
        path.is_symlink()
        or any(p.is_symlink() for p in path.parents)
        or not path.resolve().is_relative_to(protection.ROOT.resolve())
        or not path.is_file()
        or path.stat().st_size > 1048576
    ):
        raise ControlError(400, "private_typed_manifest_required")
    raw = path.read_bytes()
    if len(raw) > 1048576 or hashlib.sha256(raw).hexdigest() != ref.sha256:
        raise ControlError(409, "typed_expectations_conflict")
    try:
        value = json.loads(raw.decode("utf-8"))
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except (UnicodeError, ValueError):
        raise ControlError(409, "typed_expectations_conflict") from None


def plan(manifest):
    """Whole-plan identity binds authored expectations as well as unchanged scripts."""
    if manifest.get("contract") != MANIFEST:
        raise ControlError(409, "typed_expectations_precommit_required")
    reference = File.model_validate(manifest.get("typed_expectations"))
    supplement = Supplement.model_validate(private_file(reference))
    origin = private_file(supplement.origin)
    if (
        origin.get("contract") != "private_customer_archetype_baseline.v1"
        or origin.get("cases") != manifest.get("cases")
        or origin.get("corpus_digest_scheme") != manifest.get("corpus_digest_scheme")
        or origin.get("corpus_sha256") != supplement.source_case_corpus_sha256
        or protection.corpus_digest(origin) != supplement.source_case_corpus_sha256
        or manifest.get("corpus_sha256") != supplement.source_case_corpus_sha256
    ):
        raise ControlError(409, "typed_expectations_origin_conflict")
    cases = {case.case_id: case for case in supplement.cases}
    if len(cases) != len(supplement.cases) or set(cases) != {c["case_id"] for c in manifest["cases"]}:
        raise ControlError(409, "typed_expectations_case_conflict")
    for script in manifest["cases"]:
        case = cases[script["case_id"]]
        if (
            case.script_sha256 != digest(script["messages"])
            or [c.after_step for c in case.checkpoints] != list(range(1, len(script["messages"]) + 1))
            or (case.refusal_at is not None and case.refusal_at > len(script["messages"]))
        ):
            raise ControlError(409, "typed_expectations_checkpoint_conflict")
    pin = {
        "version": VERSION,
        "source_case_corpus_sha256": supplement.source_case_corpus_sha256,
        "expectations_sha256": reference.sha256,
        "origin_manifest_sha256": supplement.origin.sha256,
    }
    return supplement, cases, {**pin, "evaluation_plan_sha256": digest(pin)}


def bound(reference, proof):
    """A changed/post-execution file cannot replace the immutable pre-turn proof."""
    ref = protection.Reference.model_validate(reference)
    if proof is None or ref.manifest_sha256 != proof["manifest_sha256"] or ref.case_id != proof["case_id"]:
        raise ControlError(409, "typed_expectations_precommit_required")
    manifest = private_file(File(path=ref.manifest_path, sha256=ref.manifest_sha256))
    supplement, cases, pin = plan(manifest)
    if (
        manifest["corpus_sha256"] != proof["corpus_sha256"]
        or manifest["snapshot_sha256"] != proof["snapshot_sha256"]
        or manifest["source_revision"] != proof["execution_source_revision"]
        or cases[ref.case_id].script_sha256 != proof["script_sha256"]
    ):
        raise ControlError(409, "typed_expectations_binding_conflict")
    return {
        **pin,
        "manifest_sha256": ref.manifest_sha256,
        "case_id": ref.case_id,
        "purpose": supplement.purpose,
        "case": cases[ref.case_id].model_dump(mode="json"),
    }


async def capture(tx, row):
    """Actual scope/RLS reads; no expectation, invented ACK or email is model input."""
    scope = dict(conversation_id=row.id, business_id=row.business_id, environment_id=row.environment_id)
    events = list(await tx.scalars(select(Event).filter_by(**scope).order_by(Event.sequence).limit(1001)))
    if len(events) > 1000:
        raise ControlError(409, "typed_receipts_incomplete")
    _, _, coverage = quality.transcript(events)
    patches = quality.need_receipts(row, events)
    clients = [e for e in events if e.kind == "client_transcript"]
    replies = {e.event_key.removeprefix("result:"): e for e in events if e.kind == "customer_text_result"}
    if coverage != "complete" or not clients:
        raise ControlError(409, "typed_receipts_incomplete")
    checkpoints, previous = [], {}
    keys = {e.event_key: e for e in events}
    for index, client in enumerate(clients, 1):
        request = client.event_key.removeprefix("client:")
        reply = replies[request]
        attempt, usage = keys.get("attempt:" + request), keys.get("usage:" + request)
        if (
            attempt is None
            or usage is None
            or attempt.kind != "provider_attempt"
            or usage.kind != "provider_usage"
            or not client.sequence < attempt.sequence < usage.sequence < reply.sequence
            or any(e.payload.get("request_id") != request for e in (attempt, usage, reply))
            or any(e.payload.get("model") != "gpt-6-luna" for e in (attempt, usage))
            or not isinstance(attempt.payload.get("run_id"), str)
            or not attempt.payload["run_id"]
            or attempt.payload["run_id"] != usage.payload.get("run_id")
            or type(attempt.payload.get("epoch")) is not int
            or attempt.payload["epoch"] < 1
            or "failure_code" not in usage.payload
            or usage.payload["failure_code"] is not None
            or reply.payload.get("failure_code") is not None
        ):
            raise ControlError(409, "typed_text_receipt_conflict")
        preceding = [p for p in patches if p["sequence"] < reply.sequence]
        state = preceding[-1]["state_after"] if preceding else {}
        checkpoints.append(
            {
                "after_step": index,
                "state_after": state,
                "state_before": previous,
                "client_event_id": client.id,
                "reply_event_id": reply.id,
            }
        )
        previous = state
    contacts = list(await tx.scalars(select(Contact).filter_by(**scope)))
    outbox = list(await tx.scalars(select(Outbox).filter_by(**scope)))
    artifacts = list(await tx.scalars(select(Artifact).filter_by(**scope)))
    channels = sorted(c.channel for c in contacts)
    contact_events = sorted(
        {e.payload["channel"] for e in events if e.kind in {"contact_ready", "contact_corrected"}}
    )
    if sorted(set(channels)) != contact_events:
        raise ControlError(409, "typed_contact_receipt_conflict")
    tools, errors = [], []
    for event in events:
        if event.kind == "tool":
            name = event.payload.get("name")
            turn = sum(c.sequence < event.sequence for c in clients)
            # These are the maintained text channel's actual server tools.
            tools.append({"name": name, "turn": turn, "result": {}})
            valid = name == "need.patch"
            if name == "knowledge.resolve":
                request = event.event_key.removeprefix("knowledge:")
                client, attempt = keys.get("client:" + request), keys.get("attempt:" + request)
                valid = (
                    event.event_key == "knowledge:" + request
                    and client is not None
                    and attempt is not None
                    and client.sequence < event.sequence < attempt.sequence
                    and isinstance(event.payload.get("result"), dict)
                )
            if not valid:
                errors.append("unsupported_channel_tool")
        if event.kind == "provider_usage" and event.payload.get("failure_code") is not None:
            errors.append("provider_failed")
    followups = [a for a in artifacts if a.kind == "followup"]
    return {
        "checkpoints": checkpoints,
        "channels": channels,
        "tools": tools,
        "errors": errors,
        "followup_present": bool(outbox or followups),
        "contact_event_count": len(contact_events),
        "outbox_count": len(outbox),
        "followup_artifact_count": len(followups),
    }


async def accounted(tx, row, dispatch, result):
    from . import evidence
    from .review import current_job
    from .score_evidence import original_quality

    scope = dict(conversation_id=row.id, business_id=row.business_id, environment_id=row.environment_id)
    events = list(await tx.scalars(select(Event).filter_by(**scope).order_by(Event.sequence)))
    job = await tx.scalar(select(Job).filter_by(id=dispatch.task["id"], **scope))
    requests = [
        e for e in events if e.kind == "quality_request" and e.payload.get("job_id") == dispatch.task["id"]
    ]
    attempts = [
        e
        for e in events
        if e.kind == "quality_provider_attempt" and e.payload.get("job_id") == dispatch.task["id"]
    ]
    settled = [
        e
        for e in events
        if e.kind == "quality_provider_usage" and e.payload.get("job_id") == dispatch.task["id"]
    ]
    fields = (
        "dispatch",
        "request_id",
        "fingerprint",
        "binding_sha256",
        "input_sha256",
        "evaluator_sha256",
        "model",
        "model_profile",
        "competence_contract",
        "protected_case_sha256",
        "typed_binding_sha256",
    )
    if (
        not current_job(job, dispatch)
        or len(requests) != 1
        or not isinstance(job.payload.get("request_id"), str)
        or requests[0].event_key != "quality-request:" + job.payload["request_id"]
        or any(requests[0].payload.get(k) != job.payload.get(k) for k in fields)
        or not attempts
        or not evidence.valid_attempts(job, attempts)
        or not evidence.settled_attempts(job, attempts, settled)
        or any(e.sequence <= requests[0].sequence for e in attempts)
    ):
        raise ControlError(409, "typed_score_receipt_conflict")
    first = next(e for e in settled if e.payload["number"] == 1)
    if len(attempts) == 2 and first.sequence >= next(
        e.sequence for e in attempts if e.payload["number"] == 2
    ):
        raise ControlError(409, "typed_score_receipt_conflict")
    scores = competence.Scores.model_validate(result["competence"]["scores"])
    original = original_quality(result)
    if (
        first.payload.get("output_sha256")
        != digest({"quality": original.model_dump(), "scores": scores.model_dump()})
        or not original.evidence_event_ids
        or not set(original.evidence_event_ids).issubset({e["id"] for e in dispatch.data["evidence"]})
    ):
        raise ControlError(409, "typed_score_receipt_conflict")


def evaluate(binding, observed, result):
    """Project existing criterion booleans; an explicit empty state has real evidence."""
    case = Case.model_validate(binding["case"])
    if [c["after_step"] for c in observed["checkpoints"]] != [c.after_step for c in case.checkpoints]:
        raise ControlError(409, "typed_receipts_incomplete")
    assertions = []
    for expected, actual in zip(case.checkpoints, observed["checkpoints"], strict=True):
        state = actual["state_after"]
        if expected.mode == "empty":
            passed = not state
        elif expected.mode == "unchanged":
            passed = state == actual["state_before"]
        else:
            passed = all(key not in state for key in expected.absent) and all(
                any(
                    competence.expected_matches(key, state.get(key, {}).get("value", ""), v) for v in variants
                )
                for key, variants in expected.matches.items()
            )
        assertions.append(
            {
                "after_step": expected.after_step,
                "passed": passed,
                "client_event_id": actual["client_event_id"],
                "reply_event_id": actual["reply_event_id"],
            }
        )
    final = observed["checkpoints"][-1]["state_after"]
    expected_need = {}
    for key, variants in case.checkpoints[-1].matches.items():
        expected_need[key] = next(
            (v for v in variants if competence.expected_matches(key, final.get(key, {}).get("value", ""), v)),
            variants[0],
        )
    row = {
        "errors": observed["errors"],
        "contact_receipts": [{"channel": c} for c in observed["channels"]],
        "expected_contact_channels": case.expected_contact_channels,
        "need": final,
        "expected_need": expected_need,
        "refusal": case.refusal_at is not None,
        "refusal_at": case.refusal_at or 0,
        "tools": observed["tools"],
        "contact": "email" in observed["channels"],
        "quality": result,
    }
    if row["contact"] or observed["followup_present"]:
        row["actual_core_followup"] = {}  # Presence is real; this adapter has no reviewed-email projection.
    scores = competence.Scores.model_validate(result["competence"]["scores"])
    if result["competence"] != competence.report(scores):
        raise ControlError(409, "typed_score_receipt_conflict")
    checks = competence.network_checks(row, scores)
    checks["corrected_need_saved"] = checks["corrected_need_saved"] and all(a["passed"] for a in assertions)
    return {
        "version": REPORT,
        **{k: v for k, v in binding.items() if k != "case"},
        "state": "PASS" if all(checks.values()) else "FAIL",
        "checks": checks,
        "checkpoints": assertions,
        "observed_receipts_sha256": digest(observed),
        "language_quality": "UNVERIFIED",
        "protected_comparison": "not_performed",
        "module_admission": "not_admitted",
        "activation": "not_performed",
    }
