"""Read-only observation of agent instruction files and real quality-job artifacts."""
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def snapshot(root=ROOT):
    paths = list((root / 'src/pinet_core/instructions').rglob('*.md'))
    paths += list((root / 'artifacts/instruction-releases').rglob('*.json'))
    paths += list((root / 'artifacts/instruction-releases').rglob('*.md'))
    paths += list((root / 'artifacts/instruction-envs').rglob('*.json'))
    paths += list((root / 'artifacts/instruction-envs').rglob('*.md'))
    return {str(path.relative_to(root)).replace('\\', '/'):
        hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(paths)}


def changes(before, after):
    return [key for key in sorted(before.keys() | after.keys()) if before.get(key) != after.get(key)]


def artifacts(row):
    observed = row.get('calibration_artifacts', [])
    return {'quality_outcome': row.get('quality', {}).get('outcome'),
        'root_cause': row.get('quality', {}).get('root_cause'),
        'issues': row.get('quality', {}).get('issues', []),
        'candidates': [a for a in observed if a['kind'].startswith('candidate:')],
        'static_evaluations': [a for a in observed if a['kind'].startswith('static_eval:')],
        'knowledge_reviews': [a for a in observed if a['kind'].startswith('content_review:')]}
