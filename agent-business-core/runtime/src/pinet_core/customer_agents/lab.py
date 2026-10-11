"""Exact saved task versions in explicit local test conversations, never admission."""
from uuid import UUID, uuid5

from fastapi.encoders import jsonable_encoder
from pydantic import Field
from sqlalchemy import select

from ..config import settings
from ..control.routes import ControlError
from ..creation.service import binding, digest
from ..customer_profile import service as profiles
from ..customer_profile.models import REGISTRATION_KEYS, Admission
from ..customer_text import adapter
from ..customer_text import service as chat
from ..customer_text.wire import Start, Turn
from . import service as agents
from .models import Agent
from .protection import Reference
from .wire import Digest, Revision, Source, Specification, Strict


class Snapshot(Strict):
    agent_id: UUID
    creation_id: UUID
    registration_id: UUID
    registration_fingerprint: Digest
    admission_id: UUID
    admission_fingerprint: Digest
    user_id: UUID
    session_id: UUID
    environment_id: str = Field(min_length=1, max_length=100)
    execution_source_revision: Source
    config_revision_id: UUID
    config_revision: Revision
    config_sha256: Digest
    specification: Specification


class Episode(Snapshot):
    episode_id: UUID
    script_sha256: Digest


class Request(Strict):
    bearer: str = Field(pattern=r"^[A-Za-z0-9_-]{64}$")
    creation_id: UUID
    agent_id: UUID
    expected_revision: Revision
    request_id: UUID
    messages: list[str] = Field(min_length=1, max_length=8)
    protected_case: Reference | None = None


def guard():
    agents.guard()
    chat.guard()
    if not adapter.runner_ready():
        raise ControlError(503, "runner_unavailable")


async def snapshot(token, creation_id, agent_id, expected_revision):
    guard()
    if type(expected_revision) is not int or not 1 <= expected_revision <= 2147483647:
        raise ControlError(400, "invalid_request")
    async with agents.authority(token, creation_id, agent_id, writing=True) as (tx, session, creation, registry, agent):
        if agent.purpose != "site_chat" or agent.current_revision != expected_revision:
            raise ControlError(409, "conversation_task_not_current")
        config = await agents.current_config(tx, agent)
        view = agents.config_view(agent, config)
        profile = await profiles.projection(tx, session, creation, registration_identity=(registry.id, registry.fingerprint))
        if not profile["profile_current"]:
            raise ControlError(409, "customer_profile_not_current")
        admission = await tx.get(Admission, profile["admission"]["admission_id"])
        frozen = Snapshot(agent_id=agent.id, creation_id=creation.id, registration_id=registry.id,
            registration_fingerprint=registry.fingerprint, admission_id=admission.id,
            admission_fingerprint=admission.fingerprint, user_id=session.user_id, session_id=session.id,
            environment_id=settings().environment, execution_source_revision=settings().control_source_revision,
            config_revision_id=config.id, config_revision=config.revision,
            config_sha256=view["sha256"], specification=view["specification"])
        # No source/authority wait may be hidden after the observed Profile.
        await agents.check_binding(tx, session, creation, registry, writing=True)
        final = await profiles.projection(tx, session, creation, registration_identity=(registry.id, registry.fingerprint))
        if not final["profile_current"] or final["admission"] != profile["admission"]:
            raise ControlError(409, "customer_profile_not_current")
        return frozen.model_dump(mode="json")


async def observe(tx, session, creation, identity, frozen):
    """Before policy/index locks; canonical creation lock already serializes edits."""
    guard()
    value = Episode.model_validate(frozen)
    if (str(value.creation_id) != creation.id or str(value.user_id) != session.user_id
            or str(value.session_id) != session.id or value.environment_id != settings().environment
            or value.execution_source_revision != settings().control_source_revision
            or (str(value.registration_id), value.registration_fingerprint) != identity):
        raise ControlError(409, "conversation_task_not_current")
    if not await agents.schema_ready(tx):
        raise ControlError(503, "customer_agents_schema_unavailable")
    agent = await tx.scalar(select(Agent).where(Agent.id == str(value.agent_id))
        .with_for_update(read=True).execution_options(populate_existing=True))
    if (not agent or binding(agent) != binding(creation) or agent.creation_id != creation.id
            or agent.registration_id != str(value.registration_id)
            or agent.registration_fingerprint != value.registration_fingerprint
            or agent.purpose != "site_chat" or agent.current_revision != value.config_revision):
        raise ControlError(409, "conversation_task_not_current")
    registry = await profiles.registry_row(tx, creation.id)
    if (not registry or registry.id != agent.registration_id
            or any(getattr(agent, k) != getattr(registry, k) for k in REGISTRATION_KEYS)
            or not await agents.configuration_current(tx, creation, registry)):
        raise ControlError(409, "conversation_task_not_current")
    config = await agents.current_config(tx, agent)
    view = agents.config_view(agent, config)
    if (config.id != str(value.config_revision_id) or view["sha256"] != value.config_sha256
            or view["specification"] != value.specification.model_dump(mode="json")):
        raise ControlError(409, "conversation_task_not_current")
    return value.model_dump(mode="json")


def profile_matches(calibration, admission):
    if (calibration and (calibration["admission_id"] != admission.id
            or calibration["admission_fingerprint"] != admission.fingerprint)):
        raise ControlError(409, "conversation_task_not_current")


async def episode(token, frozen, messages, request_id, *, protected_case=None):
    """One explicit synthetic script; durable dispatch reconciles exact replies."""
    messages = [Turn(request_id=UUID(int=1), base_need_revision=0, message=m).message for m in messages]
    if not 1 <= len(messages) <= 8:
        raise ControlError(400, "invalid_episode")
    request_id = UUID(str(request_id))
    value = Episode(**Snapshot.model_validate(frozen).model_dump(), episode_id=request_id,
                    script_sha256=digest(messages)).model_dump(mode="json")
    from . import protection
    proof = protection.freeze(protected_case, frozen, messages) if protected_case is not None else None
    created = await chat.start(token, value["creation_id"], Start(request_id=request_id,
        admission_id=value["admission_id"], notice_version="customer-text.local.v1", consent=True),
        calibration=value, protection=proof)
    turns, current = [], created
    for number, message in enumerate(messages):
        key = str(uuid5(request_id, "step:" + str(number)))
        prior = next((e["data"] for e in current["events"] if e["kind"] == "provider_attempt"
                      and e["data"].get("request_id") == key), None)
        revision = prior["need_revision"] if prior else current["need_revision"]
        current = await chat.turn(token, value["creation_id"], created["conversation_id"],
            Turn(request_id=key, base_need_revision=revision, message=message), calibration=value)
        turns.append(current["turn"])
        if current["turn"]["status"] != "succeeded":
            break
    return jsonable_encoder({"scope": "operator_local_task_calibration", "snapshot": value,
        "snapshot_sha256": digest(value), "conversation": current, "turns": turns,
        "script_complete": len(turns) == len(messages) and all(t["status"] == "succeeded" for t in turns),
        "calibration_status": "UNVERIFIED", "module_admission": "not_admitted", "activation": "not_performed"})
