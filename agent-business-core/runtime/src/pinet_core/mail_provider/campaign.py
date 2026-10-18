"""Default-off reviewed campaign gateway on canonical Case/MailMessage.

An operator-pinned private plan authorizes exact new letters, never converts
synthetic acquisition capture into commercial mail. No scheduler or model IO.
"""
import hashlib
import json
import re
from contextlib import asynccontextmanager
from datetime import UTC, timedelta
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from pydantic import AwareDatetime, EmailStr, Field, field_validator, model_validator
from sqlalchemy import func, select, text

from .. import mailbox
from ..business_attachment.service import transaction_authority
from ..config import settings
from ..contracts import Strict
from ..control.routes import ControlError
from ..customer_text.service import customer_session
from ..models import Business, Case, MailMessage, new_id
from .gmail import GmailError, raw_message
from .owner import OwnerGmail, owned


class ReviewedLetter(Strict):
    id: UUID
    recipient: EmailStr
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=10, max_length=16000)
    language: str = Field(pattern=r"^[a-z]{2}(?:-[A-Z]{2})?$")
    contact_source: str = Field(min_length=10, max_length=2000)
    contact_evidence: str = Field(min_length=10, max_length=2000)
    permission_basis: str = Field(min_length=10, max_length=2000)
    review_reference: str = Field(min_length=3, max_length=200)

    @field_validator("subject")
    @classmethod
    def subject_header(cls, value):
        if any(ord(c) < 32 for c in value):
            raise ValueError("mail_subject_control_character")
        return value

    @field_validator("contact_source")
    @classmethod
    def https_source(cls, value):
        from urllib.parse import urlsplit
        url = urlsplit(value)
        if url.scheme != "https" or not url.hostname or url.username or url.password or url.fragment:
            raise ValueError("contact_https_source_required")
        return value

    @field_validator("recipient")
    @classmethod
    def actual_recipient(cls, value):
        domain = str(value).rsplit("@", 1)[1].casefold()
        if domain.endswith((".test", ".invalid", ".localhost")) or domain == "localhost":
            raise ValueError("capture_address_cannot_become_campaign_recipient")
        return str(value).casefold()


class CampaignPlan(Strict):
    id: UUID
    purpose: Literal["campaign", "owner_acceptance"] = "campaign"
    enabled: bool
    connection_id: UUID
    business_id: UUID
    user_id: UUID
    grant_id: UUID
    source_binding_id: UUID
    source_binding_fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    execution_source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    environment: str = Field(min_length=1, max_length=100)
    sender: EmailStr
    approved_at: AwareDatetime
    expires_at: AwareDatetime
    maximum_sends: int = Field(ge=1, le=100)
    maximum_daily_sends: int = Field(ge=1, le=50)
    letters: list[ReviewedLetter] = Field(min_length=1, max_length=100)
    suppressed_recipients: list[EmailStr] = Field(max_length=1000)

    @model_validator(mode="after")
    def bounded_plan(self):
        if (not self.approved_at < self.expires_at <= self.approved_at + timedelta(days=7)
                or len({v.id for v in self.letters}) != len(self.letters)
                or len({str(v.recipient).casefold() for v in self.letters}) != len(self.letters)):
            raise ValueError("bounded_unique_campaign_plan_required")
        if self.purpose == "owner_acceptance" and any(str(v.recipient).casefold() != str(self.sender).casefold() for v in self.letters):
            raise ValueError("owner_acceptance_recipient_required")
        return self


def read_plan(path, expected_sha256, *, model=CampaignPlan):
    """Pinned operator input, outside browser/API/model-controlled arguments."""
    path = Path(path)
    try:
        if (not path.is_absolute() or any(p.is_symlink() for p in (path, *path.parents))
                or not path.is_file() or path.stat().st_size > 2_000_000
                or not re.fullmatch(r"[a-f0-9]{64}", expected_sha256)):
            raise ValueError()
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected_sha256:
            raise ValueError()
        return model.model_validate(json.loads(raw.decode("utf-8-sig")))
    except (OSError, ValueError, TypeError):
        raise GmailError("gmail_campaign_plan_unavailable") from None


class CampaignGmail(OwnerGmail):
    def __init__(self, vault, connection_id, token, business_id, *, plan_path, plan_sha256, transport=None):
        super().__init__(vault, connection_id, token, business_id, transport=transport)
        self.plan_path, self.plan_sha256 = plan_path, plan_sha256
        self.plan = read_plan(plan_path, plan_sha256)
        if str(self.plan.connection_id) != self.id or str(self.plan.business_id) != self.business_id:
            raise GmailError("gmail_campaign_scope_conflict")

    async def prepare_self_test(self, *args, **kwargs):
        raise GmailError("gmail_campaign_exact_action_required")

    async def send_self_test(self, *args, **kwargs):
        raise GmailError("gmail_campaign_exact_action_required")

    async def sync_self_test(self, *args, **kwargs):
        raise GmailError("gmail_campaign_exact_action_required")

    def enabled(self):
        if not settings().gmail_campaign_enabled:
            raise ControlError(403, "gmail_campaign_disabled")
        return read_plan(self.plan_path, self.plan_sha256)

    @asynccontextmanager
    async def authorized(self):
        plan = self.enabled()
        async with owned(self.token, self.business_id, source_lock=True) as (tx, binding):
            session = await customer_session(tx, self.token)
            async with transaction_authority(tx, session, self.business_id, str(plan.source_binding_id), writing=True) as source:
                now = await tx.scalar(text("SELECT clock_timestamp()"))
                if (not plan.enabled or not plan.approved_at <= now < plan.expires_at
                        or str(plan.user_id) != binding["user_id"] or str(plan.grant_id) != binding["grant_id"]
                        or plan.environment != settings().environment
                        or plan.execution_source_revision != settings().control_source_revision
                        or source.fingerprint != plan.source_binding_fingerprint):
                    raise ControlError(409, "gmail_campaign_authority_changed")
                # Two OAuth connection UUIDs for one Gmail account share the
                # same Case/draft/quota barrier in this business/environment.
                await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                    {"k": f"gmail-campaign:{self.business_id}:{plan.environment}:{self.contact_key(plan.sender)}"})
                yield tx, plan, now

    def letter(self, letter_id):
        return next((v for v in self.plan.letters if str(v.id) == str(UUID(letter_id))), None)

    @staticmethod
    def contact_key(recipient):
        return hashlib.sha256(str(recipient).casefold().encode()).hexdigest()

    async def contact(self, tx, recipient, *, create=False):
        key = self.contact_key(recipient)
        row = await tx.scalar(select(Case).where(Case.business_id == self.business_id,
            Case.environment_id == settings().environment, Case.payload["gmail_contact_key"].astext == key)
            .with_for_update().execution_options(populate_existing=True))
        if row is None and create:
            row = Case(id=new_id(), business_id=self.business_id, environment_id=settings().environment,
                payload={"source": "gmail_reviewed_campaign", "gmail_contact_key": key,
                         "gmail_contact_state": "ready"})
            tx.add(row)
            await tx.flush()
        return row

    async def prepare_letter(self, letter_id):
        self.enabled()
        letter = self.letter(letter_id)
        if letter is None:
            raise ControlError(404, "not_found")
        async with self.client() as (_, account), self.authorized() as (tx, plan, _):
            if str(plan.sender).casefold() != account:
                raise GmailError("gmail_campaign_sender_mismatch")
            case = await self.contact(tx, letter.recipient, create=True)
            source = f"gmail-campaign:{plan.id}:{letter.id}"
            previous = await tx.scalar(select(MailMessage).where(MailMessage.case_id == case.id,
                MailMessage.direction == "outbound", MailMessage.payload["source_ref"].astext == source))
            if previous:
                return mailbox.public(await self.message(tx, previous.id))
            # Reuse the existing customer-letter URL guard and common header contract.
            from urllib.parse import urlsplit
            business = await tx.get(Business, self.business_id)
            hosts = {business.canonical_host.casefold(), "www." + business.canonical_host.casefold()}
            if any((urlsplit(url).hostname or "").casefold() not in hosts
                   for url in re.findall(r"https?://[^\s<>]+", letter.body, flags=re.IGNORECASE)):
                raise ControlError(409, "external_supplier_link_in_customer_letter")
            payload = {"sender": account, "sender_name": settings().sender_name, "recipient": str(letter.recipient),
                "subject": letter.subject, "body": letter.body, "source_ref": source,
                "synthetic": plan.purpose == "owner_acceptance", "gmail_campaign_purpose": plan.purpose,
                "customer_facing": True, "language": letter.language, "gmail_connection_id": self.id,
                "gmail_account_key": self.contact_key(account),
                "gmail_campaign_id": str(plan.id), "gmail_plan_sha256": self.plan_sha256,
                "gmail_letter_id": str(letter.id), "review_reference": letter.review_reference,
                "source_binding_fingerprint": plan.source_binding_fingerprint}
            payload["hash"] = mailbox.fingerprint(payload)
            message = MailMessage(id=new_id(), business_id=self.business_id, environment_id=plan.environment,
                case_id=case.id, message_id=f"<{new_id()}@pinet.lt>", direction="outbound", state="draft", payload=payload)
            tx.add(message)
            await tx.flush()
            return mailbox.public(message)

    async def message(self, tx, mail_id, *, lock=False):
        query = select(MailMessage).where(MailMessage.id == str(UUID(mail_id)),
            MailMessage.business_id == self.business_id, MailMessage.environment_id == settings().environment)
        row = await tx.scalar((query.with_for_update() if lock else query).execution_options(populate_existing=True))
        letter = self.letter(row.payload.get("gmail_letter_id")) if row and row.payload.get("gmail_letter_id") else None
        if (row is None or row.direction != "outbound" or row.payload.get("synthetic") is not (self.plan.purpose == "owner_acceptance") or letter is None
                or row.payload.get("gmail_campaign_purpose", "campaign") != self.plan.purpose
                or row.payload.get("gmail_connection_id") != self.id
                or row.payload.get("gmail_account_key") != self.contact_key(self.plan.sender)
                or row.payload.get("gmail_campaign_id") != str(self.plan.id)
                or row.payload.get("gmail_plan_sha256") != self.plan_sha256
                or row.payload.get("source_ref") != f"gmail-campaign:{self.plan.id}:{letter.id}"
                or row.payload.get("hash") != mailbox.fingerprint(row.payload)
                or (row.payload.get("recipient"), row.payload.get("subject"), row.payload.get("body"))
                   != (str(letter.recipient), letter.subject, letter.body)):
            raise ControlError(404, "not_found")
        return row

    async def send_letter(self, mail_id):
        self.enabled()
        async with self.client() as (client, account):
            async with self.authorized() as (tx, plan, now):
                row = await self.message(tx, mail_id, lock=True)
                if row.state != "draft":
                    return mailbox.public(row)
                case = await self.contact(tx, row.payload["recipient"])
                suppressed = {str(v).casefold() for v in plan.suppressed_recipients}
                if (case is None or case.id != row.case_id or case.payload.get("gmail_contact_state") != "ready"
                        or row.payload["recipient"].casefold() in suppressed):
                    raise ControlError(409, "gmail_contact_held")
                prior = await tx.scalar(select(MailMessage.id).where(MailMessage.case_id == row.case_id,
                    MailMessage.payload.has_key("gmail_campaign_id"),  # noqa: W601
                    MailMessage.payload.has_key("gmail_intent")).limit(1))  # noqa: W601
                if prior is not None:
                    raise ControlError(409, "gmail_contact_already_attempted")
                if row.payload["sender"].casefold() != account or str(plan.sender).casefold() != account:
                    raise GmailError("gmail_campaign_sender_mismatch")
                common = [MailMessage.business_id == self.business_id, MailMessage.environment_id == plan.environment,
                    MailMessage.payload["gmail_account_key"].astext == self.contact_key(account),
                    MailMessage.payload.has_key("gmail_intent"),  # noqa: W601
                    MailMessage.payload.has_key("gmail_campaign_id")]  # noqa: W601
                total = await tx.scalar(select(func.count()).select_from(MailMessage).where(*common,
                    MailMessage.payload["gmail_campaign_id"].astext == str(plan.id)))
                day = now.astimezone(UTC).date().isoformat()
                daily = await tx.scalar(select(func.count()).select_from(MailMessage).where(*common,
                    MailMessage.payload["gmail_intent"]["utc_day"].astext == day))
                if total >= plan.maximum_sends or daily >= plan.maximum_daily_sends:
                    raise ControlError(409, "gmail_campaign_send_limit")
                raw = raw_message(row.payload, row.message_id, row.created_at)
                attempt = {"id": str(uuid4()), "connection_id": self.id, "payload_sha256": mailbox.fingerprint(row.payload),
                    "plan_sha256": self.plan_sha256, "source_revision": settings().control_source_revision,
                    "intent_at": now.isoformat(), "utc_day": day}
                row.state, row.payload = "sending", {**row.payload, "gmail_intent": attempt}
            # The intent is committed before network; sending/unknown never retries.
            receipt, post_started = None, False
            try:
                async with self.authorized() as (tx, _, _):
                    row = await self.message(tx, mail_id, lock=True)
                    case = await self.contact(tx, row.payload["recipient"])
                    if (row.state != "sending" or row.payload.get("gmail_intent") != attempt
                            or not case or case.payload.get("gmail_contact_state") != "ready"):
                        raise ControlError(409, "gmail_intent_changed")
                    post_started = True
                    receipt = await client.send(raw)
            except ControlError:
                state = "delivery_unknown" if post_started else "rejected"
                evidence = {"status": "unknown" if post_started else "not_performed",
                    "failure": "authority_changed_after_dispatch" if post_started else "authority_changed_before_send",
                    "delivery_confirmed": False}
            except GmailError as error:
                state = "rejected" if error.outcome in {"rejected", "not_performed"} else "delivery_unknown"
                evidence = {"status": error.outcome, "failure": error.code, "delivery_confirmed": False}
            if receipt is not None:
                # A post-yield source/session fence cannot erase an already
                # observed provider acceptance or its exact thread/message IDs.
                state, evidence = "accepted_by_gmail", {"status": "accepted", "provider_message_id": receipt.message_id,
                    "provider_thread_id": receipt.thread_id, "delivery_confirmed": False}
            return await self.settle(mail_id, attempt, state, evidence)

    async def sync_letter(self, mail_id):
        # Receiving an accepted conversation remains possible after send pause or
        # plan expiry. Current owner/account/parent/tenant checks still apply.
        return await self._sync_known(mail_id, require_self=False)

    async def reply_received(self, tx, original, reply):
        case = await tx.get(Case, original.case_id, with_for_update=True, populate_existing=True)
        previous_id = case.payload.get("gmail_last_inbound_id")
        if previous_id == reply.id:
            return
        previous = await tx.get(MailMessage, previous_id) if previous_id else None
        if previous is not None and previous.created_at >= reply.created_at:
            return  # Replay cannot move the retained latest observation backwards.
        payload = {**case.payload, "gmail_last_inbound_id": reply.id}
        if payload.get("gmail_contact_state") in {"ready", "hold"}:
            payload.update(gmail_contact_state="hold", gmail_contact_reason="incoming_reply_pending_review")
        case.payload = payload  # A terminal/unknown state is never resumed by receiving.
