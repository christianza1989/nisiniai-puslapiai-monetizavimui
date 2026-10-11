"""Reviewed task specifications are data, never tool or channel permissions."""
import json
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from ..creation_registration.wire import Source, Strict

Purpose = Literal["site_chat", "customer_research", "email", "custom"]
Revision = Annotated[int, Field(strict=True, ge=1, le=2147483647)]
Text = Annotated[str, Field(min_length=1, max_length=1000)]
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class Example(Strict):
    input: Text
    expected: Text


class Specification(Strict):
    name: str = Field(min_length=1, max_length=100)
    goal: str = Field(min_length=10, max_length=2000)
    audience: Text
    inputs: list[Text] = Field(min_length=1, max_length=12)
    outputs: list[Text] = Field(min_length=1, max_length=12)
    boundaries: list[Text] = Field(min_length=1, max_length=12)
    escalation: Text
    autonomy: Literal["recommendations_only", "drafts_for_review"]
    sources: list[Text] = Field(max_length=20)
    examples: list[Example] = Field(min_length=1, max_length=12)
    unknowns: list[Text] = Field(max_length=20)

    @model_validator(mode="after")
    def bounded_meaningful(self):
        material = self.model_dump(mode="json")

        def validate(value):
            if isinstance(value, str):
                if not value.strip() or any(ord(c) < 32 and c not in "\n\t" for c in value):
                    raise ValueError("invalid_specification_text")
            elif isinstance(value, dict):
                for item in value.values():
                    validate(item)
            elif isinstance(value, list):
                for item in value:
                    validate(item)

        validate(material)
        if len(json.dumps(material, ensure_ascii=False).encode()) > 32768:
            raise ValueError("specification_too_large")
        return self


class Create(Strict):
    request_id: UUID
    purpose: Purpose
    configuration: Specification


class Revise(Strict):
    request_id: UUID
    expected_revision: Revision
    configuration: Specification


class Agent(Strict):
    agent_id: UUID
    creation_id: UUID
    business_id: UUID
    registration_id: UUID
    purpose: Purpose
    name: str = Field(min_length=1, max_length=100)
    current_revision: Revision
    created_at: datetime
    updated_at: datetime
    configuration_state: Literal["draft"] = "draft"
    enabled: Literal[False] = False


class Config(Strict):
    revision_id: UUID
    agent_id: UUID
    revision: Revision
    specification: Specification
    sha256: Digest
    saved_at: datetime
    saved_source_revision: Source


class Readiness(Strict):
    configuration_saved: Literal[True] = True
    can_edit_configuration: bool
    calibration_status: Literal["UNVERIFIED"] = "UNVERIFIED"
    module_admission: Literal["not_admitted"] = "not_admitted"
    can_calibrate: Literal[False] = False
    can_activate: Literal[False] = False
    channel_activation: Literal["not_performed"] = "not_performed"
    provider_execution: Literal[False] = False
    blockers: list[Literal["calibration_not_implemented", "module_admission_missing", "agent_business_not_current"]] = Field(min_length=2, max_length=3)


class Detail(Strict):
    agent: Agent
    configuration: Config
    readiness: Readiness


class Saved(Detail):
    action: Literal["created", "revised", "replayed"]
    request_id: UUID


class PurposeCapability(Strict):
    purpose: Purpose
    configuration_supported: Literal[True] = True
    calibration_supported: Literal[False] = False
    activation_supported: Literal[False] = False


class Listing(Strict):
    creation_id: UUID
    items: list[Agent] = Field(max_length=50)
    purposes: list[PurposeCapability] = Field(min_length=4, max_length=4)
    can_create_draft: bool
    configuration_blockers: list[Literal["agent_business_not_current"]] = Field(max_length=1)
    has_more: bool
    next_cursor: str | None = Field(default=None, max_length=2048)


class RevisionSummary(Strict):
    revision_id: UUID
    revision: Revision
    sha256: Digest
    saved_at: datetime
    saved_source_revision: Source


class Revisions(Strict):
    agent_id: UUID
    items: list[RevisionSummary] = Field(max_length=50)
    has_more: bool
    next_cursor: str | None = Field(default=None, max_length=2048)


class Envelope(Strict):
    contract_version: Literal["customer-agents.v1"]
    environment: Literal["local", "test"]
    request_id: UUID
    observed_at: datetime
    source_revision: Source
    data: Detail


class SavedEnvelope(Envelope):
    data: Saved


class ListingEnvelope(Envelope):
    data: Listing


class RevisionsEnvelope(Envelope):
    data: Revisions


Count = Annotated[int, Field(strict=True, ge=0)]


class TestUsage(Strict):
    attempts: Count
    settled: Count
    known_receipts: Count
    complete: bool
    input_tokens: Count | None = None
    output_tokens: Count | None = None
    cost_status: Literal["UNVERIFIED"]


class TestQuality(Strict):
    state: Literal["not_requested", "running", "failed", "succeeded", "UNVERIFIED"]
    model: Literal["gpt-6.1-sol"]
    applies_to_latest_transcript: bool
    evaluator_sha256: Digest | None = None
    outcome: Literal["helpful", "needs_review", "incomplete", "no_interaction"] | None = None
    issues_count: Count | None = None
    root_cause: Literal["communication", "knowledge", "tool", "transport", "transcription", "unknown"] | None = None


class TestRun(Strict):
    conversation_id: UUID
    created_at: datetime
    need_revision: Count
    config_revision: Revision
    config_sha256: Digest
    current_configuration: bool
    profile_admission_id: UUID
    profile_fingerprint: Digest
    profile_revoked: bool
    execution_source_revision: Source
    execution_source_current: bool
    script_sha256: Digest
    customer_turns: Count
    succeeded_turns: Count
    script_complete: bool
    events_truncated: bool
    usage: TestUsage
    quality: TestQuality


class TestRuns(Strict):
    creation_id: UUID
    agent_id: UUID
    revision: Revision
    items: list[TestRun] = Field(max_length=50)
    has_more: bool
    next_cursor: str | None = Field(default=None, max_length=2048)
    scope: Literal["operator_local_task_calibration"]
    evidence_only: Literal[True]
    calibration_status: Literal["UNVERIFIED"]
    module_admission: Literal["not_admitted"]
    activation: Literal["not_performed"]
    provider_execution: Literal[False]


class TestRunsEnvelope(Envelope):
    data: TestRuns


Score = Annotated[int, Field(strict=True, ge=0, le=5)]


class NumericScores(Strict):
    relevance: Score
    factual_accuracy: Score
    listening: Score
    useful_next_step: Score
    email_quality: Score


class CompetenceEvidence(Strict):
    state: Literal["not_requested", "UNVERIFIED", "competent", "needs_review"]
    contract: Literal["network-competence.v1"] | None = None
    criterion_sha256: Digest | None = None
    threshold: Literal[4] | None = None
    scores: NumericScores | None = None
    critical_issues_count: Count | None = None
    language_quality: Literal["UNVERIFIED"]
    typed_checks: Literal["UNVERIFIED"]
    protected_comparison: Literal["not_performed"]
    module_admission: Literal["not_admitted"]
    activation: Literal["not_performed"]

    @model_validator(mode="after")
    def measured_fields(self):
        values = (self.contract, self.criterion_sha256, self.threshold, self.scores, self.critical_issues_count)
        if self.state in {"competent", "needs_review"}:
            if any(value is None for value in values):
                raise ValueError("measured_score_receipts_required")
        elif any(value is not None for value in values):
            raise ValueError("unverified_scores_not_exposed")
        return self


class ScoreEvidenceRun(TestRun):
    competence: CompetenceEvidence


class ScoreEvidenceRuns(TestRuns):
    items: list[ScoreEvidenceRun] = Field(max_length=50)


class ScoreEvidenceEnvelope(Envelope):
    data: ScoreEvidenceRuns


class ConfigEnvelope(Envelope):
    data: Config


class Error(Strict):
    code: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=1000)
    request_id: UUID
