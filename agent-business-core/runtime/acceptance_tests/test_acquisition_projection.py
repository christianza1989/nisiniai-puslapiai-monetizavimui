"""Actual scoped DB projection; reuse owned isolated lane without shared conftest."""
from contextlib import asynccontextmanager
from datetime import timedelta
from uuid import uuid4

import pytest
from test_acquisition_ledger import bind, event, lane, post, request, retirement

from pinet_core.acquisition.interfaces import Invitation
from pinet_core.acquisition.projection import CaptureLedgerSnapshot, capture_snapshot, snapshot_digest

# Imported pytest fixture is intentionally reused; no independent shared DB/bootstrap.
__all__ = ['lane']


@pytest.mark.asyncio
async def test_current_metrics_do_not_replay_old_activation_or_binding(lane):
    prepared, original = await bind(lane)
    await post(lane, 'events', event(lane, 'signup_started', 1))
    await post(lane, 'events', event(lane, 'profile_active', 2, profile_ref='profile-owner',
                                   eligibility_revision='published-v1', operator_approved=True))
    active = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter)
    assert active.counts.currently_bound_recipients == 1 and active.counts.active_providers_in_core == 1
    assert active.counts.historical_active_providers_in_core == 1
    response = await post(lane, 'retire-recipient', retirement(lane))
    assert response.status_code == 200
    assert (await post(lane, 'verify-recipient', prepared)).content == original.content
    after = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter)
    assert after.counts.currently_bound_recipients == 0 and after.counts.active_providers_in_core == 0
    assert after.counts.currently_attributed_providers == 0 and after.counts.retired_invitations == 1
    assert after.counts.historical_recipient_bindings == 1 and after.counts.historical_active_providers_in_core == 1
    assert after.counts.committed_commands == 5
    assert after.counts.outreach_sent is None and after.counts.received_replies is None
    assert after.full_pipeline_accepted is False and after.external_sent is False
    assert after.content_sha256 == snapshot_digest(after)
    # Both UI and chat consume this exact DTO, not separately derived counters.
    assert CaptureLedgerSnapshot.model_validate_json(after.model_dump_json()) == after
    import json

    for flag in ('external_sent', 'full_pipeline_accepted'):
        bad = after.model_dump(mode='json')
        bad[flag] = 0
        with pytest.raises(ValueError):
            CaptureLedgerSnapshot.model_validate_json(json.dumps(bad))
    wire = after.model_dump_json()
    for private in ('owner@example.test', 'native_account_ref', 'challenge_nonce', 'recipient_key_id',
                    'body_sha256', 'recipient_digest', 'canonical_recipient', 'profile-owner'):
        assert private not in wire


@pytest.mark.asyncio
async def test_other_scope_and_campaign_stop_have_explicit_coverage(lane):
    view = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter, now=lane.now[0])
    assert view.counts.invitations == 1 and view.counts.available_unbound_invitations == 1
    await lane.ledger.stop(lane.scope, lane.adapter, lane.invitation.campaign_id)
    stopped = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter, now=lane.now[0])
    assert stopped.counts.stopped_campaigns == 1 and stopped.counts.available_unbound_invitations == 0
    expired = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter,
                                     now=lane.now[0] + timedelta(hours=1))
    assert expired.counts.expired_unbound_invitations == 1
    foreign = await capture_snapshot(lane.database, scope=lane.scope.model_copy(update={'environment_id': 'foreign'}),
                                     adapter_id=lane.adapter)
    assert foreign.counts.invitations == 0 and foreign.recent_committed_activity == ()
    assert foreign.last_committed_receipt_at is None and foreign.counts.outreach_sent is None
    with pytest.raises(ValueError, match='capture_projection_scope'):
        await capture_snapshot(lane.database, scope=lane.scope.model_copy(update={'environment_class': 'production'}),
                               adapter_id=lane.adapter)


@pytest.mark.asyncio
async def test_activity_is_bounded_and_not_a_full_attempt_log(lane):
    # Genuine accepted commands, not fabricated receipt rows; varied UUIDs remain durable.
    for _ in range(51):
        body = {**request(lane), 'contract_version': '0.1.1'}
        del body['recipient_contract_version']
        assert (await post(lane, 'resolve-invitation', body)).status_code == 200
    current = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter)
    assert len(current.recent_committed_activity) == 50 and current.activity_truncated
    assert current.counts.committed_commands == 51 and current.counts.failed_attempts is None
    assert all(row.operation == 'resolve' and row.outcome == 'available' for row in current.recent_committed_activity)
    assert 'native_outbox' in current.missing_sources


@pytest.mark.asyncio
async def test_multiple_campaigns_counts_use_scoped_parent_join(lane):
    another = Invitation(scope=lane.scope, invitation_ref=uuid4().hex + uuid4().hex,
        campaign_id='campaign-' + uuid4().hex, prospect_id='prospect-' + uuid4().hex, offer_revision='offer-v1',
        issued_at=lane.now[0], expires_at=lane.now[0] + timedelta(minutes=10))
    await lane.ledger.prepare(another, lane.adapter, lane.recipient, lane.key.key_id)
    view = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter, now=lane.now[0])
    assert view.counts.campaigns == 2 and view.counts.invitations == 2
    assert view.counts.available_unbound_invitations == 2 and view.counts.committed_commands == 0


@pytest.mark.asyncio
async def test_report_is_one_snapshot_when_stop_commits_between_reads(lane):
    class InterleavedSession:
        def __init__(self, session):
            self.session, self.changed = session, False

        async def execute(self, statement, *args, **kwargs):
            result = await self.session.execute(statement, *args, **kwargs)
            if not self.changed and 'FROM acquisition_campaigns' in str(statement):
                self.changed = True
                # Real committed mutation on a separate connection during the read.
                await lane.ledger.stop(lane.scope, lane.adapter, lane.invitation.campaign_id)
            return result

        def __getattr__(self, name):
            return getattr(self.session, name)

    class InterleavedDatabase:
        @asynccontextmanager
        async def registry(self):
            async with lane.database.registry() as tx:
                yield InterleavedSession(tx)

    before = await capture_snapshot(InterleavedDatabase(), scope=lane.scope, adapter_id=lane.adapter,
                                    now=lane.now[0])
    assert before.counts.stopped_campaigns == 0 and before.counts.available_unbound_invitations == 1
    after = await capture_snapshot(lane.database, scope=lane.scope, adapter_id=lane.adapter, now=lane.now[0])
    assert after.counts.stopped_campaigns == 1 and after.counts.available_unbound_invitations == 0
