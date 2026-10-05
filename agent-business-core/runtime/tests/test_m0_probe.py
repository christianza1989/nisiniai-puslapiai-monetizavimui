import runpy
from pathlib import Path

from pinet_core import pricing
from pinet_core.config import settings

probe = runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts/m0_probe.py"))["probe"]


async def test_probe_without_key_does_not_claim_audio_verification(monkeypatch):
    monkeypatch.setattr(settings(), "google_api_key", "")
    result = await probe()
    assert result["status"] == "blocked_missing_google_api_key"
    assert not result["full_m0_pass"]


async def test_probe_with_key_requires_declared_budget_before_provider_or_database(monkeypatch):
    monkeypatch.setattr(settings(), "google_api_key", "synthetic-not-a-key")
    monkeypatch.setattr(settings(), "global_daily_budget_microusd", 0)
    result = await probe()
    assert result["status"] == "blocked_missing_explicit_budget"
    assert not result["full_m0_pass"]


async def test_probe_expired_rate_review_does_not_open_provider_connection(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, "google_api_key", "synthetic-not-a-key")
    monkeypatch.setattr(cfg, "global_daily_budget_microusd", 100)
    monkeypatch.setattr(cfg, "voice_cost_ceiling_microusd", 100)
    monkeypatch.setattr(pricing, "current", lambda: False)
    assert (await probe())["status"] == "blocked_model_or_rate_review"
