"""Profile projection query bounds without caching history or relaxing bindings."""
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation import execution_profiles as profiles
from pinet_core.creation import team


@pytest.fixture
def history(monkeypatch):
    identity = {key: str(uuid4()) for key in ('user_id', 'organization_id', 'portfolio_id')}
    identity['environment_id'] = 'test-profile-batch'
    created = datetime.now(UTC)
    creation = SimpleNamespace(id=str(uuid4()), current_revision=0, status='draft_ready', failure_code=None,
        active_job_id=None, updated_at=created)
    jobs = [SimpleNamespace(id=str(uuid4()), sequence=i+1, status='succeeded', session_id=str(uuid4()),
        source_revision='a'*40, **identity) for i in range(5)]
    rows = {job.id: SimpleNamespace(profile=profiles.SOL_HIGH, session_id=job.session_id,
        source_revision=job.source_revision, creation_job_id=job.id, **identity) for job in jobs}
    attempts = [SimpleNamespace(id=str(uuid4()), creation_id=creation.id, job_id=job.id, sequence=i+1,
        role=('creator', 'critic', 'coordinator')[i%3], round_number=i//3+1, stage='private_draft',
        source_revision=job.source_revision, instruction_hash='b'*64, model='gpt-6.1-sol', created_at=created)
        for job in jobs for i in range(6)]
    state = SimpleNamespace(schema='ready', schemas=[], schema_reads=0, profile_reads=0, rows=rows)
    async def schema(tx):
        state.schema_reads += 1
        return state.schemas.pop(0) if state.schemas else state.schema
    monkeypatch.setattr(profiles, 'schema_state', schema)
    monkeypatch.setattr(settings(), 'creation_execution_profile', profiles.SOL_HIGH)
    monkeypatch.setattr(settings(), 'control_mode', 'local')
    monkeypatch.setattr(settings(), 'environment', 'test-profile-batch')
    class Transaction:
        async def scalar(self, query):
            sql = str(query)
            if 'control_pipeline_model_profiles' in sql:
                state.profile_reads += 1
                job_id = next(v for k, v in query.compile().params.items() if k.startswith('creation_job_id'))
                return state.rows.get(job_id)
            assert 'control_creation_revisions' in sql
            return None
        async def scalars(self, query):
            sql = str(query)
            if 'control_pipeline_model_profiles' in sql:
                state.profile_reads += 1
                identities = set(query.compile().params['creation_job_id_1'])
                assert identities == {attempt.job_id for attempt in attempts}
                return [row for row in state.rows.values() if row.creation_job_id in identities]
            if 'control_creation_jobs' in sql:
                return list(reversed(jobs))
            if 'control_creation_attempts' in sql:
                return attempts
            assert 'control_creation_team_events' in sql
            return []
    return state, Transaction(), creation, attempts


async def test_full_history_projection_uses_one_fresh_profile_read_for_all_attempts(history):
    state, tx, creation, attempts = history
    value = await team.projection(tx, creation)
    assert len(value['attempts']) == len(attempts) == 30
    assert all(a['model'] == 'gpt-6.1-sol' for a in value['attempts'])
    assert state.profile_reads == 1, 'Repeated attempts cannot repeat the same immutable job-profile SQL read'
    assert state.schema_reads <= 2


@pytest.mark.parametrize('field', ['user_id', 'organization_id', 'portfolio_id', 'environment_id', 'session_id', 'source_revision', 'profile'])
async def test_every_job_profile_binding_remains_checked(history, field):
    state, tx, creation, _ = history
    setattr(next(iter(state.rows.values())), field, 'foreign')
    with pytest.raises(ControlError) as error:
        await team.projection(tx, creation)
    assert error.value.status == 503 and error.value.code == 'invalid_content_source'


async def test_missing_high_profile_cannot_downgrade_a_sol_creator_to_default(history):
    state, tx, creation, _ = history
    state.rows = {}
    with pytest.raises(ControlError) as error:
        await team.projection(tx, creation)
    assert error.value.code == 'invalid_content_source'


async def test_profile_observations_are_fresh_on_each_new_projection(history):
    state, tx, creation, _ = history
    await team.projection(tx, creation)
    next(iter(state.rows.values())).source_revision = 'c'*40
    with pytest.raises(ControlError):
        await team.projection(tx, creation)


@pytest.mark.parametrize('schema', ['invalid', 'absent'])
async def test_invalid_or_disappeared_schema_cannot_admit_high_history(history, schema):
    state, tx, creation, _ = history
    state.schema = schema
    with pytest.raises(ControlError):
        await team.projection(tx, creation)


async def test_schema_loss_during_batch_is_observed_before_return(history):
    state, tx, creation, _ = history
    state.schemas = ['ready', 'invalid']
    with pytest.raises(ControlError):
        await team.projection(tx, creation)


@pytest.mark.parametrize('schema', ['ready', 'absent'])
async def test_legacy_default_history_still_uses_its_observed_models(history, schema):
    state, tx, creation, attempts = history
    state.schema, state.rows = schema, {}
    for attempt in attempts:
        if attempt.role == 'creator':
            attempt.model = 'gpt-6-luna'
    value = await team.projection(tx, creation)
    assert [a['model'] for a in value['attempts']] == [a.model for a in attempts]
    assert state.profile_reads == (1 if schema == 'ready' else 0)


async def test_empty_batch_does_not_add_a_schema_gate_or_database_read(history):
    state, tx, _, _ = history
    await profiles.validate_attempts(tx, 'creation', [])
    assert state.schema_reads == state.profile_reads == 0


async def test_duplicate_profile_source_cannot_silently_select_one_row(history):
    state, tx, creation, _ = history
    state.rows['duplicate'] = next(iter(state.rows.values()))
    with pytest.raises(ControlError):
        await team.projection(tx, creation)


@pytest.mark.parametrize('historical', [profiles.DEFAULT, profiles.SOL_HIGH])
async def test_history_clock_is_bound_to_observed_job_instead_of_new_config(history, monkeypatch, historical):
    state, tx, creation, attempts = history
    monkeypatch.setattr(settings(), 'creation_execution_profile', historical)
    if historical == profiles.DEFAULT:
        state.rows = {}
        for attempt in attempts:
            if attempt.role == 'creator':
                attempt.model = 'gpt-6-luna'
    first = await team.projection(tx, creation)
    monkeypatch.setattr(settings(), 'creation_execution_profile',
        profiles.DEFAULT if historical == profiles.SOL_HIGH else profiles.SOL_HIGH)
    assert await team.projection(tx, creation) == first
    assert first['deadline_seconds'] == (900 if historical == profiles.SOL_HIGH else 2*settings().creation_runner_seconds)


async def test_latest_job_without_attempts_has_a_freshly_checked_historical_clock(history, monkeypatch):
    state, tx, creation, attempts = history
    del attempts[-6:]
    monkeypatch.setattr(settings(), 'creation_execution_profile', profiles.DEFAULT)
    assert (await team.projection(tx, creation))['deadline_seconds'] == 900
    assert state.profile_reads == 2  # one batch plus this not-yet-attempted job
    list(state.rows.values())[-1].source_revision = 'c'*40
    with pytest.raises(ControlError) as error:
        await team.projection(tx, creation)
    assert error.value.code == 'invalid_content_source'
