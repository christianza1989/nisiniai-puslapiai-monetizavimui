"""Explicit local capture host/seed; no production configuration or scheduler."""
import argparse
import asyncio
import hashlib
import json
import os
import secrets
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from pinet_core.acquisition.capture_config import capture_config
from pinet_core.acquisition.identity import CODEC, canonical_recipient
from pinet_core.acquisition.interfaces import Invitation, Scope
from pinet_core.acquisition.ledger import AcquisitionLedger
from pinet_core.acquisition.recipient_binding import RecipientKeyGrant
from pinet_core.acquisition.routes import CaptureRuntime, capture_app
from pinet_core.acquisition.transport_auth import WEBHOOK_PERMISSIONS, WebhookGrant
from pinet_core.db import Database


def runtime_from_lane(config, lane):
    scope = Scope.model_validate_json(json.dumps(lane['scope']))
    if lane.get('fixture_only') is not True or scope.environment_class != 'test' or scope.site_id != 'madbeauty':
        raise ValueError('native_capture_lane_required')
    key = RecipientKeyGrant(lane['recipient_key_id'], bytes.fromhex(lane['recipient_secret_hex']),
                            scope, lane['adapter_id'])
    grant = WebhookGrant(lane['transport_key_id'], bytes.fromhex(lane['transport_secret_hex']),
                         lane['adapter_id'], scope, WEBHOOK_PERMISSIONS)
    ledger = AcquisitionLedger(Database(config['database_url']), {(scope, key.adapter_id, key.key_id): key})
    return CaptureRuntime(ledger, {grant.key_id: grant})


def app_factory():
    config = capture_config()
    lane = json.loads(Path(os.environ['PINET_ACQ_CAPTURE_LANE']).read_text(encoding='utf-8'))
    return capture_app(runtime_from_lane(config, lane))


async def prepare(path):
    if path.exists():
        raise RuntimeError('Capture lane already exists; reuse for restart, never overwrite keys')
    config = capture_config()
    engine = create_async_engine(config['admin_database_url'])
    try:
        async with engine.begin() as tx:
            business_id = await tx.scalar(text("SELECT id FROM businesses WHERE site_id='madbeauty'"))
            if not business_id:
                business_id = str(uuid4())
                await tx.execute(text('INSERT INTO businesses(id,site_id,canonical_host) VALUES(:id,:site,:host)'),
                                 {'id': business_id, 'site': 'madbeauty', 'host': 'madbeauty.example.test'})
        scope = Scope(business_id=business_id, site_id='madbeauty',
                      environment_id='capture-native-' + uuid4().hex, environment_class='test')
        lane = {'fixture_only': True, 'scope': scope.model_dump(), 'adapter_id': 'madbeauty-native',
                'recipient_key_id': 'recipient-' + uuid4().hex, 'recipient_secret_hex': secrets.token_hex(32),
                'transport_key_id': 'transport-' + uuid4().hex, 'transport_secret_hex': secrets.token_hex(32),
                'invitation_ref': secrets.token_urlsafe(48), 'source_release': 'native-pr68-capture',
                'campaign_id': 'campaign-' + uuid4().hex, 'prospect_id': 'prospect-' + uuid4().hex}
        runtime = runtime_from_lane(config, lane)
        now = datetime.now(UTC)
        invitation = Invitation(scope=scope, invitation_ref=lane['invitation_ref'],
            campaign_id=lane['campaign_id'], prospect_id=lane['prospect_id'], offer_revision='all-services-test-v1',
            issued_at=now, expires_at=now + timedelta(hours=1))
        recipient = await canonical_recipient(' Owner@EXAMPLE.TEST ', node=shutil.which('node'),
                                             expected_codec_sha256=hashlib.sha256(CODEC.read_bytes()).hexdigest())
        await runtime.ledger.prepare(invitation, lane['adapter_id'], recipient, lane['recipient_key_id'])
        await runtime.ledger.database.engine.dispose()
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('x', encoding='utf-8', newline='\n') as output:
            json.dump(lane, output, indent=2)
        print('Native capture lane prepared privately; external_sent=false; keys not printed')
    finally:
        await engine.dispose()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare-lane', type=Path, required=True)
    asyncio.run(prepare(parser.parse_args().prepare_lane))
