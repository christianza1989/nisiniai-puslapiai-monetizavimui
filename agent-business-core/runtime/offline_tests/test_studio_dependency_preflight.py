"""Import readiness fails before SQL or paid work; no real provider or database."""
from pathlib import Path

import pytest

from pinet_core.creation import studio
from pinet_core.tasks.codex_transport import RunnerError


def ready():
    return {"version": "customer-content-preflight.v1", "state": "ready",
            "modules": ["intake", "writer", "workflow", "model", "sharp"], "sharpVersion": "0.35.5",
            "providerCalls": 0, "initialization": "not-performed", "server": "not-started"}


@pytest.fixture
def configured(tmp_path, monkeypatch):
    script = tmp_path / "content-studio/scripts/customer-content-preflight.mjs"
    script.parent.mkdir(parents=True)
    script.write_text("// inert fixture", encoding="utf-8")
    environment = {"STUDIO_NETWORK_SETTINGS": "configured-network", "STUDIO_PUBLIC_CORE_DIR": "configured-core"}
    node = tmp_path / "fixed-node"
    monkeypatch.setattr(studio, "ROOT", tmp_path)
    monkeypatch.setattr(studio, "configuration", lambda: (node, Path("unused-intake"), tmp_path, environment))
    return node, script, environment


async def yes():
    return True


async def test_fixed_helper_and_transport_are_bounded_without_case_inputs(configured, monkeypatch):
    node, script, environment = configured
    async def execute(arguments, payload, child, authorized, seconds):
        assert arguments == [node, script]
        assert payload == {"version": "customer-content-preflight.v1"}
        assert child == environment and seconds == 10 and await authorized()
        return ready()
    monkeypatch.setattr(studio, "_execute", execute)
    assert await studio.preflight_dependencies(yes) == ready()


async def test_missing_helper_refuses_before_any_subprocess(configured, monkeypatch):
    configured[1].unlink()
    async def forbidden(*args):
        pytest.fail("missing fixed helper must not dispatch")
    monkeypatch.setattr(studio, "_execute", forbidden)
    with pytest.raises(RunnerError) as error:
        await studio.preflight_dependencies(yes)
    assert error.value.code == "studio_dependencies_unavailable"


@pytest.mark.parametrize("tamper", ["array", "version", "state", "modules", "provider", "boolean",
                                   "initialized", "server", "sharp", "extra"])
async def test_noncanonical_or_unsafe_probe_response_cannot_pass(configured, monkeypatch, tamper):
    value = ready()
    field = {"version": ("version", "other"), "state": ("state", "failed"),
             "modules": ("modules", ["sharp"]), "provider": ("providerCalls", 1),
             "boolean": ("providerCalls", False), "initialized": ("initialization", "performed"),
             "server": ("server", "started"), "sharp": ("sharpVersion", "untrusted path"),
             "extra": ("caseData", "must not pass")}
    if tamper == "array":
        value = []
    else:
        key, item = field[tamper]
        value[key] = item
    async def execute(*args):
        return value
    monkeypatch.setattr(studio, "_execute", execute)
    with pytest.raises(RunnerError) as error:
        await studio.preflight_dependencies(yes)
    assert error.value.code == "studio_dependencies_unavailable"


@pytest.mark.parametrize("code", ["studio_dependency_missing", "studio_timeout", "authorization_revoked"])
async def test_original_import_timeout_and_authorization_errors_survive(configured, monkeypatch, code):
    async def execute(*args):
        raise RunnerError(code)
    monkeypatch.setattr(studio, "_execute", execute)
    with pytest.raises(RunnerError) as error:
        await studio.preflight_dependencies(yes)
    assert error.value.code == code


async def test_supervisor_import_failure_precedes_database_and_execution_checks(monkeypatch):
    from pinet_core.site_build import lifecycle
    calls = []
    monkeypatch.setattr(lifecycle, "actors", lambda: ("fixed-owner",))
    async def source_guard():
        calls.append("source")
    async def failure(authorized):
        assert await authorized()
        calls.append("dependencies")
        raise RunnerError("studio_dependency_missing")
    def forbidden(*args):
        pytest.fail("no database, CLI execution check or provider after missing dependencies")
    monkeypatch.setattr(lifecycle, "source_guard", source_guard)
    monkeypatch.setattr(lifecycle.studio, "preflight_dependencies", failure)
    monkeypatch.setattr(lifecycle.discovery.adapter, "available", forbidden)
    monkeypatch.setattr(lifecycle.guide_adapter, "execution_hash", forbidden)
    monkeypatch.setattr(lifecycle.db, "registry", forbidden)
    with pytest.raises(RunnerError) as error:
        await lifecycle.preflight()
    assert error.value.code == "studio_dependency_missing" and calls == ["source", "source", "dependencies"]
