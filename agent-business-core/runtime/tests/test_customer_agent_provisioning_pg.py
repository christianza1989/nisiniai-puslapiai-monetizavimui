"""Restricted isolated PostgreSQL: native session pin, replay and transaction rollback."""
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_agents import (  # noqa: F401 - maintained native fixture chain
    creation,
    customers,
    draft,
    profile,
    registration,
    text_customer,
)

from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.control_api import app
from pinet_core.creation.models import Creation, Job
from pinet_core.creation.models import Revision as CreationRevision
from pinet_core.creation.service import binding, digest
from pinet_core.creation_registration.models import Registration
from pinet_core.creation_registration.service import stored_material
from pinet_core.customer_agents import provisioning, service
from pinet_core.customer_agents.models import Agent, Config
from pinet_core.customer_agents.wire import Create, Revise
from pinet_core.customer_profile import service as profiles
from pinet_core.models import utcnow


@pytest.fixture
async def provisioned(text_customer, monkeypatch):  # noqa: F811 - imported maintained fixture
    monkeypatch.setattr(settings(), "customer_agents_enabled", True)
    monkeypatch.setattr(service, "source_current", lambda: True)
    c = text_customer
    async with AsyncSession(c["admin"]) as tx:
        creation = await tx.get(Creation, c["request"]["creation_id"])
        registry = await profiles.registry_row(tx, creation.id)
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(c["token"])))
        native = {"user": creation.user_id, "session": session.id, "creation": creation.id,
            "business": registry.business_id, "grant": registry.grant_id}
    async with scope(user=native["user"]) as tx:
        session = await tx.get(Session, native["session"])
        pin = await provisioning.capture(tx, session, native["creation"], business_id=native["business"],
            grant_id=native["grant"], source_revision=settings().control_source_revision)
    try:
        yield c, pin
    finally:
        # Only this random fixture environment; retain original preview and other QA data.
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(Agent.__table__.delete().where(Agent.environment_id == c["environment"]))


def create_value(key=None):
    return Create(request_id=key or uuid4(), purpose="custom", configuration=draft())


async def counts(c):
    async with AsyncSession(c["admin"]) as tx:
        return tuple([await tx.scalar(select(func.count()).select_from(model).where(
            model.environment_id == c["environment"])) for model in (Agent, Config)])


async def invoke(pin, value, agent_id=None):
    async with scope(user=str(pin.user_id)) as tx:
        if agent_id is None:
            return await provisioning.create(tx, pin, value)
        return await provisioning.revise(tx, pin, agent_id, value)


async def test_internal_create_public_replay_and_immutable_revise_share_one_namespace(provisioned):
    c, pin = provisioned
    value = create_value()
    created = await invoke(pin, value)
    assert created["action"] == "created" and created["readiness"]["module_admission"] == "not_admitted"
    assert not created["readiness"]["can_activate"] and not created["readiness"]["provider_execution"]
    assert "bearer" not in pin.model_dump_json() and c["token"] not in pin.model_dump_json()
    repeated = await invoke(pin, value)
    assert repeated["action"] == "replayed" and repeated["configuration"] == created["configuration"]
    path = "/customer/v2/creations/"+str(pin.creation_id)+"/agents"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        public = await client.post(path, headers=c["auth"], json=value.model_dump(mode="json"))
    assert public.status_code == 201 and public.json()["data"]["action"] == "replayed"
    assert public.json()["data"]["configuration"]["revision_id"] == created["configuration"]["revision_id"]
    changed = value.model_copy(update={"purpose": "email"})
    with pytest.raises(ControlError) as error:
        await invoke(pin, changed)
    assert error.value.code == "idempotency_conflict"
    agent_id = created["agent"]["agent_id"]
    revised = Revise(request_id=uuid4(), expected_revision=1, configuration=draft() | {"name": "Revised synthetic draft"})
    result = await invoke(pin, revised, agent_id)
    assert result["configuration"]["revision"] == 2
    assert (await invoke(pin, revised, agent_id))["configuration"] == result["configuration"]
    with pytest.raises(ControlError) as error:
        await invoke(pin, revised.model_copy(update={"request_id": uuid4()}), agent_id)
    assert error.value.code == "agent_revision_conflict" and await counts(c) == (1, 2)
    async with AsyncSession(c["admin"]) as tx:
        configs = list(await tx.scalars(select(Config).where(Config.agent_id == agent_id)))
        assert {row.authorizing_session_id for row in configs} == {str(pin.session_id)}


@pytest.mark.parametrize("field", ["session_id", "organization_id", "portfolio_id", "registration_id", "business_id", "grant_id"])
async def test_foreign_native_pin_cannot_create_or_rebind(provisioned, field):
    c, pin = provisioned
    wrong = pin.model_copy(update={field: uuid4()})
    with pytest.raises(ControlError):
        await invoke(wrong, create_value())
    assert await counts(c) == (0, 0)


async def test_guard_and_execution_source_pin_reject_without_write(provisioned, monkeypatch):
    c, pin = provisioned
    monkeypatch.setattr(settings(), "customer_agents_enabled", False)
    with pytest.raises(ControlError) as error:
        await invoke(pin, create_value())
    assert error.value.code == "customer_agents_unavailable"
    monkeypatch.setattr(settings(), "customer_agents_enabled", True)
    monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
    with pytest.raises(ControlError) as error:
        await invoke(pin, create_value())
    assert error.value.code == "source_unavailable" and await counts(c) == (0, 0)


async def test_nonlocking_verify_rechecks_disabled_actor_without_holding_native_row_locks(provisioned):
    c, pin = provisioned
    async with scope(user=str(pin.user_id)) as tx:
        await provisioning.verify(tx, pin)  # Does not acquire lifetime/User/Session/Creation row locks.
        async with AsyncSession(c["admin"]) as admin, admin.begin():
            await admin.execute(text("SET LOCAL lock_timeout='500ms'"))
            await admin.execute(update(User).where(User.id == str(pin.user_id)).values(enabled=False))
        with pytest.raises(ControlError):
            await provisioning.verify(tx, pin)
    assert await counts(c) == (0, 0)


@pytest.mark.parametrize("kind", ["grant", "membership"])
async def test_late_authority_loss_rolls_back_both_records(provisioned, monkeypatch, kind):
    c, pin = provisioned
    original = service.append_config
    async def revoke(tx, agent, value, fingerprint, session):
        result = await original(tx, agent, value, fingerprint, session)
        async with AsyncSession(c["admin"]) as admin, admin.begin():
            if kind == "grant":
                await admin.execute(update(BusinessGrant).where(BusinessGrant.id == str(pin.grant_id)).values(enabled=False))
            else:
                await admin.execute(update(Membership).where(Membership.user_id == str(pin.user_id),
                    Membership.environment_id == c["environment"]).values(enabled=False))
        return result
    monkeypatch.setattr(service, "append_config", revoke)
    with pytest.raises(ControlError):
        await invoke(pin, create_value())
    assert await counts(c) == (0, 0)


async def test_source_changes_during_final_wait_roll_back_effects(provisioned, monkeypatch):
    c, pin = provisioned
    original = service.append_config
    async def changed(tx, agent, value, fingerprint, session):
        result = await original(tx, agent, value, fingerprint, session)
        monkeypatch.setattr(settings(), "control_source_revision", "b"*40)
        return result
    monkeypatch.setattr(service, "append_config", changed)
    with pytest.raises(ControlError) as error:
        await invoke(pin, create_value())
    assert error.value.code == "source_unavailable" and await counts(c) == (0, 0)


async def test_outer_task_rollback_does_not_leave_a_created_agent(provisioned):
    c, pin = provisioned
    with pytest.raises(RuntimeError, match="synthetic outer Task fence"):
        async with scope(user=str(pin.user_id)) as tx:
            await provisioning.create(tx, pin, create_value())
            raise RuntimeError("synthetic outer Task fence")
    assert await counts(c) == (0, 0)


async def test_cached_creation_cannot_bypass_current_revision_check(provisioned):
    c, pin = provisioned
    async with scope(user=str(pin.user_id)) as tx:
        cached = await tx.get(Creation, str(pin.creation_id))
        async with AsyncSession(c["admin"]) as admin, admin.begin():
            await admin.execute(update(Creation).where(Creation.id == cached.id).values(current_revision=cached.current_revision+1))
        with pytest.raises(ControlError) as error:
            await provisioning.create(tx, pin, create_value())
        assert error.value.code == "agent_business_not_current"
    assert await counts(c) == (0, 0)


async def test_expired_authorizing_session_cannot_be_replaced(provisioned):
    c, pin = provisioned
    async with AsyncSession(c["admin"]) as admin, admin.begin():
        await admin.execute(update(Session).where(Session.id == str(pin.session_id)).values(expires_at=utcnow()-timedelta(seconds=1)))
    with pytest.raises(ControlError) as error:
        await invoke(pin, create_value())
    assert error.value.code == "unauthenticated" and await counts(c) == (0, 0)


async def test_historical_public_replay_cannot_rebind_internal_pin_to_a_new_registration(provisioned):
    c, pin = provisioned
    value = create_value()
    original = await invoke(pin, value)
    # New retained native identity, using only this fixture's synthetic records.
    # No immutable row or original acceptance receipt is rewritten.
    async with AsyncSession(c["admin"]) as admin, admin.begin():
        creation = await admin.get(Creation, str(pin.creation_id))
        prior = await admin.get(Registration, str(pin.registration_id))
        old_revision = await admin.get(CreationRevision, prior.revision_id)
        old_job = await admin.get(Job, old_revision.job_id)
        job = Job(id=str(uuid4()), creation_id=creation.id, session_id=str(pin.session_id),
            sequence=creation.job_sequence+1, base_revision=creation.current_revision,
            message="Synthetic successor", idempotency_key=str(uuid4()), fingerprint="a"*64,
            status="succeeded", source_revision=old_job.source_revision, **binding(creation))
        admin.add(job)
        await admin.flush()
        revision = CreationRevision(id=str(uuid4()), creation_id=creation.id, job_id=job.id,
            sequence=old_revision.sequence+1, payload=old_revision.payload, material_hash=old_revision.material_hash,
            source_revision=old_revision.source_revision, **binding(creation))
        admin.add(revision)
        await admin.flush()
        material = {column.name: getattr(prior, column.name) for column in Registration.__table__.columns
            if column.name not in {"id", "created_at", "revision_id", "accepted_revision", "fingerprint", "revoked_at"}}
        successor = Registration(id=str(uuid4()), revision_id=revision.id, accepted_revision=revision.sequence, **material)
        successor.fingerprint = digest(stored_material(successor))
        admin.add(successor)
        creation.current_revision, creation.job_sequence = revision.sequence, job.sequence
    async with scope(user=str(pin.user_id)) as tx:
        session = await tx.get(Session, str(pin.session_id))
        newer = await provisioning.capture(tx, session, str(pin.creation_id), business_id=str(pin.business_id),
            grant_id=str(pin.grant_id), source_revision=pin.source_revision)
    assert newer.registration_id != pin.registration_id
    with pytest.raises(ControlError) as error:
        await invoke(newer, value)
    assert error.value.code == "idempotency_conflict" and await counts(c) == (1, 1)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:8855") as client:
        public = await client.post("/customer/v2/creations/"+str(pin.creation_id)+"/agents", headers=c["auth"],
            json=value.model_dump(mode="json"))
    assert public.status_code == 201 and public.json()["data"]["action"] == "replayed"
    assert public.json()["data"]["agent"]["agent_id"] == original["agent"]["agent_id"]
