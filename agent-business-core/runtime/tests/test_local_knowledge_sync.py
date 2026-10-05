import importlib.util
import json
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pinet_core.config import settings

path = Path(__file__).resolve().parents[1] / 'scripts/local_knowledge_sync.py'
spec = importlib.util.spec_from_file_location('local_knowledge_sync', path)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def local(monkeypatch, tmp_path):
    cfg = settings()
    for key, value in [('environment', 'local'), ('smtp_enabled', False), ('voice_enabled', False)]:
        monkeypatch.setattr(cfg, key, value)
    core = tmp_path / 'core'
    (core / 'lib/generated').mkdir(parents=True)
    (core / 'lib/niche-links.mjs').write_text('authoritative filter')
    (core / 'lib/generated/content-packages.json').write_text('[]')
    return core, tmp_path / 'output'


@pytest.mark.parametrize('field,value', [('environment', 'production'), ('voice_enabled', True), ('smtp_enabled', True)])
def test_sync_refuses_live_channels(monkeypatch, field, value):
    monkeypatch.setattr(settings(), field, value)
    with pytest.raises(ValueError, match='local_channels_off_required'):
        sync.require_local()


async def test_failed_current_projection_never_renews_saved_snapshot(monkeypatch, tmp_path):
    core, output = local(monkeypatch, tmp_path)
    output.mkdir()
    status = output / 'status.json'
    status.write_text('{"old": true}')
    async def failed(*args):
        raise RuntimeError('local_projection_failed')
    monkeypatch.setattr(sync, 'project', failed)
    with pytest.raises(RuntimeError):
        await sync.sync_once(core, output)
    assert status.read_text() == '{"old": true}'


async def test_all_sites_validated_before_any_registration(monkeypatch, tmp_path):
    core, output = local(monkeypatch, tmp_path)
    async def fake_project(core, directory):
        directory.mkdir(parents=True)
        (directory / 'registry.json').write_text('{}')
        for site in sync.agent_instructions.SITES:
            manifest = {'site_id': site, 'canonical_host': site + '.lt', 'contact_email': 'info@pinet.lt',
                'operator': 'MB Pinet', 'deployment_id': 'approved', 'generated_at': '2026-10-03T00:00:00Z',
                'pages': [{'id': 'home', 'title': 'Approved page', 'url': 'https://' + site + '.lt/', 'text': 'approved',
                    'revision_hash': 'a' * 64, 'projection_hash': 'b' * 64}]}
            if site == list(sync.agent_instructions.SITES)[-1]:
                manifest['canonical_host'] = 'other.lt'
            (directory / (site + '.json')).write_text(json.dumps(manifest))
    async def business(site):
        return SimpleNamespace(id=site, site_id=site, canonical_host=site + '.lt')
    @asynccontextmanager
    async def forbidden_write(*args):
        pytest.fail('no partial cross-niche registration')
        yield
    monkeypatch.setattr(sync, 'project', fake_project)
    monkeypatch.setattr(sync.service, 'business', business)
    monkeypatch.setattr(sync.db, 'transaction', forbidden_write)
    with pytest.raises(ValueError, match='local_projection_site_conflict'):
        await sync.sync_once(core, output)


def test_lock_and_retention_only_touch_own_json_revision_folders(tmp_path):
    with sync.exclusive(tmp_path / 'sync.lock'):
        with pytest.raises(OSError):
            with sync.exclusive(tmp_path / 'sync.lock'):
                pass
    root = tmp_path / 'revisions'
    root.mkdir()
    for _ in range(5):
        folder = root / str(uuid4())
        folder.mkdir()
        (folder / 'registry.json').write_text('{}')
    foreign = root / 'other-owner'
    foreign.mkdir()
    (foreign / 'keep.txt').write_text('keep')
    sync.prune_revisions(tmp_path, keep=1)
    assert (foreign / 'keep.txt').read_text() == 'keep'
    assert len([p for p in root.iterdir() if p.name != 'other-owner']) <= 1


async def test_missing_new_profile_never_blocks_six_existing_sources(monkeypatch, tmp_path):
    core, output = local(monkeypatch, tmp_path)
    legacy = sync.onboarding.LEGACY_SITES
    monkeypatch.setattr(sync.agent_instructions, 'SITES', legacy | {'dovanos123'})
    async def fake_project(core, directory):
        directory.mkdir(parents=True)
        (directory / 'registry.json').write_text(json.dumps({'generated_at': '2026-10-04T00:00:00Z',
            'packages_sha256': 'a' * 64, 'network_config_sha256': 'b' * 64}))
        for site in legacy:
            manifest = {'site_id': site, 'canonical_host': site + '.lt', 'contact_email': 'info@pinet.lt',
                'operator': 'MB Pinet', 'deployment_id': 'approved', 'generated_at': '2026-10-04T00:00:00Z',
                'pages': [{'id': 'home', 'title': 'Approved page', 'url': 'https://' + site + '.lt/',
                    'text': 'public', 'revision_hash': 'a' * 64, 'projection_hash': 'b' * 64}]}
            (directory / (site + '.json')).write_text(json.dumps(manifest))
    async def business(site):
        assert site in legacy
        return SimpleNamespace(id=site, site_id=site, canonical_host=site + '.lt')
    @asynccontextmanager
    async def transaction(*args):
        yield None
    receipts = []
    async def register(tx, item, manifest):
        receipts.append(item.site_id)
        return {'revision': 1}
    async def lock(*args):
        pass
    async def ready(tx, site):
        return sync.onboarding.defaults(site)
    monkeypatch.setattr(sync, 'project', fake_project)
    monkeypatch.setattr(sync.service, 'business', business)
    monkeypatch.setattr(sync.db, 'transaction', transaction)
    monkeypatch.setattr(sync.policy, 'lock', lock)
    monkeypatch.setattr(sync.knowledge, 'register', register)
    monkeypatch.setattr(sync.onboarding, 'status', ready)
    result = await sync.sync_once(core, output)
    assert set(receipts) == legacy and len(receipts) == 6
    assert result['excluded_sites'] == ['dovanos123']
