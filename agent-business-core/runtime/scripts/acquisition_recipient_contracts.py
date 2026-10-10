"""Generate/check the additive recipient schemas and public synthetic MAC vectors."""
import argparse
import hashlib
import json
from pathlib import Path

from pinet_core.acquisition.interfaces import Scope
from pinet_core.acquisition.recipient_binding import (
    ADDRESS_RULE,
    MAC_DOMAIN,
    RECIPIENT_VERSION,
    SCHEMAS,
    RecipientKeyGrant,
    recipient_digest,
    recipient_mac_bytes,
)

ROOT = Path(__file__).resolve().parents[2] / 'contracts' / 'recipient-binding-v1'


def exported():
    # Disclosed fixture-only key. Never used by a server registration.
    secret = bytes(range(1, 33))
    scope = Scope(business_id='business-test', site_id='madbeauty',
                  environment_id='capture-native', environment_class='test')
    grant = RecipientKeyGrant('recipient-test-v1', secret, scope, 'madbeauty-native')
    ref, nonce = 'I' * 32, 'C' * 32
    inputs = [('native-fixed', 'Owner@example.test', 'owner@example.test'),
              ('native-alias', ' A.B+tag@EXAMPLE.TEST ', 'a.b+tag@example.test'),
              ('native-dotted-i', 'İ@EXAMPLE.TEST', 'i\u0307@example.test')]
    vectors = [{
        'name': name, 'native_input': raw, 'canonical_email': canonical,
        'input_utf8': recipient_mac_bytes(grant, ref, nonce, canonical).decode('utf-8'),
        'recipient_digest': recipient_digest(grant, ref, nonce, canonical),
    } for name, raw, canonical in inputs]
    return {
        'schemas.json': {'recipient_contract_version': RECIPIENT_VERSION,
                         'acquisition_contract_version': '0.1.1',
                         'schemas': {model.__name__: model.model_json_schema() for model in SCHEMAS}},
        'recipient-vector.json': {'fixture_only': True, 'recipient_contract_version': RECIPIENT_VERSION,
                                  'address_rule': ADDRESS_RULE, 'mac_domain': MAC_DOMAIN,
                                  'key_hex': secret.hex(), 'key_id': grant.key_id,
                                  'scope': scope.model_dump(), 'adapter_id': grant.adapter_id,
                                  'invitation_ref': ref, 'challenge_nonce': nonce,
                                  'cases': vectors},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for name, value in exported().items():
        content = json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n'
        target = ROOT / name
        if args.check:
            if not target.is_file() or target.read_text(encoding='utf-8') != content:
                raise SystemExit(f'recipient_contract_drift: {name}')
        else:
            ROOT.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding='utf-8', newline='\n')
    digest = hashlib.sha256((ROOT / 'schemas.json').read_bytes()).hexdigest()
    print(('Recipient schema/vector exact check PASS: ' if args.check else 'Generated recipient contract: ') + digest)


if __name__ == '__main__':
    main()
