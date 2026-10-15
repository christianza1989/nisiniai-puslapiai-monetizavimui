"""Actual tool-free CLI cases. Expected labels stay outside the model evidence."""
import argparse
import asyncio
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from pinet_core.acquisition.contracts import Campaign, Prospect
from pinet_core.acquisition.engine import atomic, fingerprint, prepare
from pinet_core.acquisition.instructions import compose
from pinet_core.codex_lab import CodexLab

ROOT = Path(__file__).resolve().parents[1]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--corpus', type=Path, default=ROOT / 'evals/acquisition/cases.json')
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    if not args.run_id.replace('-', '').isalnum():
        raise ValueError('invalid_run_id')
    corpus = json.loads(args.corpus.read_text(encoding='utf-8'))
    now = datetime.fromisoformat(corpus['now'])
    campaign = Campaign.model_validate(corpus['campaign'])
    lab = CodexLab(max_calls=len(corpus['cases']) * 2, timeout=120)
    output = ROOT / 'artifacts/acquisition-calibration' / args.run_id
    output.mkdir(parents=True, exist_ok=False)
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    report = {'source_head': sha, 'corpus_hash': fingerprint(corpus), 'started_at': datetime.now(UTC).isoformat(),
        'instruction_hash': compose(campaign.sector)[1], 'reviewer_hash': compose(campaign.sector, 'reviewer')[1],
        'implementation_hashes': {str(path.relative_to(ROOT)): fingerprint(path.read_text(encoding='utf-8'))
            for path in sorted((ROOT / 'src/pinet_core/acquisition').rglob('*.py'))},
        'model_identity': 'CLI inherited default; exact model identity not exposed by CodexLab receipt',
        'synthetic': True, 'external_sent': False, 'blind_holdout': False, 'cases': []}
    atomic(output / 'report.json', report)
    for case in corpus['cases']:
        selected = campaign.model_copy(update={'mode': case.get('mode', campaign.mode)})
        result = await prepare(selected, Prospect.model_validate(case['prospect']), lab, now)
        expected = case['expected']
        assessment = result.get('assessment', {})
        passed = all(assessment.get(key) in values for key, values in expected.items())
        passed = passed and result['state'] != 'blocked'
        row = {'id': case['id'], 'split': case['split'], 'passed': passed,
               'input_hash': fingerprint(case['prospect']), 'result': result}
        report['cases'].append(row)
        report['model_calls'], report['usage'] = lab.calls, lab.usage
        atomic(output / 'report.json', report)
        print(json.dumps({'case': case['id'], 'pass': passed, 'state': result['state']}), flush=True)
    report['passed'] = all(row['passed'] for row in report['cases'])
    report['finished_at'] = datetime.now(UTC).isoformat()
    atomic(output / 'report.json', report)
    print(json.dumps({'pass': report['passed'], 'cases': len(report['cases']), 'calls': lab.calls}))
    if not report['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
