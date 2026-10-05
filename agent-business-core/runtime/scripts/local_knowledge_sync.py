"""Explicit local deployment adapter using the public core's publishing filter.

This helper never republishes a site or renews a saved calibration snapshot.
Each sync recomputes approved pages from the current public core. Production
continues to use the authenticated deployed edge endpoint.
"""
import argparse
import asyncio
import json
import os
import subprocess
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID, uuid4

from pinet_core import agent_instructions, knowledge, onboarding, policy, service
from pinet_core.config import settings
from pinet_core.contracts import Knowledge
from pinet_core.db import db
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts/local-knowledge'


def require_local():
    cfg = settings()
    if cfg.environment != 'local' or cfg.voice_enabled or cfg.smtp_enabled:
        raise ValueError('local_channels_off_required')


@contextmanager
def exclusive(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+b') as handle:
        handle.seek(0)
        if not handle.read(1):
            handle.write(b'1')
            handle.flush()
        handle.seek(0)
        if os.name == 'nt':
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == 'nt':
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


async def project(core, directory):
    process = await asyncio.create_subprocess_exec('node', str(ROOT / 'scripts/network_manifest.mjs'),
        str(core), str(directory), stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    try:
        code = await asyncio.wait_for(process.wait(), timeout=30)
    except TimeoutError:
        process.kill()
        await process.wait()
        raise RuntimeError('local_projection_timeout') from None
    if code:
        raise RuntimeError('local_projection_failed')


def prune_revisions(output, keep=3):
    root = (output / 'revisions').resolve()
    folders = []
    for folder in root.iterdir():
        try:
            UUID(folder.name)
        except ValueError:
            continue
        if not folder.is_dir() or folder.resolve().parent != root:
            continue
        folders.append(folder)
    folders.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    for folder in folders[keep:]:
        files = list(folder.iterdir())
        if any(not path.is_file() or path.suffix != '.json' or path.resolve().parent != folder.resolve() for path in files):
            continue
        for path in files:
            path.unlink()
        folder.rmdir()


async def sync_once(core, output=OUTPUT):
    require_local()
    core = core.resolve()
    if not (core / 'lib/niche-links.mjs').is_file() or not (core / 'lib/generated/content-packages.json').is_file():
        raise ValueError('existing_public_core_required')
    output.mkdir(parents=True, exist_ok=True)
    directory = output / 'revisions' / str(uuid4())
    await project(core, directory)
    registry = json.loads((directory / 'registry.json').read_text(encoding='utf-8'))
    # Validate every registered niche before writing any knowledge. Additional
    # site packages do not onboard themselves into the agent core.
    manifests = {}
    for site in agent_instructions.SITES & onboarding.LEGACY_SITES:
        manifest = Knowledge.model_validate_json((directory / (site + '.json')).read_text(encoding='utf-8'))
        item = await service.business(site)
        if manifest.site_id != site or manifest.canonical_host != item.canonical_host:
            raise ValueError('local_projection_site_conflict')
        knowledge.validate(item, manifest)
        manifests[site] = (item, manifest)
    receipts = {}
    for site, (item, manifest) in manifests.items():
        async with db.transaction(item.id, 'local') as tx:
            await policy.lock(tx, item.id, 'local')
            if (await onboarding.status(tx, site))['source_ready']:
                receipts[site] = await knowledge.register(tx, item, manifest)
            else:
                receipts[site] = {'status': 'disabled', 'reason': 'site_source_not_admitted'}
    result = {'status': 'refreshed', 'source': 'current_public_core_projectPublicPages',
        'generated_at': registry['generated_at'], 'packages_sha256': registry['packages_sha256'],
        'network_config_sha256': registry['network_config_sha256'],
        'adapter_sha256': digest((ROOT / 'scripts/network_manifest.mjs').read_text(encoding='utf-8')),
        'public_domain_launch_verified': False, 'sites': receipts,
        'projection_directory': str(directory.relative_to(output)),
        'excluded_sites': sorted(agent_instructions.SITES - onboarding.LEGACY_SITES)}
    temporary = output / 'status.tmp'
    temporary.write_text(json.dumps(result, indent=2), encoding='utf-8')
    os.replace(temporary, output / 'status.json')
    prune_revisions(output)
    return result


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-core', type=Path,
        default=Path(os.environ.get('PINET_PUBLIC_CORE_PATH', 'C:/Users/lenovo/Documents/dovanos-memorycasting')))
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    require_local()
    interval = max(5, min(settings().knowledge_refresh_seconds, settings().knowledge_ttl_seconds // 2))
    try:
        with exclusive(OUTPUT / 'sync.lock'):
            while True:
                try:
                    result = await sync_once(args.public_core)
                    print(json.dumps({'status': result['status'], 'sites': len(result['sites']),
                        'generated_at': result['generated_at']}), flush=True)
                except Exception as error:
                    # Fail closed: a failed projection never extends freshness.
                    print(json.dumps({'status': 'unavailable', 'reason': type(error).__name__}), flush=True)
                    if args.once:
                        raise
                if args.once:
                    break
                await asyncio.sleep(interval)
    finally:
        await db.engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
