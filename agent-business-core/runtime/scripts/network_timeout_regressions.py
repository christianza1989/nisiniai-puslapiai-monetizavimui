"""Seven known timeout scenarios; a labelled recovery run, never a new blind score."""
import asyncio
import json
import subprocess
import sys
from pathlib import Path

from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT/'artifacts/network-calibration/network-20261001-v4-recovery'
TARGETS = [
    ('traktoriupadangos', 'off', ['english_phone_on_screen', 'technical_question_no_contact', 'unsafe_shortcut']),
    ('greitossvetaines', 'on', ['technical_question_no_contact']),
    ('laiptucentras', 'off', ['unsafe_shortcut']),
    ('roletaiklaipedoje', 'off', ['search_criteria_without_outreach']),
    ('roletaiklaipedoje', 'on', ['unsafe_shortcut']),
]


async def main():
    DIRECTORY.mkdir(exist_ok=False)
    manifest = {'regression_only': True, 'new_blind_cases': 0, 'original_paired_results_changed': False,
        'post_campaign_language_fix': True, 'bounded_timeout_retries': 1, 'targets': TARGETS,
        'source_hashes': {name:digest((ROOT/name).read_text(encoding='utf-8')) for name in [
            'src/pinet_core/customer_language.py', 'src/pinet_core/language_preference.py',
            'src/pinet_core/codex_lab.py', 'scripts/network_lab.py']}}
    (DIRECTORY/'contract.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    semaphore, executions = asyncio.Semaphore(2), []
    async def run(site, arm, cases):
        async with semaphore:
            command = [sys.executable, '-u', str(ROOT/'scripts/network_lab.py'), '--site', site,
                '--phase', 'evaluation', '--run-id', 'network-20261001-v4-recovery-'+arm,
                '--jev-mode', arm, '--corpus-dir', str(ROOT/'evals/network-v3b'), '--only', *cases,
                '--followup-attempts', '3', '--timeout-retries', '1']
            with (DIRECTORY/f'{site}-{arm}.log').open('w', encoding='utf-8') as output:
                process = await asyncio.create_subprocess_exec(*command, cwd=ROOT, stdout=output,
                    stderr=asyncio.subprocess.STDOUT,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0)
                print(json.dumps({'site':site,'arm':arm,'started':True}), flush=True)
                code = await process.wait()
            executions.append({'site':site,'arm':arm,'exit_code':code})
            print(json.dumps(executions[-1]), flush=True)
    await asyncio.gather(*(run(*target) for target in TARGETS))
    rows = []
    for site, arm, cases in TARGETS:
        file = ROOT/f'artifacts/network-calibration/network-20261001-v4-recovery-{arm}/{site}/evaluation/report.json'
        data = json.loads(file.read_text(encoding='utf-8')) if file.exists() else {}
        rows.append({'site':site,'arm':arm,'expected':len(cases),'completed':len(data.get('clients',[])),
            'passed':sum(bool(c.get('checks')) and all(c['checks'].values()) for c in data.get('clients',[])),
            'timeout_recoveries':data.get('cli_timeout_recoveries',[]),
            'failures':[{'id':c['id'],'checks':c.get('checks'),'reason':c.get('failure_reason')}
                for c in data.get('clients',[]) if not c.get('checks') or not all(c['checks'].values())]})
    report = {**manifest,'executions':executions,'rows':rows,
        'completed':sum(r['completed'] for r in rows),'passed':sum(r['passed'] for r in rows), 'expected':7}
    (DIRECTORY/'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'completed':report['completed'],'passed':report['passed'],'expected':7}))


if __name__ == '__main__':
    asyncio.run(main())
