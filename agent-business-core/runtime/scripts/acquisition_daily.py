"""One private daily preparation batch; schedule externally only after operational acceptance."""
import argparse
import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path

from pinet_core.acquisition.contracts import Campaign, Prospect
from pinet_core.acquisition.engine import daily
from pinet_core.codex_lab import CodexLab

ROOT = Path(__file__).resolve().parents[1] / 'artifacts/acquisition'


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    args = parser.parse_args()
    data = json.loads(args.input.read_text(encoding='utf-8'))
    campaign = Campaign.model_validate(data['campaign'])
    prospects = [Prospect.model_validate(p) for p in data['prospects']]
    lab = CodexLab(max_calls=max(1, campaign.max_model_calls), timeout=120)
    result = await daily(campaign, prospects, lab, ROOT, datetime.now(UTC))
    print(json.dumps({'day': result['day'], 'state': result['state'],
        'records': len(result['records']), 'model_calls': result['model_calls'], 'external_sent': False}))


if __name__ == '__main__':
    asyncio.run(main())
