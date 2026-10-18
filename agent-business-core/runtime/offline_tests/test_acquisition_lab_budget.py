from datetime import UTC, datetime, timedelta

import pytest

from pinet_core.acquisition.contracts import Review
from pinet_core.acquisition.headless import BudgetedLab, DurableBudget


def test_budget_survives_new_batch_without_reset(tmp_path):
    path = tmp_path / 'budget.json'
    first = DurableBudget(path, maximum=1, seconds=60)
    first.reserve('writer', 'batch1', Review)
    second = DurableBudget(path, maximum=1, seconds=60)
    with pytest.raises(RuntimeError, match='total_attempt_limit'):
        second.reserve('writer', 'batch2', Review)
    assert second.read()['attempts'][0]['state'] == 'reserved'
    assert second.read()['attempts'][0]['cost_usd'] is None
    with pytest.raises(ValueError, match='policy_conflict'):
        DurableBudget(path, maximum=2, seconds=60)


def test_budget_wall_deadline_is_absolute_and_reopen_does_not_extend(tmp_path):
    now = datetime(2026, 10, 17, tzinfo=UTC)
    def clock():
        return now
    path = tmp_path / 'budget.json'
    budget = DurableBudget(path, maximum=3, seconds=30, clock=clock)
    budget.reserve('persona', 'batch1', Review)
    now += timedelta(seconds=30)
    reopened = DurableBudget(path, maximum=3, seconds=30, clock=clock)
    with pytest.raises(RuntimeError, match='wall_time_limit'):
        reopened.reserve('evaluator', 'batch2', Review)


def test_stale_lock_is_not_stolen(tmp_path):
    budget = DurableBudget(tmp_path / 'budget.json')
    (tmp_path / 'budget.lock').write_text('another owner')
    with pytest.raises(FileExistsError):
        budget.reserve('writer', 'batch', Review)
    assert (tmp_path / 'budget.lock').read_text() == 'another owner'


@pytest.mark.asyncio
async def test_failed_attempt_is_charged_and_not_retried(tmp_path):
    class Failed:
        usage = []
        async def ask(self, *args):
            raise RuntimeError('timeout')
    budget = DurableBudget(tmp_path / 'budget.json', maximum=1)
    lab = BudgetedLab(Failed(), budget, 'writer', 'first')
    with pytest.raises(RuntimeError, match='timeout'):
        await lab.ask(Review, 'instruction', {})
    attempt = budget.read()['attempts'][0]
    assert attempt['state'] == 'failed' and attempt['usage'] is None
    with pytest.raises(ValueError, match='already_completed'):
        budget.complete(1, state='complete', usage=[])


@pytest.mark.asyncio
async def test_call_timeout_is_capped_to_absolute_remaining_wall_time(tmp_path):
    now = datetime(2026, 10, 17, tzinfo=UTC)
    def clock():
        return now
    class Inspect:
        calls, usage, timeout, max_timeout_retries = 0, [], 120, 0
        async def ask(self, schema, instruction, data):
            assert 0 < self.timeout <= 1
            return 'completed'
    budget = DurableBudget(tmp_path / 'budget.json', maximum=3, seconds=30, clock=clock)
    budget.reserve('writer', 'earlier-batch', Review)
    now += timedelta(seconds=29)
    result = await BudgetedLab(Inspect(), budget, 'writer', 'final-second').ask(Review, 'instruction', {})
    assert result == 'completed'


def test_no_hidden_timeout_retry_under_one_reserved_attempt(tmp_path):
    class Retry:
        max_timeout_retries = 1
    budget = DurableBudget(tmp_path / 'budget.json')
    with pytest.raises(ValueError, match='automatic_retry_forbidden'):
        BudgetedLab(Retry(), budget, 'writer', 'batch')


@pytest.mark.asyncio
async def test_absolute_deadline_uses_existing_cli_process_tree_cleanup(tmp_path, monkeypatch):
    import asyncio
    import json
    import sys

    from pinet_core.codex_lab import CodexLab
    calls = []
    actual_spawn = asyncio.create_subprocess_exec
    async def spawn(*args, **kwargs):
        calls.append(args)
        return await actual_spawn(sys.executable, '-B', '-c',
            'import sys,time;sys.stdin.read();time.sleep(30)', **kwargs)
    monkeypatch.setattr(asyncio, 'create_subprocess_exec', spawn)
    cli = tmp_path/'npm/node_modules/@openai/codex/bin/codex.js'
    cli.parent.mkdir(parents=True)
    cli.touch()
    monkeypatch.setenv('APPDATA', str(tmp_path))
    monkeypatch.setattr('pinet_core.codex_lab.shutil.which', lambda _: sys.executable)
    lab = CodexLab(max_calls=1, timeout=120, model='gpt-6.1-sol', reasoning_effort='high',
                   artifact_dir=tmp_path/'audit')
    lab.deadline = datetime.now(UTC) + timedelta(milliseconds=350)
    with pytest.raises(RuntimeError, match='codex_lab_timeout'):
        await lab.ask(Review, 'inert timeout test', {})
    state = json.loads((tmp_path/'audit/0001/observation.json').read_text())
    assert state['cleanup_completed'] and state['cleanup_kill_requested']
    assert 0 < state['timeout_seconds'] < 1 and state['exit_code'] is not None
    assert lab.calls == len(calls) == 1 and not lab.usage


@pytest.mark.asyncio
async def test_cancellation_kills_owned_tree_and_keeps_charged_unknown_usage(tmp_path, monkeypatch):
    import asyncio
    import json
    import sys

    from pinet_core.codex_lab import CodexLab
    entered = asyncio.Event()
    calls = []
    actual_spawn = asyncio.create_subprocess_exec
    async def spawn(*args, **kwargs):
        calls.append(args)
        process = await actual_spawn(sys.executable, '-B', '-c',
            'import sys,time;sys.stdin.read();time.sleep(30)', **kwargs)
        entered.set()
        return process
    monkeypatch.setattr(asyncio, 'create_subprocess_exec', spawn)
    cli = tmp_path/'npm/node_modules/@openai/codex/bin/codex.js'
    cli.parent.mkdir(parents=True)
    cli.touch()
    monkeypatch.setenv('APPDATA', str(tmp_path))
    monkeypatch.setattr('pinet_core.codex_lab.shutil.which', lambda _: sys.executable)
    budget = DurableBudget(tmp_path / 'budget.json', maximum=1)
    lab = BudgetedLab(CodexLab(max_calls=1, model='gpt-6.1-sol', reasoning_effort='high',
        artifact_dir=tmp_path/'audit'), budget, 'writer', 'cancel')
    task = asyncio.create_task(lab.ask(Review, 'inert cancellation test', {}))
    await entered.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    state = json.loads((tmp_path/'audit/0001/observation.json').read_text())
    assert state['cleanup_completed'] and state['cleanup_kill_requested'] and len(calls) == 1
    attempt = budget.read()['attempts'][0]
    assert attempt['state'] == 'failed' and attempt['error_class'] == 'CancelledError'
    assert attempt['usage'] is None
