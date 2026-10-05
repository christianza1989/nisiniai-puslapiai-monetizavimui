"""Actual localhost API -> running jobs process -> semantic post-call proof.

No in-process jobs.run_one or lab postcall override. The single local case is
retained for operator review, with SMTP disabled and normal customer copy.
"""
import asyncio
import json
from pathlib import Path

import httpx
from client_lab import dialogue
from sqlalchemy import select

from pinet_core import agent_instructions, service
from pinet_core.codex_lab import CodexLab
from pinet_core.config import settings
from pinet_core.contracts import Knowledge
from pinet_core.db import db
from pinet_core.evaluation_contract import fingerprint
from pinet_core.models import Artifact, Job
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts/learning-verification/network-20261003-background-http-postcall'


async def main():
    cfg = settings()
    if cfg.environment != 'local' or cfg.voice_enabled or cfg.smtp_enabled or not cfg.learning_enabled:
        raise ValueError('local_learning_channels_off_required')
    OUTPUT.mkdir(parents=True, exist_ok=False)
    site = 'auksarankiams'
    status = json.loads((ROOT / 'artifacts/local-knowledge/status.json').read_text(encoding='utf-8'))
    knowledge_path = ROOT / 'artifacts/local-knowledge' / status['projection_directory'] / (site + '.json')
    knowledge_text = knowledge_path.read_text(encoding='utf-8')
    manifest = Knowledge.model_validate_json(knowledge_text)
    corpus_path = ROOT / 'evals/learning-v1' / (site + '.json')
    persona = next(row for row in json.loads(corpus_path.read_text(encoding='utf-8'))['clients']
        if row['id'] == 'english_first_saved_contact')
    persona['recipient'] = cfg.lab_mail_recipient
    contract = {'site_id': site, 'actual_http_base': 'http://127.0.0.1:8840',
        'knowledge_hash': digest(knowledge_text), 'corpus_hash': digest(corpus_path.read_text(encoding='utf-8')),
        'evaluator_hash': fingerprint(), 'expected_conversation_release': agent_instructions.compose(site, 'conversation').hash,
        'manual_postcall_invoked': False, 'smtp_sent': False, 'supplier_contacted': False,
        'case_retained_for_operator_review': True}
    (OUTPUT / 'contract.json').write_text(json.dumps(contract, indent=2), encoding='utf-8')
    result = dict(contract)
    lab = CodexLab(max_calls=16, timeout=180, max_timeout_retries=1)
    try:
        async with httpx.AsyncClient(base_url=contract['actual_http_base'], timeout=20) as client:
            row = await dialogue(client, lab, persona, manifest, OUTPUT)
        result['row'] = row
        item = await service.business(site)
        for _ in range(180):
            async with db.transaction(item.id, 'local') as tx:
                tasks = list(await tx.scalars(select(Job).where(Job.conversation_id == row['conversation_id'])))
                artifacts = list(await tx.scalars(select(Artifact).where(Artifact.conversation_id == row['conversation_id'])))
                result['jobs'] = {job.kind: {'state': job.state, 'generation': job.generation,
                    'payload': job.payload} for job in tasks}
                result['artifacts'] = {artifact.kind: artifact.payload for artifact in artifacts}
            (OUTPUT / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            if all(result['jobs'].get(kind, {}).get('state') == 'succeeded' for kind in ['analysis', 'followup', 'quality']):
                break
            await asyncio.sleep(5)
        output = result['artifacts']
        analysis, quality, followup = [output.get(kind, {}) for kind in ['analysis', 'quality', 'followup']]
        result['checks'] = {'actual_http_dialogue_completed': not row['errors'],
            'email_capture_acknowledged': bool(row['contact_receipts']),
            'background_jobs_succeeded': all(result['jobs'].get(kind, {}).get('state') == 'succeeded'
                for kind in ['analysis', 'followup', 'quality']),
            'semantic_analysis': analysis.get('engine') == 'codex_cli_text_lab',
            'semantic_quality': quality.get('engine') == 'codex_cli_text_lab',
            'reviewed_email': analysis.get('followup_review', {}).get('approved') is True,
            'email_content_present': bool(followup.get('subject') and followup.get('body')),
            'quality_helpful': quality.get('outcome') == 'helpful' and not quality.get('issues'),
            'fixed_evaluator': fingerprint() == contract['evaluator_hash']}
        result['complete'] = all(result['checks'].values())
    finally:
        result['dialogue_cli_calls'] = lab.calls
        (OUTPUT / 'report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        await db.engine.dispose()
    print(json.dumps({'complete': result.get('complete', False), 'checks': result.get('checks'),
        'dialogue_cli_calls': lab.calls}))
    if not result['complete']:
        raise RuntimeError('background_postcall_acceptance_failed')


if __name__ == '__main__':
    asyncio.run(main())
