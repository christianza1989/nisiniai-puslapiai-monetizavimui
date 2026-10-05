"""Own localhost UI smoke via Playwright CLI; auth values and CLI auth output stay private."""
import json
import re
import shutil
import subprocess
from pathlib import Path

import httpx

from pinet_core.config import settings

ROOT = Path(__file__).resolve().parents[1]


def cli(*arguments):
    node = Path(shutil.which('node'))
    npx = node.parent / 'node_modules/npm/bin/npx-cli.js'
    try:
        process = subprocess.run([str(node), str(npx), '--yes', '--package', '@playwright/cli',
            'playwright-cli', '-s=pinet-jev-ui', *arguments], cwd=ROOT, capture_output=True,
            text=True, encoding='utf-8', timeout=40, creationflags=subprocess.CREATE_NO_WINDOW)
    except subprocess.TimeoutExpired:
        raise RuntimeError('private_cli_timeout') from None
    if process.returncode:
        raise RuntimeError('private_cli_action_failed')
    return process.stdout


def snapshot():
    output = cli('snapshot')
    match = re.search(r'\[Snapshot\]\(([^)]+)\)', output)
    if not match and '[ref=' in output:
        return output
    if not match:
        raise RuntimeError('snapshot_missing')
    return (ROOT / match[1]).read_text(encoding='utf-8')


def ref(text, role, label):
    match = re.search(re.escape(role + ' "' + label + '"') + r'.*?\[ref=(e\d+)\]', text)
    if not match:
        raise RuntimeError('observed_element_missing')
    return match[1]


def main():
    cfg = settings()
    assert not cfg.voice_enabled and not cfg.smtp_enabled
    headers = {'Authorization': 'Bearer ' + cfg.operator_secret}
    directory = ROOT / 'output/playwright'
    directory.mkdir(parents=True, exist_ok=True)
    with httpx.Client(base_url='http://127.0.0.1:8840', headers=headers, timeout=5) as api:
        before = api.get('/operator/sites/traktoriupadangos/routing').json()
        try:
            first = snapshot()
            cli('fill', ref(first, 'textbox', 'Operatoriaus prieiga'), cfg.operator_secret)
            cli('click', ref(first, 'button', 'Prisijungti'))
            current = snapshot()
            cli('select', ref(current, 'combobox', 'Verslas'), 'traktoriupadangos')
            current = snapshot()
            cli('check', ref(current, 'checkbox', 'Jev pagalba šiam verslui'))
            assert api.get('/operator/sites/traktoriupadangos/routing').json()['enabled'] is True
            cli('screenshot', '--filename', str(directory / 'jev-toggle-on.png'))
            if not (directory / 'jev-toggle-on.png').is_file():
                raise RuntimeError('screenshot_missing')
            current = snapshot()
            cli('select', ref(current, 'combobox', 'Verslas'), 'greitossvetaines')
            other = api.get('/operator/sites/greitossvetaines/routing').json()
            assert other['enabled'] is False
            current = snapshot()
            cli('select', ref(current, 'combobox', 'Verslas'), 'traktoriupadangos')
            current = snapshot()
            if not before['enabled']:
                cli('uncheck', ref(current, 'checkbox', 'Jev pagalba šiam verslui'))
            after = api.get('/operator/sites/traktoriupadangos/routing').json()
            assert after['enabled'] == before['enabled']
            result = {'own_localhost_ui': True, 'authenticated': True, 'on_clicked_and_verified': True,
                'other_site_unchanged': True, 'original_mode_restored': True,
                'production_voice_enabled': False, 'smtp_enabled': False,
                'screenshot': 'output/playwright/jev-toggle-on.png'}
            (ROOT / 'artifacts/jev-pilot/ui.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
            print(json.dumps(result))
        finally:
            current = api.get('/operator/sites/traktoriupadangos/routing').json()
            if current['enabled'] != before['enabled']:
                api.put('/operator/sites/traktoriupadangos/routing', json={
                    'base_revision': current['revision'], 'enabled': before['enabled']}).raise_for_status()
            cli('close')


if __name__ == '__main__':
    main()
