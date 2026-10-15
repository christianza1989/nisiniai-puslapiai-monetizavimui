"""Execute an actual target after older lookup-only approvals; provider0."""
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from test_site_build import build as build_fixture
from test_site_build import creation, customers, first, roles  # noqa: F401

from pinet_core.business_discovery.models import BuildApproval, Discovery, DiscoveryJob, Report
from pinet_core.content_work.models import GuideAttempt
from pinet_core.control.routes import ControlError, scope
from pinet_core.creation.models import Creation
from pinet_core.creation.service import digest
from pinet_core.models import utcnow
from pinet_core.site_build import approval_selectors, selectors, service, worker

build = build_fixture


async def older_lookup_fixtures(c, target):
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        template = await tx.get(Creation, target)
        approval = await tx.scalar(select(BuildApproval).where(BuildApproval.creation_id == target))
        discovery = await tx.get(Discovery, approval.discovery_id)
        report = await tx.get(Report, approval.report_id)
        discovery_job = await tx.get(DiscoveryJob, report.job_id)

        def clone(row, **changes):
            return type(row)(**{**{column.name: getattr(row, column.name)
                for column in row.__table__.columns}, **changes})

        # The105 rows are historical lookup fixtures only. No cloned native
        # intake, role attempt, content write, provider call or quality claim.
        for index in range(105):
            cid, did, jid, rid = str(UUID(int=index+1)), *(str(uuid4()) for _ in range(3))
            key, created = str(uuid4()), utcnow()-timedelta(days=1)
            tx.add(clone(template, id=cid, idempotency_key=key, created_at=created))
            await tx.flush()
            tx.add(clone(discovery, id=did, linked_creation_id=cid, idempotency_key=key, created_at=created))
            await tx.flush()
            tx.add(clone(discovery_job, id=jid, discovery_id=did, idempotency_key=key, created_at=created))
            await tx.flush()
            tx.add(clone(report, id=rid, discovery_id=did, job_id=jid, created_at=created))
            await tx.flush()
            tx.add(clone(approval, id=str(uuid4()), discovery_id=did, report_id=rid,
                creation_id=cid, idempotency_key=key, created_at=created, fingerprint=digest({
                    "discovery_id": did, "report_revision": approval.report_revision,
                    "report_sha256": approval.report_sha256, "idempotency_key": key})))


async def test_actual_newer_approval_advance_executes_its_guide_after_one_hundred_old_rows(build):
    c = build
    target, _, _ = await first(c)
    await older_lookup_fixtures(c, target)
    async with scope() as tx:
        legacy = list(await tx.scalars(text("SELECT creation_id FROM control_site_build_candidates(:e)"),
            {"e": c["environment"]}))
        assert len(legacy) == 100 and target not in legacy
    result = await worker.tick(target, guide_role_runner=roles())
    assert result["executed"] and result["completed_initial_guides"] == 1, result
    async with AsyncSession(c["admin"]) as tx:
        assert await tx.scalar(select(func.count()).select_from(GuideAttempt).where(
            GuideAttempt.creation_id == target)) == 3


async def test_exact_lookup_retains_environment_archive_and_function_privileges(build):
    c = build
    target, auth, _ = await first(c)
    async with scope() as tx:
        assert await approval_selectors.ready(tx) and await selectors.ready(tx)
        assert (await approval_selectors.selected(tx, c["environment"], target))["creation_id"] == target
        for environment in ("production", "test-" + str(uuid4())):
            assert await approval_selectors.selected(tx, environment, target) is None
        assert await approval_selectors.selected(tx, c["environment"], str(uuid4())) is None
        assert await tx.scalar(text("SELECT to_regprocedure('control_site_build_candidates(varchar)') IS NOT NULL"))
        assert await tx.scalar(text("SELECT has_function_privilege(current_user,:signature,'EXECUTE')"),
            {"signature": approval_selectors.SIGNATURE})
        assert not await tx.scalar(text("SELECT EXISTS(SELECT 1 FROM pg_proc p,"
            "LATERAL aclexplode(p.proacl) a WHERE p.oid=to_regprocedure(:signature) "
            "AND a.grantee=0 AND a.privilege_type='EXECUTE')"), {"signature": approval_selectors.SIGNATURE})
    response = await c["client"].post("/customer/v2/creations/" + target + "/archive",
        headers=auth, json={"idempotency_key": str(uuid4())})
    assert response.status_code == 200
    async with scope() as tx:
        assert await approval_selectors.selected(tx, c["environment"], target) is None
    assert (await service.advance(target))["code"] == "build_approval_unavailable"


async def test_missing_overload_fails_closed_without_legacy_fallback(build):
    c = build
    # Drop only this owned QA overload, restore in finally; production/original
    # databases and the legacy one-argument signature are never modified.
    async with AsyncSession(c["admin"]) as tx, tx.begin():
        await tx.execute(text("DROP FUNCTION control_site_build_candidates(VARCHAR,VARCHAR)"))
    try:
        async with scope() as tx:
            assert not await approval_selectors.ready(tx) and not await selectors.ready(tx)
            assert await tx.scalar(text("SELECT to_regprocedure('control_site_build_candidates(varchar)') IS NOT NULL"))
        with pytest.raises(ControlError) as failed:
            await service.advance(str(uuid4()))
        assert failed.value.code == "site_build_schema_unavailable"
    finally:
        async with AsyncSession(c["admin"]) as tx, tx.begin():
            for sql in approval_selectors.statements():
                await tx.execute(text(sql))
