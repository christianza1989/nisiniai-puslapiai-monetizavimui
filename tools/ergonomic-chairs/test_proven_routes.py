import unittest
from proven_routes import shortest_proven_path


def edge(source, target, field='CHAIR_OPTIONS.F', requested=None, proof=True):
    return {'from': source, 'to': target, 'field': field,
            'requested': target if requested is None else requested,
            'measured': True, 'wireProof': ['receipt'] if proof else []}


class ProvenRouteTests(unittest.TestCase):
    def test_shorter_directed_path_preserves_measured_steps(self):
        edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('a', 'd')]
        path = shortest_proven_path('a', 'd', edges, {'a', 'b', 'c', 'd'})
        self.assertEqual(path, [{k: edges[-1][k] for k in ('from', 'field', 'requested', 'to')}])
        self.assertIsNone(shortest_proven_path('d', 'a', edges, {'a', 'b', 'c', 'd'}))

    def test_finish_unmeasured_and_unproven_edges_are_excluded(self):
        for bad in [edge('a', 'b', field='CHAIR_FINISHES.COLOR'),
                    edge('a', 'b', proof=False), dict(edge('a', 'b'), measured=False)]:
            self.assertIsNone(shortest_proven_path('a', 'b', [bad], {'a', 'b'}))

    def test_ambiguous_outcome_is_not_a_shortcut(self):
        edges = [edge('a', 'b', requested='x'), edge('a', 'c', requested='x'), edge('b', 'd')]
        self.assertIsNone(shortest_proven_path('a', 'd', edges, {'a', 'b', 'c', 'd'}))

    def test_implicit_finish_transition_keeps_exact_target_identity(self):
        edges = [dict(edge('a', 'b'), implicitFinishChanges={'COLOR': {'before': 'x', 'after': 'y'}})]
        self.assertEqual(shortest_proven_path('a', 'b', edges, {'a', 'b'})[0]['to'], 'b')

    def test_anchor_and_unknown_target(self):
        self.assertEqual(shortest_proven_path('a', 'a', [], {'a'}), [])
        self.assertIsNone(shortest_proven_path('a', 'unknown', [], {'a'}))


if __name__ == '__main__':
    unittest.main()
