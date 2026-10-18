"""Exact operator-reviewed requested reply on an accepted Gmail conversation.

No follow-up scheduling, contact resume, synthetic promotion or mailbox import.
The current authenticated inbound/hash is rechecked before the one possible POST.
"""

import re
from datetime import UTC
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from pydantic import Field
from sqlalchemy import func, select

from .. import mailbox
from ..config import settings
from ..control.routes import ControlError
from ..models import Business, MailMessage, new_id
from .campaign import CampaignGmail, CampaignPlan, ReviewedLetter, read_plan
from .gmail import GmailError, raw_message
from .owner import OwnerGmail


class ReviewedReply(ReviewedLetter):
    parent_mail_id: UUID
    inbound_mail_id: UUID
    inbound_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    reviewed_classification: Literal["question", "interest"]
    reviewed_action: Literal["reply"]


class ConversationPlan(CampaignPlan):
    parent_plan_path: str = Field(min_length=1, max_length=1024)
    parent_plan_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    letters: list[ReviewedReply] = Field(min_length=1, max_length=100)


class ConversationGmail(CampaignGmail):
    def __init__(self, vault, connection_id, token, business_id, *, plan_path, plan_sha256, transport=None,
                 _ancestors=()):
        identity = str(Path(plan_path).resolve())
        if len(_ancestors) >= 32 or identity in _ancestors:
            raise GmailError("gmail_conversation_parent_limit")
        OwnerGmail.__init__(self, vault, connection_id, token, business_id, transport=transport)
        self.plan_path, self.plan_sha256 = plan_path, plan_sha256
        self.plan = read_plan(plan_path, plan_sha256, model=ConversationPlan)
        try:
            read_plan(self.plan.parent_plan_path, self.plan.parent_plan_sha256, model=ConversationPlan)
        except GmailError:
            # Only the two strict canonical plan schemas are eligible. The
            # ordinary constructor rechecks its seal before accepting a root.
            parent_type, extra = CampaignGmail, {}
        else:
            parent_type = ConversationGmail
            extra = {"_ancestors": (*_ancestors, identity)}
        self.parent = parent_type(
            vault,
            connection_id,
            token,
            business_id,
            plan_path=self.plan.parent_plan_path,
            plan_sha256=self.plan.parent_plan_sha256,
            transport=transport,
            **extra,
        )
        if (
            str(self.plan.connection_id) != self.id
            or str(self.plan.business_id) != self.business_id
            or self.plan.sender != self.parent.plan.sender
            or self.plan.environment != self.parent.plan.environment
            or self.plan.purpose != self.parent.plan.purpose
        ):
            raise GmailError("gmail_conversation_scope_conflict")

    def enabled(self):
        if not settings().gmail_campaign_enabled:
            raise ControlError(403, "gmail_campaign_disabled")
        return read_plan(self.plan_path, self.plan_sha256, model=ConversationPlan)

    async def context(self, tx, letter):
        if read_plan(self.plan.parent_plan_path, self.plan.parent_plan_sha256,
                     model=type(self.parent.plan)) != self.parent.plan:
            raise ControlError(409, "gmail_parent_plan_changed")
        parent = await self.parent.message(tx, str(letter.parent_mail_id))
        incoming = await tx.get(MailMessage, str(letter.inbound_mail_id), populate_existing=True)
        case = await self.contact(tx, str(letter.recipient))
        if (
            parent.state != "accepted_by_gmail"
            or incoming is None
            or case is None
            or case.id != parent.case_id
            or incoming.case_id != parent.case_id
            or incoming.business_id != self.business_id
            or incoming.environment_id != self.plan.environment
            or incoming.direction != "inbound"
            or incoming.state != "received"
            or incoming.payload.get("source_ref") != "authenticated_gmail_reply"
            or incoming.payload.get("synthetic") is not (self.plan.purpose == "owner_acceptance")
            or incoming.payload.get("sender", "").casefold() != str(letter.recipient).casefold()
            or incoming.payload.get("recipient", "").casefold() != str(self.plan.sender).casefold()
            or incoming.payload.get("gmail_provider_thread_id")
            != parent.payload["gmail_result"]["provider_thread_id"]
            or incoming.payload.get("in_reply_to") != parent.message_id
            or letter.subject != incoming.payload.get("subject")
            or mailbox.fingerprint(incoming.payload) != letter.inbound_sha256
            or case.payload.get("gmail_contact_state") != "hold"
            or case.payload.get("gmail_contact_reason") != "incoming_reply_pending_review"
            or case.payload.get("gmail_last_inbound_id") != incoming.id
            or str(letter.recipient).casefold()
            in {str(v).casefold() for v in self.plan.suppressed_recipients}
        ):
            raise ControlError(409, "gmail_requested_reply_context_changed")
        return parent, incoming, case

    async def prepare_letter(self, letter_id):
        self.enabled()
        letter = self.letter(letter_id)
        if letter is None:
            raise ControlError(404, "not_found")
        async with self.client() as (_, account), self.authorized() as (tx, plan, _):
            if account != str(plan.sender).casefold():
                raise GmailError("gmail_campaign_sender_mismatch")
            source = f"gmail-requested-reply:{plan.id}:{letter.id}"
            previous = await tx.scalar(
                select(MailMessage).where(
                    MailMessage.business_id == self.business_id,
                    MailMessage.environment_id == plan.environment,
                    MailMessage.payload["source_ref"].astext == source,
                )
            )
            if previous:
                return mailbox.public(await self.message(tx, previous.id))
            parent, incoming, case = await self.context(tx, letter)
            from urllib.parse import urlsplit

            business = await tx.get(Business, self.business_id)
            hosts = {business.canonical_host.casefold(), "www." + business.canonical_host.casefold()}
            if any(
                (urlsplit(url).hostname or "").casefold() not in hosts
                for url in re.findall(r"https?://[^\s<>]+", letter.body, flags=re.IGNORECASE)
            ):
                raise ControlError(409, "external_supplier_link_in_customer_letter")
            refs = list(dict.fromkeys([*incoming.payload.get("references", []), incoming.message_id]))[-20:]
            payload = {
                "sender": account,
                "sender_name": settings().sender_name,
                "recipient": str(letter.recipient),
                "subject": letter.subject,
                "body": letter.body,
                "language": letter.language,
                "source_ref": source,
                "synthetic": plan.purpose == "owner_acceptance",
                "gmail_campaign_purpose": plan.purpose,
                "customer_facing": True,
                "in_reply_to": incoming.message_id,
                "references": refs,
                "gmail_connection_id": self.id,
                "gmail_account_key": self.contact_key(account),
                "gmail_campaign_id": str(plan.id),
                "gmail_plan_sha256": self.plan_sha256,
                "gmail_letter_id": str(letter.id),
                "gmail_reply_parent_mail_id": parent.id,
                "gmail_reply_inbound_id": incoming.id,
                "gmail_reply_inbound_sha256": letter.inbound_sha256,
                "gmail_reply_thread_id": parent.payload["gmail_result"]["provider_thread_id"],
                "review_reference": letter.review_reference,
                "source_binding_fingerprint": plan.source_binding_fingerprint,
            }
            payload["hash"] = mailbox.fingerprint(payload)
            row = MailMessage(
                id=new_id(),
                business_id=self.business_id,
                environment_id=plan.environment,
                case_id=case.id,
                message_id=f"<{new_id()}@pinet.lt>",
                direction="outbound",
                state="draft",
                payload=payload,
            )
            raw_message(
                payload, row.message_id, row.created_at or plan.approved_at
            )  # Validate all reply headers before saving.
            tx.add(row)
            await tx.flush()
            return mailbox.public(row)

    async def message(self, tx, mail_id, *, lock=False):
        query = select(MailMessage).where(
            MailMessage.id == str(UUID(mail_id)),
            MailMessage.business_id == self.business_id,
            MailMessage.environment_id == settings().environment,
        )
        row = await tx.scalar(
            (query.with_for_update() if lock else query).execution_options(populate_existing=True)
        )
        letter = (
            self.letter(row.payload.get("gmail_letter_id"))
            if row and row.payload.get("gmail_letter_id")
            else None
        )
        if (
            row is None
            or letter is None
            or row.direction != "outbound"
            or row.payload.get("synthetic") is not (self.plan.purpose == "owner_acceptance")
            or row.payload.get("gmail_campaign_purpose", "campaign") != self.plan.purpose
            or row.payload.get("gmail_connection_id") != self.id
            or row.payload.get("gmail_account_key") != self.contact_key(self.plan.sender)
            or row.payload.get("gmail_campaign_id") != str(self.plan.id)
            or row.payload.get("gmail_plan_sha256") != self.plan_sha256
            or row.payload.get("source_ref") != f"gmail-requested-reply:{self.plan.id}:{letter.id}"
            or row.payload.get("hash") != mailbox.fingerprint(row.payload)
            or (row.payload.get("recipient"), row.payload.get("subject"), row.payload.get("body"))
            != (str(letter.recipient), letter.subject, letter.body)
            or row.payload.get("gmail_reply_parent_mail_id") != str(letter.parent_mail_id)
            or row.payload.get("gmail_reply_inbound_id") != str(letter.inbound_mail_id)
            or row.payload.get("gmail_reply_inbound_sha256") != letter.inbound_sha256
        ):
            raise ControlError(404, "not_found")
        return row

    async def send_letter(self, mail_id):
        self.enabled()
        async with self.client() as (client, account):
            async with self.authorized() as (tx, plan, now):
                row = await self.message(tx, mail_id, lock=True)
                if row.state != "draft":
                    return mailbox.public(row)
                letter = self.letter(row.payload["gmail_letter_id"])
                parent, incoming, _ = await self.context(tx, letter)
                previous = await tx.scalar(
                    select(MailMessage.id)
                    .where(
                        MailMessage.case_id == row.case_id,
                        MailMessage.payload["gmail_reply_inbound_id"].astext == incoming.id,
                        MailMessage.payload.has_key("gmail_intent"),
                    )
                    .limit(1)
                )  # noqa: W601
                if previous:
                    raise ControlError(409, "gmail_inbound_reply_already_attempted")
                if account != str(plan.sender).casefold() or row.payload["sender"].casefold() != account:
                    raise GmailError("gmail_campaign_sender_mismatch")
                common = [
                    MailMessage.business_id == self.business_id,
                    MailMessage.environment_id == plan.environment,
                    MailMessage.payload["gmail_account_key"].astext == self.contact_key(account),
                    MailMessage.payload.has_key("gmail_intent"),
                    MailMessage.payload.has_key("gmail_campaign_id"),
                ]  # noqa: W601
                total = await tx.scalar(
                    select(func.count())
                    .select_from(MailMessage)
                    .where(*common, MailMessage.payload["gmail_campaign_id"].astext == str(plan.id))
                )
                day = now.astimezone(UTC).date().isoformat()
                daily = await tx.scalar(
                    select(func.count())
                    .select_from(MailMessage)
                    .where(*common, MailMessage.payload["gmail_intent"]["utc_day"].astext == day)
                )
                if total >= plan.maximum_sends or daily >= plan.maximum_daily_sends:
                    raise ControlError(409, "gmail_campaign_send_limit")
                thread_id = parent.payload["gmail_result"]["provider_thread_id"]
                raw = raw_message(row.payload, row.message_id, row.created_at)
                attempt = {
                    "id": str(uuid4()),
                    "connection_id": self.id,
                    "payload_sha256": mailbox.fingerprint(row.payload),
                    "plan_sha256": self.plan_sha256,
                    "source_revision": settings().control_source_revision,
                    "intent_at": now.isoformat(),
                    "utc_day": day,
                }
                row.state, row.payload = "sending", {**row.payload, "gmail_intent": attempt}
            receipt, post_started = None, False
            try:
                async with self.authorized() as (tx, _, _):
                    row = await self.message(tx, mail_id, lock=True)
                    parent, _, _ = await self.context(tx, self.letter(row.payload["gmail_letter_id"]))
                    if (
                        row.state != "sending"
                        or row.payload.get("gmail_intent") != attempt
                        or parent.payload["gmail_result"]["provider_thread_id"] != thread_id
                        or row.payload.get("gmail_reply_thread_id") != thread_id
                    ):
                        raise ControlError(409, "gmail_intent_changed")
                    post_started = True
                    receipt = await client.send(raw, thread_id=thread_id)
            except ControlError:
                state = "delivery_unknown" if post_started else "rejected"
                evidence = {
                    "status": "unknown" if post_started else "not_performed",
                    "failure": "authority_changed_after_dispatch"
                    if post_started
                    else "authority_changed_before_send",
                    "delivery_confirmed": False,
                }
            except GmailError as error:
                state = "rejected" if error.outcome in {"rejected", "not_performed"} else "delivery_unknown"
                evidence = {"status": error.outcome, "failure": error.code, "delivery_confirmed": False}
            if receipt is not None:
                state, evidence = (
                    "accepted_by_gmail",
                    {
                        "status": "accepted",
                        "provider_message_id": receipt.message_id,
                        "provider_thread_id": receipt.thread_id,
                        "requested_thread_id": thread_id,
                        "thread_matched": receipt.thread_id == thread_id,
                        "delivery_confirmed": False,
                    },
                )
            return await self.settle(mail_id, attempt, state, evidence)
