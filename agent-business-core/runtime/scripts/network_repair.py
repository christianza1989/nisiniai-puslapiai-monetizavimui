"""Propose a bounded communication patch from closed screening cases; never activate.

The first baseline's holdout partition is treated as consumed after diagnosis.
Regressions on those cases cannot be advertised as unseen promotion evidence.
"""
import argparse
import asyncio
import json
import re
from pathlib import Path
from typing import Literal

from pydantic import Field

from pinet_core import agent_instructions, calibration
from pinet_core.codex_lab import CodexLab
from pinet_core.contracts import Strict
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]


class Patch(Strict):
    scope: Literal['clarification', 'turn_taking', 'contact_invitation']
    instruction: str = Field(min_length=10, max_length=1000)
    intended_effect: str = Field(max_length=700)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--revision', choices=['v1', 'v2'], default='v1')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9-]{1,80}', args.run_id):
        raise ValueError('bounded_run_required')
    directory = ROOT / 'artifacts/network-calibration' / args.run_id
    reports = []
    sites = ['akmenas', 'auksarankiams'] if args.revision == 'v1' else sorted(agent_instructions.SITES)
    for site in sites:
        path = directory / site / ('baseline' if args.revision == 'v1' else 'candidate') / 'report.json'
        value = json.loads(path.read_text(encoding='utf-8'))
        if len(value['clients']) != (12 if args.revision == 'v1' else 2):
            raise ValueError('closed_screening_required')
        for row in value['clients']:
            if row['id'] in {'english_customer', 'phone_only'} and not all(row['checks'].values()):
                reports.append({'site_id': site, 'case_id': row['id'], 'history': row['history'],
                    'checks': row['checks'], 'scores': row['scores'], 'contact_receipts': row['contact_receipts']})
    if not reports:
        raise ValueError('observed_communication_problem_required')
    lab = CodexLab(max_calls=1, timeout=180)
    language = 'Lithuanian' if args.revision == 'v1' else 'English'
    previous = json.loads((directory / 'patches/akmenas.json').read_text(encoding='utf-8'))['instruction'] \
        if args.revision == 'v2' else ''
    patch = await lab.ask(Patch, 'You are the core assistant skill calibrator. Propose ONE concise ' + language + ' '
        'communication instruction appended to the current conversation principles. Fix only the observed '
        'first-response language mismatch and not opening contact form when client explicitly wants to enter '
        'phone now. Allow natural wording and no fixed dialogue. Use existing ui.open_contact_form and shown ACK. '
        'Do not add permissions, sources, prices, staff, callback/SMS promises, tool schemas or business facts. '
        'Do not change the tests, evaluator, code or knowledge. Never write a fixture-specific instruction. '
        'This patch remains a proposal until regression and unseen challenge evaluation. '
        'When revising, preserve the contact-form improvement and strengthen language choice from the first '
        'customer message: instruction language does not determine response language. Do not pretend a '
        'conversation-only patch fixes postcall factual-review or fallback-template failures.',
        {'current_core': (agent_instructions.ROOT / 'core/conversation.md').read_text(encoding='utf-8'),
            'observed_cases': reports, 'previous_candidate': previous})
    if calibration.FORBIDDEN.search(patch.instruction) or '```' in patch.instruction or '\x00' in patch.instruction:
        raise ValueError('restricted_candidate')
    target = directory / ('patches' if args.revision == 'v1' else 'patches-v2')
    target.mkdir(exist_ok=False)
    record = {**patch.model_dump(), 'instruction_hash': digest(patch.instruction),
        'source_case_hash': digest(json.dumps(reports, sort_keys=True)), 'cli_calls': lab.calls,
        'cli_usage': lab.usage, 'candidate_author': 'codex_cli_local_default',
        'activation': False, 'baseline_holdout_consumed': True,
        'unseen_challenges_not_supplied_to_calibrator': True}
    for site in agent_instructions.SITES:
        (target / (site + '.json')).write_text(json.dumps({**record, 'site_id': site,
            'parent_hash': agent_instructions.compose(site, 'conversation').hash},
            ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'state': 'proposed', 'sites': len(agent_instructions.SITES),
        'instruction_hash': record['instruction_hash'], 'source_cases': len(reports), 'activated': False}), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
