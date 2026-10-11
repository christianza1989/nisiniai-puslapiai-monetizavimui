"""Explicit separate I2/acquisition review; never changes an owner checkout or live DB."""
import argparse
import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

BOOTSTRAP_SHA = '4e41ad5ac23838819d11d152c0244c805128ea762a8053fdaac866c1dfb7f0df'


def configuration(path):
    value = json.loads(path.read_text(encoding='utf-8'))
    if value.get('fixture_only') is not True:
        raise ValueError('isolated_review_required')
    for name, user in [('database_url', 'pinet_runtime'), ('admin_database_url', 'acqadmin')]:
        url = make_url(value[name])
        if (url.drivername != 'postgresql+asyncpg' or url.host != '127.0.0.1' or url.port != 15541
                or url.database != 'acquisition_i2_review' or url.username != user
                or not re.fullmatch('[a-f0-9]{64}', url.password or '')):
            raise ValueError('isolated_review_binding_required')
    return value


async def privileges(engine):
    async with engine.begin() as tx:
        rows = (await tx.execute(text("""SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity,
          has_table_privilege('pinet_runtime',c.oid,'SELECT'),
          has_table_privilege('pinet_runtime',c.oid,'INSERT'),
          has_table_privilege('pinet_runtime',c.oid,'UPDATE'),
          has_table_privilege('pinet_runtime',c.oid,'DELETE')
          FROM pg_class c WHERE c.relkind='r' AND c.relnamespace='public'::regnamespace
          AND (c.relname LIKE 'control_%' OR c.relname LIKE 'acquisition_%') ORDER BY c.relname"""))).all()
        return {row[0]: list(row[1:]) for row in rows}


async def startup(cfg):
    from pinet_core.acquisition.interfaces import Scope
    from pinet_core.acquisition.ledger import AcquisitionLedger
    from pinet_core.acquisition.recipient_binding import RecipientKeyGrant
    from pinet_core.acquisition.routes import CaptureRuntime, capture_app
    from pinet_core.acquisition.transport_auth import WEBHOOK_PERMISSIONS, WebhookGrant
    from pinet_core.db import Database

    scope = Scope(business_id=str(uuid4()), site_id='madbeauty',
                  environment_id='isolated-bootstrap-guard', environment_class='test')
    key = RecipientKeyGrant('review-recipient', os.urandom(32), scope, 'madbeauty-native')
    grant = WebhookGrant('review-transport', os.urandom(32), 'madbeauty-native', scope, WEBHOOK_PERMISSIONS)
    database = Database(cfg['database_url'])
    app = capture_app(CaptureRuntime(AcquisitionLedger(database, {(scope, key.adapter_id, key.key_id): key}),
                                     {grant.key_id: grant}))
    try:
        async with app.router.lifespan_context(app):
            return 'PASS'
    except RuntimeError as error:
        if str(error) != 'Acquisition capture requires forced RLS and immutable receipt privileges':
            raise
        return 'BLOCKED_IMMUTABLE_GRANTS'
    finally:
        await database.engine.dispose()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--phase', choices=['baseline', 'exclusion-only', 'proposal', 'partial'], required=True)
    args = parser.parse_args()
    snapshot = args.snapshot.resolve()
    if args.output.exists() or (snapshot / '.env').exists():
        raise ValueError('existing_review_evidence_preserved')
    import pinet_core

    if not Path(pinet_core.__file__).resolve().is_relative_to(snapshot / 'src'):
        raise ValueError('exact_composite_runtime_required')
    cfg = configuration(args.config)
    env = {**os.environ, 'PINET_ADMIN_DATABASE_URL': cfg['admin_database_url'],
           'PINET_DATABASE_URL': cfg['database_url'],
           'PINET_DB_RUNTIME_PASSWORD': make_url(cfg['database_url']).password,
           'PINET_CONTROL_ENABLED': 'false', 'PINET_CHAT_ENABLED': 'false',
           'PINET_CHAT_RUNNER_ENABLED': 'false', 'PINET_SMTP_ENABLED': 'false',
           'PINET_VOICE_ENABLED': 'false', 'PYTHONPATH': str(snapshot / 'src')}
    engine = create_async_engine(cfg['admin_database_url'])
    try:
        if args.phase == 'baseline':
            assert hashlib.sha256((snapshot / 'scripts/bootstrap.py').read_bytes()).hexdigest() == BOOTSTRAP_SHA
            async with engine.begin() as tx:
                assert not await tx.scalar(text("SELECT count(*) FROM pg_tables WHERE schemaname='public'"))
            subprocess.run([sys.executable, 'scripts/bootstrap.py', '--role-only'], cwd=snapshot, env=env, check=True)
            subprocess.run([sys.executable, '-m', 'alembic', 'upgrade', '0011_control_tasks'],
                           cwd=snapshot, env=env, check=True)
            from pinet_core.acquisition.ledger_schema import DDL, isolation_sql

            async with engine.begin() as tx:
                for statement in (*DDL, *isolation_sql()):
                    await tx.execute(text(statement))
                version = await tx.scalar(text('SELECT version_num FROM alembic_version'))
            before = await privileges(engine)
            assert await startup(cfg) == 'PASS'
            subprocess.run([sys.executable, 'scripts/bootstrap.py'], cwd=snapshot, env=env, check=True)
            after = await privileges(engine)
            assert before['acquisition_receipts'][4:] == [False, False]
            assert after['acquisition_receipts'][4:] == [True, True]
            assert await startup(cfg) == 'BLOCKED_IMMUTABLE_GRANTS'
            assert {k: v for k, v in before.items() if k.startswith('control_')} == {
                k: v for k, v in after.items() if k.startswith('control_')}
            result = {'status': 'REPRODUCED_BLOCKING_GRANT_REGRESSION', 'migration_tip': version,
                      'before': before, 'after': after, 'startup_after': 'BLOCKED_IMMUTABLE_GRANTS'}
        elif args.phase == 'exclusion-only':
            before = await privileges(engine)
            assert before['acquisition_receipts'][4:] == [True, True]
            subprocess.run([sys.executable, 'scripts/bootstrap.py'], cwd=snapshot, env=env, check=True)
            assert await privileges(engine) == before
            assert await startup(cfg) == 'BLOCKED_IMMUTABLE_GRANTS'
            result = {'status': 'EXCLUSION_ONLY_DOES_NOT_REPAIR_EXISTING_GRANTS',
                      'startup_after': 'BLOCKED_IMMUTABLE_GRANTS'}
        elif args.phase == 'partial':
            before = await privileges(engine)
            async with engine.begin() as tx:
                await tx.execute(text('ALTER TABLE acquisition_receipts RENAME TO review_hidden_receipts'))
            try:
                failed = subprocess.run([sys.executable, 'scripts/bootstrap.py'], cwd=snapshot, env=env,
                                        capture_output=True, text=True)
                assert failed.returncode != 0
                assert 'Partial acquisition schema; bootstrap grants refused' in failed.stderr
            finally:
                async with engine.begin() as tx:
                    await tx.execute(text('ALTER TABLE review_hidden_receipts RENAME TO acquisition_receipts'))
            assert await privileges(engine) == before
            assert await startup(cfg) == 'PASS'
            result = {'status': 'PARTIAL_SCHEMA_REFUSED_AND_RENAME_RESTORED',
                      'no_dropped_tables': True, 'privileges_unchanged': True, 'startup_after': 'PASS'}
        else:
            before = await privileges(engine)
            assert before['acquisition_receipts'][4:] == [True, True]
            subprocess.run([sys.executable, 'scripts/bootstrap.py'], cwd=snapshot, env=env, check=True)
            after = await privileges(engine)
            assert after['acquisition_receipts'][2:] == [True, True, False, False]
            for name in ('acquisition_campaigns', 'acquisition_invitations', 'acquisition_challenges'):
                assert after[name][2:] == [True, True, True, False]
            assert await startup(cfg) == 'PASS'
            subprocess.run([sys.executable, 'scripts/bootstrap.py'], cwd=snapshot, env=env, check=True)
            assert await privileges(engine) == after
            assert {k: v for k, v in before.items() if k.startswith('control_')} == {
                k: v for k, v in after.items() if k.startswith('control_')}
            result = {'status': 'PROPOSED_COPY_PASS_NOT_OWNER_ADOPTION', 'before': before,
                      'after': after, 'startup_after': 'PASS', 'repeated_bootstrap_unchanged': True}
        result.update({'i2_source': '120a84ac6afc5b642b71735c2cba0d39acdf6650',
                       'acquisition_baseline': 'ec99263ddb1105963d2d58acae8940cf3dfa5e4d',
                       'actual_bootstrap_sha256': hashlib.sha256((snapshot / 'scripts/bootstrap.py').read_bytes()).hexdigest(),
                       'actual_module_grants_sha256': hashlib.sha256(
                           (snapshot / 'src/pinet_core/acquisition/ledger_schema.py').read_bytes()).hexdigest(),
                       'actual_postgresql': True, 'actual_0012_migration': False,
                       'normal_api_mounted': False, 'external_sent': False})
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('x', encoding='utf-8') as output:
            json.dump(result, output, indent=2)
        print(json.dumps({k: v for k, v in result.items() if k not in ('before', 'after')}))
    finally:
        await engine.dispose()


if __name__ == '__main__':
    asyncio.run(main())
