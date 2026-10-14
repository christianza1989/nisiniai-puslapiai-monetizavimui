"""Facebook workspace configuration regression, no DB or provider calls."""
import json
from types import SimpleNamespace

import pytest

from pinet_core.facebook import service as fb
from pinet_core.models import utcnow


@pytest.mark.asyncio
async def test_draft_context_uses_explicit_workspace_network_file(tmp_path, monkeypatch):
    core = tmp_path / "managed" / "CORE_SHARED"
    for relative in ["SKILLS/niche-client-acquisition/SKILL.md",
                     "SKILLS/niche-client-acquisition/references/facebook.md"]:
        target = core / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("Private draft only", encoding="utf-8")
    config = tmp_path / "other-workspace" / "niche-network.json"
    config.parent.mkdir()
    config.write_text(json.dumps({"operatorName": "Synthetic operator", "defaultEmail": "info@example.test",
        "contactsBySite": {"synthetic": {"operatorName": "Site operator", "email": "site@example.test"}}}),
        encoding="utf-8")
    monkeypatch.setattr(fb, "ROOT", core)
    monkeypatch.setenv("STUDIO_NETWORK_SETTINGS", str(config))
    monkeypatch.delenv("PINET_PUBLIC_CORE_PATH", raising=False)

    async def projection(_tx):
        return None

    monkeypatch.setattr(fb.knowledge, "projection", projection)
    signal = SimpleNamespace(id="signal", kind="signal", record_key="signal", state="recorded",
        revision=1, created_at=utcnow(), case_id=None, payload={"data_class": "synthetic"})
    context = await fb.draft_context(None, SimpleNamespace(site_id="synthetic", canonical_host="example.test"), signal)
    assert context["contact_email"] == "site@example.test"
    assert context["operator"] == "Site operator"
    assert context["knowledge_status"] == "unavailable"
    assert len(context["instruction_sources"]) == 2


def test_network_file_precedence_and_legacy_sibling(tmp_path, monkeypatch):
    monkeypatch.setattr(fb, "ROOT", tmp_path / "CORE_SHARED")
    monkeypatch.delenv("STUDIO_NETWORK_SETTINGS", raising=False)
    monkeypatch.delenv("PINET_PUBLIC_CORE_PATH", raising=False)
    assert fb.network_settings_path() == tmp_path / "dovanos-memorycasting/config/niche-network.json"
    monkeypatch.setenv("PINET_PUBLIC_CORE_PATH", str(tmp_path / "public"))
    assert fb.network_settings_path() == tmp_path / "public/config/niche-network.json"
    monkeypatch.setenv("STUDIO_NETWORK_SETTINGS", str(tmp_path / "override.json"))
    assert fb.network_settings_path() == tmp_path / "override.json"


@pytest.mark.asyncio
async def test_invalid_explicit_network_file_does_not_fall_back(tmp_path, monkeypatch):
    explicit = tmp_path / "missing.json"
    monkeypatch.setenv("STUDIO_NETWORK_SETTINGS", str(explicit))
    assert fb.network_settings_path() == explicit
    with pytest.raises(FileNotFoundError):
        fb.network_settings_path().read_text(encoding="utf-8")
