"""Bounded read-only website observations through the maintained owner projections."""
import json
from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select

from ..business_discovery.models import CreationArchive
from ..content_completion import service as completion
from ..content_completion.wire import CompletionView
from ..control.routes import ControlError
from ..creation_registration.models import Registration
from ..workspace_read.service import resolve

MAX_PAGES, MAX_NOTES, MAX_BLOCKERS = 12, 2, 5


def unavailable(reason, count=None):
    return {"state": "unavailable", "reason": reason, "linked_creation_count": count,
        "pages": None, "page_count": None, "observation_scope": "current_private_workflow",
        "execution_authority": "none", "page_bodies_read": False}


def bounded(value, identity):
    # This is a projection of canonical observations, not another readiness scorer.
    try:
        view = CompletionView.model_validate_json(json.dumps(value))
    except (ValidationError, ValueError, TypeError):
        raise ControlError(503, "invalid_content_completion_source") from None
    if (view.creation_id != UUID(identity["creation_id"]) or view.state != "current"
            or any(getattr(view, key) != identity[key] for key in (
                "accepted_revision", "candidate_sha256", "accepted_source_revision", "site_id", "canonical_host"))):
        raise ControlError(503, "invalid_content_completion_source")
    pages = sorted(view.pages, key=lambda page: page.path)
    selected = pages[:MAX_PAGES]
    result = {"state": "available", "linked_creation_count": 1,
        "observation_scope": view.observation_scope, "creation_id": str(view.creation_id),
        "accepted_revision": view.accepted_revision, "accepted_source_revision": view.accepted_source_revision,
        "candidate_sha256": view.candidate_sha256, "site_id": view.site_id, "canonical_host": view.canonical_host,
        "observed_at": view.observed_at.isoformat(), "site_context_sha256": view.site_context_sha256,
        "revision_pending": view.revision_pending, "page_count": len(pages),
        "omitted_page_count": len(pages)-len(selected), "page_bodies_read": False,
        "language_status": view.language_status, "full_f1_status": view.full_f1_status,
        "launch_status": view.launch_status, "execution_authority": "none", "pages": []}
    for page in selected:
        notes = page.fact_notes[:MAX_NOTES]
        blockers = page.blockers[:MAX_BLOCKERS]
        result["pages"].append({"page_id": page.page_id, "path": page.path, "type": page.type,
            "title": page.title[:160], "title_truncated": len(page.title) > 160,
            "revision_sha256": page.revision_sha256, "planning_sha256": page.planning_sha256,
            "state": page.state, "blocker_count": len(page.blockers),
            "blockers": [note[:200] for note in blockers], "omitted_blocker_count": len(page.blockers)-len(blockers),
            "blocker_text_truncated": any(len(note) > 200 for note in blockers),
            "fact_note_count": len(page.fact_notes), "fact_notes": [note[:220] for note in notes],
            "omitted_fact_note_count": len(page.fact_notes)-len(notes),
            "fact_note_text_truncated": any(len(note) > 220 for note in notes),
            "source_count": len(page.sources), "verified_source_count": sum(source.verified for source in page.sources),
            "media_count": page.media_count, "media_files_present": page.media_files_present,
            "review_current": page.review_current, "has_approved_revision": page.has_approved_revision,
            "approved_revision_sha256": page.approved_revision_sha256,
            "internal_planned": page.internal_planned, "internal_attached": page.internal_attached})
    # Lithuanian/non-ASCII strings are bounded by bytes as well as codepoints.
    if len(json.dumps(result, ensure_ascii=False).encode()) > 32768:
        result["pages"] = []
        result["omitted_page_count"] = len(pages)
    return result


async def registration_identity(tx, graph, row, creation_id):
    registration = await tx.scalar(select(Registration).where(
        Registration.creation_id == creation_id, Registration.business_id == row.business_id,
        Registration.grant_id == row.grant_id,
        *(getattr(Registration, key) == value for key, value in graph.binding.items()))
        .order_by(Registration.accepted_revision.desc()).limit(1).execution_options(populate_existing=True))
    archived = await tx.scalar(select(CreationArchive.id).where(CreationArchive.creation_id == creation_id,
        *(getattr(CreationArchive, key) == value for key, value in graph.binding.items())))
    if not registration or registration.revoked_at is not None:
        return None
    # Freeze scalars: a later populate_existing must not silently update our pin.
    return {key: getattr(registration, key) for key in ("id", "fingerprint", "creation_id", "accepted_revision",
        "candidate_sha256", "accepted_source_revision", "site_id", "canonical_host")} | {"archived": archived is not None}


async def context(tx, session, row):
    graph = await resolve(tx, session, row.portfolio_id, "business", row.business_id)
    if len(graph.creations) != 1:
        return unavailable("no_linked_creation" if not graph.creations else "ambiguous_linked_creations",
            len(graph.creations))
    creation = graph.creations[0]
    creation_id, revision = creation.id, creation.current_revision
    if graph.associations.get(("creation", creation_id)) != "latest_saved":
        return unavailable("registration_not_current", 1)
    identity = await registration_identity(tx, graph, row, creation_id)
    if identity is None or identity["accepted_revision"] != revision:
        return unavailable("registration_not_current", 1)
    if identity["archived"]:
        return unavailable("creation_archived", 1)
    try:
        result = bounded(await completion.projection(tx, session, creation, revision), identity)
    except ControlError as error:
        if error.status not in {409, 503}:
            raise
        result = unavailable("workflow_unavailable", 1)
    current = await resolve(tx, session, row.portfolio_id, "business", row.business_id)
    current_identity = await registration_identity(tx, current, row, creation_id)
    if current.snapshot != graph.snapshot or current_identity != identity:
        raise ControlError(409, "team_website_context_changed")
    return result
