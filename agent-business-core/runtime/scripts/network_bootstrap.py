"""Register only mapped, approved local sites without changing role privileges or policy."""
import argparse
import asyncio
import json
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.config import settings
from pinet_core.models import Business, new_id
from pinet_core.profiles import get


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('registry', type=Path)
    args = parser.parse_args()
    if settings().environment != 'local' or settings().voice_enabled or settings().smtp_enabled:
        raise ValueError('local_disabled_channels_required')
    sites = json.loads(args.registry.read_text(encoding='utf-8'))['sites']
    engine = create_async_engine(settings().admin_database_url)
    async with engine.begin() as tx:
        for site in sites:
            get(site['site_id'], site['canonical_host'])
            row = (await tx.execute(text('SELECT canonical_host FROM businesses WHERE site_id=:s'),
                {'s': site['site_id']})).first()
            if row and row[0] != site['canonical_host']:
                raise ValueError('existing_site_mapping_conflict')
            if not row:
                await tx.execute(Business.__table__.insert().values(id=new_id(), site_id=site['site_id'],
                    canonical_host=site['canonical_host']))
    await engine.dispose()
    print(json.dumps({'registered_sites': [s['site_id'] for s in sites], 'voice_enabled': False,
        'smtp_enabled': False, 'role_privileges_changed': False}))


if __name__ == '__main__':
    asyncio.run(main())
