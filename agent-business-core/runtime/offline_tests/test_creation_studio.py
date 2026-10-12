"""Owned no-provider process bounds and studio input authority."""
import os
import sys

import pytest

from pinet_core.creation.studio import _execute, import_draft
from pinet_core.tasks.codex_transport import RunnerError


@pytest.mark.parametrize("selection", ["network", "public", "both"])
def test_operator_config_can_use_separate_companion_worktree(tmp_path, monkeypatch, selection):
    from pinet_core.creation import studio

    root = tmp_path / "private-core"
    runtime = root / "agent-business-core/runtime"
    (runtime / "artifacts").mkdir(parents=True)
    script = root / "content-studio/scripts/customer-creation-intake.mjs"
    script.parent.mkdir(parents=True)
    script.write_text("// fixture", encoding="utf-8")
    public = tmp_path / "separate-public-worktree"
    network = public / "config/niche-network.json"
    network.parent.mkdir(parents=True)
    network.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(studio, "ROOT", root)
    monkeypatch.setattr(studio, "RUNTIME", runtime)
    monkeypatch.setattr(studio.shutil, "which", lambda _: str(tmp_path / "node.exe"))
    monkeypatch.delenv("STUDIO_NETWORK_SETTINGS", raising=False)
    monkeypatch.delenv("PINET_PUBLIC_CORE_PATH", raising=False)
    if selection in {"network", "both"}:
        monkeypatch.setenv("STUDIO_NETWORK_SETTINGS", str(network))
    if selection in {"public", "both"}:
        monkeypatch.setenv("PINET_PUBLIC_CORE_PATH", str(public))
    monkeypatch.setenv("PRIVATE_FIXTURE_SECRET", "must-not-reach-child")
    _, actual_script, artifacts, child = studio.configuration()
    assert actual_script == script and artifacts == runtime / "artifacts"
    assert child["STUDIO_NETWORK_SETTINGS"] == str(network.resolve())
    assert child["STUDIO_PUBLIC_CORE_DIR"] == str(public.resolve())
    assert "PRIVATE_FIXTURE_SECRET" not in child


def test_sibling_companion_remains_the_unconfigured_default(tmp_path, monkeypatch):
    from pinet_core.creation import studio

    root = tmp_path / "private-core"
    runtime = root / "agent-business-core/runtime"
    (runtime / "artifacts").mkdir(parents=True)
    script = root / "content-studio/scripts/customer-creation-intake.mjs"
    script.parent.mkdir(parents=True)
    script.write_text("// fixture", encoding="utf-8")
    network = root.parent / "dovanos-memorycasting/config/niche-network.json"
    network.parent.mkdir(parents=True)
    network.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(studio, "ROOT", root)
    monkeypatch.setattr(studio, "RUNTIME", runtime)
    monkeypatch.setattr(studio.shutil, "which", lambda _: str(tmp_path / "node.exe"))
    monkeypatch.delenv("STUDIO_NETWORK_SETTINGS", raising=False)
    monkeypatch.delenv("PINET_PUBLIC_CORE_PATH", raising=False)
    assert studio.configuration()[3]["STUDIO_NETWORK_SETTINGS"] == str(network.resolve())


@pytest.mark.parametrize("bad", ["empty_network", "relative_network", "missing_network",
                                "empty_public", "relative_public", "missing_public", "mismatch"])
def test_invalid_operator_override_never_falls_back_to_a_valid_sibling(tmp_path, monkeypatch, bad):
    from pinet_core.creation import studio

    root = tmp_path / "private-core"
    runtime = root / "agent-business-core/runtime"
    (runtime / "artifacts").mkdir(parents=True)
    script = root / "content-studio/scripts/customer-creation-intake.mjs"
    script.parent.mkdir(parents=True)
    script.write_text("// fixture", encoding="utf-8")
    public = root.parent / "dovanos-memorycasting"
    network = public / "config/niche-network.json"
    network.parent.mkdir(parents=True)
    network.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(studio, "ROOT", root)
    monkeypatch.setattr(studio, "RUNTIME", runtime)
    monkeypatch.setattr(studio.shutil, "which", lambda _: str(tmp_path / "node.exe"))
    monkeypatch.delenv("STUDIO_NETWORK_SETTINGS", raising=False)
    monkeypatch.delenv("PINET_PUBLIC_CORE_PATH", raising=False)
    values = {"empty_network": ("STUDIO_NETWORK_SETTINGS", ""),
              "relative_network": ("STUDIO_NETWORK_SETTINGS", "config/niche-network.json"),
              "missing_network": ("STUDIO_NETWORK_SETTINGS", str(tmp_path / "missing/config/niche-network.json")),
              "empty_public": ("PINET_PUBLIC_CORE_PATH", ""),
              "relative_public": ("PINET_PUBLIC_CORE_PATH", "dovanos-memorycasting"),
              "missing_public": ("PINET_PUBLIC_CORE_PATH", str(tmp_path / "missing")),
              "mismatch": ("PINET_PUBLIC_CORE_PATH", str(root))}
    key, value = values[bad]
    monkeypatch.setenv(key, value)
    if bad == "mismatch":
        monkeypatch.setenv("STUDIO_NETWORK_SETTINGS", str(network))
    with pytest.raises(RunnerError) as error:
        studio.configuration()
    assert error.value.code == "studio_unavailable"


async def yes():
    return True


async def no():
    return False


async def test_fixed_owned_process_receives_json_without_shell():
    script = "import sys,json;v=json.loads(sys.stdin.buffer.read().decode('utf-8'));print(json.dumps({'value':v['message']}))"
    value = '$(secret) `not a command` and Lithuanian žodis'
    response = await _execute([sys.executable, "-c", script], {"message": value}, dict(os.environ), yes, 4)
    assert response == {"value": value}


@pytest.mark.parametrize("mode", ["timeout", "output_limit", "failure"])
async def test_owned_process_stops_on_timeout_bounds_or_specific_failure(mode):
    script = {"timeout": "import time;time.sleep(10)", "output_limit": "print('x'*1100000)",
              "failure": "import sys;print('{\"code\":\"intake_revision_conflict\"}',file=sys.stderr);sys.exit(1)"}[mode]
    with pytest.raises(RunnerError) as error:
        await _execute([sys.executable, "-c", script], {}, dict(os.environ), yes, 1 if mode == "timeout" else 4)
    assert error.value.code == {"timeout": "studio_timeout", "output_limit": "studio_output_limit",
                               "failure": "intake_revision_conflict"}[mode]


async def test_revocation_prevents_process_dispatch():
    with pytest.raises(RunnerError) as error:
        await _execute(["executable-does-not-exist"], {}, {}, no, 4)
    assert error.value.code == "authorization_revoked"


async def test_no_customer_domain_does_not_invent_a_host_or_public_site():
    with pytest.raises(RunnerError) as error:
        await import_draft({}, creation_id="irrelevant", revision=1, canonical_host=None, still_authorized=yes)
    assert error.value.code == "studio_domain_required"
