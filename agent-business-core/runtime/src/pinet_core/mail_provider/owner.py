"""Local current-owner Gmail self-test on canonical MailMessage/Case.

No campaign transport, acquisition capture reclassification or Conversation
fabrication. Only newly prepared owner self-test records may use this gateway.
"""
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import UUID, uuid4

import httpx
from sqlalchemy import select, text

from .. import mailbox
from ..acquisition.headless_mail import parse_bound_reply
from ..acquisition.module_admin import execution_current
from ..config import settings
from ..control.routes import ControlError, scope, token_hash
from ..creation.service import digest
from ..customer_text.service import customer_session
from ..db import db
from ..mail_view.task_authority import grant
from ..models import Business, MailMessage, utcnow
from . import oauth
from .gmail import GmailClient, GmailError, raw_message


def guard():
    cfg = settings()
    if (not cfg.gmail_owner_enabled or not cfg.control_enabled or not cfg.customer_enabled
            or cfg.control_mode != "local" or not (cfg.environment == "local" or cfg.environment.startswith("test-"))):
        raise ControlError(403, "gmail_owner_test_disabled")


@asynccontextmanager
async def owned(token, business_id):
    guard()
    await execution_current(SimpleNamespace(execution_source_revision=settings().control_source_revision))
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        admitted = await grant(tx, session, str(UUID(business_id)))
        await tx.execute(text("SELECT set_config('pinet.business',:b,true)"), {"b": business_id})
        binding = {"business_id": business_id, "environment": settings().environment, "user_id": session.user_id,
                   "grant_id": admitted.id, "organization_id": admitted.organization_id}
        yield tx, binding


class OwnerGmail:
    def __init__(self, vault, connection_id, token, business_id, *, transport=None):
        self.vault, self.id = vault, str(UUID(connection_id))
        self.token, self.business_id, self.transport = token, str(UUID(business_id)), transport

    async def binding(self):
        async with owned(self.token, self.business_id) as (_, binding):
            return binding

    async def begin(self, client_document, redirect_uri):
        binding = await self.binding()
        client = oauth.client_configuration(client_document)
        flow, url = oauth.new_flow(client["client_id"], redirect_uri, binding)
        with self.vault.locked(self.id):
            self.vault.write(self.id, binding, {"status": "pending", "client": client, "flow": flow}, create=True)
        return url

    async def complete(self, callback_url):
        binding = await self.binding()
        with self.vault.locked(self.id):
            record = self.vault.read(self.id, binding)
            if record["status"] != "pending":
                raise GmailError("gmail_oauth_not_pending")
            code = oauth.consume_callback(record["flow"], callback_url, binding)
            self.vault.write(self.id, binding, record)  # One-use before network exchange.
            async with httpx.AsyncClient(timeout=20, trust_env=False, follow_redirects=False, transport=self.transport) as client:
                tokens = await oauth.token_request(client, {**record["client"], "code": code,
                    "code_verifier": record["flow"]["verifier"], "redirect_uri": record["flow"]["redirect_uri"],
                    "grant_type": "authorization_code"})
            async with GmailClient(tokens["access_token"], transport=self.transport) as client:
                account = await client.profile()
            if await self.binding() != binding:
                raise GmailError("gmail_owner_changed")
            self.vault.write(self.id, binding, {"status": "active", "client": record["client"],
                "tokens": tokens, "account_email": account, "connected_at": utcnow().isoformat()})
            return {"connection_id": self.id, "status": "active", "account_email": account, "scopes": list(oauth.SCOPES)}

    @asynccontextmanager
    async def client(self):
        binding = await self.binding()
        with self.vault.locked(self.id):
            record = self.vault.read(self.id, binding)
            if record["status"] != "active" or record.get("refresh_pending"):
                raise GmailError("gmail_connection_requires_reauthentication")
            if datetime.fromisoformat(record["tokens"]["expires_at"]) <= datetime.now(UTC) + timedelta(seconds=30):
                record["refresh_pending"] = True
                self.vault.write(self.id, binding, record)
                async with httpx.AsyncClient(timeout=20, trust_env=False, follow_redirects=False, transport=self.transport) as client:
                    record["tokens"] = await oauth.token_request(client, {**record["client"],
                        "refresh_token": record["tokens"]["refresh_token"], "grant_type": "refresh_token"},
                        previous=record["tokens"])
                if await self.binding() != binding:
                    raise GmailError("gmail_owner_changed")
                record["refresh_pending"] = False
                self.vault.write(self.id, binding, record)
            token, account = record["tokens"]["access_token"], record["account_email"]
        async with GmailClient(token, transport=self.transport) as client:
            if await client.profile() != account:
                raise GmailError("gmail_account_changed")
            yield client, account

    async def prepare_self_test(self, request_id, subject, body):
        request_id = str(UUID(request_id))
        async with self.client() as (_, account), owned(self.token, self.business_id) as (tx, _):
            source = "gmail-owner-selftest:" + request_id
            fingerprint = digest({"connection": self.id, "subject": subject, "body": body})
            await tx.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
                             {"k": self.business_id + settings().environment + source})
            existing = await tx.scalar(select(MailMessage).where(MailMessage.business_id == self.business_id,
                MailMessage.environment_id == settings().environment, MailMessage.payload["source_ref"].astext == source))
            if existing:
                if existing.payload.get("gmail_request_sha256") != fingerprint:
                    raise ControlError(409, "gmail_request_conflict")
                return mailbox.public(existing)
            business = await tx.get(Business, self.business_id)
            message = await mailbox.prepare(tx, business, mailbox.DraftInput(recipient=account, subject=subject,
                body=body, source_ref=source, synthetic=True, customer_facing=False), verified_sender=account)
            message.payload = {**message.payload, "gmail_connection_id": self.id, "gmail_request_sha256": fingerprint}
            return mailbox.public(message)

    async def message(self, tx, mail_id, *, lock=False):
        query = select(MailMessage).where(MailMessage.id == str(UUID(mail_id)),
            MailMessage.business_id == self.business_id, MailMessage.environment_id == settings().environment)
        row = await tx.scalar(query.with_for_update() if lock else query)
        if (row is None or row.direction != "outbound" or row.payload.get("synthetic") is not True
                or row.payload.get("gmail_connection_id") != self.id
                or not row.payload.get("source_ref", "").startswith("gmail-owner-selftest:")
                or row.payload.get("hash") != mailbox.fingerprint(row.payload)):
            raise ControlError(404, "not_found")
        return row

    async def settle(self, mail_id, attempt, state, evidence):
        # A received transport outcome must still be recorded after actor revocation.
        # This exact already-committed intent grants no new network effect.
        async with db.transaction(self.business_id, settings().environment) as tx:
            row = await self.message(tx, mail_id, lock=True)
            if row.state != "sending" or row.payload.get("gmail_intent") != attempt:
                raise GmailError("gmail_intent_changed")
            row.state = state
            row.payload = {**row.payload, "gmail_result": {**evidence, "observed_at": utcnow().isoformat()}}
            return mailbox.public(row)

    async def send_self_test(self, mail_id):
        # Profile/token refresh happens before intent; failed credentials consume no send.
        async with self.client() as (client, account):
            async with owned(self.token, self.business_id) as (tx, _):
                row = await self.message(tx, mail_id, lock=True)
                if row.state != "draft":
                    return mailbox.public(row)  # Includes sending/unknown: never blindly retry.
                if row.payload["sender"].casefold() != account or row.payload["recipient"].casefold() != account:
                    raise GmailError("gmail_self_test_only")
                raw = raw_message(row.payload, row.message_id, row.created_at)
                attempt = {"id": str(uuid4()), "connection_id": self.id, "payload_sha256": mailbox.fingerprint(row.payload),
                           "source_revision": settings().control_source_revision, "intent_at": utcnow().isoformat()}
                row.state, row.payload = "sending", {**row.payload, "gmail_intent": attempt}
            try:
                async with owned(self.token, self.business_id) as (tx, _):
                    row = await self.message(tx, mail_id, lock=True)
                    if row.state != "sending" or row.payload.get("gmail_intent") != attempt:
                        raise GmailError("gmail_intent_changed")
                    receipt = await client.send(raw)
                state, evidence = "accepted_by_gmail", {"status": "accepted", "provider_message_id": receipt.message_id,
                    "provider_thread_id": receipt.thread_id, "delivery_confirmed": False}
            except ControlError:
                state, evidence = "rejected", {"status": "not_performed", "failure": "authority_changed_before_send"}
            except GmailError as error:
                state = "rejected" if error.outcome in {"rejected", "not_performed"} else "delivery_unknown"
                evidence = {"status": error.outcome, "failure": error.code, "delivery_confirmed": False}
            return await self.settle(mail_id, attempt, state, evidence)

    async def sync_self_test(self, mail_id):
        async with owned(self.token, self.business_id) as (tx, _):
            original = await self.message(tx, mail_id)
            if original.state != "accepted_by_gmail":
                raise GmailError("gmail_accepted_parent_required")
            saved = {"id": original.id, "case_id": original.case_id, "sender": original.payload["sender"],
                "recipient": original.payload["recipient"], "message_id": original.message_id,
                "receipt": deepcopy(original.payload["gmail_result"])}
        known = {saved["message_id"]: {"id": saved["id"], "site": self.business_id, "case_id": saved["case_id"],
            "sender": saved["sender"], "recipient": saved["recipient"]}}
        imported = []
        async with self.client() as (client, account):
            if saved["sender"].casefold() != account or saved["recipient"].casefold() != account:
                raise GmailError("gmail_self_test_only")
            for provider_id in await client.thread_ids(saved["receipt"]["provider_thread_id"]):
                if provider_id == saved["receipt"]["provider_message_id"]:
                    continue
                raw = await client.raw(provider_id)
                try:
                    reply = parse_bound_reply(raw, known)
                except ValueError:
                    continue  # Known thread is not enough; exact participants/references remain required.
                async with owned(self.token, self.business_id) as (tx, _):
                    original = await self.message(tx, mail_id, lock=True)
                    if original.state != "accepted_by_gmail" or original.payload.get("gmail_result") != saved["receipt"]:
                        raise GmailError("gmail_parent_changed")
                    row = await mailbox.receive_reply(tx, original, reply["provider_id"], reply["sender"],
                        reply["subject"], reply["body"], references=reply["references"], recipient=reply["recipient"],
                        source_ref="authenticated_gmail_reply")
                    if row.payload.get("gmail_provider_message_id", provider_id) != provider_id:
                        raise GmailError("gmail_reply_identity_conflict")
                    row.payload = {**row.payload, "gmail_provider_message_id": provider_id,
                        "gmail_provider_thread_id": saved["receipt"]["provider_thread_id"]}
                    imported.append(row.id)
        return {"case_id": saved["case_id"], "mail_id": saved["id"], "inbound_mail_ids": imported,
                "mailbox_wide_import": False, "automated_reply_dispatched": False}
