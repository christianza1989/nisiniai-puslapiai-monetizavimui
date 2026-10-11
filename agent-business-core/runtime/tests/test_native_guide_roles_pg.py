"""Restricted native reservations, additive model migration and immutable history."""
import asyncio
import hashlib
import json
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from test_content_work import enqueue, prepared, roles
from test_customer_creations import creation as creation_fixture
from test_customer_public import customers  # noqa: F401

from pinet_core.content_work import adapter, service, worker
from pinet_core.content_work.models import GuideAttempt
from pinet_core.control.routes import scope
from pinet_core.tasks.codex_transport import RunnerError

creation = creation_fixture


async def attempts(c):
    async with AsyncSession(c['admin']) as tx:
        rows = (await tx.execute(text('SELECT to_jsonb(a)::text FROM control_content_work_attempts a ORDER BY id'))).scalars().all()
        return hashlib.sha256(json.dumps(rows).encode()).hexdigest()


async def migrate(direction, target):
    proc = await asyncio.create_subprocess_exec(sys.executable, '-m', 'alembic', direction, target,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    output, _ = await proc.communicate()
    Path('artifacts/native-review-schema-' + str(uuid4()) + '.private.log').write_bytes(output)
    return proc.returncode


@pytest.mark.parametrize('failed_role', [None, 'critic', 'coordinator'])
async def test_native_reserved_models_match_actual_fixed_role_on_success_and_failure(creation, failed_role):
    c = creation
    f = await prepared(c)
    response, _ = await enqueue(c, f)
    assert response.status_code == 202
    base = roles()
    seen = []
    async def role(context, authorized, *, role, seconds):
        model = 'gpt-6-luna' if role == 'creator' else 'gpt-6.1-sol'
        async with scope(user=f['me']['user_id']) as tx:
            assert await tx.scalar(text('SELECT model FROM control_content_work_attempts WHERE creation_id=:c ORDER BY sequence DESC LIMIT 1'),
                                   {'c': f['creation_id']}) == model
        assert context['expected_model'] == model
        assert context['expected_instruction_hash'] == adapter.instruction_hash(role, context['prepared'])
        seen.append(model)
        if role == failed_role:
            raise RunnerError('provider_error', {'usage': {'input_tokens': 7, 'output_tokens': 2}})
        return await base(context, authorized, role=role, seconds=seconds)
    assert await worker.execute_once(role_runner=role)
    value = (await c['client'].get(f['path'], headers=f['auth'])).json()['data']['items'][0]
    assert [a['model'] for a in value['attempts']] == seen
    assert seen == ['gpt-6-luna', 'gpt-6.1-sol'] + ([] if failed_role == 'critic' else ['gpt-6.1-sol'])
    assert value['status'] == ('failed' if failed_role else 'succeeded')
    assert value['approval'] == 'not_performed' and value['full_f1_status'] == 'UNVERIFIED'
    if failed_role:
        e = next(e for e in value['events'] if e['state'] == 'failed' and e['attempt_id'])
        assert e['data']['failure_code'] == 'provider_error' and e['data']['usage']['input_tokens'] == 7
        assert value['output_sha256'] is None and value['applied_revision_sha256'] is None


async def test_changed_native_profile_after_claim_has_no_charged_reservation(creation, monkeypatch):
    c = creation
    f = await prepared(c)
    assert (await enqueue(c, f))[0].status_code == 202
    claimed = await worker.claim()
    original = adapter.role_profile
    monkeypatch.setattr(adapter, 'role_profile', lambda role: {**original(role), 'reasoning_effort': 'changed'})
    with pytest.raises(RunnerError, match='instructions_changed'):
        await worker.reserve(claimed, 'creator', 1, {})
    value = (await c['client'].get(f['path'], headers=f['auth'])).json()['data']['items'][0]
    assert value['attempts'] == []


async def test_native_0019_blocks_queue_claim_and_first_reservation(creation):
    c = creation
    assert c['admin'].url.database.startswith('pinet_guide_model_qa_')
    f = await prepared(c)
    assert (await enqueue(c, f))[0].status_code == 202
    claimed = await worker.claim()
    assert await migrate('downgrade', '0019_creation_job_history') == 0
    try:
        with pytest.raises(RunnerError, match='runner_unavailable'):
            await worker.reserve(claimed, 'creator', 1, {})
        with pytest.raises(RunnerError, match='runner_unavailable'):
            await worker.claim()
        assert (await enqueue(c, f))[0].status_code == 503
        assert (await c['client'].get(f['path'], headers=f['auth'])).json()['data']['items'][0]['attempts'] == []
    finally:
        assert await migrate('upgrade', 'head') == 0


async def test_mixed_native_history_is_readable_and_sol_blocks_downgrade_without_mutation(creation):
    c = creation
    assert c['admin'].url.database.startswith('pinet_guide_model_qa_')
    f = await prepared(c)
    assert (await enqueue(c, f))[0].status_code == 202
    assert await worker.execute_once(role_runner=roles())
    value = (await c['client'].get(f['path'], headers=f['auth'])).json()['data']['items'][0]
    async with scope(user=f['me']['user_id']) as tx:
        row = await tx.get(GuideAttempt, str(value['attempts'][0]['attempt_id']))
        legacy = {col.name: getattr(row, col.name) for col in GuideAttempt.__table__.columns}
        legacy.update(id=str(uuid4()), role='critic', round_number=2, sequence=4, model='gpt-6-luna')
        tx.add(GuideAttempt(**legacy))
    before = await attempts(c)
    again = (await c['client'].get(f['path'], headers=f['auth'])).json()['data']['items'][0]
    assert [a['model'] for a in again['attempts']] == ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6.1-sol', 'gpt-6-luna']
    for role, model in [('creator', 'gpt-6.1-sol'), ('critic', 'customer-selected')]:
        with pytest.raises(DBAPIError):
            async with scope(user=f['me']['user_id']) as tx:
                tx.add(GuideAttempt(**{**legacy, 'id': str(uuid4()), 'sequence': 5, 'role': role, 'model': model}))
                await tx.flush()
    assert await migrate('downgrade', '0019_creation_job_history') != 0
    assert await attempts(c) == before
    async with AsyncSession(c['admin']) as tx:
        assert await tx.scalar(text('SELECT version_num FROM alembic_version')) == '0020_native_review_model'
        assert await service.review_schema_ready(tx)
