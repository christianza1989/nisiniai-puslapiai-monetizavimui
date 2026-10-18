"""Private no-domain drafting remains separate from public/synthetic admission."""
import json
from types import SimpleNamespace as Row
from uuid import uuid4

import pytest

from pinet_core.config import settings
from pinet_core.control.routes import ControlError
from pinet_core.creation.private_preview import private_host
from pinet_core.site_build import foundation, receipts
from pinet_core.site_build.foundation_wire import FoundationScope, Observation


@pytest.fixture
def local_case(monkeypatch):
    identity = str(uuid4())
    raw = {**{key: str(uuid4()) for key in ('user_id', 'organization_id', 'portfolio_id',
        'session_id', 'approval_id', 'approval_session_id', 'discovery_id', 'report_id')},
        'environment_id': 'local', 'creation_id': identity, 'approval_fingerprint': 'a'*64,
        'report_revision': 1, 'report_sha256': 'b'*64,
        'accepted': {'revision_id': str(uuid4()), 'accepted_revision': 1,
            'candidate_sha256': 'c'*64, 'accepted_source_revision': 'a'*40,
            'site_id': 'creation-'+identity.replace('-', ''), 'canonical_host': private_host(identity),
            'coordinator_event_id': str(uuid4()), **{key: 'd'*64 for key in ('coordinator_sha256',
                'intake_sha256', 'intake_request_sha256', 'intake_importer_sha256', 'intake_site_file_sha256')}},
        'sources': {'execution_source_revision': 'e'*40, 'public_source_revision': 'f'*40,
            'bridge_sha256': 'a'*64, 'verifier_sha256': 'b'*64, 'parser_sha256': 'c'*64},
        'language_review_mode': 'required', 'site_context_sha256': 'e'*64,
        'page_snapshot_sha256': 'f'*64, 'required_page_ids': ['page-one']}
    pin = FoundationScope.model_validate_json(json.dumps(raw))
    observation = Observation.model_validate_json(json.dumps({
        'version': 'native-foundation-evidence.v1', 'state': 'verified-local',
        'scope_sha256': pin.fingerprint(), 'sources': raw['sources'],
        'site_context_sha256': pin.site_context_sha256, 'page_snapshot_sha256': pin.page_snapshot_sha256,
        'required_page_ids': pin.required_page_ids, 'blockers': [],
        'release': {'release_id': str(uuid4()), 'manifest_sha256': 'a'*64, 'package_sha256': 'b'*64,
            'page_revisions': {'page-one': 'c'*64}, 'asset_sha256': {}},
        'completion': {'state': 'LOCAL_DELIVERY_CHECKS_PASS', 'checked_at': '2026-10-17T20:00:00Z',
            'report_sha256': 'a'*64, 'audit_sha256': 'b'*64, 'review_evidence_sha256': 'c'*64,
            'preview_sha256': 'd'*64, 'public_pages': 1, 'requests': 8},
        'synthetic': True, 'admission': 'not_performed', 'deployment': 'not_performed',
        'channel_activation': 'not_performed', 'calibration_status': 'UNVERIFIED'}))
    creation = Row(id=identity, canonical_host=None, current_revision=1, status='draft_ready',
        active_job_id=None, portfolio_id=raw['portfolio_id'])
    case = Row(pin=pin, actual=pin, observation=observation, creation=creation, receipt=Row(accepted_revision=1),
        session=Row(id=raw['session_id']), calls=[], verified=[], actor=True, archived=False, final_error=False)
    monkeypatch.setattr(settings(), 'environment', 'local')
    monkeypatch.setattr(settings(), 'control_mode', 'local')
    monkeypatch.setattr(receipts, 'stored', lambda row: (case.pin, case.observation))
    async def capture(tx, session, creation_id):
        case.calls.append('capture')
        assert creation_id == case.creation.id
        return case.actual
    async def actor(tx, session, portfolio_id):
        case.calls.append('actor')
        if not case.actor:
            raise ControlError(401, 'unauthenticated')
    async def archived(tx, creation):
        return case.archived
    async def retained(expected, observation, *, still_authorized):
        case.calls.append('retained')
        assert expected is case.pin and observation is case.observation
        if not await still_authorized():
            raise ControlError(401, 'unauthenticated')
        return Row(state='retained-current')
    async def verify(tx, expected):
        case.calls.append('verify')
        case.verified.append(expected)
        if case.final_error:
            raise ControlError(401, 'unauthenticated')
    class Tx:
        async def refresh(self, row):
            case.calls.append('refresh')
    case.tx = Tx()
    monkeypatch.setattr(foundation, 'capture', capture)
    monkeypatch.setattr(foundation, 'check_retained', retained)
    monkeypatch.setattr(foundation, 'verify', verify)
    monkeypatch.setattr(receipts, 'current_actor', actor)
    monkeypatch.setattr(receipts, 'archived', archived)
    return case


async def test_exact_private_case_reaches_all_existing_current_evidence_fences(local_case):
    c = local_case
    assert await receipts.current(c.tx, c.session, c.creation, c.receipt)
    assert c.calls == ['capture', 'retained', 'actor', 'refresh', 'verify']
    assert c.observation.synthetic and c.observation.admission == 'not_performed'
    assert c.observation.calibration_status == 'UNVERIFIED'


@pytest.mark.parametrize('change', ['other_case', 'example', 'test', 'invalid', 'localhost',
    'unassigned_public', 'assigned_exact_private', 'wrong_environment', 'scope_environment',
    'wrong_control_mode', 'wrong_creation'])
async def test_reserved_or_public_host_does_not_gain_private_draft_eligibility(local_case, monkeypatch, change):
    c = local_case
    hosts = {'other_case': private_host(str(uuid4())), 'example': 'business.example',
        'test': 'business.example.test', 'invalid': 'business.invalid', 'localhost': 'business.localhost',
        'unassigned_public': 'business.example.com'}
    if change in hosts:
        c.pin = c.pin.model_copy(update={'accepted': c.pin.accepted.model_copy(update={'canonical_host': hosts[change]})})
    elif change == 'assigned_exact_private':
        c.creation.canonical_host = c.pin.accepted.canonical_host
    elif change == 'wrong_environment':
        monkeypatch.setattr(settings(), 'environment', 'production')
    elif change == 'scope_environment':
        c.pin = c.pin.model_copy(update={'environment_id': 'production'})
    elif change == 'wrong_control_mode':
        monkeypatch.setattr(settings(), 'control_mode', 'production')
    else:
        c.creation.id = str(uuid4())
    assert not await receipts.current(c.tx, c.session, c.creation, c.receipt)
    assert not c.calls


@pytest.mark.parametrize('change', ['candidate', 'paused_language', 'old_revision', 'stale_source',
    'stale_pages', 'changed_owner', 'changed_accepted_revision'])
async def test_private_name_never_substitutes_for_complete_current_proof(local_case, change):
    c = local_case
    if change == 'candidate':
        c.observation = c.observation.model_copy(update={'state': 'candidate'})
    elif change == 'paused_language':
        c.pin = c.pin.model_copy(update={'language_review_mode': 'paused_local_pilot'})
    elif change == 'old_revision':
        c.receipt.accepted_revision = 2
    elif change == 'stale_source':
        c.actual = c.pin.model_copy(update={'sources': c.pin.sources.model_copy(update={'execution_source_revision': '0'*40})})
    elif change == 'stale_pages':
        c.actual = c.pin.model_copy(update={'page_snapshot_sha256': '0'*64})
    elif change == 'changed_owner':
        c.actual = c.pin.model_copy(update={'user_id': uuid4()})
    else:
        c.actual = c.pin.model_copy(update={'accepted': c.pin.accepted.model_copy(update={'accepted_revision': 2})})
    assert not await receipts.current(c.tx, c.session, c.creation, c.receipt)
    assert 'retained' not in c.calls


@pytest.mark.parametrize('change', ['actor', 'archived', 'busy', 'final'])
async def test_current_authority_and_final_verify_still_refuse_private_case(local_case, change):
    c = local_case
    if change == 'actor':
        c.actor = False
    elif change == 'archived':
        c.archived = True
    elif change == 'busy':
        c.creation.active_job_id = str(uuid4())
    else:
        c.final_error = True
    with pytest.raises(ControlError) as error:
        await receipts.current(c.tx, c.session, c.creation, c.receipt)
    assert error.value.code == 'unauthenticated'


async def test_existing_test_environment_and_real_host_behavior_are_preserved(local_case, monkeypatch):
    c = local_case
    monkeypatch.setattr(settings(), 'environment', 'test-foundation')
    c.pin = c.actual = c.pin.model_copy(update={'environment_id': 'test-foundation'})
    assert await receipts.current(c.tx, c.session, c.creation, c.receipt)
    monkeypatch.setattr(settings(), 'environment', 'local')
    c.pin = c.actual = c.pin.model_copy(update={'environment_id': 'local',
        'accepted': c.pin.accepted.model_copy(update={'canonical_host': 'business.example.com'})})
    c.creation.canonical_host = 'business.example.com'
    c.observation = c.observation.model_copy(update={'synthetic': False})
    assert await receipts.current(c.tx, c.session, c.creation, c.receipt)


async def test_historical_receipt_does_not_replace_current_session_verification(local_case):
    c = local_case
    c.actual = c.pin.model_copy(update={'session_id': uuid4()})
    assert await receipts.current(c.tx, c.session, c.creation, c.receipt)
    assert c.verified == [c.actual]
    assert c.observation.synthetic
