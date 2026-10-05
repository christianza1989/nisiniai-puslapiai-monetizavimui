"""Bounded six-niche learning round with immutable pre-dispatch inputs."""
import argparse
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

from learning_observation import changes, snapshot

from pinet_core.agent_instructions import SITES
from pinet_core.evaluation_contract import fingerprint
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / 'evals/learning-v1'


def write(path, value):
    temporary = path.with_suffix('.pending')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(path)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9-]{1,80}', args.run_id):
        raise ValueError('bounded_run_required')
    directory = ROOT / 'artifacts/network-calibration' / args.run_id
    directory.mkdir(exist_ok=False)
    before = snapshot()
    sources = ['scripts/network_learning_round.py'] + [str(p.relative_to(ROOT)).replace('\\', '/')
        for p in sorted((ROOT / 'src/pinet_core').glob('*.py'))]
    contract = {'as_of': '2026-10-03', 'expected_cases': 36, 'core_sites': sorted(SITES),
        'known_train_cases': 18, 'new_holdout_cases': 18, 'human_blind_corpus': False,
        'evaluation_contract_hash': fingerprint(), 'instruction_files_before': before,
        'source_hashes': {p: digest((ROOT / p).read_text(encoding='utf-8')) for p in sources},
        'corpus_hashes': {site: digest((CORPUS / (site + '.json')).read_text(encoding='utf-8')) for site in SITES},
        'knowledge_hashes': {site: digest((ROOT / f'artifacts/network-calibration/knowledge/{site}.json').read_text(encoding='utf-8')) for site in SITES},
        'excluded_sites': [{'site_id': 'miniekskavatoriai', 'reason': 'No core profile'}],
        'learning_enabled': True, 'learning_namespace': 'local', 'jev_mode': 'off',
        'operator_supplied_candidates': False, 'smtp_sent': False, 'supplier_contacted': False}
    write(directory / 'contract.json', contract)
    semaphore, results = asyncio.Semaphore(2), []

    async def run(site):
        async with semaphore:
            command = [sys.executable, '-u', str(ROOT / 'scripts/network_lab.py'), '--site', site,
                '--phase', 'evaluation', '--include-holdout', '--run-id', args.run_id,
                '--corpus-dir', str(CORPUS), '--jev-mode', 'off', '--max-calls', '110',
                '--followup-attempts', '3', '--timeout-retries', '1', '--as-of', '2026-10-03',
                '--observe-learning', '--learning-enabled', '--learning-namespace', 'local']
            with (directory / (site + '.log')).open('w', encoding='utf-8') as output:
                process = await asyncio.create_subprocess_exec(*command, cwd=ROOT, stdout=output,
                    stderr=asyncio.subprocess.STDOUT,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
                print(json.dumps({'site': site, 'started': True, 'cases': 6}), flush=True)
                code = await process.wait()
            path = directory / site / 'evaluation/report.json'
            data = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
            rows = data.get('clients', [])
            result = {'site_id': site, 'exit_code': code, 'complete': data.get('complete', False),
                'completed': len(rows), 'passed': sum(bool(r.get('checks')) and all(r['checks'].values()) for r in rows),
                'cli_calls': data.get('cli_calls'), 'timeout_recoveries': data.get('cli_timeout_recoveries', []),
                'report_sha256': digest(path.read_text(encoding='utf-8')) if path.exists() else None,
                'cases': [{'id': r['id'], 'checks': r['checks'], 'failure': r.get('failure'),
                    'received_release_hash': r.get('received_release_hash'), 'learning_job': r.get('learning_job')}
                    for r in rows]}
            results.append(result)
            after = snapshot()
            write(directory / 'report.json', {**contract, 'results': results,
                'completed': sum(x['completed'] for x in results), 'passed': sum(x['passed'] for x in results),
                'sites_finished': len(results), 'instruction_files_after': after,
                'changed_files': changes(before, after),
                'source_hashes_still_match': all(digest((ROOT / p).read_text(encoding='utf-8')) == h for p, h in contract['source_hashes'].items()),
                'protected_corpus_still_matches': all(digest((CORPUS / (site + '.json')).read_text(encoding='utf-8')) == h for site, h in contract['corpus_hashes'].items()),
                'knowledge_still_matches': all(digest((ROOT / f'artifacts/network-calibration/knowledge/{site}.json').read_text(encoding='utf-8')) == h for site, h in contract['knowledge_hashes'].items())})
            print(json.dumps({'site': site, 'completed': result['completed'], 'passed': result['passed'],
                'calls': result['cli_calls'], 'learning_jobs': sum(bool(r.get('learning_job')) for r in rows)}), flush=True)

    await asyncio.gather(*(run(site) for site in sorted(SITES)))


if __name__ == '__main__':
    asyncio.run(main())
