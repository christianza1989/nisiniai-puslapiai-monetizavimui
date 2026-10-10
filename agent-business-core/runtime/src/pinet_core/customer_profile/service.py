"""Source-bound profile observations. No writes, renewal or capability activation."""
from datetime import datetime
from typing import Annotated, Literal

from fastapi import HTTPException
from pydantic import Field, ValidationError
from sqlalchemy import select, text

from .. import knowledge, knowledge_index, onboarding, policy
from ..config import settings
from ..contracts import KnowledgeReferenceV2
from ..control.models import BusinessGrant
from ..control.routes import ControlError, identifier
from ..creation.service import binding, current_actor, digest
from ..creation_registration import service as registrations
from ..creation_registration.locks import lifetime
from ..creation_registration.models import Registration
from ..models import Business, KnowledgeState, utcnow
from . import instructions
from .models import REGISTRATION_KEYS, Admission
from .wire import AdmittedProfile, Digest, ProfileView, Strict

MATERIAL_KEYS = ("registration_id", "registration_fingerprint", *REGISTRATION_KEYS,
    "execution_source_revision", "knowledge_revision", "knowledge_hash", "deployment_id",
    "index_receipt_sha256", "profile_version", "conversation_sha256", "quality_sha256")


class IndexReceipt(Strict):
    status: Literal["complete"]
    schema_version: Literal[2]
    transfer_id: str = Field(pattern=r"^[a-zA-Z0-9._-]{1,100}$")
    content_hash: Digest
    revision: Annotated[int, Field(strict=True, ge=1, le=2147483647)]
    page_count: Annotated[int, Field(strict=True, ge=1, le=1000)]
    fragment_count: Annotated[int, Field(strict=True, ge=1, le=1000)]
    refreshed_at: datetime


def material(row):
    return {key: getattr(row, key) for key in MATERIAL_KEYS}


def reference(row):
    return KnowledgeReferenceV2(schema_version=2, knowledge_revision=row.knowledge_revision,
        knowledge_hash=row.knowledge_hash, deployment_id=row.deployment_id)


def admitted(row):
    if digest(material(row)) != row.fingerprint:
        raise ControlError(503, "invalid_profile_source")
    try:
        return AdmittedProfile(admission_id=row.id, sequence=row.sequence,
            **{key: getattr(row, key) for key in ("registration_id", "business_id", "site_id", "canonical_host",
                "accepted_revision", "candidate_sha256", "accepted_source_revision", "execution_source_revision",
                "index_receipt_sha256", "profile_version", "conversation_sha256", "quality_sha256")},
            knowledge_ref=reference(row), admitted_at=row.created_at, revoked_at=row.revoked_at)
    except (ValueError, TypeError):
        raise ControlError(503, "invalid_profile_source") from None


async def source(tx, business, expected=None):
    """Hold canonical policy/index locks and the actual row against any concurrent UPDATE.

    Source enable/disable uses the policy barrier; refresh/revocation uses the index
    barrier. The shared row lock also fences a direct concurrent mutable-payload UPDATE.
    Profile authority is never written into KnowledgeState.
    """
    cfg = settings()
    await tx.execute(text("SELECT set_config('pinet.business', :b, true)"), {"b": business.id})
    await policy.lock(tx, business.id, cfg.environment)
    state = await knowledge_index.locked(tx, business)
    if state:
        state = await tx.scalar(select(KnowledgeState).where(KnowledgeState.id == state.id)
            .with_for_update(read=True).execution_options(populate_existing=True))
    readiness = onboarding.Readiness.model_validate(await onboarding.status(tx, business.site_id), strict=True)
    if not readiness.source_ready:
        raise HTTPException(409, "public_source_not_admitted")
    if not state:
        raise HTTPException(409, "knowledge_v2_source_unavailable")
    if expected is None:
        value = state.payload.get("knowledge", {})
        expected = KnowledgeReferenceV2(schema_version=2, knowledge_revision=state.revision,
            knowledge_hash=state.payload.get("hash"), deployment_id=value.get("deployment_id"))
    await knowledge.reference_v2(tx, business, expected)
    receipt = IndexReceipt.model_validate(state.payload.get("index_receipt"))
    if receipt.refreshed_at.tzinfo is None or receipt.refreshed_at != state.refreshed_at:
        raise HTTPException(409, "knowledge_index_receipt_conflict")
    return expected, digest(state.payload["index_receipt"])


async def registry_row(tx, creation_id):
    return await tx.scalar(select(Registration).where(Registration.creation_id == creation_id,
        Registration.environment_id == settings().environment)
        .order_by(Registration.accepted_revision.desc()).limit(1).execution_options(populate_existing=True))


async def pin_registration(tx, creation_id):
    """Take the known lifetime before actor locks; never infer a later registration."""
    registry = await registry_row(tx, identifier(creation_id))
    if registry is None:
        return None
    if digest(registrations.stored_material(registry)) != registry.fingerprint:
        raise ControlError(503, "invalid_registration_source")
    identity = (registry.id, registry.fingerprint)
    await lifetime(tx, settings().environment, registry.id)
    return identity


async def observe_source(tx, business, row, registry):
    try:
        _, receipt_hash = await source(tx, business, reference(row) if row and row.registration_id == registry.id else None)
        return "current", "public_source_changed" if row and row.index_receipt_sha256 != receipt_hash else None
    except (HTTPException, ValidationError, ValueError, TypeError, KeyError, AttributeError) as error:
        reason = error.detail if isinstance(error, HTTPException) else "invalid_source"
        state = "not_admitted" if reason == "public_source_not_admitted" else "unavailable"
        blocker = ("public_source_not_admitted" if reason == "public_source_not_admitted" else
            "public_source_expired" if reason == "knowledge_snapshot_expired" else
            "public_source_changed" if reason in {"knowledge_reference_conflict", "knowledge_index_receipt_conflict"}
            else "public_source_unavailable")
        return state, blocker


async def projection(tx, session, creation, requested_revision=None, *, registration_identity):
    if requested_revision is not None and requested_revision != creation.current_revision:
        raise ControlError(409, "stale_revision")
    registry = await registry_row(tx, creation.id)
    if (None if registry is None else (registry.id, registry.fingerprint)) != registration_identity:
        # Provision/new revision may have completed while the reader waited for the actor.
        # A new lifetime here would invert the admin order; retry in a fresh transaction.
        raise ControlError(409, "registration_changed")
    observed = await registrations.projection(tx, session, creation, requested_revision)
    row = await tx.scalar(select(Admission).where(Admission.creation_id == creation.id,
        Admission.environment_id == settings().environment).order_by(Admission.sequence.desc()).limit(1))
    historic = admitted(row) if row else None
    if row and binding(row) != binding(creation):
        raise ControlError(503, "invalid_profile_source")
    blockers = []
    if not creation.current_revision:
        blockers.append("accepted_revision_missing")
    if observed["state"] != "current":
        blockers.append({"missing": "registration_missing", "stale": "registration_stale",
            "revoked": "registration_revoked", "grant_revoked": "grant_revoked"}[observed["state"]])
    if observed["revision_pending"]:
        blockers.append("creation_revision_pending")
    if row is None:
        blockers.append("profile_missing")
    else:
        if row.revoked_at:
            blockers.append("profile_revoked")
        if not registry or row.registration_id != registry.id:
            blockers.append("profile_registration_stale")
        elif any(getattr(row, key) != getattr(registry, key) for key in REGISTRATION_KEYS) or row.registration_fingerprint != registry.fingerprint:
            raise ControlError(503, "invalid_profile_source")
        if row.execution_source_revision != settings().control_source_revision:
            blockers.append("execution_source_changed")
    try:
        current_templates = instructions.manifest()
        if row and any(getattr(row, key) != value for key, value in current_templates.items()):
            blockers.append("instructions_changed")
    except (OSError, ValueError):
        blockers.append("instructions_changed")
    source_state, business = "unobserved", None
    if observed["binding_current"]:
        business = await tx.scalar(select(Business).where(Business.id == registry.business_id))
        if not business or business.site_id != registry.site_id or business.canonical_host != registry.canonical_host:
            raise ControlError(503, "invalid_profile_source")
        source_state, blocker = await observe_source(tx, business, row, registry)
        if blocker:
            blockers.append(blocker)
    await current_actor(tx, session, creation.portfolio_id)
    if registry:
        # SELECT-only grant observation; no lock requiring runtime UPDATE privilege.
        final = (await tx.execute(select(Registration, BusinessGrant).join(BusinessGrant,
            BusinessGrant.id == Registration.grant_id).where(Registration.id == registry.id,
            Registration.user_id == session.user_id, Registration.environment_id == settings().environment,
            BusinessGrant.business_id == registry.business_id, BusinessGrant.environment_id == settings().environment)
            .execution_options(populate_existing=True))).first()
        if not final:
            raise ControlError(404, "not_found")
        if final[0].revoked_at and "registration_revoked" not in blockers:
            blockers.append("registration_revoked")
            observed["state"] = "revoked"
        if not final[1].enabled and "grant_revoked" not in blockers:
            blockers.append("grant_revoked")
            if not final[0].revoked_at:
                observed["state"] = "grant_revoked"
    if source_state == "current":
        # Reobserve the same exact source after any final authority wait; never renew it.
        source_state, blocker = await observe_source(tx, business, row, registry)
        if blocker and blocker not in blockers:
            blockers.append(blocker)
    state = ("missing" if row is None else "revoked" if row.revoked_at else "current" if not blockers else
        "stale" if any(b in blockers for b in ("registration_stale", "profile_registration_stale",
            "execution_source_changed", "instructions_changed", "public_source_changed")) else "blocked")
    return ProfileView(creation_id=creation.id, current_revision=creation.current_revision or None,
        observed_at=utcnow(), state=state, registration_state=observed["state"], source_state=source_state,
        admission=historic, blockers=blockers, profile_current=state == "current").model_dump(mode="json")
