"""Business attachment uses the existing immutable Agent/Config persistence."""
import asyncio
from contextlib import asynccontextmanager
from uuid import uuid5

from sqlalchemy import or_, select, text
from sqlalchemy.exc import IntegrityError

from ..business_attachment import service as sources
from ..business_attachment.models import Binding
from ..config import settings
from ..control.routes import ControlError, identifier, open_cursor, scope, token_hash
from ..creation.service import binding, digest
from ..creation_registration.models import Registration
from ..models import new_id, utcnow
from . import service
from .models import Agent, Config
from .preparation_readiness import operation_for
from .wire import Create, Revise

COMMON = ("business_id", "grant_id", "site_id", "canonical_host")
LEGACY = ("creation_id", "registration_id", "accepted_revision", "candidate_sha256", "accepted_source_revision")


async def schema_ready(tx):
    return bool(await tx.scalar(text("""SELECT
      to_regclass('control_business_source_bindings') IS NOT NULL
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('control_customer_agent_modules')
        AND conname='customer_agent_origin_check' AND convalidated)
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('control_customer_agent_modules')
        AND conname='fk_customer_agent_external_binding' AND convalidated)""")))


async def latest_source(tx, session, business_id):
    return await tx.scalar(select(Binding).where(Binding.business_id == business_id,
        Binding.user_id == session.user_id, Binding.environment_id == settings().environment)
        .order_by(Binding.sequence.desc()).limit(1).execution_options(populate_existing=True))


@asynccontextmanager
async def transaction_authority(tx, session, business_id, agent_id=None, *, writing=False,
        lock=True, purpose=None, source_binding_id=None):
    service.guard()
    business_id = identifier(business_id)
    if not await schema_ready(tx):
        raise ControlError(503, "business_agents_schema_unavailable")
    preliminary = await tx.get(Agent, identifier(agent_id)) if agent_id is not None else None
    if agent_id is not None and (preliminary is None or preliminary.business_id != business_id):
        raise ControlError(404, "not_found")
    if purpose is not None and purpose not in service.PURPOSES:
        raise ControlError(400, "invalid_request")
    if preliminary is not None and purpose is not None and preliminary.purpose != purpose:
        raise ControlError(409, "agent_purpose_changed")
    if preliminary is not None and preliminary.external_binding_id is None:
        async with service.transaction_authority(tx, session, preliminary.creation_id, preliminary.id,
                writing=writing, lock=lock, purpose=purpose,
                operation=operation_for(preliminary.purpose)) as context:
            if context[3].business_id != business_id:
                raise ControlError(404, "not_found")
            yield context
        return
    selected = preliminary.external_binding_id if preliminary is not None else source_binding_id
    if preliminary is None and selected is None:
        # Genuine legacy registrations remain valid parents for business routes.
        await sources.owned_business(tx, session, business_id)
        external = await latest_source(tx, session, business_id)
        if external is None:
            registries = list(await tx.scalars(select(Registration).where(Registration.business_id == business_id,
                Registration.user_id == session.user_id, Registration.environment_id == settings().environment)
                .order_by(Registration.accepted_revision.desc())))
            if registries:
                async with service.transaction_authority(tx, session, registries[0].creation_id,
                        writing=writing, lock=lock, purpose=purpose, operation=operation_for(purpose)) as context:
                    if context[3].business_id != business_id:
                        raise ControlError(404, "not_found")
                    yield context
                return
        else:
            selected = external.id
    async with sources.transaction_authority(tx, session, business_id, selected,
            writing=writing, lock=lock) as registry:
        agent = None
        if preliminary is not None:
            query = select(Agent).where(Agent.id == preliminary.id)
            if lock:
                query = query.with_for_update()
            agent = await tx.scalar(query.execution_options(populate_existing=True))
            if (agent is None or binding(agent) != binding(registry)
                    or agent.external_binding_id != registry.id
                    or agent.registration_fingerprint != registry.fingerprint
                    or any(getattr(agent, name) != getattr(registry, name) for name in COMMON)
                    or any(getattr(agent, name) is not None for name in LEGACY)):
                raise ControlError(404, "not_found")
        yield tx, session, registry, registry, agent


@asynccontextmanager
async def authority(token, business_id, agent_id=None, *, writing=False, lock=True, purpose=None,
        source_binding_id=None, adoption_source_id=None):
    service.guard()
    if not await asyncio.to_thread(service.source_current):
        raise ControlError(503, "source_unavailable")
    try:
        async with scope(token=token_hash(token)) as tx:
            session = await service.customer_session(tx, token)
            if adoption_source_id is not None:
                # Even read-only old-source authority takes SQL row pins. The
                # common business barrier must therefore precede BOTH sources.
                async with sources.transaction_authority(tx, session, business_id, adoption_source_id,
                        writing=True, lock=True):
                    async with transaction_authority(tx, session, business_id, agent_id,
                            writing=False, lock=False, purpose=purpose) as context:
                        yield context
            else:
                async with transaction_authority(tx, session, business_id, agent_id, writing=writing,
                        lock=lock, purpose=purpose, source_binding_id=source_binding_id) as context:
                    yield context
    except IntegrityError as error:
        service.write_conflict(error)


def view(agent, config):
    return {**service.agent_view(agent, config), "external_binding_id": agent.external_binding_id,
        "source_origin": "external" if agent.external_binding_id is not None else "creation"}


async def detail(tx, agent, selected=None, *, session):
    if agent.external_binding_id is None:
        result = await service.detail(tx, agent, selected, session=session)
        result["agent"] = view(agent, await service.current_config(tx, agent))
        return result
    registry = await tx.get(Binding, agent.external_binding_id, populate_existing=True)
    current = await service.current_config(tx, agent)
    ready = registry is not None and await sources.is_current(tx, registry)
    return {"agent": view(agent, current), "configuration": service.config_view(agent, selected or current),
        "readiness": {"configuration_saved": True, "can_edit_configuration": ready,
            "calibration_status": "UNVERIFIED", "module_admission": "not_admitted",
            "can_calibrate": False, "can_activate": False, "channel_activation": "not_performed",
            "provider_execution": False, "blockers": ["calibration_not_implemented", "module_admission_missing"]
                + ([] if ready else ["agent_business_not_current"])}}


def fingerprint(business_id, registry, value, agent_id=None):
    material = value.model_dump(mode="json")
    material.pop("request_id")
    return digest({"business_id": business_id, "external_binding_id": registry.id,
        "external_binding_fingerprint": registry.fingerprint, "agent_id": agent_id, "request": material})


async def create_external(tx, session, registry, value, request_fingerprint, *, provenance=None):
    agent = Agent(id=new_id(), **binding(registry), **{key: getattr(registry, key) for key in COMMON},
        **dict.fromkeys(LEGACY), external_binding_id=registry.id,
        registration_fingerprint=registry.fingerprint, purpose=value.purpose, current_revision=1)
    tx.add(agent)
    await tx.flush()
    config = await service.append_config(tx, agent, value, request_fingerprint, session,
        import_provenance=provenance)
    return agent, config


async def create(token, business_id, value):
    async with authority(token, business_id, writing=True, purpose=value.purpose,
            source_binding_id=str(value.source_binding_id) if value.source_binding_id else None) as context:
        tx, session, parent, registry, _ = context
        if isinstance(registry, Registration):
            original = Create(request_id=value.request_id, purpose=value.purpose, configuration=value.configuration)
            result = await service.create_in_transaction(tx, session, parent, registry, original)
            agent = await tx.get(Agent, result["agent"]["agent_id"])
            result["agent"] = view(agent, await service.current_config(tx, agent))
            return result
        expected = fingerprint(business_id, registry, value)
        old = await tx.scalar(select(Config).where(Config.idempotency_key == str(value.request_id)))
        if old is not None:
            if old.request_fingerprint != expected:
                raise ControlError(409, "idempotency_conflict")
            agent = await tx.get(Agent, old.agent_id)
            if agent is None or agent.external_binding_id != registry.id:
                raise ControlError(409, "idempotency_conflict")
            action = "replayed"
        else:
            agent, old = await create_external(tx, session, registry, value, expected)
            action = "created"
        return {**await detail(tx, agent, old, session=session), "action": action, "request_id": str(value.request_id)}


async def revise(token, business_id, agent_id, value):
    # Explicit source adoption retains Agent UUID and old immutable Config source
    # pins. Ordinary edits still require their exact currently approved source.
    adopting = value.source_binding_id is not None
    async with authority(token, business_id, agent_id, writing=not adopting, lock=not adopting,
            adoption_source_id=str(value.source_binding_id) if adopting else None) as context:
        tx, session, parent, registry, agent = context
        if isinstance(registry, Registration):
            if adopting:
                raise ControlError(409, "external_source_revision_required")
            original = Revise(request_id=value.request_id, expected_revision=value.expected_revision,
                configuration=value.configuration)
            result = await service.revise_in_transaction(tx, session, parent, agent, original)
            result["agent"] = view(agent, await service.current_config(tx, agent))
            return result
        if adopting:
            current = await tx.get(Binding, str(value.source_binding_id), populate_existing=True)
            if current is None or current.fingerprint != value.source_binding_fingerprint:
                raise ControlError(409, "agent_import_source_changed")
            # Both source parents precede the mutable Agent lock. Re-observe
            # the row after acquiring it; the version check below is the CAS.
            agent = await tx.scalar(select(Agent).where(Agent.id == agent.id).with_for_update()
                .execution_options(populate_existing=True))
            if agent is None or agent.external_binding_id is None:
                raise ControlError(404, "not_found")
            if binding(current) != binding(agent) or any(getattr(current, name) != getattr(agent, name) for name in COMMON):
                raise ControlError(409, "agent_import_source_changed")
            return await revise_external(tx, session, current, agent, value)
        return await revise_external(tx, session, registry, agent, value)


async def revise_external(tx, session, registry, agent, value):
    business_id = agent.business_id
    expected = fingerprint(business_id, registry, value, agent.id)
    old = await tx.scalar(select(Config).where(Config.idempotency_key == str(value.request_id)))
    if old is not None:
        if old.request_fingerprint != expected or old.agent_id != agent.id:
            raise ControlError(409, "idempotency_conflict")
        action = "replayed"
    else:
        if value.expected_revision != agent.current_revision:
            raise ControlError(409, "agent_revision_conflict")
        if agent.current_revision >= 2147483647:
            raise ControlError(409, "agent_revision_exhausted")
        agent.current_revision += 1
        agent.updated_at = utcnow()
        agent.external_binding_id = registry.id
        agent.registration_fingerprint = registry.fingerprint
        await tx.flush()
        old = await service.append_config(tx, agent, value, expected, session)
        action = "revised"
    return {**await detail(tx, agent, old, session=session), "action": action, "request_id": str(value.request_id)}


async def get(token, business_id, agent_id):
    async with authority(token, business_id, agent_id) as (tx, session, _, _, agent):
        return await detail(tx, agent, session=session)


async def revision(token, business_id, agent_id, sequence):
    async with authority(token, business_id, agent_id) as (tx, _, _, _, agent):
        row = await tx.scalar(select(Config).where(Config.agent_id == agent.id, Config.revision == sequence))
        if row is None:
            raise ControlError(404, "not_found")
        return service.config_view(agent, row)


async def listing(token, business_id, *, limit=20, cursor=None):
    service.page_options(limit, cursor)
    service.guard()
    if not await asyncio.to_thread(service.source_current):
        raise ControlError(503, "source_unavailable")
    business_id = identifier(business_id)
    async with scope(token=token_hash(token)) as tx:
        session = await service.customer_session(tx, token)
        await sources.owned_business(tx, session, business_id)
        if not await schema_ready(tx):
            raise ControlError(503, "business_agents_schema_unavailable")
        query = select(Agent).where(Agent.business_id == business_id)
        scope_id, expires = "business:"+business_id, int(utcnow().timestamp())+300
        if cursor:
            after, expires = open_cursor(cursor, session, scope_id, "customer-agents.list")
            anchor = await tx.scalar(query.where(Agent.id == after))
            if anchor is None:
                raise ControlError(409, "agent_cursor_unavailable")
            query = query.where(or_(Agent.created_at < anchor.created_at,
                (Agent.created_at == anchor.created_at) & (Agent.id < anchor.id)))
        rows = list(await tx.scalars(query.order_by(Agent.created_at.desc(), Agent.id.desc()).limit(limit+1)))
        result = [view(agent, await service.current_config(tx, agent)) for agent in rows[:limit]]
        registry = await latest_source(tx, session, business_id)
        blocker = "agent_business_not_current" if registry is not None else "business_source_required"
        if not await asyncio.to_thread(service.source_current):
            raise ControlError(503, "source_unavailable")
        await sources.owned_business(tx, session, business_id)
        ready = registry is not None and await sources.is_current(tx, registry)
        return {"business_id": business_id, "items": result, "can_create_draft": ready,
            "source_binding_id": registry.id if registry else None,
            "source_binding_fingerprint": registry.fingerprint if registry else None,
            "configuration_blockers": [] if ready else [blocker], "has_more": len(rows)>limit,
            "next_cursor": service.cursor_value(session, scope_id, "list", rows[limit-1].id, expires)
                if len(rows)>limit else None}


async def revisions(token, business_id, agent_id, *, limit=20, cursor=None):
    service.page_options(limit, cursor)
    async with authority(token, business_id, agent_id) as (tx, session, _, _, agent):
        query = select(Config).where(Config.agent_id == agent.id)
        scope_id, expires = "business:"+business_id+":"+agent.id, int(utcnow().timestamp())+300
        if cursor:
            after, expires = open_cursor(cursor, session, scope_id, "customer-agents.revisions")
            anchor = await tx.scalar(query.where(Config.id == after))
            if anchor is None:
                raise ControlError(409, "agent_cursor_unavailable")
            query = query.where(Config.revision < anchor.revision)
        rows = list(await tx.scalars(query.order_by(Config.revision.desc()).limit(limit+1)))
        items = [{key: value for key, value in service.config_view(agent, row).items()
            if key in {"revision_id", "revision", "sha256", "saved_at", "saved_source_revision"}} for row in rows[:limit]]
        return {"agent_id": agent.id, "items": items, "has_more": len(rows)>limit,
            "next_cursor": service.cursor_value(session, scope_id, "revisions", rows[limit-1].id, expires)
                if len(rows)>limit else None}


async def import_agents(token, business_id, packet):
    async with authority(token, business_id, writing=True,
            source_binding_id=str(packet.source_binding_id)) as (tx, session, _, registry, _):
        if isinstance(registry, Registration) or registry.fingerprint != packet.source_binding_fingerprint:
            raise ControlError(409, "agent_import_source_changed")
        material = packet.model_dump(mode="json", exclude={"request_id"})
        ordered = sorted(packet.agents, key=lambda item: item.key)
        keys = [str(packet.request_id) if index == 0 else str(uuid5(packet.request_id, item.key))
            for index, item in enumerate(ordered)]
        retained = await tx.scalar(select(Config).where(Config.idempotency_key == keys[0]))
        result = []
        for item, key in zip(ordered, keys, strict=True):
            expected = digest({"business_id": business_id, "import": material, "agent_key": item.key})
            old = await tx.scalar(select(Config).where(Config.idempotency_key == key))
            if old is not None:
                if old.request_fingerprint != expected:
                    raise ControlError(409, "idempotency_conflict")
                agent = await tx.get(Agent, old.agent_id)
                if agent is None or agent.external_binding_id != registry.id or agent.business_id != business_id:
                    raise ControlError(409, "idempotency_conflict")
            else:
                if retained is not None:
                    raise ControlError(503, "retained_agent_import_incomplete")
                value = Create(request_id=key, purpose=item.purpose, configuration=item.configuration)
                agent, old = await create_external(tx, session, registry, value, expected,
                    provenance=item.provenance.model_dump(mode="json", exclude_none=True))
            result.append(await detail(tx, agent, old, session=session))
        return {"business_id": business_id, "request_id": str(packet.request_id),
            "action": "replayed" if retained is not None else "imported", "items": result,
            "provider_execution": False, "channel_activation": "not_performed"}
