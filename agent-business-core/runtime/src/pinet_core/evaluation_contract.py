"""Fingerprint the evaluator implementation and packaged facts-free instructions."""
from pathlib import Path

from .security import digest

ROOT = Path(__file__).resolve().parents[2]


def fingerprint():
    paths = [ROOT / p for p in ['scripts/network_lab.py', 'scripts/client_lab.py', 'scripts/learning_observation.py']]
    paths += sorted((ROOT / 'src/pinet_core').glob('*.py'))
    paths += sorted((ROOT / 'src/pinet_core/instructions').rglob('*.md'))
    return digest('\n'.join(str(p.relative_to(ROOT)) + ':' + digest(p.read_text(encoding='utf-8')) for p in paths))
