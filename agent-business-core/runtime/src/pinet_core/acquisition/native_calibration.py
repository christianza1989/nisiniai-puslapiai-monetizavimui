"""Frozen acquisition provenance and native hooks for the ONE maintained dialogue lab.

This never admits a model or creates an allowance. Runtime dispatch is supplied by
the source-owned caller; private persona/expected labels never enter Task inputs.
"""
import hashlib
import json
from email.message import EmailMessage
from pathlib import Path
from uuid import UUID, uuid5

from sqlalchemy import select

from ..control.routes import scope, token_hash
from ..customer_text.service import customer_session
from ..db import db
from ..models import MailMessage
from ..tasks.codex import RunnerError
from . import model_authority, model_tasks
from .contracts import Campaign
from .dialogue_lab import GRADE_INSTRUCTION, LabCase, validate_synthetic
from .engine import fingerprint
from .headless_mail import HeadlessMail
from .model_contract import KIND, REPLY_KIND, CalibrationReference, NativePair
from .native_chain import campaign_lineage
from .work_models import MailBinding

ROOT = Path(__file__).resolve().parents[3]/"artifacts"


def manifest(reference):
    ref = CalibrationReference.model_validate(reference)
    path = Path(ref.manifest_path)
    if (not path.is_absolute() or path.is_symlink() or any(p.is_symlink() for p in path.parents)
            or not path.resolve().is_relative_to(ROOT.resolve()) or not path.is_file() or path.stat().st_size > 1048576):
        raise RunnerError("private_native_manifest_required")
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != ref.manifest_sha256:
        raise RunnerError("native_manifest_changed")
    value = json.loads(raw)
    if (set(value) != {"version", "source_revision", "native", "bindings", "campaign", "cases", "corpus_sha256", "evaluator_hash"}
            or value["version"] != "acquisition-native-calibration.v1"
            or value["corpus_sha256"] != fingerprint(value["cases"])
            or value["evaluator_hash"] != fingerprint(GRADE_INSTRUCTION)
            or not 6 <= len(value["cases"]) <= 100):
        raise RunnerError("native_manifest_invalid")
    NativePair.model_validate(value["native"])
    campaign = Campaign.model_validate(value["campaign"])
    cases = [LabCase.model_validate(case) for case in value["cases"]]
    for case in cases:
        validate_synthetic(campaign, case)
    if (len({case.id for case in cases}) != len(cases)
            or len({fingerprint(case.persona) for case in cases}) != len(cases)
            or sum(case.split == "train" for case in cases) < 1
            or sum(case.split == "holdout" for case in cases) < 3):
        raise RunnerError("native_protected_split_invalid")
    selected = next((case for case in cases if case.id == ref.case_id), None)
    if selected is None:
        raise RunnerError("native_protected_case_invalid")
    return value, selected


def verify_reference(value, bindings, source_revision):
    frozen, case = manifest(value.calibration)
    if (frozen["source_revision"] != source_revision or frozen["native"] != value.native.model_dump(mode="json")
            or frozen["bindings"] != bindings or case.prospect != value.prospect or case.recipient != value.recipient
            or campaign_lineage(Campaign.model_validate(frozen["campaign"])) != campaign_lineage(value.campaign)):
        raise RunnerError("native_protected_binding_changed")


class NativeWorkflow:
    """Trusted test adapter; each phase uses normal-owner admission and common worker."""
    def __init__(self, *, token, reference, episode_id, dispatch):
        self._token, self.reference = token, CalibrationReference.model_validate(reference)
        self.frozen, self.case = manifest(self.reference)
        self.episode = UUID(str(episode_id))
        self.dispatch, self.receipts, self.initial, self.parent, self.turn = dispatch, [], None, None, 0

    async def _submit(self, request, *, reply=False):
        async with scope(token=token_hash(self._token)) as tx:
            actor = await customer_session(tx, self._token)
            task = await (model_tasks.submit_reply if reply else model_tasks.submit)(tx, actor, request)
            identity = task.id
        self.receipts.append({"task_id": identity, "request_id": request["request_id"], "phase": "reply" if reply else request["stage"]})
        await self.dispatch(identity, REPLY_KIND if reply else KIND)
        async with scope(token=token_hash(self._token)) as tx:
            actor = await customer_session(tx, self._token)
            view = await model_tasks.read(tx, actor, identity)
        if view["task"]["status"] != "succeeded":
            raise RunnerError("native_calibration_task_not_completed")
        result = view["task"]["result"]
        self.receipts[-1].update(execution=view["execution"], result=result)
        return identity, result

    async def prepare(self, campaign, case, now):
        if case != self.case or campaign != Campaign.model_validate(self.frozen["campaign"]):
            raise RunnerError("native_protected_case_invalid")
        base = {"native": self.frozen["native"], "calibration": self.reference.model_dump(mode="json"),
            "recipient": case.recipient, "prospect": case.prospect.model_dump(mode="json")}
        research = {**base, "request_id": str(uuid5(self.episode, "research")), "stage": "research",
            "authorization_id": base["native"]["research_authorization_id"],
            "campaign": campaign.model_copy(update={"mode": "research_only"}).model_dump(mode="json")}
        _, result = await self._submit(research)
        qualification = result["prepared"]["assessment"]
        if result["state"] == "blocked" or qualification["fit"] != "yes" or qualification["next_action"] != "research":
            return result["prepared"]
        email = {**base, "request_id": str(uuid5(self.episode, "email")), "stage": "email",
            "authorization_id": base["native"]["email_authorization_id"], "handoff": result["handoff"],
            "campaign": campaign.model_dump(mode="json")}
        self.initial, result = await self._submit(email)
        self.parent = result.get("mail_id")
        self.capture = result
        return result["prepared"]

    async def reply(self, campaign, case, transcript, now):
        self.turn += 1
        async with scope(token=token_hash(self._token)) as tx:
            actor = await customer_session(tx, self._token)
            async with model_authority.current(tx, self.frozen["native"]["email_authorization_id"], actor.id) as work:
                actual_scope, adapter = work.scope, work.authorization.adapter_id
                parent = await tx.get(MailMessage, self.parent)
                if parent is None:
                    raise RunnerError("native_calibration_mail_unavailable")
                known = {parent.message_id: {"id": parent.id, "site": actual_scope.site_id, "case_id": parent.case_id,
                    "sender": parent.payload["sender"], "recipient": parent.payload["recipient"]}}
        message = EmailMessage()
        message["From"], message["To"] = case.recipient, "info@pinet.lt"
        message["Message-ID"] = f"<{uuid5(self.episode, 'inbound:'+str(self.turn))}@example.test>"
        message["Subject"], message["In-Reply-To"], message["References"] = "Re: requirements", parent.message_id, parent.message_id
        message.set_content(transcript[-1]["body"])
        service = HeadlessMail(db)
        received = await service.receive_authenticated_capture(raw=message.as_bytes(), known=known, scope=actual_scope,
            adapter_id=adapter, request_id=uuid5(self.episode, "receive:"+str(self.turn)),
            thread_id=self.capture["thread_id"], parent_mail_id=self.parent)
        receipt = received["receipt"]
        async with db.transaction(actual_scope.business_id, actual_scope.environment_id) as tx:
            await service.correspondence.locked(tx, actual_scope, adapter)
            bound = await tx.scalar(select(MailBinding).where(MailBinding.mail_id == receipt["mail_id"]))
        request = {"request_id": str(uuid5(self.episode, "reply:"+str(self.turn))),
            "authorization_id": self.frozen["native"]["email_authorization_id"], "native": self.frozen["native"],
            "calibration": self.reference.model_dump(mode="json"), "prepare_task_id": self.initial,
            "thread_id": receipt["thread_id"], "inbound_id": receipt["mail_id"], "revision": receipt["revision"],
            "input_sha256": bound.input_sha256}
        _, result = await self._submit(request, reply=True)
        self.parent = result.get("outbound_mail_id") or self.parent
        return result.get("prepared", result)
