"""Lab uses the existing bounded CLI executor; all children here are inert Python."""
import asyncio
import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from pinet_core.acquisition.contracts import Review
from pinet_core.acquisition.headless import BudgetedLab, DurableBudget
from pinet_core.codex_lab import CodexLab

ANSWER = {'factual': True, 'relevant': True, 'one_clear_next_step': True,
    'no_unverified_promises': True, 'no_source_instructions': True, 'reason': 'Known inert fixture.'}
USAGE = {'input_tokens': 17, 'output_tokens': 9}
TERMINAL = json.dumps({'type': 'turn.completed', 'usage': USAGE})


@pytest.fixture
def child(tmp_path, monkeypatch):
    executable = tmp_path/'npm/node_modules/@openai/codex/bin/codex.js'
    executable.parent.mkdir(parents=True)
    executable.touch()
    monkeypatch.setenv('APPDATA', str(tmp_path))
    monkeypatch.setenv('PINET_DATABASE_PASSWORD', 'INERT_ENV_CANARY')
    monkeypatch.setenv('OPENAI_API_KEY', 'INERT_ENV_CANARY')
    monkeypatch.setattr('pinet_core.codex_lab.shutil.which', lambda _: sys.executable)
    actual_spawn = asyncio.create_subprocess_exec
    invocations = []
    owned = set()

    def prepare(code):
        async def spawn(*args, **kwargs):
            if args[0] == 'taskkill':  # Predecessor comparison also cleans only its actual inert child.
                assert int(args[args.index('/PID')+1]) in owned
                return await actual_spawn(*args, **kwargs)
            invocations.append((args, kwargs))
            process = await actual_spawn(sys.executable, '-B', '-c', code, **kwargs)
            owned.add(process.pid)
            return process
        monkeypatch.setattr(asyncio, 'create_subprocess_exec', spawn)
        return invocations
    return prepare


def code_for(*, terminal=TERMINAL, ending=''):
    return ("import sys,pathlib,time;sys.stdin.read();"
        "pathlib.Path('result.json').write_text(" + repr(json.dumps(ANSWER)) + ");"
        "print('inert diagnostic',file=sys.stderr,flush=True);"
        "print(" + repr(terminal) + ",flush=True);" + ending)


def lab_at(tmp_path, **options):
    return CodexLab(max_calls=1, model='gpt-6.1-sol', reasoning_effort='high',
                    artifact_dir=tmp_path/'audit', **options)


async def test_shared_transport_keeps_fixed_profile_no_tools_no_provider_retry_and_private_environment(tmp_path, child):
    invocations = child(code_for())
    lab = lab_at(tmp_path)
    answer = await lab.ask(Review, 'known inert review', {})
    assert answer.model_dump() == ANSWER and lab.usage == [USAGE]
    args, options = invocations[0]
    assert args[args.index('--model')+1] == 'gpt-6.1-sol'
    for value in ('model_reasoning_effort="high"', 'model_providers.pinet-bounded-openai.request_max_retries=0',
        'model_providers.pinet-bounded-openai.stream_max_retries=0', 'web_search="disabled"'):
        assert value in args
    assert all(flag in args for flag in ('--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config'))
    assert args[args.index('--sandbox')+1] == 'read-only'
    assert not {'PINET_DATABASE_PASSWORD', 'OPENAI_API_KEY'} & options['env'].keys()
    audit = tmp_path/'audit/0001'
    assert json.loads((audit/'result.json').read_text()) == ANSWER
    assert (audit/'stdout.jsonl').read_text().strip() == TERMINAL
    assert (audit/'stderr.txt').read_text().strip() == 'inert diagnostic'
    state = json.loads((audit/'observation.json').read_text())
    assert state['outcome'] == 'succeeded' and state['cleanup_completed']
    assert state['process_id'] > 0 and state['process_returncode_observed'] == 0
    assert state['stdout_eof_before_cleanup'] and state['stderr_eof_before_cleanup']
    assert json.loads((audit/'exit.json').read_text())['returncode'] == 0
    assert 'known inert review' not in (audit/'observation.json').read_text()


@pytest.mark.parametrize('stop', ['timeout', 'cancel'])
async def test_terminal_usage_survives_eof_hang_without_accepting_partial_output_or_retry(tmp_path, child, stop):
    invocations = child(code_for(ending='time.sleep(30)'))
    budget = DurableBudget(tmp_path/'budget.json', maximum=1)
    lab = lab_at(tmp_path, timeout=1)
    request = asyncio.create_task(BudgetedLab(lab, budget, 'evaluator', 'known-case').ask(Review, 'inert', {}))
    if stop == 'cancel':
        async with asyncio.timeout(5):
            trace = tmp_path/'audit/0001/stdout.jsonl'
            while not trace.exists() or TERMINAL not in trace.read_text():
                await asyncio.sleep(.01)
        request.cancel()
    with pytest.raises(asyncio.CancelledError if stop == 'cancel' else RuntimeError):
        await request
    attempt = budget.read()['attempts'][0]
    assert attempt['state'] == 'failed' and attempt['usage'] == [USAGE]
    assert lab.calls == len(invocations) == 1 and not lab.timeout_recoveries
    audit = tmp_path/'audit/0001'
    assert json.loads((audit/'result.json').read_text()) == ANSWER  # Evidence only, never a successful response.
    assert json.loads((audit/'failure.json').read_text())['usage_verified'] is True
    state = json.loads((audit/'observation.json').read_text())
    assert state['outcome'] == ('cancelled' if stop == 'cancel' else 'run_timeout')
    assert state['output_exists_before_cleanup'] and state['cleanup_kill_requested'] and state['cleanup_completed']
    assert state['stdout_eof_before_cleanup'] is False


async def test_tool_event_is_rejected_before_process_exit(tmp_path, child):
    invocations = child(code_for(terminal=json.dumps({'type': 'item.started',
        'item': {'type': 'command_execution', 'command': 'INERT_NEVER_EXECUTED'}}), ending='time.sleep(30)'))
    lab = lab_at(tmp_path)
    with pytest.raises(RuntimeError, match='unexpected_cli_tool_execution'):
        await lab.ask(Review, 'inert', {})
    assert len(invocations) == 1 and lab.usage == []
    state = json.loads((tmp_path/'audit/0001/observation.json').read_text())
    assert state['cleanup_completed'] and state['outcome'] == 'tool_attempted'


async def test_diagnostic_write_failure_does_not_replace_timeout_or_lose_terminal_usage(tmp_path, child, monkeypatch):
    child(code_for(ending='time.sleep(30)'))
    actual_write = Path.write_text
    def denied(path, *args, **kwargs):
        if path.name in {'failure.json', 'exit.json'}:
            raise OSError('inert full disk')
        return actual_write(path, *args, **kwargs)
    monkeypatch.setattr(Path, 'write_text', denied)
    lab = lab_at(tmp_path, timeout=1)
    with pytest.raises(RuntimeError, match='codex_lab_timeout'):
        await lab.ask(Review, 'inert', {})
    assert lab.usage == [USAGE]
    assert json.loads((tmp_path/'audit/0001/observation.json').read_text())['cleanup_completed']


async def test_preexpired_absolute_deadline_never_spawns_or_infers_usage(tmp_path, child):
    invocations = child(code_for())
    lab = lab_at(tmp_path)
    lab.deadline = datetime.now(UTC)-timedelta(seconds=1)
    with pytest.raises(RuntimeError, match='codex_lab_timeout'):
        await lab.ask(Review, 'inert', {})
    assert not invocations and not lab.usage and lab.calls == 1
    assert json.loads((tmp_path/'audit/0001/failure.json').read_text())['usage_verified'] is False


async def test_existing_attempt_directory_cannot_be_overwritten(tmp_path, child):
    invocations = child(code_for())
    first = lab_at(tmp_path)
    await first.ask(Review, 'inert', {})
    before = (tmp_path/'audit/0001/request.json').read_bytes()
    with pytest.raises(FileExistsError):
        await lab_at(tmp_path).ask(Review, 'different inert request', {})
    assert len(invocations) == 1 and (tmp_path/'audit/0001/request.json').read_bytes() == before


async def test_junction_parent_is_refused_before_creating_artifacts(tmp_path, child, monkeypatch):
    invocations = child(code_for())
    actual = Path.is_junction
    monkeypatch.setattr(Path, 'is_junction', lambda path: path == tmp_path/'audit' or actual(path))
    with pytest.raises(RuntimeError, match='invalid_lab_artifact_directory'):
        await lab_at(tmp_path).ask(Review, 'inert', {})
    assert not invocations and not (tmp_path/'audit').exists()


async def test_excessive_output_is_not_accepted_but_exact_terminal_usage_is_retained(tmp_path, child):
    child(code_for(ending="pathlib.Path('result.json').write_text('x'*65537)"))
    lab = lab_at(tmp_path)
    with pytest.raises(RuntimeError, match='codex_lab_failed_no_private_log'):
        await lab.ask(Review, 'inert', {})
    assert lab.usage == [USAGE]
    assert json.loads((tmp_path/'audit/0001/observation.json').read_text())['outcome'] == 'output_invalid'


async def test_no_artifact_mode_still_uses_common_transport_and_preserves_unspecified_cli_defaults(tmp_path, child):
    invocations = child(code_for())
    lab = CodexLab(max_calls=1)
    assert (await lab.ask(Review, 'inert', {})).model_dump() == ANSWER
    args, options = invocations[0]
    assert '--model' not in args and not any(arg.startswith('model_reasoning_effort=') for arg in args)
    assert not options['cwd'].exists()  # Normal temporary-directory cleanup after a successful call.
    assert lab.usage == [USAGE]


@pytest.mark.parametrize('audit', [False, True])
@pytest.mark.parametrize('channel', ['stderr', 'stdout', 'turn_failed'])
async def test_schema_rejection_keeps_controlled_reason_without_terminal_usage(tmp_path, child, audit, channel):
    terminal = json.dumps({'type': 'turn.failed', 'error': {'message': 'inert rejected schema'}})
    message = terminal if channel == 'turn_failed' else 'inert rejected schema'
    destination = 'sys.stderr' if channel == 'stderr' else 'sys.stdout'
    invocations = child('import sys;sys.stdin.read();print(' + repr(message) +
                        ',file=' + destination + ',flush=True);sys.exit(7)')
    lab = lab_at(tmp_path) if audit else CodexLab(max_calls=1)
    with pytest.raises(RuntimeError, match='codex_lab_schema_rejected'):
        await lab.ask(Review, 'inert', {})
    assert len(invocations) == 1 and not lab.usage
