"""Explicit current-Session review and approval, separate from preparation.

Only canonical Node model writers may change native review/approval. Immutable
operation receipts survive a lost response or SQL rollback; uncertain dispatch
never becomes an implicit retry, invented review, release or deployment.
"""
import json
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from ..config import settings
from ..content_completion.service import parse_node
from ..content_completion.wire import CompletionView
from ..control.routes import ControlError
from ..tasks.codex_transport import RunnerError
from . import studio
from .media import Hash, native_mutation_guard
from .service import digest

COMMAND = "review-editorial"
VERSION = "native-editorial-review.v1"
CONTRACT = "editorial-review.v1"
PageId = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9-]{1,79}$")]
OperationId = Annotated[str, Field(pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True, revalidate_instances="always")


class Context(Strict):
    accepted_revision: int = Field(ge=1, le=20)
    candidate_sha256: Hash
    canonical_host: str = Field(min_length=1, max_length=253)
    operation_id: OperationId
    expected_site_sha256: Hash


class PagePin(Strict):
    page_id: PageId
    revision_sha256: Hash
    planning_sha256: Hash


class Evidence(Strict):
    usefulness: str = Field(min_length=20, max_length=4000)
    facts: str = Field(min_length=20, max_length=4000)
    sources: str = Field(min_length=20, max_length=4000)
    media: str = Field(min_length=20, max_length=4000)
    links: str = Field(min_length=20, max_length=4000)
    presentation: str = Field(min_length=20, max_length=4000)

    @field_validator("*")
    @classmethod
    def meaningful(cls, value):
        value = value.strip()
        if len(value) < 20 or len(value.encode("utf-16-le")) // 2 > 4000:
            raise ValueError("actual bounded review evidence required")
        return value


class RecordReview(Context):
    page: PagePin
    evidence: Evidence


class ApproveBatch(Context):
    pages: list[PagePin] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def unique_pages(self):
        if len({page.page_id for page in self.pages}) != len(self.pages):
            raise ValueError("unique exact page pins required")
        return self


class PageReceipt(PagePin):
    review_sha256: Hash
    reviewer: str = Field(min_length=1, max_length=120)
    approved_revision_sha256: Hash | None
    approval_sha256: Hash | None

    @model_validator(mode="after")
    def approval_coherence(self):
        if (self.approved_revision_sha256 is None) != (self.approval_sha256 is None):
            raise ValueError("exact retained approval required")
        return self


class Operation(Strict):
    version: Literal[VERSION]
    state: Literal["applied"]
    operation_id: OperationId
    action: Literal["record-review", "approve-batch"]
    actor_id: str = Field(pattern=r"^session-user:[a-f0-9-]{36}$")
    request_sha256: Hash
    before_site_sha256: Hash
    applied_site_sha256: Hash
    before_evidence_sha256: Hash
    receipt_sha256: Hash
    pages: list[PageReceipt] = Field(min_length=1, max_length=200)
    changed: bool
    replayed: bool
    editorial_review: Literal["recorded", "not-performed"]
    approval: Literal["approved", "not-performed"]
    release: Literal["not-performed"]
    deployment: Literal["not-performed"]
    full_site: Literal["UNVERIFIED"]
    launch: Literal["UNVERIFIED"]


class Result(Strict):
    completion: CompletionView
    operation: Operation


class EditorialResultEnvelope(Strict):
    contract_version: Literal[CONTRACT]
    environment: Literal["local", "test"]
    source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
    observed_at: datetime
    request_id: UUID
    data: Result


def checked(creation_id, request, schema, seconds):
    try:
        if not isinstance(creation_id, str):
            raise ValueError("creation ID required")
        identity = str(UUID(creation_id))
        request = schema.model_validate(request)
        if isinstance(seconds, bool) or not isinstance(seconds, (int, float)) or not 0 < seconds <= 20:
            raise ValueError("bounded native execution required")
        return identity, request
    except (ValueError, TypeError, ValidationError):
        raise ControlError(400, "invalid_editorial_review") from None


def native_pin(page):
    return {"pageId": page.page_id, "revisionHash": page.revision_sha256, "planningHash": page.planning_sha256}


async def record_review(tx, session, creation_id, request, *, seconds=20, still_authorized=None):
    identity, request = checked(creation_id, request, RecordReview, seconds)
    return await _run(tx, session, identity, request, "record-review", [request.page], seconds, still_authorized)


async def approve_batch(tx, session, creation_id, request, *, seconds=20, still_authorized=None):
    identity, request = checked(creation_id, request, ApproveBatch, seconds)
    return await _run(tx, session, identity, request, "approve-batch", request.pages, seconds, still_authorized)


async def _run(tx, session, identity, request, action, pages, seconds, still_authorized):
    guard = native_mutation_guard(tx, session, identity, request, still_authorized=still_authorized,
        unavailable_code="editorial_revision_unavailable", stale_code="editorial_context_stale")
    creation, proof = await guard(lock=True)
    try:
        actor_id = "session-user:" + str(UUID(session.user_id))
        session_id = str(UUID(session.id))
        node, _, artifacts, environment = studio.configuration()
    except (ValueError, TypeError, AttributeError):
        raise ControlError(401, "unauthenticated") from None
    except RunnerError as error:
        raise ControlError(503, error.code) from None
    script = studio.ROOT / "content-studio/scripts/customer-content-workflow.mjs"
    if not script.is_file():
        raise ControlError(503, "content_completion_unavailable")
    directory = artifacts / "customer-content" / identity / f"revision-{request.accepted_revision}"
    payload = {"command": COMMAND, "creationId": identity, "acceptedRevision": request.accepted_revision,
        "sourceHash": request.candidate_sha256, "canonicalHost": request.canonical_host,
        "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output"),
        "operationId": request.operation_id, "action": action, "expectedSiteHash": request.expected_site_sha256,
        "pages": [native_pin(page) for page in pages], "actorId": actor_id, "authorizingSessionId": session_id,
        "sourceRevision": settings().control_source_revision}
    if action == "record-review":
        payload["evidence"] = request.evidence.model_dump(mode="json")

    async def authorized():
        await guard()
        return True

    try:
        value = await studio._execute([node, script], payload, environment, authorized, seconds)
    except RunnerError as error:
        conflict = {"writer_context_stale", "workflow_context_stale", "workflow_review_busy", "workflow_review_conflict",
                    "workflow_review_uncertain", "workflow_review_rejected", "workflow_review_receipt_invalid"}
        raise ControlError(401 if error.code == "authorization_revoked" else 409 if error.code in conflict else 503,
            error.code) from None
    creation, proof = await guard()
    completion = parse_node(value, creation, proof)
    binding = {key: item for key, item in payload.items() if key not in {
        "command", "artifactsRoot", "dataDir", "outputDir", "authorizingSessionId"}}
    try:
        wrapper = value["operation"]
        result = wrapper["result"]
        expected = {"version": VERSION, "state": "applied", "operationId": request.operation_id,
            "creationId": identity, "acceptedRevision": request.accepted_revision, "sourceHash": request.candidate_sha256,
            "canonicalHost": request.canonical_host, "siteId": proof["site_id"], "action": action, "actorId": actor_id,
            "requestHash": digest(binding), "beforeSiteHash": request.expected_site_sha256,
            "appliedSiteHash": completion["site_context_sha256"],
            "editorialReview": "recorded" if action == "record-review" else "not-performed",
            "approval": "approved" if action == "approve-batch" else "not-performed",
            "release": "not-performed", "deployment": "not-performed", "fullSite": "UNVERIFIED", "launch": "UNVERIFIED"}
        if (wrapper["command"] != COMMAND or wrapper["deployment"] != "not-performed"
                or set(result) != set(expected) | {"beforeEvidenceSha256", "receiptSha256", "pageRevisions", "changed", "replayed"}
                or any(result[key] != item for key, item in expected.items())
                or result["replayed"] and result["changed"] or type(result["changed"]) is not bool
                or type(result["replayed"]) is not bool or len(result["pageRevisions"]) != len(pages)):
            raise ValueError("exact retained editorial receipt required")
        current = {page["page_id"]: page for page in completion["pages"]}
        receipts = []
        for pin, row in zip(pages, result["pageRevisions"], strict=True):
            if (set(row) != {"pageId", "revisionHash", "planningHash", "reviewSha256", "reviewer", "approvedRevisionHash", "approvalSha256"}
                    or any(row[key] != item for key, item in native_pin(pin).items())
                    or not current[pin.page_id]["review_current"]
                    or current[pin.page_id]["revision_sha256"] != pin.revision_sha256
                    or current[pin.page_id]["planning_sha256"] != pin.planning_sha256
                    or current[pin.page_id]["reviewer"] != row["reviewer"]
                    or action == "record-review" and row["reviewer"] != actor_id
                    or action == "approve-batch" and row["approvedRevisionHash"] != pin.revision_sha256
                    or current[pin.page_id]["approved_revision_sha256"] != row["approvedRevisionHash"]):
                raise ValueError("exact current page/review/approval proof required")
            receipts.append({**pin.model_dump(mode="json"), "review_sha256": row["reviewSha256"], "reviewer": row["reviewer"],
                "approved_revision_sha256": row["approvedRevisionHash"], "approval_sha256": row["approvalSha256"]})
        operation = {"version": VERSION, "state": "applied", "operation_id": request.operation_id, "action": action,
            "actor_id": actor_id, "request_sha256": result["requestHash"], "before_site_sha256": request.expected_site_sha256,
            "applied_site_sha256": result["appliedSiteHash"], "before_evidence_sha256": result["beforeEvidenceSha256"],
            "receipt_sha256": result["receiptSha256"], "pages": receipts, "changed": result["changed"], "replayed": result["replayed"],
            "editorial_review": expected["editorialReview"], "approval": expected["approval"], "release": "not-performed",
            "deployment": "not-performed", "full_site": "UNVERIFIED", "launch": "UNVERIFIED"}
        response = Result.model_validate_json(json.dumps({"completion": completion, "operation": operation})).model_dump(mode="json")
    except (ValueError, TypeError, KeyError, ValidationError):
        raise ControlError(503, "invalid_editorial_review_source") from None
    await guard()
    return response
