"""Canonical accepted source proof and customer-safe registration observation; no writes."""
import re
from uuid import UUID

from sqlalchemy import select

from ..config import settings
from ..control.models import BusinessGrant
from ..control.routes import ControlError
from ..creation import studio
from ..creation.service import ACTIVE, binding, current_actor, digest
from ..customer.service import host
from ..models import Business, utcnow
from .models import Registration
from .wire import RegisteredRevision, RegistrationView

HEX = re.compile(r"^[a-f0-9]{64}$")
PROOF_KEYS = ("revision_id", "accepted_revision", "candidate_sha256", "accepted_source_revision",
    "site_id", "canonical_host", "coordinator_event_id", "coordinator_sha256", "intake_sha256",
    "intake_request_sha256", "intake_importer_sha256", "intake_site_file_sha256")


def site_id(creation_id):
    return "creation-" + UUID(creation_id).hex


async def accepted_proof(tx, creation):
    """Exact accepted proof plus the maintained selected native intake observation."""
    from ..creation.accepted_material import accepted_material
    _, job, proof = await accepted_material(tx, creation)
    try:
        pinned = (proof["revision_id"], proof["accepted_revision"], proof["candidate_sha256"], proof["accepted_source_revision"], job.id)
        observed, native_host, intake, revision_id = await studio.intake_observation(tx, creation)
        if observed["state"] != "private_draft_imported":
            raise ControlError(409, "private_intake_missing")
        if (revision_id, observed["current_revision"], observed["candidate_sha256"], observed["source_revision"], observed["import_job_id"]) != pinned:
            raise ValueError("Accepted material changed during intake observation")
        identity = site_id(creation.id)
        if intake.get("siteId") != identity or not native_host or host(native_host) != native_host:
            raise ValueError("Invalid native site identity")
        for key in ("requestHash", "importerHash", "siteFileHash"):
            if not isinstance(intake.get(key), str) or not HEX.fullmatch(intake[key]):
                raise ValueError("Invalid native manifest hash")
        return {**proof, "site_id": identity, "canonical_host": native_host,
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
