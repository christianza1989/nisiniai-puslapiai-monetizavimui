"""Six exact saved-agent hooks for the ONE maintained dialogue lab, one reply max.

No authority, allowance, provider or worker is created here. The admitted caller
supplies targeted common-worker dispatch and independently sealed private input.
"""

from datetime import datetime
from email.message import EmailMessage
from typing import Literal
from uuid import UUID, uuid5

from pydantic import Field, ValidationError
from sqlalchemy import select

from ..control.routes import scope, token_hash
from ..customer_text.service import customer_session
from ..db import db
from ..models import MailMessage
from ..tasks.codex import RunnerError
from . import agent_role_tasks, model_authority
from .agent_role_authority import REVIEW_FIELDS, accepted
from .agent_role_contract import KIND, ROLES, NativeTeam, ObservedTeam, RoleCalibration, RoleName
from .contracts import Campaign
from .dialogue import REPLY_INSTRUCTION
from .dialogue_lab import GRADE_INSTRUCTION, DialogueGrade, LabCase, validate_synthetic_data
from .engine import contact_blocks, fingerprint
from .headless_mail import HeadlessMail
from .instructions import compose
from .native_calibration import sealed_private_json
from .work_models import MailBinding

GRADE = (
    GRADE_INSTRUCTION
    + """
Additionally evaluate each of the SIX saved Agent Configs from native_receipts:
research, qualification, writer, reply, quality, coordinator. Generic role labels
or another author's reviewer are not separate saved agents. Compare source facts,
source/evidence references, actual parent output hashes and current Config receipts.
Report each role_status as PASS/FAIL/NA; NA is only for genuinely unexecuted roles
stopped by the observed workflow, with a precise na_reasons entry. Executed roles
cannot be NA. Check independent qualification, exact-copy own-Config quality,
supplier contact nondisclosure, no fabricated prices/terms and useful EN/DE/PL.
Coordinator routing cannot create sending/provider authority. Judge actual state,
not template wording. No candidate/controller may receive hidden text or labels.
"""
)


def fixed_grade_map_schema(schema, *, statuses):
    # CodexLab closes every object schema. A dynamic dict would become an empty
    # closed object, making six statuses (and any NA explanation) impossible.
    schema.update(
        properties={
            role: ({"type": "string", "enum": ["PASS", "FAIL", "NA"]} if statuses else {"type": "string"})
            for role in ROLES
        },
        required=list(ROLES),
        additionalProperties=False,
    )
    for key in ("propertyNames", "minProperties", "maxProperties"):
        schema.pop(key, None)


class SixRoleGrade(DialogueGrade):
    role_status: dict[RoleName, Literal["PASS", "FAIL", "NA"]] = Field(
        min_length=6,
        max_length=6,
        json_schema_extra=lambda schema: fixed_grade_map_schema(schema, statuses=True),
    )
    na_reasons: dict[RoleName, str] = Field(
        default_factory=dict,
        max_length=6,
        json_schema_extra=lambda schema: fixed_grade_map_schema(schema, statuses=False),
    )


def validate_corpus(source):
    """Offline data-only validator; never returns private data in an error."""
    try:
        if (
            not isinstance(source, dict)
            or set(source) != {"synthetic", "now", "campaign", "cases"}
            or source["synthetic"] is not True
            or datetime.fromisoformat(source["now"]).tzinfo is None
            or not isinstance(source["cases"], list)
            or not 6 <= len(source["cases"]) <= 100
        ):
            raise ValueError()
        campaign = Campaign.model_validate(source["campaign"])
        cases = [LabCase.model_validate(row) for row in source["cases"]]
        if (
            len({c.id for c in cases}) != len(cases)
            or len({fingerprint(c.persona) for c in cases}) != len(cases)
            or sum(c.split == "holdout" for c in cases) < 3
            or not any(c.split == "train" for c in cases)
        ):
            raise ValueError()
        for case in cases:
            if case.prospect.site_id != campaign.site_id:
                raise ValueError()
            validate_synthetic_data(campaign, case)
        return campaign, cases
    except (ValidationError, ValueError, TypeError, KeyError):
        raise RunnerError("agent_role_corpus_invalid") from None


def validate_corpus_file(path, sha256):
    """Read sealed runtime/artifacts input; export hashes/counts only, zero calls."""
    source = sealed_private_json(path, sha256, changed="agent_role_protected_source_changed")
    _, cases = validate_corpus(source)
    return {
        "state": "OFFLINE_SIX_ROLE_CORPUS_VALID",
        "case_count": len(cases),
        "split_counts": {
            split: sum(case.split == split for case in cases) for split in ("train", "regression", "holdout")
        },
        "cases_sha256": fingerprint(source["cases"]),
        "source_sha256": sha256,
        "database_calls": 0,
        "model_calls": 0,
        "grants_created": 0,
        "private_text_exported": False,
    }


def manifest(reference):
    try:
        ref = RoleCalibration.model_validate(reference)
        frozen = sealed_private_json(
            ref.manifest_path, ref.manifest_sha256, changed="agent_role_manifest_changed"
        )
        if (
            set(frozen)
            != {
                "version",
                "source_revision",
                "team",
                "bindings",
                "campaign",
                "cases",
                "corpus_sha256",
                "evaluator_hash",
                "protected_source",
                "max_turns",
            }
            or frozen["version"] != "acquisition-six-role-calibration.v1"
            or type(frozen["max_turns"]) is not int
            or frozen["max_turns"] != 1
            or frozen["corpus_sha256"] != fingerprint(frozen["cases"])
            or frozen["evaluator_hash"] != fingerprint(GRADE)
            or not 6 <= len(frozen["cases"]) <= 100
        ):
            raise ValueError()
        team = NativeTeam.model_validate(frozen["team"])
        observed = ObservedTeam.model_validate(frozen["bindings"])
        if any(
            getattr(observed, role).id != getattr(team, role).authorization_id
            or getattr(observed, role).fingerprint != getattr(team, role).fingerprint
            for role in ROLES
        ):
            raise ValueError()
        campaign = Campaign.model_validate(frozen["campaign"])
        protected = frozen["protected_source"]
        if set(protected) != {"path", "sha256"}:
            raise ValueError()
        source = sealed_private_json(
            protected["path"], protected["sha256"], changed="agent_role_protected_source_changed"
        )
        source_campaign, cases = validate_corpus(source)
        if source.get("cases") != frozen["cases"] or source_campaign != campaign:
            raise ValueError()
        selected = next(c for c in cases if c.id == ref.case_id)
        return frozen, selected
    except (ValidationError, ValueError, TypeError, KeyError, StopIteration, OSError):
        raise RunnerError("agent_role_manifest_invalid") from None


def verify_reference(value, bindings, source_revision):
    frozen, case = manifest(value.calibration)
    if (
        frozen["source_revision"] != source_revision
        or frozen["team"] != value.team.model_dump(mode="json")
        or frozen["bindings"] != bindings
        or case.prospect != value.prospect
        or case.recipient != value.recipient
        or Campaign.model_validate(frozen["campaign"]) != value.campaign
    ):
        raise RunnerError("agent_role_manifest_binding_changed")


class SixRoleWorkflow:
    maximum_turns = 1

    def __init__(self, *, token, reference, episode_id, dispatch):
        self.token, self.reference = token, RoleCalibration.model_validate(reference)
        self.frozen, self.case = manifest(reference)
        self.episode, self.dispatch = UUID(str(episode_id)), dispatch
        self.receipts, self.sequence, self.turn = [], 0, 0
        self.stop_cause, self.evaluation_events = None, []
        self.parent, self.quality, self.capture = None, None, None
        self.provenance = {
            "episode_id": str(self.episode),
            "manifest_sha256": self.reference.manifest_sha256,
            "source_revision": self.frozen["source_revision"],
            "bindings": self.frozen["bindings"],
            "evaluator_hash": self.frozen["evaluator_hash"],
            "max_turns": 1,
            "protected_raw_sha256": self.frozen["protected_source"]["sha256"],
            "cases_sha256": self.frozen["corpus_sha256"],
        }
        self.provenance["protected_source_now"] = sealed_private_json(
            self.frozen["protected_source"]["path"],
            self.frozen["protected_source"]["sha256"],
            changed="agent_role_protected_source_changed",
        )["now"]

    def validate(self, campaign, case):
        frozen, selected = manifest(self.reference)
        if (
            frozen != self.frozen
            or selected != case
            or campaign != Campaign.model_validate(frozen["campaign"])
        ):
            raise RunnerError("agent_role_manifest_binding_changed")

    async def _submit(self, role, campaign, case, parent=None, mail=None):
        self.sequence += 1
        request = {
            "version": "acquisition-agent-role.v1",
            "request_id": str(uuid5(self.episode, f"role:{self.sequence}:{role}")),
            "authorization_id": self.frozen["team"][role]["authorization_id"],
            "role": role,
            "team": self.frozen["team"],
            "campaign": campaign.model_dump(mode="json"),
            "prospect": case.prospect.model_dump(mode="json"),
            "recipient": case.recipient,
            "job_text": "Clarify the prospect requirements using current evidence and approved facts.",
            "parents": [parent["handoff"]] if parent else [],
            "mail": mail,
            "calibration": self.reference.model_dump(mode="json"),
        }
        async with scope(token=token_hash(self.token)) as tx:
            actor = await customer_session(tx, self.token)
            task = await agent_role_tasks.submit(tx, actor, request)
            task_id, state = task.id, task.status
        self.receipts.append({"task_id": task_id, "role": role})
        if state == "queued":
            await self.dispatch(task_id, KIND)
        async with scope(token=token_hash(self.token)) as tx:
            actor = await customer_session(tx, self.token)
            view = await agent_role_tasks.read(tx, actor, task_id)
        if view["task"]["status"] != "succeeded":
            raise RunnerError("agent_role_calibration_task_incomplete")
        result = view["task"]["result"]
        self.receipts[-1].update(execution=view["execution"], result=result)
        return result

    async def prepare(self, campaign, case, now):
        self.validate(campaign, case)
        route = await self._submit("coordinator", campaign, case)
        research = await self._submit("research", campaign, case, route)
        qualified = await self._submit("qualification", campaign, case, research)
        if not qualified["output"]["eligible_for_draft"]:
            self.stop_cause = "not_qualified"
            return {
                "state": "exclude" if qualified["output"]["fit"] == "no" else "research",
                "external_sent": False,
                "assessment": research["output"],
            }
        writer = await self._submit("writer", campaign, case, qualified)
        quality = await self._submit("quality", campaign, case, writer)
        if not accepted(quality["output"]):
            self.stop_cause = "review_rejected"
            return {"state": "blocked", "external_sent": False, "assessment": writer["output"]}
        self.quality, self.capture = quality, quality["correspondence"]
        self.parent = self.capture["mail_id"]
        return {
            "state": "draft_ready",
            "assessment": writer["output"],
            "review": {key: quality["output"][key] for key in ReviewKeys},
            "external_sent": False,
            "reasons": [],
            "instruction_hash": compose(campaign.sector)[1],
            "reviewer_hash": compose(campaign.sector, "reviewer")[1],
            "contact_blocks": contact_blocks(case.prospect),
        }

    async def reply(self, campaign, case, transcript, now):
        if self.turn >= 1:
            raise RunnerError("agent_role_one_reply_limit")
        self.turn += 1
        async with scope(token=token_hash(self.token)) as tx:
            actor = await customer_session(tx, self.token)
            async with model_authority.current(
                tx, self.frozen["team"]["reply"]["authorization_id"], actor.id
            ) as work:
                current_scope, adapter = work.scope, work.authorization.adapter_id
                parent = await tx.get(MailMessage, self.parent)
                if parent is None:
                    raise RunnerError("agent_role_reply_parent_missing")
                known = {
                    parent.message_id: {
                        "id": parent.id,
                        "site": current_scope.site_id,
                        "case_id": parent.case_id,
                        "sender": parent.payload["sender"],
                        "recipient": parent.payload["recipient"],
                    }
                }
        message = EmailMessage()
        message["From"], message["To"] = case.recipient, "info@pinet.lt"
        message["Message-ID"] = f"<{uuid5(self.episode, 'inbound:1')}@example.test>"
        message["Subject"], message["In-Reply-To"], message["References"] = (
            "Re: requirements",
            parent.message_id,
            parent.message_id,
        )
        message.set_content(transcript[-1]["body"])
        incoming = await HeadlessMail(db).receive_authenticated_capture(
            raw=message.as_bytes(),
            known=known,
            scope=current_scope,
            adapter_id=adapter,
            request_id=uuid5(self.episode, "receive:1"),
            thread_id=self.capture["thread_id"],
            parent_mail_id=self.parent,
        )
        receipt = incoming["receipt"]
        async with db.transaction(current_scope.business_id, current_scope.environment_id) as tx:
            from .correspondence import Correspondence

            await Correspondence(db).locked(tx, current_scope, adapter)
            bound = await tx.scalar(select(MailBinding).where(MailBinding.mail_id == receipt["mail_id"]))
        mail = {
            "thread_id": self.capture["thread_id"],
            "inbound_id": receipt["mail_id"],
            "revision": receipt["revision"],
            "input_sha256": bound.input_sha256,
        }
        reply = await self._submit("reply", campaign, case, self.quality, mail)
        quality = await self._submit("quality", campaign, case, reply)
        await self._submit("coordinator", campaign, case, quality)
        decision = reply["output"]
        return {
            "state": decision["action"] if accepted(quality["output"]) else "blocked",
            "decision": decision,
            "review": {key: quality["output"][key] for key in ReviewKeys},
            "reasons": [],
            "external_sent": False,
            "marketing_suppression_required": decision["classification"] in {"refusal", "complaint"},
            "instruction_hash": fingerprint([compose(campaign.sector)[0], REPLY_INSTRUCTION]),
            "reviewer_hash": compose(campaign.sector, "reviewer")[1],
        }

    async def evaluate(self, evaluator, evaluation):
        self.evaluation_events = evaluation.get("events", [])
        return await evaluator.ask(SixRoleGrade, GRADE, evaluation)

    def grade_pass(self, grade):
        value = SixRoleGrade.model_validate(grade)
        executed = {row["role"] for row in self.receipts}
        for row in self.receipts:
            expected = self.frozen["bindings"][row["role"]]
            result, run = row.get("result", {}), row.get("execution") or {}
            if (
                any(
                    result.get(key) != expected[key]
                    for key in ("agent_id", "config_id", "config_revision", "config_sha256")
                )
                or run.get("status") != "succeeded"
                or not run.get("run_id")
                or run.get("model") != "gpt-6.1-sol"
                or run.get("effort") != "high"
                or (run.get("usage") or {}).get("model_calls") != 1
                or (run.get("usage") or {}).get("usage_complete") is not True
                or (run.get("usage") or {}).get("unknown_usage_calls") != 0
            ):
                return False
        if not all(getattr(value, key) for key in DialogueGrade.model_fields if key != "reason"):
            return False
        stopped = self.stop_cause is not None or any(
            event.get("kind") in {"silence", "signup"} for event in self.evaluation_events
        )
        return all(
            value.role_status[role] == "PASS"
            if role in executed
            else (
                stopped and value.role_status[role] == "NA" and bool(value.na_reasons.get(role, "").strip())
            )
            for role in ROLES
        )

    async def finalize_initial(self, row, evaluator, campaign, case):
        grade = await self.evaluate(
            evaluator,
            {
                "campaign": campaign.model_dump(mode="json"),
                "case": case.model_dump(mode="json"),
                "transcript": row["transcript"],
                "events": row["events"],
                "native_receipts": list(self.receipts),
                "native_provenance": self.provenance,
            },
        )
        row["grade"] = grade.model_dump(mode="json")
        row["grade_pass"] = self.grade_pass(row["grade"])
        row["passed"] = row["passed"] and row["grade_pass"]


ReviewKeys = (*REVIEW_FIELDS, "reason")


def main():
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Offline sealed six-role corpus validation; no dispatch")
    parser.add_argument("action", choices=["validate-corpus"])
    parser.add_argument("--path", required=True, help="Absolute file under this runtime/artifacts")
    parser.add_argument("--sha256", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(validate_corpus_file(args.path, args.sha256)))
    except (RunnerError, OSError, ValueError, TypeError):
        print(
            json.dumps(
                {
                    "state": "OFFLINE_SIX_ROLE_CORPUS_INVALID",
                    "private_text_exported": False,
                    "database_calls": 0,
                    "model_calls": 0,
                }
            )
        )
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
