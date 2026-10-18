"""Canonical durable capture and containment. No transport/model/discovery calls.

capture_reviewed/apply_decision are trusted runner boundaries, never browser
commands. They retain supplied reviewed copy; they do not prove a real model run.
"""

import hashlib
import json
import re
from contextlib import asynccontextmanager
from types import SimpleNamespace

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import cast, false, select, text
from sqlalchemy.dialects.postgresql import JSONB

from ..models import Business, Case, CaseSource, MailMessage, new_id
from .contracts import Assessment, Campaign, Prospect, Review
from .dialogue import REPLY_INSTRUCTION, ReplyDecision, reply_blocks
from .engine import contact_blocks, fingerprint, gates, validate_assessment
from .instructions import compose
from .ledger import AcquisitionLedger, LedgerError, Reply, apply_scope, conditions, scope_values
from .models import AcquisitionCampaign
from .module_models import ModuleBinding
from .normal import authorize_fresh_command
from .work_interfaces import CorrespondenceReceipt, InboundCapture, SyntheticAddress
from .work_models import ContactPolicy, CorrespondenceThread, MailBinding, WorkReceipt

_SYNTHETIC_ADDRESS = TypeAdapter(SyntheticAddress)
REVIEWED_CAPTURE_HOLD = "initial_reviewed_capture_no_marketing"


def seal(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()


def recipient_hash(value):
    # Private synthetic identity key, shared across campaigns in one exact scope.
    try:
        _SYNTHETIC_ADDRESS.validate_python(value)
    except ValidationError:
        raise LedgerError(422, "synthetic_recipient_required") from None
    return seal(["acquisition-correspondence-recipient.v1", value])


def reviewed_copy(campaign, prospect, prepared):
    """Validate exact existing engine result; this does not authenticate its producer."""
    try:
        assessment = Assessment.model_validate(prepared["assessment"])
        review = Review.model_validate(prepared["review"])
        valid = (
            prepared["external_sent"] is False
            and prepared["state"] == "draft_ready"
            and not prepared["reasons"]
            and assessment.next_action == "draft"
            and not validate_assessment(campaign, prospect, assessment)
            and all(
                getattr(review, key)
                for key in (
                    "factual",
                    "relevant",
                    "one_clear_next_step",
                    "no_unverified_promises",
                    "no_source_instructions",
                )
            )
            and prepared["instruction_hash"] == compose(campaign.sector)[1]
            and prepared["reviewer_hash"] == compose(campaign.sector, "reviewer")[1]
            and prepared["contact_blocks"] == contact_blocks(prospect)
            and not re.search(r"[\x00-\x1f\x7f]", assessment.subject)
        )
    except (KeyError, TypeError, ValueError):
        valid = False
    if not valid:
        raise LedgerError(409, "exact_reviewed_copy_required")
    return assessment


def own_capture_condition(values, request_id, recipient, campaign, prospect):
    """Only the exact capture may finish its own atomic held draft.

    This is not a new contact approval. A different request/campaign, later
    inbound, changed policy or reused recipient cannot satisfy this predicate.
    No caller-supplied boolean can substitute for canonical retained rows.
    """
    if request_id is None:
        return false()
    return select(WorkReceipt.thread_id).where(
        *conditions(WorkReceipt, values), *conditions(CorrespondenceThread, values),
        *conditions(ContactPolicy, values), WorkReceipt.operation == "capture",
        WorkReceipt.request_id == str(request_id),
        WorkReceipt.thread_id == CorrespondenceThread.thread_id,
        CorrespondenceThread.recipient_hash == recipient_hash(recipient),
        CorrespondenceThread.recipient_hash == ContactPolicy.recipient_hash,
        CorrespondenceThread.campaign_id == campaign.campaign_id,
        CorrespondenceThread.prospect_id == prospect.organization_key,
        CorrespondenceThread.campaign == campaign.model_dump(mode="json"),
        CorrespondenceThread.prospect == prospect.model_dump(mode="json"),
        CorrespondenceThread.revision == 1, CorrespondenceThread.last_inbound_id.is_(None),
        ContactPolicy.state == "hold", ContactPolicy.reason == REVIEWED_CAPTURE_HOLD,
        ContactPolicy.updated_at == WorkReceipt.created_at,
        CorrespondenceThread.created_at == WorkReceipt.created_at,
    ).exists()


class Correspondence:
    def __init__(self, database):
        self.database = database

    @asynccontextmanager
    async def capture_transaction(self, scope, transaction):
        if transaction is None:
            async with self.database.transaction(scope.business_id, scope.environment_id) as tx:
                yield tx
        else:
            # Only the internal worker supplies a transaction. Canonical effect
            # and task terminal state then share one commit, without a send step.
            await transaction.execute(text("SELECT set_config('pinet.business',:b,true),set_config('pinet.environment',:e,true)"),
                                      {"b": scope.business_id, "e": scope.environment_id})
            yield transaction

    async def locked(self, tx, scope, adapter, *, campaign_id=None):
        if scope.environment_class != "test":
            raise LedgerError(403, "synthetic_scope_required")
        await apply_scope(tx, scope, adapter)
        values = scope_values(scope, adapter)
        await tx.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
            {"key": "acquisition-work:" + json.dumps(values, sort_keys=True)},
        )
        # Same canonical order as invitation preparation/events: campaign before
        # module/identity barriers. A second namespace lock is not a shared lock.
        if campaign_id is not None:
            await AcquisitionLedger._lock(tx, ["campaign", values, campaign_id])
        pinned = await tx.scalar(
            text("SELECT acquisition_pin_module(:b,:e,:s,:a)"),
            {"b": scope.business_id, "e": scope.environment_id, "s": scope.site_id, "a": adapter},
        )
        business = await tx.get(Business, scope.business_id)
        if not pinned or not business or business.site_id != scope.site_id:
            raise LedgerError(403, "acquisition_module_denied")
        return values

    async def admission(self, tx, scope, adapter):
        # Reuse current owner/grant/source/DB-clock locks, adding the separate purpose.
        now = await authorize_fresh_command(tx, "capture", SimpleNamespace(scope=scope, adapter_id=adapter))
        module = await tx.get(ModuleBinding, (scope.business_id, scope.environment_id))
        if "acquisition.correspondence" not in module.permissions:
            raise LedgerError(403, "correspondence_permission_denied")
        return now, module.source_revision

    async def replay(self, tx, values, operation, request_id, body_hash):
        receipt = await tx.get(WorkReceipt, {**values, "operation": operation, "request_id": str(request_id)})
        if receipt:
            if receipt.body_sha256 != body_hash:
                raise LedgerError(409, "correspondence_replay_conflict")
            return Reply(receipt.response_body)
        return None

    async def commit_receipt(
        self, tx, values, operation, request_id, body_hash, thread, mail, policy, now, state, **extra
    ):
        receipt = CorrespondenceReceipt(
            thread_id=thread.thread_id,
            case_id=thread.case_id,
            mail_id=mail.id,
            revision=thread.revision,
            state=state,
            marketing_state=policy.state,
            **extra,
        )
        raw = receipt.model_dump_json()
        tx.add(
            WorkReceipt(
                **values,
                operation=operation,
                request_id=str(request_id),
                body_sha256=body_hash,
                response_body=raw,
                thread_id=thread.thread_id,
                created_at=now,
            )
        )
        await tx.flush()
        return Reply(raw)

    async def capture_reviewed(
        self, *, scope, adapter_id, request_id, recipient, campaign, prospect, prepared,
        transaction=None, before_effect=None
    ):
        """Trusted typed worker only. No HTTP endpoint accepts an arbitrary review."""
        assessment = reviewed_copy(campaign, prospect, prepared)
        identity = recipient_hash(recipient)
        input_hash = seal(
            {
                "recipient": recipient,
                "campaign": campaign.model_dump(mode="json"),
                "prospect": prospect.model_dump(mode="json"),
                "prepared": prepared,
            }
        )
        async with self.capture_transaction(scope, transaction) as tx:
            values = await self.locked(tx, scope, adapter_id, campaign_id=campaign.campaign_id)
            replay = await self.replay(tx, values, "capture", request_id, input_hash)
            if replay:
                return replay
            now, source = await self.admission(tx, scope, adapter_id)
            if campaign.site_id != scope.site_id or gates(campaign, prospect, now):
                raise LedgerError(409, "correspondence_offer_unavailable")
            campaign_row = await tx.get(
                AcquisitionCampaign, {**values, "campaign_id": campaign.campaign_id}, with_for_update=True
            )
            if campaign_row and campaign_row.stopped:
                raise LedgerError(409, "acquisition_campaign_stopped")
            if not campaign_row:
                tx.add(
                    AcquisitionCampaign(
                        **values, campaign_id=campaign.campaign_id, stopped=False, created_at=now
                    )
                )
                await tx.flush()
            policy = await tx.get(ContactPolicy, {**values, "recipient_hash": identity}, with_for_update=True)
            if policy and policy.state != "active":
                raise LedgerError(409, "recipient_marketing_contained")
            existing = await tx.scalar(
                select(CorrespondenceThread).where(
                    *conditions(CorrespondenceThread, values),
                    CorrespondenceThread.campaign_id == campaign.campaign_id,
                    CorrespondenceThread.prospect_id == prospect.organization_key,
                )
            )
            if existing:
                raise LedgerError(409, "correspondence_thread_exists")
            # Campaign/policy reads may wait. Recheck actual DB clock after all
            # existing-row barriers; a pre-wait approval clock is not authority.
            now, source = await self.admission(tx, scope, adapter_id)
            if gates(campaign, prospect, now):
                raise LedgerError(409, "correspondence_offer_unavailable")
            if before_effect is not None:
                await before_effect(tx)
            # Copy quality never grants future outreach. Defer this effect
            # until the fresh before_effect fence has observed the old state.
            if policy is None:
                policy = ContactPolicy(**values, recipient_hash=identity, state="hold", revision=1,
                    reason=REVIEWED_CAPTURE_HOLD, resume_condition_quote="", updated_at=now)
                tx.add(policy)
            else:
                policy.state, policy.reason = "hold", REVIEWED_CAPTURE_HOLD
                policy.resume_condition_quote = ""
                policy.revision += 1
                policy.updated_at = now
            await tx.flush()
            case = Case(
                id=new_id(),
                business_id=scope.business_id,
                environment_id=scope.environment_id,
                payload={"source": "acquisition_capture", "synthetic": True, "external_sent": False},
            )
            tx.add(case)
            await tx.flush()
            thread = CorrespondenceThread(
                **values,
                thread_id=new_id(),
                case_id=case.id,
                recipient_hash=identity,
                campaign_id=campaign.campaign_id,
                prospect_id=prospect.organization_key,
                source_revision=source,
                campaign=campaign.model_dump(mode="json"),
                prospect=prospect.model_dump(mode="json"),
                revision=1,
                last_inbound_id=None,
                created_at=now,
            )
            tx.add(thread)
            await tx.flush()
            mail = MailMessage(
                id=new_id(),
                business_id=scope.business_id,
                environment_id=scope.environment_id,
                case_id=case.id,
                message_id=f"<{new_id()}@pinet.lt>",
                direction="outbound",
                state="captured",
                payload={
                    "sender": "info@pinet.lt",
                    "recipient": recipient,
                    "subject": assessment.subject,
                    "body": assessment.body,
                    "source_ref": "acquisition_capture",
                    "synthetic": True,
                    "customer_facing": False,
                    "external_sent": False,
                    "reviewed_input_sha256": input_hash,
                },
            )
            tx.add(mail)
            await tx.flush()
            tx.add(
                MailBinding(
                    **values,
                    mail_id=mail.id,
                    thread_id=thread.thread_id,
                    direction="outbound",
                    payload_sha256=seal(mail.payload),
                    input_sha256=input_hash,
                    created_at=now,
                )
            )
            tx.add(
                CaseSource(
                    id=new_id(),
                    business_id=scope.business_id,
                    environment_id=scope.environment_id,
                    case_id=case.id,
                    source_system="acquisition_capture",
                    site_id=scope.site_id,
                    source_record_id=thread.thread_id,
                    payload={"adapter_id": adapter_id, "synthetic": True},
                )
            )
            return await self.commit_receipt(
                tx, values, "capture", request_id, input_hash, thread, mail, policy, now, "captured"
            )

    async def bound_mail(self, tx, values, thread, mail_id, direction):
        binding = await tx.get(MailBinding, {**values, "mail_id": mail_id})
        mail = await tx.scalar(
            select(MailMessage).where(MailMessage.id == mail_id).with_for_update(read=True)
        )
        if (
            not binding
            or not mail
            or binding.thread_id != thread.thread_id
            or binding.direction != direction
            or mail.case_id != thread.case_id
            or mail.direction != direction
            or mail.business_id != values["business_id"]
            or mail.environment_id != values["environment_id"]
            or mail.state != "captured"
            or not mail.payload.get("synthetic")
            or mail.payload.get("external_sent") is not False
            or binding.payload_sha256 != seal(mail.payload)
        ):
            raise LedgerError(409, "correspondence_mail_binding_invalid")
        return mail, binding

    async def receive(self, value: InboundCapture, raw: bytes):
        # Exact wire bytes were authenticated by the dedicated inbound transport.
        if InboundCapture.model_validate_json(raw) != value:
            raise LedgerError(422, "correspondence_body_mismatch")
        body_hash = hashlib.sha256(raw).hexdigest()
        scope, adapter = value.scope, value.adapter_id
        async with self.database.transaction(scope.business_id, scope.environment_id) as tx:
            values = await self.locked(tx, scope, adapter)
            replay = await self.replay(tx, values, "inbound", value.request_id, body_hash)
            if replay:
                return replay
            # Known inbound + containment survives marketing admission expiry/stop.
            thread = await tx.get(
                CorrespondenceThread, {**values, "thread_id": value.thread_id}, with_for_update=True
            )
            if not thread:
                raise LedgerError(404, "correspondence_thread_unavailable")
            parent, _ = await self.bound_mail(tx, values, thread, value.parent_mail_id, "outbound")
            if (
                value.sender != parent.payload["recipient"]
                or value.recipient != parent.payload["sender"]
                or recipient_hash(value.sender) != thread.recipient_hash
                or value.in_reply_to != parent.message_id
                or (value.references and parent.message_id not in value.references)
            ):
                raise LedgerError(403, "correspondence_participant_mismatch")
            await tx.execute(
                text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
                {
                    "key": f"acquisition-work-message:{scope.business_id}:{scope.environment_id}:{value.message_id}"
                },
            )
            if await tx.scalar(select(MailMessage.id).where(MailMessage.message_id == value.message_id)):
                raise LedgerError(409, "correspondence_message_id_conflict")
            policy = await tx.get(
                ContactPolicy, {**values, "recipient_hash": thread.recipient_hash}, with_for_update=True
            )
            now = await tx.scalar(text("SELECT clock_timestamp()"))
            if policy.state != "stopped":
                policy.state, policy.reason = "hold", "incoming_reply_pending_review"
            policy.revision += 1
            policy.updated_at = now
            mail = MailMessage(
                id=new_id(),
                business_id=scope.business_id,
                environment_id=scope.environment_id,
                case_id=thread.case_id,
                message_id=value.message_id,
                direction="inbound",
                state="captured",
                payload={
                    "sender": value.sender,
                    "recipient": value.recipient,
                    "subject": value.subject,
                    "body": value.body,
                    "in_reply_to": value.in_reply_to,
                    "references": list(value.references),
                    "source_ref": "acquisition_inbound_capture",
                    "synthetic": True,
                    "customer_facing": False,
                    "external_sent": False,
                },
            )
            tx.add(mail)
            await tx.flush()
            tx.add(
                MailBinding(
                    **values,
                    mail_id=mail.id,
                    thread_id=thread.thread_id,
                    direction="inbound",
                    payload_sha256=seal(mail.payload),
                    input_sha256=body_hash,
                    created_at=now,
                )
            )
            thread.revision += 1
            thread.last_inbound_id = mail.id
            case = await tx.get(Case, thread.case_id, with_for_update=True)
            case.payload = {
                **case.payload,
                "acquisition": {
                    "thread_id": thread.thread_id,
                    "marketing_state": policy.state,
                    "last_inbound_id": mail.id,
                    "revision": thread.revision,
                },
            }
            return await self.commit_receipt(
                tx, values, "inbound", value.request_id, body_hash, thread, mail, policy, now, "held"
            )

    async def apply_decision(
        self,
        *,
        scope,
        adapter_id,
        thread_id,
        inbound_id,
        revision,
        input_sha256,
        request_id,
        decision: ReplyDecision,
        instruction_hash,
        reviewed_reply=None,
        transaction=None,
        before_effect=None,
    ):
        """Trusted worker commit. Stale model results cannot replace newer inbound.

        This slice persists containment and actual privacy Case acknowledgement.
        Reply-ready means prepared only: no outbound/sending or automatic resume.
        """
        input_value = {
                "thread_id": thread_id,
                "inbound_id": inbound_id,
                "revision": revision,
                "input_sha256": input_sha256,
                "decision": decision.model_dump(),
                "instruction_hash": instruction_hash,
            }
        review = None
        if reviewed_reply is not None:
            try:
                review = Review.model_validate(reviewed_reply['review'])
                valid = (reviewed_reply['state'] == decision.action and not reviewed_reply['reasons']
                    and reviewed_reply['external_sent'] is False
                    and reviewed_reply['decision'] == decision.model_dump()
                    and reviewed_reply['instruction_hash'] == instruction_hash
                    and all(getattr(review, key) for key in ('factual', 'relevant', 'one_clear_next_step',
                        'no_unverified_promises', 'no_source_instructions')))
            except (KeyError, TypeError, ValueError):
                valid = False
            if not valid:
                raise LedgerError(409, 'exact_reviewed_reply_required')
            input_value['reviewed_reply'] = reviewed_reply
        body_hash = seal(input_value)
        async with self.capture_transaction(scope, transaction) as tx:
            campaign_id = None
            if decision.action in {"reply", "invite", "privacy_reply"}:
                await apply_scope(tx, scope, adapter_id)
                hint = await tx.get(
                    CorrespondenceThread, {**scope_values(scope, adapter_id), "thread_id": thread_id}
                )
                if hint:
                    campaign_id = hint.campaign_id
            values = await self.locked(tx, scope, adapter_id, campaign_id=campaign_id)
            replay = await self.replay(tx, values, "decision", request_id, body_hash)
            if replay:
                return replay
            thread = await tx.get(
                CorrespondenceThread,
                {**values, "thread_id": thread_id},
                with_for_update=True,
                populate_existing=True,
            )
            if not thread or thread.last_inbound_id != inbound_id or thread.revision != revision:
                raise LedgerError(409, "correspondence_decision_stale")
            if campaign_id is not None and campaign_id != thread.campaign_id:
                raise LedgerError(409, "correspondence_decision_stale")
            committed = await tx.scalar(
                select(WorkReceipt.request_id)
                .where(
                    *conditions(WorkReceipt, values),
                    WorkReceipt.operation == "decision",
                    WorkReceipt.thread_id == thread_id,
                    cast(WorkReceipt.response_body, JSONB)["mail_id"].astext == inbound_id,
                )
                .limit(1)
            )
            if committed:
                raise LedgerError(409, "correspondence_decision_already_committed")
            mail, binding = await self.bound_mail(tx, values, thread, inbound_id, "inbound")
            if binding.input_sha256 != input_sha256:
                raise LedgerError(409, "correspondence_decision_input_changed")
            campaign, prospect = (
                Campaign.model_validate(thread.campaign),
                Prospect.model_validate(thread.prospect),
            )
            expected = fingerprint([compose(campaign.sector)[0], REPLY_INSTRUCTION])
            if instruction_hash != expected:
                raise LedgerError(409, "correspondence_instructions_changed")
            if reviewed_reply is not None and reviewed_reply.get('reviewer_hash') != compose(campaign.sector, 'reviewer')[1]:
                raise LedgerError(409, 'correspondence_reviewer_changed')
            reasons = reply_blocks(campaign, decision, prospect, mail.payload["body"])
            policy = await tx.get(
                ContactPolicy, {**values, "recipient_hash": thread.recipient_hash}, with_for_update=True
            )
            now = await tx.scalar(text("SELECT clock_timestamp()"))
            if decision.classification in {"refusal", "complaint"} or decision.action == "stop":
                policy.state, policy.reason = "stopped", "recipient_refusal_or_stop"
            elif policy.state != "stopped":
                policy.state, policy.reason = "hold", "reply_reviewed_no_resume"
            if decision.action == "hold" and not reasons and decision.resume_condition_quote:
                policy.resume_condition_quote = decision.resume_condition_quote
                if policy.state != "stopped":
                    policy.reason = "conditional_future_contact"
            handoff = decision.action == "privacy_handoff" and not reasons
            case = await tx.get(Case, thread.case_id, with_for_update=True)
            if handoff:
                # A real canonical Case + CaseSource commits atomically with ACK.
                source_id = "privacy-" + inbound_id
                tx.add(
                    CaseSource(
                        id=new_id(),
                        business_id=scope.business_id,
                        environment_id=scope.environment_id,
                        case_id=case.id,
                        source_system="acquisition_privacy_handoff",
                        site_id=scope.site_id,
                        source_record_id=source_id,
                        payload={
                            "inbound_id": inbound_id,
                            "input_sha256": input_sha256,
                            "request_quote": decision.privacy_request_quote,
                            "operator_required": True,
                            "synthetic": True,
                            "external_sent": False,
                        },
                    )
                )
                case.payload = {
                    **case.payload,
                    "privacy_request": {
                        "status": "operator_required",
                        "inbound_id": inbound_id,
                        "request_quote": decision.privacy_request_quote,
                        "source_record_id": source_id,
                        "external_sent": False,
                    },
                }
            state = (
                "blocked"
                if reasons
                else (
                    "reply_ready"
                    if decision.action in {"reply", "invite", "privacy_reply"}
                    else decision.action
                )
            )
            # Replies cannot bypass current marketing authority; containment above
            # never requires a marketing model/transport call or live permission.
            if state == "reply_ready":
                try:
                    if policy.state == "stopped" and decision.action in {"reply", "invite"}:
                        raise LedgerError(409, "recipient_marketing_contained")
                    fresh, source = await self.admission(tx, scope, adapter_id)
                    if thread.source_revision != source or gates(campaign, prospect, fresh):
                        raise LedgerError(409, "correspondence_offer_unavailable")
                    campaign_row = await tx.get(
                        AcquisitionCampaign,
                        {**values, "campaign_id": campaign.campaign_id},
                        with_for_update=True,
                    )
                    if not campaign_row or campaign_row.stopped:
                        raise LedgerError(409, "acquisition_campaign_stopped")
                    fresh, source = await self.admission(tx, scope, adapter_id)
                    if thread.source_revision != source or gates(campaign, prospect, fresh):
                        raise LedgerError(409, "correspondence_offer_unavailable")
                except LedgerError as exc:
                    reasons.append(exc.code)
                    state = "blocked"
            if before_effect is not None:
                await before_effect(tx)
            policy.revision += 1
            policy.updated_at = now
            thread.revision += 1
            if state == 'reply_ready' and review is not None:
                outbound = MailMessage(id=new_id(), business_id=scope.business_id,
                    environment_id=scope.environment_id, case_id=case.id,
                    message_id=f'<{new_id()}@pinet.lt>', direction='outbound', state='captured',
                    payload={'sender': 'info@pinet.lt', 'recipient': mail.payload['sender'],
                        'subject': decision.subject, 'body': decision.body,
                        'in_reply_to': mail.message_id,
                        'references': list(dict.fromkeys(mail.payload.get('references', []) + [mail.message_id]))[-20:],
                        'source_ref': 'acquisition_reply_capture', 'synthetic': True, 'customer_facing': False,
                        'external_sent': False, 'reviewed_input_sha256': body_hash,
                        'decision_request_id': str(request_id), 'reply_to_mail_id': inbound_id,
                        'source_revision': thread.source_revision, 'instruction_hash': instruction_hash,
                        'reviewer_hash': reviewed_reply['reviewer_hash']})
                tx.add(outbound)
                await tx.flush()
                tx.add(MailBinding(**values, mail_id=outbound.id, thread_id=thread_id, direction='outbound',
                    payload_sha256=seal(outbound.payload), input_sha256=body_hash, created_at=now))
            case.payload = {
                **case.payload,
                "acquisition": {
                    "thread_id": thread_id,
                    "marketing_state": policy.state,
                    "last_inbound_id": inbound_id,
                    "revision": thread.revision,
                    "decision": decision.model_dump(),
                    "reasons": reasons,
                    "resume_condition_quote": policy.resume_condition_quote,
                },
            }
            return await self.commit_receipt(
                tx,
                values,
                "decision",
                request_id,
                body_hash,
                thread,
                mail,
                policy,
                now,
                state,
                handoff_executed=handoff,
                reasons=tuple(reasons),
            )
