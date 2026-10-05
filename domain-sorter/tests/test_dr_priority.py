import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from classifier import AppError
from niche_research import research_queue
from prioritize_dr import apply_dr_priority


class DRPriorityTests(unittest.TestCase):
    def test_threshold_inclusive_ties_resume_and_portfolio_provenance(self):
        domains = [f'domenas{i:03}.lt' for i in range(200)]
        manifest = {'domains': domains, 'source': {'source_sha256': 'same'}, 'priority_method': 'potential',
                    'screening': [{'domain': d, 'i': i % 100, 'score': 90} for i, d in enumerate(domains)],
                    'selection_details': {d: {'research_priority': i+1, 'priority_reason': 'Originali komercinė hipotezė',
                                              'potential_tier': 'original group'} for i, d in enumerate(domains)}}
        cache = {'source_sha256': 'same', 'records': {
            domains[190]: {'status': 'ok', 'domain_rating': 18},
            domains[140]: {'status': 'ok', 'domain_rating': 10},
            domains[120]: {'status': 'ok', 'domain_rating': 10},
            domains[1]: {'status': 'ok', 'domain_rating': 9.9}}}
        manifest['selection_details'][domains[190]]['potential_tier'] = 'P4 — vėliau tirti'
        before = json.dumps(manifest, sort_keys=True)
        result = apply_dr_priority(manifest, cache, 10)
        self.assertEqual(result['domains'][:3], [domains[190], domains[120], domains[140]])
        self.assertEqual(result['domains'][3:], [d for d in domains if d not in result['domains'][:3]])
        self.assertEqual(json.dumps(manifest, sort_keys=True), before)
        self.assertEqual(result['potential_order_before_dr'], domains)
        self.assertEqual({d['domain']: d for d in result['screening']}, {d['domain']: d for d in manifest['screening']})
        self.assertEqual(result['selection_details'][domains[190]]['potential_priority'], 191)
        self.assertEqual(result['selection_details'][domains[190]]['potential_tier_before_dr'], 'P4 — vėliau tirti')
        self.assertEqual(result['selection_details'][domains[190]]['potential_tier'], 'P4 — potencialo vietos 151–200')
        queue = research_queue(result, {domains[190]: {'already': 'completed'}}, 2)
        self.assertEqual(queue, [(20, domains[120], 0), (40, domains[140], 0)])
        # Reapplying another threshold uses the original potential order rather than the last DR order.
        reapplied = apply_dr_priority(result, cache, 15)
        self.assertEqual(reapplied['domains'], [domains[190]]+[d for d in domains if d != domains[190]])
        self.assertEqual(result['priority_sha256'], apply_dr_priority(result, cache, 10)['priority_sha256'])
        for minimum in (-1, 101, float('nan')):
            with self.assertRaises(AppError):
                apply_dr_priority(manifest, cache, minimum)
        with self.assertRaises(AppError):
            apply_dr_priority(manifest, {'source_sha256': 'wrong'}, 10)


if __name__ == '__main__':
    unittest.main()
