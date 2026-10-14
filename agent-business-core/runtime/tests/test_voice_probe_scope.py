"""Reject foreign audio drafts and unadmitted sites before transport/provider use."""
import json
import runpy
import sys
from pathlib import Path

import pytest

from pinet_core import pricing
from pinet_core.config import settings

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'


async def test_new_site_cannot_send_legacy_audio_draft(monkeypatch, tmp_path):
    cfg = settings()
    for key, value in {'environment': 'parasoplansetes-live-scope-test', 'm0_probe_enabled': True,
                       'voice_enabled': False, 'smtp_enabled': False,
                       'voice_sites': ['parasoplansetes']}.items():
        monkeypatch.setattr(cfg, key, value)
    monkeypatch.chdir(tmp_path)
    folder = tmp_path / 'artifacts/parasoplansetes-voice'
    folder.mkdir(parents=True)
    (folder / 'postcall-probe.json').write_text(json.dumps({
        'status': 'measured', 'draft_auto_send_reviewed': True,
        'site_id': 'traktoriupadangos', 'canonical_host': 'traktoriupadangos.lt',
    }), encoding='utf-8')
    monkeypatch.setattr(sys, 'argv', ['m0_mail_preview.py', '--site', 'parasoplansetes', '--send'])
    with pytest.raises(ValueError, match='audio_draft_site_conflict'):
        await runpy.run_path(str(SCRIPTS / 'm0_mail_preview.py'))['main']()
    assert cfg.environment == 'parasoplansetes-live-scope-test'


async def test_postcall_refuses_unadmitted_site_before_case_read(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, 'm0_probe_enabled', True)
    monkeypatch.setattr(cfg, 'voice_enabled', False)
    monkeypatch.setattr(cfg, 'smtp_enabled', False)
    monkeypatch.setattr(cfg, 'voice_sites', ['traktoriupadangos'])
    probe = runpy.run_path(str(SCRIPTS / 'm0_postcall_probe.py'))['probe']
    with pytest.raises(ValueError, match='site_not_admitted_for_probe'):
        await probe('not-read', 'fixture@client.example', 'http://127.0.0.1:5197', 'parasoplansetes')


async def test_new_site_requires_its_own_synthetic_audio_input(monkeypatch):
    cfg = settings()
    monkeypatch.setattr(cfg, 'google_api_key', 'fixture-not-a-key')
    monkeypatch.setattr(cfg, 'global_daily_budget_microusd', 100)
    monkeypatch.setattr(cfg, 'voice_cost_ceiling_microusd', 100)
    monkeypatch.setattr(cfg, 'live_model', 'gemini-3.8-live')
    monkeypatch.setattr(cfg, 'voice_sites', ['parasoplansetes'])
    monkeypatch.setattr(pricing, 'current', lambda: True)
    probe = runpy.run_path(str(SCRIPTS / 'm0_probe.py'))['probe']
    with pytest.raises(ValueError, match='explicit_synthetic_input_required'):
        await probe('parasoplansetes')
