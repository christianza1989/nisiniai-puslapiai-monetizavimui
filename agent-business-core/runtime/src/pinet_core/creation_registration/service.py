"""Canonical accepted source proof and customer-safe registration observation; no writes."""
import re
from uuid import UUID

from sqlalchemy import select

from ..config import settings
from ..control.models import BusinessGrant
from ..control.routes import ControlError
from ..creation import studio, team
from ..creation.models import Job, Revision
from ..creation.service import ACTIVE, binding, current_actor, digest
from ..customer.service import host
from ..models import Business, utcnow
from .models import Registration
from .wire import RegisteredRevision, RegistrationView

HEX = re.compile(r"^[a-f0-9]{64}$")
SOURCE = re.compile(r"^[a-f0-9]{40}$")
PROOF_KEYS = ("revision_id", "accepted_revision", "candidate_sha256", "accepted_source_revision",
    "site_id", "canonical_host", "coordinator_event_id", "coordinator_sha256", "intake_sha256",
    "intake_request_sha256", "intake_importer_sha256", "intake_site_file_sha256")


def site_id(creation_id):
    return "creation-" + UUID(creation_id).hex


async def accepted_proof(tx, creation):
    """Reuse the actual team and intake validators, adding only registration identity requirements."""
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
            and any(c["kind"] == "language_quality" and c["status"] == "PASS" and c["observed"]
                    and c["draft_sha256"] == revision.material_hash for c in event["data"]["checks"])]
        event = events[-1]
        observed = await studio.projection(tx, creation)
        if observed["state"] != "private_draft_imported":
            raise ControlError(409, "private_intake_missing")
        intake = job.usage["content_intake"]
        identity = site_id(creation.id)
        # The shared ContentView already validates creation/revision/hash/host and the full snapshot.
        # Registration additionally needs the importer-owned native site and immutable manifest hashes.
        if intake.get("siteId") != identity or not creation.canonical_host or host(creation.canonical_host) != creation.canonical_host:
            raise ValueError("Invalid native site identity")
        for key in ("requestHash", "importerHash", "siteFileHash"):
            if not isinstance(intake.get(key), str) or not HEX.fullmatch(intake[key]):
                raise ValueError("Invalid native manifest hash")
        return {"revision_id": revision.id, "accepted_revision": revision.sequence,
            "candidate_sha256": revision.material_hash, "accepted_source_revision": revision.source_revision,
            "site_id": identity, "canonical_host": creation.canonical_host,
            "coordinator_event_id": event["event_id"], "coordinator_sha256": digest(event["data"]),
            "intake_sha256": digest(intake), "intake_request_sha256": intake["requestHash"],
            "intake_importer_sha256": intake["importerHash"], "intake_site_file_sha256": intake["siteFileHash"]}
    except (ValueError, TypeError, KeyError, AttributeError, IndexError):
        raise ControlError(503, "invalid_registration_source") from None


def material(creation, proof, business_id, grant_id):
    return {"creation_id": creation.id, **binding(creation), **proof, "business_id": business_id, "grant_id": grant_id}


def stored_material(row):
    return {key: getattr(row, key) for key in ("creation_id", "user_id", "organization_id", "portfolio_id",
        "environment_id", *PROOF_KEYS, "business_id", "grant_id")}


async def projection(tx, session, creation, requested_revision=None):
    if requested_revision is not None and requested_revision != creation.current_revision:
        raise ControlError(409, "stale_revision")
    row = await tx.scalar(select(Registration).where(Registration.creation_id == creation.id,
        Registration.environment_id == settings().environment).order_by(Registration.accepted_revision.desc()).limit(1))
    registered, state = None, "missing"
    if row:
        if binding(row) != binding(creation) or digest(stored_material(row)) != row.fingerprint:
            raise ControlError(503, "invalid_registration_source")
        pair = (await tx.execute(select(BusinessGrant, Business).join(Business, Business.id == BusinessGrant.business_id)
            .where(BusinessGrant.id == row.grant_id, BusinessGrant.business_id == row.business_id,
                BusinessGrant.organization_id == row.organization_id, BusinessGrant.portfolio_id == row.portfolio_id,
                BusinessGrant.environment_id == row.environment_id))).first()
        if not pair or pair[1].site_id != row.site_id or pair[1].canonical_host != row.canonical_host:
            raise ControlError(503, "invalid_registration_source")
        grant, _ = pair
        if row.accepted_revision == creation.current_revision:
            proof = await accepted_proof(tx, creation)
            if any(getattr(row, key) != proof[key] for key in PROOF_KEYS):
                raise ControlError(503, "invalid_registration_source")
        state = ("revoked" if row.revoked_at else "grant_revoked" if not grant.enabled else
                 "stale" if row.accepted_revision != creation.current_revision else "current")
        registered = RegisteredRevision(registration_id=row.id, business_id=row.business_id, site_id=row.site_id,
            canonical_host=row.canonical_host, accepted_revision=row.accepted_revision,
            candidate_sha256=row.candidate_sha256, accepted_source_revision=row.accepted_source_revision,
            registered_at=row.created_at, revoked_at=row.revoked_at)
    await current_actor(tx, session, creation.portfolio_id)
    if row:
        # A single final RLS-visible snapshot observes both terminal binding and current grant.
        # SELECT-only tables cannot require UPDATE privileges just to observe revocation.
        final = (await tx.execute(select(Registration, BusinessGrant).join(BusinessGrant,
            BusinessGrant.id == Registration.grant_id).where(Registration.id == row.id,
            Registration.user_id == session.user_id, Registration.environment_id == settings().environment,
            BusinessGrant.business_id == row.business_id, BusinessGrant.portfolio_id == creation.portfolio_id,
            BusinessGrant.organization_id == creation.organization_id,
            BusinessGrant.environment_id == settings().environment).execution_options(populate_existing=True))).first()
        if not final:
            raise ControlError(404, "not_found")
        row, grant = final
        state = ("revoked" if row.revoked_at else "grant_revoked" if not grant.enabled else
                 "stale" if row.accepted_revision != creation.current_revision else "current")
        registered.revoked_at = row.revoked_at
    pending = creation.status in ACTIVE or creation.active_job_id is not None
    return RegistrationView(creation_id=creation.id, current_revision=creation.current_revision or None,
        observed_at=utcnow(), state=state, registration=registered, revision_pending=pending,
        binding_current=state == "current" and not pending).model_dump(mode="json")
