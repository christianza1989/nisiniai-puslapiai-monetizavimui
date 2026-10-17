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
    from ..site_build.authority_observation import active
    observed = active(tx, creation)
    return await observed.proof(creation, _accepted_proof) if observed else await _accepted_proof(tx, creation)


async def _accepted_proof(tx, creation):
    from ..creation.accepted_material import accepted_material
    from ..site_build.authority_observation import active
    observed = active(tx, creation)
    _, job, proof = await observed.material(creation) if observed else await accepted_material(tx, creation)
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
        current = {**proof, "site_id": identity, "canonical_host": native_host,
            "intake_sha256": digest(intake), "intake_request_sha256": intake["requestHash"],
            "intake_importer_sha256": intake["importerHash"], "intake_site_file_sha256": intake["siteFileHash"]}
        registered = await registered_intake(tx, creation, current, intake)
        return {**current, "intake_sha256": digest(registered)}
    except (ValueError, TypeError, KeyError, AttributeError, IndexError):
        raise ControlError(503, "invalid_registration_source") from None


def same_origin_intake(creation, current_request, current_receipt, origin_request, origin_receipt,
        historical_request, historical_receipt):
    """Identity only: validate immutable history against an independently current anchor.

    Never hash a dictionary with continuity removed. A Registration may have been
    created from the original receipt OR any earlier validated renewal receipt.
    Current authority belongs to selected_intake/retained_anchor, not this helper.
    """
    from ..creation import private_native_continuity as continuity
    from ..creation import private_preview as private
    if any(binding(row) != binding(creation) for row in (current_request, origin_request, historical_request)):
        raise ValueError("private_registration_owner_changed")
    current, origin, historical = (private.stored(row) for row in (current_request, origin_request, historical_request))
    current_intake = private.result(current_request, current_receipt)
    origin_intake = private.result(origin_request, origin_receipt)
    historical_intake = private.result(historical_request, historical_receipt)
    if (any(value is None for value in (current_intake, origin_intake, historical_intake))
            or "continuity" in origin or "nativeContinuity" in origin_intake):
        raise ValueError("original_private_receipt_required")
    marker = continuity.checked_marker(current["continuity"])
    identity = {"recovery_id": origin_request.id, "receipt_id": origin_receipt.id,
        "context_sha256": origin_request.context_sha256, "intake_sha256": origin_receipt.intake_sha256,
        "manifest_sha256": continuity.manifest_hash(origin_intake)}
    if any(marker[key] != value for key, value in identity.items()):
        raise ValueError("private_registration_origin_changed")
    # These are exactly the renewable authority fields excluded by the maintained
    # retained_anchor context comparison. All other fields, including unknown
    # additions, must remain identical; no intake dictionary is normalized.
    renewed = {**historical, **{key: current[key]
        for key in ("session_id", "source_revision", "native_sources", "continuity")}}
    if renewed != current:
        raise ValueError("private_registration_context_changed")
    old_marker = historical.get("continuity")
    if old_marker is None:
        if (historical_request.id != origin_request.id or historical_receipt.id != origin_receipt.id
                or "nativeContinuity" in historical_intake):
            raise ValueError("private_registration_origin_changed")
    else:
        continuity.checked_marker(old_marker)
        if any(old_marker[key] != value for key, value in identity.items()):
            raise ValueError("private_registration_origin_changed")
        if old_marker["version"] == continuity.UPGRADE_MARKER_VERSION:
            if (old_marker["origin_source_revision"] != origin["source_revision"]
                    or old_marker["origin_native_sources"] != origin["native_sources"]):
                raise ValueError("private_registration_origin_changed")
        elif historical["native_sources"] != origin["native_sources"]:
            raise ValueError("private_registration_origin_changed")
    for key in ("version", "state", "creationId", "acceptedRevision", "sourceHash", "siteId", "canonicalHost",
            "requestHash", "importerHash", "siteFileHash"):
        if historical_intake[key] != current_intake[key]:
            raise ValueError("private_registration_intake_changed")
    return historical_intake


async def registered_intake(tx, creation, proof, intake):
    """Keep an existing exact revision's identity only AFTER fresh native validation."""
    if creation.canonical_host is not None or "nativeContinuity" not in intake:
        return intake
    row = await tx.scalar(select(Registration).where(Registration.creation_id == creation.id,
        Registration.environment_id == settings().environment, Registration.accepted_revision == proof["accepted_revision"])
        .execution_options(populate_existing=True))
    if row is None:
        return intake
    if (binding(row) != binding(creation) or digest(stored_material(row)) != row.fingerprint
            or any(getattr(row, key) != proof[key] for key in PROOF_KEYS if key != "intake_sha256")):
        raise ValueError("private_registration_identity_changed")
    if row.intake_sha256 == proof["intake_sha256"]:
        return intake
    from ..creation import private_preview as private
    from ..creation.models import PrivateIntakeReceipt, PrivateIntakeRequest
    current = await private.latest(tx, creation)
    if current is None or not await private.current(tx, creation, current):
        raise ControlError(409, "private_intake_missing")
    receipt = await private.terminal(tx, current)
    if digest(private.result(current, receipt)) != digest(intake):
        raise ValueError("selected_private_intake_changed")
    context = private.stored(current)
    marker, _ = await private.retained_anchor(tx, creation, context, context["continuity"])
    origin = await tx.get(PrivateIntakeRequest, marker["recovery_id"], populate_existing=True)
    origin_receipt = await private.terminal(tx, origin) if origin else None
    matches = (await tx.execute(select(PrivateIntakeRequest, PrivateIntakeReceipt).join(PrivateIntakeReceipt,
        PrivateIntakeReceipt.recovery_id == PrivateIntakeRequest.id).where(
            PrivateIntakeRequest.creation_id == creation.id, PrivateIntakeRequest.revision_id == proof["revision_id"],
            PrivateIntakeRequest.environment_id == settings().environment,
            PrivateIntakeReceipt.intake_sha256 == row.intake_sha256).limit(2)
        .execution_options(populate_existing=True))).all()
    if origin is None or origin_receipt is None or len(matches) != 1:
        raise ValueError("registered_private_receipt_missing")
    registered = same_origin_intake(creation, current, receipt, origin, origin_receipt, *matches[0])
    # Historical lookup may wait. Repeat current native authority and selection;
    # the historical authorizing Session is never revived by this identity lookup.
    final = await private.latest(tx, creation)
    if final is None or final.id != current.id or not await private.current(tx, creation, final):
        raise ControlError(409, "private_intake_missing")
    return registered


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
