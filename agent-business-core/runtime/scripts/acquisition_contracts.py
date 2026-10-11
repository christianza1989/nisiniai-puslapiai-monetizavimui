"""Regenerate/check public synthetic adapter schemas and cross-language auth vector."""
import argparse
import hashlib
import json
from pathlib import Path

from pinet_core.acquisition.interfaces import SCHEMAS, VERSION, Scope
from pinet_core.acquisition.transport_auth import WebhookGrant, sign_request

ROOT = Path(__file__).resolve().parents[2] / 'contracts' / 'acquisition-v1'


def exported():
    scope = Scope(business_id='synthetic-business', site_id='madbeauty',
                  environment_id='synthetic-test', environment_class='test')
    # This disclosed fixture value is not a runtime credential.
    key = 'acquisition-v1-public-test-key-only!'
    grant = WebhookGrant('synthetic-key', key.encode(), 'madbeauty-test', scope, frozenset({'capture'}))
    path = '/integrations/acquisition/v1/sites/madbeauty/capture-handshake'
    body = json.dumps({'contract_version': VERSION, 'scope': scope.model_dump(),
                       'adapter_id': 'madbeauty-test', 'mode': 'capture_only',
                       'recipient_domain': 'example.test', 'external_sent': False},
                      ensure_ascii=False, separators=(',', ':')).encode()
    return {
        'schemas.json': {'contract_version': VERSION,
                         'schemas': {model.__name__: model.model_json_schema() for model in SCHEMAS}},
        'signature-vector.json': {'fixture_only': True, 'key_utf8': key, 'key_id': grant.key_id,
                                 'method': 'POST', 'path': path, 'timestamp': 1791590400,
                                 'body_utf8': body.decode(), 'body_sha256': hashlib.sha256(body).hexdigest(),
                                 'headers': sign_request(grant, path, body, 1791590400)},
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
                raise SystemExit(f'contract_drift: {name}')
        else:
            ROOT.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding='utf-8', newline='\n')
    print('Contract schema/vector exact check PASS' if args.check else 'Generated acquisition-v1 schemas/vector')


if __name__ == '__main__':
    main()
