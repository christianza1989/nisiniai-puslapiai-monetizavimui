import hashlib
from pathlib import Path

ROOT = Path(__file__).parent / 'instructions'


def compose(sector='general', role='researcher'):
    if sector not in {'general', 'medical_equipment'} or role not in {'researcher', 'reviewer'}:
        raise ValueError('acquisition_instruction_unavailable')
    paths = [ROOT / 'common.md', ROOT / f'{role}.md', ROOT / f'{sector}.md']
    fragments = [path.read_text(encoding='utf-8').strip() for path in paths]
    if not all(fragments):
        raise ValueError('empty_acquisition_instruction')
    prompt = '\n\n'.join(fragments)
    return prompt, hashlib.sha256(prompt.encode()).hexdigest()
