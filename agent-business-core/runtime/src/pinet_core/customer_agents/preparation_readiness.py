"""Named Config-only preparation; never a Website/Profile/channel admission."""
from enum import StrEnum

from ..config import settings
from ..content_work.service import archived
from ..control.routes import ControlError
from ..creation.private_preview import private_host
from ..creation.service import ACTIVE, current_actor
from ..creation_registration import service as registrations

PURPOSES = frozenset(("customer_research", "email"))


class ConfigurationOperation(StrEnum):
    FULL_WEBSITE = "full_website"
    PURPOSE_PREPARATION = "purpose_preparation"


def operation_for(purpose):
    return ConfigurationOperation.PURPOSE_PREPARATION if purpose in PURPOSES else ConfigurationOperation.FULL_WEBSITE


def scope_for(creation, purpose, operation):
    if not isinstance(operation, ConfigurationOperation):
        raise ControlError(400, "invalid_request")
    if operation is ConfigurationOperation.FULL_WEBSITE:
        return "full_website"
    if purpose is None:
        raise ControlError(400, "invalid_request")
    if purpose in PURPOSES and creation.canonical_host is None:
        return "private_preparation"
    return "full_website"


def private_guard():
    cfg = settings()
    if (not cfg.control_enabled or cfg.control_mode != "local" or not cfg.customer_enabled
            or not cfg.customer_agents_enabled or cfg.smtp_enabled or cfg.voice_enabled
            or not (cfg.environment == "local" or cfg.environment.startswith("test-"))):
        raise ControlError(403, "private_preparation_unavailable")


async def require(tx, session, creation, registry, *, purpose=None,
        operation=ConfigurationOperation.FULL_WEBSITE):
    selected = scope_for(creation, purpose, operation)
    if selected == "full_website":
        from ..business_discovery.service import require_agent_foundation
        await require_agent_foundation(tx, creation, session=session)
        return selected
    private_guard()
    if (registry.revoked_at or registry.creation_id != creation.id
            or registry.environment_id != settings().environment
            or registry.canonical_host != private_host(creation.id)
            or registry.site_id != registrations.site_id(creation.id)
            or registry.accepted_revision != creation.current_revision
            or creation.status in ACTIVE or creation.active_job_id is not None):
        raise ControlError(409, "private_preparation_not_ready")
    await current_actor(tx, session, creation.portfolio_id)
    if await archived(tx, creation):
        raise ControlError(409, "creation_archived")
    # This is the maintained CURRENT selected S37/native observation, not a
    # historical Registration lookup or a candidate Foundation receipt. It also
    # validates supported private-source continuity without normalizing hashes.
    proof = await registrations.accepted_proof(tx, creation)
    try:
        exact = all(getattr(registry, key) == proof[key] for key in registrations.PROOF_KEYS)
    except (KeyError, TypeError, AttributeError):
        raise ControlError(503, "invalid_registration_source") from None
    if not exact:
        raise ControlError(409, "private_preparation_source_changed")
    private_guard()
    await current_actor(tx, session, creation.portfolio_id)
    if await archived(tx, creation):
        raise ControlError(409, "creation_archived")
    return selected
