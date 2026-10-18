"""Read existing immutable drafts through canonical relationships, never admission."""
from sqlalchemy import and_, func, select

from ..business_attachment.models import Binding as SourceBinding
from ..control.routes import ControlError, seal_cursor
from ..creation.models import Creation
from ..creation.service import ACTIVE, binding, digest
from ..creation_registration.models import Registration
from ..customer_agents import service as agents
from ..customer_agents.models import Agent, Config
from ..customer_profile.models import REGISTRATION_KEYS
from ..models import utcnow
from ..workspace_read.service import resolve
from ..workspace_topics import service as topics
from .directory_wire import DirectoryEntry, DirectoryPage


async def metadata(tx, session, row, *, include_external=True):
    if row.anchor_kind != "business":
        raise ControlError(409, "business_anchor_required")
    if not await agents.schema_ready(tx):
        raise ControlError(503, "customer_agents_schema_unavailable")
    expected = binding(row)
    graph = await resolve(tx, session, row.portfolio_id, "business", row.business_id)
    latest = select(Registration.creation_id, func.max(Registration.accepted_revision).label("revision")).where(
        *topics.constraints(Registration, expected)).group_by(Registration.creation_id).subquery()
    query = select(Agent.id, Agent.current_revision, Config.id.label("config_id"), Config.config_sha256,
        Agent.creation_id, Agent.registration_id, Registration.fingerprint,
        Creation.current_revision.label("creation_revision"), Creation.active_job_id, Creation.status,
        Registration.accepted_revision).join(Registration, and_(
            Registration.id == Agent.registration_id, Registration.fingerprint == Agent.registration_fingerprint,
            *(getattr(Agent, key) == getattr(Registration, key) for key in REGISTRATION_KEYS)))
    query = query.join(latest, and_(Registration.creation_id == latest.c.creation_id,
        Registration.accepted_revision == latest.c.revision)).join(Creation, and_(
            Creation.id == Agent.creation_id,
            *(getattr(Creation, key) == getattr(Agent, key) for key in expected)))
    query = query.join(Config, and_(Config.agent_id == Agent.id, Config.revision == Agent.current_revision,
        *(getattr(Config, key) == getattr(Agent, key) for key in expected))).where(
        *topics.constraints(Agent, expected), Agent.creation_id.in_([c.id for c in graph.creations]),
        Agent.business_id == row.business_id, Agent.grant_id == row.grant_id,
        Registration.revoked_at.is_(None)).order_by(Agent.id)
    rows = [dict(r) for r in (await tx.execute(query)).mappings()]
    if include_external:
        latest_source = select(SourceBinding.business_id, func.max(SourceBinding.sequence).label("sequence")).where(
            *topics.constraints(SourceBinding, expected)).group_by(SourceBinding.business_id).subquery()
        external = select(Agent.id, Agent.current_revision, Config.id.label("config_id"), Config.config_sha256,
            Agent.creation_id, Agent.registration_id, Agent.external_binding_id, SourceBinding.fingerprint,
            (SourceBinding.expires_at > func.clock_timestamp()).label("source_current")).join(SourceBinding, and_(
                SourceBinding.id == Agent.external_binding_id,
                SourceBinding.fingerprint == Agent.registration_fingerprint,
                *(getattr(SourceBinding, key) == getattr(Agent, key) for key in
                    (*expected, "business_id", "grant_id", "site_id", "canonical_host"))))
        external = external.join(latest_source, and_(SourceBinding.business_id == latest_source.c.business_id,
            SourceBinding.sequence == latest_source.c.sequence)).join(Config, and_(Config.agent_id == Agent.id,
                Config.revision == Agent.current_revision, Config.external_binding_id == Agent.external_binding_id,
                Config.external_binding_fingerprint == Agent.registration_fingerprint,
                *(getattr(Config, key) == getattr(Agent, key) for key in expected))).where(
                    *topics.constraints(Agent, expected), Agent.business_id == row.business_id,
                    Agent.grant_id == row.grant_id, SourceBinding.revoked_at.is_(None))
        rows.extend(dict(r) for r in (await tx.execute(external)).mappings())
        rows.sort(key=lambda item: item["id"])
    snapshot = digest({"topic": row.id, "binding": expected, "business": row.business_id,
        "grant": row.grant_id, "entries": rows})
    return rows, snapshot


async def entry(tx, row, meta):
    agent, config = await tx.get(Agent, meta["id"]), await tx.get(Config, meta["config_id"])
    if (not agent or not config or binding(agent) != binding(row)
            or agent.current_revision != meta["current_revision"]
            or agent.registration_id != meta["registration_id"] or agent.business_id != row.business_id
            or agent.external_binding_id != meta.get("external_binding_id")
            or agent.registration_fingerprint != meta["fingerprint"]
            or agent.grant_id != row.grant_id or config.config_sha256 != meta["config_sha256"]):
        raise ControlError(409, "snapshot_expired")
    spec = agents.config_view(agent, config)
    current = (bool(meta["source_current"]) if agent.external_binding_id is not None else
        meta["accepted_revision"] == meta["creation_revision"]
        and meta["active_job_id"] is None and meta["status"] not in ACTIVE)
    return topics.project(DirectoryEntry, agent_id=agent.id, creation_id=agent.creation_id,
        registration_id=agent.registration_id, business_id=agent.business_id,
        external_binding_id=agent.external_binding_id,
        revision_id=config.id, revision=config.revision, configuration_sha256=config.config_sha256,
        name=spec["specification"]["name"], purpose=agent.purpose, goal=spec["specification"]["goal"],
        business_state="current" if current else "not_current")


async def read(tx, session, row, *, limit=20, cursor=None, include_external=True):
    if type(limit) is not int or not 1 <= limit <= 50:
        raise ControlError(400, "invalid_request")
    rows, snapshot = await metadata(tx, session, row, include_external=include_external)
    after, expires = None, int(utcnow().timestamp())+300
    if cursor:
        payload, expires = topics.decoded_cursor(cursor, session, row.portfolio_id, snapshot)
        if payload.get("purpose") != "workspace-directory" or payload.get("topic") != row.id:
            raise ControlError(400, "invalid_cursor")
        after = payload["after"]
        if after not in {r["id"] for r in rows}:
            raise ControlError(409, "snapshot_expired")
    remaining = [r for r in rows if after is None or r["id"] > after]
    selected = remaining[:limit]
    items = [await entry(tx, row, meta) for meta in selected]
    _, current = await metadata(tx, session, row, include_external=include_external)
    if current != snapshot:
        raise ControlError(409, "snapshot_expired")
    # The final metadata recollection also awaits SQL; check authority after it.
    await topics.owned_topic(tx, session, row.portfolio_id, row.id)
    more = len(remaining) > len(selected)
    next_cursor = seal_cursor({"binding": [session.user_id, session.id, row.portfolio_id, row.environment_id],
        "snapshot": snapshot, "purpose": "workspace-directory", "topic": row.id,
        "after": selected[-1]["id"], "expires": expires}) if more else None
    return topics.project(DirectoryPage, topic_id=row.id, portfolio_id=row.portfolio_id,
        business_id=row.business_id, items=items, total_count=len(rows), snapshot_sha256=snapshot,
        has_more=more, next_cursor=next_cursor)


async def context(tx, session, row):
    try:
        page = await read(tx, session, row)
    except ControlError as error:
        if error.code != "customer_agents_schema_unavailable":
            raise
        return {"state": "unavailable", "reason": "schema_unavailable", "items": None,
            "total_count": None, "omitted_count": None, "snapshot_sha256": None, "execution_authority": "none"}
    return {"state": "available", "topic_id": page["topic_id"], "portfolio_id": page["portfolio_id"],
        "business_id": page["business_id"], "observed_at": utcnow().isoformat(),
        "items": page["items"], "total_count": page["total_count"],
        "omitted_count": max(0, page["total_count"]-len(page["items"])),
        "snapshot_sha256": page["snapshot_sha256"], "execution_authority": "none"}
