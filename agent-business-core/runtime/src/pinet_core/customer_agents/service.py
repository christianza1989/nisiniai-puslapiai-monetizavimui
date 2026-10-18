"""Owner-scoped immutable task drafts. No model, tools, connector or runtime admission."""
import asyncio
from contextlib import asynccontextmanager

from pydantic import ValidationError
from sqlalchemy import or_, select, text
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..control.models import BusinessGrant, User
from ..control.routes import ControlError, identifier, open_cursor, scope, seal_cursor, token_hash
from ..creation.models import Creation
from ..creation.routes import owned
from ..creation.service import ACTIVE, actor_result, actor_statement, binding, current_actor, digest
from ..creation_registration import service as registrations
from ..creation_registration.locks import lifetime
from ..creation_registration.models import Registration
from ..customer_profile import service as profiles
from ..customer_profile.models import REGISTRATION_KEYS
from ..customer_text.adapter import source_current
from ..customer_text.service import bearer_token, customer_session  # noqa: F401 - shared bearer validation
from ..models import Business, new_id, utcnow
from .models import Agent, Config
from .preparation_readiness import ConfigurationOperation, operation_for, scope_for
from .preparation_readiness import require as require_configuration
from .wire import Specification

PURPOSES = ("site_chat", "customer_research", "email", "custom")


def guard():
    cfg = settings()
    if (not cfg.control_enabled or cfg.control_mode != "local" or not (cfg.environment == "local" or cfg.environment.startswith("test-"))
            or not cfg.customer_enabled or not cfg.customer_agents_enabled or cfg.voice_enabled or cfg.smtp_enabled):
        raise ControlError(403, "customer_agents_unavailable")


async def schema_ready(tx):
    return await tx.scalar(text("""SELECT (SELECT count(*)=2 FROM pg_class WHERE relnamespace='public'::regnamespace
      AND relname IN ('control_customer_agent_modules','control_customer_agent_configs')
      AND relrowsecurity AND relforcerowsecurity) AND (SELECT count(*)=3 FROM pg_constraint
        WHERE conrelid IN (to_regclass('control_customer_agent_modules'),to_regclass('control_customer_agent_configs'))
        AND conname IN ('uq_customer_agent_request_key','fk_customer_agent_current_config',
          'fk_customer_agent_authorizing_session') AND convalidated
        AND (conname<>'fk_customer_agent_authorizing_session' OR confdeltype='r'))"""))


async def configuration_current(tx, creation, registry):
    latest = await profiles.registry_row(tx, creation.id)
    return bool(not registry.revoked_at and latest is not None and latest.id == registry.id
        and registry.accepted_revision == creation.current_revision
        and creation.active_job_id is None and creation.status not in ACTIVE)


async def configuration_blocker(tx, session, creation, registry, *, purpose=None,
        operation=ConfigurationOperation.FULL_WEBSITE):
    """Project the maintained write precondition without hiding retained history."""
    if not await configuration_current(tx, creation, registry):
        return "agent_business_not_current"
    try:
        await require_configuration(tx, session, creation, registry, purpose=purpose, operation=operation)
    except ControlError as error:
        if error.status not in {409, 503}:
            raise
        # Evidence may be missing, stale or temporarily unavailable. None of
        # those states permits a draft write, but the saved specification can
        # still be read under the surrounding current-owner authority.
        return "website_foundation_not_ready"
    return None


async def check_binding(tx, session, creation, registry, *, writing=False, purpose=None,
        operation=ConfigurationOperation.FULL_WEBSITE):
    if not await tx.scalar(select(User.id).where(User.id == session.user_id,
            User.environment_id == settings().environment, User.enabled)):
        raise ControlError(401, "unauthenticated")
    registry = await tx.scalar(select(Registration).where(Registration.id == registry.id)
        .execution_options(populate_existing=True))
    if (not registry or binding(registry) != binding(creation) or registry.creation_id != creation.id
            or digest(registrations.stored_material(registry)) != registry.fingerprint):
        raise ControlError(404, "not_found")
    pair = (await tx.execute(select(BusinessGrant, Business).join(Business, Business.id == BusinessGrant.business_id)
        .where(BusinessGrant.id == registry.grant_id, BusinessGrant.business_id == registry.business_id,
            BusinessGrant.environment_id == registry.environment_id, BusinessGrant.enabled,
            BusinessGrant.portfolio_id == creation.portfolio_id,
            BusinessGrant.organization_id == creation.organization_id)
        .execution_options(populate_existing=True))).first()
    if not pair or (pair[1].site_id, pair[1].canonical_host) != (registry.site_id, registry.canonical_host):
        raise ControlError(404, "not_found")
    if writing:
        if not await configuration_current(tx, creation, registry):
            raise ControlError(409, "agent_business_not_current")
        source_pin = settings().control_source_revision
        selected = await require_configuration(tx, session, creation, registry, purpose=purpose, operation=operation)
        if selected == "private_preparation":
            # No native-proof await may follow these final source/SQL fences.
            if not await asyncio.to_thread(source_current) or settings().control_source_revision != source_pin:
                raise ControlError(503, "source_unavailable")
            return await private_final_binding(tx, session, creation, registry, source_pin)
    await current_actor(tx, session, creation.portfolio_id)
    return registry


async def private_final_binding(tx, session, creation, registry, source_pin):
    """One fresh SQL-only snapshot after all native/Git waits; no recursive proof."""
    from ..business_discovery.models import CreationArchive

    expected, expected_binding = registrations.stored_material(registry), binding(creation)
    fingerprint, registry_id, creation_id = registry.fingerprint, registry.id, creation.id
    latest_id = (select(Registration.id).where(Registration.creation_id == creation_id,
        Registration.environment_id == settings().environment)
        .order_by(Registration.accepted_revision.desc()).limit(1).correlate(None).scalar_subquery())
    is_archived = select(CreationArchive.id).where(CreationArchive.creation_id == creation_id,
        CreationArchive.environment_id == settings().environment).exists()
    statement = (actor_statement(session, creation.portfolio_id)
        .add_columns(Registration, BusinessGrant, Business, Creation, latest_id, is_archived)
        .outerjoin(Registration, (Registration.id == registry_id)
            & (Registration.creation_id == creation_id) & (Registration.environment_id == settings().environment))
        .outerjoin(BusinessGrant, (BusinessGrant.id == Registration.grant_id)
            & (BusinessGrant.business_id == Registration.business_id)
            & (BusinessGrant.environment_id == settings().environment))
        .outerjoin(Business, Business.id == Registration.business_id)
        .outerjoin(Creation, (Creation.id == creation_id) & (Creation.environment_id == settings().environment)))
    row = (await tx.execute(statement.execution_options(populate_existing=True))).one_or_none()
    actor_result(row[:5] if row is not None else None, creation.portfolio_id)
    current, grant, business, parent, latest, archived = row[5:]
    if not current or not grant or not business or not parent or not grant.enabled:
        raise ControlError(404, "not_found")
    if (binding(parent) != expected_binding or registrations.stored_material(current) != expected
            or current.fingerprint != fingerprint or digest(registrations.stored_material(current)) != fingerprint
            or current.revoked_at or latest != current.id or current.accepted_revision != parent.current_revision
            or parent.active_job_id is not None or parent.status in ACTIVE):
        raise ControlError(409, "agent_business_not_current")
    if (parent.canonical_host is not None or archived
            or (grant.id, grant.business_id, grant.organization_id, grant.portfolio_id, grant.environment_id)
            != (current.grant_id, current.business_id, current.organization_id, current.portfolio_id, current.environment_id)
            or (business.site_id, business.canonical_host) != (current.site_id, current.canonical_host)):
        raise ControlError(409, "private_preparation_not_ready")
    guard()
    if settings().control_source_revision != source_pin:
        raise ControlError(503, "source_unavailable")
    return current


@asynccontextmanager
async def transaction_authority(tx, session, creation_id, agent_id=None, *, writing=False, lock=True,
        purpose=None, operation=ConfigurationOperation.FULL_WEBSITE):
    """Canonical authority in an existing transaction; no bearer or new permission."""
    guard()
    if not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")
    creation_id = identifier(creation_id)
    if not await schema_ready(tx):
        raise ControlError(503, "customer_agents_schema_unavailable")
    preliminary = await tx.get(Agent, identifier(agent_id)) if agent_id is not None else None
    if agent_id is not None and (not preliminary or preliminary.creation_id != creation_id):
        raise ControlError(404, "not_found")
    if purpose is not None and purpose not in PURPOSES:
        raise ControlError(400, "invalid_request")
    if preliminary and purpose is not None and purpose != preliminary.purpose:
        raise ControlError(409, "agent_purpose_changed")
    bound_purpose = preliminary.purpose if preliminary else purpose
    registry = (await tx.get(Registration, preliminary.registration_id) if preliminary else
        await profiles.registry_row(tx, creation_id))
    if registry and lock:
        # Exact registration lifetime precedes actor/session/creation locks, as in the admin path.
        await lifetime(tx, settings().environment, registry.id)
    creation = await owned(tx, session, creation_id, lock=lock)
    # A caller may already have loaded this Creation before its current mutation lock.
    await tx.refresh(creation)
    if not registry:
        raise ControlError(409, "agent_registration_required")
    registry = await check_binding(tx, session, creation, registry, writing=writing,
        purpose=bound_purpose, operation=operation)
    agent = None
    if preliminary:
        statement = select(Agent).where(Agent.id == preliminary.id)
        if lock:
            statement = statement.with_for_update()
        agent = await tx.scalar(statement.execution_options(populate_existing=True))
        if (not agent or binding(agent) != binding(creation)
                or agent.registration_id != registry.id or agent.registration_fingerprint != registry.fingerprint
                or any(getattr(agent, key) != getattr(registry, key) for key in REGISTRATION_KEYS)):
            raise ControlError(404, "not_found")
    yield tx, session, creation, registry, agent
    guard()
    if not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")
    # Source waits cannot hide a changed parent, session, owner or grant.
    await tx.refresh(creation)
    await check_binding(tx, session, creation, registry, writing=writing,
        purpose=bound_purpose, operation=operation)


@asynccontextmanager
async def authority(token, creation_id, agent_id=None, *, writing=False, purpose=None,
        operation=ConfigurationOperation.FULL_WEBSITE):
    guard()
    if not await asyncio.to_thread(source_current):
        raise ControlError(503, "source_unavailable")
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        async with transaction_authority(tx, session, creation_id, agent_id, writing=writing,
                purpose=purpose, operation=operation) as context:
            yield context


def write_conflict(error):
    """Only the canonical retained UUID invariant is a permanent conflict."""
    queue, seen = [error], set()
    while queue:
        item = queue.pop()
        if id(item) in seen:
            continue
        seen.add(id(item))
        if (getattr(item, "constraint_name", None) == "uq_customer_agent_request_key"
                and getattr(item, "sqlstate", None) == "23505"):
            raise ControlError(409, "idempotency_conflict") from None
        queue.extend(x for x in (getattr(item, "orig", None), item.__cause__, item.__context__) if x is not None)
    raise error


@asynccontextmanager
async def write_authority(token, creation_id, agent_id=None, *, purpose=None,
        operation=ConfigurationOperation.FULL_WEBSITE):
    try:
        async with authority(token, creation_id, agent_id, writing=True, purpose=purpose, operation=operation) as context:
            yield context
    except IntegrityError as error:
        write_conflict(error)


def config_material(agent, config):
    return {"agent_id": agent.id, "registration_fingerprint": agent.registration_fingerprint,
        "purpose": agent.purpose, "revision": config.revision, "specification": config.payload}


def config_view(agent, config):
    if config is None or binding(config) != binding(agent) or config.agent_id != agent.id:
        raise ControlError(503, "invalid_agent_config")
    try:
        value = Specification.model_validate(config.payload).model_dump(mode="json")
        if value != config.payload or digest(config_material(agent, config)) != config.config_sha256:
            raise ValueError("Invalid immutable config")
    except (ValidationError, ValueError, TypeError):
        raise ControlError(503, "invalid_agent_config") from None
    return {"revision_id": config.id, "agent_id": agent.id, "revision": config.revision,
        "specification": value, "sha256": config.config_sha256, "saved_at": config.created_at,
        "saved_source_revision": config.saved_source_revision}


def agent_view(agent, config):
    spec = config_view(agent, config)
    return {"agent_id": agent.id, "creation_id": agent.creation_id, "business_id": agent.business_id,
        "registration_id": agent.registration_id, "purpose": agent.purpose,
        "name": spec["specification"]["name"], "current_revision": agent.current_revision,
        "created_at": agent.created_at, "updated_at": agent.updated_at,
        "configuration_state": "draft", "enabled": False}


async def current_config(tx, agent):
    return await tx.scalar(select(Config).where(Config.agent_id == agent.id, Config.revision == agent.current_revision))


async def detail(tx, agent, selected=None, *, session):
    current = await current_config(tx, agent)
    creation = await tx.get(Creation, agent.creation_id)
    registry = await tx.get(Registration, agent.registration_id)
    blocker = await configuration_blocker(tx, session, creation, registry,
        purpose=agent.purpose, operation=operation_for(agent.purpose))
    return {"agent": agent_view(agent, current), "configuration": config_view(agent, selected or current),
        "readiness": {"configuration_saved": True, "can_edit_configuration": blocker is None, "calibration_status": "UNVERIFIED",
            "module_admission": "not_admitted", "can_calibrate": False, "can_activate": False,
            "channel_activation": "not_performed", "provider_execution": False,
            "blockers": ["calibration_not_implemented", "module_admission_missing"]
                + ([blocker] if blocker else [])}}


def request_fingerprint(creation_id, value, agent_id=None):
    material = value.model_dump(mode="json")
    material.pop("request_id")
    return digest({"creation_id": creation_id, "agent_id": agent_id, "request": material})


async def append_config(tx, agent, value, fingerprint, session):
    config = Config(id=new_id(), agent_id=agent.id, revision=agent.current_revision,
        payload=value.configuration.model_dump(mode="json"), saved_source_revision=settings().control_source_revision,
        idempotency_key=str(value.request_id), request_fingerprint=fingerprint,
        authorizing_session_id=session.id, **binding(agent))
    config.config_sha256 = digest(config_material(agent, config))
    tx.add(config)
    await tx.flush()
    return config


async def create(token, creation_id, value):
    async with write_authority(token, creation_id, purpose=value.purpose,
            operation=operation_for(value.purpose)) as (tx, session, creation, registry, _):
        return await create_in_transaction(tx, session, creation, registry, value)


async def create_in_transaction(tx, session, creation, registry, value):
    """Mutation only; public and internal callers enter canonical authority first."""
    fingerprint = request_fingerprint(creation.id, value)
    old = await tx.scalar(select(Config).where(Config.idempotency_key == str(value.request_id)))
    if old:
        if old.request_fingerprint != fingerprint:
            raise ControlError(409, "idempotency_conflict")
        agent = await tx.get(Agent, old.agent_id)
        if not agent or agent.creation_id != creation.id:
            raise ControlError(404, "not_found")
        return {**await detail(tx, agent, old, session=session), "action": "replayed", "request_id": str(value.request_id)}
    agent = Agent(id=new_id(), **{key: getattr(registry, key) for key in REGISTRATION_KEYS},
        registration_id=registry.id, registration_fingerprint=registry.fingerprint,
        purpose=value.purpose, current_revision=1)
    tx.add(agent)
    await tx.flush()
    config = await append_config(tx, agent, value, fingerprint, session)
    return {**await detail(tx, agent, config, session=session), "action": "created", "request_id": str(value.request_id)}


async def revise(token, creation_id, agent_id, value):
    async with write_authority(token, creation_id, agent_id,
            operation=ConfigurationOperation.PURPOSE_PREPARATION) as (tx, session, creation, _, agent):
        return await revise_in_transaction(tx, session, creation, agent, value)


async def revise_in_transaction(tx, session, creation, agent, value):
    """The same immutable append and optimistic UUID replay as the public route."""
    fingerprint = request_fingerprint(creation.id, value, agent.id)
    old = await tx.scalar(select(Config).where(Config.idempotency_key == str(value.request_id)))
    if old:
        if old.request_fingerprint != fingerprint or old.agent_id != agent.id:
            raise ControlError(409, "idempotency_conflict")
        return {**await detail(tx, agent, old, session=session), "action": "replayed", "request_id": str(value.request_id)}
    if value.expected_revision != agent.current_revision:
        raise ControlError(409, "agent_revision_conflict")
    if agent.current_revision >= 2147483647:
        raise ControlError(409, "agent_revision_exhausted")
    agent.current_revision += 1
    agent.updated_at = utcnow()
    await tx.flush()
    config = await append_config(tx, agent, value, fingerprint, session)
    return {**await detail(tx, agent, config, session=session), "action": "revised", "request_id": str(value.request_id)}


async def get(token, creation_id, agent_id):
    async with authority(token, creation_id, agent_id) as (tx, session, _, _, agent):
        return await detail(tx, agent, session=session)


async def revision(token, creation_id, agent_id, sequence):
    if type(sequence) is not int or not 1 <= sequence <= 2147483647:
        raise ControlError(400, "invalid_request")
    async with authority(token, creation_id, agent_id) as (tx, _, _, _, agent):
        row = await tx.scalar(select(Config).where(Config.agent_id == agent.id, Config.revision == sequence))
        if row is None:
            raise ControlError(404, "not_found")
        return config_view(agent, row)


def page_options(limit, cursor):
    if type(limit) is not int or not 1 <= limit <= 50 or (cursor is not None and
            (not isinstance(cursor, str) or not 1 <= len(cursor) <= 2048)):
        raise ControlError(400, "invalid_request")


def cursor_value(session, scope_id, purpose, after, expires):
    return seal_cursor({"binding": [session.user_id, session.id, scope_id, settings().environment],
        "snapshot": "customer-agents." + purpose, "after": after, "expires": expires})


async def listing(token, creation_id, *, limit=20, cursor=None):
    page_options(limit, cursor)
    async with authority(token, creation_id) as (tx, session, creation, registry, _):
        statement = select(Agent).where(Agent.creation_id == creation.id)
        expires = int(utcnow().timestamp()) + 300
        if cursor:
            after, expires = open_cursor(cursor, session, creation.id, "customer-agents.list")
            anchor = await tx.scalar(statement.where(Agent.id == after))
            if not anchor:
                raise ControlError(409, "agent_cursor_unavailable")
            statement = statement.where(or_(Agent.created_at < anchor.created_at,
                (Agent.created_at == anchor.created_at) & (Agent.id < anchor.id)))
        rows = list(await tx.scalars(statement.order_by(Agent.created_at.desc(), Agent.id.desc()).limit(limit + 1)))
        items = [agent_view(row, await current_config(tx, row)) for row in rows[:limit]]
        blocker = await configuration_blocker(tx, session, creation, registry)
        return {"creation_id": creation.id, "items": items,
            "can_create_draft": blocker is None, "configuration_blockers": [blocker] if blocker else [],
            "purposes": [{"purpose": item,
            "configuration_supported": True, "calibration_supported": False, "activation_supported": False}
            for item in PURPOSES], "has_more": len(rows) > limit,
            "next_cursor": cursor_value(session, creation.id, "list", rows[limit - 1].id, expires)
            if len(rows) > limit else None}


async def preparation_readiness(token, creation_id):
    """Purpose-specific Config-only capability; old v1 listing stays conservative."""
    async with authority(token, creation_id) as (tx, session, creation, registry, _):
        purposes = []
        for purpose in PURPOSES:
            operation = operation_for(purpose)
            selected = scope_for(creation, purpose, operation)
            blocker = await configuration_blocker(tx, session, creation, registry,
                purpose=purpose, operation=operation)
            if selected == "private_preparation" and blocker == "website_foundation_not_ready":
                blocker = "private_preparation_not_ready"
            purposes.append({"purpose": purpose, "readiness_scope": selected,
                "can_create_draft": blocker is None, "configuration_blockers": [blocker] if blocker else []})
        return {"creation_id": creation.id, "purposes": purposes, "operation": "agent_configuration_only",
            "provider_execution": False, "can_calibrate": False, "can_activate": False,
            "channel_activation": "not_performed"}


async def revisions(token, creation_id, agent_id, *, limit=20, cursor=None):
    page_options(limit, cursor)
    async with authority(token, creation_id, agent_id) as (tx, session, creation, _, agent):
        scope_id = creation.id + ":" + agent.id
        statement = select(Config).where(Config.agent_id == agent.id)
        expires = int(utcnow().timestamp()) + 300
        if cursor:
            after, expires = open_cursor(cursor, session, scope_id, "customer-agents.revisions")
            anchor = await tx.scalar(statement.where(Config.id == after))
            if not anchor:
                raise ControlError(409, "agent_cursor_unavailable")
            statement = statement.where(Config.revision < anchor.revision)
        rows = list(await tx.scalars(statement.order_by(Config.revision.desc()).limit(limit + 1)))
        items = [{key: value for key, value in config_view(agent, row).items()
            if key not in {"agent_id", "specification"}} for row in rows[:limit]]
        return {"agent_id": agent.id, "items": items, "has_more": len(rows) > limit,
            "next_cursor": cursor_value(session, scope_id, "revisions", rows[limit - 1].id, expires)
            if len(rows) > limit else None}
