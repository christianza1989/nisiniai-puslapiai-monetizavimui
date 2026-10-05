"""Durable local learning jobs: model proposal, paired protected eval, adoption.

Conversation tools cannot invoke this controller or edit its acceptance corpus.
Live/audio promotion is deliberately a separate acceptance stage.
"""
import asyncio
import copy
import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import timedelta
from pathlib import Path

from pydantic import Field
from sqlalchemy import select, text

from . import adaptive_instructions as adaptive
from . import agent_instructions, calibration
from .codex_lab import CodexLab
from .config import settings
from .contracts import Knowledge, Strict
from .db import db
from .evaluation_contract import fingerprint
from .models import Artifact, Business, utcnow
from .security import digest

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / 'evals/learning-v2'
REPLICATES = 2


def environment_allowed(environment):
    return environment == 'local' or environment.startswith(('network-lab-', 'learning-canary-', 'test-'))


class Proposal(Strict):
    instruction: str = Field(min_length=10, max_length=1000)


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def merge_replicates(reports):
    if len(reports) != REPLICATES:
        raise ValueError('fixed_replicate_count_required')
    keys = ['site_id', 'corpus_hash', 'instruction_hash', 'evaluation_contract_hash', 'assistant_engine',
        'knowledge_hash', 'synthetic_core_scope', 'assistant_sees_test_flag']
    if any(report.get(k) != reports[0].get(k) for report in reports for k in keys):
        raise ValueError('replicate_contract_conflict')
    if any({r['id'] for r in report['clients']} != {r['id'] for r in reports[0]['clients']} for report in reports):
        raise ValueError('same_replicated_cases_required')
    return {**reports[0], 'replicate_count': REPLICATES,
        'expected_clients': sum(len(report['clients']) for report in reports),
        'complete': all(report['complete'] for report in reports),
        'all_checks_pass': all(bool(row.get('checks')) and all(row['checks'].values()) for report in reports for row in report['clients']),
        'smtp_sent': any(report.get('smtp_sent') is not False for report in reports),
        'supplier_contacted': any(report.get('supplier_contacted') is not False for report in reports),
        'cli_calls': sum(report['cli_calls'] for report in reports),
        'cli_usage': [usage for report in reports for usage in report.get('cli_usage', [])],
        'cli_timeout_recoveries': [{'replicate': index, **event} for index, report in enumerate(reports, 1)
            for event in report.get('cli_timeout_recoveries', [])],
        'clients': [{**row, 'id': row['id'] + '@r' + str(index), 'source_case_id': row['id'],
            'replicate': index} for index, report in enumerate(reports, 1) for row in report['clients']]}


def partition_corpus(corpus, evidence):
    result = copy.deepcopy(corpus)
    def normalize(text):
        return ' '.join(text.casefold().split())
    observed = [normalize(e['text']) for e in evidence if e['speaker'] == 'client']
    known = []
    for case in result['clients']:
        if [normalize(text) for text in case['messages']] == observed:
            known.append(case['id'])
            case['split'] = 'train'
    unseen = [case['id'] for case in result['clients'] if case['split'] == 'holdout']
    if len(unseen) < 3:
        raise ValueError('three_unseen_holdout_cases_required')
    return result, known, unseen


def protected_compare(before, after, instruction, scope, site, corpus_hash, parent_hash, candidate_hash):
    result = adaptive.compare(before, after, instruction, scope)
    reasons = list(result['reasons'])
    for report in [before, after]:
        counts = Counter(row.get('source_case_id') for row in report['clients'])
        if (report.get('replicate_count') != REPLICATES or None in counts
                or len(counts) < 6 or any(value != REPLICATES for value in counts.values())):
            reasons.append('fixed_repeated_cases_required')
        holdouts = {r.get('source_case_id') for r in report['clients'] if r['split'] == 'holdout'}
        if None in holdouts or len(holdouts) < 3:
            reasons.append('three_unique_unseen_holdout_cases_required')
        if report.get('site_id') != site or report.get('corpus_hash') != corpus_hash or not report.get('complete'):
            reasons.append('protected_site_corpus_completion_conflict')
        if report.get('smtp_sent') is not False or report.get('supplier_contacted') is not False:
            reasons.append('external_actions_in_evaluation')
        ids = [r['id'] for r in report['clients']]
        if len(ids) != len(set(ids)):
            reasons.append('duplicate_evaluation_case')
        if any(not r.get('checks') or any(v is not True and v is not False for v in r['checks'].values()) for r in report['clients']):
            reasons.append('typed_checks_required')
    if before.get('evaluation_contract_hash') != after.get('evaluation_contract_hash') or not before.get('evaluation_contract_hash'):
        reasons.append('fixed_judge_contract_required')
    if before.get('instruction_hash') != parent_hash or after.get('instruction_hash') != candidate_hash:
        reasons.append('pinned_release_conflict')
    reasons = sorted(set(reasons))
    return {**result, 'state': 'rejected' if reasons else 'local_eligible', 'reasons': reasons,
        'site_id': site, 'corpus_hash': corpus_hash, 'parent_hash': parent_hash,
        'heldout_observations': result['heldout_cases'],
        'heldout_cases': len({r.get('source_case_id') for r in before['clients'] if r['split'] == 'holdout'}),
        'unique_cases': len({r.get('source_case_id') for r in before['clients']}),
        'evaluation_observations': len(before['clients']), 'replicates': REPLICATES,
        'candidate_release_hash': candidate_hash, 'evaluation_contract_hash': before.get('evaluation_contract_hash')}


async def heartbeat(bid, task, stopped):
    from .jobs import fenced_job
    while not stopped.is_set():
        async with db.transaction(bid, settings().environment) as tx:
            job = await fenced_job(tx, task)
            job.lease_until = utcnow() + timedelta(seconds=180)
        try:
            await asyncio.wait_for(stopped.wait(), timeout=30)
        except TimeoutError:
            pass


async def run(bid, task):
    from .jobs import fenced_job, load_input
    cfg = settings()
    if not cfg.learning_enabled or not environment_allowed(cfg.environment):
        raise RuntimeError('local_learning_not_enabled')
    async with db.transaction(bid, cfg.environment) as tx:
        from .onboarding import learning_admitted
        if not await learning_admitted(tx, bid):
            raise RuntimeError('site_learning_not_admitted')
        job = await fenced_job(tx, task)
        job.lease_until = utcnow() + timedelta(seconds=180)
        candidate = await tx.get(Artifact, job.payload['candidate_id'])
        if not candidate or not candidate.kind.startswith('candidate:') or candidate.payload['state'] != 'awaiting_semantic_evaluation':
            raise ValueError('admissible_candidate_required')
        proposal_source = dict(candidate.payload)
        candidate_id = candidate.id
    async with db.registry() as tx:
        item = await tx.scalar(select(Business).where(Business.id == bid))
    site = item.site_id
    root = adaptive.learning_root()
    parent = adaptive.assembled_local(site, root)
    directory = ROOT / 'artifacts/learning-jobs' / task['id'] / str(task['generation'])
    directory.mkdir(parents=True, exist_ok=False)
    corpus_path = CORPUS / (site + '.json')
    registry = json.loads((CORPUS / 'registry.json').read_text(encoding='utf-8'))
    corpus_hash = digest(corpus_path.read_text(encoding='utf-8'))
    if registry['corpus_hashes'][site] != corpus_hash:
        raise ValueError('protected_corpus_hash_conflict')
    evaluator = ROOT / 'scripts/network_lab.py'
    evaluator_hash = fingerprint()
    contract = {'site_id': site, 'candidate_id': candidate_id, 'parent_hash': parent.hash,
        'corpus_hash': corpus_hash, 'evaluator_hash': evaluator_hash, 'production_eligible': False,
        'replicates': REPLICATES}
    write(directory / 'contract.json', contract)
    stopped = asyncio.Event()
    renewal = asyncio.create_task(heartbeat(bid, task, stopped))
    decision = {'state': 'rejected', 'reasons': ['parent_release_conflict']}
    try:
        active_path = root / site / 'active.json'
        active_value = json.loads(active_path.read_text(encoding='utf-8')) if active_path.exists() else {}
        recovered = active_value.get('evaluation', {})
        # A filesystem pointer can survive a database commit failure. Recover
        # this exact job's evaluated release rather than rerunning or claiming
        # that an already adopted release was rejected on its new parent hash.
        if (active_value.get('active') and recovered.get('state') == 'local_eligible'
                and recovered.get('learning_job_id') == task['id']
                and recovered.get('source_candidate_id') == candidate_id
                and parent.hash == recovered.get('candidate_release_hash')):
            decision = {**recovered, 'activated': True, 'adopted_release_hash': parent.hash,
                'recovered_after_pointer_write': True}
            version = root / site / 'versions' / (active_value['hash'] + '.md')
            version.parent.mkdir(parents=True, exist_ok=True)
            version.write_text(active_value['instruction'] + '\n', encoding='utf-8')
            stopped.set()
            await renewal
            async with db.transaction(bid, cfg.environment) as tx:
                job = await fenced_job(tx, task)
                job.state, job.payload = 'succeeded', {**job.payload, 'decision': decision}
                source = await tx.get(Artifact, candidate_id)
                source.payload = {**source.payload, 'state': 'evaluated', 'activated': True,
                    'learning_decision': decision}
            return
        if proposal_source['parent_hash'] == parent.hash:
            from .knowledge import refresh_from_edge
            await refresh_from_edge(item)
            data = await load_input(bid, task['conversation_id'])
            if not data['knowledge_available']:
                raise RuntimeError('waiting_knowledge')
            manifest = Knowledge.model_validate({key: data['knowledge'][key] for key in Knowledge.model_fields})
            if manifest.site_id != site or manifest.canonical_host != item.canonical_host:
                raise ValueError('learning_knowledge_site_conflict')
            knowledge_pin = directory / 'approved-knowledge.json'
            write(knowledge_pin, manifest.model_dump())
            knowledge_hash = digest(knowledge_pin.read_text(encoding='utf-8'))
            canonical_hash = corpus_hash
            corpus, known_cases, unseen_cases = partition_corpus(json.loads(corpus_path.read_text(encoding='utf-8')), data['evidence'])
            job_corpus = directory / 'corpus'
            job_corpus.mkdir()
            corpus_pin = job_corpus / (site + '.json')
            write(corpus_pin, corpus)
            corpus_hash = digest(corpus_pin.read_text(encoding='utf-8'))
            contract.update(canonical_corpus_hash=canonical_hash, corpus_hash=corpus_hash,
                known_case_ids=known_cases, unseen_holdout_ids=unseen_cases,
                knowledge_hash=knowledge_hash, knowledge_revision=data['knowledge'].get('knowledge_revision'))
            write(directory / 'contract.json', contract)
            lab = CodexLab(max_calls=2, timeout=180, max_timeout_retries=1)
            proposed = await lab.ask(Proposal,
                'Propose one small behavioural instruction for this niche assistant, repairing the observed issue. '
                'Use only the supplied issue/evidence. No new facts, powers, prices, quantities, deadlines or permissions. '
                'Do not freeze the case-specific price/budget into the instruction: teach retrieval of current approved '
                'knowledge with knowledge.resolve before price/budget comparisons. For contact defects, distinguish '
                'shown from saved receipts and do not request a saved channel. Do not change evaluation criteria. '
                'Write a reusable clear instruction, not a report or praise.',
                {'site_id': site, 'scope': proposal_source['scope'], 'source_hint': proposal_source['instruction'],
                    'evidence': data['evidence'], 'timeline': data['timeline']})
            instruction = proposed.instruction
            if calibration.FORBIDDEN.search(instruction) or re.search(r'\d[\d., ]{0,12}\s*(?:€|EUR|eurų)', instruction):
                raise ValueError('behaviour_only_instruction_required')
            patch_hash = digest(instruction)
            candidate_prompt = parent.prompt + '\n\n' + instruction
            base = agent_instructions.compose(site, 'conversation')
            write(directory / 'model-proposal.json', {'instruction': instruction, 'scope': proposal_source['scope'],
                'hash': patch_hash, 'source_candidate_id': candidate_id, 'engine': 'codex_cli_local_default',
                'cli_calls': lab.calls, 'usage': lab.usage})
            reports = []
            for name, prompt, release_hash in [('incumbent', parent.prompt, parent.hash),
                    ('candidate', candidate_prompt, digest(candidate_prompt))]:
                pin = directory / (name + '-release.json')
                write(pin, {'site_id': site, 'base_hash': base.hash, 'prompt': prompt, 'hash': release_hash})
                replicas = []
                for replicate in range(1, REPLICATES + 1):
                    run_id = f'learning-{task["id"]}-g{task["generation"]}-{name}-r{replicate}'
                    args = [sys.executable, '-u', str(evaluator), '--site', site, '--phase', 'evaluation',
                        '--include-holdout', '--run-id', run_id, '--corpus-dir', str(job_corpus),
                        '--pin-release-file', str(pin), '--max-calls', '90', '--followup-attempts', '3',
                        '--knowledge-file', str(knowledge_pin),
                        '--timeout-retries', '1', '--as-of', '2026-10-03', '--observe-learning']
                    with (directory / (name + f'-r{replicate}.log')).open('w', encoding='utf-8') as output:
                        process = await asyncio.create_subprocess_exec(*args, cwd=ROOT, stdout=output,
                            stderr=asyncio.subprocess.STDOUT,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
                        try:
                            code = await asyncio.wait_for(process.wait(), timeout=3600)
                        except TimeoutError:
                            if os.name == 'nt':
                                killer = await asyncio.create_subprocess_exec('taskkill', '/PID', str(process.pid), '/T', '/F',
                                    stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
                                    creationflags=subprocess.CREATE_NO_WINDOW)
                                await killer.wait()
                            else:
                                process.kill()
                            await process.wait()
                            raise RuntimeError('protected_evaluator_timeout') from None
                    if code:
                        raise RuntimeError('protected_evaluator_failed')
                    path = ROOT / 'artifacts/network-calibration' / run_id / site / 'evaluation/report.json'
                    replica_report = json.loads(path.read_text(encoding='utf-8'))
                    replicas.append(replica_report)
                    write(directory / (name + f'-r{replicate}-report.json'), replica_report)
                reports.append(merge_replicates(replicas))
                write(directory / (name + '-report.json'), reports[-1])
            if (fingerprint() != evaluator_hash or digest(corpus_path.read_text(encoding='utf-8')) != canonical_hash
                    or digest(corpus_pin.read_text(encoding='utf-8')) != corpus_hash
                    or digest(knowledge_pin.read_text(encoding='utf-8')) != knowledge_hash):
                raise ValueError('protected_inputs_changed_during_evaluation')
            decision = protected_compare(*reports, instruction, proposal_source['scope'], site, corpus_hash,
                parent.hash, digest(candidate_prompt))
            decision.update(learning_job_id=task['id'], source_candidate_id=candidate_id)
            if renewal.done():
                await renewal
            stopped.set()
            await renewal
            async with db.transaction(bid, cfg.environment) as tx:
                job = await fenced_job(tx, task)
                await tx.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))'),
                    {'key': 'learning:' + bid + ':' + (cfg.learning_namespace or cfg.environment)})
                current = adaptive.assembled_local(site, root)
                if current.hash != parent.hash:
                    decision = {**decision, 'state': 'rejected', 'reasons': ['parent_changed_before_activation']}
                if decision['state'] == 'local_eligible':
                    release = adaptive.activate_local(site, instruction, proposal_source['scope'], decision,
                        parent.hash, root)
                    version = root / site / 'versions' / (release['hash'] + '.md')
                    version.parent.mkdir(parents=True, exist_ok=True)
                    version.write_text(instruction + '\n', encoding='utf-8')
                    decision['activated'] = True
                    decision['adopted_release_hash'] = adaptive.assembled_local(site, root).hash
                else:
                    decision['activated'] = False
                job.state = 'succeeded'
                job.payload = {**job.payload, 'decision': decision, 'evidence_directory': str(directory.relative_to(ROOT))}
                source = await tx.get(Artifact, candidate_id)
                source.payload = {**source.payload, 'learning_decision': decision,
                    'state': 'evaluated', 'activated': bool(decision.get('activated'))}
        else:
            async with db.transaction(bid, cfg.environment) as tx:
                job = await fenced_job(tx, task)
                job.state, job.payload = 'succeeded', {**job.payload, 'decision': decision}
    except Exception as error:
        reason = 'waiting_knowledge' if isinstance(error, RuntimeError) and str(error) == 'waiting_knowledge' else type(error).__name__
        decision = {'state': 'waiting' if reason == 'waiting_knowledge' else 'failed', 'reasons': [reason], 'activated': False}
        raise
    finally:
        stopped.set()
        await renewal
        write(directory / 'decision.json', decision)
