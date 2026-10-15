"""Opt-in actual PostgreSQL/HTTP acceptance, separate from shared conftest/.env."""
import asyncio
import hashlib
import json
import os
import shutil
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.acquisition.identity import CODEC, canonical_recipient
from pinet_core.acquisition.interfaces import Invitation, Scope
from pinet_core.acquisition.ledger import AcquisitionLedger, apply_scope
from pinet_core.acquisition.models import AcquisitionInvitation
from pinet_core.acquisition.recipient_binding import ADDRESS_RULE, RecipientKeyGrant, recipient_digest
from pinet_core.acquisition.routes import CaptureRuntime, acquisition_router, capture_app
from pinet_core.acquisition.transport_auth import WEBHOOK_PERMISSIONS, WebhookGrant, sign_request
from pinet_core.db import Database

CONFIG_PATH = os.environ.get('PINET_ACQ_TEST_CONFIG')
pytestmark = pytest.mark.skipif(not CONFIG_PATH, reason='Explicit isolated PostgreSQL config required')


@pytest.fixture
async def lane():
    from pinet_core.acquisition.capture_config import capture_config

    config = capture_config()
    admin = create_async_engine(config['admin_database_url'])
    business_id, environment = str(uuid4()), 'capture-' + uuid4().hex
    scope = Scope(business_id=business_id, site_id='madbeauty', environment_id=environment, environment_class='test')
    async with admin.begin() as tx:
        await tx.execute(text('INSERT INTO businesses(id,site_id,canonical_host) VALUES(:id,:site,:host)'),
                         {'id': business_id, 'site': 'fixture-' + business_id,
                          'host': business_id + '.example.test'})
        # This database is disposable; preserve actual canonical site registration per independent test.
        await tx.execute(text('UPDATE businesses SET site_id=:site WHERE id=:id'),
                         {'site': 'madbeauty-' + business_id, 'id': business_id})
    scope = scope.model_copy(update={'site_id': 'madbeauty-' + business_id})
    adapter = 'madbeauty-native'
    key = RecipientKeyGrant('recipient-v1', os.urandom(32), scope, adapter)
    grant = WebhookGrant('transport-' + uuid4().hex, os.urandom(32), adapter, scope, WEBHOOK_PERMISSIONS)
    database = Database(config['database_url'])
    ledger = AcquisitionLedger(database, {(scope, adapter, key.key_id): key})
    now = [datetime.now(UTC)]
    runtime = CaptureRuntime(ledger, {grant.key_id: grant}, lambda: now[0])
    app = capture_app(runtime)
    recipient = await canonical_recipient(' Owner@EXAMPLE.TEST ', node=shutil.which('node'),
                                         expected_codec_sha256=hashlib.sha256(CODEC.read_bytes()).hexdigest())
    invitation = Invitation(scope=scope, invitation_ref=uuid4().hex + uuid4().hex,
        campaign_id='campaign-' + uuid4().hex, prospect_id='prospect-' + uuid4().hex, offer_revision='offer-v1',
        issued_at=now[0] - timedelta(seconds=10), expires_at=now[0] + timedelta(minutes=15))
    await ledger.prepare(invitation, adapter, recipient, key.key_id)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://core.test') as client:
            yield SimpleNamespace(config=config, admin=admin, scope=scope, adapter=adapter, key=key, grant=grant,
                database=database, ledger=ledger, now=now, runtime=runtime, client=client, invitation=invitation,
                recipient=recipient)
    await admin.dispose()


def request(lane):
    return {'recipient_contract_version': '0.1.0', 'scope': lane.scope.model_dump(), 'adapter_id': lane.adapter,
            'invitation_ref': lane.invitation.invitation_ref, 'request_id': str(uuid4())}


async def post(lane, endpoint, value, *, raw=None, grant=None, client=None, headers=None):
    body = raw if raw is not None else json.dumps(value, separators=(',', ':')).encode()
    path = f'/integrations/acquisition/v1/sites/{lane.scope.site_id}/{endpoint}'
    signed = sign_request(grant or lane.grant, path, body, int(lane.now[0].timestamp()))
    return await (client or lane.client).post(path, content=body, headers={**signed, **(headers or {})})


async def challenge(lane):
    value = request(lane)
    response = await post(lane, 'recipient-challenge', value)
    assert response.status_code == 200, response.text
    assert response.json()['state'] == 'issued'
    return value, response.json()['challenge'], response


def proof(lane, challenge, *, account='account-owner', email='owner@example.test'):
    return {**request(lane), 'challenge_nonce': challenge['challenge_nonce'],
            'recipient_key_id': lane.key.key_id, 'address_rule': ADDRESS_RULE,
            'recipient_digest': recipient_digest(lane.key, lane.invitation.invitation_ref,
                                                challenge['challenge_nonce'], email),
            'native_account_ref': account, 'native_verified_at': lane.now[0].isoformat(), 'source_release': 'native-test'}


def event(lane, kind, revision, **fields):
    return {'contract_version': '0.1.1', 'event_id': str(uuid4()), 'scope': lane.scope.model_dump(),
            'adapter_id': lane.adapter, 'invitation_ref': lane.invitation.invitation_ref,
            'provider_ref': 'provider-' + lane.scope.business_id, 'source_revision': revision,
            'source_release': 'native-test', 'occurred_at': lane.now[0].isoformat(), 'kind': kind, **fields}


async def bind(lane):
    _, issued, _ = await challenge(lane)
    value = proof(lane, issued)
    response = await post(lane, 'verify-recipient', value)
    assert response.status_code == 200, response.text
    return value, response


async def stored(lane):
    async with lane.database.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        await apply_scope(tx, lane.scope, lane.adapter)
        return await tx.scalar(select(AcquisitionInvitation).where(
            AcquisitionInvitation.invitation_ref == lane.invitation.invitation_ref))


@pytest.mark.asyncio
async def test_actual_identity_and_registration(lane):
    assert lane.recipient.value == 'owner@example.test'
    dotted = await canonical_recipient(' İ@EXAMPLE.TEST ', node=shutil.which('node'),
                                      expected_codec_sha256=hashlib.sha256(CODEC.read_bytes()).hexdigest())
    assert dotted.value == 'i\u0307@example.test'
    with pytest.raises(ValueError, match='source_mismatch'):
        await canonical_recipient('owner@example.test', node=shutil.which('node'), expected_codec_sha256='0' * 64)
    with pytest.raises(ValueError, match='separate_registered'):
        CaptureRuntime(lane.ledger, {lane.grant.key_id: WebhookGrant(lane.grant.key_id, lane.key.secret,
            lane.adapter, lane.scope, WEBHOOK_PERMISSIONS)})
    response = await post(lane, 'capture-handshake', {'scope': lane.scope.model_dump(), 'adapter_id': lane.adapter})
    assert response.status_code == 200 and response.json()['external_sent'] is False


@pytest.mark.asyncio
async def test_replay_original_bytes_and_changed_uuid(lane):
    value, issued, original = await challenge(lane)
    lane.now[0] += timedelta(minutes=20)
    replay = await post(lane, 'recipient-challenge', value)
    assert replay.content == original.content and replay.status_code == 200
    changed = await post(lane, 'recipient-challenge', value, raw=json.dumps(value, indent=2).encode())
    assert changed.status_code == 409
    fresh = await post(lane, 'recipient-challenge', request(lane))
    assert fresh.json()['state'] == 'expired'
    assert issued['expires_at'] <= lane.invitation.expires_at.isoformat().replace('+00:00', 'Z')


@pytest.mark.asyncio
async def test_wrong_forwarded_candidate_does_not_consume_or_preempt(lane):
    _, wrong_nonce, _ = await challenge(lane)
    wrong = proof(lane, wrong_nonce, account='account-wrong', email='wrong@example.test')
    rejected = await post(lane, 'verify-recipient', wrong)
    assert rejected.status_code == 403
    assert (await stored(lane)).native_account_ref is None
    _, intended_nonce, _ = await challenge(lane)
    correct = proof(lane, intended_nonce)
    response = await post(lane, 'verify-recipient', correct)
    assert response.status_code == 200 and response.json()['external_sent'] is False
    assert (await stored(lane)).native_account_ref == 'account-owner'
    consumed = {**correct, 'request_id': str(uuid4())}
    assert (await post(lane, 'verify-recipient', consumed)).status_code == 409
    lane.now[0] += timedelta(minutes=20)
    assert (await post(lane, 'verify-recipient', correct)).content == response.content


@pytest.mark.asyncio
async def test_proof_expiry_and_stop(lane):
    _, issued, _ = await challenge(lane)
    value = proof(lane, issued)
    lane.now[0] += timedelta(seconds=301)
    assert (await post(lane, 'verify-recipient', value)).status_code == 410
    lane.now[0] -= timedelta(seconds=301)
    await lane.ledger.stop(lane.scope, lane.adapter, lane.invitation.campaign_id)
    assert (await post(lane, 'verify-recipient', value)).status_code == 409
    assert (await post(lane, 'recipient-challenge', request(lane))).json()['state'] == 'stopped'


@pytest.mark.asyncio
async def test_lifecycle_replay_revision_publication_and_terminal(lane):
    await bind(lane)
    signup = event(lane, 'signup_started', 1)
    accepted = await post(lane, 'events', signup)
    assert accepted.status_code == 200 and accepted.json()['profile_active'] is False
    assert (await post(lane, 'events', signup)).content == accepted.content
    assert (await post(lane, 'events', {**signup, 'event_id': str(uuid4())})).status_code == 409
    active = event(lane, 'profile_active', 4, profile_ref='profile-owner',
                   eligibility_revision='published-v3', operator_approved=True)
    assert (await post(lane, 'events', active)).json()['profile_active'] is True
    draft = event(lane, 'profile_submitted', 5, profile_ref='profile-owner')
    assert (await post(lane, 'events', draft)).json()['profile_active'] is True
    stale = event(lane, 'account_verified', 2)
    assert (await post(lane, 'events', stale)).json()['state'] == 'stale'
    await lane.ledger.stop(lane.scope, lane.adapter, lane.invitation.campaign_id)
    lane.now[0] += timedelta(minutes=20)
    deactivated = event(lane, 'profile_deactivated', 6, profile_ref='profile-owner')
    assert (await post(lane, 'events', deactivated)).json()['profile_active'] is False
    deleted = event(lane, 'account_deleted', 17)
    assert (await post(lane, 'events', deleted)).status_code == 200
    record = await stored(lane)
    assert record.canonical_recipient is None and record.native_account_ref is None
    assert record.conversion['state'] == 'account_deleted'
    late = await post(lane, 'events', event(lane, 'profile_submitted', 3, profile_ref='profile-owner'))
    assert late.status_code == 200 and late.json()['state'] == 'stale'
    assert late.json()['profile_active'] is False
    assert (await stored(lane)).conversion['state'] == 'account_deleted'
    fingerprint = record.retired_account_hash
    late_delete = await post(lane, 'events', event(lane, 'account_deleted', 8))
    assert late_delete.status_code == 200 and late_delete.json()['state'] == 'stale'
    assert (await stored(lane)).retired_account_hash == fingerprint
    assert (await post(lane, 'events', event(lane, 'signup_started', 18))).status_code == 409


@pytest.mark.asyncio
async def test_concurrent_duplicate_proof_and_provider_binding(lane):
    _, issued, _ = await challenge(lane)
    value = proof(lane, issued)
    responses = await asyncio.gather(*(post(lane, 'verify-recipient', value) for _ in range(6)))
    assert all(r.status_code == 200 and r.content == responses[0].content for r in responses)
    variants = [event(lane, 'signup_started', 1) for _ in range(5)]
    replies = await asyncio.gather(*(post(lane, 'events', v) for v in variants))
    assert sorted(r.status_code for r in replies) == [200, 409, 409, 409, 409]


def retirement(lane, prepared=None, account='account-owner'):
    return {'scope': lane.scope.model_dump(), 'adapter_id': lane.adapter,
            'invitation_ref': lane.invitation.invitation_ref, 'request_id': str(uuid4()),
            'native_account_ref': account, 'occurred_at': lane.now[0].isoformat(), 'source_release': 'native-test',
            'reason': 'account_erasure', 'recipient_proof': prepared}


@pytest.mark.asyncio
async def test_privacy_before_binding_and_wrong_candidate(lane):
    _, issued, _ = await challenge(lane)
    wrong = proof(lane, issued, account='account-wrong', email='wrong@example.test')
    receipt = await post(lane, 'retire-recipient', retirement(lane, wrong, 'account-wrong'))
    assert receipt.status_code == 200 and receipt.json()['state'] == 'candidate_retired'
    assert (await stored(lane)).canonical_recipient == 'owner@example.test'
    prepared = proof(lane, issued)
    lane.now[0] += timedelta(minutes=20)
    await lane.ledger.stop(lane.scope, lane.adapter, lane.invitation.campaign_id)
    value = retirement(lane, prepared)
    retired = await post(lane, 'retire-recipient', value)
    assert retired.status_code == 200 and retired.json()['state'] == 'recipient_retired'
    assert (await post(lane, 'retire-recipient', value)).content == retired.content
    record = await stored(lane)
    assert record.retired_at and record.canonical_recipient is None and record.native_account_ref is None
    assert record.provider_ref is None and record.conversion is None
    assert (await post(lane, 'verify-recipient', prepared)).status_code == 409


@pytest.mark.asyncio
async def test_scope_auth_and_forced_rls(lane):
    value = request(lane)
    for field, changed in [('business_id', str(uuid4())), ('environment_id', 'foreign'),
                           ('environment_class', 'production'), ('site_id', 'foreign')]:
        foreign = {**value, 'scope': {**value['scope'], field: changed}}
        assert (await post(lane, 'recipient-challenge', foreign)).status_code == 401
    bad = await post(lane, 'recipient-challenge', {**value, 'unknown': True})
    assert bad.status_code == 422
    assert (await post(lane, 'recipient-challenge', value, headers={'X-Acq-Signature': 'v1=' + '0' * 64})).status_code == 401
    async with lane.database.registry() as tx:
        assert await tx.scalar(text('SELECT count(*) FROM acquisition_invitations')) == 0
    async with lane.database.transaction(lane.scope.business_id, lane.scope.environment_id) as tx:
        await apply_scope(tx, lane.scope.model_copy(update={'site_id': 'foreign'}), lane.adapter)
        assert await tx.scalar(text('SELECT count(*) FROM acquisition_invitations')) == 0
    async with lane.admin.begin() as tx:
        rows = (await tx.execute(text("SELECT relrowsecurity,relforcerowsecurity FROM pg_class "
            "WHERE relname LIKE 'acquisition_%' AND relkind='r'"))).all()
        assert len(rows) == 4 and all(enabled and forced for enabled, forced in rows)


@pytest.mark.asyncio
async def test_api_engine_restart_and_immutable_receipt(lane):
    value, original = await bind(lane)
    await lane.database.engine.dispose()
    rebuilt = AcquisitionLedger(Database(lane.config['database_url']), lane.ledger.recipient_keys)
    app = capture_app(CaptureRuntime(rebuilt, lane.runtime.grants, lambda: lane.now[0]))
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://restart.test') as client:
            replay = await post(lane, 'verify-recipient', value, client=client)
            assert replay.status_code == 200 and replay.content == original.content
    from fastapi import FastAPI

    disabled = FastAPI()
    disabled.include_router(acquisition_router())
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=disabled), base_url='http://disabled.test') as client:
        assert (await post(lane, 'verify-recipient', value, client=client)).status_code == 503


@pytest.mark.asyncio
async def test_unknown_refs_body_limit_permissions_and_receipt_privileges(lane):
    value = {**request(lane), 'invitation_ref': uuid4().hex + uuid4().hex}
    assert (await post(lane, 'recipient-challenge', value)).status_code == 404
    path = f'/integrations/acquisition/v1/sites/{lane.scope.site_id}/recipient-challenge'
    # The canonical signer correctly refuses oversized input; send it directly
    # to independently test the HTTP streaming limit before parsing/auth.
    assert (await lane.client.post(path, content=b' ' * 65537)).status_code == 413
    limited = WebhookGrant(lane.grant.key_id, lane.grant.secret, lane.adapter, lane.scope, frozenset({'resolve'}))
    runtime = CaptureRuntime(lane.ledger, {limited.key_id: limited}, lambda: lane.now[0])
    app = capture_app(runtime)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://limited.test') as client:
        denied = await post(lane, 'recipient-challenge', request(lane), client=client)
        assert denied.status_code == 401
    async with lane.database.registry() as tx:
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'acquisition_receipts','UPDATE')"))
        assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'acquisition_receipts','DELETE')"))


@pytest.mark.asyncio
async def test_provider_binding_rejects_late_initial_and_unverified(lane):
    assert (await post(lane, 'events', event(lane, 'signup_started', 1))).status_code == 409
    await bind(lane)
    lane.now[0] += timedelta(minutes=20)
    assert (await post(lane, 'events', event(lane, 'signup_started', 1))).status_code == 410
    assert (await stored(lane)).provider_ref is None


@pytest.mark.asyncio
async def test_proof_replay_after_retirement_does_not_restore_state(lane):
    prepared, original = await bind(lane)
    wrong = await post(lane, 'retire-recipient', retirement(lane, account='account-wrong'))
    assert wrong.json()['state'] == 'candidate_retired'
    assert (await stored(lane)).native_account_ref == 'account-owner'
    value = retirement(lane)
    retired = await post(lane, 'retire-recipient', value)
    assert retired.status_code == 200 and retired.json()['state'] == 'recipient_retired'
    replay = await post(lane, 'verify-recipient', prepared)
    assert replay.content == original.content
    assert (await stored(lane)).retired_at and (await stored(lane)).native_account_ref is None
    # Historical ACK is evidence only; a fresh command never resurrects the aggregate.
    assert (await post(lane, 'events', event(lane, 'signup_started', 1))).status_code == 409


@pytest.mark.asyncio
async def test_capture_refuses_widened_receipt_grants(lane):
    async with lane.admin.begin() as tx:
        await tx.execute(text('GRANT UPDATE ON acquisition_receipts TO pinet_runtime'))
    try:
        app = capture_app(lane.runtime)
        with pytest.raises(RuntimeError, match='immutable receipt privileges'):
            async with app.router.lifespan_context(app):
                pass
    finally:
        async with lane.admin.begin() as tx:
            await tx.execute(text('REVOKE UPDATE ON acquisition_receipts FROM pinet_runtime'))


@pytest.mark.asyncio
async def test_module_grant_repair_preserves_receipts_and_refuses_runtime_delete(lane):
    from sqlalchemy.exc import DBAPIError

    from pinet_core.acquisition.ledger_schema import TABLES, runtime_grants_sql

    app = capture_app(lane.runtime)
    body = {**request(lane), 'contract_version': '0.1.1'}
    del body['recipient_contract_version']
    original = await post(lane, 'resolve-invitation', body)
    assert original.status_code == 200
    async with lane.admin.begin() as tx:
        before = (await tx.execute(text("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class "
            "WHERE relname IN ('acquisition_campaigns','acquisition_invitations',"
            "'acquisition_challenges','acquisition_receipts') ORDER BY relname"))).all()
        for table in TABLES:
            await tx.execute(text(f'GRANT UPDATE,DELETE ON {table} TO pinet_runtime'))
    try:
        with pytest.raises(RuntimeError, match='immutable receipt privileges'):
            async with app.router.lifespan_context(app):
                pass
        for _ in range(2):
            async with lane.admin.begin() as tx:
                for statement in runtime_grants_sql():
                    await tx.execute(text(statement))
                after = (await tx.execute(text("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class "
                    "WHERE relname IN ('acquisition_campaigns','acquisition_invitations',"
                    "'acquisition_challenges','acquisition_receipts') ORDER BY relname"))).all()
                assert after == before
            async with app.router.lifespan_context(app):
                async with lane.database.registry() as tx:
                    for table in TABLES:
                        assert not await tx.scalar(text(f"SELECT has_table_privilege(current_user,'{table}','DELETE')"))
                    assert not await tx.scalar(text("SELECT has_table_privilege(current_user,'acquisition_receipts','UPDATE')"))
        with pytest.raises(DBAPIError) as error:
            async with lane.database.registry() as tx:
                await apply_scope(tx, lane.scope, lane.adapter)
                await tx.execute(text('DELETE FROM acquisition_receipts WHERE business_id=:business'),
                                 {'business': lane.scope.business_id})
        assert error.value.orig.sqlstate == '42501'
        assert (await post(lane, 'resolve-invitation', body)).content == original.content
    finally:
        async with lane.admin.begin() as tx:
            for statement in runtime_grants_sql():
                await tx.execute(text(statement))
