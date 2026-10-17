import copy
import unittest
from structure_policy import state_key, frontier, require_transition, finish_changes, closure


def state(arm='NONE', finish='YB094'):
    return {'baseArticle': 'TEST', 'properties': {
        'TEST_OPTIONS.CARM': {'value': arm, 'visible': True, 'editable': True},
        'TEST_FINISHES.CCOLOR': {'value': finish, 'visible': True, 'editable': True}},
        'choices': {'TEST_OPTIONS.CARM': [{'value': 'NONE'}, {'value': 'R55'}],
                    'TEST_FINISHES.CCOLOR': [{'value': 'YB094'}, {'value': 'YB009'}]}}


class PolicyTests(unittest.TestCase):
    def test_finishes_never_in_frontier(self):
        self.assertEqual(frontier(state())[0], [('TEST_OPTIONS.CARM', 'R55')])

    def test_even_frame_finish_must_not_be_set(self):
        for f in ['TEST_FINISHES.CFRAMEPLASTICCOLOR', 'TEST_FINISHES.CPRICEGROUP', 'TEST_TECHNICAL.GCODE']:
            with self.assertRaisesRegex(ValueError, 'FORBIDDEN'):
                require_transition(state(), f, 'BLACK')

    def test_unselectable_or_hidden_values_not_in_frontier(self):
        s = state()
        s['choices']['TEST_OPTIONS.CARM'][1]['selectable'] = False
        self.assertEqual(frontier(s)[0], [])
        s['properties']['TEST_OPTIONS.CARM']['visible'] = False
        self.assertEqual(frontier(s)[0], [])

    def test_unknown_dimension_is_reported_not_sampled(self):
        s = state()
        s['properties']['TEST_DIMENSIONS.DWIDTH'] = dict(value='500', visible=True, editable=True)
        self.assertEqual(frontier(s)[1][0]['reason'], 'NO_PROVEN_FINITE_DOMAIN')

    def test_finite_dimensions_are_explored(self):
        s = state()
        s['properties']['TEST_DIMENSIONS.DWIDTH'] = dict(value='500', visible=True, editable=True)
        s['choices']['TEST_DIMENSIONS.DWIDTH'] = [{'value': '500'}, {'value': '600'}]
        self.assertIn(('TEST_DIMENSIONS.DWIDTH', '600'), frontier(s)[0])

    def test_implicit_finish_is_identity_and_preserved(self):
        a, b = state(), state('R55', 'YB009')
        before = copy.deepcopy(b)
        self.assertNotEqual(state_key(state('R55')), state_key(b))
        self.assertEqual(finish_changes(a, b)['TEST_FINISHES.CCOLOR']['after'], 'YB009')
        self.assertEqual(b, before)

    def test_new_choice_domain_is_identity(self):
        a, b = state(), state()
        b['choices']['TEST_OPTIONS.CARM'].append({'value': 'R65'})
        self.assertNotEqual(state_key(a), state_key(b))

    def test_unobserved_setter_rejected(self):
        with self.assertRaisesRegex(ValueError, 'NOT_AN_OBSERVED'):
            require_transition(state(), 'TEST_OPTIONS.CARM', 'R65')

    def test_partial_or_unproven_graph_never_closed(self):
        a, b = state(), state('R55')
        ka, kb = state_key(a), state_key(b)
        cp = dict(initial=ka, edges=[dict(**{'from': ka}, field='TEST_OPTIONS.CARM', requested='R55', to=kb, measured=True)])
        self.assertFalse(closure(cp, {ka: a, kb: b})['closed'])

    def test_true_bidirectional_closure_not_acceptance(self):
        a, b = state(), state('R55')
        ka, kb = state_key(a), state_key(b)
        cp = dict(initial=ka, edges=[dict(**{'from': x}, field='TEST_OPTIONS.CARM', requested=v, to=y, measured=True, wireProof=['raw'])
                                   for x, y, v in [(ka, kb, 'R55'), (kb, ka, 'NONE')]])
        result = closure(cp, {ka: a, kb: b})
        self.assertTrue(result['closed'])
        self.assertFalse(result['acceptance'])

    def test_orphan_source_cannot_prove_closure(self):
        a, b = state(), state('R55')
        result = closure(dict(initial=state_key(a), edges=[]), {state_key(a): a, state_key(b): b})
        self.assertEqual(result['reachableStates'], 1)
        self.assertFalse(result['closed'])


if __name__ == '__main__':
    unittest.main()
