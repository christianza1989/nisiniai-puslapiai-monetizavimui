"""Imported evidence is immutable provenance, never a current score/admission."""
from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from ..creation_registration.wire import Source, Strict
from .wire import Digest


class HistoricalCalibration(Strict):
    evidence_sha256: Digest
    runtime_source_revision: Source
    instruction_sha256: Digest
    knowledge_sha256: Digest
    evaluated_at: datetime

    @model_validator(mode="after")
    def aware(self):
        if self.evaluated_at.tzinfo is None:
            raise ValueError("calibration_timestamp_timezone_required")
        return self


class ImportProvenance(Strict):
    version: Literal["external-agent-provenance.v1"] = "external-agent-provenance.v1"
    origin_agent_key: str = Field(pattern=r"^[A-Za-z0-9_.-]{1,100}$")
    origin_config_revision: str = Field(min_length=1, max_length=100)
    artifact_sha256: Digest
    instruction_sha256: Digest
    knowledge_sha256: Digest
    historical_calibration: HistoricalCalibration | None = None
