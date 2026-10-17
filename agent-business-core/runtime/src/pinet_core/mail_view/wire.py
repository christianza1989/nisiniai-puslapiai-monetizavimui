from typing import Annotated, Literal
from pydantic import AwareDatetime, Field
from ..contracts import Strict

Identifier = Annotated[str, Field(pattern=r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$")]
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class MailSummary(Strict):
    mail_id: Identifier
    case_id: Identifier
    message_id: str = Field(max_length=250)
    direction: Literal["inbound", "outbound"]
    state: str = Field(min_length=1, max_length=80)
    created_at: AwareDatetime
    sender: str = Field(max_length=320)
    recipient: str = Field(max_length=320)
    subject: str = Field(max_length=200)
    synthetic: bool | None


class Translation(Strict):
    status: Literal["ready", "missing", "unavailable"]
    target_language: Literal["lt"] = "lt"
    source_sha256: Digest
    subject: str | None = Field(default=None, max_length=400)
    body: str | None = Field(default=None, max_length=32000)
    translated_at: AwareDatetime | None = None
    model: str | None = Field(default=None, max_length=80)


class MailDetail(MailSummary):
    business_id: Identifier
    body: str = Field(max_length=16000)
    translation: Translation


class MailPage(Strict):
    business_id: Identifier
    case_id: Identifier | None
    items: list[MailSummary] = Field(max_length=25)
    next_before: Identifier | None


class Envelope(Strict):
    contract_version: Literal["mail-view.v1"] = "mail-view.v1"
    environment: Literal["local", "test", "production"]
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    observed_at: AwareDatetime
    request_id: Identifier


class PageEnvelope(Envelope):
    data: MailPage


class DetailEnvelope(Envelope):
    data: MailDetail
