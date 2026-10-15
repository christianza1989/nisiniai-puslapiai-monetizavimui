"""One exact accepted-material validator shared by intake recovery and registration."""
import re

from sqlalchemy import select

from ..control.routes import ControlError
from . import language_mode, team
from .models import Job, Revision, TeamEvent
from .service import binding, digest

SOURCE = re.compile(r"^[a-f0-9]{40}$")


async def accepted_material(tx, creation):
    """Validate exact immutable accepted material and coordinator proof before native intake."""
    revision = await tx.scalar(select(Revision).where(Revision.creation_id == creation.id,
        Revision.sequence == creation.current_revision)) if creation.current_revision else None
    job = await tx.get(Job, revision.job_id) if revision else None
    if not revision or not job:
        raise ControlError(409, "accepted_revision_missing")
    if (binding(revision) != binding(creation) or binding(job) != binding(creation)
            or job.creation_id != creation.id or job.status != "succeeded"
            or revision.source_revision != job.source_revision or not SOURCE.fullmatch(revision.source_revision)
            or digest(revision.payload) != revision.material_hash):
        raise ControlError(503, "invalid_registration_source")
    try:
        reviewed = await team.projection(tx, creation)
        if reviewed["accepted_candidate_sha256"] != revision.material_hash:
            raise ControlError(409, "accepted_team_review_missing")
        # Selection references the same observed exact-hash acceptance used by the canonical team reader.
        events = [event for event in reviewed["events"] if event["job_id"] == job.id
            and event["role"] == "coordinator" and event["state"] == "succeeded"
            and event["data"]["decision"] == "accept_draft"
            and event["data"]["candidate_sha256"] == revision.material_hash
            and all(c["status"] != "FAIL" for c in event["data"]["checks"])
            and any(language_mode.receipt_satisfies(c,
                    mode=event["data"].get("language_review_mode", "required"), digest=revision.material_hash)
                    for c in event["data"]["checks"])]
        event = events[-1]
        original_event = await tx.get(TeamEvent, event["event_id"])
        if not original_event or original_event.job_id != job.id:
            raise ValueError("Missing immutable coordinator")
        # Previous proofs hashed the normalized sidecar data. Preserve every old
        # default, omitting only the new mode when it was absent from stored history.
        coordinator_data = dict(event["data"])
        if "language_review_mode" not in original_event.payload:
            coordinator_data.pop("language_review_mode", None)
        return revision, job, {"revision_id": revision.id, "accepted_revision": revision.sequence,
            "candidate_sha256": revision.material_hash, "accepted_source_revision": revision.source_revision,
            "coordinator_event_id": event["event_id"], "coordinator_sha256": digest(coordinator_data)}
    except (ValueError, TypeError, KeyError, AttributeError, IndexError):
        raise ControlError(503, "invalid_registration_source") from None
