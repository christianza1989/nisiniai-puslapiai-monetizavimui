import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from classifier import Store, run_lock
from status import read_status


class StatusTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.summary = {'signature': 'test', 'status': 'running', 'categorized': 0,
                        'total': 3, 'model': 'test', 'reasoning_effort': 'xhigh'}
        (self.root / 'run_summary.json').write_text(json.dumps(self.summary), encoding='utf-8')
        store = Store(self.root / 'analysis.sqlite3')
        store.save('test', [{'domain': 'padangos.lt'}, {'domain': 'removed.lt'}])
        store.close()
        (self.root / 'domenai_clean.txt').write_text('padangos.lt\nstatyba.lt\npervezimas.lt\n', encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def test_stale_running_summary_is_interrupted_and_count_comes_from_source_cache(self):
        summary_bytes = (self.root / 'run_summary.json').read_bytes()
        result = read_status(self.root)
        self.assertEqual(result['status'], 'interrupted')
        self.assertFalse(result['process_active'])
        self.assertEqual(result['categorized'], 1)
        self.assertEqual(result['pending'], 2)
        self.assertIsNotNone(result['last_saved_utc'])
        self.assertEqual((self.root / 'run_summary.json').read_bytes(), summary_bytes)

    def test_actual_held_os_lock_reports_running(self):
        with (self.root / '.run.lock').open('w+b') as lock:
            lock.write(b'0')
            lock.flush()
            lock.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = read_status(self.root)
            self.assertEqual(result['status'], 'running')
            self.assertTrue(result['process_active'])
        self.assertEqual(read_status(self.root)['status'], 'interrupted')

    def test_finished_summary_does_not_become_interrupted(self):
        self.summary['status'] = 'complete'
        self.summary['total'] = 1
        (self.root / 'run_summary.json').write_text(json.dumps(self.summary), encoding='utf-8')
        (self.root / 'domenai_clean.txt').write_text('padangos.lt\n', encoding='utf-8')
        self.assertEqual(read_status(self.root)['status'], 'complete')

    def test_strategy_phase_uses_pipeline_counters_and_shared_root_lock(self):
        self.summary['status'] = 'complete'
        self.summary['source'] = {'source_sha256': 'source'}
        (self.root / 'run_summary.json').write_text(json.dumps(self.summary), encoding='utf-8')
        pipeline = {'screening_signature':'test', 'source_sha256':'source',
                    'status':'running', 'phase':'strategy',
                    'strategy_categorized':2, 'strategy_total':5}
        (self.root / 'pipeline_status.json').write_text(json.dumps(pipeline), encoding='utf-8')
        with run_lock(self.root):
            result = read_status(self.root)
            self.assertEqual(result['phase'], 'strategy')
            self.assertEqual(result['status'], 'running')
            self.assertEqual(result['strategy_categorized'], 2)
            self.assertEqual(result['strategy_total'], 5)
        self.assertEqual(read_status(self.root)['status'], 'interrupted')
        # A different source must not inherit an old pipeline's phase or state.
        pipeline['source_sha256'] = 'old-source'
        (self.root / 'pipeline_status.json').write_text(json.dumps(pipeline), encoding='utf-8')
        result = read_status(self.root)
        self.assertEqual(result['status'], 'complete')
        self.assertIsNone(result['strategy_total'])


if __name__ == '__main__':
    unittest.main()
