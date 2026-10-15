"""No-provider API lifecycle wiring and supervisor bounds."""
import ast
import asyncio
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest


@pytest.mark.parametrize("name", ["api.py", "control_api.py"])
def test_api_lifespan_starts_and_stops_the_opt_in_supervisor(name):
    tree = ast.parse((Path(__file__).resolve().parents[1]/"src/pinet_core"/name).read_text("utf8"))
    lifespan = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "lifespan")
    methods = {node.func.attr for node in ast.walk(lifespan) if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "build_lifecycle"}
    assert {"start", "stop"} <= methods


def test_supervisor_defaults_are_off_and_bounded():
    from pinet_core.config import Settings
    assert Settings.model_fields["site_build_api_runner_enabled"].default is False
    assert Settings(_env_file=None).site_build_actor_ids == []


async def test_disabled_start_does_not_probe_or_start_work(monkeypatch):
    from pinet_core.site_build import lifecycle
    monkeypatch.setattr(lifecycle, "settings", lambda: SimpleNamespace(site_build_api_runner_enabled=False))
    async def prohibited():
        raise AssertionError("default-OFF must not probe")
    monkeypatch.setattr(lifecycle, "preflight", prohibited)
    app = SimpleNamespace(state=SimpleNamespace())
    assert await lifecycle.start(app) is None
    assert app.state.site_build_runner_status == "disabled"
    await lifecycle.stop(None)


@pytest.mark.parametrize("values", [[], ["invalid"], [True], [str(uuid4())]*2,
    [str(uuid4()) for _ in range(17)]])
def test_allowlist_rejects_empty_invalid_duplicates_or_overflow(monkeypatch, values):
    from pinet_core.site_build import lifecycle
    monkeypatch.setattr(lifecycle.service, "enabled", lambda: None)
    monkeypatch.setattr(lifecycle, "settings", lambda: SimpleNamespace(
        control_enabled=True, site_build_api_runner_enabled=True,
        business_discovery_runner_enabled=True, site_build_actor_ids=values))
    with pytest.raises(RuntimeError, match="allowlist_invalid"):
        lifecycle.actors()


async def test_stop_joins_work_cleanup_despite_repeated_caller_cancel():
    from pinet_core.site_build import lifecycle
    entered, cleaning, release, finished = (asyncio.Event() for _ in range(4))
    async def work():
        entered.set()
        try:
            await asyncio.Event().wait()
        finally:
            cleaning.set()
            await release.wait()
            finished.set()
    task = asyncio.create_task(work())
    await entered.wait()
    stopping = asyncio.create_task(lifecycle.stop(task))
    try:
        await cleaning.wait()
        stopping.cancel()
        stopping.cancel()
        await asyncio.sleep(0)
        assert not stopping.done() and not finished.is_set()
        release.set()
        with pytest.raises(asyncio.CancelledError):
            await stopping
        assert task.done() and finished.is_set()
    finally:
        release.set()
        await asyncio.gather(task, stopping, return_exceptions=True)


async def test_source_failure_stops_the_named_supervisor(monkeypatch):
    from pinet_core.site_build import lifecycle
    from pinet_core.tasks.codex_transport import RunnerError
    monkeypatch.setattr(lifecycle, "settings", lambda: SimpleNamespace(site_build_api_runner_enabled=True))
    async def ready():
        return None
    async def failure(*_):
        raise RunnerError("source_unavailable")
    monkeypatch.setattr(lifecycle, "preflight", ready)
    monkeypatch.setattr(lifecycle, "sweep", failure)
    app = SimpleNamespace(state=SimpleNamespace())
    task = await lifecycle.start(app)
    assert task.get_name() == "maintained-site-build-supervisor"
    with pytest.raises(RunnerError, match="source_unavailable"):
        await task
    await asyncio.sleep(0)
    assert app.state.site_build_runner_status == "failed"
    await lifecycle.stop(task)
