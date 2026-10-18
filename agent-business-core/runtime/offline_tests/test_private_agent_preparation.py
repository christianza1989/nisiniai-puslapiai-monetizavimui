"""Bounded operation selection and current-proof projection; no DB/provider."""
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.business_discovery import service as discovery
from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation.models import Creation
from pinet_core.creation.private_preview import private_host
from pinet_core.creation_registration import service as registrations
from pinet_core.customer_agents import preparation_readiness as prep
from pinet_core.customer_agents import service


@pytest.fixture
def pilot(monkeypatch):
    cfg = settings()
    for key,value in {"environment":"test-private-operation","control_enabled":True,"control_mode":"local",
            "customer_enabled":True,"customer_agents_enabled":True,"smtp_enabled":False,"voice_enabled":False}.items():
        monkeypatch.setattr(cfg,key,value)
    cid = str(uuid4())
    creation = SimpleNamespace(id=cid,canonical_host=None,current_revision=1,status="private_draft",
        active_job_id=None,portfolio_id=str(uuid4()))
    proof = {key:"a"*64 for key in registrations.PROOF_KEYS}
    proof.update(revision_id=str(uuid4()),accepted_revision=1,accepted_source_revision="a"*40,
        site_id=registrations.site_id(cid),canonical_host=private_host(cid),coordinator_event_id=str(uuid4()))
    registry = SimpleNamespace(**proof,id=str(uuid4()),creation_id=cid,environment_id=cfg.environment,revoked_at=None)
    creation.user_id = str(uuid4())
    session = SimpleNamespace(id=str(uuid4()),user_id=creation.user_id)
    state = {"archived":False,"error":None,"proof_reads":0,"actors":0,"after_proof":None,"full_reads":0}
    async def actor(*args,**kwargs):state["actors"] += 1
    async def archived(*args):return state["archived"]
    async def current(*args):
        state["proof_reads"] += 1
        if state["error"]:
            raise state["error"]
        if state["after_proof"]:
            state["after_proof"]()
        return dict(proof)
    async def full(*args,**kwargs):
        state["full_reads"] += 1
        raise ControlError(409,"website_foundation_not_ready")
    monkeypatch.setattr(prep,"current_actor",actor)
    monkeypatch.setattr(prep,"archived",archived)
    monkeypatch.setattr(registrations,"accepted_proof",current)
    monkeypatch.setattr(discovery,"require_agent_foundation",full)
    return SimpleNamespace(creation=creation,registry=registry,session=session,proof=proof,state=state,tx=object())


@pytest.mark.parametrize("purpose",["customer_research","email"])
async def test_private_branch_validates_current_proof_without_website_or_channel_admission(pilot,purpose):
    p = pilot
    assert await prep.require(p.tx,p.session,p.creation,p.registry,purpose=purpose,
        operation=prep.operation_for(purpose)) == "private_preparation"
    assert p.state["proof_reads"] == 1 and p.state["actors"] == 2 and p.state["full_reads"] == 0


@pytest.mark.parametrize("purpose",["site_chat","custom","customer_research","email"])
async def test_default_generic_authority_always_retains_full_website(pilot,purpose):
    with pytest.raises(ControlError) as failure:
        await prep.require(pilot.tx,pilot.session,pilot.creation,pilot.registry,purpose=purpose)
    assert failure.value.code == "website_foundation_not_ready"
    assert pilot.state["full_reads"] == 1 and pilot.state["proof_reads"] == 0


@pytest.mark.parametrize("key",registrations.PROOF_KEYS)
async def test_no_accepted_registration_proof_field_may_be_omitted_or_changed(pilot,key):
    p = pilot
    p.proof[key] = 2 if key == "accepted_revision" else "different"
    with pytest.raises(ControlError) as failure:
        await prep.require(p.tx,p.session,p.creation,p.registry,purpose="email",operation=prep.operation_for("email"))
    assert failure.value.code == "private_preparation_source_changed"


@pytest.mark.parametrize("public",["ordinary.example", "explicit-reserved"])
async def test_assigned_public_host_never_selects_private_readiness(pilot,public):
    p = pilot
    p.creation.canonical_host = private_host(p.creation.id) if public == "explicit-reserved" else public
    with pytest.raises(ControlError) as failure:
        await prep.require(p.tx,p.session,p.creation,p.registry,purpose="email",operation=prep.operation_for("email"))
    assert failure.value.code == "website_foundation_not_ready" and p.state["proof_reads"] == 0


async def test_raw_mode_and_missing_purpose_are_not_permissions(pilot):
    p = pilot
    for operation,purpose in (("purpose_preparation","email"),(prep.ConfigurationOperation.PURPOSE_PREPARATION,None)):
        with pytest.raises(ControlError) as failure:
            await prep.require(p.tx,p.session,p.creation,p.registry,purpose=purpose,operation=operation)
        assert failure.value.status == 400
    assert p.state["proof_reads"] == 0


async def test_archiving_during_proof_is_observed_again(pilot):
    p = pilot
    p.state["after_proof"] = lambda:p.state.update(archived=True)
    with pytest.raises(ControlError) as failure:
        await prep.require(p.tx,p.session,p.creation,p.registry,purpose="email",operation=prep.operation_for("email"))
    assert failure.value.code == "creation_archived"


@pytest.mark.parametrize("status",[401,403,404])
async def test_private_auth_denial_cannot_be_downgraded_to_draft_capability(pilot,monkeypatch,status):
    p = pilot
    p.state["error"] = ControlError(status,"unauthenticated")
    async def current(*args):return True
    monkeypatch.setattr(service,"configuration_current",current)
    with pytest.raises(ControlError) as failure:
        await service.configuration_blocker(p.tx,p.session,p.creation,p.registry,
            purpose="email",operation=prep.operation_for("email"))
    assert failure.value.status == status


async def test_new_projection_exposes_two_private_purposes_while_old_listing_stays_full(pilot,monkeypatch):
    p = pilot
    class Transaction:
        async def scalars(self,*args):return []
        async def get(self,model,*args):return p.creation if model is Creation else p.registry
    tx = Transaction()
    @asynccontextmanager
    async def authority(*args,**kwargs):yield tx,p.session,p.creation,p.registry,None
    async def current(*args):return True
    monkeypatch.setattr(service,"authority",authority)
    monkeypatch.setattr(service,"configuration_current",current)
    result = await service.preparation_readiness("synthetic",p.creation.id)
    assert {row["purpose"] for row in result["purposes"] if row["can_create_draft"]} == {"customer_research","email"}
    assert not result["provider_execution"] and not result["can_calibrate"] and not result["can_activate"]
    assert result["channel_activation"] == "not_performed"
    old = await service.listing("synthetic",p.creation.id)
    assert not old["can_create_draft"] and old["configuration_blockers"] == ["website_foundation_not_ready"]
