"""Real plan-linked private S37/Registration/owner Config; no model or channel."""
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import plan_roles
from test_private_preview_pg import accepted, path, preview  # noqa: F401
from test_registration_private_continuity_pg import provision, registration_request

from pinet_core.business_discovery import service as discovery
from pinet_core.business_discovery import worker as discovery_worker
from pinet_core.business_discovery.models import BuildApproval
from pinet_core.business_discovery.wire import Start
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Session
from pinet_core.control.routes import scope, token_hash
from pinet_core.creation.routes import owned
from pinet_core.creation.service import binding, digest
from pinet_core.creation_registration import service as registrations
from pinet_core.creation_registration.models import Registration
from pinet_core.customer.models import Account
from pinet_core.customer_agents import service as agents
from pinet_core.customer_agents.models import Agent, Config
from pinet_core.customer_text.service import customer_session
from pinet_core.models import new_id, utcnow


def specification():
    return {"name":"Synthetic internal preparation", "goal":"Prepare evidence-bound internal research drafts",
        "audience":"Synthetic European accommodation businesses", "inputs":["Supplied synthetic prospect evidence"],
        "outputs":["Internal draft for review"], "boundaries":["Do not send, browse or contact anyone"],
        "escalation":"Ask the owner when confirmed facts are missing", "autonomy":"drafts_for_review",
        "sources":["Current accepted private business facts"],
        "examples":[{"input":"Prepare one synthetic prospect", "expected":"A draft with unresolved facts retained"}],
        "unknowns":["Supply agreement and live transport are unconfirmed"]}


@pytest.fixture
async def private_business(preview, monkeypatch):  # noqa: F811
    c = preview
    cfg = settings()
    monkeypatch.setattr(cfg,"customer_agents_enabled",True)
    monkeypatch.setattr(cfg,"business_discovery_enabled",True)
    monkeypatch.setattr(cfg,"business_discovery_runner_enabled",True)
    monkeypatch.setattr(cfg,"site_build_enabled",True)
    monkeypatch.setattr(agents,"source_current",lambda:True)  # Synthetic Git identity seam, not native proof.
    cid,auth,body,_ = await accepted(c)
    token = auth["Authorization"][7:]
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx,token)
        creation = await owned(tx,session,cid)
        row = await discovery.start(tx,session,Start(portfolio_id=creation.portfolio_id,
            message="Padėkite išsiaiškinti naujo verslo idėją.",idempotency_key=uuid4()))
        did = row.id
    assert await discovery_worker.execute_once(discovery_id=did,role_runner=plan_roles)
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx,token)
        creation = await owned(tx,session,cid)
        row = await discovery.owned(tx,session,did,lock=True)
        report = await discovery.latest(tx,row)
        key = str(uuid4())
        tx.add(BuildApproval(id=new_id(),discovery_id=did,report_id=report.id,report_revision=report.revision,
            report_sha256=report.material_hash,creation_id=cid,session_id=session.id,idempotency_key=key,
            fingerprint=digest({"discovery_id":did,"report_revision":report.revision,
                "report_sha256":report.material_hash,"idempotency_key":key}),**binding(creation)))
        row.status,row.linked_creation_id = "build_started",cid
    imported = await c["client"].post(path(cid),headers=auth,json=body)
    assert imported.status_code == 200 and imported.json()["data"]["state"] == "private_draft_imported",imported.text
    request = await registration_request(c,cid,auth)
    registration = await provision(c,request)
    return {**c,"cid":cid,"auth":auth,"token":token,"intake":body,"request":request,"registration":registration}


@pytest.mark.parametrize("purpose",["customer_research","email"])
async def test_private_plan_linked_purpose_can_save_without_claiming_website_delivery(private_business,purpose):
    p = private_business
    base = f"/customer/v2/creations/{p['cid']}"
    foundation = await p["client"].get(base+"/foundation",headers=p["auth"])
    assert foundation.status_code == 200 and not foundation.json()["data"]["agent_foundation_ready"]
    assert foundation.json()["data"]["foundation_status"] == "UNVERIFIED"
    payload = {"request_id":str(uuid4()),"purpose":purpose,"configuration":specification()}
    response = await p["client"].post(base+"/agents",headers=p["auth"],json=payload)
    assert response.status_code == 201,response.text
    value = response.json()["data"]
    assert value["agent"]["purpose"] == purpose and value["agent"]["enabled"] is False
    assert value["configuration"]["revision"] == 1 and value["readiness"]["can_edit_configuration"]
    assert not value["readiness"]["can_calibrate"] and not value["readiness"]["provider_execution"]
    assert value["readiness"]["channel_activation"] == "not_performed"
    replay = await p["client"].post(base+"/agents",headers=p["auth"],json=payload)
    assert replay.status_code == 201 and replay.json()["data"]["action"] == "replayed"
    assert replay.json()["data"]["configuration"] == value["configuration"]
    aid = value["agent"]["agent_id"]
    changed = {**specification(),"name":"Revised synthetic internal preparation"}
    revision = {"request_id":str(uuid4()),"expected_revision":1,"configuration":changed}
    revised = await p["client"].post(base+f"/agents/{aid}/revisions",headers=p["auth"],json=revision)
    assert revised.status_code == 200 and revised.json()["data"]["configuration"]["revision"] == 2,revised.text
    assert revised.json()["data"]["configuration"]["sha256"] != value["configuration"]["sha256"]
    assert (await p["client"].post(base+f"/agents/{aid}/revisions",headers=p["auth"],json=revision)).json()["data"]["action"] == "replayed"
    saved = await p["client"].get(base+f"/agents/{aid}/revisions/1",headers=p["auth"])
    assert saved.status_code == 200 and saved.json()["data"] == value["configuration"]
    capabilities = await p["client"].get(base+"/agents/preparation-readiness",headers=p["auth"])
    assert capabilities.status_code == 200,capabilities.text
    capability = capabilities.json()["data"]
    assert capabilities.json()["contract_version"] == "customer-agent-preparation-readiness.v1"
    assert [row["purpose"] for row in capability["purposes"]] == list(agents.PURPOSES)
    assert {row["purpose"] for row in capability["purposes"] if row["can_create_draft"]} == {"customer_research","email"}
    assert all(row["readiness_scope"] == ("private_preparation" if row["purpose"] in {"customer_research","email"}
        else "full_website") for row in capability["purposes"])
    assert not capability["provider_execution"] and not capability["can_calibrate"] and not capability["can_activate"]
    old_listing = (await p["client"].get(base+"/agents",headers=p["auth"])).json()["data"]
    assert not old_listing["can_create_draft"] and old_listing["configuration_blockers"] == ["website_foundation_not_ready"]
    from pinet_core.acquisition import model_authority
    async with scope(token=token_hash(p["token"])) as tx:
        session = await customer_session(tx,p["token"])
        _,agent,config,_ = await model_authority.saved(tx,session,p["cid"],aid)
        assert agent.purpose == purpose and config.revision == 2  # Still no model authorization/dispatch.
    registration = (await p["client"].get(base+"/registration",headers=p["auth"])).json()["data"]
    assert registration["state"] == "current" and not registration["profile_admitted"]
    assert not registration["public_source_admitted"] and registration["full_f1_status"] == "UNVERIFIED"
    after = (await p["client"].get(base+"/foundation",headers=p["auth"])).json()["data"]
    assert not after["agent_foundation_ready"] and after["foundation_status"] == "UNVERIFIED"


async def counts(p):
    async with AsyncSession(p["admin"]) as tx:
        return tuple([await tx.scalar(select(func.count()).select_from(model)
            .where(model.environment_id == p["environment"])) for model in (Agent,Config)])


@pytest.mark.parametrize("purpose",["site_chat","custom"])
async def test_other_private_purposes_keep_complete_foundation_gate(private_business,purpose):
    p = private_business
    before = await counts(p)
    response = await p["client"].post(f"/customer/v2/creations/{p['cid']}/agents",headers=p["auth"],
        json={"request_id":str(uuid4()),"purpose":purpose,"configuration":specification()})
    assert response.status_code == 409 and response.json()["code"] == "website_foundation_not_ready",response.text
    assert await counts(p) == before


async def test_default_generic_writer_cannot_inherit_private_preparation(private_business):
    from pinet_core.control.routes import ControlError
    p = private_business
    async with scope(token=token_hash(p["token"])) as tx:
        session = await customer_session(tx,p["token"])
        with pytest.raises(ControlError) as failure:
            async with agents.transaction_authority(tx,session,p["cid"],writing=True):
                pytest.fail("Default generic writer must require full Website Foundation")
        assert failure.value.code == "website_foundation_not_ready"
    assert await counts(p) == (0,0)


@pytest.mark.parametrize("failure",["stale-intake","archived","account","session","grant","source","smtp","voice"])
async def test_private_preparation_preserves_current_native_and_owner_fences(private_business,monkeypatch,failure):
    p = private_business
    if failure == "stale-intake":
        monkeypatch.setattr(settings(),"control_source_revision","b"*40)
    elif failure == "archived":
        archived = await p["client"].post(f"/customer/v2/creations/{p['cid']}/archive",headers=p["auth"],
            json={"idempotency_key":str(uuid4())})
        assert archived.status_code == 200,archived.text
    elif failure in {"account","session","grant"}:
        async with AsyncSession(p["admin"]) as tx,tx.begin():
            session = await tx.get(Session,p["request"]["authorizing_session_id"])
            if failure == "account":
                await tx.execute(update(Account).where(Account.user_id == session.user_id,
                    Account.environment_id == p["environment"]).values(verified_at=None))
            elif failure == "session":
                session.expires_at = utcnow()-timedelta(seconds=1)
            else:
                await tx.execute(update(BusinessGrant).where(BusinessGrant.business_id == p["registration"]["business_id"],
                    BusinessGrant.environment_id == p["environment"]).values(enabled=False))
    elif failure == "source":
        monkeypatch.setattr(agents,"source_current",lambda:False)
    else:
        monkeypatch.setattr(settings(),failure+"_enabled",True)
    before = await counts(p)
    response = await p["client"].post(f"/customer/v2/creations/{p['cid']}/agents",headers=p["auth"],
        json={"request_id":str(uuid4()),"purpose":"email","configuration":specification()})
    assert response.status_code in {401,403,404,409,503},response.text
    assert await counts(p) == before


async def test_final_source_wait_rechecks_private_native_proof_and_rolls_back_draft(private_business,monkeypatch):
    p,state = private_business,{"written":False,"changed":False}
    append = agents.append_config
    async def saved(*args,**kwargs):
        result = await append(*args,**kwargs)
        state["written"] = True
        return result
    def current():
        if state["written"] and not state["changed"]:
            monkeypatch.setattr(settings(),"control_source_revision","b"*40)
            state["changed"] = True
        return True
    monkeypatch.setattr(agents,"append_config",saved)
    monkeypatch.setattr(agents,"source_current",current)
    response = await p["client"].post(f"/customer/v2/creations/{p['cid']}/agents",headers=p["auth"],
        json={"request_id":str(uuid4()),"purpose":"customer_research","configuration":specification()})
    assert state == {"written":True,"changed":True}
    assert response.status_code == 409 and response.json()["code"] == "private_intake_missing",response.text
    assert await counts(p) == (0,0)


@pytest.mark.parametrize("failure",["grant","source","registration"])
async def test_final_native_proof_wait_cannot_outlive_grant_source_or_registration(private_business,monkeypatch,failure):
    p,calls = private_business,[]
    original = registrations.accepted_proof
    async def late(tx,creation):
        result = await original(tx,creation)
        calls.append(True)
        if len(calls) == 3:  # The post-effect final proof, after the final Git observation.
            if failure == "source":
                monkeypatch.setattr(agents,"source_current",lambda:False)
            else:
                async with AsyncSession(p["admin"]) as other,other.begin():
                    if failure == "grant":
                        await other.execute(update(BusinessGrant).where(
                            BusinessGrant.business_id == p["registration"]["business_id"],
                            BusinessGrant.environment_id == p["environment"]).values(enabled=False))
                    else:
                        await other.execute(update(Registration).where(
                            Registration.id == p["registration"]["registration_id"]).values(revoked_at=utcnow()))
        return result
    monkeypatch.setattr(registrations,"accepted_proof",late)
    response = await p["client"].post(f"/customer/v2/creations/{p['cid']}/agents",headers=p["auth"],
        json={"request_id":str(uuid4()),"purpose":"email","configuration":specification()})
    assert len(calls) == 3
    assert response.status_code in {401,403,404,409,503},response.text
    assert await counts(p) == (0,0)
