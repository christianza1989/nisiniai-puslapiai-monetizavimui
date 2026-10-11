"""Fetch explicitly approved public sources; outputs stay in private artifacts."""
import argparse
import asyncio
import json
from pathlib import Path

from pinet_core.acquisition.engine import atomic
from pinet_core.acquisition.sources import retrieve

ROOT = Path(__file__).resolve().parents[1] / 'artifacts/acquisition-sources'


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--max-calls', type=int, default=10)
    args = parser.parse_args()
    if not args.run_id.replace('-', '').isalnum():
        raise ValueError('invalid_run_id')
    data = json.loads(args.input.read_text(encoding='utf-8'))
    if len(data['sources']) > args.max_calls:
        raise ValueError('source_budget_exceeded')
    folder = ROOT / args.run_id
    folder.mkdir(parents=True, exist_ok=False)
    receipts = await retrieve(data['site_id'], data['sources'], max_calls=args.max_calls)
    atomic(folder / 'receipts.json', receipts)
    print(json.dumps({'sources': len(receipts), 'retrieved': sum(r['status'] == 'retrieved' for r in receipts),
                      'external_sent': False}))


if __name__ == '__main__':
    asyncio.run(main())
