"""Actual retained SQL/MIME/Task bridge with inert models; never a paid quality PASS."""
import os
from email.message import EmailMessage
from uuid import uuid4

import pytest
from sqlalchemy import select
from test_acquisition_external_binding_pg import ExternalRoles
from test_acquisition_external_binding_pg import external_native as source_fixture
from test_acquisition_model_prepare_pg import stored
from test_acquisition_native_chain_pg import email, reply_submit
from test_private_preview_pg import preview as preview_fixture

from pinet_core.acquisition.headless_mail import HeadlessMail
from pinet_core.acquisition.model_contract import REPLY_KIND
from pinet_core.acquisition.work_models import MailBinding
from pinet_core.db import db
from pinet_core.models import MailMessage
from pinet_core.tasks import worker

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Explicit retained isolated0049 PostgreSQL required")


@pytest.fixture(name="external_native")
async def external_owner(preview, monkeypatch):
    return await source_fixture.__wrapped__(preview, monkeypatch)


@pytest.fixture(name="preview")
async def preview_owner(monkeypatch):
    async for value in preview_fixture.__wrapped__(monkeypatch):
        yield value


async def test_reserved_subdomain_two_mime_replies_keep_one_native_case(external_native):
    p = external_native
    p["request"]["recipient"] = "owner@venue-07.example.test"
    fake = ExternalRoles(p)
    initial, _ = await email(p, fake)
    parent_id = initial.result["mail_id"]
    for body in ("Please correct the quantity to one.", "Is the published weight an empty weight?"):
        async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
            parent = await tx.get(MailMessage, parent_id)
            assert parent is not None
            known = {parent.message_id: {"id": parent.id, "site": p["scope"].site_id,
                "case_id": parent.case_id, "sender": parent.payload["sender"], "recipient": parent.payload["recipient"]}}
        message = EmailMessage()
        message["From"], message["To"] = p["request"]["recipient"], parent.payload["sender"]
        message["Subject"] = "Re: requirements"
        message["Message-ID"] = "<"+uuid4().hex+"@venue-07.example.test>"
        message["In-Reply-To"] = message["References"] = parent.message_id
        message.set_content(body)
        received = await HeadlessMail(db).receive_authenticated_capture(raw=message.as_bytes(), known=known,
            scope=p["scope"], adapter_id=p["approved"]["after"]["adapter_id"], request_id=uuid4(),
            thread_id=initial.result["thread_id"], parent_mail_id=parent.id)
        receipt = received["receipt"]
        async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
            await HeadlessMail(db).correspondence.locked(tx, p["scope"], p["approved"]["after"]["adapter_id"])
            bound = await tx.scalar(select(MailBinding).where(MailBinding.mail_id == receipt["mail_id"]))
            assert bound and bound.thread_id == initial.result["thread_id"]
        wire = {"request_id": str(uuid4()), "authorization_id": p["pair"]["email_authorization_id"],
            "native": p["pair"], "prepare_task_id": initial.id, "thread_id": receipt["thread_id"],
            "inbound_id": receipt["mail_id"], "revision": receipt["revision"], "input_sha256": bound.input_sha256}
        task_id = await reply_submit(p, wire)
        assert await worker.execute_once(fake, kind=REPLY_KIND, task_id=task_id)
        reply, run, _ = await stored(p, task_id)
        assert reply.status == "succeeded", reply.failure_code
        assert run.usage["model_calls"] == 2
        parent_id = reply.result["outbound_mail_id"]
    async with db.transaction(p["scope"].business_id, p["scope"].environment_id) as tx:
        messages = list(await tx.scalars(select(MailMessage)))
        assert len(messages) == 5 and {row.case_id for row in messages} == {initial.result["case_id"]}
        assert all(row.state == "captured" and not row.payload["external_sent"] for row in messages)
        assert len({row.message_id for row in messages}) == 5
        assert received["display_candidate"]["translation_dispatched"] is False
