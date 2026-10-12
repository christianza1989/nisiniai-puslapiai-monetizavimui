"""Read-only exact accepted-intake binding, live studio state and final current ownership."""
import base64
import hashlib
import json
import re
from uuid import UUID

from sqlalchemy import select

from ..config import settings
from ..control.models import User
from ..control.routes import ControlError
from ..creation import language_mode, studio
from ..creation.adapter import ROOT
from ..creation.models import Creation
from ..creation.review import canonical_sha256
from ..creation.service import ACTIVE, current_actor
from ..creation_registration.service import accepted_proof
from ..tasks.codex_transport import RunnerError
from .page_wire import Document, Media, PageView
from .wire import CompletionView


def enabled():
    cfg = settings()
    if (not cfg.customer_enabled or not cfg.creation_enabled or cfg.control_mode != "local"
            or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
            or not re.fullmatch(r"[a-f0-9]{40}", cfg.control_source_revision)):
        raise ControlError(503, "content_completion_unavailable")


def parse_node(value, creation, proof):
    """Translate canonical observations, without reimplementing readiness or approval."""
    try:
        if (not isinstance(value, dict) or value.get("version") != "customer-content-workflow.v1"
                or value.get("state") != "current" or value.get("creationId") != creation.id
                or value.get("acceptedRevision") != proof["accepted_revision"]
                or value.get("sourceHash") != proof["candidate_sha256"]
                or value.get("siteId") != proof["site_id"] or value.get("canonicalHost") != proof["canonical_host"]
                or value.get("release") != "UNVERIFIED"):
            raise ValueError("Invalid live source binding")
        workflow = value["workflow"]
        if (workflow["siteId"] != proof["site_id"] or workflow["canonicalHost"] != proof["canonical_host"]
                or workflow["workflowVersion"] != 1 or workflow["deployment"] != "not-verified-by-studio"):
            raise ValueError("Invalid canonical workflow")
        observed = {page["pageId"]: page for page in workflow["pages"]}
        details = value["pages"]
        if (len(observed) != len(workflow["pages"]) or len(details) != len(observed)
                or {p["pageId"] for p in details} != set(observed)):
            raise ValueError("Inconsistent page inventory")
        pages = []
        for detail in details:
            page = observed[detail["pageId"]]
            if (detail["revisionHash"] != page["revisionHash"] or detail["title"] != page["title"]
                    or detail["reviewCurrent"] != page["reviewCurrent"]
                    or detail["hasApprovedRevision"] != page["hasApprovedRevision"]):
                raise ValueError("Inconsistent current page")
            pages.append({"page_id": detail["pageId"], "path": detail["path"], "type": detail["type"],
                "title": detail["title"], "revision_sha256": page["revisionHash"], "planning_sha256": detail["planningHash"],
                "state": page["state"], "blockers": page["blockers"], "fact_notes": detail["factChecks"],
                "sources": detail["externalLinks"], "media_count": detail["mediaCount"],
                "media_files_present": detail["mediaFilesPresent"], "review_current": page["reviewCurrent"],
                "reviewed_at": detail["reviewedAt"], "reviewer": detail["reviewer"],
                "has_approved_revision": page["hasApprovedRevision"], "approved_revision_sha256": detail["approvedRevisionHash"],
                "internal_planned": page["internalPlanned"], "internal_attached": page["internalAttached"]})
        return CompletionView.model_validate_json(json.dumps({"creation_id": creation.id,
            "accepted_revision": proof["accepted_revision"], "accepted_source_revision": proof["accepted_source_revision"],
            "candidate_sha256": proof["candidate_sha256"], "site_id": proof["site_id"], "canonical_host": proof["canonical_host"],
            "state": "current", "revision_pending": creation.status in ACTIVE or creation.active_job_id is not None,
            "observed_at": value["observedAt"], "site_context_sha256": value["expectedSiteHash"],
            "language_review_mode": language_mode.mode(), "permitted_actions": ["refresh"], "pages": pages})).model_dump(mode="json")
    except (ValueError, TypeError, KeyError, AttributeError):
        raise ControlError(503, "invalid_content_completion_source") from None


async def read_current_node(tx, session, creation, requested_revision=None, *, command="status", page_id=None,
                            asset_id=None, expected_revision=None):
    enabled()
    if requested_revision is not None and requested_revision != creation.current_revision:
        raise ControlError(409, "stale_revision")
    if not creation.current_revision:
        raise ControlError(404, "content_page_not_found")
    if command not in {"status", "read-page", "read-media"}:
        raise ControlError(503, "content_completion_unavailable")
    proof = await accepted_proof(tx, creation)
    node, _, artifacts, environment = studio.configuration()
    script = ROOT / "content-studio/scripts/customer-content-workflow.mjs"
    if not script.is_file():
        raise ControlError(503, "content_completion_unavailable")
    source_pin = settings().control_source_revision
    revision = creation.current_revision

    async def authorized():
        enabled()
        await current_actor(tx, session, creation.portfolio_id)
        user = await tx.scalar(select(User.id).where(User.id == session.user_id, User.enabled))
        current = await tx.scalar(select(Creation.current_revision).where(Creation.id == creation.id))
        return bool(user and current == revision and settings().control_source_revision == source_pin)

    directory = artifacts / "customer-content" / str(UUID(creation.id)) / f"revision-{revision}"
    payload = {"command": command, "creationId": creation.id, "acceptedRevision": revision,
        "sourceHash": proof["candidate_sha256"], "canonicalHost": proof["canonical_host"],
        "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
    if page_id is not None:
        payload["pageId"] = page_id
    if command == "read-media":
        payload.update(assetId=asset_id, expectedRevisionHash=expected_revision)
    try:
        kwargs = {"output_limit": 20 * 1048576} if command == "read-media" else {}
        value = await studio._execute([node, script], payload, environment, authorized, 20, **kwargs)
    except RunnerError as error:
        if error.code == "workflow_context_stale":
            raise ControlError(409, "stale_page") from None
        if error.code in {"writer_page_binding_mismatch", "workflow_unknown_asset"}:
            raise ControlError(404, "content_page_not_found") from None
        raise ControlError(503, "content_completion_unavailable") from error
    # Final ownership/session/source read, after subprocess output.
    if not await authorized():
        raise ControlError(503, "content_completion_unavailable")
    return proof, value


async def projection(tx, session, creation, requested_revision=None):
    enabled()
    if requested_revision is not None and requested_revision != creation.current_revision:
        raise ControlError(409, "stale_revision")
    if not creation.current_revision:
        return CompletionView.model_validate_json(json.dumps({"creation_id": creation.id, "accepted_revision": None,
            "accepted_source_revision": None, "candidate_sha256": None, "site_id": None, "canonical_host": creation.canonical_host,
            "state": "not_imported", "revision_pending": creation.status in ACTIVE or creation.active_job_id is not None,
            "observed_at": None, "site_context_sha256": None, "language_review_mode": language_mode.mode(),
            "permitted_actions": ["refresh"], "pages": []})).model_dump(mode="json")
    proof, value = await read_current_node(tx, session, creation, requested_revision)
    return parse_node(value, creation, proof)


def parse_page(value, creation, proof, page_id):
    completion = parse_node(value, creation, proof)
    try:
        page = next(page for page in completion["pages"] if page["page_id"] == page_id)
        document = Document.model_validate_json(json.dumps(value["pageDocument"]))
        if value["pageDocumentHash"] != canonical_sha256(document.model_dump(mode="json")):
            raise ValueError("read document integrity mismatch")
        result = PageView.model_validate_json(json.dumps({"completion": completion, "page": page,
            "document": document.model_dump(mode="json"), "document_sha256": canonical_sha256(document.model_dump(mode="json")),
            "permitted_actions": ["refresh", "read_media"]}))
        return result.model_dump(mode="json")
    except (ValueError, TypeError, KeyError, StopIteration):
        raise ControlError(503, "invalid_content_page_source") from None


async def current_page(tx, session, creation, requested_revision, page_id):
    proof, value = await read_current_node(tx, session, creation, requested_revision, command="read-page", page_id=page_id)
    return parse_page(value, creation, proof, page_id)


def parse_media(value, creation, proof, page_id, asset_id, expected_revision):
    completion = parse_node(value, creation, proof)
    try:
        page = next(page for page in completion["pages"] if page["page_id"] == page_id)
        item = value["mediaData"]
        asset = Media.model_validate_json(json.dumps(item["asset"]))
        if (item["pageId"] != page_id or item["revisionHash"] != expected_revision
                or page["revision_sha256"] != expected_revision or asset.id != asset_id):
            raise ValueError("media binding mismatch")
        raw = base64.b64decode(item["base64"], validate=True)
        if len(raw) != asset.bytes or hashlib.sha256(raw).hexdigest() != asset.sha256:
            raise ValueError("media integrity mismatch")
        return asset.mime, raw
    except (ValueError, TypeError, KeyError, StopIteration):
        raise ControlError(503, "invalid_content_media_source") from None


async def current_media(tx, session, creation, requested_revision, page_id, asset_id, expected_revision):
    proof, value = await read_current_node(tx, session, creation, requested_revision, command="read-media", page_id=page_id,
        asset_id=asset_id, expected_revision=expected_revision)
    return parse_media(value, creation, proof, page_id, asset_id, expected_revision)
