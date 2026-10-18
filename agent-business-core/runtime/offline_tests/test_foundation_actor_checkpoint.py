"""Exercise the actual capture prefix; stop before independent ownership work."""
import copy
from types import SimpleNamespace as Row
from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql

from pinet_core.config import settings
from pinet_core.control.models import Session, User
from pinet_core.control.routes import ControlError
from pinet_core.site_build import foundation


class OwnershipReached(Exception):
    pass


@pytest.fixture
def checkpoint(monkeypatch):
    monkeypatch.setattr(settings(), 'environment', 'test-foundation-actor')
    owner, identity = str(uuid4()), str(uuid4())
    native = Row(id=identity, user_id=owner, environment_id=settings().environment, generation='fresh')
    f = Row(native=native, carried=copy.deepcopy(native), user=True, enabled=True,
        actor=[owner, settings().environment], queries=[], reached=[])
    f.carried.generation = 'stale'
    def visible():
        return (f.native is not None and f.native.id == f.carried.id
            and f.native.user_id == f.carried.user_id and f.native.environment_id == settings().environment)
    class Tx:
        async def scalar(self, statement):
            f.queries.append(statement)
            entity = statement.column_descriptions[0]['entity']
            if entity is Session:
                joined = 'JOIN control_users' in str(statement)
                permitted = visible() and (not joined or f.user and f.enabled
                    and tuple(f.actor) == (f.carried.user_id, settings().environment))
                return f.native if permitted else None
            assert entity is User
            return owner if f.user and f.enabled else None
        async def execute(self, statement):
            f.queries.append(statement)
            if not hasattr(statement, 'column_descriptions'):
                return Row(one=lambda: tuple(f.actor))
            value = (f.native, *f.actor) if visible() and f.user and f.enabled else None
            return Row(one_or_none=lambda: value)
    f.tx = Tx()
    async def guard():
        return None
    async def owned(tx, session, creation):
        f.reached.append(session)
        raise OwnershipReached
    monkeypatch.setattr(foundation, 'guard', guard)
    monkeypatch.setattr(foundation, 'owned', owned)
    return f


async def test_entry_actor_is_one_fresh_statement_and_passes_the_refreshed_session(checkpoint):
    f = checkpoint
    with pytest.raises(OwnershipReached):
        await foundation.capture(f.tx, f.carried, str(uuid4()))
    assert f.reached == [f.native] and f.reached[0].generation == 'fresh'
    assert len(f.queries) == 1, 'One checkpoint must not perform three serial actor roundtrips'
    statement = f.queries[0]
    assert statement.get_execution_options()['populate_existing'] is True
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert 'JOIN control_users' in sql and 'control_users.enabled' in sql
    assert "current_setting('pinet.control_user',true)" in sql
    assert "current_setting('pinet.environment',true)" in sql
    assert 'FOR UPDATE' not in sql


@pytest.mark.parametrize('change', ['session_missing', 'foreign_user', 'foreign_environment',
    'user_hidden', 'user_disabled', 'actor_user', 'actor_environment'])
async def test_invalid_actor_is_native_401_before_independent_owned_checkpoint(checkpoint, change):
    f = checkpoint
    if change == 'session_missing':
        f.native = None
    elif change == 'foreign_user':
        f.native.user_id = str(uuid4())
    elif change == 'foreign_environment':
        f.native.environment_id = 'test-other-environment'
    elif change == 'user_hidden':
        f.user = False
    elif change == 'user_disabled':
        f.enabled = False
    elif change == 'actor_user':
        f.actor[0] = str(uuid4())
    else:
        f.actor[1] = 'test-other-environment'
    with pytest.raises(ControlError) as error:
        await foundation.capture(f.tx, f.carried, str(uuid4()))
    assert error.value.status == 401 and error.value.code == 'unauthenticated' and f.reached == []


async def test_next_capture_cannot_reuse_a_prior_successful_actor(checkpoint):
    f = checkpoint
    with pytest.raises(OwnershipReached):
        await foundation.capture(f.tx, f.carried, str(uuid4()))
    f.enabled = False
    with pytest.raises(ControlError) as error:
        await foundation.capture(f.tx, f.carried, str(uuid4()))
    assert error.value.status == 401 and len(f.reached) == 1
