"""Native reply preparation on the existing Task/Run and canonical Case."""
import json
from datetime import datetime

from sqlalchemy import cast, select, text
from sqlalchemy.dialects.postgresql import JSONB

from ..creation.service import digest
from ..db import db
from ..tasks.codex import RunnerError
from ..tasks.models import Task
from .contracts import Review
from .correspondence import Correspondence
from .dialogue import REPLY_INSTRUCTION, ReplyDecision, prepare_reply
from .engine import fingerprint
from .headless import HeadlessRoles
from .headless_mail import HeadlessMail
from .instructions import compose
from .ledger import conditions
from .model_contract import KIND, REPLY_ADAPTER, REPLY_KIND, PrepareModel, ReplyInput
from .model_handler import ModelHandler, TaskRole, observed_total, preflight
from .model_models import ModelAttempt, ModelTaskBinding
from .native_chain import REVIEW_FIELDS, guard
from .work_models import WorkReceipt


async def reply_context(tx, work, value):
    service = HeadlessMail(db)
    context = await service.reply_context(tx, scope=work.scope, adapter_id=work.authorization.adapter_id,
        thread_id=value.thread_id, inbound_id=value.inbound_id)
    task = await tx.get(Task, str(value.prepare_task_id), populate_existing=True)
    bound = await tx.get(ModelTaskBinding, str(value.prepare_task_id), populate_existing=True)
    if (not task or not bound or task.kind != KIND or task.status != "succeeded"
            or not isinstance(task.result, dict) or task.result.get("case_id") != context["thread"].case_id
            or digest(bound.input) != bound.input_sha256):
        raise RunnerError("acquisition_reply_parent_invalid")
    upstream = PrepareModel.model_validate(bound.input)
    if (upstream.stage != "email" or upstream.native != value.native or upstream.calibration != value.calibration
            or str(upstream.authorization_id) != work.authorization.id
            or upstream.campaign != context["campaign"] or upstream.prospect != context["prospect"]):
        raise RunnerError("acquisition_reply_parent_invalid")
    applied = str(value.request_id) in tx.info.get("acquisition_reply_applied", set())
    if (context["binding"].input_sha256 != value.input_sha256
            or (not applied and context["thread"].revision != value.revision)):
        raise RunnerError("correspondence_decision_stale")
    prior = await tx.scalar(select(WorkReceipt).where(*conditions(WorkReceipt, context["values"]),
        WorkReceipt.operation == "decision", WorkReceipt.thread_id == str(value.thread_id),
        cast(WorkReceipt.response_body, JSONB)["mail_id"].astext == str(value.inbound_id)))
    if (applied and prior is None) or (prior is not None and (not applied or prior.request_id != str(value.request_id))):
        raise RunnerError("acquisition_reply_already_decided")
    if isinstance(value, ReplyInput) and (value.campaign != context["campaign"] or value.prospect != context["prospect"]
            or value.recipient != upstream.recipient):
        raise RunnerError("acquisition_reply_input_changed")
    context["recipient"] = upstream.recipient
    return context


class ReplyHandler(ModelHandler):
    kind, adapter_revision = REPLY_KIND, REPLY_ADAPTER

    async def actors(self):
        try:
            guard()
        except RunnerError:
            return []
        return await super().actors()

    async def context(self, tx, task):
        from . import model_adapter
        if not model_adapter.runner_ready():
            raise RunnerError("runner_unavailable")
        bound, value, work = await preflight(tx, task)
        context = await reply_context(tx, work, value)
        return {"_task_id": task.id, "_user_id": task.user_id, "_authorization_id": bound.authorization_id,
            "_stage": "reply", "request": value.model_dump(mode="json"), "specification": work.specification,
            "transcript": context["transcript"], "suppressed": context["suppressed"],
            "now": context["now"].isoformat(), "deadline": tx.info["acquisition_model_deadlines"][task.id].isoformat()}

    async def run(self, context, heartbeat, adapter=None):
        from . import model_adapter
        if not await heartbeat():
            raise RunnerError("authorization_revoked")
        value = ReplyInput.model_validate(context["request"])
        roles = {name: TaskRole(context, name, heartbeat, adapter or model_adapter.run_role)
            for name in ("reply_coordinator", "reviewer")}
        try:
            result = await prepare_reply(value.campaign, value.prospect, context["transcript"], HeadlessRoles(roles),
                datetime.fromisoformat(context["now"]), suppressed=context["suppressed"])
            return result, observed_total(context)
        except Exception as error:
            raise RunnerError(getattr(error, "code", "acquisition_model_result_invalid"), observed_total(context)) from None

    async def complete(self, tx, task, result):
        _, value, work = await preflight(tx, task)
        context = await reply_context(tx, work, value)
        rows = list(await tx.scalars(select(ModelAttempt).where(ModelAttempt.task_id == task.id,
            ModelAttempt.run_id == task.run_id).order_by(ModelAttempt.ordinal)))
        if not rows and context["suppressed"] and result == {"state": "stop", "external_sent": False, "reasons": ["suppressed"]}:
            return result
        if ([row.role for row in rows] not in [["reply_coordinator"], ["reply_coordinator", "reviewer"]]
                or any(row.state != "succeeded" or row.output is None for row in rows)
                or not isinstance(result, dict) or result.get("decision") != rows[0].output
                or result.get("instruction_hash") != fingerprint([compose(value.campaign.sector)[0], REPLY_INSTRUCTION])
                or result.get("reviewer_hash") != compose(value.campaign.sector, "reviewer")[1]
                or result.get("review") != (rows[-1].output if len(rows) == 2 else None)):
            raise RunnerError("acquisition_model_result_unverified")
        decision = ReplyDecision.model_validate(rows[0].output)
        reviewed = None
        if decision.action in {"reply", "invite", "privacy_reply"}:
            if len(rows) != 2 or not all(getattr(Review.model_validate(rows[-1].output), key) for key in REVIEW_FIELDS):
                if decision.classification not in {"refusal", "complaint"}:
                    return {"state": "blocked", "prepared": result, "external_sent": False}
                decision = ReplyDecision(classification=decision.classification,
                    action="privacy_handoff" if decision.privacy_request_quote else "stop", subject="", body="",
                    offer_fact_ids=[], privacy_request_quote=decision.privacy_request_quote,
                    reason="Failed exact-copy review; retain recognized containment")
            else:
                reviewed = result
        async def before_effect(transaction):
            await preflight(transaction, task)
            now = await transaction.scalar(text("SELECT clock_timestamp()"))
            if task.status != "running" or not task.lease_until or task.lease_until <= now:
                raise RunnerError("authorization_revoked")
        response = await Correspondence(db).apply_decision(scope=work.scope, adapter_id=work.authorization.adapter_id,
            request_id=value.request_id, thread_id=str(value.thread_id), inbound_id=str(value.inbound_id),
            revision=value.revision, input_sha256=value.input_sha256, decision=decision,
            instruction_hash=result["instruction_hash"], reviewed_reply=reviewed, transaction=tx, before_effect=before_effect)
        tx.info.setdefault("acquisition_reply_applied", set()).add(str(value.request_id))
        receipt = json.loads(response.body)
        _, outbound_id = await HeadlessMail(db)._outbound(tx, work.scope, context["values"],
            context["thread"], value.request_id, str(value.inbound_id))
        return {"state": receipt["state"], "prepared": result, "receipt": receipt, "outbound_mail_id": outbound_id,
            "external_sent": False, "synthetic": True}
