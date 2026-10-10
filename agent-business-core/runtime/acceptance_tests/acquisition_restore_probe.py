"""Read-only verification of a separately restored capture snapshot, never live restore."""
import asyncio
import importlib.util
import json
import os
from pathlib import Path

import httpx
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.acquisition.capture_config import capture_config
from pinet_core.acquisition.routes import capture_app
from pinet_core.acquisition.transport_auth import sign_request


async def main():
    config = capture_config()
    lane = json.loads(Path(os.environ['PINET_ACQ_CAPTURE_LANE']).read_text(encoding='utf-8'))
    state = json.loads(Path(os.environ['PINET_ACQ_HTTP_STATE']).read_text(encoding='utf-8'))
    helper = Path(__file__).resolve().parents[1] / 'scripts' / 'acquisition_capture_server.py'
    spec = importlib.util.spec_from_file_location('owned_capture_server', helper)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    restored = {**config, 'database_url': str(make_url(config['database_url']).set(
        database='acquisition_capture_restore').render_as_string(hide_password=False))}
    runtime = module.runtime_from_lane(restored, lane)
    app = capture_app(runtime)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://restored.test') as client:
            path = '/integrations/acquisition/v1/sites/madbeauty/verify-recipient'
            grant = next(iter(runtime.grants.values()))
            body = state['proofBody'].encode()
            headers = sign_request(grant, path, body, int(runtime.clock().timestamp()))
            replay = await client.post(path, content=body, headers=headers)
            assert replay.status_code == 200 and replay.text == state['proofReceipt']
    source = create_async_engine(config['admin_database_url'])
    copy = create_async_engine(str(make_url(config['admin_database_url']).set(
        database='acquisition_capture_restore').render_as_string(hide_password=False)))
    try:
        query = text('SELECT canonical_recipient,native_account_ref,retired_at FROM acquisition_invitations '
                     'WHERE environment_id=:env AND invitation_ref=:ref')
        params = {'env': lane['scope']['environment_id'], 'ref': lane['invitation_ref']}
        async with source.connect() as tx:
            current = (await tx.execute(query, params)).one()
        async with copy.connect() as tx:
            baseline = (await tx.execute(query, params)).one()
            forced = (await tx.execute(text("SELECT relrowsecurity,relforcerowsecurity FROM pg_class "
                                           "WHERE relname LIKE 'acquisition_%' AND relkind='r'"))).all()
        assert current.retired_at and current.canonical_recipient is None and current.native_account_ref is None
        assert baseline.retired_at is None and baseline.native_account_ref == state['accountRef']
        assert len(forced) == 4 and all(enabled and required for enabled, required in forced)
        print('Restore probe PASS: isolated pre-retirement snapshot original receipt +4forced RLS; '
              'current source remains retired; no post-erasure disaster-recovery claim')
    finally:
        await source.dispose()
        await copy.dispose()


if __name__ == '__main__':
    asyncio.run(main())
