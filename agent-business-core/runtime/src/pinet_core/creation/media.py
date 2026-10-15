"""Attach existing case-owned raster bytes through the maintained native workflow.

The caller owns the SQL transaction; existing actor/Creation locks serialize native
admission while this bounded adapter runs. No provider, credential or activation.
"""
import asyncio
import re
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select

from ..config import settings
from ..content_completion.service import enabled, parse_node
from ..content_work.models import GuideJob
from ..content_work.service import archived
from ..control.routes import ControlError
from ..creation_registration.service import accepted_proof
from ..customer_text.adapter import source_current
from ..site_build import continuation
from ..tasks.codex_transport import RunnerError
from . import studio
from .routes import owned
from .service import ACTIVE, digest

Hash = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class MediaAttachment(BaseModel):
    """Server-owned request: never accept filenames/rights from customer JSON."""

    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    accepted_revision: int = Field(ge=1, le=20)
    candidate_sha256: Hash
    canonical_host: str = Field(min_length=1, max_length=253)
    page_id: str = Field(pattern=r"^page-[a-f0-9]{24}$")
    expected_site_sha256: Hash
    expected_revision_sha256: Hash
    expected_planning_sha256: Hash
    source_name: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,115}\.(?:png|jpg|jpeg|webp)$")
    source_sha256: Hash
    mime: str = Field(pattern=r"^image/(?:png|jpeg|webp)$")
    alt: str = Field(min_length=1, max_length=300)
    rights: str = Field(min_length=1, max_length=300)
    credit: str = Field(default="", max_length=200)
    prompt: str = Field(default="", max_length=20000)


def native_mutation_guard(tx, session, identity, request, *, still_authorized=None,
                          unavailable_code="media_revision_unavailable", stale_code="media_context_stale"):
    """Shared current-owner/S6 boundary for fixed native mutations, never admission.

    The caller owns the SQL transaction. Keep the same actor/Creation lock order
    for media and deterministic copy corrections; neither may reuse a GUIDE job.
    """
    source_pin = settings().control_source_revision
    original_proof = None

    async def guard(*, lock=False):
        nonlocal original_proof
        enabled()
        if (settings().control_source_revision != source_pin
                or not await asyncio.to_thread(source_current)):
            raise ControlError(503, "source_unavailable")
        creation = await owned(tx, session, identity, lock=lock)
        await tx.refresh(creation)
        if (creation.status != "draft_ready" or creation.active_job_id
                or creation.current_revision != request.accepted_revision or await archived(tx, creation)):
            raise ControlError(409, unavailable_code)
        if await tx.scalar(select(GuideJob.id).where(GuideJob.creation_id == identity, GuideJob.status.in_(ACTIVE))):
            raise ControlError(409, "content_work_busy")
        proof = await accepted_proof(tx, creation)
        if (proof["accepted_revision"] != request.accepted_revision
                or proof["candidate_sha256"] != request.candidate_sha256
                or proof["canonical_host"] != request.canonical_host
                or original_proof is not None and proof != original_proof):
            raise ControlError(409, stale_code)
        if proof["accepted_source_revision"] != source_pin:
            if not await continuation.schema_ready(tx):
                raise ControlError(409, "build_continuation_stale")
            current = await continuation.latest(tx, creation)
            if not current or not await continuation.current(tx, creation, current):
                raise ControlError(409, "build_continuation_stale")
        if still_authorized is not None and not await still_authorized():
            raise ControlError(401, "unauthenticated")
        original_proof = proof
        return creation, proof

    return guard


async def attach(tx, session, creation_id, request, *, seconds=20, still_authorized=None):
    """Import/attach once, retaining case receipts even if later checks refuse.

    Uses a current owner and accepted proof, including explicit S6 when historical
    accepted material crosses a code release. Does not renew or mutate SQL jobs.
    """
    try:
        if not isinstance(creation_id, str):
            raise ValueError("creation_id_required")
        identity = str(UUID(creation_id))
        if not isinstance(request, MediaAttachment):
            request = MediaAttachment.model_validate(request)
    except (ValueError, TypeError, ValidationError):
        raise ControlError(400, "invalid_media_attachment") from None
    if (isinstance(seconds, bool) or not isinstance(seconds, (int, float))
            or not 0 < seconds <= 20 or not request.alt.strip() or not request.rights.strip()):
        raise ControlError(400, "invalid_media_attachment")
    guard = native_mutation_guard(tx, session, identity, request, still_authorized=still_authorized)

    # This follows existing admission lock order. The transaction is caller-owned.
    creation, proof = await guard(lock=True)
    try:
        node, _, artifacts, environment = studio.configuration()
    except RunnerError as error:
        raise ControlError(503, error.code) from None
    script = studio.ROOT / "content-studio/scripts/customer-content-workflow.mjs"
    if not script.is_file():
        raise ControlError(503, "content_completion_unavailable")
    directory = artifacts / "customer-content" / identity / f"revision-{request.accepted_revision}"
    metadata = {key: getattr(request, key) for key in ("mime", "alt", "rights", "credit", "prompt")}
    payload = {"command": "attach-media", "creationId": identity, "acceptedRevision": request.accepted_revision,
        "sourceHash": request.candidate_sha256, "canonicalHost": request.canonical_host, "pageId": request.page_id,
        "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output"),
        "sourcePath": str(directory / "media-inputs" / request.source_name), "metadata": metadata,
        "expectedSourceSha256": request.source_sha256, "expectedSiteHash": request.expected_site_sha256,
        "expectedRevisionHash": request.expected_revision_sha256, "expectedPlanningHash": request.expected_planning_sha256}
    request_hash = digest({"creationId": identity, "acceptedRevision": request.accepted_revision,
        "sourceHash": request.candidate_sha256, "canonicalHost": request.canonical_host, "pageId": request.page_id,
        "sourceSha256": request.source_sha256, "metadata": metadata})

    async def authorized():
        await guard()
        return True

    try:
        value = await studio._execute([node, script], payload, environment, authorized, seconds)
    except RunnerError as error:
        raise ControlError(401 if error.code == "authorization_revoked" else
            409 if error.code in {"writer_context_stale", "workflow_context_stale", "workflow_media_receipt_conflict",
                                 "workflow_media_busy", "workflow_media_import_uncertain"} else 503, error.code) from None
    creation, proof = await guard()
    completion = parse_node(value, creation, proof)
    try:
        operation = value["operation"]
        result = operation["result"]
        page = next(p for p in completion["pages"] if p["page_id"] == request.page_id)
        if (operation["command"] != "attach-media" or operation["deployment"] != "not-performed"
                or result["requestHash"] != request_hash or result["state"] != "attached"
                or result["sourceSha256"] != request.source_sha256 or result["pageId"] != request.page_id
                or result["appliedRevisionHash"] != page["revision_sha256"]
                or result["appliedPlanningHash"] != page["planning_sha256"]
                or any(result[k] != "not-performed" for k in ("approval", "mediaVerification", "generation"))
                or type(result["changed"]) is not bool or type(result["replayed"]) is not bool
                or not re.fullmatch(r"[a-f0-9]{64}", result["receiptSha256"])
                or not isinstance(result["variantIds"], list) or not 1 <= len(result["variantIds"]) <= 5
                or len(set(result["variantIds"])) != len(result["variantIds"])
                or result["assetId"] not in result["variantIds"]
                or any(not isinstance(v, str) or not re.fullmatch(r"[a-f0-9-]{36}", v) for v in result["variantIds"])
                or page["media_count"] < len(result["variantIds"]) or not page["media_files_present"]):
            raise ValueError("invalid_media_attachment_receipt")
    except (ValueError, TypeError, KeyError, StopIteration):
        raise ControlError(503, "invalid_media_attachment_source") from None
    return {"completion": completion, "attachment": result}
