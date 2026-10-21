import io
import json
import subprocess
import unittest
from offline_command_budget import command_budget, run_checked_command, selected_closed_jobs


class OfflineCommandBudgetTests(unittest.TestCase):
    def test_default_and_bounded_repair_budget(self):
        self.assertEqual(command_budget('1800'), 1800)
        self.assertEqual(command_budget('7200'), 7200)
        for value in (0, 1799, 7201, 'invalid'):
            with self.assertRaises(ValueError): command_budget(value)

    def test_targeted_job_requires_real_closure_and_keeps_existing_order(self):
        self.assertEqual(selected_closed_jobs(['a','b'], ['b','a'], {'a','b','c'}), ['a','b'])
        self.assertEqual(selected_closed_jobs(['a','b'], [], {'a','b','c'}), ['a','b'])
        for requested in (['c'], ['unknown'], ['a','a']):
            with self.assertRaises(ValueError): selected_closed_jobs(['a','b'], requested, {'a','b','c'})

    def test_actual_exit_is_required_and_stage_is_flushed(self):
        calls=[]
        stream=io.BytesIO()
        def runner(args, **kwargs):
            self.assertIn(b'OFFLINE_COMMAND_STARTED', stream.getvalue())
            calls.append((args,kwargs))
            return subprocess.CompletedProcess(args, 0)
        result=run_checked_command(['node','compiler'],cwd='web',stream=stream,
            seconds=7200,stage='geometry',runner=runner,clock=lambda:12)
        self.assertEqual(result.returncode,0)
        self.assertEqual(calls[0][1]['timeout'],7200)
        self.assertTrue(calls[0][1]['check'])
        self.assertEqual([json.loads(x)['phase'] for x in stream.getvalue().splitlines()],
            ['OFFLINE_COMMAND_STARTED','OFFLINE_COMMAND_RETURNED'])

    def test_timeout_is_reported_and_propagated(self):
        stream=io.BytesIO()
        def runner(args,**kwargs): raise subprocess.TimeoutExpired(args,kwargs['timeout'])
        with self.assertRaises(subprocess.TimeoutExpired):
            run_checked_command(['node'],cwd='web',stream=stream,seconds=1800,stage='compiler',runner=runner)
        self.assertIn(b'OFFLINE_COMMAND_TIMEOUT',stream.getvalue())
        self.assertNotIn(b'OFFLINE_COMMAND_RETURNED',stream.getvalue())

    def test_nonzero_exit_is_reported_and_propagated(self):
        stream=io.BytesIO()
        def runner(args,**kwargs): raise subprocess.CalledProcessError(7,args)
        with self.assertRaises(subprocess.CalledProcessError):
            run_checked_command(['node'],cwd='web',stream=stream,seconds=1800,stage='runtime',runner=runner)
        self.assertIn(b'OFFLINE_COMMAND_FAILED',stream.getvalue())


if __name__=='__main__': unittest.main()
