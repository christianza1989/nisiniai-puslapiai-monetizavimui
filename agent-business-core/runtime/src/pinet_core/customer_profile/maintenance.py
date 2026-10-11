"""Explicit operator freshness revalidation, preserving admitted source identities."""
from copy import deepcopy
from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException
from pydantic import AwareDatetime, Field
from sqlalchemy import select

from .. import knowledge, policy
from .. import knowledge_index as index
from ..config import settings
from ..creation.service import current_actor, digest
from ..creation_registration import admin as registrations
from ..creation_registration.locks import lifetime
from ..creation_registration.wire import Digest
from ..models import Business, new_id
from . import admin, service
from .models import Admission
from .refresh_models import SourceRefresh

PROOF_KEYS = ("user_id", "organization_id", "portfolio_id", "environment_id", "admission_id",
              "admission_fingerprint", "authorizing_session_id", "request_key", "request_fingerprint",
              "previous_refreshed_at", "refreshed_at", "public_source_revision", "package_sha256",
              "generated_at", "projection_receipt")


def material(row):
    return {k: getattr(row, k).isoformat() if k.endswith("refreshed_at") else getattr(row, k)
            for k in PROOF_KEYS}


async def current_refresh(tx, business, state, receipt_sha):
    """Observe an existing immutable proof; never update or extend time from a read."""
    # This proves a historical complete transfer, not current Profile/module
    # authority. Future explicit admissions and partial revocations do not erase
    # the already observed source freshness; their own gates remain separate.
    pairs = list((await tx.execute(select(SourceRefresh, Admission).join(Admission,
        Admission.id == SourceRefresh.admission_id).where(Admission.business_id == business.id,
        Admission.environment_id == settings().environment,
        Admission.index_receipt_sha256 == receipt_sha,
        SourceRefresh.environment_id == settings().environment,
        SourceRefresh.refreshed_at == state.refreshed_at).limit(2))).all())
    if len(pairs) != 1:
        return False
    proof, row = pairs[0]
    service.admitted(row)
    if (row.knowledge_revision > state.revision
            or row.knowledge_hash != state.payload.get("hash")
            or row.deployment_id != state.payload.get("knowledge", {}).get("deployment_id")):
        return False
    if (not proof or proof.admission_fingerprint != row.fingerprint
            or digest(material(proof)) != proof.fingerprint
            or not proof.previous_refreshed_at < proof.refreshed_at):
        return False
    observed = service.IndexReceipt.model_validate(proof.projection_receipt)
    value = state.payload["knowledge"]
    metadata = {k: v for k, v in value.items() if k not in {"schema_version", "pages"}}
    metadata["generated_at"] = proof.generated_at
    return (observed.refreshed_at == state.refreshed_at and observed.revision == row.knowledge_revision
            and observed.page_count == len(value["pages"])
            and index.content_hash(metadata, value["pages"]) == observed.content_hash)


def request_model(source_request):
    class Request(source_request):
        admit_source: bool = Field(default=False, strict=True)
        execution_source_revision: str = Field(pattern=r"^[a-f0-9]{40}$")
        profile_admission_id: UUID
        profile_fingerprint: Digest
        expected_refreshed_at: AwareDatetime
        request_key: UUID
    return Request


async def actor(tx, *, environment, value):
    await admin.guard(tx, environment)
    if settings().voice_enabled or settings().smtp_enabled or value.admit_source:
        raise ValueError("maintenance_requires_existing_source_and_channels_off")
    registry = await service.registry_row(tx, str(value.creation_id))
    if not registry:
        raise ValueError("registration_required")
    await lifetime(tx, environment, registry.id)
    registry = await admin.identity(tx, environment, registry.id)
    creation, session = await registrations.actor(tx, environment=environment,
        creation_id=str(value.creation_id), session_id=str(value.authorizing_session_id))
    if any(getattr(registry, k) != getattr(value, k) for k in
           ("accepted_revision", "candidate_sha256", "accepted_source_revision")):
        raise ValueError("registration_identity_conflict")
    # A maintenance transfer writes the index: reserve exclusive policy BEFORE
    # the first projection's index lock, never upgrade shared while holding it.
    await policy.lock(tx, registry.business_id, environment, exclusive=True)
    view = await service.projection(tx, session, creation,
        registration_identity=(registry.id, registry.fingerprint))
    if set(view["blockers"]) - {"public_source_expired"} or not view["admission"]:
        raise ValueError("current_profile_identity_required")
    row = await tx.get(Admission, str(value.profile_admission_id), with_for_update={"read": True})
    if (not row or row.id != view["admission"]["admission_id"]
            or row.fingerprint != value.profile_fingerprint
            or value.execution_source_revision != settings().control_source_revision):
        raise ValueError("profile_identity_conflict")
    business = await tx.get(Business, registry.business_id)
    state = await index.locked(tx, business)
    if (state.payload.get("revoked") or "pending_index" in state.payload
            or service.reference(row).model_dump(mode="json") != {
                "schema_version": 2, "knowledge_revision": state.revision,
                "knowledge_hash": state.payload.get("hash"),
                "deployment_id": state.payload.get("knowledge", {}).get("deployment_id")}
            or digest(state.payload.get("index_receipt")) != row.index_receipt_sha256):
        raise ValueError("unchanged_unrevoked_source_required")
    receipt = service.IndexReceipt.model_validate(state.payload["index_receipt"])
    if receipt.refreshed_at != state.refreshed_at and not await current_refresh(tx, business, state, row.index_receipt_sha256):
        raise ValueError("source_freshness_evidence_required")
    return creation, session, row, business, state


def result(row, profile, *, replayed):
    return {"refresh_id": row.id, "fingerprint": row.fingerprint, "replayed": replayed,
        "profile_admission_id": profile.id, "profile_fingerprint": profile.fingerprint,
        "index_receipt_sha256": profile.index_receipt_sha256,
        "knowledge_ref": service.reference(profile).model_dump(mode="json"),
        "source_refreshed_at": row.refreshed_at.isoformat(),
        "source_expires_at": (row.refreshed_at + timedelta(seconds=settings().knowledge_ttl_seconds)).isoformat(),
        "profile_admission": "preserved", "session_activation": "not_performed",
        "channel_activation": "not_performed", "provider_calls": 0}


async def maintain(tx, *, environment, request, source_request, sync, project_runner):
    value = request_model(source_request).model_validate(request)
    creation, session, row, business, state = await actor(tx, environment=environment, value=value)
    request_fp = digest(value.model_dump(mode="json"))
    old = await tx.scalar(select(SourceRefresh).where(SourceRefresh.user_id == session.user_id,
        SourceRefresh.environment_id == environment, SourceRefresh.request_key == str(value.request_key)))
    if old:
        if old.request_fingerprint != request_fp or old.admission_id != row.id:
            raise ValueError("maintenance_request_conflict")
        if old.refreshed_at != state.refreshed_at or digest(material(old)) != old.fingerprint:
            raise ValueError("maintenance_replay_no_longer_current")
        await service.source(tx, business, service.reference(row))
        return result(old, row, replayed=True)
    if state.refreshed_at != value.expected_refreshed_at:
        raise ValueError("source_freshness_conflict")
    previous = state.refreshed_at
    retained = deepcopy(state.payload)
    reference = service.reference(row)
    await sync(tx, environment=environment,
        request=value.model_dump(mode="json", include=set(source_request.model_fields)),
        project_runner=project_runner)
    fresh = deepcopy(state.payload)
    old_knowledge, new_knowledge = retained["knowledge"], fresh["knowledge"]
    if ({k: v for k, v in old_knowledge.items() if k != "generated_at"}
            != {k: v for k, v in new_knowledge.items() if k != "generated_at"}
            or state.revision != reference.knowledge_revision or fresh["hash"] != reference.knowledge_hash
            or fresh.get("revoked") != retained.get("revoked") or state.refreshed_at <= previous):
        raise ValueError("public_projection_changed_requires_new_admission")
    # The new full transfer was verified above. Retain the original facts and
    # immutable receipt bytes; only the freshness timestamp advances.
    state.payload = retained
    await knowledge.reference_v2(tx, business, reference)
    proof = SourceRefresh(id=new_id(), user_id=row.user_id, organization_id=row.organization_id,
        portfolio_id=row.portfolio_id, environment_id=environment, admission_id=row.id,
        admission_fingerprint=row.fingerprint, authorizing_session_id=session.id,
        request_key=str(value.request_key), request_fingerprint=request_fp,
        previous_refreshed_at=previous, refreshed_at=state.refreshed_at,
        public_source_revision=value.public_source_revision, package_sha256=value.package_sha256,
        generated_at=new_knowledge["generated_at"], projection_receipt=fresh["index_receipt"])
    proof.fingerprint = digest(material(proof))
    tx.add(proof)
    await tx.flush()
    await current_actor(tx, session, creation.portfolio_id)
    await service.source(tx, business, reference)
    return result(proof, row, replayed=False)


async def verify(tx, *, environment, request, result, source_request):
    value = request_model(source_request).model_validate(request)
    creation, session, row, business, state = await actor(tx, environment=environment, value=value)
    proof = await tx.get(SourceRefresh, result["refresh_id"])
    if (not proof or digest(material(proof)) != result["fingerprint"]
            or proof.request_fingerprint != digest(value.model_dump(mode="json"))
            or proof.refreshed_at != state.refreshed_at or proof.admission_id != row.id):
        raise ValueError("source_refresh_changed_before_commit")
    await service.source(tx, business, service.reference(row))
    await current_actor(tx, session, creation.portfolio_id)
    # Source/authority rows stay locked, but both clocks can advance during the
    # final authority read. Recheck source time after the last awaited query too.
    if state.refreshed_at + timedelta(seconds=settings().knowledge_ttl_seconds) < knowledge.utcnow():
        raise HTTPException(409, "knowledge_snapshot_expired")
