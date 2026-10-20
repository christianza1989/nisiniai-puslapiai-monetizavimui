import json
import unittest
from queue_policy import disposition,record_visit,remaining_order


class FinishStartedTests(unittest.TestCase):
    def setUp(self):
        self.jobs=[{'job':k,'modelKeys':[k]} for k in ['new','large','near','closed','bad']]
        self.state={'completedSource':['closed'],'tail':[{'job':'bad'}],'deferredQueue':['large','near']}
        self.progress={'large':{'states':900,'pendingEdges':8000},'near':{'states':768,'pendingEdges':947}}

    def test_started_nearer_frontier_precedes_unknown_and_saved_defer_order(self):
        order=remaining_order(self.jobs,self.state,finish_started=True,progress=self.progress)
        self.assertEqual([j['job'] for j in order],['near','large','new'])
        self.assertEqual(self.state['deferredQueue'],['large','near'])

    def test_explicit_admin_priority_precedes_completion_heuristic(self):
        order=remaining_order(self.jobs,self.state,finish_started=True,progress=self.progress,priorities=['new','large'])
        self.assertEqual([j['job'] for j in order],['new','large','near'])

    def test_persisted_focus_stays_selected_when_its_frontier_expands(self):
        self.state['completionFocus']='large'
        order=remaining_order(self.jobs,json.loads(json.dumps(self.state)),finish_started=True,progress=self.progress)
        self.assertEqual(order[0]['job'],'large')

    def test_new_explicit_priority_supersedes_saved_focus(self):
        self.state['completionFocus']='large'
        order=remaining_order(self.jobs,self.state,finish_started=True,progress=self.progress,priorities=['near'])
        self.assertEqual(order[0]['job'],'near')

    def test_tenth_and_later_finite_portions_continue_without_acceptance(self):
        result={'graph':{'closed':False},'stopReason':'FINITE_GRAPH_BUDGET'}
        self.state['growingVisits']={'near':9}
        for expected in [10,11,12]:
            self.state=json.loads(json.dumps(self.state))
            self.assertEqual(record_visit(self.state,'near',result,finish_started=True),'CONTINUE_CURRENT')
            self.assertEqual(self.state['growingVisits']['near'],expected)

    def test_real_closure_required_and_clears_only_own_counter(self):
        self.state['growingVisits']={'near':17,'large':2}
        closed={'graph':{'closed':True},'stopReason':None}
        self.assertEqual(record_visit(self.state,'near',closed,finish_started=True),'SOURCE_CLOSED')
        self.assertEqual(self.state['growingVisits'],{'large':2})
        closed['stopReason']='FINITE_TIME_BOUNDARY'
        self.assertEqual(disposition(closed,99,finish_started=True),'CONTINUE_CURRENT')

    def test_stop_reserve_unknown_transport_and_review_remain_blocking(self):
        for reason,outcome in [('OWNER_PAUSE','GLOBAL_HOLD'),('DISK_RESERVE','GLOBAL_HOLD'),('GRANT_CHANGED','GLOBAL_HOLD'),('UnknownOutcome:Timeout','TRANSPORT_REVIEW'),('ValueError:SOURCE_CHANGED','MODEL_REVIEW')]:
            self.assertEqual(disposition({'graph':{'closed':False},'stopReason':reason},20,finish_started=True),outcome)

    def test_legacy_policy_keeps_its_original_tenth_portion_deferral(self):
        result={'graph':{'closed':False},'stopReason':'FINITE_TIME_BOUNDARY'}
        self.assertEqual(disposition(result,10),'DEFER_GROWING')
        self.assertEqual([j['job'] for j in remaining_order(self.jobs,self.state)],['new','large','near'])


if __name__=='__main__':unittest.main()
