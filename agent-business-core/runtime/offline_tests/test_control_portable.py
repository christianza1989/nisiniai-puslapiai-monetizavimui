"""Portable setup configurability/non-overwrite and worker pin refusal; no Docker/provider calls."""
import importlib.util
import json
import sys
from pathlib import Path

import pytest

from pinet_core.config import settings


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_setup_ports_instance_and_existing_private_files_preserved(tmp_path, monkeypatch):
    source = Path(__file__).resolve().parents[1] / "scripts/control_local_setup.py"
    runtime = tmp_path / "runtime"
    script = runtime / "scripts/control_local_setup.py"
    script.parent.mkdir(parents=True)
    script.write_bytes(source.read_bytes())
    public = tmp_path / "public"
    (public / "lib/generated").mkdir(parents=True)
    (public / "lib/generated/content-packages.json").write_text(json.dumps([{
        "site": {"id": "fixture", "canonicalHost": "fixture.example.test", "name": "Synthetic fixture"}}]), "utf-8")
    module = load(script, "portable_setup_fixture")
    monkeypatch.setattr(module.subprocess, "check_output",
                        lambda args, **kwargs: "" if "status" in args else "a" * 40)
    monkeypatch.setattr(sys, "argv", [str(script), "--public-core", str(public), "--name", "pinet-fixture",
                                     "--db-port", "16439", "--api-port", "8954"])
    module.main()
    env = (runtime / ".env").read_text()
    assert "127.0.0.1:16439/pinet" in env and "127.0.0.1:8954" in env
    assert "PINET_CHAT_ENABLED=false" in env and "PINET_CONTROL_MODE=local" in env
    compose = (runtime / "artifacts/control-local/compose.private.yaml").read_text()
    assert "container_name: pinet-fixture" in compose and "127.0.0.1:16439:5432" in compose
    assert "__" not in compose
    before = {p: p.read_bytes() for p in runtime.rglob("*") if p.is_file()}
    with pytest.raises(SystemExit, match="Existing configuration preserved"):
        module.main()
    assert before == {p: p.read_bytes() for p in runtime.rglob("*") if p.is_file()}


@pytest.mark.parametrize("port,name", [(80, "pinet-fixture"), (70000, "pinet-fixture"), (15438, "bad;command")])
def test_setup_rejects_invalid_inputs_before_writes(port, name, monkeypatch):
    script = Path(__file__).resolve().parents[1] / "scripts/control_local_setup.py"
    module = load(script, "portable_invalid_fixture")
    monkeypatch.setattr(sys, "argv", [str(script), "--public-core", "missing", "--db-port", str(port), "--name", name])
    with pytest.raises(SystemExit, match="Invalid private instance"):
        module.main()


def test_runner_pin_mismatch_refuses_before_cli(tmp_path, monkeypatch):
    script = Path(__file__).resolve().parents[1] / "scripts/control_portable.py"
    module = load(script, "portable_preflight_fixture")
    cfg = settings()
    for key, value in {"chat_enabled": True, "chat_runner_enabled": True, "chat_model": "gpt-6-luna",
                       "chat_operator_user_id": "00000000-0000-4000-8000-000000000001",
                       "chat_codex_executable": str(tmp_path / "synthetic.exe"),
                       "chat_workspace": str(tmp_path), "chat_codex_sha256": "a" * 64}.items():
        monkeypatch.setattr(cfg, key, value)
    (tmp_path / "synthetic.exe").write_bytes(b"not executable; must never run")
    with pytest.raises(ValueError, match="runner_binary_pin_mismatch"):
        module.runner_check()
