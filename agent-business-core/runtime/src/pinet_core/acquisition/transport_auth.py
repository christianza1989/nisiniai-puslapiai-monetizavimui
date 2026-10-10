"""Raw-byte HMAC, per-scope grants and a bounded clock window; no ambient secrets."""
import hashlib
import hmac
import re
from dataclasses import dataclass, field
from typing import Literal

from .interfaces import Scope

MAX_BODY_BYTES = 65536
MAX_CLOCK_SKEW_SECONDS = 300
WEBHOOK_PERMISSIONS = frozenset({'resolve', 'events', 'capture', 'recipient-challenge', 'verify-recipient'})


@dataclass(frozen=True)
class WebhookGrant:
    key_id: str
    secret: bytes = field(repr=False)
    adapter_id: str
    scope: Scope
    permissions: frozenset[Literal['resolve', 'events', 'capture', 'recipient-challenge', 'verify-recipient']]

    def __post_init__(self):
        if (not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', self.key_id) or len(self.secret) < 32
                or not isinstance(self.permissions, frozenset)
                or not self.permissions.issubset(WEBHOOK_PERMISSIONS)):
            raise ValueError('invalid_webhook_grant')


def _signing_input(method: str, path: str, timestamp: str, key_id: str, body: bytes):
    if method != 'POST' or not re.fullmatch(r'/[A-Za-z0-9_/-]+', path):
        raise ValueError('invalid_signed_target')
    if not re.fullmatch(r'[0-9]{1,12}', timestamp) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', key_id):
        raise ValueError('invalid_signature_metadata')
    if len(body) > MAX_BODY_BYTES:
        raise ValueError('callback_body_too_large')
    body_hash = hashlib.sha256(body).hexdigest()
    return f'acquisition-v1\n{method}\n{path}\n{timestamp}\n{key_id}\n{body_hash}'.encode('ascii')


def sign_request(grant: WebhookGrant, path: str, body: bytes, timestamp: int):
    value = _signing_input('POST', path, str(timestamp), grant.key_id, body)
    signature = hmac.new(grant.secret, value, hashlib.sha256).hexdigest()
    return {'X-Acq-Key-Id': grant.key_id, 'X-Acq-Timestamp': str(timestamp),
            'X-Acq-Signature': 'v1=' + signature, 'Content-Type': 'application/json'}


def verify_request(grants: dict[str, WebhookGrant], headers: dict[str, str], method: str, path: str,
                   body: bytes, now: int, scope: Scope, adapter_id: str, permission: str):
    lower = {key.lower(): value for key, value in headers.items()}
    key_id = lower.get('x-acq-key-id', '')
    timestamp = lower.get('x-acq-timestamp', '')
    signature = lower.get('x-acq-signature', '')
    value = _signing_input(method, path, timestamp, key_id, body)
    grant = grants.get(key_id)
    if (not grant or grant.scope != scope or grant.adapter_id != adapter_id
            or permission not in grant.permissions):
        raise ValueError('callback_grant_denied')
    if abs(now - int(timestamp)) > MAX_CLOCK_SKEW_SECONDS:
        raise ValueError('callback_clock_window')
    if not re.fullmatch(r'v1=[a-f0-9]{64}', signature):
        raise ValueError('callback_signature_invalid')
    expected = hmac.new(grant.secret, value, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature[3:], expected):
        raise ValueError('callback_signature_invalid')
    return grant
