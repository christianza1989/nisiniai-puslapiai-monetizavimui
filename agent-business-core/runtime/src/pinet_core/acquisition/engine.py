"""Bounded preparation with private replay journal; never invokes external sending."""
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .contracts import Assessment, Campaign, Prospect, Review
from .instructions import compose


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def atomic(path, value):
    temp = path.with_suffix('.tmp')
    with temp.open('w', encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp, path)


def gates(campaign: Campaign, prospect: Prospect, now: datetime):
    reasons = []
    if not campaign.enabled or campaign.paused:
        reasons.append('campaign_disabled_or_paused')
    if campaign.expires_at <= now:
        reasons.append('campaign_expired')
    if prospect.site_id != campaign.site_id:
        reasons.append('foreign_site')
    if prospect.role != 'buyer':
        reasons.append('non_buyer')
    if prospect.segment not in campaign.segments or prospect.country not in campaign.countries:
        reasons.append('outside_audience')
    if prospect.suppressed or prospect.status != 'new':
        reasons.append('sequence_stopped')
    if len({e.id for e in prospect.evidence}) != len(prospect.evidence):
        reasons.append('duplicate_evidence_id')
    if any(not e.use_allowed or e.checked_at > now or e.expires_at <= now
           or e.expires_at <= e.checked_at for e in prospect.evidence):
        reasons.append('source_unavailable_or_expired')
    if any(f.expires_at <= now for f in campaign.facts):
        reasons.append('offer_expired')
    return reasons


def validate_assessment(campaign, prospect, assessment):
    reasons = []
    if not set(assessment.evidence_ids) <= {e.id for e in prospect.evidence}:
        reasons.append('unknown_evidence_reference')
    if not set(assessment.offer_fact_ids) <= {f.id for f in campaign.facts}:
        reasons.append('unknown_offer_reference')
    if assessment.next_action == 'draft':
        if campaign.mode != 'draft_only':
            reasons.append('draft_mode_required')
        if (assessment.fit != 'yes' or not assessment.evidence_ids or not assessment.offer_fact_ids
                or not assessment.subject.strip() or not assessment.body.strip()):
            reasons.append('unsupported_draft')
    elif assessment.subject or assessment.body:
        reasons.append('unexpected_draft_text')
    return reasons


def contact_blocks(prospect):
    # These metadata checks explain readiness only. They cannot authorize transport.
    reasons = []
    if not prospect.contact_verified or prospect.contact_source_id not in {e.id for e in prospect.evidence}:
        reasons.append('contact_not_verified')
    if not prospect.contact_basis_verified:
        reasons.append('contact_basis_unverified')
    if not prospect.provider_allowed:
        reasons.append('provider_unverified')
    return reasons + ['live_transport_not_implemented']


async def prepare(campaign, prospect, lab, now):
    reasons = gates(campaign, prospect, now)
    if reasons:
        return {'state': 'blocked', 'reasons': reasons, 'external_sent': False}
    prompt, instruction_hash = compose(campaign.sector)
    review_prompt, reviewer_hash = compose(campaign.sector, 'reviewer')
    data = {'campaign': campaign.model_dump(mode='json'), 'prospect': prospect.model_dump(mode='json'),
            'now': now.isoformat()}
    assessment = await lab.ask(Assessment, prompt, data)
    reasons = validate_assessment(campaign, prospect, assessment)
    review = None
    if not reasons:
        review = await lab.ask(Review, review_prompt, {**data, 'assessment': assessment.model_dump()})
        if not all(getattr(review, name) for name in ['factual', 'relevant', 'one_clear_next_step',
                   'no_unverified_promises', 'no_source_instructions']):
            reasons.append('independent_review_failed')
    state = 'blocked' if reasons else ('draft_ready' if assessment.next_action == 'draft' else assessment.next_action)
    return {'state': state, 'reasons': reasons, 'assessment': assessment.model_dump(),
            'review': review.model_dump() if review else None, 'instruction_hash': instruction_hash,
            'reviewer_hash': reviewer_hash, 'contact_blocks': contact_blocks(prospect), 'external_sent': False}


async def daily(campaign, prospects, lab, root: Path, now: datetime):
    """Once per local campaign/day. Artifacts are not a CRM or inbound Case records.

    An interrupted model request is retained as uncertain and never blindly repeated.
    The caller owns source discovery and supplies a bounded, policy-checked batch.
    """
    if now.tzinfo is None:
        raise ValueError('timezone_required')
    if len(prospects) > campaign.max_prospects:
        raise ValueError('prospect_budget_exceeded')
    if not campaign.enabled or campaign.paused or campaign.expires_at <= now:
        raise ValueError('campaign_not_active')
    keys = [p.organization_key for p in prospects]
    if len(set(keys)) != len(keys):
        raise ValueError('duplicate_organization')
    day = now.astimezone(ZoneInfo(campaign.timezone)).date().isoformat()
    folder = root / campaign.site_id / campaign.campaign_id
    folder.mkdir(parents=True, exist_ok=True)
    lock = folder / 'preparation.lock'
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise RuntimeError('campaign_already_running_or_interrupted_lock') from None
    os.close(descriptor)
    journal_path = folder / f'{day}.json'
    input_hash = fingerprint({'campaign': campaign.model_dump(mode='json'),
                              'prospects': [p.model_dump(mode='json') for p in prospects],
                              'instruction_hash': compose(campaign.sector)[1],
                              'reviewer_hash': compose(campaign.sector, 'reviewer')[1]})
    try:
        if journal_path.exists():
            journal = json.loads(journal_path.read_text(encoding='utf-8'))
            if journal['input_hash'] != input_hash:
                raise ValueError('daily_input_conflict_requires_new_campaign')
            # A replay only returns the retained receipt; no new calls, even after failure.
            return journal
        previous = {}
        for path in sorted(folder.glob('????-??-??.json')):
            old = json.loads(path.read_text(encoding='utf-8'))
            for row in old['records']:
                if row['state'] in {'draft_ready', 'uncertain'}:
                    previous[row['organization_key']] = row['state']
        journal = {'day': day, 'site_id': campaign.site_id, 'campaign_id': campaign.campaign_id,
                   'input_hash': input_hash, 'state': 'running', 'records': [], 'model_calls': 0,
                   'external_sent': False, 'source_discovery': 'caller_imported_evidence'}
        atomic(journal_path, journal)
        start_calls = lab.calls
        for prospect in prospects:
            row = {'organization_key': prospect.organization_key, 'state': 'uncertain',
                   'external_sent': False}
            if prospect.organization_key in previous:
                row.update(state='duplicate', reasons=['prior_draft_or_uncertain'])
            elif lab.calls - start_calls + 2 > campaign.max_model_calls:
                row.update(state='blocked', reasons=['daily_model_budget'])
            else:
                journal['records'].append(row)
                atomic(journal_path, journal)
                try:
                    row.update(await prepare(campaign, prospect, lab, now))
                except Exception as error:
                    row.update(state='uncertain', error_class=type(error).__name__)
                journal['model_calls'] = lab.calls - start_calls
                atomic(journal_path, journal)
                continue
            journal['records'].append(row)
            atomic(journal_path, journal)
        journal['state'] = 'complete'
        atomic(journal_path, journal)
        return journal
    finally:
        lock.unlink(missing_ok=True)
