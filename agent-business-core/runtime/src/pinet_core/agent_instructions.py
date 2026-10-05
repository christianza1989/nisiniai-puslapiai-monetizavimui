"""Trusted packaged core + niche fragments; immutable snapshots per conversation."""
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .profiles import PROFILES
from .security import digest

ROOT = Path(__file__).parent / 'instructions'
Role = Literal['conversation', 'sales', 'supplier', 'quality']
SITES = frozenset(PROFILES)


@dataclass(frozen=True)
class InstructionRelease:
    prompt: str
    hash: str
    sources: tuple[tuple[str, str], ...]


def compose(site_id: str, role: Role) -> InstructionRelease:
    if site_id not in SITES or role not in {'conversation', 'sales', 'supplier', 'quality'}:
        raise ValueError('instruction_profile_unavailable')
    paths = ['core/common.md', f'core/{role}.md']
    if role == 'sales':
        paths.append('core/email.md')
    if role != 'quality':
        paths.append(f'niches/{site_id}/{role}.md')
    else:
        paths.append(f'niches/{site_id}/conversation.md')
    sources, fragments = [], []
    for relative in paths:
        content = (ROOT / relative).read_text(encoding='utf-8').strip()
        if not content:
            raise ValueError('empty_instruction_fragment')
        sources.append((relative, digest(content)))
        fragments.append(content)
    prompt = f'Šios sesijos svetainė: {PROFILES[site_id].canonical_host}. Rolė: {role}.\n\n' + '\n\n'.join(fragments)
    return InstructionRelease(prompt, digest(prompt), tuple(sources))
