"""Additive typed-work DTO; existing chat/operations v1 schemas remain exact."""

from datetime import datetime
from typing import Literal

from pydantic import Field

from .interfaces import NoExternalSend, Wire

UUID_PATTERN = r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
SHA_PATTERN = r"^[a-f0-9]{64}$"


class CaptureResult(NoExternalSend):
    state: Literal["captured"]
    synthetic: Literal[True]
    thread_id: str = Field(pattern=UUID_PATTERN)
    case_id: str = Field(pattern=UUID_PATTERN)
    mail_id: str = Field(pattern=UUID_PATTERN)


class TaskView(Wire):
    task_id: str = Field(pattern=UUID_PATTERN)
    thread_id: str = Field(pattern=UUID_PATTERN)
    business_id: str = Field(pattern=UUID_PATTERN)
    sequence: int = Field(ge=1, le=20)
    kind: Literal["acquisition.reviewed_capture"]
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    message: str = Field(min_length=1, max_length=1000)
    created_at: datetime
    updated_at: datetime
    result: CaptureResult | None
    failure_code: str | None


class Execution(Wire):
    run_id: str = Field(pattern=UUID_PATTERN)
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    model: Literal["none"]
    effort: Literal["none"]
    adapter_revision: Literal["acquisition-reviewed-capture.v1"]
    started_at: datetime
    finished_at: datetime | None
    model_calls: Literal[0] | None
    cost_microusd: None = None


class TaskReport(Wire):
    agent_id: Literal["acquisition-reviewed-capture"] = "acquisition-reviewed-capture"
    task: TaskView
    execution: Execution | None
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")


class TaskPage(Wire):
    business_id: str = Field(pattern=UUID_PATTERN)
    items: tuple[TaskView, ...] = Field(max_length=50)
    next_cursor: str | None
    snapshot_id: str = Field(pattern=SHA_PATTERN)


class Event(Wire):
    sequence: int = Field(ge=1)
    task_id: str = Field(pattern=UUID_PATTERN)
    status: Literal["queued", "running", "succeeded", "failed", "cancelled"]
    created_at: datetime
    failure_code: str | None


class EventPage(Wire):
    task_id: str = Field(pattern=UUID_PATTERN)
    items: tuple[Event, ...] = Field(max_length=50)
    next_sequence: int = Field(ge=0)


class Envelope(Wire):
    contract_version: Literal["acquisition-tasks.v1"] = "acquisition-tasks.v1"
    environment: str
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    observed_at: datetime
    request_id: str


class TaskEnvelope(Envelope):
    data: TaskView


class ReportEnvelope(Envelope):
    data: TaskReport


class PageEnvelope(Envelope):
    data: TaskPage


class EventsEnvelope(Envelope):
    data: EventPage
