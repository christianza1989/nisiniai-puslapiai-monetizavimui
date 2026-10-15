"""Privileged explicit synthetic-local mandate; no browser route or canonical readiness change."""

import json
import secrets
from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select, text

from ..config import settings
from ..control.routes import ControlError, token_hash
from ..creation.service import current_actor, digest
from ..creation_registration import admin as registrations
from ..creation_registration.locks import lifetime
from ..customer_agents import service as agents
from ..customer_agents.models import Agent
from ..customer_profile import admin as profiles_admin
from ..customer_profile import service as profiles
from ..customer_profile.models import Admission as ProfileAdmission
from ..models import Business, utcnow
from . import service
from .library import load


async def open_local(tx, *, agent_id, authorizing_session_id, proof, mandate, seconds=120):
    service.guard()
    await profiles_admin.guard(tx, settings().environment)
    await service.source_guard()
    if (
        mandate != "synthetic-local-proposal-only"
        or type(seconds) is not int
        or not 30 <= seconds <= 600
        or not isinstance(proof, dict)
        or proof.get("kind") != "synthetic-plumbing"
        or set(proof) != {"kind", "config_sha256", "module_fingerprint", "evidence_sha256"}
        or not isinstance(proof["evidence_sha256"], str)
        or not __import__("re").fullmatch(r"[a-f0-9]{64}", proof["evidence_sha256"])
    ):
        raise ValueError("explicit_synthetic_local_mandate_required")
    agent = await tx.get(Agent, agent_id)
    if not agent:
        raise ControlError(404, "not_found")
    await lifetime(tx, settings().environment, agent.registration_id)
    creation, session = await registrations.actor(
        tx,
        environment=settings().environment,
        creation_id=agent.creation_id,
        session_id=authorizing_session_id,
    )
    registry = await profiles_admin.identity(tx, settings().environment, agent.registration_id)
    await agents.check_binding(tx, session, creation, registry, writing=True)
    agent = await tx.scalar(
        select(Agent).where(Agent.id == agent_id).with_for_update().execution_options(populate_existing=True)
    )
    config = agents.config_view(agent, await agents.current_config(tx, agent))
    if agent.purpose not in {"customer_research", "custom"}:
        raise ControlError(409, "xbot_purpose_not_supported")
    module = service.module_material()
    if proof["config_sha256"] != config["sha256"] or proof["module_fingerprint"] != module["fingerprint"]:
        raise ValueError("xbot_proof_binding_mismatch")
    profile = await tx.scalar(
        select(ProfileAdmission)
        .where(
            ProfileAdmission.creation_id == creation.id,
            ProfileAdmission.environment_id == settings().environment,
        )
        .order_by(ProfileAdmission.sequence.desc())
        .limit(1)
    )
    business = await tx.get(Business, registry.business_id)
    if not profile or profile.revoked_at or profile.registration_id != registry.id:
        raise ValueError("current_profile_required")
    reference, receipt_hash = await profiles.source(tx, business, profiles.reference(profile))
    from .. import knowledge

    projection = await knowledge.projection(tx)
    pages = sorted(projection["pages"], key=lambda p: p["id"]) if projection else []
    lib = load()
    from xbot.source_facts import project
    from xbot.store import fingerprint

    source_facts = project(pages, canonical_host=business.canonical_host)
    facts = source_facts["facts"]

    now, admission_id = utcnow(), str(uuid4())
    expires = now + timedelta(seconds=seconds)
    binding = lib.Binding(
        organization_id=agent.organization_id,
        business_id=agent.business_id,
        environment_id=agent.environment_id,
        site_id=agent.site_id,
        registration_id=registry.id,
        admission_id=admission_id,
        accepted_revision=registry.accepted_revision,
        candidate_sha256=registry.candidate_sha256,
        accepted_source_revision=registry.accepted_source_revision,
        execution_source_revision=settings().control_source_revision,
        instruction_sha256=module["instruction_sha256"],
        knowledge_ref=reference.model_dump(),
        index_receipt_sha256=receipt_hash,
        facts_sha256=fingerprint(facts),
        source_fact_manifest_sha256=source_facts["source_fact_manifest_sha256"],
        expires_at=expires.timestamp(),
        profile_current=True,
        module_admitted=True,
    )
    public = {
        "site_id": agent.site_id,
        "canonical": "https://" + agent.canonical_host,
        "facts": facts,
        "source_fact_manifest": source_facts["source_fact_manifest"],
        "facts_source": "Current maintained public KnowledgeReferenceV2",
        "facts_verified_at": now.timestamp(),
        "allowed_urls": [p["url"] for p in pages][:20],
        "language": "en",
        "start_hour": 0,
        "end_hour": 24,
    }
    material = {
        "module": module,
        "proof": proof,
        "mandate": mandate,
        "creation_id": creation.id,
        "registration_fingerprint": registry.fingerprint,
        "profile_fingerprint": profile.fingerprint,
        "binding": binding.model_dump(),
        "public_profile": public,
    }
    values = {
        "id": admission_id,
        "u": agent.user_id,
        "o": agent.organization_id,
        "p": agent.portfolio_id,
        "e": agent.environment_id,
        "a": agent.id,
        "r": config["revision"],
        "c": config["sha256"],
        "reg": registry.id,
        "pr": profile.id,
        "b": agent.business_id,
        "s": agent.site_id,
        "m": json.dumps(material),
        "h": digest(material),
        "n": now,
        "x": expires,
    }
    # Serialize even first insertion; a foreign existing slot cannot be reassigned.
    await tx.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
        {"k": "xbot-slot:" + agent.environment_id + ":" + agent.site_id},
    )
    slot = (
        (
            await tx.execute(
                text("SELECT * FROM control_xbot_slots WHERE environment_id=:e AND site_id=:s FOR UPDATE"),
                values,
            )
        )
        .mappings()
        .first()
    )
    if slot and (
        slot["user_id"] != agent.user_id or slot["business_id"] != agent.business_id or not slot["revoked"]
    ):
        raise ControlError(409, "xbot_site_slot_occupied")
    generation = slot["generation"] + 1 if slot else 1
    await tx.execute(
        text("""INSERT INTO control_xbot_admissions(id,user_id,organization_id,portfolio_id,environment_id,
      agent_id,config_revision,config_sha256,registration_id,profile_id,business_id,site_id,material,fingerprint,created_at,expires_at)
      VALUES(:id,:u,:o,:p,:e,:a,:r,:c,:reg,:pr,:b,:s,CAST(:m AS JSONB),:h,:n,:x)"""),
        values,
    )
    await tx.execute(
        text("""INSERT INTO control_xbot_slots(user_id,organization_id,portfolio_id,environment_id,
      site_id,business_id,admission_id,generation,revoked) VALUES(:u,:o,:p,:e,:s,:b,:id,:g,false)
      ON CONFLICT(environment_id,site_id) DO UPDATE SET admission_id=excluded.admission_id,generation=excluded.generation,revoked=false"""),
        {**values, "g": generation},
    )
    secret, worker_id = secrets.token_hex(32), str(uuid4())
    await tx.execute(
        text("""INSERT INTO control_xbot_workers(id,user_id,organization_id,portfolio_id,environment_id,
      admission_id,generation,token_hash,created_at,expires_at) VALUES(:id,:u,:o,:p,:e,:ad,:g,:h,:n,:x)"""),
        {**values, "id": worker_id, "ad": admission_id, "g": generation, "h": token_hash(secret)},
    )
    await tx.execute(text("SELECT set_config('pinet.control_user',:u,true)"), {"u": agent.user_id})
    admitted = await service.one(tx, "admissions", admission_id)
    await service.current(tx, admitted)
    # The independent worker is issued by a still-current login, even if the
    # slot/source locks waited beyond that login's original fixed deadline.
    await current_actor(tx, session, creation.portfolio_id, lock=True)
    valid = await tx.scalar(
        text(
            "SELECT "
            + service.DEADLINE_SQL
            + """ AND EXISTS (
        SELECT 1 FROM control_sessions WHERE id=:session AND user_id=:owner
          AND environment_id=:environment AND revoked_at IS NULL AND expires_at>clock_timestamp())"""
        ),
        {
            **service.deadline_params(admitted, {"id": worker_id}),
            "session": session.id,
            "owner": agent.user_id,
            "environment": agent.environment_id,
        },
    )
    if not valid or admitted["expires_at"] <= utcnow():
        raise ControlError(401, "xbot_issuance_deadline_expired")
    return {
        "worker_token": secret,
        "worker_id": worker_id,
        "admission_id": admission_id,
        "generation": generation,
        "calibration_status": "UNVERIFIED",
        "live_module_admitted": False,
    }


async def revoke_local(tx, *, admission_id):
    service.guard()
    await profiles_admin.guard(tx, settings().environment)
    admission = await service.one(tx, "admissions", admission_id)
    await lifetime(tx, settings().environment, admission["registration_id"], exclusive=True)
    await tx.execute(
        text(
            "UPDATE control_xbot_slots SET revoked=true,generation=generation+1 WHERE admission_id=:a AND NOT revoked"
        ),
        {"a": admission_id},
    )
    await tx.execute(
        text("UPDATE control_xbot_workers SET revoked_at=:n WHERE admission_id=:a AND revoked_at IS NULL"),
        {"a": admission_id, "n": utcnow()},
    )
