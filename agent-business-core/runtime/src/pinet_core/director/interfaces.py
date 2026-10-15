"""Additive private owner wire; never expose prompt, history, keys or mail text."""

from typing import Annotated, Literal

from pydantic import AwareDatetime, Field, model_validator

from ..acquisition.interfaces import Wire
from ..acquisition.projection import CaptureLedgerSnapshot
from ..acquisition.work_interfaces import WorkSnapshot

ADAPTER_REVISION = "codex-consult.director.v1"
CAPTURE = "acquisition.capture.read"
WORK = "acquisition.correspondence.read"
Digest = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
Source = Annotated[str, Field(pattern=r"^[a-f0-9]{40}$")]
Identifier = Annotated[str, Field(pattern=r"^[a-f0-9-]{36}$")]


class CaptureTool(Wire):
    name: Literal["acquisition.capture.read"]
    status: Literal["available"]
    data: CaptureLedgerSnapshot
    reason: None


class WorkTool(Wire):
    name: Literal["acquisition.correspondence.read"]
    status: Literal["available"]
    data: WorkSnapshot
    reason: None


class UnavailableTool(Wire):
    name: Literal["acquisition.capture.read", "acquisition.correspondence.read"]
    status: Literal["unavailable"]
    data: None
    reason: str = Field(min_length=1, max_length=100, pattern=r"^[a-z_]+$")


class ToolList(Wire):
    tools: tuple[CaptureTool | WorkTool | UnavailableTool, ...] = Field(min_length=2, max_length=2)

    @model_validator(mode="after")
    def fixed_order(self):
        if [item.name for item in self.tools] != [CAPTURE, WORK]:
            raise ValueError("fixed_director_read_tools_required")
        return self


class Context(ToolList):
    source_revision: Source
    input_sha256: Digest
    created_at: AwareDatetime


class ContextData(Wire):
    task_id: Identifier
    run_id: Identifier | None
    context: Context | None


class Availability(Wire):
    business_id: Identifier
    configured: bool
    read_only: Literal[True]
    interactive_cli_tools: Literal[False]
    adapter_revision: Literal["codex-consult.director.v1"]
    tools: tuple[Literal["acquisition.capture.read", "acquisition.correspondence.read"], ...]
    worker_health: Literal["unknown"]


class Envelope(Wire):
    contract_version: Literal["director-read.v1"]
    source_revision: Source
    observed_at: AwareDatetime
    request_id: Identifier


class ContextEnvelope(Envelope):
    data: ContextData


class AvailabilityEnvelope(Envelope):
    data: Availability


SCHEMAS = (ContextEnvelope, AvailabilityEnvelope)
