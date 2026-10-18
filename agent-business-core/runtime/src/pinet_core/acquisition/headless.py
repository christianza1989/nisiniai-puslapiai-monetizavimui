"""Headless composition over the maintained preparation/reply engine.

Artifacts are immutable work receipts, never a second CRM. This module exposes no
SMTP, scheduler, operating-service or arbitrary tool execution capability.
"""
import hashlib
import json
import os
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..codex_lab import CodexLab
from .contracts import Assessment, Review
from .dialogue import ReplyDecision
from .engine import atomic, fingerprint


class DurableBudget:
    """One cross-batch attempt/time ceiling; reserve before every provider attempt.

    A crash retains a charged reservation with unknown usage. No stale lock
    stealing, counter reset, automatic retries or inferred monetary accounting.
    """
    def __init__(self, path, maximum=180, seconds=7200, *, model='gpt-6.1-sol', effort='high', clock=None):
        if not 1 <= maximum <= 2000 or not 1 <= seconds <= 14400:
            raise ValueError('bounded_acquisition_budget_required')
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.clock = clock or (lambda: datetime.now(UTC))
        self.policy = {'maximum_attempts': maximum, 'maximum_seconds': seconds, 'model': model,
                       'reasoning_effort': effort, 'automatic_retries': 0}
        with self.locked():
            if self.path.exists():
                if self.read()['policy'] != self.policy:
                    raise ValueError('budget_policy_conflict')
            else:
                atomic(self.path, {'version': 1, 'policy': self.policy, 'started_at': None,
                                   'deadline': None, 'attempts': []})

    @contextmanager
    def locked(self):
        lock = self.path.with_suffix('.lock')
        fd = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            os.close(fd)
            yield
        finally:
            lock.unlink()

    def read(self):
        return json.loads(self.path.read_text(encoding='utf-8'))

    def reserve(self, role, run_id, schema):
        with self.locked():
            value = self.read()
            now = self.clock()
            if value['deadline'] and now >= datetime.fromisoformat(value['deadline']):
                raise RuntimeError('acquisition_wall_time_limit')
            if len(value['attempts']) >= self.policy['maximum_attempts']:
                raise RuntimeError('acquisition_total_attempt_limit')
            if value['started_at'] is None:
                value['started_at'] = now.isoformat()
                value['deadline'] = (now + timedelta(seconds=self.policy['maximum_seconds'])).isoformat()
            number = len(value['attempts']) + 1
            value['attempts'].append({'number': number, 'role': role, 'run_id': run_id,
                'schema': schema.__name__, 'reserved_at': now.isoformat(), 'state': 'reserved',
                'usage': None, 'cost_usd': None})
            atomic(self.path, value)
            return number

    def complete(self, number, *, state, usage, error_class=None):
        with self.locked():
            value = self.read()
            attempt = value['attempts'][number - 1]
            if attempt['number'] != number or attempt['state'] != 'reserved':
                raise ValueError('budget_attempt_already_completed')
            attempt.update(state=state, usage=usage, error_class=error_class,
                           finished_at=self.clock().isoformat())
            atomic(self.path, value)


class BudgetedLab:
    def __init__(self, lab, budget, role, run_id):
        if getattr(lab, 'max_timeout_retries', 0):
            raise ValueError('automatic_retry_forbidden')
        self.lab, self.budget, self.role, self.run_id = lab, budget, role, run_id

    @property
    def calls(self):
        return self.lab.calls

    @property
    def usage(self):
        return self.lab.usage

    async def ask(self, schema, instruction, data):
        if getattr(self.lab, 'max_timeout_retries', 0):
            raise ValueError('automatic_retry_forbidden')
        number = self.budget.reserve(self.role, self.run_id, schema)
        before = len(self.lab.usage)
        original_timeout = getattr(self.lab, 'timeout', 120)
        original_deadline = getattr(self.lab, 'deadline', None)
        deadline = datetime.fromisoformat(self.budget.read()['deadline'])
        self.lab.timeout = max(0, min(original_timeout, (deadline - self.budget.clock()).total_seconds()))
        self.lab.deadline = deadline
        try:
            result = await self.lab.ask(schema, instruction, data)
        except BaseException as error:
            self.budget.complete(number, state='failed', usage=self.lab.usage[before:] or None,
                                 error_class=type(error).__name__)
            raise
        finally:
            self.lab.timeout, self.lab.deadline = original_timeout, original_deadline
        self.budget.complete(number, state='complete', usage=self.lab.usage[before:] or None)
        return result


class HeadlessRoles:
    """Separate researcher, writer, independent reviewer and reply processes.

    Expected labels/personas/evaluation data never enter this composition.
    Research changes no approved facts, evidence permissions or transport gates.
    """
    def __init__(self, roles, *, qualification=None):
        self.roles = roles
        self.qualification = qualification

    max_prepare_calls = 3

    @property
    def instruction_fingerprint(self):
        # Pin this additional composition without changing historic canonical MD hashes.
        return fingerprint({str(path.name): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (Path(__file__), Path(__file__).parents[1] / 'codex_lab.py')})

    async def ask(self, schema, instruction, data):
        if schema is Review:
            return await self.roles['reviewer'].ask(schema, instruction, data)
        if schema is ReplyDecision:
            return await self.roles['reply_coordinator'].ask(schema, instruction, data)
        if schema is not Assessment:
            raise ValueError('unregistered_headless_role')
        research = {**data, 'campaign': {**data['campaign'], 'mode': 'research_only'}}
        qualification = self.qualification or await self.roles['researcher'].ask(Assessment, instruction +
            '\nROLE: evidence researcher/qualifier only. Return empty subject/body, next_action research or '
            'exclude. Distinguish organization fit from current purchase intent. No permission or supply inference.',
            research)
        if qualification.next_action not in {'research', 'exclude', 'stop'} or qualification.subject or qualification.body:
            raise ValueError('researcher_must_not_write_email')
        if not set(qualification.evidence_ids) <= {x['id'] for x in data['prospect']['evidence']}:
            raise ValueError('researcher_unknown_evidence')
        if qualification.fit != 'yes' or qualification.next_action in {'exclude', 'stop'} or data['campaign']['mode'] != 'draft_only':
            return qualification
        return await self.roles['writer'].ask(Assessment, instruction +
            '\nROLE: personalized email writer. Use only approved campaign facts and original prospect evidence. '
            'Keep internal qualification notes out of the email. Do not claim current purchase intent without '
            'explicit evidence. One useful question, true sender identity, simple opt-out. '
            'No manufacturer agreement, prices, certificates, warranty, delivery or booking promises unless approved.',
            {**data, 'qualification': qualification.model_dump(mode='json')})

    @property
    def calls(self):
        return sum(role.lab.calls for role in self.roles.values())

    @property
    def usage(self):
        return {name: role.lab.usage for name, role in self.roles.items()}


def role_labs(budget, run_id, artifact_root, *, timeout=120):
    result = {}
    for role in ('researcher', 'writer', 'reviewer', 'reply_coordinator', 'persona', 'evaluator'):
        lab = CodexLab(max_calls=budget.policy['maximum_attempts'], timeout=timeout,
                       model=budget.policy['model'], reasoning_effort=budget.policy['reasoning_effort'],
                       artifact_dir=Path(artifact_root) / role)
        result[role] = BudgetedLab(lab, budget, role, run_id)
    return result


def approved_input_pin(campaign, prospects):
    return fingerprint({'campaign': campaign.model_dump(mode='json'),
                        'prospects': [p.model_dump(mode='json') for p in prospects]})
