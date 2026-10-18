"""Restricted SQL callback freshness and refusal priority; no model or renderer."""
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import event, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from test_creation_registration import accepted
from test_customer_creations import creation as creation_fixture
from test_customer_creations import start
from test_customer_public import customers, verified  # noqa: F401

from pinet_core.config import settings
from pinet_core.content_completion import service
from pinet_core.control.models import Membership, Session, User
from pinet_core.control.routes import ControlError, scope, token_hash
from pinet_core.creation import studio
from pinet_core.creation.models import Creation
from pinet_core.customer.models import Account
from pinet_core.customer_text.service import customer_session
from pinet_core.db import db
from pinet_core.models import utcnow

creation = creation_fixture


async def test_transport_callbacks_each_observe_current_actor_and_revision_in_one_query(creation, monkeypatch):
    c = creation
    request, _, auth, _ = await accepted(c)
    token = auth['Authorization'][7:]
    observations = []

    async def transport(arguments, payload, environment, authorized, seconds, **kwargs):
        # Exercise the real SQL authorization callback at three transport fences.
        # The final post-output callback still runs in read_current_node itself.
        for _ in range(3):
            statements = []
            def queried(connection, cursor, statement, parameters, context, executemany):
                statements.append(statement)
            event.listen(db.engine.sync_engine, 'before_cursor_execute', queried)
            try:
                assert await authorized()
            finally:
                event.remove(db.engine.sync_engine, 'before_cursor_execute', queried)
            observations.append(len(statements))
        return {'synthetic_node_output': True}

    monkeypatch.setattr(studio, '_execute', transport)
    async with scope(token=token_hash(token)) as tx:
        actor = await customer_session(tx, token)
        parent = await tx.get(Creation, request['creation_id'])
        proof, output = await service.read_current_node(tx, actor, parent)
    assert output == {'synthetic_node_output': True} and proof['accepted_revision'] == 1
    assert observations == [1, 1, 1], observations


@pytest.mark.parametrize('change,status', [('revoked', 401), ('revision', 503)])
async def test_final_post_output_fence_rejects_committed_authority_change(creation, monkeypatch, change, status):
    c = creation
    request, _, auth, _ = await accepted(c)
    token = auth['Authorization'][7:]
    async def transport(arguments, payload, environment, authorized, seconds, **kwargs):
        assert await authorized()
        async with AsyncSession(c['admin']) as admin, admin.begin():
            if change == 'revoked':
                await admin.execute(update(Session).where(Session.id == request['authorizing_session_id'])
                    .values(revoked_at=utcnow()))
            else:
                await admin.execute(update(Creation).where(Creation.id == request['creation_id'])
                    .values(current_revision=2))
        # Permission changed after the transport's last successful check. The
        # caller's separate final fence must refuse this otherwise valid output.
        return {'must_never_be_returned': True}
    monkeypatch.setattr(studio, '_execute', transport)
    async with scope(token=token_hash(token)) as tx:
        actor = await customer_session(tx, token)
        parent = await tx.get(Creation, request['creation_id'])
        with pytest.raises(ControlError) as error:
            await service.read_current_node(tx, actor, parent)
        assert error.value.status == status


async def test_fresh_sql_refuses_actor_child_and_source_mutations_without_cached_permission(creation):
    c = creation
    request, _, auth, me = await accepted(c)
    _, foreign_auth, foreign_me = await verified(c)
    foreign_parent, _ = await start(c, foreign_auth, foreign_me)
    token = auth['Authorization'][7:]
    async with AsyncSession(c['admin']) as admin:
        stored_session = await admin.get(Session, request['authorizing_session_id'])
        expiry = stored_session.expires_at
        account = await admin.scalar(select(Account).where(Account.user_id == me['user_id'],
            Account.environment_id == c['environment']))
        verified_at = account.verified_at
        account_id = account.id

    async def change(model, predicates, values):
        async with AsyncSession(c['admin']) as admin, admin.begin():
            await admin.execute(update(model).where(*predicates).values(**values))

    async with scope(token=token_hash(token)) as tx:
        actor = await customer_session(tx, token)
        parent = await tx.get(Creation, request['creation_id'])
        pin = settings().control_source_revision
        async def allowed(candidate=parent, source_pin=pin):
            return await service._node_authorized(tx, actor, candidate, revision=1, source_pin=source_pin)
        assert await allowed()
        # Retain a populated ORM identity map while admin mutations commit on a
        # different connection. Every callback must independently see the change.
        mutations = [
            (User, (User.id == me['user_id'],), {'enabled': False}, {'enabled': True}, 401),
            (Session, (Session.id == actor.id,), {'revoked_at': utcnow()}, {'revoked_at': None}, 401),
            (Session, (Session.id == actor.id,), {'expires_at': utcnow()-timedelta(seconds=1)}, {'expires_at': expiry}, 401),
            (Account, (Account.id == account_id,), {'verified_at': None}, {'verified_at': verified_at}, 404),
            (Membership, (Membership.user_id == me['user_id'], Membership.environment_id == c['environment']),
                {'enabled': False}, {'enabled': True}, 404),
        ]
        missing = SimpleNamespace(id=str(uuid4()), portfolio_id=parent.portfolio_id)
        for model, predicates, broken, restored, status in mutations:
            await change(model, predicates, broken)
            try:
                for candidate in (parent, missing):
                    try:
                        await allowed(candidate)
                    except ControlError as error:
                        assert error.status == status
                    else:
                        raise AssertionError('fresh actor refusal was lost')
            finally:
                await change(model, predicates, restored)
            assert await allowed()
        assert not await allowed(missing)
        # This child exists for another customer, but remains NULL under RLS.
        hidden = SimpleNamespace(id=foreign_parent['creation_id'], portfolio_id=parent.portfolio_id)
        assert not await allowed(hidden)
        foreign_portfolio = SimpleNamespace(id=parent.id, portfolio_id=foreign_me['portfolios'][0]['portfolio_id'])
        try:
            await allowed(foreign_portfolio)
        except ControlError as error:
            assert error.status == 404
        else:
            raise AssertionError('foreign portfolio must remain hidden')
        await change(Creation, (Creation.id == parent.id,), {'current_revision': 2})
        try:
            assert not await allowed()
        finally:
            await change(Creation, (Creation.id == parent.id,), {'current_revision': 1})
        assert not await allowed(source_pin='b'*40)
        assert await allowed()
