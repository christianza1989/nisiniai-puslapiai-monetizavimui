"""Canonical pin callers with inert transport and bounded file reads; no real executable dispatch."""
import hashlib
from pathlib import Path
from types import SimpleNamespace

import pytest

from pinet_core.config import settings
from pinet_core.creation import adapter as creation
from pinet_core.customer_text import adapter as text
from pinet_core.tasks import codex
from pinet_core.tasks.codex_transport import RunnerError
from pinet_core.workspace_team import adapter as team

KINDS = ("creation", "text", "team", "consult")


@pytest.fixture
def pinned(tmp_path, monkeypatch):
    data = b"synthetic pinned executable\x00" * 17
    binary = tmp_path / "inert.bin"
    binary.write_bytes(data)
    workspace = tmp_path / "artifacts" / "w"
    workspace.mkdir(parents=True)
    cfg = settings()
    for key, value in {"chat_codex_executable": str(binary), "chat_codex_sha256": hashlib.sha256(data).hexdigest(),
            "chat_workspace": str(workspace), "creation_workspace": str(workspace), "chat_model": "gpt-6-luna",
            "chat_runner_seconds": 30, "creation_runner_seconds": 30, "creation_runner_enabled": True,
            "customer_text_runner_enabled": True, "workspace_team_runner_enabled": True,
            "chat_runner_enabled": True}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(creation, "RUNTIME", tmp_path)
    state = SimpleNamespace(binary=binary, cfg=cfg, workspace=workspace, data=data, calls=0)
    async def inert(*args, **kwargs):
        state.calls += 1
        assert await kwargs["still_authorized"]()
        return {"answer": "Synthetic complete answer", "limitations": []}, {"input_tokens": 1}
    monkeypatch.setattr(codex, "execute", inert)
    return state


async def invoke(kind):
    if kind == "creation":
        return creation.available()
    if kind == "text":
        return text.runner_ready()
    if kind == "team":
        return team.runner_ready()
    async def authorized():
        return True
    return await codex.run({"message": "Synthetic question"}, authorized)


async def denied(kind):
    if kind in {"text", "team"}:
        assert await invoke(kind) is False
    else:
        with pytest.raises(RunnerError, match="runner_unavailable"):
            await invoke(kind)


@pytest.mark.parametrize("kind", KINDS)
async def test_callers_bounded_with_whole_buffer_allocations_forbidden(pinned, monkeypatch, kind):
    original = Path.read_bytes
    def no_whole_buffer(path):
        if path == pinned.binary:
            raise MemoryError("Synthetic whole-executable buffer allocation forbidden")
        return original(path)
    monkeypatch.setattr(Path, "read_bytes", no_whole_buffer)
    assert await invoke(kind)
    assert pinned.calls == (1 if kind == "consult" else 0)


@pytest.mark.parametrize("kind", KINDS)
async def test_pin_mismatch_refuses_before_transport(pinned, monkeypatch, kind):
    monkeypatch.setattr(pinned.cfg, "chat_codex_sha256", "0" * 64)
    await denied(kind)
    assert pinned.calls == 0


@pytest.mark.parametrize("kind", KINDS)
async def test_each_invocation_rehashes_changed_binary_without_cache(pinned, monkeypatch, kind):
    assert await invoke(kind)
    calls = pinned.calls
    pinned.binary.write_bytes(b"changed executable")
    await denied(kind)
    assert pinned.calls == calls
    monkeypatch.setattr(pinned.cfg, "chat_codex_sha256", hashlib.sha256(b"changed executable").hexdigest())
    assert await invoke(kind)


@pytest.mark.parametrize("kind", KINDS)
async def test_binary_read_failure_preserves_each_callers_error_behavior(pinned, monkeypatch, kind):
    original = Path.open
    def unreadable(path, *args, **kwargs):
        if path == pinned.binary:
            raise PermissionError("Synthetic unreadable binary")
        return original(path, *args, **kwargs)
    monkeypatch.setattr(Path, "open", unreadable)
    if kind == "team":
        assert await invoke(kind) is False
    else:
        with pytest.raises(PermissionError):
            await invoke(kind)
    assert pinned.calls == 0


@pytest.mark.parametrize("kind", KINDS)
async def test_disabled_caller_does_not_open_binary(pinned, monkeypatch, kind):
    flag = {"creation": "creation_runner_enabled", "text": "customer_text_runner_enabled",
        "team": "workspace_team_runner_enabled", "consult": "chat_runner_enabled"}[kind]
    monkeypatch.setattr(pinned.cfg, flag, False)
    original = Path.open
    def unopened(path, *args, **kwargs):
        assert path != pinned.binary, "Disabled runner must fail before hash IO"
        return original(path, *args, **kwargs)
    monkeypatch.setattr(Path, "open", unopened)
    await denied(kind)
    assert pinned.calls == 0


@pytest.mark.parametrize("size", [0, 3, 1048575, 1048576, 1048577, 2097171])
def test_helper_matches_standard_sha256_for_real_file_boundaries(tmp_path, size):
    from pinet_core.file_hash import sha256_file
    data = (b"abc0123456789" * (size // 13 + 1))[:size]
    binary = tmp_path / "sample.bin"
    binary.write_bytes(data)
    assert sha256_file(binary) == hashlib.sha256(data).hexdigest()


def test_virtual_341312816_byte_binary_never_requests_a_whole_buffer(tmp_path, monkeypatch):
    from pinet_core.file_hash import sha256_file
    total = 341312816
    class Binary:
        def __init__(self):
            self.remaining, self.maximum, self.closed = total, 0, False
        def __enter__(self):
            return self
        def __exit__(self, *args):
            self.closed = True
        def read(self, size=-1):
            if not 0 < size <= 1048576:
                raise MemoryError("Read exceeds the synthetic one-MiB allocation budget")
            self.maximum = max(self.maximum, size)
            count = min(size, self.remaining)
            self.remaining -= count
            return b"x" * count
    stream = Binary()
    monkeypatch.setattr(Path, "open", lambda path, mode: stream)
    observed = sha256_file(tmp_path / "virtual.bin")
    expected = hashlib.sha256()
    block, remainder = b"x" * 65536, total
    while remainder:
        expected.update(block[:min(len(block), remainder)])
        remainder -= min(len(block), remainder)
    assert observed == expected.hexdigest()
    assert stream.closed and stream.remaining == 0 and stream.maximum <= 1048576


def test_stream_failure_closes_file_and_never_returns_a_partial_digest(tmp_path, monkeypatch):
    from pinet_core.file_hash import sha256_file
    class Binary:
        calls, closed = 0, False
        def __enter__(self):
            return self
        def __exit__(self, *args):
            self.closed = True
        def read(self, size):
            self.calls += 1
            if self.calls == 1:
                return b"prefix"
            raise OSError("Synthetic interrupted read")
    stream = Binary()
    monkeypatch.setattr(Path, "open", lambda path, mode: stream)
    with pytest.raises(OSError):
        sha256_file(tmp_path / "interrupted.bin")
    assert stream.closed and stream.calls == 2
