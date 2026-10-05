"""V2 transport of an already-public projection, with fenced atomic publication.

This is not a package publication filter. Only the trusted projection producer
may send content here. A partial upload never renews or replaces active facts.
"""
import json
from datetime import UTC, datetime, timedelta
from typing import Literal
from urllib.parse import urlsplit

from fastapi import HTTPException
from pydantic import EmailStr, Field
from sqlalchemy import text

from . import knowledge
from .config import settings
from .contracts import Strict
from .models import KnowledgeState, utcnow
from .security import digest

MAX_BYTES = 8_000_000
TRANSFER_TTL = 600


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def content_hash(metadata, pages):
    return digest(canonical({'metadata': metadata, 'pages': pages}))


class Metadata(Strict):
    site_id: str = Field(min_length=1, max_length=100)
    canonical_host: str = Field(min_length=1, max_length=250)
    contact_email: EmailStr
    operator: str = Field(min_length=1, max_length=200)
    deployment_id: str = Field(min_length=1, max_length=100)
    generated_at: str = Field(min_length=1, max_length=50)


class Begin(Strict):
    schema_version: Literal[2]
    transfer_id: str = Field(pattern=r'^[a-zA-Z0-9._-]{1,100}$')
    base_revision: int = Field(ge=0)
    metadata: Metadata
    page_count: int = Field(ge=1, le=1000)
    fragment_count: int = Field(ge=1, le=1000)
    content_hash: str = Field(pattern=r'^[a-f0-9]{64}$')


class Fragment(Strict):
    ordinal: int = Field(ge=0, lt=1000)
    page_ordinal: int = Field(ge=0, lt=1000)
    part: int = Field(ge=0, lt=1000)
    parts: int = Field(ge=1, le=1000)
    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(min_length=1, max_length=600)
    revision_hash: str = Field(pattern=r'^[a-f0-9]{64}$')
    projection_hash: str = Field(pattern=r'^[a-f0-9]{64}$')
    text: str = Field(max_length=18000)


class Batch(Strict):
    transfer_id: str = Field(pattern=r'^[a-zA-Z0-9._-]{1,100}$')
    fragments: list[Fragment] = Field(min_length=1, max_length=10)


class Commit(Strict):
    transfer_id: str = Field(pattern=r'^[a-zA-Z0-9._-]{1,100}$')
    content_hash: str = Field(pattern=r'^[a-f0-9]{64}$')


class Revocation(Strict):
    base_revision: int = Field(ge=1)
    revision_hashes: list[str] = Field(min_length=1, max_length=1000)
    reason: str = Field(min_length=3, max_length=300)


def fail(reason):
    raise HTTPException(409, reason)


async def locked(tx, item):
    await tx.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))'),
        {'key': f'knowledge:{item.id}:{settings().environment}'})
    return await knowledge.current(tx)


def live_pending(state, transfer_id):
    pending = state.payload.get('pending_index') if state else None
    if not pending or pending['header']['transfer_id'] != transfer_id:
        fail('knowledge_transfer_missing')
    if datetime.fromisoformat(pending['expires_at']) <= utcnow():
        fail('knowledge_transfer_expired')
    if state.revision != pending['header']['base_revision']:
        fail('knowledge_revision_conflict')
    return pending


async def begin(tx, item, data: Begin):
    metadata = data.metadata
    if metadata.site_id != item.site_id or metadata.canonical_host != item.canonical_host:
        fail('knowledge_mapping_conflict')
    try:
        generated = datetime.fromisoformat(metadata.generated_at)
    except ValueError:
        fail('knowledge_timestamp_invalid')
    if generated.tzinfo is None:
        fail('knowledge_timezone_required')
    state = await locked(tx, item)
    if data.base_revision != (state.revision if state else 0):
        fail('knowledge_revision_conflict')
    header = data.model_dump(mode='json')
    if state and state.payload.get('index_receipt', {}).get('transfer_id') == data.transfer_id:
        fail('knowledge_transfer_already_completed')
    old = state.payload.get('pending_index') if state else None
    if (old and datetime.fromisoformat(old['expires_at']) > utcnow()
            and old['header']['base_revision'] == state.revision):
        if old['header'] != header:
            fail('knowledge_transfer_in_progress')
        live_pending(state, data.transfer_id)
        return {'status': 'staging', 'received': len(old['fragments'])}
    if not state:
        state = KnowledgeState(business_id=item.id, environment_id=settings().environment,
            revision=0, refreshed_at=datetime(1970, 1, 1, tzinfo=UTC), payload={'hash': '', 'revoked': []})
        tx.add(state)
    state.payload = {**state.payload, 'pending_index': {'header': header, 'fragments': {},
        'expires_at': (utcnow() + timedelta(seconds=TRANSFER_TTL)).isoformat()}}
    await tx.flush()
    return {'status': 'staging', 'received': 0}


async def batch(tx, item, data: Batch):
    if len(canonical(data.model_dump(mode='json')).encode('utf-8')) > 512000:
        fail('knowledge_batch_too_large')
    state = await locked(tx, item)
    pending = live_pending(state, data.transfer_id)
    fragments = dict(pending['fragments'])
    header = pending['header']
    for fragment in data.fragments:
        value = fragment.model_dump(mode='json')
        url = urlsplit(fragment.url)
        if (url.scheme != 'https' or url.netloc != item.canonical_host or url.username or url.password
                or fragment.ordinal >= header['fragment_count'] or fragment.page_ordinal >= header['page_count']
                or fragment.part >= fragment.parts):
            fail('knowledge_fragment_provenance_conflict')
        key = str(fragment.ordinal)
        if key in fragments and fragments[key] != value:
            fail('knowledge_fragment_replay_conflict')
        fragments[key] = value
    if len(canonical(fragments).encode('utf-8')) > MAX_BYTES:
        fail('knowledge_transfer_too_large')
    state.payload = {**state.payload, 'pending_index': {**pending, 'fragments': fragments}}
    return {'status': 'staging', 'received': len(fragments), 'expected': header['fragment_count']}


def assemble(header, fragments):
    if set(fragments) != {str(i) for i in range(header['fragment_count'])}:
        fail('knowledge_fragments_incomplete')
    groups = {}
    for index in range(header['fragment_count']):
        value = fragments[str(index)]
        groups.setdefault(value['page_ordinal'], []).append(value)
    if set(groups) != set(range(header['page_count'])):
        fail('knowledge_pages_incomplete')
    pages = []
    for ordinal in range(header['page_count']):
        parts = sorted(groups[ordinal], key=lambda value: value['part'])
        first = parts[0]
        keys = ('id', 'title', 'url', 'revision_hash', 'projection_hash')
        if ([p['part'] for p in parts] != list(range(first['parts']))
                or any(p['parts'] != first['parts'] or any(p[k] != first[k] for k in keys) for p in parts)):
            fail('knowledge_page_fragments_conflict')
        pages.append({**{k: first[k] for k in keys}, 'text': ''.join(p['text'] for p in parts)})
    if len({p['id'] for p in pages}) != len(pages):
        fail('knowledge_duplicate_page')
    if content_hash(header['metadata'], pages) != header['content_hash']:
        fail('knowledge_content_hash_conflict')
    return pages


async def commit(tx, item, data: Commit):
    state = await locked(tx, item)
    receipt = state.payload.get('index_receipt') if state else None
    if receipt and receipt['transfer_id'] == data.transfer_id:
        if receipt['content_hash'] != data.content_hash or receipt['revision'] != state.revision:
            fail('knowledge_commit_replay_conflict')
        return receipt
    pending = live_pending(state, data.transfer_id)
    header = pending['header']
    if data.content_hash != header['content_hash']:
        fail('knowledge_content_hash_conflict')
    pages = assemble(header, pending['fragments'])
    active_hash = content_hash({k: v for k, v in header['metadata'].items() if k != 'generated_at'}, pages)
    same = state.payload.get('hash') == active_hash
    if not same:
        state.revision += 1
    state.refreshed_at = utcnow()
    receipt = {'status': 'complete', 'schema_version': 2, 'transfer_id': data.transfer_id,
        'content_hash': data.content_hash, 'revision': state.revision, 'page_count': len(pages),
        'fragment_count': header['fragment_count'], 'refreshed_at': state.refreshed_at.isoformat()}
    payload = {**state.payload, 'knowledge': {**header['metadata'], 'schema_version': 2, 'pages': pages},
        'hash': active_hash, 'index_receipt': receipt}
    payload.pop('pending_index', None)
    state.payload = payload
    return receipt
