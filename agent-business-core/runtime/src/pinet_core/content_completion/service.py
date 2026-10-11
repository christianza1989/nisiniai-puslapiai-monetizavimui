"""Read-only exact accepted-intake binding, live studio state and final current ownership."""
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
from ..creation.service import ACTIVE, current_actor
from ..creation_registration.service import accepted_proof
from ..tasks.codex_transport import RunnerError
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
    payload = {"command": "status", "creationId": creation.id, "acceptedRevision": revision,
        "sourceHash": proof["candidate_sha256"], "canonicalHost": proof["canonical_host"],
        "artifactsRoot": str(artifacts), "dataDir": str(directory / "data"), "outputDir": str(directory / "output")}
    try:
        value = await studio._execute([node, script], payload, environment, authorized, 20)
    except RunnerError as error:
        raise ControlError(503, "content_completion_unavailable") from error
    # Final ownership/session/source read, after subprocess output.
    if not await authorized():
        raise ControlError(503, "content_completion_unavailable")
    return parse_node(value, creation, proof)
