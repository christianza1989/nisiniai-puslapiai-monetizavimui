"""Current approved-plan snapshot, real restricted PG, inert discovery roles.

Nullable-child cases add a scoped ORM visibility filter while real RLS remains
enabled, exercising absence without violating immutable composite foreign keys.
"""
from copy import deepcopy

import pytest
from sqlalchemy import event, false, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import with_loader_criteria
from test_business_discovery import customers, discovery  # noqa: F401
from test_customer_public import verified
from test_discovery_source_context_pg import build, prepared

from pinet_core.business_discovery import service
from pinet_core.business_discovery.models import Discovery, DiscoveryJob, Report
from pinet_core.control.routes import ControlError, scope
from pinet_core.creation.models import Creation
from pinet_core.db import db


async def test_current_plan_uses_two_queries_and_foreign_rls_returns_no_approval(discovery):  # noqa: F811
    c = discovery
    auth, me, did, _, body, _ = await prepared(c)
    cid = await build(c, auth, did, body)
    _, _, foreign = await verified(c)
    async with scope(user=me['user_id']) as tx:
        creation = await tx.get(Creation, cid)
        for _ in range(3):
            statements = []
            def queried(*unused):
                statements.append(True)
            event.listen(db.engine.sync_engine, 'before_cursor_execute', queried)
            try:
                value = await service.approved_build_context(tx, creation)
            finally:
                event.remove(db.engine.sync_engine, 'before_cursor_execute', queried)
            assert value['sourceContext']['creationId'] == cid
            assert len(statements) == 2, len(statements)
    # A populated foreign input object cannot bypass the actual database RLS.
    async with scope(user=foreign['user_id']) as tx:
        assert await service.approved_build_context(tx, creation) is None


@pytest.mark.parametrize('hidden,code', [
    (Report, 'invalid_approved_plan'),
    (Discovery, 'invalid_approved_plan'),
    (DiscoveryJob, 'invalid_discovery_source_context'),
])
async def test_nullable_dependency_keeps_approval_visible_and_preserves_refusal(discovery, hidden, code):  # noqa: F811
    c = discovery
    auth, me, did, _, body, _ = await prepared(c)
    cid = await build(c, auth, did, body)
    async with scope(user=me['user_id']) as tx:
        creation = await tx.get(Creation, cid)
        assert await service.approved_build_context(tx, creation)
        def hide_dependency(execution):
            if execution.is_select:
                execution.statement = execution.statement.options(with_loader_criteria(hidden, false(), include_aliases=True))
        event.listen(tx.sync_session, 'do_orm_execute', hide_dependency)
        try:
            with pytest.raises(ControlError) as error:
                await service.approved_build_context(tx, creation)
            assert error.value.status == 503 and error.value.code == code
        finally:
            event.remove(tx.sync_session, 'do_orm_execute', hide_dependency)
        assert await service.approved_build_context(tx, creation)


async def test_populated_identity_map_observes_changed_parent_and_exact_job(discovery):  # noqa: F811
    c = discovery
    auth, me, did, job_id, body, _ = await prepared(c)
    cid = await build(c, auth, did, body)
    async with AsyncSession(c['admin']) as admin:
        original = await admin.get(DiscoveryJob, job_id)
        original_usage = deepcopy(original.usage)
    mutations = [
        (Discovery, did, {'status': 'archived'}, {'status': 'build_started'}, 'invalid_approved_plan'),
        (DiscoveryJob, job_id, {'status': 'failed'}, {'status': 'succeeded'}, 'invalid_discovery_source_context'),
        (DiscoveryJob, job_id, {'usage': {**original_usage, 'source_context_version': 'invalid'}},
            {'usage': original_usage}, 'invalid_discovery_source_context'),
    ]
    async def change(model, identity, values):
        async with AsyncSession(c['admin']) as admin, admin.begin():
            await admin.execute(update(model).where(model.id == identity).values(**values))
    async with scope(user=me['user_id']) as tx:
        creation = await tx.get(Creation, cid)
        for model, identity, broken, restored, code in mutations:
            assert await service.approved_build_context(tx, creation)
            await change(model, identity, broken)
            try:
                with pytest.raises(ControlError) as error:
                    await service.approved_build_context(tx, creation)
                assert error.value.status == 503 and error.value.code == code
            finally:
                await change(model, identity, restored)
            assert await service.approved_build_context(tx, creation)
