"""Export/check the separate strict recipient retirement schemas."""
import argparse
import hashlib
import json
from pathlib import Path

from pinet_core.acquisition.revocation import SCHEMAS

TARGET = Path(__file__).resolve().parents[2] / 'contracts' / 'recipient-retirement-v1' / 'schemas.json'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    content = json.dumps({'retirement_contract_version': '0.1.0',
                          'schemas': {model.__name__: model.model_json_schema() for model in SCHEMAS}},
                         ensure_ascii=False, indent=2, sort_keys=True) + '\n'
    if args.check:
        if not TARGET.is_file() or TARGET.read_text(encoding='utf-8') != content:
            raise SystemExit('retirement_contract_drift')
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(content, encoding='utf-8', newline='\n')
    print('Recipient retirement schemas: ' + hashlib.sha256(TARGET.read_bytes()).hexdigest())


if __name__ == '__main__':
    main()
