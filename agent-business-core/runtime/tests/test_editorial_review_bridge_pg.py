"""Opt-in dedicated EMPTY QA: actual HTTP/RLS/Node; synthetic content only.

The helper collects only. Root supplies/migrates the QA database and runs these.
Original native intake/request receipts and all synthetic case files are retained.
"""
import copy
import json
import os
from types import SimpleNamespace
from uuid import uuid4

import pytest
from test_customer_public import verified
from test_private_native_continuity_pg import prepared
from test_private_preview_pg import preview  # noqa: F401

from pinet_core.config import settings
from pinet_core.control.routes import scope, token_hash
from pinet_core.creation import editorial_review, studio
from pinet_core.customer_text.service import customer_session
from pinet_core.tasks.codex_transport import RunnerError

pytestmark = pytest.mark.skipif(os.environ.get("PINET_PRIVATE_PREVIEW_QA") != "1",
    reason="Requires explicitly supplied EMPTY dedicated PostgreSQL QA and retained synthetic history")

SETUP = """import {readFile} from 'node:fs/promises';
const chunks=[];for await(const c of process.stdin)chunks.push(c);
const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
process.env.STUDIO_DATA_DIR=input.dataDir;process.env.STUDIO_OUTPUT_DIR=input.outputDir;
const m=await import('./content-studio/src/model.mjs'),siteId=input.siteId;
if(input.action==='setup'){
  await m.editSite(siteId,{facts:'Only isolated synthetic protocol data; no real business assertion.',operatorName:'Synthetic QA operator',contact:{email:'fixture@example.invalid',phone:''}});
  const site=await m.getSite(siteId);
  for(const p of site.pages.filter(p=>['home','contact'].includes(p.type)))await m.editPage(siteId,p.id,{
    body:[{type:'paragraph',text:'This isolated synthetic PostgreSQL fixture checks a native editorial approval protocol. It is not actual customer review, factual verification, publication or a launched website. All data belongs only to the bounded QA case.'}],
    factChecks:[],links:[],linkSuggestions:[],editorial:{...p.editorial,relatedPageIds:[]}});
}else if(input.action==='facts')await m.editSite(siteId,{facts:'Explicitly changed isolated synthetic facts invalidate the old review binding.'});
else if(input.action==='blocker')await m.editPage(siteId,input.pageId,{factChecks:['Unresolved synthetic QA fact must block approval.']});
else throw Error('Invalid fixture action');
console.log(JSON.stringify({state:'synthetic-fixture-prepared'}));"""


async def completion(c, cid, auth):
    value = await c["client"].get(f"/customer/v2/creations/{cid}/content-completion", headers=auth)
    assert value.status_code == 200, value.text
    return value.json()["data"]


async def seed(c, case, action, page_id=None):
    """Fixture-only native seeding, under the same actual current Session guard."""
    token = case.auth["Authorization"].split()[1]
    observed = await completion(c, case.cid, case.auth)
    async with scope(token=token_hash(token)) as tx:
        session = await customer_session(tx, token)
        request = editorial_review.Context(**case.context, operation_id=str(uuid4()),
            expected_site_sha256=observed["site_context_sha256"])
        guard = editorial_review.native_mutation_guard(tx, session, case.cid, request)
        creation, proof = await guard(lock=True)
        node, _, _, environment = studio.configuration()
        async def authorized():
            await guard()
            return True
        await studio._execute([node, "--input-type=module", "-e", SETUP],
            {"dataDir": str(case.directory / "data"), "outputDir": str(case.directory / "output"),
             "siteId": proof["site_id"], "action": action, "pageId": page_id}, environment, authorized, 20)
        await guard()


@pytest.fixture
async def editorial_case(preview, monkeypatch):  # noqa: F811
    c = preview
    cid, auth, body, directory = await prepared(c, monkeypatch)
    observed = await completion(c, cid, auth)
    case = SimpleNamespace(c=c, cid=cid, auth=auth, directory=directory,
        context={"accepted_revision": body["accepted_revision"], "candidate_sha256": body["candidate_sha256"],
            "canonical_host": observed["canonical_host"]},
        file=directory / "data/sites" / (observed["site_id"] + ".json"))
    await seed(c, case, "setup")
    case.ids = [p["page_id"] for p in (await completion(c, cid, auth))["pages"] if p["type"] in {"home", "contact"}]
    case.originals = {name: (directory / name).read_bytes() for name in ("source-draft.json", "intake-context.json", "intake-manifest.json")}
    yield case
    for name, data in case.originals.items():
        assert (directory / name).read_bytes() == data


async def request(case, *, approve=False, page_id=None):
    observed = await completion(case.c, case.cid, case.auth)
    selected = case.ids if approve else [page_id or case.ids[0]]
    pages = [{key: p[key] for key in ("page_id", "revision_sha256", "planning_sha256")}
             for page_id in selected for p in observed["pages"] if p["page_id"] == page_id]
    base = {**case.context, "operation_id": str(uuid4()), "expected_site_sha256": observed["site_context_sha256"]}
    return {**base, "pages": pages} if approve else {**base, "page": pages[0], "evidence": {
        key: f"Only the isolated synthetic {key} fixture was inspected for this exact revision; no actual customer PASS is asserted."
        for key in editorial_review.Evidence.model_fields}}


async def post(case, body, *, approve=False, auth=None):
    suffix = "editorial-approvals" if approve else "editorial-reviews"
    return await case.c["client"].post(f"/customer/v2/creations/{case.cid}/{suffix}", headers=auth or case.auth, json=body)


async def review_all(case):
    for page_id in case.ids:
        result = await post(case, await request(case, page_id=page_id))
        assert result.status_code == 200, result.text


async def test_real_http_review_approval_and_exact_replay_bind_actual_session_user(editorial_case):
    case = editorial_case
    first = await request(case)
    result = await post(case, first)
    assert result.status_code == 200, result.text
    value = result.json()["data"]
    assert value["operation"]["actor_id"].startswith("session-user:")
    assert value["operation"]["approval"] == "not-performed" and value["completion"]["private_release_status"] == "UNVERIFIED"
    before = case.file.read_bytes()
    replay = await post(case, first)
    assert replay.status_code == 200 and replay.json()["data"]["operation"]["replayed"] and case.file.read_bytes() == before
    await review_all(case)
    batch = await request(case, approve=True)
    approved = await post(case, batch, approve=True)
    assert approved.status_code == 200, approved.text
    assert approved.json()["data"]["operation"]["approval"] == "approved"
    assert approved.json()["data"]["operation"]["release"] == "not-performed"
    before = case.file.read_bytes()
    assert (await post(case, batch, approve=True)).json()["data"]["operation"]["replayed"] and case.file.read_bytes() == before


async def test_real_foreign_owner_cannot_record_or_approve_and_cannot_supply_actor(editorial_case):
    case = editorial_case
    _, other, _ = await verified(case.c)
    record, batch = await request(case), await request(case, approve=True)
    before = case.file.read_bytes()
    for body, approve in ((record, False), (batch, True)):
        response = await post(case, body, approve=approve, auth=other)
        assert response.status_code == 404, response.text
    assert (await post(case, {**record, "reviewer": "forged"})).status_code == 400
    assert (await post(case, {**batch, "actor_id": "forged"}, approve=True)).status_code == 400
    assert case.file.read_bytes() == before


async def test_real_exact_page_and_planning_pins_refuse_stale_metadata_before_write(editorial_case):
    case = editorial_case
    before = case.file.read_bytes()
    original = await request(case)
    for field in ("revision_sha256", "planning_sha256"):
        body = copy.deepcopy(original)
        body["operation_id"] = str(uuid4())
        body["page"][field] = "f" * 64
        response = await post(case, body)
        assert response.status_code == 409, response.text
        assert case.file.read_bytes() == before


async def test_real_current_facts_and_readiness_remain_blocking_and_batch_is_atomic(editorial_case):
    case = editorial_case
    await review_all(case)
    await seed(case.c, case, "facts")
    before = case.file.read_bytes()
    refused = await post(case, await request(case, approve=True), approve=True)
    assert refused.status_code == 409 and case.file.read_bytes() == before
    await review_all(case)
    await seed(case.c, case, "blocker", case.ids[-1])
    before = case.file.read_bytes()
    response = await post(case, await request(case, approve=True), approve=True)
    assert response.status_code == 409 and case.file.read_bytes() == before
    site = json.loads(before)
    assert all(not p.get("publishedRevision") for p in site["pages"] if p["id"] in case.ids)


async def test_real_lost_response_reconciles_retained_receipt_without_repeating_native_write(editorial_case, monkeypatch):
    case = editorial_case
    body = await request(case)
    execute = studio._execute
    async def lost(*args):
        await execute(*args)
        raise RunnerError("studio_timeout")  # after the real durable native receipt
    monkeypatch.setattr(studio, "_execute", lost)
    response = await post(case, body)
    assert response.status_code == 503, response.text
    before = case.file.read_bytes()
    monkeypatch.setattr(studio, "_execute", execute)
    replay = await post(case, body)
    assert replay.status_code == 200 and replay.json()["data"]["operation"]["replayed"]
    assert case.file.read_bytes() == before


async def test_real_changed_execution_source_requires_existing_s6_before_any_native_write(editorial_case, monkeypatch):
    case = editorial_case
    body = await request(case)
    before = case.file.read_bytes()
    monkeypatch.setattr(settings(), "control_source_revision", "b" * 40)
    response = await post(case, body)
    assert response.status_code == 409 and response.json()["code"] == "build_continuation_stale", response.text
    assert case.file.read_bytes() == before
