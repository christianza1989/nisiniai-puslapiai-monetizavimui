"""Known-incapable local runner configuration cannot admit new paid work."""
import hashlib
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

import pytest

from pinet_core.config import settings
from pinet_core.tasks.codex_transport import RunnerError
from pinet_core.workspace_team import adapter, handler, service


@pytest.fixture
def unavailable(monkeypatch):
    cfg = settings()
    for key, value in {"workspace_team_runner_enabled": True, "workspace_team_actor_ids": ["inert-owner"],
            "chat_daily_limit": 20, "chat_workspace": ""}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.setattr(service, "source_current", lambda: True)
    return SimpleNamespace(id="inert", user_id="inert-owner", anchor_kind="business", archived_at=None)


async def test_unavailable_runner_is_not_advertised_by_admission_blockers(unavailable):
    class Tx:
        async def scalar(self, _):
            return None

    assert await service.blockers(Tx(), unavailable) == ["team_execution_disabled"]


async def test_unavailable_runner_refuses_before_native_attempt_scope(unavailable, monkeypatch):
    @asynccontextmanager
    async def forbidden(**_):
        pytest.fail("Incapable runner reached native reservation scope")
        yield

    monkeypatch.setattr(handler, "scope", forbidden)
    with pytest.raises(RunnerError, match="runner_unavailable"):
        await handler.reserve({"_user_id": "inert-owner"}, "plan", {})


@pytest.fixture
def capable(monkeypatch, tmp_path):
    cfg = settings()
    for key, value in {"workspace_team_runner_enabled": True, "chat_workspace": str(tmp_path),
            "chat_codex_executable": sys.executable,
            "chat_codex_sha256": hashlib.sha256(Path(sys.executable).read_bytes()).hexdigest(),
            "chat_runner_seconds": 30, "customer_text_runner_enabled": False, "chat_model": "unselected"}.items():
        monkeypatch.setattr(cfg, key, value)
    return cfg


def test_capable_fixed_team_runner_does_not_require_customer_text_module(capable):
    assert adapter.runner_ready()


@pytest.mark.parametrize("key,value", [("chat_workspace", ""), ("chat_workspace", "."),
    ("chat_codex_executable", ""), ("chat_codex_executable", "python"),
    ("chat_codex_sha256", "0" * 64), ("chat_runner_seconds", 9),
    ("chat_runner_seconds", 181), ("workspace_team_runner_enabled", False)])
def test_fixed_runner_config_refuses_incapable_values(capable, monkeypatch, key, value):
    monkeypatch.setattr(capable, key, value)
    assert not adapter.runner_ready()


def test_unreadable_binary_is_closed_readiness_not_an_api_error(capable, monkeypatch):
    def unreadable(_, *args, **kwargs):
        raise OSError("Inert binary unavailable")

    monkeypatch.setattr(Path, "open", unreadable)
    assert not adapter.runner_ready()


async def test_actual_adapter_reuses_same_refusal_before_transport(capable, monkeypatch):
    monkeypatch.setattr(capable, "chat_workspace", "")

    async def forbidden(*_, **__):
        pytest.fail("Incapable fixed runner reached transport")

    monkeypatch.setattr(adapter.codex, "execute", forbidden)
    with pytest.raises(RunnerError, match="runner_unavailable"):
        await adapter.run("plan", {}, forbidden)
