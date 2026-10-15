import json
import unittest
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from pydantic import ValidationError

from pinet_core.acquisition.interfaces import ResolveRequest, Scope
from pinet_core.acquisition.recipient_binding import (
    ADDRESS_RULE,
    RecipientChallenge,
    RecipientChallengeReceipt,
    RecipientKeyGrant,
    RecipientProofReceipt,
    RecipientProofRequest,
    matches_recipient_digest,
    new_recipient_challenge,
    recipient_digest,
)
from pinet_core.acquisition.transport_auth import WebhookGrant, sign_request, verify_request


class RecipientBindingTests(unittest.TestCase):
    def setUp(self):
        self.scope = Scope(business_id='business-test', site_id='madbeauty',
                           environment_id='capture-native', environment_class='test')
        self.key = RecipientKeyGrant('recipient-test-v1', bytes(range(1, 33)), self.scope, 'madbeauty-native')
        self.ref, self.nonce = 'I' * 32, 'C' * 32
        self.now = datetime(2026, 10, 10, 1, tzinfo=UTC)
        self.canonical = 'owner@example.test'

    def proof(self):
        return dict(scope=self.scope, adapter_id=self.key.adapter_id, invitation_ref=self.ref,
                    request_id=uuid4(), challenge_nonce=self.nonce, recipient_key_id=self.key.key_id,
                    address_rule=ADDRESS_RULE, native_account_ref='account_synthetic',
                    native_verified_at=self.now, source_release='synthetic-native',
                    recipient_digest=recipient_digest(self.key, self.ref, self.nonce, self.canonical))

    def test_native_fixed_vector_and_no_implicit_normalization(self):
        digest = recipient_digest(self.key, self.ref, self.nonce, self.canonical)
        self.assertEqual(digest, 'v1=a39e849704152919e268adec4d97256611429ed7ed9f0eae2ac678615476bdf4')
        self.assertTrue(matches_recipient_digest(self.key, self.ref, self.nonce, self.canonical, digest))
        self.assertFalse(matches_recipient_digest(self.key, self.ref, self.nonce, 'Owner@example.test', digest))
        self.assertFalse(matches_recipient_digest(self.key, self.ref, self.nonce, 'other@example.test', digest))

    def test_scope_key_adapter_nonce_and_invitation_are_separate(self):
        digest = recipient_digest(self.key, self.ref, self.nonce, self.canonical)
        for key in [replace(self.key, key_id='another-key'), replace(self.key, adapter_id='another-native'),
                    replace(self.key, secret=b'z' * 32)]:
            self.assertFalse(matches_recipient_digest(key, self.ref, self.nonce, self.canonical, digest))
        for name, value in [('business_id', 'other-business'), ('site_id', 'other-site'),
                            ('environment_id', 'other-env'), ('environment_class', 'production')]:
            changed = replace(self.key, scope=Scope(**(self.scope.model_dump() | {name: value})))
            self.assertFalse(matches_recipient_digest(changed, self.ref, self.nonce, self.canonical, digest))
        for ref, nonce in [('J' * 32, self.nonce), (self.ref, 'D' * 32)]:
            self.assertFalse(matches_recipient_digest(self.key, ref, nonce, self.canonical, digest))

    def test_invalid_key_token_digest_and_unicode_fail_closed(self):
        for change in [{'secret': b'x' * 31}, {'secret': 'x' * 32}, {'address_rule': 'unregistered'}]:
            with self.assertRaises(ValueError):
                replace(self.key, **change)
        self.assertNotIn(self.key.secret.hex(), repr(self.key))
        for digest in ['v1=' + 'A' * 64, 'v1=' + '0' * 63, None]:
            self.assertFalse(matches_recipient_digest(self.key, self.ref, self.nonce, self.canonical, digest))
        for email in [False, '', '\ud800']:
            self.assertFalse(matches_recipient_digest(self.key, self.ref, self.nonce, email, 'v1=' + '0' * 64))
        self.assertFalse(matches_recipient_digest(self.key, self.ref + '\n', self.nonce,
                                                 self.canonical, 'v1=' + '0' * 64))

    def test_challenge_uses_rng_and_never_extends_invitation(self):
        value = new_recipient_challenge(self.key, self.now, self.now + timedelta(days=1))
        self.assertEqual(len(value.challenge_nonce), 32)
        self.assertEqual(value.expires_at, self.now + timedelta(minutes=5))
        shorter = new_recipient_challenge(self.key, self.now, self.now + timedelta(seconds=10))
        self.assertEqual(shorter.expires_at, self.now + timedelta(seconds=10))
        for expiry in [self.now, self.now - timedelta(seconds=1)]:
            with self.assertRaisesRegex(ValueError, 'expired'):
                new_recipient_challenge(self.key, self.now, expiry)
        with self.assertRaisesRegex(ValueError, 'aware'):
            new_recipient_challenge(self.key, self.now.replace(tzinfo=None), value.expires_at)

    def test_challenge_shapes_reject_unavailable_nonce_and_overlong_life(self):
        challenge = new_recipient_challenge(self.key, self.now, self.now + timedelta(minutes=1))
        receipt = dict(scope=self.scope, adapter_id=self.key.adapter_id, invitation_ref=self.ref,
                       request_id=uuid4(), state='issued', challenge=challenge)
        self.assertIsNotNone(RecipientChallengeReceipt(**receipt).challenge)
        for change in [{'state': 'expired'}, {'challenge': None}, {'external_sent': 0}]:
            with self.assertRaises(ValidationError):
                RecipientChallengeReceipt(**(receipt | change))
        with self.assertRaises(ValidationError):
            RecipientChallenge(**(challenge.model_dump() | {'expires_at': self.now + timedelta(seconds=301)}))

    def test_proof_is_strict_account_attestation_not_provider_conversion(self):
        proof = RecipientProofRequest(**self.proof())
        self.assertEqual(proof.recipient_contract_version, '0.1.0')
        for change in [{'canonical_email': self.canonical}, {'provider_ref': 'made-up-provider'},
                       {'proposal_version': 'candidate'}, {'recipient_digest': 'v1=' + 'A' * 64},
                       {'native_verified_at': 1234}, {'challenge_nonce': 'C' * 33}]:
            with self.assertRaises(ValidationError):
                RecipientProofRequest.model_validate_json(json.dumps(proof.model_dump(mode='json') | change))
        receipt = RecipientProofReceipt(scope=self.scope, adapter_id=self.key.adapter_id,
                                        invitation_ref=self.ref, request_id=proof.request_id, bound_at=self.now)
        self.assertNotIn('profile_active', receipt.model_dump())
        for sent in [True, 0, 'false']:
            with self.assertRaises(ValidationError):
                RecipientProofReceipt(**(receipt.model_dump() | {'external_sent': sent}))
        with self.assertRaises(ValidationError):
            ResolveRequest(scope=self.scope, adapter_id=self.key.adapter_id, invitation_ref=self.ref,
                           request_id=proof.request_id, challenge_nonce=self.nonce)

    def test_transport_permission_is_registered_and_scoped(self):
        proof = RecipientProofRequest(**self.proof())
        body = proof.model_dump_json().encode()
        path = '/integrations/acquisition/v1/sites/madbeauty/verify-recipient'
        grant = WebhookGrant('transport-test', b'transport-public-fixture-key-32!!', self.key.adapter_id,
                             self.scope, frozenset({'verify-recipient'}))
        stamp = int(self.now.timestamp())
        headers = sign_request(grant, path, body, stamp)
        args = dict(grants={grant.key_id: grant}, headers=headers, method='POST', path=path, body=body,
                    now=stamp, scope=self.scope, adapter_id=self.key.adapter_id, permission='verify-recipient')
        self.assertEqual(verify_request(**args), grant)
        for change in [{'permission': 'recipient-challenge'}, {'body': body + b' '},
                       {'scope': Scope(**(self.scope.model_dump() | {'environment_class': 'production'}))}]:
            with self.assertRaises(ValueError):
                verify_request(**(args | change))
        with self.assertRaises(ValueError):
            replace(grant, permissions=frozenset({'arbitrary-execute'}))
