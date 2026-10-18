"""Explicit display-only authority; no acquisition, send, or reply permission."""
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, model_validator

from ..contracts import Strict
from ..creation_registration.wire import Source
from .task_schema import ADAPTER as ADAPTER
from .task_schema import EFFORT as EFFORT
from .task_schema import KIND as KIND
from .task_schema import MODEL as MODEL
from .wire import Digest


class Approve(Strict):
    policy_id: UUID
    business_id: UUID
    authorizing_session_id: UUID
    execution_source_revision: Source
    model_execution_authorized: bool = Field(strict=True)
    maximum_calls: int = Field(strict=True, ge=1, le=30)
    duration_seconds: int = Field(strict=True, ge=30, le=3600)
    mail_created_after: AwareDatetime

    @model_validator(mode="after")
    def explicit(self):
        if self.model_execution_authorized is not True:
            raise ValueError("explicit_display_model_authorization_required")
        return self


class Stop(Strict):
    policy_id: UUID
    authorizing_session_id: UUID
    execution_source_revision: Source
    expected_fingerprint: Digest


class Enqueue(Strict):
    policy_id: UUID
    mail_id: UUID


class PreviousDisplay(Strict):
    previous_task_id: UUID
    expected_source_sha256: Digest


class Reauthorize(Approve):
    version: Literal["mail-display-zero-dispatch-reauthorization.v1"]
    maximum_calls: int = Field(strict=True, ge=1, le=3)
    jobs: list[PreviousDisplay] = Field(min_length=1, max_length=3)

    @model_validator(mode="after")
    def exact_batch(self):
        if self.maximum_calls != len(self.jobs) or len({item.previous_task_id for item in self.jobs}) != len(self.jobs):
            raise ValueError("exact_named_display_reauthorization_required")
        return self
