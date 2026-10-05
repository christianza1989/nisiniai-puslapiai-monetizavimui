"""Add one fresh reserve holdout so an observed holdout can become training."""
import json
from pathlib import Path

from prepare_learning_corpus import ENGLISH

from pinet_core.agent_instructions import SITES
from pinet_core.security import digest

ROOT = Path(__file__).resolve().parents[1]


def main():
    directory = ROOT / 'evals/learning-v2'
    directory.mkdir(exist_ok=False)
    hashes = {}
    for site in sorted(SITES):
        source = (ROOT / 'evals/learning-v1' / (site + '.json')).read_text(encoding='utf-8')
        corpus = json.loads(source)
        initial = ENGLISH[site] + ' I am only collecting information; do not request my phone or email.'
        if site == 'greitossvetaines':
            initial = ('I have 2 real work photos with permission to publish them and need a small painting '
                'business website without a shop. I am only collecting information; do not request my phone or email.')
        corpus['clients'].append({'id': 'minimum_preparation_without_contact', 'label': 'Minimum and optional preparation',
            'split': 'holdout', 'contact': False, 'refusal': True, 'refusal_at': 0, 'expected_need': {},
            'messages': [initial, 'Separate what I need to prepare now from optional improvements later. '
                'Give me a useful next step; no order, booking, callback or email.']})
        corpus.update(version='protected-learning-v2-2026-10-03', parent_corpus_hash=digest(source))
        content = json.dumps(corpus, ensure_ascii=False, indent=2)
        (directory / (site + '.json')).write_text(content, encoding='utf-8')
        hashes[site] = digest(content)
    (directory / 'registry.json').write_text(json.dumps({'as_of': '2026-10-03', 'cases_per_site': 7,
        'train': 3, 'reserve_holdout': 4, 'observed_case_becomes_training': True,
        'minimum_unseen_holdout': 3, 'model_may_edit_corpus': False, 'corpus_hashes': hashes}, indent=2), encoding='utf-8')
    print(json.dumps({'sites': 6, 'canonical_cases': 42, 'reserve_holdout': 24}))


if __name__ == '__main__':
    main()
