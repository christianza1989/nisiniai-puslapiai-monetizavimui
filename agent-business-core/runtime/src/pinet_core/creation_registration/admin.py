"""Explicit local administrative registration; never mounted as a customer write API."""
from sqlalchemy import select

from ..config import settings
from ..control.bootstrap import registered_business, registered_grant, registration_lock
from ..control.models import BusinessGrant, Membership, Session
from ..control.routes import ControlError
from ..creation.models import Creation
from ..creation.service import ACTIVE, binding, current_actor, digest
from ..customer.models import Account
from ..models import Business, new_id, utcnow
from ..public_projects.admin import administrative
from .locks import lifetime
from .models import Registration
from .service import accepted_proof, material, stored_material
from .wire import Provision, Revoke


async def guard(tx, environment):
    if environment != settings().environment or settings().control_mode != "local":
        raise ValueError("local_registration_only")
    await administrative(tx, environment)


async def actor(tx, *, environment, creation_id, session_id):
    creation = await tx.scalar(select(Creation).where(Creation.id == creation_id, Creation.environment_id == environment))
    session = await tx.scalar(select(Session).where(Session.id == session_id, Session.environment_id == environment))
    if not creation or not session or session.user_id != creation.user_id:
        raise ValueError("current_creation_owner_required")
    await current_actor(tx, session, creation.portfolio_id, lock=True)
    member = await tx.scalar(select(Membership).where(Membership.user_id == creation.user_id,
        Membership.organization_id == creation.organization_id, Membership.environment_id == environment,
        Membership.role == "owner", Membership.enabled).with_for_update(read=True))
    account = await tx.scalar(select(Account).where(Account.user_id == creation.user_id,
        Account.environment_id == environment, Account.verified_at.is_not(None)).with_for_update(read=True))
    if not member or not account:
        raise ValueError("current_creation_owner_required")
    # Match the customer writers' actor-before-Creation lock order.
    creation = await tx.scalar(select(Creation).where(Creation.id == creation_id,
        Creation.environment_id == environment).with_for_update().execution_options(populate_existing=True))
    if creation.status in ACTIVE or creation.active_job_id is not None:
        raise ValueError("creation_revision_pending")
    return creation, session


async def provision(tx, *, environment, **request):
    value = Provision.model_validate(request).model_dump(mode="json")
    await guard(tx, environment)
    creation, session = await actor(tx, environment=environment, creation_id=value["creation_id"],
        session_id=value["authorizing_session_id"])
    if creation.current_revision != value["accepted_revision"]:
        raise ValueError("stale_revision")
    proof = await accepted_proof(tx, creation)
    if any(proof[key] != value[key] for key in ("accepted_revision", "candidate_sha256", "accepted_source_revision")):
        raise ValueError("accepted_identity_mismatch")
    await registration_lock(tx)
    old = await tx.scalar(select(Registration).where(Registration.creation_id == creation.id,
        Registration.accepted_revision == creation.current_revision, Registration.environment_id == environment)
        .with_for_update())
    prior = await tx.scalar(select(Registration).where(Registration.creation_id == creation.id,
        Registration.environment_id == environment).order_by(Registration.accepted_revision.desc()).limit(1))
    business = await tx.scalar(select(Business).where(Business.site_id == proof["site_id"]))
    collision = await tx.scalar(select(Business).where(Business.canonical_host == proof["canonical_host"]))
    if collision and (not business or collision.id != business.id):
        raise ValueError("registration_host_conflict")
    if business:
        if not prior or prior.business_id != business.id or binding(prior) != binding(creation):
            raise ValueError("unbound_registry_conflict")
        if prior.fingerprint != digest(stored_material(prior)) or prior.site_id != proof["site_id"]:
            raise ValueError("registration_replay_conflict")
        if business.canonical_host != proof["canonical_host"]:
            raise ValueError("registration_host_conflict")
    elif prior:
        raise ValueError("registration_registry_missing")
    grant = await tx.scalar(select(BusinessGrant).where(BusinessGrant.business_id == business.id,
        BusinessGrant.environment_id == environment).with_for_update()) if business else None
    if prior and (not grant or grant.id != prior.grant_id or not grant.enabled
            or grant.organization_id != creation.organization_id or grant.portfolio_id != creation.portfolio_id):
        raise ValueError("registration_grant_conflict")
    if old:
        expected = material(creation, proof, business.id, grant.id)
        if old.revoked_at:
            raise ValueError("registration_revoked")
        if (stored_material(old) != expected or old.fingerprint != digest(expected)):
            raise ValueError("registration_replay_conflict")
    else:
        business = await registered_business(tx, site_id=proof["site_id"], canonical_host=proof["canonical_host"],
            allow_new=prior is None, business_id=prior.business_id if prior else None)
        grant = await registered_grant(tx, environment=environment, organization_id=creation.organization_id,
            portfolio_id=creation.portfolio_id, business_id=business.id, display_name=creation.display_name,
            # Grant registration evidence stays historical; each new binding stores its own accepted-source identity.
            evidence_revision=grant.evidence_revision if grant else proof["accepted_source_revision"])
        expected = material(creation, proof, business.id, grant.id)
        old = Registration(id=new_id(), **expected, authorizing_session_id=session.id,
            fingerprint=digest(expected), revoked_at=None)
        tx.add(old)
        await tx.flush()
    # Replays authorize the current session, without changing the first authorizing-session record.
    await current_actor(tx, session, creation.portfolio_id)
    return {"registration_id": old.id, "business_id": old.business_id, "site_id": old.site_id,
        "accepted_revision": old.accepted_revision, "replayed": prior is not None and prior.id == old.id,
        "public_source_admitted": False, "channel_activation": "not_performed"}


async def revoke(tx, *, environment, **request):
    value = Revoke.model_validate(request).model_dump(mode="json")
    await guard(tx, environment)
    statement = select(Registration).where(Registration.id == value["registration_id"],
        Registration.environment_id == environment)
    row = await tx.scalar(statement)
    if not row or row.candidate_sha256 != value["candidate_sha256"]:
        raise ValueError("registration_identity_mismatch")
    if digest(stored_material(row)) != row.fingerprint:
        raise ControlError(503, "invalid_registration_source")
    original = row.fingerprint
    # Lifetime barriers precede row locks in all dependent admissions and terminal revokes.
    await lifetime(tx, environment, row.id, exclusive=True)
    row = await tx.scalar(statement.with_for_update().execution_options(populate_existing=True))
    if not row or row.candidate_sha256 != value["candidate_sha256"] or row.fingerprint != original:
        raise ValueError("registration_identity_mismatch")
    if digest(stored_material(row)) != row.fingerprint:
        raise ControlError(503, "invalid_registration_source")
    if not row.revoked_at:
        row.revoked_at = utcnow()
        await tx.flush()
    return {"registration_id": row.id, "business_id": row.business_id, "revoked_at": row.revoked_at.isoformat(),
        "registry_preserved": True, "channel_activation": "not_performed"}
