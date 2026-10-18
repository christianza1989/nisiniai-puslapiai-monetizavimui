"""Real plan-linked private S37/Registration/owner Config; no model or channel."""
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import plan_roles
from test_private_preview_pg import accepted, path, preview  # noqa: F401
from test_registration_private_continuity_pg import provision, registration_request

from pinet_core.business_discovery import service as discovery
from pinet_core.business_discovery import worker as discovery_worker
from pinet_core.business_discovery.models import BuildApproval
from pinet_core.business_discovery.wire import Start
from pinet_core.config import settings
from pinet_core.control.routes import scope, token_hash
from pinet_core.creation.routes import owned
from pinet_core.creation.service import binding, digest
from pinet_core.customer_agents import service as agents
from pinet_core.customer_text.service import customer_session
from pinet_core.models import new_id


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
    registration = (await p["client"].get(base+"/registration",headers=p["auth"])).json()["data"]
    assert registration["state"] == "current" and not registration["profile_admitted"]
    assert not registration["public_source_admitted"] and registration["full_f1_status"] == "UNVERIFIED"
    after = (await p["client"].get(base+"/foundation",headers=p["auth"])).json()["data"]
    assert not after["agent_foundation_ready"] and after["foundation_status"] == "UNVERIFIED"
