"""Real owner/Discovery approval -> Creation worker -> canonical Node provenance.

Captured public claims and role outputs are inert fixture data; no fetch/provider.
All SQL mutations belong to this disposable fixture's random environment.
"""
import hashlib
import json
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from test_business_discovery import customers, discovery, plan_roles, start  # noqa: F401
from test_customer_creations import draft
from test_customer_public import verified

from pinet_core.business_discovery import source_context
from pinet_core.business_discovery import worker as discovery_worker
from pinet_core.business_discovery.models import Discovery, DiscoveryJob, Report
from pinet_core.control.routes import scope
from pinet_core.creation import studio, worker
from pinet_core.creation.models import Artifact, Creation, Job, Revision
from pinet_core.creation.service import binding


def capture():
    text = "Gamintojas viešai teigia: ąžuolas 🧖. " + "x" * 8958
    text = (text + "x" * 9000)[:9000]
    return {source_context.MARKER: source_context.VERSION, "source_reads": {"pages": [{
        "url": "https://example.org/manufacturer", "status": "observed", "http_status": 200,
        "observed_at": "2026-10-15T00:00:00+00:00", "title": "Viešas nepatvirtintas teiginys",
        "body_sha256": "b" * 64, "text_sha256": hashlib.sha256(text.encode()).hexdigest(),
        "response_bytes": 30000, "text": text, "links": []}], "remaining_urls": [], "complete": True,
        "independent_fact_verification": "UNVERIFIED"}}


async def prepared(c, *, marked=True):
    _, auth, me = await verified(c)
    row, _ = await start(c, auth, me, "Tiriame vieną viešą gamintojo šaltinį uždarai demonstracijai.")
    host = uuid4().hex + ".example.test"

    async def roles(context, authorized, **options):
        value, usage = await plan_roles(context, authorized, **options)
        if options["role"] == "creator":
            value["plan"]["canonical_host_candidate"] = host
        return value, usage

    assert await discovery_worker.execute_once(discovery_id=row["discovery_id"], role_runner=roles)
    detail = (await c["client"].get("/customer/v2/discoveries/" + row["discovery_id"], headers=auth)).json()["data"]
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        report = await tx.scalar(select(Report).where(Report.discovery_id == row["discovery_id"], Report.revision == 1))
        source_job = await tx.get(DiscoveryJob, report.job_id)
        if marked:
            source_job.usage = {**source_job.usage, **capture()}
        source_job_id = report.job_id
        report_identity = (report.id, report.material_hash, json.dumps(report.payload, sort_keys=True))
    body = {"report_revision": 1, "report_sha256": detail["latest_report_sha256"], "idempotency_key": str(uuid4())}
    return auth, me, row["discovery_id"], source_job_id, body, report_identity


async def build(c, auth, did, body):
    response = await c["client"].post(f"/customer/v2/discoveries/{did}/build", headers=auth, json=body)
    assert response.status_code == 202, response.text
    return response.json()["data"]["creation_id"]


async def later_failed_sibling(c, source_job_id):
    # A later job is deliberately unusable: only the approved report's exact job
    # can supply observations, never the greatest sequence for the Discovery.
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        source_job = await tx.get(DiscoveryJob, source_job_id)
        parent = await tx.get(Discovery, source_job.discovery_id)
        sibling = DiscoveryJob(id=str(uuid4()), discovery_id=parent.id, session_id=source_job.session_id,
            sequence=source_job.sequence + 1, base_revision=1, message="Vėlesnis nepavykęs fixture darbas",
            idempotency_key=str(uuid4()), fingerprint="c" * 64, source_revision="d" * 40,
            status="failed", failure_code="provider_error", usage={source_context.MARKER: "invalid"},
            **binding(source_job))
        tx.add(sibling)
        parent.job_sequence = sibling.sequence


@pytest.mark.parametrize("marked", [False, True], ids=["legacy", "claims"])
async def test_real_approved_report_creation_to_native_intake_keeps_claims_and_blank_business_facts(discovery, marked):  # noqa: F811
    c, seen = discovery, []
    auth, me, did, source_job, body, original = await prepared(c, marked=marked)
    await later_failed_sibling(c, source_job)
    cid = await build(c, auth, did, body)
    assert await build(c, auth, did, body) == cid
    _, foreign, _ = await verified(c)
    assert (await c["client"].get("/customer/v2/creations/" + cid, headers=foreign)).status_code == 404
    (studio.RUNTIME / "artifacts").mkdir(exist_ok=True)

    async def runner(context, authorized):
        assert await authorized()
        seen.append(context["approved_business_plan"])
        return draft(), {"usage": {"input_tokens": 11}, "web_search_count": 0}

    assert await worker.execute_once(runner, intake_runner=studio.import_draft, creation_id=cid)
    async with AsyncSession(c["admin"]) as tx:
        creation = await tx.get(Creation, cid)
        job = await tx.scalar(select(Job).where(Job.creation_id == cid))
        revision = await tx.scalar(select(Revision).where(Revision.creation_id == cid))
        report = await tx.get(Report, original[0])
        assert creation.status == "draft_ready" and job.status == "succeeded"
        assert revision and job.usage["content_intake"]["state"] == "private-draft-imported", job.usage
        assert (report.id, report.material_hash, json.dumps(report.payload, sort_keys=True)) == original
    _, _, artifacts, _ = studio.configuration()
    directory = artifacts / "customer-content" / cid / "revision-1"
    native = json.loads((directory / "intake-context.json").read_text("utf-8"))
    assert native["verifiedFacts"] == [] and native["knownContact"] == {"email": "", "phone": ""} and native["operatorName"] == ""
    site = json.loads(next((directory / "data/sites").glob("*.json")).read_text("utf-8"))
    assert not site["facts"] and not site["operatorName"] and site["contact"] == {"email": "", "phone": ""}
    assert all(not p["approval"] and not p["publishedRevision"] for p in site["pages"])
    if marked:
        value = seen[0]["sourceContext"]
        assert native["sourceContext"] == value and value["discoveryJobId"] == source_job
        assert value["reportSha256"] == body["report_sha256"] and value["sources"][0]["textMayBeClipped"] is True
        assert job.usage["content_intake"]["sourceContextSha256"] == value["contextSha256"]
        before = [(directory / p).read_bytes() for p in ("source-draft.json", "intake-context.json", "intake-manifest.json")]
        async def yes():
            return True
        replay = await studio.import_draft(revision.payload, creation_id=cid, revision=1,
            canonical_host=creation.canonical_host, still_authorized=yes, source_context=value)
        assert replay["replayed"]
        assert before == [(directory / p).read_bytes() for p in ("source-draft.json", "intake-context.json", "intake-manifest.json")]
    else:
        assert "sourceContext" not in seen[0] and "sourceContext" not in native and "sourceContextSha256" not in job.usage["content_intake"]
    async with scope(user=me["user_id"]) as tx:
        from pinet_core.business_discovery.service import approved_build_context
        assert (await approved_build_context(tx, await tx.get(Creation, cid)))["report_sha256"] == body["report_sha256"]


@pytest.mark.parametrize("moment", ["before", "after"])
async def test_real_source_marker_removal_fences_intake_and_retains_already_written_native_receipt(discovery, moment):  # noqa: F811
    c, calls = discovery, []
    auth, _, did, source_job_id, body, _ = await prepared(c)
    cid = await build(c, auth, did, body)
    (studio.RUNTIME / "artifacts").mkdir(exist_ok=True)

    async def remove():
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            source_job = await tx.get(DiscoveryJob, source_job_id)
            source_job.usage = {k: v for k, v in source_job.usage.items() if k != source_context.MARKER}

    async def runner(context, authorized):
        assert await authorized()
        if moment == "before":
            await remove()
        return draft(), {"usage": {"input_tokens": 13}}

    async def intake(*args, **options):
        value = await studio.import_draft(*args, **options)
        calls.append(value)
        await remove()
        return value

    assert await worker.execute_once(runner, intake_runner=intake, creation_id=cid)
    async with AsyncSession(c["admin"]) as tx:
        job = await tx.scalar(select(Job).where(Job.creation_id == cid))
        assert job.status == "failed" and job.failure_code == "source_context_changed"
        assert not list(await tx.scalars(select(Revision.id).where(Revision.creation_id == cid)))
        assert not list(await tx.scalars(select(Artifact.id).where(Artifact.creation_id == cid)))
        assert len(calls) == (moment == "after")
        if moment == "after":
            assert job.usage["content_intake"] == calls[0] and job.usage["content_intake"]["state"] == "private-draft-imported"
