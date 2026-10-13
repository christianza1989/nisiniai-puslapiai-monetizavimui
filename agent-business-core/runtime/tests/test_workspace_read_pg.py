"""Real ordinary-customer HTTP/RLS index reads against isolated synthetic rows; provider0."""
import hashlib
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.business_discovery.models import BuildApproval, Discovery, DiscoveryJob, Report
from pinet_core.config import settings
from pinet_core.control.models import BusinessGrant, Membership, Session
from pinet_core.control.routes import token_hash
from pinet_core.creation.models import Artifact, Attempt, Creation, Job, Revision, TeamEvent
from pinet_core.creation.service import digest
from pinet_core.creation_registration.models import Registration
from pinet_core.creation_registration.service import stored_material
from pinet_core.models import Business, utcnow


def url(portfolio, kind, id, collection="topics"):
    return f"/customer/v2/portfolios/{portfolio}/workspace/{kind}/{id}/{collection}"


@pytest.fixture
async def workspace(customers):  # noqa: F811
    customers["workspace_business_ids"] = set()
    try:
        yield customers
    finally:
        async with AsyncSession(customers["admin"]) as tx, tx.begin():
            await tx.execute(delete(Registration).where(Registration.environment_id == customers["environment"]))
            await tx.execute(delete(BusinessGrant).where(BusinessGrant.environment_id == customers["environment"]))
            if customers["workspace_business_ids"]:
                await tx.execute(delete(Business).where(Business.id.in_(customers["workspace_business_ids"])))


async def seed(c, auth, me, *, shared_uuid=False, creation_id=None):
    """Only this fixture's test environment; no worker execution or existing local-row changes."""
    portfolio = me["portfolios"][0]
    owned = {"user_id": me["user_id"], "organization_id": portfolio["organization_id"],
             "portfolio_id": portfolio["portfolio_id"], "environment_id": c["environment"]}
    now = utcnow() - timedelta(seconds=5)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        cid = creation_id or str(uuid4())
        creation = Creation(id=cid, display_name="Sintetinis kūrimo pokalbis", idea="Sintetinė privati sąsajos medžiaga.",
            status="draft_ready", stage="ready", current_revision=2, job_sequence=2, event_sequence=0,
            idempotency_key=str(uuid4()), fingerprint="a" * 64, source_revision="a" * 40,
            created_at=now, updated_at=now, **owned)
        tx.add(creation)
        await tx.flush()
        discovery = Discovery(id=cid if shared_uuid else str(uuid4()), title="Sintetinis idėjos pokalbis",
            initial_message="Sintetinė verslo idėja.", status="build_started", current_revision=2,
            job_sequence=2, linked_creation_id=cid, source_revision="a" * 40,
            idempotency_key=str(uuid4()), fingerprint="b" * 64, created_at=now, updated_at=now, **owned)
        tx.add(discovery)
        await tx.flush()
        reports, artifacts = [], []
        for revision in (1, 2):
            date = now + timedelta(milliseconds=revision)
            job = Job(id=str(uuid4()), creation_id=cid, session_id=session.id, sequence=revision,
                base_revision=revision-1, message="Sintetinė išsaugota pastaba.", idempotency_key=str(uuid4()),
                fingerprint="a" * 64, status="succeeded", source_revision="a" * 40, created_at=date, **owned)
            dj = DiscoveryJob(id=str(uuid4()), discovery_id=discovery.id, session_id=session.id,
                sequence=revision, base_revision=revision-1, message="Sintetinė išsaugota užklausa.",
                idempotency_key=str(uuid4()), fingerprint="b" * 64, status="succeeded", source_revision="a" * 40,
                finished_at=date, created_at=date, **owned)
            tx.add_all([job, dj])
            await tx.flush()
            payload = {"reply": {"state": "needs_input", "assistant_message": "Sintetinis atsakymas patikrai.",
                "plan": None, "questions": [{"id": "q_scope", "question": "Kokio rezultato reikia?",
                    "reason": "Sintetinis klausimas sąsajos patikrai.", "required_for_build": True,
                    "suggestions": []}]}, "reviews": []}
            report = Report(id=str(uuid4()), discovery_id=discovery.id, job_id=dj.id, revision=revision,
                payload=payload, material_hash=digest(payload), source_revision="a" * 40, created_at=date, **owned)
            draft = Revision(id=str(uuid4()), creation_id=cid, job_id=job.id, sequence=revision,
                payload={"synthetic": True}, material_hash=digest({"synthetic": True}),
                source_revision="a" * 40, created_at=date, **owned)
            tx.add_all([report, draft])
            await tx.flush()
            for kind in ("business_plan", "content_package"):
                content = f"Sintetinis dokumentas {kind}, {revision} redakcija."
                artifact = Artifact(id=str(uuid4()), creation_id=cid, revision_id=draft.id,
                    revision=revision, kind=kind, display_name=kind + " sintetinis dokumentas",
                    media_type="text/markdown", content=content, sha256=hashlib.sha256(content.encode()).hexdigest(),
                    bytes=len(content.encode()), created_at=date, **owned)
                tx.add(artifact)
                artifacts.append(artifact.id)
            reports.append(report)
        tx.add(BuildApproval(id=str(uuid4()), discovery_id=discovery.id, report_id=reports[-1].id,
            report_revision=2, report_sha256=reports[-1].material_hash, creation_id=cid, session_id=session.id,
            idempotency_key=str(uuid4()), fingerprint="c" * 64, **owned))
        return {"creation": cid, "discovery": discovery.id, "portfolio": portfolio["portfolio_id"],
                "artifacts": artifacts, "reports": [r.id for r in reports]}


async def saved_registration(c, auth, me, records, *, revision=2, existing=None, revoked=False, corrupt=False):
    """FK-valid relationship metadata, deliberately NOT an accepted native-intake proof."""
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        creation = await tx.get(Creation, records["creation"])
        owned = {key: getattr(creation, key) for key in ("user_id", "organization_id", "portfolio_id", "environment_id")}
        draft = await tx.scalar(select(Revision).where(Revision.creation_id == creation.id, Revision.sequence == revision))
        session = await tx.scalar(select(Session).where(Session.token_hash == token_hash(auth["Authorization"][7:])))
        if existing:
            business = await tx.get(Business, existing["business"])
            grant = await tx.get(BusinessGrant, existing["grant"])
        else:
            business = Business(id=str(uuid4()), site_id="creation-" + creation.id.replace("-", ""),
                                canonical_host=uuid4().hex + ".example.test")
            c["workspace_business_ids"].add(business.id)
            tx.add(business)
            await tx.flush()
            grant = BusinessGrant(id=str(uuid4()), business_id=business.id, portfolio_id=creation.portfolio_id,
                organization_id=creation.organization_id, environment_id=c["environment"],
                display_name="Sintetinis susietas verslas", evidence_revision="a" * 40, enabled=True)
            tx.add(grant)
            await tx.flush()
        attempt = Attempt(id=str(uuid4()), creation_id=creation.id, job_id=draft.job_id,
            run_id=str(uuid4()), sequence=1, role="coordinator", round_number=1, stage="private_draft",
            source_revision="a" * 40, instruction_hash="a" * 64, model="gpt-6-luna", **owned)
        tx.add(attempt)
        await tx.flush()
        event = TeamEvent(id=str(uuid4()), creation_id=creation.id, job_id=draft.job_id, attempt_id=attempt.id,
            sequence=revision, state="succeeded", summary="Sintetinė registravimo nuorodos patikra.",
            payload={"synthetic_projection_fixture": True}, **owned)
        tx.add(event)
        await tx.flush()
        row = Registration(id=str(uuid4()), creation_id=creation.id, revision_id=draft.id,
            accepted_revision=revision, candidate_sha256=draft.material_hash, accepted_source_revision=draft.source_revision,
            business_id=business.id, grant_id=grant.id, site_id=business.site_id, canonical_host=business.canonical_host,
            authorizing_session_id=session.id, coordinator_event_id=event.id, coordinator_sha256=digest(event.payload),
            intake_sha256="a" * 64, intake_request_sha256="b" * 64, intake_importer_sha256="c" * 64,
            intake_site_file_sha256="d" * 64, revoked_at=utcnow() if revoked else None, **owned)
        row.fingerprint = "f" * 64 if corrupt else digest(stored_material(row))
        tx.add(row)
        return {"registration": row.id, "business": business.id, "grant": grant.id}


async def count_domain(c):
    async with AsyncSession(c["admin"]) as tx:
        return tuple([await tx.scalar(select(func.count()).select_from(model).where(
            model.environment_id == c["environment"])) for model in
            (Discovery, Creation, Job, DiscoveryJob, Report, Revision, Artifact, BuildApproval)])


async def test_group_before_paging_exact_legacy_refs_and_read_only_storage(customers):  # noqa: F811
    c = customers
    _, auth, me = await verified(c)
    records = await seed(c, auth, me)
    before = await count_domain(c)
    path = url(records["portfolio"], "discovery", records["discovery"], "results")
    all_items, cursor = [], None
    for _ in range(4):
        response = await c["client"].get(path, headers=auth, params={"limit": 1, **({"cursor": cursor} if cursor else {})})
        assert response.status_code == 200, response.text
        data = response.json()["data"]
        assert response.json()["contract_version"] == "workspace-read.v1"
        assert data["team_protocol"] == "not_implemented"
        all_items += data["items"]
        cursor = data["next_cursor"]
        if not cursor:
            break
    assert len(all_items) == 3 and all(item["revision"] == 2 for item in all_items)
    assert len({(item["kind"], item["id"]) for item in all_items}) == 3
    assert all(item["approval_basis"] == "not_inferred" for item in all_items)
    assert {item["id"] for item in all_items} == {records["reports"][-1], *records["artifacts"][-2:]}
    jobs = await c["client"].get(url(records["portfolio"], "creation", records["creation"], "tasks"), headers=auth)
    assert jobs.status_code == 200 and len(jobs.json()["data"]["items"]) == 4
    assert all(item["state_basis"] == "saved_job_record" for item in jobs.json()["data"]["items"])
    assert await count_domain(c) == before
    assert not settings().creation_runner_enabled and not settings().business_discovery_runner_enabled


async def test_same_uuid_across_sources_cannot_replace_titles_or_parent_refs(customers):  # noqa: F811
    _, auth, me = await verified(customers)
    records = await seed(customers, auth, me, shared_uuid=True)
    response = await customers["client"].get(url(records["portfolio"], "portfolio", records["portfolio"]), headers=auth)
    assert response.status_code == 200, response.text
    items = response.json()["data"]["items"]
    assert {item["kind"]: item["title"] for item in items} == {
        "discovery": "Sintetinis idėjos pokalbis", "creation": "Sintetinis kūrimo pokalbis"}
    assert all(item["id"] == records["creation"] for item in items)
    assert all(item["topic"]["kind"] == item["kind"] for item in items)


async def test_foreign_owner_same_name_and_shared_business_membership_never_grants_private_source(customers):  # noqa: F811
    c = customers
    _, auth, me = await verified(c)
    records = await seed(c, auth, me)
    _, other, other_me = await verified(c)
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        tx.add(Membership(user_id=other_me["user_id"], organization_id=me["portfolios"][0]["organization_id"],
                          role="owner", enabled=True, environment_id=c["environment"]))
    for collection in ("topics", "tasks", "results"):
        denied = await c["client"].get(url(records["portfolio"], "discovery", records["discovery"], collection), headers=other)
        assert denied.status_code == 404, denied.text
        own = await c["client"].get(url(records["portfolio"], "portfolio", records["portfolio"], collection), headers=other)
        assert own.status_code == 200 and own.json()["data"]["items"] == []
    assert (await c["client"].get(url(records["portfolio"], "creation", records["creation"]))).status_code == 401


async def test_cursor_filter_scope_change_and_revoked_membership_are_not_cached_authority(customers):  # noqa: F811
    c = customers
    _, auth, me = await verified(c)
    records = await seed(c, auth, me)
    path = url(records["portfolio"], "portfolio", records["portfolio"])
    first = await c["client"].get(path, headers=auth, params={"limit": 1})
    assert first.status_code == 200
    cursor = first.json()["data"]["next_cursor"]
    assert cursor
    wrong = await c["client"].get(path, headers=auth, params={"cursor": cursor, "q": "kitas"})
    assert wrong.status_code == 409
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(update(Membership).where(Membership.user_id == me["user_id"],
            Membership.environment_id == c["environment"]).values(enabled=False))
    denied = await c["client"].get(path, headers=auth, params={"cursor": cursor})
    assert denied.status_code == 404


@pytest.mark.parametrize("query", ["limit=0", "limit=51", "limit=1&limit=2", "unexpected=1", "q=" + "x" * 101])
async def test_strict_query_refusal_is_not_an_empty_collection(customers, query):  # noqa: F811
    _, auth, me = await verified(customers)
    portfolio = me["portfolios"][0]["portfolio_id"]
    response = await customers["client"].get(url(portfolio, "portfolio", portfolio) + "?" + query, headers=auth)
    assert response.status_code == 400


async def test_corrupt_artifact_fails_closed_without_returning_a_cached_or_empty_result(customers):  # noqa: F811
    _, auth, me = await verified(customers)
    records = await seed(customers, auth, me)
    async with AsyncSession(customers["admin"]) as tx, tx.begin():
        await tx.execute(update(Artifact).where(Artifact.id == records["artifacts"][-1],
            Artifact.environment_id == customers["environment"]).values(sha256="f" * 64))
    response = await customers["client"].get(url(records["portfolio"], "creation", records["creation"], "results"), headers=auth)
    assert response.status_code == 503 and "data" not in response.json()


async def test_composed_collision_keeps_two_business_bindings_and_graphs_distinct(workspace):
    _, auth, me = await verified(workspace)
    linked = await seed(workspace, auth, me)
    independent = await seed(workspace, auth, me, creation_id=linked["discovery"])
    b2 = await saved_registration(workspace, auth, me, linked)
    b1 = await saved_registration(workspace, auth, me, independent)
    response = await workspace["client"].get(url(linked["portfolio"], "portfolio", linked["portfolio"]), headers=auth)
    assert response.status_code == 200, response.text
    items = {(item["kind"], item["id"]): item for item in response.json()["data"]["items"]}
    assert items[("discovery", linked["discovery"])]["parent_business_id"] == b2["business"]
    assert items[("creation", independent["creation"])]["parent_business_id"] == b1["business"]
    own = await workspace["client"].get(url(linked["portfolio"], "business", b1["business"]), headers=auth)
    assert own.status_code == 200
    assert {(item["kind"], item["id"]) for item in own.json()["data"]["items"]} == {
        ("creation", independent["creation"]), ("discovery", independent["discovery"])}


async def test_latest_revoked_registration_cannot_resurrect_older_valid_business_scope(workspace):
    _, auth, me = await verified(workspace)
    records = await seed(workspace, auth, me)
    old = await saved_registration(workspace, auth, me, records, revision=1)
    await saved_registration(workspace, auth, me, records, existing=old, revoked=True)
    business = await workspace["client"].get(url(records["portfolio"], "business", old["business"]), headers=auth)
    assert business.status_code == 200 and business.json()["data"]["items"] == []
    source = await workspace["client"].get(url(records["portfolio"], "creation", records["creation"]), headers=auth)
    assert source.status_code == 200
    assert all(item["association_state"] == "revoked" and item["parent_business_id"] is None
               for item in source.json()["data"]["items"])


async def test_stale_saved_registration_supports_history_without_verified_readiness_claim(workspace):
    _, auth, me = await verified(workspace)
    records = await seed(workspace, auth, me)
    registered = await saved_registration(workspace, auth, me, records, revision=1)
    response = await workspace["client"].get(url(records["portfolio"], "business", registered["business"]), headers=auth)
    assert response.status_code == 200
    assert all(item["association_state"] == "stale_saved" and item["association_basis"] == "saved_registration_identity"
               for item in response.json()["data"]["items"])


async def test_business_grant_and_source_authority_are_rechecked_independently(workspace):
    _, auth, me = await verified(workspace)
    records = await seed(workspace, auth, me)
    registered = await saved_registration(workspace, auth, me, records)
    _, other, other_me = await verified(workspace)
    async with AsyncSession(workspace["admin"]) as tx, tx.begin():
        tx.add(Membership(user_id=other_me["user_id"], organization_id=me["portfolios"][0]["organization_id"],
                          role="owner", enabled=True, environment_id=workspace["environment"]))
    path = url(records["portfolio"], "business", registered["business"], "results")
    invisible = await workspace["client"].get(path, headers=other)
    assert invisible.status_code == 200 and invisible.json()["data"]["items"] == []
    first = await workspace["client"].get(path, headers=auth, params={"limit": 1})
    assert first.status_code == 200 and first.json()["data"]["next_cursor"]
    async with AsyncSession(workspace["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.id == registered["grant"],
            BusinessGrant.environment_id == workspace["environment"]).values(enabled=False))
    denied = await workspace["client"].get(path, headers=auth, params={"cursor": first.json()["data"]["next_cursor"]})
    assert denied.status_code == 404


async def test_unrelated_corrupt_business_does_not_poison_selected_graph_or_cursor(workspace):
    _, auth, me = await verified(workspace)
    first = await seed(workspace, auth, me)
    b1 = await saved_registration(workspace, auth, me, first)
    path = url(first["portfolio"], "business", b1["business"], "results")
    initial = await workspace["client"].get(path, headers=auth, params={"limit": 1})
    assert initial.status_code == 200
    second = await seed(workspace, auth, me)
    b2 = await saved_registration(workspace, auth, me, second, corrupt=True)
    next_page = await workspace["client"].get(path, headers=auth, params={"cursor": initial.json()["data"]["next_cursor"]})
    assert next_page.status_code == 200
    broken = await workspace["client"].get(url(second["portfolio"], "business", b2["business"]), headers=auth)
    assert broken.status_code == 503


async def test_exact_old_document_is_independent_of_latest_saved_family_and_does_not_write(customers):  # noqa: F811
    _, auth, me = await verified(customers)
    records = await seed(customers, auth, me)
    async with AsyncSession(customers["admin"]) as tx:
        artifact = await tx.get(Artifact, records["artifacts"][0])
        sha = artifact.sha256
    before = await count_domain(customers)
    path = url(records["portfolio"], "creation", records["creation"], "results") + "/creation_artifact/" + records["artifacts"][0]
    result = await customers["client"].get(path, headers=auth, params={"revision": 1, "sha256": sha})
    assert result.status_code == 200, result.text
    document = result.json()["data"]
    assert document["result"]["revision"] == document["artifact"]["revision"] == 1
    assert document["result"]["family_basis"] == "exact_saved_revision"
    assert hashlib.sha256(document["content"].encode()).hexdigest() == sha
    async with AsyncSession(customers["admin"]) as tx:
        report = await tx.get(Report, records["reports"][0])
        report_sha = report.material_hash
    report_path = url(records["portfolio"], "discovery", records["discovery"], "results") + "/discovery_report/" + records["reports"][0]
    old_report = await customers["client"].get(report_path, headers=auth, params={"revision": 1, "sha256": report_sha})
    assert old_report.status_code == 200, old_report.text
    assert old_report.json()["data"]["result"]["family_basis"] == "exact_saved_revision"
    assert old_report.json()["data"]["report"]["revision"] == 1
    changed = await customers["client"].get(path, headers=auth, params={"revision": 2, "sha256": sha})
    assert changed.status_code == 409 and "data" not in changed.json()
    assert await count_domain(customers) == before


async def test_document_cannot_escape_graph_or_use_a_cached_business_grant(workspace):
    _, auth, me = await verified(workspace)
    a, b = await seed(workspace, auth, me), await seed(workspace, auth, me)
    registered = await saved_registration(workspace, auth, me, a)
    async with AsyncSession(workspace["admin"]) as tx:
        own = await tx.get(Artifact, a["artifacts"][-1])
        other = await tx.get(Artifact, b["artifacts"][-1])
        own_sha, other_sha = own.sha256, other.sha256
    root = url(a["portfolio"], "business", registered["business"], "results") + "/creation_artifact/"
    foreign_graph = await workspace["client"].get(root + b["artifacts"][-1], headers=auth,
        params={"revision": 2, "sha256": other_sha})
    assert foreign_graph.status_code == 404
    async with AsyncSession(workspace["admin"]) as tx, tx.begin():
        await tx.execute(update(BusinessGrant).where(BusinessGrant.id == registered["grant"],
            BusinessGrant.environment_id == workspace["environment"]).values(enabled=False))
    revoked = await workspace["client"].get(root + a["artifacts"][-1], headers=auth,
        params={"revision": 2, "sha256": own_sha})
    assert revoked.status_code == 404
