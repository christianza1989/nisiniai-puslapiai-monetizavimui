"""Bounded private preparation/reply CLI, reusing canonical acquisition roles.

This command deliberately has no live-send option. Existing Case/mail admission
and configured controlled-test transport remain separate explicit integrations.
"""
import argparse
import asyncio
import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from pinet_core.acquisition.contracts import Campaign, Prospect
from pinet_core.acquisition.dialogue import prepare_reply
from pinet_core.acquisition.engine import atomic, daily
from pinet_core.acquisition.headless import DurableBudget, HeadlessRoles, approved_input_pin, role_labs

ROOT = Path(__file__).resolve().parents[1]


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['prepare', 'reply', 'case-reply', 'capture', 'budget'])
    parser.add_argument('--input', type=Path)
    parser.add_argument('--run-id')
    parser.add_argument('--budget-ledger', type=Path, required=True)
    args = parser.parse_args()
    budget = DurableBudget(args.budget_ledger)
    if args.operation == 'budget':
        value = budget.read()
        print(json.dumps({'policy': value['policy'], 'attempts': len(value['attempts']),
                          'deadline': value['deadline'], 'cost_usd': None}))
        return
    if not args.run_id or not args.run_id.replace('-', '').isalnum() or not args.input:
        raise ValueError('unique_run_id_and_input_required')
    data = json.loads(args.input.read_text(encoding='utf-8'))
    if args.operation in {'case-reply', 'capture'}:
        from pinet_core.acquisition.headless_mail import HeadlessMail
        from pinet_core.acquisition.interfaces import Scope
        from pinet_core.db import db
        scope = Scope.model_validate(data['scope'])
        output = ROOT / 'artifacts/acquisition-headless' / args.run_id
        output.mkdir(parents=True, exist_ok=False)
        bridge = HeadlessMail(db)
        if args.operation == 'case-reply':
            roles = role_labs(budget, args.run_id, output / 'calls')
            result = await bridge.reply_to_case(scope=scope, adapter_id=data['adapter_id'],
                request_id=data['request_id'], thread_id=data['thread_id'], inbound_id=data['inbound_id'],
                lab=HeadlessRoles(roles))
        else:
            result = await bridge.capture_reviewed(scope=scope, adapter_id=data['adapter_id'],
                request_id=data['request_id'], recipient=data['recipient'],
                campaign=Campaign.model_validate(data['campaign']), prospect=Prospect.model_validate(data['prospects'][0]),
                prepared=data['prepared'])
        atomic(output / 'report.json', result)
        print(json.dumps({'report': str(output / 'report.json'), 'external_sent': False}))
        return
    campaign = Campaign.model_validate(data['campaign'])
    prospects = [Prospect.model_validate(p) for p in data['prospects']]
    if not 1 <= len(prospects) <= campaign.max_prospects:
        raise ValueError('bounded_prospects_required')
    output = ROOT / 'artifacts/acquisition-headless' / args.run_id
    output.mkdir(parents=True, exist_ok=False)
    roles = role_labs(budget, args.run_id, output / 'calls')
    agent = HeadlessRoles(roles)
    now = datetime.now(UTC)
    report = {'source_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'input_sha256': hashlib.sha256(args.input.read_bytes()).hexdigest(),
              'knowledge_config_pin': approved_input_pin(campaign, prospects),
              'operation': args.operation, 'started_at': now.isoformat(), 'external_sent': False}
    atomic(output / 'report.json', report)
    try:
        if args.operation == 'prepare':
            report['result'] = await daily(campaign, prospects, agent,
                ROOT / 'artifacts/acquisition', now)
        else:
            if len(prospects) != 1:
                raise ValueError('one_reply_thread_required')
            report['result'] = await prepare_reply(campaign, prospects[0], data['transcript'], agent, now,
                                                   suppressed=data.get('suppressed', False))
    except Exception as error:
        report['error_class'] = type(error).__name__
        raise
    finally:
        report['usage_by_role'] = agent.usage
        report['finished_at'] = datetime.now(UTC).isoformat()
        report['cumulative_attempts'] = len(budget.read()['attempts'])
        atomic(output / 'report.json', report)
    print(json.dumps({'report': str(output / 'report.json'), 'external_sent': False,
                      'cumulative_attempts': report['cumulative_attempts']}))


if __name__ == '__main__':
    asyncio.run(main())
