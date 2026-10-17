"""Operation-only source observations; every Git subprocess is mocked."""
import asyncio
import contextvars
import importlib
import subprocess
import threading
from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest

from pinet_core.customer_text import adapter


@asynccontextmanager
async def baseline_operation():
    # Reproduce unchanged existing callers before the new module exists.
    yield


@pytest.fixture
def git(tmp_path, monkeypatch):
    repo = tmp_path / "execution"
    repo.mkdir()
    state = SimpleNamespace(repo=repo, calls=[], head="a"*40, dirty="", fail=False)
    def raw(arguments, **kwargs):
        state.calls.append((str(kwargs["cwd"]), tuple(arguments)))
        if state.fail:
            raise subprocess.CalledProcessError(1, arguments, stderr="must never escape")
        return state.head if arguments[1:] == ["rev-parse", "HEAD"] else state.dirty
    monkeypatch.setattr(subprocess, "check_output", raw)
    monkeypatch.setattr(adapter, "ROOT", repo)
    monkeypatch.setattr(adapter, "settings", lambda: SimpleNamespace(control_source_revision="a"*40))
    return state


async def test_repeated_source_checks_are_bounded_by_entry_and_fresh_exit_not_call_count(git):
    try:
        module = importlib.import_module("pinet_core.source_observation")
        operation = module.git_source_operation
    except ModuleNotFoundError:
        operation = baseline_operation
    async with operation():
        for _ in range(100):
            assert adapter.source_current()
    assert len(git.calls) == 4  # two fixed commands at first observation and again at normal exit


@pytest.fixture
def source():
    return importlib.import_module("pinet_core.source_observation")


async def test_two_roots_are_fenced_fresh_and_next_operation_has_no_memory(source, git, tmp_path):
    public = tmp_path / "companion"
    public.mkdir()
    for _ in range(2):
        before = len(git.calls)
        async with source.git_source_operation():
            for _ in range(20):
                assert source.git_source_observation(git.repo).head == "a"*40
                assert source.git_source_observation(public).head == "a"*40
        assert len(git.calls)-before == 8
    git.calls.clear()
    source.git_source_observation(git.repo)
    source.git_source_observation(git.repo)
    assert len(git.calls) == 4  # default unscoped behavior remains freshly observed


@pytest.mark.parametrize("change", ["head", "dirty", "failure", "path"])
async def test_exit_revalidation_denies_change_before_permission_returns(source, git, change):
    returned = False
    with pytest.raises(source.SourceObservationError, match="^source_unavailable$"):
        async with source.git_source_operation():
            source.git_source_observation(git.repo)
            if change == "head":
                git.head = "b"*40
            elif change == "dirty":
                git.dirty = " M canonical.py"
            elif change == "failure":
                git.fail = True
            else:
                git.repo.rename(git.repo.with_name("old-execution"))
                git.repo.mkdir()
        returned = True
    assert not returned


async def test_failure_caught_inside_body_still_poisoned_but_next_operation_retries(source, git):
    git.fail = True
    with pytest.raises(source.SourceObservationError):
        async with source.git_source_operation():
            with pytest.raises(source.SourceObservationError) as error:
                source.git_source_observation(git.repo)
            assert error.value.code == "source_unavailable"
            assert "must never escape" not in str(error.value)
            git.fail = False
    async with source.git_source_operation():
        assert source.git_source_observation(git.repo).head == "a"*40


async def test_expected_revision_is_compared_on_every_existing_wrapper_call(source, git, monkeypatch):
    cfg = SimpleNamespace(control_source_revision="a"*40)
    monkeypatch.setattr(adapter, "settings", lambda: cfg)
    async with source.git_source_operation():
        assert adapter.source_current()
        cfg.control_source_revision = "b"*40
        assert not adapter.source_current()
    assert len(git.calls) == 4


async def test_structured_child_and_to_thread_share_only_the_active_operation(source, git):
    async with source.git_source_operation():
        first = await asyncio.to_thread(source.git_source_observation, git.repo)
        async def child():
            return await asyncio.to_thread(source.git_source_observation, git.repo)
        assert await asyncio.create_task(child()) == first
    assert len(git.calls) == 4


async def test_explicit_nested_operation_is_always_fresh_and_restores_outer_context(source, git):
    async with source.git_source_operation():
        source.git_source_observation(git.repo)
        async with source.git_source_operation():
            source.git_source_observation(git.repo)
        source.git_source_observation(git.repo)
    assert len(git.calls) == 8


async def test_concurrent_independent_operations_are_isolated(source, git):
    admitted = asyncio.Event()
    count = 0
    async def operation():
        nonlocal count
        async with source.git_source_operation():
            source.git_source_observation(git.repo)
            count += 1
            if count == 2:
                admitted.set()
            await admitted.wait()
    await asyncio.gather(operation(), operation())
    assert len(git.calls) == 8


@pytest.mark.parametrize("cancel", [False, True])
async def test_closed_inherited_context_never_reuses_or_repopulates_old_observations(source, git, cancel):
    copied = None
    class Original(Exception):
        pass
    try:
        async with source.git_source_operation():
            source.git_source_observation(git.repo)
            copied = contextvars.copy_context()
            if cancel:
                raise asyncio.CancelledError
            raise Original("original authority refusal")
    except (Original, asyncio.CancelledError):
        pass
    before = len(git.calls)
    git.head = "b"*40
    with pytest.raises(source.SourceObservationError):
        copied.run(source.git_source_observation, git.repo)
    assert len(git.calls) == before
    # The caller's context was reset and therefore sees a fresh current source.
    assert source.git_source_observation(git.repo).head == "b"*40


async def test_bounded_repository_set_cannot_expand_silently(source, git, tmp_path):
    repos = [git.repo, tmp_path / "public", tmp_path / "unexpected"]
    for repo in repos[1:]:
        repo.mkdir()
    with pytest.raises(source.SourceObservationError):
        async with source.git_source_operation():
            for repo in repos:
                source.git_source_observation(repo)


async def test_cancelled_to_thread_cannot_publish_into_closed_state(source, git, monkeypatch):
    entered, proceed = threading.Event(), threading.Event()
    raw = subprocess.check_output
    def delayed(*args, **kwargs):
        entered.set()
        assert proceed.wait(3)
        return raw(*args, **kwargs)
    monkeypatch.setattr(subprocess, "check_output", delayed)
    async def operation():
        async with source.git_source_operation():
            await asyncio.to_thread(source.git_source_observation, git.repo)
    task = asyncio.create_task(operation())
    await asyncio.to_thread(entered.wait, 3)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    proceed.set()
    async with source.git_source_operation():
        assert source.git_source_observation(git.repo).head == "a"*40


async def test_existing_source_wrappers_share_only_git_and_keep_file_hashes_fresh(source, git, tmp_path, monkeypatch):
    from pinet_core.creation import private_preview, studio
    from pinet_core.site_build import foundation
    public = tmp_path / "public"
    public.mkdir()
    files = {name: tmp_path / (name+".fixture") for name in ("importer", "network", "bridge", "verifier", "parser")}
    for file in files.values():
        file.write_bytes(b"first synthetic source bytes")
    monkeypatch.setattr(studio, "configuration", lambda: ("fixed-node", files["importer"], tmp_path,
        {"STUDIO_PUBLIC_CORE_DIR": str(public), "STUDIO_NETWORK_SETTINGS": str(files["network"])}))
    monkeypatch.setattr(foundation, "SCRIPT", files["bridge"])
    monkeypatch.setattr(foundation, "VERIFIER", files["verifier"])
    monkeypatch.setattr(foundation, "PARSER", files["parser"])
    cfg = SimpleNamespace(control_source_revision="a"*40)
    monkeypatch.setattr(foundation, "settings", lambda: cfg)
    async with source.git_source_operation():
        assert adapter.source_current()
        before = private_preview.native_sources()
        first = foundation.source_pins()
        for file in files.values():
            file.write_bytes(b"changed synthetic fixture bytes")
        cfg.control_source_revision = "b"*40
        after = private_preview.native_sources()
        second = foundation.source_pins()
        assert before["importer_sha256"] != after["importer_sha256"]
        assert before["network_sha256"] != after["network_sha256"]
        for field in ("bridge_sha256", "verifier_sha256", "parser_sha256"):
            assert getattr(first, field) != getattr(second, field)
        assert second.execution_source_revision == "b"*40
    assert len(git.calls) == 8


async def test_dirty_failure_is_not_a_reusable_result_and_is_safe_through_existing_wrapper(source, git):
    git.dirty = " M private-customer-name.txt"
    with pytest.raises(source.SourceObservationError) as error:
        async with source.git_source_operation():
            assert not adapter.source_current()
            git.dirty = ""
    assert str(error.value) == error.value.code == "source_unavailable"
    assert "private-customer-name" not in str(error.value)
    before = len(git.calls)
    async with source.git_source_operation():
        assert adapter.source_current()
    assert len(git.calls)-before == 4


async def test_simultaneous_thread_reads_do_not_repeat_the_entry_commands(source, git):
    async with source.git_source_operation():
        values = await asyncio.gather(*(asyncio.to_thread(source.git_source_observation, git.repo) for _ in range(20)))
        assert all(value == values[0] for value in values)
    assert len(git.calls) == 4


async def test_cancellation_during_exit_fence_closes_inherited_context_without_authorizing(source, git, monkeypatch):
    entered, proceed, finished = threading.Event(), threading.Event(), threading.Event()
    raw = subprocess.check_output
    saved = []
    calls = 0
    def delayed(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 3:  # exit revalidation's first fresh command
            entered.set()
            assert proceed.wait(3)
        try:
            return raw(*args, **kwargs)
        finally:
            if calls >= 4:
                finished.set()
    monkeypatch.setattr(subprocess, "check_output", delayed)
    async def operation():
        async with source.git_source_operation():
            source.git_source_observation(git.repo)
            saved.append(contextvars.copy_context())
    task = asyncio.create_task(operation())
    assert await asyncio.to_thread(entered.wait, 3)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    with pytest.raises(source.SourceObservationError):
        saved[0].run(source.git_source_observation, git.repo)
    proceed.set()
    assert await asyncio.to_thread(finished.wait, 3)
    async with source.git_source_operation():
        assert source.git_source_observation(git.repo).head == "a"*40


async def test_cached_lookup_cannot_return_after_path_read_overlaps_closing(source, git, monkeypatch):
    entered, release, closing = threading.Event(), threading.Event(), threading.Event()
    outcomes, children, returned, saved = [], [], [], []
    repository, finish = source._repository, source._Operation.finish
    def gated_repository(root):
        if not entered.is_set():
            entered.set()
            assert release.wait(3)
        return repository(root)
    def finishing(operation):
        closing.set()
        return finish(operation)
    monkeypatch.setattr(source._Operation, "finish", finishing)
    def repeated_lookup():
        try:
            outcomes.append(source.git_source_observation(git.repo))
        except source.SourceObservationError as error:
            outcomes.append(error)
    async def operation():
        async with source.git_source_operation():
            source.git_source_observation(git.repo)  # seed a successful entry
            saved.append(contextvars.copy_context())
            monkeypatch.setattr(source, "_repository", gated_repository)
            children.append(asyncio.create_task(asyncio.to_thread(repeated_lookup)))
            assert await asyncio.to_thread(entered.wait, 3)
        returned.append(True)
    pending = asyncio.create_task(operation())
    assert await asyncio.to_thread(closing.wait, 3)  # CLOSING while reader holds the lock in path IO
    release.set()
    result = await asyncio.gather(pending, return_exceptions=True)
    await asyncio.gather(*children)
    assert isinstance(outcomes[0], source.SourceObservationError), "Cached data cannot escape a closing operation"
    assert isinstance(result[0], source.SourceObservationError) and not returned
    with pytest.raises(source.SourceObservationError):
        saved[0].run(source.git_source_observation, git.repo)
