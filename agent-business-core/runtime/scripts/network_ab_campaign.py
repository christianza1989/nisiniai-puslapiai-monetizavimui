"""Balanced paired Jev on/off runs with the same frozen code, corpus and knowledge."""
import argparse
import asyncio
import json
import subprocess
import sys
from pathlib import Path

from pinet_core.agent_instructions import SITES, compose
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sites', nargs='+', choices=sorted(SITES), default=sorted(SITES))
    args = parser.parse_args()
    directory = ROOT / 'artifacts/network-calibration/network-20261001-v3-paired'
    directory.mkdir(exist_ok=False)
    manifest = {'sites': args.sites, 'corpus_dir': 'evals/network-v3b',
        'engine': 'codex_cli_local_default', 'gemini_audio_verified': False,
        'site_arm_order': {site: ['off', 'on'] if index % 2 == 0 else ['on', 'off']
            for index, site in enumerate(args.sites)},
        'instructions': {site: {role: compose(site, role).hash
            for role in ['conversation', 'sales', 'quality', 'supplier']} for site in args.sites},
        'source_hashes': {name: digest((ROOT / name).read_text(encoding='utf-8')) for name in [
            'scripts/client_lab.py', 'scripts/network_lab.py', 'src/pinet_core/customer_language.py',
            'src/pinet_core/text_tools.py', 'src/pinet_core/routing.py', 'src/pinet_core/jev_router.py', 'uv.lock']}}
    (directory / 'frozen-contract.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    semaphore = asyncio.Semaphore(2)
    async def site_pair(site):
        async with semaphore:
            for arm in manifest['site_arm_order'][site]:
                log = directory / f'{site}-{arm}.log'
                command = [sys.executable, '-u', str(ROOT / 'scripts/network_lab.py'), '--site', site,
                    '--phase', 'blind', '--run-id', 'network-20261001-v3-' + arm,
                    '--jev-mode', arm, '--corpus-dir', str(ROOT / 'evals/network-v3b'), '--followup-attempts', '3']
                with log.open('w', encoding='utf-8') as output:
                    process = await asyncio.create_subprocess_exec(*command, cwd=ROOT,
                        stdout=output, stderr=asyncio.subprocess.STDOUT,
                        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
                    print(json.dumps({'site': site, 'arm': arm, 'pid': process.pid, 'state': 'started'}), flush=True)
                    code = await process.wait()
                print(json.dumps({'site': site, 'arm': arm, 'exit_code': code}), flush=True)
    await asyncio.gather(*(site_pair(site) for site in args.sites))
    print(json.dumps({'state': 'completed', 'sites': len(args.sites), 'planned_scenario_runs': len(args.sites)*16}))


if __name__ == '__main__':
    asyncio.run(main())
