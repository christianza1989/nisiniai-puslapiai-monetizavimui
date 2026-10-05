"""Bounded two-process campaign, preserving each niche's separate environment/report."""
import argparse
import asyncio
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--phase', choices=['baseline', 'candidate', 'blind', 'evaluation'], default='baseline')
    parser.add_argument('--sites', nargs='+', default=['akmenas', 'auksarankiams', 'greitossvetaines',
        'laiptucentras', 'roletaiklaipedoje', 'traktoriupadangos'])
    parser.add_argument('--patches', type=Path)
    parser.add_argument('--only', nargs='+')
    parser.add_argument('--followup-attempts', type=int, choices=[2, 3], default=2)
    parser.add_argument('--concurrency', type=int, choices=[1, 2], default=2)
    args = parser.parse_args()
    if len(set(args.sites)) != len(args.sites):
        raise ValueError('duplicate_site')
    directory = ROOT / 'artifacts/network-calibration' / args.run_id
    directory.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(args.concurrency)
    async def run(site):
        async with semaphore:
            commands = [sys.executable, '-u', str(ROOT / 'scripts/network_lab.py'), '--site', site,
                '--phase', args.phase, '--run-id', args.run_id, '--max-calls', '200']
            commands += ['--followup-attempts', str(args.followup_attempts)]
            if args.patches and (args.patches / (site + '.json')).exists():
                commands += ['--patch-file', str(args.patches / (site + '.json'))]
            if args.only:
                commands += ['--only', *args.only]
            log = directory / (site + '-' + args.phase + '.log')
            with log.open('w', encoding='utf-8') as output:
                proc = await asyncio.create_subprocess_exec(*commands, cwd=ROOT,
                    stdout=output, stderr=asyncio.subprocess.STDOUT,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
                print(json.dumps({'site': site, 'phase': args.phase, 'state': 'started', 'pid': proc.pid}), flush=True)
                code = await proc.wait()
            report = directory / site / args.phase / 'report.json'
            value = json.loads(report.read_text(encoding='utf-8')) if report.exists() else {}
            result = {'site': site, 'phase': args.phase, 'exit_code': code,
                'clients': len(value.get('clients', [])), 'cli_calls': value.get('cli_calls', 0),
                'passed_clients': sum(all(r.get('checks', {'pending': False}).values()) for r in value.get('clients', []))}
            print(json.dumps(result), flush=True)
            return result
    results = await asyncio.gather(*(run(site) for site in args.sites))
    (directory / (args.phase + '-campaign.json')).write_text(json.dumps(results, indent=2), encoding='utf-8')


if __name__ == '__main__':
    asyncio.run(main())
