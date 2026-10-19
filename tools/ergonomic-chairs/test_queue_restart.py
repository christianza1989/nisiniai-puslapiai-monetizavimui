"""The ten-portion policy must survive real JSON process handoff."""
import json
import unittest
from queue_policy import continuation_visits,record_visit


def growing():return {'graph':{'closed':False},'stopReason':'FINITE_TIME_BOUNDARY'}


class QueueRestartTests(unittest.TestCase):
    def test_existing_current_eight_then_two_separate_launches_defer(self):
        state={'chunks':{'current':8},'completedSource':[],'deferredQueue':[]}
        self.assertEqual(continuation_visits(state),{'current':8})
        self.assertEqual(record_visit(state,'current',growing()),'CONTINUE_CURRENT')
        state=json.loads(json.dumps(state))
        self.assertEqual(continuation_visits(state)['current'],9)
        self.assertEqual(record_visit(state,'current',growing()),'DEFER_GROWING')
        self.assertNotIn('current',state['growingVisits'])

    def test_migration_excludes_finished_and_already_deferred(self):
        state={'chunks':{'closed':20,'deferred':27,'current':8},'completedSource':['closed'],'deferredQueue':['deferred']}
        self.assertEqual(continuation_visits(state),{'current':8})

    def test_deferred_next_cycle_starts_new_allowance_after_restart(self):
        state={'chunks':{'current':10},'completedSource':[],'deferredQueue':['current'],'growingVisits':{}}
        state=json.loads(json.dumps(state))
        self.assertEqual(record_visit(state,'current',growing()),'CONTINUE_CURRENT')
        self.assertEqual(state['growingVisits'],{'current':1})

    def test_closed_source_clears_only_its_continuation(self):
        state={'growingVisits':{'current':6,'other':4}}
        self.assertEqual(record_visit(state,'current',{'graph':{'closed':True},'stopReason':None}),'SOURCE_CLOSED')
        self.assertEqual(state['growingVisits'],{'other':4})

    def test_owner_pause_preserves_visit_without_becoming_acceptance(self):
        state={'growingVisits':{'current':8}}
        self.assertEqual(record_visit(state,'current',{'graph':{'closed':False},'stopReason':'OWNER_PAUSE'}),'GLOBAL_HOLD')
        self.assertEqual(json.loads(json.dumps(state))['growingVisits']['current'],9)


if __name__=='__main__':unittest.main()
