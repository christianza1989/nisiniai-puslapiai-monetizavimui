"""Record snapshots deliberately differ from provider events and campaign KPIs."""
from datetime import UTC, timedelta
from typing import Literal

from pydantic import AwareDatetime, Field, field_validator, model_validator

from ..contracts import Strict
from .wire import Envelope, Identifier


class Window(Strict):
    start: AwareDatetime
    end: AwareDatetime

    @field_validator("start", "end")
    @classmethod
    def utc(cls, value):
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def bounded(self):
        if not timedelta(0) < self.end - self.start <= timedelta(days=31):
            raise ValueError("invalid_statistics_window")
        return self


class RecordCounts(Strict):
    total: int = Field(default=0, ge=0)
    outbound_draft: int = Field(default=0, ge=0)
    outbound_accepted_by_smtp: int = Field(default=0, ge=0)
    outbound_rejected: int = Field(default=0, ge=0)
    outbound_delivery_unknown: int = Field(default=0, ge=0)
    outbound_other: int = Field(default=0, ge=0)
    inbound_received: int = Field(default=0, ge=0)
    inbound_captured: int = Field(default=0, ge=0)
    inbound_other: int = Field(default=0, ge=0)
    other_direction: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def total_matches(self):
        if self.total != sum(value for key, value in self.model_dump().items() if key != "total"):
            raise ValueError("invalid_statistics_total")
        return self


class RecordGroups(Strict):
    non_synthetic: RecordCounts
    synthetic: RecordCounts
    unclassified: RecordCounts


class Unavailable(Strict):
    status: Literal["unavailable"] = "unavailable"
    value: None = None
    reason: Literal["no_provider_event_source", "not_derived_from_record_snapshot"]


class ProviderMetrics(Strict):
    delivered: Unavailable
    bounced: Unavailable
    opened: Unavailable
    clicked: Unavailable
    human_replies: Unavailable
    unique_recipients: Unavailable
    reply_rate: Unavailable


class MailStatistics(Strict):
    business_id: Identifier
    window: Window
    source: Literal["canonical_mail_messages"] = "canonical_mail_messages"
    time_basis: Literal["mail_message_created_at"] = "mail_message_created_at"
    measure: Literal["current_record_state_snapshot"] = "current_record_state_snapshot"
    records: RecordGroups
    provider_metrics: ProviderMetrics


class StatisticsEnvelope(Envelope):
    contract_version: Literal["mail-statistics.v1"] = "mail-statistics.v1"
    data: MailStatistics
