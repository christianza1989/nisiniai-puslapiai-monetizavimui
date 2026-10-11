"""Local/test privileged profile admission. Never a customer or worker write route."""
from sqlalchemy import func, select, text

from ..config import settings
from ..control.models import BusinessGrant
from ..control.routes import ControlError
from ..creation.service import binding, current_actor, digest
from ..creation_registration import admin as registration_admin
from ..creation_registration import service as registrations
from ..creation_registration.locks import lifetime
from ..creation_registration.models import Registration
from ..models import Business, new_id, utcnow
from . import instructions, service
from .models import REGISTRATION_KEYS, Admission
from .wire import Admit, Revoke


async def guard(tx, environment):
    cfg = settings()
    role = (await tx.execute(text("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
    if (environment != cfg.environment or cfg.control_mode != "local"
            or not (environment == "local" or environment.startswith("test-"))
            or not (role.rolsuper or role.rolbypassrls)):
        raise ValueError("privileged_local_profile_admission_only")
    # No publication operation: this package uses the narrower registration/policy/index barriers.
    await tx.execute(text("SELECT set_config('pinet.environment',:e,true)"), {"e": environment})


async def identity(tx, environment, registration_id):
    row = await tx.scalar(select(Registration).where(Registration.id == registration_id,
        Registration.environment_id == environment).execution_options(populate_existing=True))
    if not row:
        raise ValueError("registration_identity_mismatch")
    if digest(registrations.stored_material(row)) != row.fingerprint:
        raise ControlError(503, "invalid_registration_source")
    return row


async def admit(tx, *, environment, **request):
    value = Admit.model_validate(request)
    await guard(tx, environment)
    await lifetime(tx, environment, str(value.registration_id))
    registry = await identity(tx, environment, str(value.registration_id))
    creation, session = await registration_admin.actor(tx, environment=environment,
        creation_id=registry.creation_id, session_id=str(value.authorizing_session_id))
    registry = await identity(tx, environment, registry.id)
    if registry.revoked_at:
        raise ValueError("registration_revoked")
    if binding(registry) != binding(creation) or registry.accepted_revision != creation.current_revision:
        raise ValueError("registration_stale")
    if any(getattr(registry, key) != getattr(value, key) for key in ("accepted_revision", "candidate_sha256", "accepted_source_revision")):
        raise ValueError("registration_identity_mismatch")
    proof = await registrations.accepted_proof(tx, creation)
    if any(getattr(registry, key) != proof[key] for key in registrations.PROOF_KEYS):
        raise ControlError(503, "invalid_registration_source")
    grant = await tx.scalar(select(BusinessGrant).where(BusinessGrant.id == registry.grant_id,
        BusinessGrant.business_id == registry.business_id, BusinessGrant.organization_id == creation.organization_id,
        BusinessGrant.portfolio_id == creation.portfolio_id, BusinessGrant.environment_id == environment)
        .with_for_update(read=True).execution_options(populate_existing=True))
    if not grant or not grant.enabled:
        raise ValueError("registration_grant_revoked")
    business = await tx.get(Business, registry.business_id)
    if not business or business.site_id != registry.site_id or business.canonical_host != registry.canonical_host:
        raise ControlError(503, "invalid_registration_source")
    cfg = settings()
    if value.execution_source_revision != cfg.control_source_revision:
        raise ValueError("execution_source_mismatch")
    reference, receipt_hash = await service.source(tx, business, value.knowledge_ref)
    metadata = {"registration_id": registry.id, "registration_fingerprint": registry.fingerprint,
        **{key: getattr(registry, key) for key in REGISTRATION_KEYS},
        "execution_source_revision": value.execution_source_revision,
        "knowledge_revision": reference.knowledge_revision, "knowledge_hash": reference.knowledge_hash,
        "deployment_id": reference.deployment_id, "index_receipt_sha256": receipt_hash, **instructions.manifest()}
    fingerprint = digest(metadata)
    old = await tx.scalar(select(Admission).where(Admission.creation_id == creation.id,
        Admission.environment_id == environment, Admission.fingerprint == fingerprint).with_for_update())
    replayed = old is not None
    if old:
        service.admitted(old)
        if old.revoked_at:
            raise ValueError("profile_revoked")
        if service.material(old) != metadata:
            raise ValueError("profile_replay_conflict")
        latest = await tx.scalar(select(func.max(Admission.sequence)).where(Admission.creation_id == creation.id,
            Admission.environment_id == environment))
        if old.sequence != latest:
            raise ValueError("profile_admission_superseded")
    else:
        sequence = (await tx.scalar(select(func.max(Admission.sequence)).where(Admission.creation_id == creation.id,
            Admission.environment_id == environment)) or 0) + 1
        if sequence > 20:
            raise ValueError("profile_admission_limit")
        old = Admission(id=new_id(), **metadata, sequence=sequence, fingerprint=fingerprint,
            authorizing_session_id=session.id, revoked_at=None)
        tx.add(old)
        await tx.flush()
    await current_actor(tx, session, creation.portfolio_id)
    if settings().control_source_revision != value.execution_source_revision:
        raise ValueError("execution_source_mismatch")
    # Locks fence mutation, not elapsed wall-clock time during authority observations.
    _, final_receipt_hash = await service.source(tx, business, reference)
    if final_receipt_hash != receipt_hash:
        raise ValueError("profile_source_changed")
    return {"admission_id": old.id, "fingerprint": old.fingerprint, "replayed": replayed,
        "profile_admitted": True, "session_activation": "not_performed", "channel_activation": "not_performed"}


async def revoke(tx, *, environment, **request):
    value = Revoke.model_validate(request)
    await guard(tx, environment)
    statement = select(Admission).where(Admission.id == str(value.admission_id), Admission.environment_id == environment)
    row = await tx.scalar(statement)
    if not row or row.fingerprint != value.fingerprint:
        raise ValueError("profile_identity_mismatch")
    service.admitted(row)
    await lifetime(tx, environment, row.registration_id, exclusive=True)
    row = await tx.scalar(statement.with_for_update().execution_options(populate_existing=True))
    if not row or row.fingerprint != value.fingerprint:
        raise ValueError("profile_identity_mismatch")
    service.admitted(row)
    if not row.revoked_at:
        row.revoked_at = utcnow()
        await tx.flush()
    return {"admission_id": row.id, "revoked_at": row.revoked_at.isoformat(),
        "session_activation": "not_performed", "channel_activation": "not_performed"}
