"""Registration, source acceptance, and learning are separate permissions.

Legacy defaults are an explicit compatibility set, never derived from PROFILES.
Adding a profile does not add it to refresh or learning automatically.
"""
import json
from pathlib import Path

from fastapi import HTTPException

from . import knowledge, profiles
from .contracts import Strict
from .security import digest

LEGACY_SITES = frozenset({'traktoriupadangos', 'greitossvetaines', 'akmenas',
    'roletaiklaipedoje', 'laiptucentras', 'auksarankiams'})


class Readiness(Strict):
    source_ready: bool = False
    learning_admitted: bool = False


def defaults(site):
    ready = site in LEGACY_SITES
    return {'source_ready': ready, 'learning_admitted': ready}


async def status(tx, site):
    state = await knowledge.current(tx)
    value = dict(state.payload.get('onboarding', defaults(site))) if state else defaults(site)
    # The current learning harness pins a v1 Knowledge model. V2 knowledge
    # admission remains OFF until that evaluator has its own versioned support.
    if state and state.payload.get('knowledge', {}).get('schema_version') == 2:
        value['learning_admitted'] = False
    return value


async def learning_admitted(tx, business_id):
    from sqlalchemy import select

    from .models import Business
    item = await tx.scalar(select(Business).where(Business.id == business_id))
    value = await status(tx, item.site_id) if item else {}
    return bool(value.get('source_ready') and value.get('learning_admitted'))


async def update(tx, item, value: Readiness):
    state = await knowledge.current(tx)
    if not state or not state.payload.get('knowledge'):
        raise HTTPException(409, 'accepted_knowledge_required')
    if value.learning_admitted:
        if not value.source_ready or state.payload['knowledge'].get('schema_version') == 2:
            raise HTTPException(409, 'learning_source_contract_not_ready')
        root = Path(__file__).resolve().parents[2] / 'evals/learning-v2'
        try:
            registry = json.loads((root / 'registry.json').read_text(encoding='utf-8'))
            hashed = digest((root / (item.site_id + '.json')).read_text(encoding='utf-8'))
            if item.site_id not in profiles.PROFILES or registry['corpus_hashes'][item.site_id] != hashed:
                raise ValueError('missing_or_changed_corpus')
        except (OSError, KeyError, ValueError):
            raise HTTPException(409, 'protected_learning_corpus_required') from None
    state.payload = {**state.payload, 'onboarding': value.model_dump()}
    return await status(tx, item.site_id)
