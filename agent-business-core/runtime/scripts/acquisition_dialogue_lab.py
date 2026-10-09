"""Bounded closed Codex CLI recipient simulation, with immutable private reports."""
import argparse
import asyncio
import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from pinet_core.acquisition.contracts import Campaign, Review
from pinet_core.acquisition.dialogue import REPLY_INSTRUCTION
from pinet_core.acquisition.dialogue_corpus import corpus
from pinet_core.acquisition.dialogue_lab import (
    GRADE_INSTRUCTION,
    PERSONA_INSTRUCTION,
    LabCase,
    RoleLab,
    SharedBudget,
    diverse_subset,
    run_case,
    validate_synthetic,
)
from pinet_core.acquisition.engine import atomic, fingerprint
from pinet_core.acquisition.instructions import compose
from pinet_core.codex_lab import CodexLab

ROOT = Path(__file__).resolve().parents[1]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id')
    parser.add_argument('--corpus', type=Path)
    parser.add_argument('--seal', type=Path, help='JSON with corpus_sha256 for external protected input')
    parser.add_argument('--only', help='Comma-separated case IDs; subset is never full acceptance')
    parser.add_argument('--limit', type=int, default=6)
    parser.add_argument('--max-calls', type=int, default=60)
    parser.add_argument('--max-turns', type=int, default=3)
    parser.add_argument('--timeout', type=int, default=120)
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--patch-file', type=Path, help='Private candidate reply/research behavior supplement')
    args = parser.parse_args()
    data = json.loads(args.corpus.read_text(encoding='utf-8')) if args.corpus else corpus()
    if data.get('synthetic') is not True:
        raise ValueError('synthetic_corpus_required')
    protected = False
    if any(case['split'] == 'holdout' for case in data['cases']):
        if not args.corpus or not args.seal:
            raise ValueError('protected_corpus_seal_required')
        expected = json.loads(args.seal.read_text(encoding='utf-8'))['corpus_sha256']
        if hashlib.sha256(args.corpus.read_bytes()).hexdigest() != expected:
            raise ValueError('protected_corpus_changed')
        protected = True
    campaign = Campaign.model_validate(data['campaign'])
    cases = [LabCase.model_validate(case) for case in data['cases']]
    if len({case.id for case in cases}) != len(cases):
        raise ValueError('duplicate_case_id')
    for case in cases:
        validate_synthetic(campaign, case)
    if args.list:
        print(json.dumps({'matrix': data.get('matrix'), 'cases': [case.id for case in cases]}))
        return
    if not args.run_id or not args.run_id.replace('-', '').isalnum():
        raise ValueError('valid_run_id_required')
    if not 1 <= args.limit <= 500 or not 1 <= args.max_calls <= 2000 or not 1 <= args.max_turns <= 6:
        raise ValueError('bounded_run_required')
    if args.only:
        requested = set(args.only.split(','))
        if not requested <= {case.id for case in cases}:
            raise ValueError('unknown_case_id')
        cases = [case for case in cases if case.id in requested]
    cases = cases[:args.limit] if args.only else diverse_subset(cases, args.limit)
    now = datetime.fromisoformat(data['now'])
    patch = ''
    if args.patch_file:
        patch = json.loads(args.patch_file.read_text(encoding='utf-8'))['instruction']
        if not isinstance(patch, str) or len(patch) > 6000:
            raise ValueError('bounded_candidate_instruction_required')
    output = ROOT / 'artifacts/acquisition-dialogue' / args.run_id
    output.mkdir(parents=True, exist_ok=False)
    budget = SharedBudget(args.max_calls)
    labs = {role: CodexLab(max_calls=args.max_calls, timeout=args.timeout) for role in ('agent', 'persona', 'evaluator')}
    adapters = {role: RoleLab(lab, budget) for role, lab in labs.items()}
    if patch:
        original = adapters['agent']

        class CandidateLab:
            async def ask(self, schema, instruction, inputs):
                supplement = '' if schema is Review else '\nBehavior supplement:\n' + patch
                return await original.ask(schema, instruction + supplement, inputs)

        adapters['agent'] = CandidateLab()
    snapshot = {'corpus_hash': fingerprint(data), 'instruction_hash': compose(campaign.sector)[1],
        'reviewer_hash': compose(campaign.sector, 'reviewer')[1], 'reply_hash': fingerprint(REPLY_INSTRUCTION),
        'persona_hash': fingerprint(PERSONA_INSTRUCTION), 'evaluator_hash': fingerprint(GRADE_INSTRUCTION),
        'candidate_hash': fingerprint(patch), 'implementation_hashes': {
            str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted((ROOT / 'src/pinet_core/acquisition').rglob('*'))
            if path.suffix in {'.py', '.md'}}}
    snapshot['implementation_hashes'][str(Path(__file__).relative_to(ROOT))] = hashlib.sha256(
        Path(__file__).read_bytes()).hexdigest()
    report = {**snapshot, 'source_head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT,
            text=True).strip(), 'source_dirty': bool(subprocess.check_output(['git', 'status', '--porcelain'],
            cwd=ROOT, text=True).strip()), 'started_at': datetime.now(UTC).isoformat(),
        'synthetic': True, 'external_sent': False, 'model_identity': 'CLI inherited default; exact ID unexposed',
        'protected_input_hash_verified': protected, 'blind_holdout': False,
        'blindness_status': 'UNVERIFIED: separation/hash checks do not prove scenario novelty',
        'available_cases': len(data['cases']), 'selected_cases': len(cases), 'max_calls': args.max_calls,
        'max_turns': args.max_turns, 'cases': [], 'passed': False, 'full_suite': len(cases) == len(data['cases']),
        'promotion': 'none; lab cannot change releases, policy or protected corpus'}
    atomic(output / 'report.json', report)
    for case in cases:
        print(json.dumps({'case_started': case.id}), flush=True)
        result = await run_case(campaign, case, adapters['agent'], adapters['persona'], adapters['evaluator'],
                                output / case.id, now, args.max_turns)
        report['cases'].append(result)
        report['calls'] = budget.calls
        report['usage_by_role'] = {role: lab.usage for role, lab in labs.items()}
        if not result['passed'] and 'first_failure' not in report:
            report['first_failure'] = {'case': case.id, 'state': result['state'],
                                      'reason': result.get('failure', result.get('error_class'))}
        atomic(output / 'report.json', report)
        print(json.dumps({'case': case.id, 'passed': result['passed'], 'state': result['state']}), flush=True)
    current_hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                      for name in snapshot['implementation_hashes']}
    current_corpus = json.loads(args.corpus.read_text(encoding='utf-8')) if args.corpus else corpus()
    report['snapshot_unchanged'] = (current_hashes == snapshot['implementation_hashes']
                                  and fingerprint(current_corpus) == snapshot['corpus_hash'])
    if protected:
        report['snapshot_unchanged'] = report['snapshot_unchanged'] and (
            hashlib.sha256(args.corpus.read_bytes()).hexdigest() == expected)
    report['passed'] = report['snapshot_unchanged'] and all(case['passed'] for case in report['cases'])
    report['finished_at'] = datetime.now(UTC).isoformat()
    atomic(output / 'report.json', report)
    print(json.dumps({'passed': report['passed'], 'calls': budget.calls, 'cases': len(cases),
                      'full_suite': report['full_suite'], 'report': str(output / 'report.json')}))
    if not report['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
