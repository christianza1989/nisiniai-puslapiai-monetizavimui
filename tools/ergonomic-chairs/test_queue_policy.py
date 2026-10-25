import unittest
from queue_policy import disposition,remaining_order


class QueueTests(unittest.TestCase):
    def result(self,reason,closed=False):return {'stopReason':reason,'graph':{'closed':closed}}
    def test_partial_budget_is_continued_then_deferred_not_accepted(self):
        self.assertEqual(disposition(self.result('FINITE_GRAPH_BUDGET'),9),'CONTINUE_CURRENT')
        self.assertEqual(disposition(self.result('FINITE_GRAPH_BUDGET'),10),'DEFER_GROWING')
        self.assertEqual(disposition(self.result(None,True),10),'SOURCE_CLOSED')
        self.assertEqual(disposition(self.result('FINITE_TIME_BOUNDARY',True),1),'CONTINUE_CURRENT')
    def test_unknown_mutation_and_disk_stop_the_lane(self):
        self.assertEqual(disposition(self.result('UnknownOutcome:ConnectionError'),1),'TRANSPORT_REVIEW')
        self.assertEqual(disposition(self.result('DISK_RESERVE'),1),'GLOBAL_HOLD')
        self.assertEqual(disposition(self.result('ValueError:SOURCE_CHANGED'),1),'MODEL_REVIEW')
    def test_deferred_graph_retains_saved_order_and_is_not_lost(self):
        jobs=[{'job':k} for k in 'abcde']
        state={'completedSource':['a'],'tail':[{'job':'b'}],'deferredQueue':['e','c']}
        self.assertEqual([j['job'] for j in remaining_order(jobs,state)],['d','e','c'])


if __name__=='__main__':unittest.main()
