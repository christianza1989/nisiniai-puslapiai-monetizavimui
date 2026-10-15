"""Deterministic private copy amendments through the single maintained workflow.

This is a server-owned operator, not a model tool or an approval endpoint. The
caller supplies an authenticated current Session in its restricted transaction.
Filesystem receipts survive SQL rollback or uncertain subprocess completion.
"""
import json
import re
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, JsonValue, ValidationError, model_validator

from ..content_completion.service import parse_node
from ..control.routes import ControlError
from ..tasks.codex_transport import RunnerError
from . import studio
from .media import Hash, native_mutation_guard
from .service import digest

COMMAND = "amend-page-reviewed-copy"
AUTHORITY = ("generation", "sourceVerification", "mediaVerification", "editorialReview", "approval",
             "release", "deployment", "channelActivation", "moduleAdmission")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True, revalidate_instances="always")


class Source(Strict):
    url: str = Field(min_length=1, max_length=2048)
    label: str = Field(min_length=1, max_length=180)
    reason: str = Field(min_length=1, max_length=500)
    verified: bool


class CopyPatch(Strict):
    """Native Node remains the authority for body/link/media validation."""

    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, min_length=1, max_length=220)
    intent: str | None = Field(default=None, min_length=1, max_length=300)
    body: list[dict[str, JsonValue]] | None = Field(default=None, min_length=1, max_length=300)
    factChecks: list[Annotated[str, Field(min_length=1, max_length=600)]] | None = Field(
        default=None, max_length=40)
    externalLinks: list[Source] | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def bounded_patch(self):
        patch = self.model_dump(mode="json", exclude_unset=True)
        if not patch or any(value is None for value in patch.values()):
            raise ValueError("nonempty explicit patch required")
        if any(isinstance(value, str) and not value.strip() for value in patch.values()):
            raise ValueError("meaningful copy required")
        # Native block numeric fields are integral. Python preserves 2.0/-0.0,
        # while JSON.stringify serializes them as 2/0; refuse BEFORE writing so
        # both runtimes bind exactly the same immutable request hash. Oversized
        # integers likewise lose precision in JavaScript.
        def native_json(value):
            if isinstance(value, float) or type(value) is int and abs(value) > 9007199254740991:
                raise ValueError("exact integral native JSON required")
            if isinstance(value, list):
                for item in value:
                    native_json(item)
            elif isinstance(value, dict):
                for key, item in value.items():
                    if not key.isascii():
                        raise ValueError("native structural keys must be ASCII")
                    native_json(item)

        native_json(patch)
        if len(json.dumps(patch, ensure_ascii=False, allow_nan=False).encode()) > 200000:
            raise ValueError("bounded native patch required")
        return self


class Amendment(Strict):
    accepted_revision: int = Field(ge=1, le=20)
    candidate_sha256: Hash
    canonical_host: str = Field(min_length=1, max_length=253)
    page_id: str = Field(pattern=r"^page-[a-f0-9]{24}$")
    operation_id: str = Field(pattern=r"^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$")
    expected_site_sha256: Hash
    expected_revision_sha256: Hash
    expected_planning_sha256: Hash
    patch: CopyPatch
    # Opt-in v2: only named empty/unapproved guide targets can leave the graph.
    # Native code verifies target readiness and preserves every other edge.
    # Absent/None keeps the exact legacy v1 binding and stored receipt format.
    defer_unready_page_ids: list[Annotated[str, Field(pattern=r"^page-[a-f0-9]{24}$")]] | None = Field(
        default=None, min_length=1, max_length=20)

    @model_validator(mode="after")
    def explicit_deferred_graph(self):
        if self.defer_unready_page_ids is not None:
            if (len(set(self.defer_unready_page_ids)) != len(self.defer_unready_page_ids)
                    or "body" not in self.patch.model_fields_set or self.patch.body is None):
                raise ValueError("explicit body and unique deferred target IDs required")
        return self


async def amend(tx, session, creation_id, request, *, seconds=20, still_authorized=None):
    """Apply or reconcile one exact private amendment; never refresh stale inputs.

    A timeout or lost authorization is not proof that no file was written. The
    same immutable operation ID/request must be reconciled by the canonical Node
    receipt under fresh authority. No new GUIDE/Creation job or usage is created.
    """
    try:
        if not isinstance(creation_id, str):
            raise ValueError("creation_id_required")
        identity = str(UUID(creation_id))
        request = Amendment.model_validate(request)
        if (isinstance(seconds, bool) or not isinstance(seconds, (int, float)) or not 0 < seconds <= 20):
            raise ValueError("bounded execution required")
    except (ValueError, TypeError, ValidationError):
        raise ControlError(400, "invalid_content_amendment") from None
    guard = native_mutation_guard(tx, session, identity, request, still_authorized=still_authorized,
        unavailable_code="content_revision_unavailable", stale_code="content_context_stale")
    creation, proof = await guard(lock=True)
    try:
        node, _, artifacts, environment = studio.configuration()
    except RunnerError as error:
        raise ControlError(503, error.code) from None
    script = studio.ROOT / "content-studio/scripts/customer-content-workflow.mjs"
    if not script.is_file():
        raise ControlError(503, "content_completion_unavailable")
    directory = artifacts / "customer-content" / identity / f"revision-{request.accepted_revision}"
    binding = {"operationId": request.operation_id, "creationId": identity,
        "acceptedRevision": request.accepted_revision, "sourceHash": request.candidate_sha256,
        "canonicalHost": request.canonical_host, "pageId": request.page_id,
        "expectedSiteHash": request.expected_site_sha256, "expectedRevisionHash": request.expected_revision_sha256,
        "expectedPlanningHash": request.expected_planning_sha256,
        "patch": request.patch.model_dump(mode="json", exclude_unset=True)}
    if request.defer_unready_page_ids is not None:
        binding["deferUnreadyPageIds"] = request.defer_unready_page_ids
    request_hash = digest(binding)
    payload = {"command": COMMAND, **binding, "artifactsRoot": str(artifacts),
        "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}

    async def authorized():
        await guard()
        return True

    try:
        value = await studio._execute([node, script], payload, environment, authorized, seconds)
    except RunnerError as error:
        conflict = {"writer_context_stale", "workflow_context_stale", "workflow_amendment_busy",
            "workflow_amendment_receipt_conflict", "workflow_amendment_uncertain"}
        raise ControlError(401 if error.code == "authorization_revoked" else
            409 if error.code in conflict else 503, error.code) from None
    creation, proof = await guard()
    completion = parse_node(value, creation, proof)
    try:
        operation = value["operation"]
        result = operation["result"]
        page = next(p for p in completion["pages"] if p["page_id"] == request.page_id)
        expected = {"version": "native-reviewed-copy-amendment.v2" if request.defer_unready_page_ids is not None
                    else "native-reviewed-copy-amendment.v1", "state": "applied",
            "operationId": request.operation_id, "creationId": identity,
            "acceptedRevision": request.accepted_revision, "sourceHash": request.candidate_sha256,
            "canonicalHost": request.canonical_host, "siteId": proof["site_id"], "pageId": request.page_id,
            "requestHash": request_hash, "beforeSiteHash": request.expected_site_sha256,
            "beforeRevisionHash": request.expected_revision_sha256,
            "beforePlanningHash": request.expected_planning_sha256,
            "appliedSiteHash": completion["site_context_sha256"],
            "appliedRevisionHash": page["revision_sha256"], "appliedPlanningHash": page["planning_sha256"],
            **dict.fromkeys(AUTHORITY, "not-performed")}
        extra = {"receiptSha256", "beforePageSha256", "appliedPageSha256", "changed", "replayed"}
        if (operation["command"] != COMMAND or operation["deployment"] != "not-performed"
                or not isinstance(result, dict) or set(result) != set(expected) | extra
                or any(result[key] != expected_value for key, expected_value in expected.items())
                or any(type(result[key]) is not bool for key in ("changed", "replayed"))
                or any(not isinstance(result[key], str) or not re.fullmatch(r"[a-f0-9]{64}", result[key])
                       for key in ("receiptSha256", "beforePageSha256", "appliedPageSha256"))):
            raise ValueError("exact amendment receipt required")
    except (ValueError, TypeError, KeyError, StopIteration):
        raise ControlError(503, "invalid_content_amendment_source") from None
    return {"completion": completion, "amendment": result}
