"""Real restricted PG ownership and current native Node; synthetic inputs, zero provider."""
import json

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import accepted
from test_customer_creations import creation as creation_fixture
from test_customer_creations import start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.content_completion import service
from pinet_core.control.models import Membership
from pinet_core.creation import studio
from pinet_core.creation.models import Attempt, Job, Revision

creation = creation_fixture


async def read(c, cid, auth, **params):
    return await c["client"].get(f"/customer/v2/creations/{cid}/content-completion", headers=auth, params=params)


async def counts(c):
    async with AsyncSession(c["admin"]) as tx:
        return tuple([await tx.scalar(select(func.count()).select_from(model).where(model.environment_id == c["environment"]))
                      for model in (Attempt, Job, Revision)])


async def test_pending_creation_read_is_empty_private_readonly_and_bounded(creation):
    c = creation
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me)
    cid = row["creation_id"]
    before = await counts(c)
    response = await read(c, cid, auth)
    assert response.status_code == 200, response.text
    value = response.json()
    assert value["contract_version"] == "content-completion.v1"
    assert value["data"]["state"] == "not_imported" and value["data"]["revision_pending"]
    assert value["data"]["pages"] == [] and response.headers["cache-control"] == "private, no-store"
    for params in ({"unknown": "1"}, {"accepted_revision": "bad"}, {"accepted_revision": 0}, {"accepted_revision": 21}):
        assert (await read(c, cid, auth, **params)).status_code == 400
    assert (await read(c, cid, auth, accepted_revision=1)).status_code == 409
    path = f"/customer/v2/creations/{cid}/content-completion?accepted_revision=1&accepted_revision=1"
    assert (await c["client"].get(path, headers=auth)).status_code == 400
    assert (await c["client"].post(path, headers=auth)).status_code == 405
    assert await counts(c) == before


async def test_real_node_current_page_change_does_not_rewrite_intake_or_call_history(creation):
    c = creation
    request, _, auth, _ = await accepted(c)
    cid = request["creation_id"]
    old = (await c["client"].get(f"/customer/v2/creations/{cid}/content", headers=auth)).json()
    before = await counts(c)
    first = await read(c, cid, auth, accepted_revision=1)
    assert first.status_code == 200, first.text
    observed = first.json()["data"]
    assert observed["state"] == "current" and observed["observation_scope"] == "current_private_workflow"
    assert observed["accepted_source_revision"] == request["accepted_source_revision"]
    assert observed["candidate_sha256"] == request["candidate_sha256"]
    assert observed["private_release_status"] == observed["seo_geo_status"] == "UNVERIFIED"
    assert observed["pages"] and all(not p["has_approved_revision"] for p in observed["pages"])
    node, _, artifacts, environment = studio.configuration()
    directory = artifacts / "customer-content" / cid / "revision-1"
    site_file = next((directory / "data/sites").glob("*.json"))
    native = json.loads(site_file.read_bytes())
    home = next(p for p in native["pages"] if p["type"] == "home")
    # A real canonical editor mutation in this isolated fixture, not a hand-edited hash.
    script = """import {readFile} from 'node:fs/promises';
const input=JSON.parse(await readFile(process.argv[1],'utf8'));
process.env.STUDIO_DATA_DIR=input.data;process.env.STUDIO_OUTPUT_DIR=input.output;
const model=await import('./content-studio/src/model.mjs');
await model.editPage(input.site,input.page,{description:'Nauja sintetinė pirmojo pasiūlymo puslapio redakcija, kuri lieka privati.'});
console.log(JSON.stringify({changed:true}));"""
    fixture = directory / "completion-edit.private.json"
    fixture.write_text(json.dumps({"data": str(directory / "data"), "output": str(directory / "output"),
        "site": native["id"], "page": home["id"]}), encoding="utf-8")
    async def authorized():
        return True
    changed = await studio._execute([node, "--input-type=module", "-e", script, fixture], {}, environment, authorized, 20)
    assert changed == {"changed": True}
    second = await read(c, cid, auth)
    assert second.status_code == 200, second.text
    current_home = next(p for p in second.json()["data"]["pages"] if p["page_id"] == home["id"])
    previous_home = next(p for p in observed["pages"] if p["page_id"] == home["id"])
    assert current_home["revision_sha256"] != previous_home["revision_sha256"]
    assert not current_home["review_current"] and current_home["state"] == "blocked"
    unchanged = (await c["client"].get(f"/customer/v2/creations/{cid}/content", headers=auth)).json()
    assert unchanged["data"] == old["data"]
    for key in ("contract_version", "source_revision", "environment"):
        assert unchanged[key] == old[key]
    assert unchanged["request_id"] != old["request_id"]
    assert await counts(c) == before


async def test_current_completion_cannot_cross_customer_or_revoked_membership(creation):
    c = creation
    request, _, auth, me = await accepted(c)
    _, foreign, _ = await verified(c)
    assert (await read(c, request["creation_id"], foreign)).status_code == 404
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
            Membership.environment_id == c["environment"]).values(enabled=False))
    assert (await read(c, request["creation_id"], auth)).status_code == 404


async def test_revocation_after_real_node_output_is_rechecked_before_return(creation, monkeypatch):
    c = creation
    request, _, auth, me = await accepted(c)
    original = studio._execute
    async def revoke_after(*args, **kwargs):
        value = await original(*args, **kwargs)
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
                Membership.environment_id == c["environment"]).values(enabled=False))
        return value
    monkeypatch.setattr(studio, "_execute", revoke_after)
    assert (await read(c, request["creation_id"], auth)).status_code == 404


async def test_missing_local_adapter_fails_without_historical_snapshot_fallback(creation, monkeypatch, tmp_path):
    c = creation
    request, _, auth, _ = await accepted(c)
    monkeypatch.setattr(service, "ROOT", tmp_path)
    response = await read(c, request["creation_id"], auth)
    assert response.status_code == 503
    assert response.json()["code"] == "content_completion_unavailable"
    assert response.headers["cache-control"] == "private, no-store"
