"""Replay a real archived defect; observe current jobs without activating a fix.

This is a separate negative control, not a fresh dialogue-model performance case.
The archived assistant text is unchanged; tools and contact receipts execute anew.
"""
import argparse
import asyncio
import json
import re
from pathlib import Path
from uuid import uuid4

import httpx
from client_lab import signed
from learning_observation import artifacts, changes, snapshot
from network_lab import postcall
from sqlalchemy import delete

from pinet_core import agent_instructions, jobs, knowledge, service
from pinet_core.api import app
from pinet_core.codex_lab import CodexLab
from pinet_core.config import settings
from pinet_core.contracts import Knowledge
from pinet_core.db import db
from pinet_core.models import Admission, BusinessPolicy, Case, CostReservation, KnowledgeState, PolicyRevision
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'artifacts/network-calibration/network-20261001-v3-off/laiptucentras/blind/report.json'
DIRECTORY = ROOT / 'artifacts/network-calibration/network-20261003-learning-negative-control'


async def main():
    global DIRECTORY
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-id', default=DIRECTORY.name)
    parser.add_argument('--site', choices=sorted(agent_instructions.SITES), default='laiptucentras')
    parser.add_argument('--archive', type=Path, default=ARCHIVE)
    parser.add_argument('--case-id', default='correction_with_contact_now')
    parser.add_argument('--learning-enabled', action='store_true')
    parser.add_argument('--worker-postcall', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9-]{1,80}', args.run_id):
        raise ValueError('bounded_run_required')
    DIRECTORY = ROOT / 'artifacts/network-calibration' / args.run_id
    cfg = settings()
    if cfg.environment != 'local' or cfg.voice_enabled or cfg.smtp_enabled:
        raise ValueError('local_channels_off_required')
    if not args.archive.resolve().is_relative_to((ROOT / 'artifacts/network-calibration').resolve()):
        raise ValueError('private_archive_required')
    archive_text = args.archive.read_text(encoding='utf-8')
    archived = next(c for c in json.loads(archive_text)['clients'] if c['id'] == args.case_id)
    if not args.worker_postcall and not archived.get('quality', {}).get('issues'):
        raise ValueError('archived_defect_required')
    before = snapshot()
    DIRECTORY.mkdir(exist_ok=False)
    manifest_text = (ROOT / 'artifacts/network-calibration/knowledge' / (args.site + '.json')).read_text(encoding='utf-8')
    manifest = Knowledge.model_validate_json(manifest_text)
    sources = ['scripts/replay_learning_canary.py', 'scripts/network_lab.py', 'scripts/client_lab.py',
        'src/pinet_core/jobs.py', 'src/pinet_core/calibration.py', 'src/pinet_core/adaptive_instructions.py']
    contract = {'as_of': '2026-10-03', 'kind': 'archived_defect_negative_control',
        'archive': str(args.archive.resolve().relative_to(ROOT)), 'archive_hash': digest(archive_text),
        'archived_case_id': archived['id'], 'knowledge_hash': digest(manifest_text),
        'assistant_text_replayed_unchanged': True, 'fresh_dialogue_model_calls': 0,
        'operator_agent_instruction_edits': False, 'operator_candidate_activation': False,
        'instruction_files_before': before,
        'source_hashes': {p: digest((ROOT / p).read_text(encoding='utf-8')) for p in sources}}
    if args.worker_postcall:
        if not args.learning_enabled:
            raise ValueError('local_semantic_worker_must_be_enabled')
        contract['kind'] = 'archived_dialogue_durable_postcall_worker'
    (DIRECTORY / 'contract.json').write_text(json.dumps(contract, indent=2), encoding='utf-8')
    item = await service.business(args.site)
    cfg.environment, cfg.allow_simulation = 'learning-canary-' + str(uuid4()), True
    cfg.learning_enabled, cfg.learning_namespace = args.learning_enabled, 'local' if args.learning_enabled else ''
    lab = CodexLab(max_calls=16, timeout=180, max_timeout_retries=1)
    row = {'id': args.case_id, 'site_id': item.site_id,
        'history': [], 'tools': [], 'errors': [], 'contact': archived['contact'], 'contact_receipts': [],
        'expected_contact_channels': ['email'] if archived['contact'] else [], 'expected_need': {},
        'refusal': archived.get('refusal', False), 'refusal_at': archived.get('refusal_at', 0)}
    report = dict(contract)
    try:
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://core.lab') as client:
                auth = {'Authorization': 'Bearer ' + cfg.worker_secret}

                async def start():
                    async with db.transaction(item.id, cfg.environment) as tx:
                        await knowledge.register(tx, item, manifest)
                    response = await client.post(f'/internal/sites/{args.site}/simulation', headers=auth,
                        json={'mode': 'simulation', 'knowledge': manifest.model_dump(),
                            'notice_version': 'local-learning-observation-v1', 'consent': True})
                    response.raise_for_status()
                    return response.json()

                session = await start()
                row['conversation_id'] = session['conversation_id']
                prefix = f'/internal/sites/{args.site}/sessions/' + session['conversation_id']

                async def post(action, body):
                    response = await client.post(prefix + action, headers=auth, json=body)
                    response.raise_for_status()
                    return response.json()

                owner, mapping, turn = 'learning-canary-' + str(uuid4()), {}, -1
                initial = await post('/claim', {'owner': owner})
                for index, event in enumerate(archived['history']):
                    context = await post('/claim', {'owner': owner})
                    if event['speaker'] == 'client':
                        turn += 1
                        receipt = await post('/events', {'epoch': context['epoch'], 'event_key': 'replay-' + str(index),
                            'kind': 'client_transcript', 'text': event['text']})
                        mapping[event['event_id']] = receipt['event_id']
                        row['history'].append({'speaker': 'client', 'text': event['text'], 'event_id': receipt['event_id']})
                        for old_tool in [t for t in archived['tools'] if t.get('turn') == turn]:
                            arguments = dict(old_tool['arguments'])
                            if 'evidence_event_id' in arguments:
                                arguments['evidence_event_id'] = mapping[arguments['evidence_event_id']]
                            output = await post('/tools', {'epoch': context['epoch'], 'call_id': str(uuid4()),
                                'name': old_tool['name'], 'arguments': arguments})
                            if old_tool['name'] == 'ui.open_contact_form':
                                output['ui_ack'] = await signed(client, session, 'ui',
                                    {'request_id': output['request_id'], 'state': 'shown'}, item.site_id)
                                saved = await signed(client, session, 'contact', {'channel': 'email',
                                    'value': cfg.lab_mail_recipient or 'mrchristian90210@gmail.com', 'consent': True,
                                    'notice_version': 'local-learning-observation-v1'}, item.site_id)
                                output['contact_receipt'] = {'channels_saved': ['email'], 'state': saved.get('state', 'saved')}
                                row['contact_receipts'].append({'channel': 'email', 'saved': True, 'timing': 'during'})
                            row['tools'].append({'name': old_tool['name'], 'arguments': arguments, 'result': output, 'turn': turn})
                    else:
                        await post('/events', {'epoch': context['epoch'], 'event_key': 'replay-' + str(index),
                            'kind': 'agent_transcript', 'text': event['text']})
                        row['history'].append({'speaker': 'agent', 'text': event['text']})
                await signed(client, session, 'end', {}, item.site_id)
                if args.worker_postcall:
                    from sqlalchemy import select

                    from pinet_core.models import Artifact, Job
                    for kind in ['analysis'] + (['followup'] if row['contact'] else []) + ['quality']:
                        await jobs.run_one(item.id, 'local-semantic-worker-proof', kind=kind)
                        async with db.transaction(item.id, cfg.environment) as tx:
                            completed = await tx.scalar(select(Job).where(Job.conversation_id == row['conversation_id'], Job.kind == kind))
                            if completed.state != 'succeeded':
                                raise RuntimeError('local_worker_postcall_incomplete:' + kind)
                            artifact = await tx.scalar(select(Artifact).where(Artifact.conversation_id == row['conversation_id'], Artifact.kind == kind))
                            row[kind if kind != 'followup' else 'actual_core_followup'] = artifact.payload
                else:
                    await postcall(lab, item, row, DIRECTORY, max_attempts=3)
                if args.learning_enabled:
                    # This lab owns one immutable approved projection; renew its
                    # freshness before a long paired learning job, never facts.
                    async with db.transaction(item.id, cfg.environment) as tx:
                        await knowledge.register(tx, item, manifest)
                    await jobs.run_one(item.id, 'automatic-learning-canary', kind='learning')
                    from sqlalchemy import select

                    from pinet_core.models import Job
                    async with db.transaction(item.id, cfg.environment) as tx:
                        job = await tx.scalar(select(Job).where(Job.conversation_id == row['conversation_id'], Job.kind == 'learning'))
                        report['learning_job'] = {'state': job.state, **job.payload} if job else None
                        from pinet_core.models import Artifact
                        observed = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == row['conversation_id'])))
                        row['calibration_artifacts'] = [{'kind': a.kind, 'payload': a.payload} for a in observed
                            if a.kind.startswith(('calibration_issue:', 'candidate:', 'static_eval:', 'content_review:'))]
                # Observe the very next session without running an operator evaluator/activation command.
                next_session = await start()
                response = await client.post(f'/internal/sites/{args.site}/sessions/' + next_session['conversation_id'] + '/claim',
                    headers=auth, json={'owner': owner})
                response.raise_for_status()
                next_context = response.json()
                report['next_session_prompt_hash_before'] = digest(initial['prompt'])
                report['next_session_prompt_hash_after'] = digest(next_context['prompt'])
                report['next_session_prompt_changed'] = initial['prompt'] != next_context['prompt']
                await signed(client, next_session, 'end', {}, item.site_id)
    except Exception as error:
        report['failure'] = type(error).__name__
        report['failure_reason'] = str(error)[:160] if isinstance(error, (RuntimeError, ValueError)) else 'controlled_diagnostic'
        raise
    finally:
        after = snapshot()
        report.update(row=row, learning_observation=artifacts(row), cli_calls=lab.calls,
            cli_timeout_recoveries=lab.timeout_recoveries, changed_files=changes(before, after),
            instruction_files_after=after, evaluation_environment=cfg.environment,
            local_adaptive_reader_selected=cfg.environment == 'local' or cfg.learning_enabled,
            source_hashes_still_match=all(digest((ROOT / p).read_text(encoding='utf-8')) == h
                for p, h in contract['source_hashes'].items()), smtp_sent=False, supplier_contacted=False)
        (DIRECTORY / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        async with db.transaction(item.id, cfg.environment) as tx:
            for table in [Case, KnowledgeState, BusinessPolicy, PolicyRevision]:
                await tx.execute(delete(table))
        async with db.registry() as tx:
            await tx.execute(delete(Admission).where(Admission.environment_id == cfg.environment))
            await tx.execute(delete(CostReservation).where(CostReservation.environment_id == cfg.environment))
        await db.engine.dispose()
    print(json.dumps({'negative_control': True, 'cli_calls': lab.calls,
        'issues': len(row.get('quality', {}).get('issues', [])),
        'candidates': len(artifacts(row)['candidates']), 'changed_files': report['changed_files'],
        'next_session_prompt_changed': report.get('next_session_prompt_changed')}))


if __name__ == '__main__':
    asyncio.run(main())
