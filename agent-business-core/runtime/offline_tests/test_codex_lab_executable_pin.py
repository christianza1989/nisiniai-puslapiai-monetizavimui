"""The Lab must use the configured CLI identity rather than an unrelated npm install."""
import hashlib
import json
import sys
from types import SimpleNamespace

import pytest

from pinet_core import codex_lab, config
from pinet_core.acquisition.contracts import Review

ANSWER = dict(factual=True, relevant=True, one_clear_next_step=True,
    no_unverified_promises=True, no_source_instructions=True, reason='Inert transport result.')
USAGE = {'input_tokens': 17, 'output_tokens': 9}


@pytest.fixture
def configured(tmp_path, monkeypatch):
    native = tmp_path/'configured-cli.exe'
    native.write_bytes(b'inert-executable-v1')
    cfg = SimpleNamespace(chat_codex_executable=str(native),
        chat_codex_sha256=hashlib.sha256(native.read_bytes()).hexdigest())
    monkeypatch.setattr(config, 'settings', lambda: cfg)
    monkeypatch.setenv('APPDATA', str(tmp_path/'absent-npm'))
    return cfg, native


def transport(monkeypatch, calls):
    async def execute(args, **options):
        calls.append((args, options))
        options['output'].write_text(json.dumps(ANSWER), encoding='utf-8')
        return ANSWER, USAGE
    monkeypatch.setattr(codex_lab.bounded, 'execute', execute)


async def test_configured_native_needs_no_node_or_npm_and_keeps_fixed_model_transport(configured, monkeypatch, tmp_path):
    cfg, native = configured
    monkeypatch.setattr(codex_lab.shutil, 'which', lambda _: pytest.fail('Configured native CLI must not resolve Node'))
    calls = []
    transport(monkeypatch, calls)
    lab = codex_lab.CodexLab(max_calls=1, model='gpt-6.1-sol', reasoning_effort='high', artifact_dir=tmp_path/'audit')
    assert (await lab.ask(Review, 'Inert review', {})).model_dump() == ANSWER
    args, options = calls[0]
    assert args[0] == str(native) and args[-1] == '-'
    assert args[args.index('--model')+1] == 'gpt-6.1-sol'
    assert 'model_reasoning_effort="high"' in args
    assert 'model_providers.pinet-bounded-openai.request_max_retries=0' in args
    assert 'model_providers.pinet-bounded-openai.stream_max_retries=0' in args
    assert args[args.index('--sandbox')+1] == 'read-only'
    assert lab.calls == len(calls) == 1 and lab.usage == [USAGE]
    assert not lab.timeout_recoveries and 'OPENAI_API_KEY' not in options['env']
    receipt = json.loads((tmp_path/'audit/0001/process.json').read_bytes())
    assert receipt['cli_origin'] == 'configured_native' and receipt['executable_sha256'] == cfg.chat_codex_sha256


@pytest.mark.parametrize('fault', ['missing_path', 'missing_hash', 'bad_hash', 'relative_path', 'directory', 'missing_file'])
async def test_partial_or_changed_pin_never_falls_back_to_npm(configured, monkeypatch, tmp_path, fault):
    cfg, native = configured
    if fault == 'missing_path':
        cfg.chat_codex_executable = ''
    if fault == 'missing_hash':
        cfg.chat_codex_sha256 = ''
    if fault == 'bad_hash':
        cfg.chat_codex_sha256 = '0'*64
    if fault == 'relative_path':
        cfg.chat_codex_executable = native.name
    if fault == 'directory':
        cfg.chat_codex_executable = str(tmp_path)
    if fault == 'missing_file':
        native.unlink()
    legacy = tmp_path/'npm/node_modules/@openai/codex/bin/codex.js'
    legacy.parent.mkdir(parents=True)
    legacy.touch()
    monkeypatch.setenv('APPDATA', str(tmp_path))
    monkeypatch.setattr(codex_lab.shutil, 'which', lambda _: sys.executable)
    calls = []
    transport(monkeypatch, calls)
    with pytest.raises(RuntimeError, match='^codex_cli_pin_invalid$'):
        await codex_lab.CodexLab(max_calls=1).ask(Review, 'Inert', {})
    assert not calls


async def test_pin_rehashed_after_audit_and_schema_preparation_before_dispatch(configured, monkeypatch):
    _, native = configured
    original = codex_lab.bounded.arguments
    def changed(*args):
        result = original(*args)
        native.write_bytes(b'inert-executable-v2')
        return result
    monkeypatch.setattr(codex_lab.bounded, 'arguments', changed)
    calls = []
    transport(monkeypatch, calls)
    with pytest.raises(RuntimeError, match='^codex_cli_pin_invalid$'):
        await codex_lab.CodexLab(max_calls=1).ask(Review, 'Inert', {})
    assert not calls


async def test_unconfigured_legacy_lab_preserves_node_launcher(configured, monkeypatch, tmp_path):
    cfg, _ = configured
    cfg.chat_codex_executable = cfg.chat_codex_sha256 = ''
    legacy = tmp_path/'npm/node_modules/@openai/codex/bin/codex.js'
    legacy.parent.mkdir(parents=True)
    legacy.touch()
    monkeypatch.setenv('APPDATA', str(tmp_path))
    monkeypatch.setattr(codex_lab.shutil, 'which', lambda _: sys.executable)
    calls = []
    transport(monkeypatch, calls)
    await codex_lab.CodexLab(max_calls=1).ask(Review, 'Inert', {})
    assert calls[0][0][:2] == [sys.executable, str(legacy)]
