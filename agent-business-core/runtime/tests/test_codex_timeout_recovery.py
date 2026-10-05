import pytest

from pinet_core.codex_lab import CodexLab


async def test_only_killed_timeout_request_is_retried_and_receipt_keeps_usage_unknown(monkeypatch):
    lab = CodexLab(max_timeout_retries=1)
    calls = []
    async def request(*args):
        calls.append(args)
        lab.calls += 1
        if len(calls) == 1:
            raise RuntimeError('codex_lab_timeout')
        return {'response': 'complete'}
    monkeypatch.setattr(lab, '_ask_once', request)
    assert await lab.ask(dict, 'instruction', {'evidence': 'same'}) == {'response': 'complete'}
    assert calls[0] == calls[1] and len(calls) == 2
    assert lab.timeout_recoveries[0]['failed_attempt_usage_verified'] is False


async def test_schema_failure_and_exhausted_retry_are_not_hidden(monkeypatch):
    lab = CodexLab(max_timeout_retries=1)
    calls = []
    async def failed(*args):
        calls.append(args)
        raise RuntimeError('codex_lab_schema_rejected')
    monkeypatch.setattr(lab, '_ask_once', failed)
    with pytest.raises(RuntimeError, match='codex_lab_schema_rejected'):
        await lab.ask(dict, 'instruction', {})
    assert len(calls) == 1
    async def timed_out(*args):
        calls.append(args)
        raise RuntimeError('codex_lab_timeout')
    monkeypatch.setattr(lab, '_ask_once', timed_out)
    with pytest.raises(RuntimeError, match='codex_lab_timeout'):
        await lab.ask(dict, 'instruction', {})
    assert len(calls) == 3  # one schema rejection, then at most two timeout attempts
