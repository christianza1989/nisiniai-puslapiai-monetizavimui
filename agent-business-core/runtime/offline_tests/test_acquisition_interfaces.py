import json
import unittest
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from pydantic import ValidationError

from pinet_core.acquisition.interfaces import (
    CaptureHandshake,
    Invitation,
    LifecycleEvent,
    Scope,
    project_conversion,
)
from pinet_core.acquisition.transport_auth import WebhookGrant, sign_request, verify_request


class AcquisitionInterfaceTests(unittest.TestCase):
    def setUp(self):
        self.scope = Scope(business_id='synthetic-business', site_id='madbeauty',
                           environment_id='synthetic-test', environment_class='test')
        self.ref = 'synthetic_' + 'a' * 32
        self.now = datetime(2026, 10, 10, tzinfo=UTC)
        self.grant = WebhookGrant('synthetic-key', b'acquisition-v1-public-test-key-only!',
                                  'madbeauty-test', self.scope, frozenset({'events'}))
        self.path = '/integrations/acquisition/v1/sites/madbeauty/events'

    def event(self, kind='signup_started', revision=1, **overrides):
        values = dict(event_id=uuid4(), scope=self.scope, adapter_id='madbeauty-test',
                      invitation_ref=self.ref, provider_ref='synthetic-provider',
                      source_revision=revision, source_release='synthetic-release',
                      occurred_at=self.now, kind=kind)
        if kind.startswith('profile_'):
            values['profile_ref'] = 'synthetic-profile'
        if kind == 'profile_active':
            values.update(eligibility_revision='synthetic-eligibility', operator_approved=True)
        return LifecycleEvent(**(values | overrides))

    def verify(self, headers=None, body=None, **overrides):
        raw = self.event().model_dump_json().encode() if body is None else body
        stamp = int(self.now.timestamp())
        values = dict(grants={self.grant.key_id: self.grant},
                      headers=sign_request(self.grant, self.path, raw, stamp) if headers is None else headers,
                      method='POST', path=self.path, body=raw, now=stamp, scope=self.scope,
                      adapter_id='madbeauty-test', permission='events')
        return verify_request(**(values | overrides))

    def test_signature_and_case_insensitive_headers(self):
        body = self.event().model_dump_json().encode()
        headers = sign_request(self.grant, self.path, body, int(self.now.timestamp()))
        self.assertEqual(self.verify(headers={k.lower(): v for k, v in headers.items()}, body=body), self.grant)

    def test_raw_body_path_method_tampering(self):
        body = self.event().model_dump_json().encode()
        headers = sign_request(self.grant, self.path, body, int(self.now.timestamp()))
        for patch in [{'body': body + b' '}, {'path': self.path + '/other'}, {'method': 'GET'}]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                self.verify(**({'headers': headers, 'body': body} | patch))

    def test_scope_adapter_and_permission_cannot_be_escalated(self):
        for patch in [
            {'scope': self.scope.model_copy(update={'business_id': 'another-business'})},
            {'scope': self.scope.model_copy(update={'environment_id': 'another-test'})},
            {'scope': self.scope.model_copy(update={'environment_class': 'production'})},
            {'adapter_id': 'another-adapter'}, {'permission': 'resolve'},
        ]:
            with self.subTest(patch=patch), self.assertRaisesRegex(ValueError, 'grant_denied'):
                self.verify(**patch)

    def test_clock_and_unknown_key_fail(self):
        stamp = int(self.now.timestamp())
        for offset in [-301, 301]:
            with self.assertRaisesRegex(ValueError, 'clock_window'):
                self.verify(now=stamp + offset)
        body = b'{}'
        headers = sign_request(self.grant, self.path, body, stamp)
        headers['X-Acq-Key-Id'] = 'unknown-key'
        with self.assertRaisesRegex(ValueError, 'grant_denied'):
            self.verify(headers=headers, body=body)

    def test_bounded_body_and_secret_not_in_repr(self):
        with self.assertRaisesRegex(ValueError, 'body_too_large'):
            sign_request(self.grant, self.path, b'a' * 65537, 1)
        with self.assertRaises(ValueError):
            WebhookGrant('synthetic-key', b'too-short', 'a', self.scope, frozenset())
        self.assertNotIn(self.grant.secret.decode(), repr(self.grant))

    def test_invitation_requires_version_expiry_aware_time_and_opaque_ref(self):
        values = dict(scope=self.scope, invitation_ref=self.ref, campaign_id='synthetic-campaign',
                      prospect_id='synthetic-prospect', offer_revision='synthetic-offer',
                      issued_at=self.now, expires_at=self.now + timedelta(days=7))
        self.assertEqual(Invitation(**values).contract_version, '0.1.1')
        for patch in [{'contract_version': '2'}, {'expires_at': self.now}, {'invitation_ref': 'short'},
                      {'issued_at': self.now.replace(tzinfo=None)}, {'contact_email': 'person@example.test'}]:
            with self.subTest(patch=patch), self.assertRaises(ValidationError):
                Invitation(**(values | patch))

    def test_capture_cannot_claim_external_send_or_production(self):
        values = dict(scope=self.scope, adapter_id='madbeauty-test')
        self.assertFalse(CaptureHandshake(**values).external_sent)
        for patch in [{'external_sent': True}, {'external_sent': 0}, {'external_sent': 'false'},
                      {'recipient_domain': 'madbeauty.lt'},
                      {'scope': self.scope.model_copy(update={'environment_class': 'production'})}]:
            with self.subTest(patch=patch), self.assertRaises(ValidationError):
                CaptureHandshake(**(values | patch))

    def test_signup_is_not_active_and_native_approval_is_required(self):
        for kind in ['signup_started', 'account_verified', 'profile_submitted']:
            projection, state = project_conversion(None, self.event(kind))
            self.assertEqual(state, 'applied')
            self.assertFalse(projection.profile_active)
        for patch in [{'operator_approved': False}, {'eligibility_revision': None}, {'profile_ref': None}]:
            with self.subTest(patch=patch), self.assertRaises(ValidationError):
                self.event('profile_active', **patch)
        with self.assertRaises(ValidationError):
            self.event(operator_approved=True)
        for patch in [{'operator_approved': 'true'}, {'source_revision': '1'},
                      {'source_revision': True}, {'occurred_at': int(self.now.timestamp())}]:
            with self.subTest(patch=patch), self.assertRaises(ValidationError):
                LifecycleEvent.model_validate_json(
                    json.dumps(self.event('profile_active').model_dump(mode='json') | patch))

    def test_active_deactivation_and_late_events(self):
        active, _ = project_conversion(None, self.event('profile_active', 4))
        self.assertTrue(active.profile_active)
        stale, state = project_conversion(active, self.event('signup_started', 2))
        self.assertEqual((stale, state), (active, 'stale'))
        inactive, _ = project_conversion(active, self.event('profile_deactivated', 5))
        self.assertFalse(inactive.profile_active)
        replay, state = project_conversion(inactive, self.event('profile_active', 4))
        self.assertEqual((replay, state), (inactive, 'stale'))
        reactivated, _ = project_conversion(inactive, self.event('profile_active', 6))
        self.assertTrue(reactivated.profile_active)

    def test_pending_draft_preserves_current_published_eligibility(self):
        active, _ = project_conversion(None, self.event('profile_active', 4))
        submitted = self.event('profile_submitted', 5)
        updated, state = project_conversion(active, submitted)
        self.assertEqual(state, 'applied')
        self.assertTrue(updated.profile_active)
        self.assertEqual(updated.state, 'profile_active')
        self.assertEqual(updated.source_revision, 5)
        self.assertEqual(updated.last_event_id, submitted.event_id)
        inactive, _ = project_conversion(updated, self.event('profile_deactivated', 6))
        pending, _ = project_conversion(inactive, self.event('profile_submitted', 7))
        self.assertFalse(pending.profile_active)
        self.assertEqual(pending.state, 'profile_deactivated')
        stale, status = project_conversion(pending, self.event('profile_submitted', 3))
        self.assertEqual((stale, status), (pending, 'stale'))

    def test_binding_regression_and_deletion_are_enforced(self):
        active, _ = project_conversion(None, self.event('profile_active', 4))
        for event in [
            self.event('profile_active', 5, provider_ref='another-provider'),
            self.event('profile_active', 5, invitation_ref='b' * 32),
            self.event('profile_active', 5, scope=self.scope.model_copy(update={'site_id': 'another-site'})),
            self.event('profile_active', 5, profile_ref='another-profile'),
            self.event('signup_started', 5),
        ]:
            with self.assertRaises(ValueError):
                project_conversion(active, event)
        deleted, _ = project_conversion(active, self.event('account_deleted', 6))
        self.assertFalse(deleted.profile_active)
        with self.assertRaisesRegex(ValueError, 'terminal'):
            project_conversion(deleted, self.event('profile_active', 7))

    def test_json_roundtrip_preserves_unicode_and_rejects_extra(self):
        value = self.event().model_dump(mode='json')
        self.assertEqual(LifecycleEvent.model_validate_json(json.dumps(value)), self.event(
            event_id=UUID(value['event_id'])))
        with self.assertRaises(ValidationError):
            LifecycleEvent.model_validate(value | {'active_count': 100})


if __name__ == '__main__':
    unittest.main()
