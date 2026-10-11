"""PG authority and acceptance; SQLite completion is only a private local proposal."""

import asyncio
import hashlib
import json
import re
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select, text

from .. import knowledge
from ..config import settings
from ..control.models import BusinessGrant, Membership, User
from ..control.routes import ControlError, token_hash
from ..creation.models import Creation
from ..creation.service import digest
from ..creation_registration.locks import lifetime
from ..creation_registration.models import Registration
from ..creation_registration.service import stored_material
from ..customer.models import Account
from ..customer_agents import service as agents
from ..customer_agents.models import Agent
from ..customer_profile import instructions
from ..customer_profile import service as profiles
from ..customer_profile.models import REGISTRATION_KEYS
from ..customer_profile.models import Admission as ProfileAdmission
from ..customer_text.adapter import source_current
from ..db import db
from ..models import Business, utcnow
from .library import load


def guard():
    cfg = settings()
    if (
        not cfg.xbot_bridge_enabled
        or not cfg.customer_agents_enabled
        or not cfg.customer_enabled
        or not cfg.control_enabled
        or cfg.control_mode != "local"
        or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
        or cfg.voice_enabled
        or cfg.smtp_enabled
    ):
        raise ControlError(403, "xbot_bridge_unavailable")


async def source_guard():
    guard()
    if not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")


async def one(tx, table, row_id, *, lock=False):
    if table not in {"admissions", "workers", "tickets"}:
        raise ValueError("Unsupported table")
    result = await tx.execute(
        text(f"SELECT * FROM control_xbot_{table} WHERE id=:id" + (" FOR UPDATE" if lock else "")),
        {"id": row_id},
    )
    row = result.mappings().first()
    if row is None:
        raise ControlError(404, "not_found")
    return dict(row)


def module_material():
    lib = load()
    root = Path(lib.__file__).resolve().parents[1]
    paths = sorted("xbot/" + path.name for path in (root / "xbot").glob("*.py")) + ["instructions/AGENT.md"]
    hashes = {p: hashlib.sha256((root / p).read_text("utf-8").encode()).hexdigest() for p in paths}
    return {
        "module_id": "xbot",
        "mode": "synthetic_local_proposal",
        "hashes": hashes,
        "fingerprint": digest(hashes),
        "instruction_sha256": hashes["instructions/AGENT.md"],
    }


async def current(tx, admission, *, worker=None):
    """Short canonical lifetime/actor/config/module/source locks. No model inside this scope."""
    lib = load()
    material = admission["material"]
    if digest(material) != admission["fingerprint"] or material["module"] != module_material():
        raise ControlError(409, "xbot_module_source_changed")
    await lifetime(tx, settings().environment, admission["registration_id"])
    pinned = await tx.scalar(
        text("SELECT control_xbot_pin(:a,:w)"), {"a": admission["id"], "w": worker["id"] if worker else None}
    )
    if not pinned:
        raise ControlError(404, "not_found")
    user = await tx.scalar(
        select(User)
        .where(User.id == admission["user_id"], User.environment_id == admission["environment_id"])
        .execution_options(populate_existing=True)
    )
    account = await tx.scalar(
        select(Account)
        .where(
            Account.user_id == admission["user_id"],
            Account.environment_id == admission["environment_id"],
            Account.verified_at.is_not(None),
        )
        .execution_options(populate_existing=True)
    )
    member = await tx.scalar(
        select(Membership)
        .where(
            Membership.user_id == admission["user_id"],
            Membership.organization_id == admission["organization_id"],
            Membership.environment_id == admission["environment_id"],
            Membership.role == "owner",
            Membership.enabled,
        )
        .execution_options(populate_existing=True)
    )
    if not user or not user.enabled or not account or not member:
        raise ControlError(403, "xbot_authority_revoked")
    registry = await tx.get(Registration, admission["registration_id"], populate_existing=True)
    creation = await tx.scalar(
        select(Creation)
        .where(Creation.id == material["creation_id"])
        .execution_options(populate_existing=True)
    )
    agent = await tx.scalar(
        select(Agent).where(Agent.id == admission["agent_id"]).execution_options(populate_existing=True)
    )
    if (
        not registry
        or not creation
        or not agent
        or not await agents.configuration_current(tx, creation, registry)
    ):
        raise ControlError(409, "xbot_registration_not_current")
    if (
        registry.fingerprint != material["registration_fingerprint"]
        or digest(stored_material(registry)) != registry.fingerprint
        or agent.registration_id != registry.id
        or agent.business_id != admission["business_id"]
        or agent.site_id != admission["site_id"]
        or agent.user_id != admission["user_id"]
        or agent.organization_id != admission["organization_id"]
        or agent.portfolio_id != admission["portfolio_id"]
        or agent.environment_id != admission["environment_id"]
    ):
        raise ControlError(409, "xbot_identity_changed")
    config = agents.config_view(agent, await agents.current_config(tx, agent))
    if config["revision"] != admission["config_revision"] or config["sha256"] != admission["config_sha256"]:
        raise ControlError(409, "xbot_config_changed")
    grant = await tx.scalar(
        select(BusinessGrant)
        .where(BusinessGrant.id == registry.grant_id)
        .execution_options(populate_existing=True)
    )
    business = await tx.get(Business, registry.business_id, populate_existing=True)
    if (
        not grant
        or not grant.enabled
        or not business
        or (grant.business_id, grant.organization_id, grant.portfolio_id, grant.environment_id)
        != (registry.business_id, registry.organization_id, registry.portfolio_id, registry.environment_id)
        or business.site_id != registry.site_id
        or business.canonical_host != registry.canonical_host
    ):
        raise ControlError(403, "xbot_authority_revoked")
    profile = await tx.scalar(
        select(ProfileAdmission)
        .where(
            ProfileAdmission.creation_id == creation.id,
            ProfileAdmission.environment_id == settings().environment,
        )
        .order_by(ProfileAdmission.sequence.desc())
        .limit(1)
        .execution_options(populate_existing=True)
    )
    if (
        not profile
        or profile.id != admission["profile_id"]
        or profile.revoked_at
        or profile.registration_id != registry.id
        or profile.fingerprint != material["profile_fingerprint"]
        or any(getattr(profile, key) != getattr(registry, key) for key in REGISTRATION_KEYS)
        or profile.execution_source_revision != settings().control_source_revision
        or any(getattr(profile, k) != v for k, v in instructions.manifest().items())
    ):
        raise ControlError(409, "xbot_profile_changed")
    profiles.admitted(profile)
    slot = (
        (
            await tx.execute(
                text("SELECT * FROM control_xbot_slots WHERE environment_id=:e AND site_id=:s"),
                {"e": admission["environment_id"], "s": admission["site_id"]},
            )
        )
        .mappings()
        .first()
    )
    if not slot or slot["admission_id"] != admission["id"] or slot["revoked"]:
        raise ControlError(409, "xbot_module_revoked")
    if worker:
        fresh = (
            (await tx.execute(text("SELECT * FROM control_xbot_workers WHERE id=:id"), {"id": worker["id"]}))
            .mappings()
            .first()
        )
        if (
            not fresh
            or fresh["revoked_at"]
            or fresh["expires_at"] <= utcnow()
            or fresh["admission_id"] != admission["id"]
            or fresh["generation"] != slot["generation"]
        ):
            raise ControlError(403, "xbot_worker_revoked")
    reference, index_hash = await profiles.source(tx, business, profiles.reference(profile))
    if index_hash != material["binding"]["index_receipt_sha256"]:
        raise ControlError(409, "xbot_source_changed")
    projection = await knowledge.projection(tx)
    public = material["public_profile"]
    pages = sorted(projection["pages"], key=lambda p: p["id"]) if projection else []
    facts = [p["text"] for p in pages]
    if facts != public["facts"] or not 1 <= len(facts) <= 35 or any(len(f) > 1800 for f in facts):
        raise ControlError(409, "xbot_facts_changed")
    binding = lib.Binding.model_validate(material["binding"])
    if (
        binding.knowledge_ref.model_dump() != reference.model_dump()
        or binding.execution_source_revision != settings().control_source_revision
        or admission["expires_at"] <= utcnow()
        or binding.expires_at <= utcnow().timestamp()
    ):
        raise ControlError(409, "xbot_binding_expired_or_changed")
    await source_guard()
    # The Git check awaits outside the event loop; elapsed time is not a TTL renewal.
    await profiles.source(tx, business, profiles.reference(profile))
    if (
        admission["expires_at"] <= utcnow()
        or binding.expires_at <= utcnow().timestamp()
        or (worker and fresh["expires_at"] <= utcnow())
    ):
        raise ControlError(409, "xbot_binding_expired_or_changed")
    return binding


@asynccontextmanager
async def worker_scope(token):
    guard()
    if not isinstance(token, str) or not re.fullmatch(r"[a-f0-9]{64}", token):
        raise ControlError(401, "xbot_worker_unauthenticated")
    async with db.registry() as tx:
        row = (
            (
                await tx.execute(
                    text("SELECT * FROM control_xbot_worker_lookup(:h,:e)"),
                    {"h": token_hash(token), "e": settings().environment},
                )
            )
            .mappings()
            .first()
        )
        if not row:
            raise ControlError(401, "xbot_worker_unauthenticated")
        await tx.execute(
            text("SELECT set_config('pinet.environment',:e,true),set_config('pinet.control_user',:u,true)"),
            {"e": settings().environment, "u": row["user_id"]},
        )
        worker = await one(tx, "workers", row["id"])
        admission = await one(tx, "admissions", worker["admission_id"])
        yield tx, worker, admission


async def resolve(token, authority, permission):
    if permission not in {"xbot.configure", "xbot.read", "xbot.control", "xbot.execute"}:
        raise ControlError(403, "xbot_permission_denied")
    async with worker_scope(token) as (tx, worker, admission):
        if (
            authority.organization_id,
            authority.business_id,
            authority.environment_id,
            authority.site_id,
        ) != (
            admission["organization_id"],
            admission["business_id"],
            admission["environment_id"],
            admission["site_id"],
        ):
            raise ControlError(403, "xbot_permission_denied")
        binding = await current(tx, admission, worker=worker)
    # Scope, final source checks and commit end before returning to any model await.
    return binding


async def enqueue(token, request_id):
    key = str(UUID(str(request_id)))
    async with worker_scope(token) as (tx, worker, admission):
        await current(tx, admission, worker=worker)
        await tx.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:k,0))"),
            {"k": "xbot-ticket:" + worker["id"] + ":" + key},
        )
        old = (
            await tx.execute(
                text("SELECT id FROM control_xbot_tickets WHERE worker_id=:w AND request_id=:r"),
                {"w": worker["id"], "r": key},
            )
        ).first()
        if old:
            return old[0]
        ticket = str(uuid4())
        await tx.execute(
            text("""INSERT INTO control_xbot_tickets(id,user_id,organization_id,portfolio_id,environment_id,
          worker_id,admission_id,generation,request_id,request_sha256,state,created_at,updated_at)
          VALUES(:id,:u,:o,:p,:e,:w,:a,:g,:r,:h,'queued',:n,:n)"""),
            {
                "id": ticket,
                "u": worker["user_id"],
                "o": worker["organization_id"],
                "p": worker["portfolio_id"],
                "e": worker["environment_id"],
                "w": worker["id"],
                "a": admission["id"],
                "g": worker["generation"],
                "r": key,
                "h": digest({"admission": admission["fingerprint"], "request_id": key, "kind": "draft"}),
                "n": utcnow(),
            },
        )
        return ticket


async def claim(token, ticket_id):
    async with worker_scope(token) as (tx, worker, admission):
        await current(tx, admission, worker=worker)
        ticket = await one(tx, "tickets", ticket_id, lock=True)
        if ticket["worker_id"] != worker["id"] or ticket["admission_id"] != admission["id"]:
            raise ControlError(404, "not_found")
        if ticket["state"] != "queued":
            if ticket["state"] == "reserved":
                # No blind model retry after a lost process/response; retain reservation.
                raise ControlError(409, "xbot_ticket_already_reserved")
            return ticket, False
        now = utcnow()
        await tx.execute(
            text(
                "UPDATE control_xbot_tickets SET state='reserved',epoch=epoch+1,lease_until=:l,updated_at=:n WHERE id=:id"
            ),
            {"id": ticket_id, "l": now + timedelta(seconds=120), "n": now},
        )
        return await one(tx, "tickets", ticket_id), True


def safe_receipt(ticket):
    return {
        "ticket_id": ticket["id"],
        "state": ticket["state"],
        "epoch": ticket["epoch"],
        "job_id": ticket["job_id"],
        "proposal_sha256": ticket["proposal_sha256"],
        "known_model_usage": ticket["usage"],
        "usage_status": ticket["usage_status"],
        "started_calls": ticket["started_calls"],
        "finished_calls": ticket["finished_calls"],
        "reason": ticket["reason"],
        "provider_execution": False,
        "channel_activation": "not_performed",
        "calibration_status": "UNVERIFIED",
        "live_module_admitted": False,
        "mode": "synthetic_local_proposal",
    }


async def bind_job(token, ticket, job_id):
    job_id = str(UUID(job_id))
    async with worker_scope(token) as (tx, worker, admission):
        await current(tx, admission, worker=worker)
        row = await one(tx, "tickets", ticket["id"], lock=True)
        ticket_fence(row, ticket, worker)
        if row["job_id"] is not None and row["job_id"] != job_id:
            raise ControlError(409, "xbot_job_conflict")
        await tx.execute(
            text("UPDATE control_xbot_tickets SET job_id=:j,updated_at=:n WHERE id=:id"),
            {"id": row["id"], "j": job_id, "n": utcnow()},
        )


def ticket_fence(row, ticket, worker):
    if row["worker_id"] != worker["id"] or row["admission_id"] != worker["admission_id"]:
        raise ControlError(404, "not_found")
    if (
        row["state"] != "reserved"
        or row["epoch"] != ticket["epoch"]
        or row["generation"] != worker["generation"]
        or row["lease_until"] <= utcnow()
    ):
        raise ControlError(409, "xbot_ticket_fence_expired")


async def begin_call(token, ticket):
    async with worker_scope(token) as (tx, worker, admission):
        await current(tx, admission, worker=worker)
        row = await one(tx, "tickets", ticket["id"], lock=True)
        ticket_fence(row, ticket, worker)
        if not row["job_id"] or row["started_calls"] != row["finished_calls"] or row["started_calls"] >= 2:
            raise ControlError(409, "xbot_model_call_limit")
        await tx.execute(
            text(
                "UPDATE control_xbot_tickets SET started_calls=started_calls+1,usage_status=CASE WHEN usage<>'{}'::jsonb THEN 'partial' ELSE 'unknown' END,updated_at=:n WHERE id=:id"
            ),
            {"id": row["id"], "n": utcnow()},
        )


def usage_valid(usage):
    return (
        isinstance(usage, dict)
        and not set(usage)
        - {"input_tokens", "output_tokens", "cached_input_tokens", "reasoning_output_tokens"}
        and all(type(v) is int and v >= 0 for v in usage.values())
    )


async def finish_call(token, ticket, usage, usage_status):
    if not usage_valid(usage) or usage_status not in {"known", "partial", "unknown"}:
        raise ControlError(400, "xbot_invalid_receipt")
    # Accounting remains writable through retained worker identity after revocation.
    async with worker_scope(token) as (tx, worker, _):
        row = await one(tx, "tickets", ticket["id"], lock=True)
        if row["worker_id"] != worker["id"] or row["epoch"] != ticket["epoch"]:
            raise ControlError(404, "not_found")
        if row["state"] != "reserved" or row["finished_calls"] >= row["started_calls"]:
            raise ControlError(409, "xbot_usage_conflict")
        if any(usage.get(key, 0) < value for key, value in row["usage"].items()):
            raise ControlError(409, "xbot_usage_conflict")
        await tx.execute(
            text(
                "UPDATE control_xbot_tickets SET finished_calls=finished_calls+1,usage=CAST(:u AS JSONB),usage_status=:s,updated_at=:n WHERE id=:id"
            ),
            {"id": row["id"], "u": json.dumps(usage), "s": usage_status, "n": utcnow()},
        )


async def reconcile_abandoned(token, ticket_id):
    async with worker_scope(token) as (tx, worker, _):
        row = await one(tx, "tickets", ticket_id, lock=True)
        if row["worker_id"] != worker["id"]:
            raise ControlError(404, "not_found")
        if row["state"] == "reserved":
            if row["lease_until"] > utcnow():
                raise ControlError(409, "xbot_reservation_not_expired")
            await tx.execute(
                text(
                    "UPDATE control_xbot_tickets SET state='uncertain',reason='xbot_worker_abandoned',updated_at=:n WHERE id=:id"
                ),
                {"id": row["id"], "n": utcnow()},
            )
            row = await one(tx, "tickets", ticket_id)
        return safe_receipt(row)


async def complete(token, ticket, *, job_id, proposal_sha256, usage, accepted, usage_status="unknown"):
    """Final PG CAS shares lifetime/actor/config/source locks with revocation writers."""
    # Usage is independent metadata, never model prose. Reject raw/unknown fields.
    if (
        not isinstance(proposal_sha256, str)
        or not re.fullmatch(r"[a-f0-9]{64}", proposal_sha256)
        or type(accepted) is not bool
        or usage_status not in {"known", "partial", "unknown"}
        or not usage_valid(usage)
    ):
        raise ControlError(400, "xbot_invalid_receipt")
    try:
        job_id = str(UUID(job_id))
    except (ValueError, TypeError, AttributeError):
        raise ControlError(400, "xbot_invalid_receipt") from None
    async with worker_scope(token) as (tx, worker, admission):
        reason, state = None, "accepted" if accepted else "rejected"
        try:
            await current(tx, admission, worker=worker)
        except ControlError as error:
            reason, state = error.code, "quarantined"
        except (HTTPException, ValidationError, ValueError, KeyError):
            reason, state = "xbot_source_unavailable", "quarantined"
        saved = await one(tx, "tickets", ticket["id"], lock=True)
        if saved["worker_id"] != worker["id"] or saved["admission_id"] != admission["id"]:
            raise ControlError(404, "not_found")
        if saved["state"] in {"accepted", "rejected", "quarantined", "uncertain"}:
            if (
                saved["job_id"] != job_id
                or saved["proposal_sha256"] != proposal_sha256
                or saved["usage"] != usage
                or saved["usage_status"] != usage_status
            ):
                raise ControlError(409, "xbot_receipt_conflict")
            return safe_receipt(saved)
        if saved["state"] != "reserved" or saved["job_id"] != job_id:
            raise ControlError(409, "xbot_ticket_fence_expired")
        if (
            saved["epoch"] != ticket["epoch"]
            or saved["generation"] != worker["generation"]
            or saved["lease_until"] <= utcnow()
        ):
            state, reason = "quarantined", "xbot_ticket_fence_expired"
        if saved["usage"] != usage or saved["usage_status"] != usage_status:
            raise ControlError(409, "xbot_usage_conflict")
        if state == "accepted" and (
            usage_status != "known" or saved["started_calls"] != 2 or saved["finished_calls"] != 2
        ):
            state, reason = "quarantined", "xbot_usage_unverified"
        await tx.execute(
            text("""UPDATE control_xbot_tickets SET state=:s,reason=:r,job_id=:j,
          proposal_sha256=:h,usage=CAST(:u AS JSONB),usage_status=:us,updated_at=:n WHERE id=:id"""),
            {
                "id": saved["id"],
                "s": state,
                "r": reason,
                "j": job_id,
                "h": proposal_sha256,
                "u": json.dumps(usage),
                "us": usage_status,
                "n": utcnow(),
            },
        )
        return safe_receipt(await one(tx, "tickets", saved["id"]))


async def receipt(owner_token, creation_id, agent_id, ticket_id):
    guard()
    async with agents.authority(owner_token, creation_id, agent_id) as (tx, _, _, _, agent):
        row = await one(tx, "tickets", ticket_id)
        admission = await one(tx, "admissions", row["admission_id"])
        if admission["agent_id"] != agent.id:
            raise ControlError(404, "not_found")
        return safe_receipt(row)
