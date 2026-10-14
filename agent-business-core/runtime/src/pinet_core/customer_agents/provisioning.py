"""Session-ID-bound draft writes on the canonical authority and caller transaction.

Scope fields are native identity expectations, never permission. The caller owns
its Task/run/lease/cancellation fences and outer commit. No provider or bearer is
accepted, persisted or reconstructed here.
"""
import json
from uuid import UUID

from pydantic import ConfigDict, Field, ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from ..config import settings
from ..control.models import Session
from ..control.routes import ControlError, identifier
from ..creation.models import Creation
from ..creation.service import binding
from ..creation_registration.wire import Source, Strict
from ..models import utcnow
from . import service
from .models import Agent
from .wire import Create, Digest, Revise


class ProvisioningTarget(Strict):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)
    user_id: UUID
    organization_id: UUID
    portfolio_id: UUID
    environment_id: str = Field(min_length=1, max_length=100)
    session_id: UUID
    creation_id: UUID
    business_id: UUID
    grant_id: UUID
    source_revision: Source

    def owner_binding(self):
        return {"user_id": str(self.user_id), "organization_id": str(self.organization_id),
            "portfolio_id": str(self.portfolio_id), "environment_id": self.environment_id}


class ProvisioningScope(ProvisioningTarget):
    registration_id: UUID
    registration_fingerprint: Digest


def source_matches(expected):
    if (expected.environment_id != settings().environment
            or expected.source_revision != settings().control_source_revision):
        raise ControlError(503, "source_unavailable")


async def observe(tx, target: ProvisioningTarget, *, lock=True):
    """Dry native admission before dispatch; commit the caller's claim before its model call."""
    if not isinstance(target, ProvisioningTarget):
        raise ControlError(400, "invalid_request")
    try:
        target = ProvisioningTarget.model_validate_json(target.model_dump_json())
    except (ValidationError, ValueError, TypeError):
        raise ControlError(400, "invalid_request") from None
    async with tx.begin_nested():
        session = await authorizing_session(tx, target)
        async with service.transaction_authority(tx, session, str(target.creation_id), writing=True, lock=lock) as (
                _, session, creation, registry, _):
            result = ProvisioningScope.model_validate_json(json.dumps(target.model_dump(mode="json") |
                {"registration_id": registry.id, "registration_fingerprint": registry.fingerprint}))
            native_matches(result, session, creation, registry)
        source_matches(target)
        return result


async def capture(tx, session: Session, creation_id: str, *, business_id: str, grant_id: str,
        source_revision: str, lock=True):
    """Pin a server-selected target, before Task locks/provider dispatch; never derive permission."""
    creation = await tx.get(Creation, identifier(creation_id), populate_existing=True)
    if not creation:
        raise ControlError(404, "not_found")
    try:
        target = ProvisioningTarget.model_validate_json(json.dumps(binding(creation) | {
            "session_id": session.id, "creation_id": creation.id, "business_id": identifier(business_id),
            "grant_id": identifier(grant_id), "source_revision": source_revision}))
    except (ValidationError, ValueError, TypeError):
        raise ControlError(400, "invalid_request") from None
    return await observe(tx, target, lock=lock)


async def verify(tx, expected: ProvisioningScope, *, lock=False):
    """Recheck an existing pin, without writing or deriving another target."""
    if not isinstance(expected, ProvisioningScope):
        raise ControlError(400, "invalid_request")
    try:
        expected = ProvisioningScope.model_validate_json(expected.model_dump_json())
    except (ValidationError, ValueError, TypeError):
        raise ControlError(400, "invalid_request") from None
    async with tx.begin_nested():
        session = await authorizing_session(tx, expected)
        async with service.transaction_authority(tx, session, str(expected.creation_id), writing=True, lock=lock) as (
                _, session, creation, registry, _):
            native_matches(expected, session, creation, registry)
        source_matches(expected)


def validated(scope, value, model):
    if not isinstance(scope, ProvisioningScope) or not isinstance(value, model):
        raise ControlError(400, "invalid_request")
    try:
        # Also reject invalid model_construct/model_copy objects supplied by an internal caller.
        return (ProvisioningScope.model_validate_json(scope.model_dump_json()),
            model.model_validate_json(value.model_dump_json()))
    except (ValidationError, ValueError, TypeError):
        raise ControlError(400, "invalid_request") from None


async def authorizing_session(tx, expected):
    service.guard()
    source_matches(expected)
    actor = (await tx.execute(text("SELECT current_setting('pinet.control_user',true), "
        "current_setting('pinet.environment',true)"))).one()
    if tuple(actor) != (str(expected.user_id), expected.environment_id):
        raise ControlError(401, "unauthenticated")
    session = await tx.scalar(select(Session).where(Session.id == str(expected.session_id),
        Session.user_id == str(expected.user_id), Session.environment_id == expected.environment_id)
        .execution_options(populate_existing=True))
    if not session or session.revoked_at or session.expires_at <= utcnow():
        raise ControlError(401, "unauthenticated")
    return session


def native_matches(expected, session, creation, registry):
    if (session.id != str(expected.session_id) or session.user_id != str(expected.user_id)
            or binding(creation) != expected.owner_binding() or creation.id != str(expected.creation_id)
            or registry.id != str(expected.registration_id)
            or registry.fingerprint != expected.registration_fingerprint
            or registry.business_id != str(expected.business_id) or registry.grant_id != str(expected.grant_id)):
        raise ControlError(409, "agent_business_not_current")


async def execute(tx, expected, value, *, agent_id=None):
    try:
        # Partial Agent/Config writes and named UUID conflicts cannot poison the outer Task transaction.
        async with tx.begin_nested():
            session = await authorizing_session(tx, expected)
            async with service.transaction_authority(tx, session, str(expected.creation_id), agent_id,
                    writing=True) as (_, session, creation, registry, agent):
                native_matches(expected, session, creation, registry)
                if agent_id is None:
                    result = await service.create_in_transaction(tx, session, creation, registry, value)
                else:
                    result = await service.revise_in_transaction(tx, session, creation, agent, value)
                # A retained public UUID receipt is historical. It cannot be rebound to another Registration.
                saved = await tx.get(Agent, result["agent"]["agent_id"], populate_existing=True)
                if (not saved or saved.registration_id != registry.id
                        or saved.registration_fingerprint != registry.fingerprint
                        or any(getattr(saved, key) != getattr(registry, key) for key in service.REGISTRATION_KEYS)):
                    raise ControlError(409, "idempotency_conflict")
            # The canonical final source wait must not silently adopt a newer Task instruction snapshot.
            source_matches(expected)
            return result
    except IntegrityError as error:
        service.write_conflict(error)


async def create(tx, scope: ProvisioningScope, value: Create):
    expected, value = validated(scope, value, Create)
    return await execute(tx, expected, value)


async def revise(tx, scope: ProvisioningScope, agent_id: str, value: Revise):
    expected, value = validated(scope, value, Revise)
    return await execute(tx, expected, value, agent_id=agent_id)
