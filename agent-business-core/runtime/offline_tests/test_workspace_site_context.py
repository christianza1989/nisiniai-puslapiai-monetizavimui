"""Current-owner observations, honest omissions and same-snapshot role propagation."""
from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.control.routes import ControlError
from pinet_core.workspace_team import adapter, site_context
from pinet_core.workspace_team.handler import TeamHandler


def observation(count=9):
    identity = {"creation_id": str(uuid4()), "accepted_revision": 1,
        "accepted_source_revision": "a"*40, "candidate_sha256": "b"*64,
        "site_id": "creation-"+"c"*32, "canonical_host": "synthetic.example.test"}
    value = {**identity, "state": "current", "revision_pending": False,
        "observed_at": "2026-10-15T05:00:00Z", "site_context_sha256": "d"*64,
        "language_review_mode": "required", "permitted_actions": ["refresh"], "pages": []}
    for i in range(count):
        value["pages"].append({"page_id": "page-"+f"{i:024x}", "path": f"/page-{i}/", "type": "guide",
            "title": f"Sintetinis gidas {i}", "revision_sha256": "e"*64, "planning_sha256": "f"*64,
            "state": "blocked", "blockers": ["Nepatvirtinti faktai.", "Nėra redakcinės peržiūros."],
            "fact_notes": ["Tikras vykdytojas dar nepatvirtintas."], "sources": [],
            "media_count": 5, "media_files_present": True, "review_current": False,
            "reviewed_at": None, "reviewer": None, "has_approved_revision": False,
            "approved_revision_sha256": None, "internal_planned": 2, "internal_attached": 2})
    return identity, value


def test_nine_actual_pages_stay_distinct_from_approval_and_business_facts():
    identity, value = observation()
    result = site_context.bounded(value, identity)
    assert result["page_count"] == len(result["pages"]) == 9
    assert result["site_context_sha256"] == value["site_context_sha256"]
    assert result["full_f1_status"] == result["launch_status"] == "UNVERIFIED"
    assert result["execution_authority"] == "none" and not result["page_bodies_read"]
    assert all(not page["review_current"] and page["media_files_present"] for page in result["pages"])


@pytest.mark.parametrize("key", ["creation_id", "accepted_revision", "candidate_sha256",
    "accepted_source_revision", "site_id", "canonical_host"])
def test_registration_proof_mismatch_is_never_current(key):
    identity, value = observation()
    identity[key] = str(uuid4()) if key == "creation_id" else 2 if key == "accepted_revision" else "foreign"
    with pytest.raises(ControlError) as failed:
        site_context.bounded(value, identity)
    assert failed.value.code == "invalid_content_completion_source"


def test_deterministic_bounded_prefix_preserves_omissions_and_pending_revision():
    identity, value = observation(20)
    value["revision_pending"] = True
    for page in value["pages"]:
        page["title"] = "ą"*200
        page["blockers"] = ["ė"*300]*7
        page["fact_notes"] = ["ū"*400]*4
    result = site_context.bounded(value, identity)
    assert result == site_context.bounded(value | {"pages": list(reversed(value["pages"]))}, identity)
    assert result["page_count"] == 20 and result["revision_pending"] is True
    assert result["omitted_page_count"] == 20-len(result["pages"])
    if result["pages"]:
        assert result["pages"][0]["omitted_blocker_count"] == 2
        assert result["pages"][0]["omitted_fact_note_count"] == 2
        assert result["pages"][0]["fact_note_text_truncated"] is True


def test_unavailable_is_unknown_not_an_empty_website():
    result = site_context.unavailable("workflow_unavailable", 1)
    assert result["pages"] is result["page_count"] is None
    assert result["linked_creation_count"] == 1 and result["execution_authority"] == "none"


async def prepared(monkeypatch, *, association="latest_saved", count=1, archived=False):
    identity, value = observation()
    creation = SimpleNamespace(id=identity["creation_id"], current_revision=1)
    graph = SimpleNamespace(creations=[creation]*count, snapshot="original",
        associations={("creation", creation.id): association}, binding={})
    row = SimpleNamespace(portfolio_id=str(uuid4()), business_id=str(uuid4()))
    calls = []
    async def resolve(*args):
        return graph
    async def registration(*args):
        return identity | {"archived": archived, "id": "registration", "fingerprint": "0"*64}
    async def projection(*args):
        calls.append(args)
        return value
    monkeypatch.setattr(site_context, "resolve", resolve)
    monkeypatch.setattr(site_context, "registration_identity", registration)
    monkeypatch.setattr(site_context.completion, "projection", projection)
    return graph, row, calls, identity, value


@pytest.mark.parametrize("count,association,archived,reason", [(0,"latest_saved",False,"no_linked_creation"),
    (2,"latest_saved",False,"ambiguous_linked_creations"), (1,"stale_saved",False,"registration_not_current"),
    (1,"revoked",False,"registration_not_current"), (1,"latest_saved",True,"creation_archived")])
async def test_ineligible_relationship_never_reads_page_data(monkeypatch,count,association,archived,reason):
    _, row, calls, _, _ = await prepared(monkeypatch, count=count, association=association, archived=archived)
    result = await site_context.context(None, None, row)
    assert result["reason"] == reason and calls == [] and result["pages"] is None


@pytest.mark.parametrize("status", [401,403,404])
async def test_authority_errors_are_not_masked_as_missing_content(monkeypatch,status):
    _, row, _, _, _ = await prepared(monkeypatch)
    async def denied(*args):
        raise ControlError(status,"authorization_revoked")
    monkeypatch.setattr(site_context.completion,"projection",denied)
    with pytest.raises(ControlError) as failed:
        await site_context.context(None,None,row)
    assert failed.value.status == status


@pytest.mark.parametrize("fallback", [False,True])
async def test_changed_graph_is_rejected_after_success_or_unavailable_await(monkeypatch,fallback):
    graph,row,_,_,value=await prepared(monkeypatch)
    reads=[]
    async def resolve(*args):
        reads.append(1)
        return graph if len(reads)==1 else SimpleNamespace(snapshot="changed",binding={})
    async def projection(*args):
        if fallback:
            raise ControlError(503,"content_completion_unavailable")
        return value
    monkeypatch.setattr(site_context,"resolve",resolve)
    monkeypatch.setattr(site_context.completion,"projection",projection)
    with pytest.raises(ControlError) as failed:
        await site_context.context(None,None,row)
    assert failed.value.code == "team_website_context_changed" and len(reads)==2


async def test_all_three_roles_receive_the_same_frozen_observation(monkeypatch):
    import pinet_core.workspace_team.handler as handler
    identity,value=observation()
    snapshot=site_context.bounded(value,identity)
    context={"_task_id":"task","_user_id":"owner","_team_context_sha256":"hash",
        "business":{},"message":"Aptarkite svetainės kliūtis.","reply":None,"roster":[],
        "website_workflow":snapshot}
    received=[]
    async def reserve(*args):
        return {"id":str(len(received))}
    async def settle(*args):
        return None
    async def publish(*args,**kwargs):
        return str(uuid4())
    async def heartbeat():
        return True
    async def runner(phase,packet,alive):
        assert await alive()
        received.append((phase,deepcopy(packet["website_workflow"])))
        answer={"answer":"Duomenys yra, bet peržiūra dar nepatvirtinta.","limitations":["Tik metaduomenys."]}
        return answer | ({"decision":"delegate","assignment":"Įvertinkite šias kliūtis."} if phase=="plan" else {}),{"input_tokens":1}
    monkeypatch.setattr(handler,"reserve",reserve)
    monkeypatch.setattr(handler,"settle",settle)
    monkeypatch.setattr(handler,"publish",publish)
    _,usage=await TeamHandler().run(context,heartbeat,runner)
    assert [phase for phase,_ in received]==["plan","adviser","synthesis"]
    assert all(observed==snapshot for _,observed in received) and usage=={"input_tokens":3}
    assert "Page bodies, sources and pixels were not read" in adapter.prompt_for("adviser",{"website_workflow":snapshot})
