"""Server-generated factual review binding for free customer follow-ups."""
import re
from urllib.parse import urlsplit

from .security import digest


def bind(data, subject, body, review, engine):
    return {'subject': subject, 'body': body, 'body_hash': digest(body), 'review': review,
        'engine': engine, 'knowledge_deployment_id': data['knowledge']['deployment_id'],
        'knowledge_revision': data['knowledge'].get('knowledge_revision'),
        'evidence_ids': [e['id'] for e in data['evidence']]}


def verified_result(data, analysis):
    value = analysis.get('validated_followup')
    if not isinstance(value, dict) or value.get('engine') != 'codex_cli_text_lab':
        return None  # Production generator must obtain its own review before opting in.
    if (value.get('review', {}).get('approved') is not True or value['review'].get('unsupported_claims') or
            value.get('body_hash') != digest(value.get('body', '')) or
            value.get('knowledge_deployment_id') != data['knowledge']['deployment_id'] or
            value.get('knowledge_revision') != data['knowledge'].get('knowledge_revision') or
            set(value.get('evidence_ids', [])) != {e['id'] for e in data['evidence']}):
        return None
    body, subject = value.get('body', ''), value.get('subject', '')
    if (not 20 <= len(body) <= 6000 or not 3 <= len(subject) <= 180 or
            any(ord(c) < 32 for c in subject) or re.search(
                r'\[TEST|\bSINTETIN\w*\s+(?:BANDYM|LAIŠK)|\bTESTINIS\s+LAIŠKAS', body + subject, re.I)):
        return None
    sources = {p['url']: p for p in data['knowledge']['pages']}
    used = []
    for url in re.findall(r'https?://[^\s<>]+', body, flags=re.I):
        url = url.rstrip('.,;)')
        if url not in sources or urlsplit(url).hostname != data['knowledge']['canonical_host']:
            return None
        used.append(sources[url])
    return {'subject': subject, 'body': body, 'hash': digest(body), 'kind': 'reviewed_informational_followup',
        'validation': 'server_bound_model_facts_review', 'knowledge_revision': value['knowledge_revision'],
        'source_refs': [{k: p[k] for k in ['id', 'url', 'revision_hash', 'projection_hash']} for p in used],
        'test': data['test']}
