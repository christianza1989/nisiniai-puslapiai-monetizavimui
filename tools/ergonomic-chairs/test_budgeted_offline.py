import sys
import types
import unittest
from unittest.mock import patch
from run_budgeted_offline import accepted_arguments,main


class AcceptedFiniteBudget(unittest.TestCase):
    def test_watchers_worker_arguments_keep_all_source_identities(self):
        original=['--root','source','--inventory','inventory','--session','original.obx','--prepared','prepared','--web','original-web','--node','node']
        result=accepted_arguments(original)
        self.assertEqual(result[:-4],original)
        self.assertEqual(result[-4:],['--compiler-timeout-seconds','7200','--runtime-timeout-seconds','1800'])
        self.assertEqual(original[-1],'node')

    def test_explicit_and_equals_budget_overrides_are_rejected(self):
        for option in ['--compiler-timeout-seconds','--runtime-timeout-seconds']:
            for supplied in [[option,'1800'],[option+'=7200']]:
                with self.assertRaises(ValueError):accepted_arguments(supplied)

    def test_nested_watcher_is_rejected(self):
        for supplied in [['--watch-seconds','14400'],['--watch-seconds=0']]:
            with self.assertRaises(ValueError):accepted_arguments(supplied)

    def test_real_entrypoint_invokes_one_finite_worker_with_proven_budget(self):
        calls=[]
        finite=types.SimpleNamespace(main=lambda:calls.append(sys.argv[:]))
        with patch.object(sys,'argv',['adapter','--root','source']),patch.dict(sys.modules,{'prepare_closed':finite}):main()
        self.assertEqual(calls,[['adapter','--root','source','--compiler-timeout-seconds','7200','--runtime-timeout-seconds','1800']])


if __name__=='__main__':unittest.main()
