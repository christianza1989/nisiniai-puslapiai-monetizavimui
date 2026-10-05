"""Verify actual core adoption, tenant isolation, session stability and rollback."""
import argparse
import asyncio
import json
import os
from pathlib import Path
from uuid import uuid4

import httpx
from sqlalchemy import delete

from pinet_core import adaptive_instructions as adaptive
from pinet_core import agent_instructions, knowledge, service
from pinet_core.api import app
from pinet_core.config import settings
from pinet_core.contracts import Knowledge
from pinet_core.db import db
from pinet_core.models import Admission, BusinessPolicy, Case, CostReservation, KnowledgeState, PolicyRevision
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--site', required=True, choices=sorted(agent_instructions.SITES))
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    if not args.run_id.replace('-', '').isalnum():
        raise ValueError('bounded_run_required')
    directory = ROOT / 'artifacts/learning-verification' / args.run_id
    directory.mkdir(parents=True, exist_ok=False)
    cfg = settings()
    if cfg.environment != 'local' or cfg.voice_enabled or cfg.smtp_enabled:
        raise ValueError('local_channels_off_required')
    active = adaptive.ROOT / args.site / 'active.json'
    original = active.read_bytes()
    release = json.loads(original)
    if not release['active'] or release['evaluation']['state'] != 'local_eligible':
        raise ValueError('actual_approved_active_release_required')
    cfg.environment = 'learning-canary-proof-' + str(uuid4())
    cfg.learning_enabled, cfg.learning_namespace, cfg.allow_simulation = True, 'local', True
    item = await service.business(args.site)
    manifest = Knowledge.model_validate_json((ROOT / 'artifacts/network-calibration/knowledge' / (args.site + '.json')).read_text(encoding='utf-8'))
    others = {site: adaptive.selected(site).hash for site in agent_instructions.SITES if site != args.site}
    result = {'site_id': args.site, 'operator_rollback_verification': True,
        'operator_candidate_proposal': False, 'smtp_sent': False, 'supplier_contacted': False,
        'checks': {}, 'active_pointer_sha256_before': digest(original.decode('utf-8'))}
    try:
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://core.lab') as client:
                auth = {'Authorization': 'Bearer ' + cfg.worker_secret}

                async def start():
                    async with db.transaction(item.id, cfg.environment) as tx:
                        await knowledge.register(tx, item, manifest)
                    response = await client.post(f'/internal/sites/{args.site}/simulation', headers=auth,
                        json={'mode': 'simulation', 'knowledge': manifest.model_dump(),
                            'notice_version': 'learning-adoption-verification-v1', 'consent': True})
                    response.raise_for_status()
                    return response.json()

                async def claim(session):
                    response = await client.post(f'/internal/sites/{args.site}/sessions/' + session['conversation_id'] + '/claim',
                        headers=auth, json={'owner': 'learning-proof'})
                    response.raise_for_status()
                    return response.json()

                first_session = await start()
                first = await claim(first_session)
                result['received_active_hash'] = first['release_hash']
                result['checks']['new_core_session_adopts_active_release'] = first['release_hash'] == release['release_hash'] and release['instruction'] in first['prompt']
                adaptive.rollback_local(args.site)
                rollback_hash = adaptive.selected(args.site).hash
                existing = await claim(first_session)
                second = await claim(await start())
                result['received_rollback_hash'] = second['release_hash']
                result['checks']['existing_session_preserves_its_release'] = existing['prompt'] == first['prompt'] and existing['release_hash'] == first['release_hash']
                result['checks']['new_session_adopts_rollback'] = second['release_hash'] == rollback_hash and rollback_hash != first['release_hash']
                result['checks']['other_niches_unchanged'] = all(adaptive.selected(site).hash == value for site, value in others.items())
                temp = active.with_suffix('.restore')
                temp.write_bytes(original)
                os.replace(temp, active)
                third = await claim(await start())
                result['checks']['restored_validated_release_adopted'] = third['release_hash'] == first['release_hash']
    finally:
        temp = active.with_suffix('.restore')
        temp.write_bytes(original)
        os.replace(temp, active)
        result['checks']['active_pointer_restored_exactly'] = active.read_bytes() == original
        (directory / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        async with db.transaction(item.id, cfg.environment) as tx:
            for table in [Case, KnowledgeState, BusinessPolicy, PolicyRevision]:
                await tx.execute(delete(table))
        async with db.registry() as tx:
            await tx.execute(delete(Admission).where(Admission.environment_id == cfg.environment))
            await tx.execute(delete(CostReservation).where(CostReservation.environment_id == cfg.environment))
        await db.engine.dispose()
    print(json.dumps(result))
    if not all(result['checks'].values()):
        raise RuntimeError('learning_adoption_verification_failed')


if __name__ == '__main__':
    asyncio.run(main())
