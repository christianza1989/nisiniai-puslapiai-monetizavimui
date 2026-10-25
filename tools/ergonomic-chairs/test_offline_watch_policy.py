import json
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from offline_watch_policy import AuditSchedule,input_snapshot
import watch_closed


class ScheduleTests(unittest.TestCase):
    def test_stable_poll_does_not_rehash_but_deadline_does(self):
        s=AuditSchedule(900)
        self.assertEqual(s.reason('same',False,0),'INITIAL_FULL_AUDIT')
        s.completed('same',10)
        self.assertIsNone(s.reason('same',False,909))
        self.assertEqual(s.reason('same',False,910),'PERIODIC_FULL_SHA_AUDIT')

    def test_new_or_mutated_inputs_wake_without_waiting_for_audit(self):
        s=AuditSchedule();s.completed('before',10)
        self.assertEqual(s.reason('after',False,11),'INPUT_METADATA_CHANGED')
        self.assertEqual(s.reason('before',True,11),'UNVERIFIED_OR_REVIEW_PENDING')

    def test_mutation_during_child_requires_confirmation(self):
        s=AuditSchedule();s.completed('before_child',10)
        self.assertEqual(s.reason('after_child',False,11),'INPUT_METADATA_CHANGED')

    def test_metadata_preserving_mutation_still_gets_full_periodic_audit(self):
        s=AuditSchedule(20);s.completed('identical_metadata',0)
        self.assertEqual(s.reason('identical_metadata',False,20),'PERIODIC_FULL_SHA_AUDIT')


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.base=Path(self.tmp.name)
        self.root=self.base/'capture';self.prepared=self.base/'prepared'
        (self.root/'source/job').mkdir(parents=True);(self.prepared/'job/assets').mkdir(parents=True)
        self.inv=self.base/'inventory';self.inv.write_text('{}')
        self.session=self.base/'session';self.session.write_bytes(b'original-session')
        (self.root/'SOURCE-QUEUE.json').write_text(json.dumps({'completedSource':['job'],'at':'busy-native-1'}))
        (self.root/'source/job/CHECKPOINT.json').write_text('{}')
        self.asset=self.prepared/'job/assets/a.glb';self.asset.write_bytes(b'original')
        self.status=self.prepared/'OFFLINE-STATUS.json'
        self.status.write_text(json.dumps({'rows':[{'job':'job','result':'PASS_SOURCE_GEOMETRY_RUNTIME_ONLY','artifacts':{'assets/a.glb':'full-hash'}}]}))

    def tearDown(self):self.tmp.cleanup()
    def snap(self):return input_snapshot(self.root,self.prepared,self.inv,self.session)

    def test_native_queue_timestamp_does_not_wake_unchanged_closed_sources(self):
        before=self.snap();(self.root/'SOURCE-QUEUE.json').write_text(json.dumps({'completedSource':['job'],'at':'busy-native-2'}))
        self.assertEqual(before,self.snap())

    def test_changed_or_missing_artifact_wakes_and_requires_real_verifier(self):
        before=self.snap();self.asset.write_bytes(b'new-content')
        self.assertNotEqual(before[0],self.snap()[0]);self.assertFalse(self.snap()[1])
        self.asset.unlink();self.assertTrue(self.snap()[1])

    def test_new_closed_source_is_not_accepted_from_old_rows(self):
        (self.root/'SOURCE-QUEUE.json').write_text(json.dumps({'completedSource':['job','new']}))
        self.assertTrue(self.snap()[1])

    def test_untrusted_artifact_cannot_escape_prepared_root(self):
        self.status.write_text(json.dumps({'rows':[{'job':'job','result':'PASS_SOURCE_GEOMETRY_RUNTIME_ONLY','artifacts':{'../outside':'hash'}}]}))
        with self.assertRaisesRegex(ValueError,'UNSAFE_ARTIFACT_PATH'):self.snap()


class WatcherBoundaryTests(SnapshotTests):
    def setUp(self):
        super().setUp()
        self.worker=self.base/'accepted-prepare.py';self.worker.write_text('immutable finite worker')
        paths=[self.worker,self.inv,self.session,Path(watch_closed.__file__).resolve(),Path(watch_closed.__file__).with_name('offline_watch_policy.py').resolve()]
        self.pins=self.base/'pins.json';self.pins.write_text(json.dumps({'pins':{str(p):watch_closed.file_sha(p) for p in paths}}))
        self.a=SimpleNamespace(pins=self.pins,worker=self.worker,inventory=self.inv,session=self.session,
            root=self.root,prepared=self.prepared,web=self.base,node='node',watch_status=self.base/'watch.json',
            stop_file=self.base/'STOP.json',audit_seconds=20,poll_seconds=5,watch_seconds=36)
        self.at=0;self.calls=[]

    def sleep(self,seconds):self.at+=seconds
    def runner(self,args,**kwargs):self.calls.append((args,kwargs))
    def run_watch(self,runner=None):
        with patch.object(watch_closed.shutil,'disk_usage',return_value=SimpleNamespace(free=101000000000)),patch('builtins.print'):
            watch_closed.run(self.a,clock=lambda:self.at,sleep=self.sleep,runner=runner or self.runner)

    def test_real_invocation_keeps_original_worker_and_full_argument_chain(self):
        self.run_watch()
        self.assertEqual(len(self.calls),2)
        args,kwargs=self.calls[0]
        self.assertEqual(args[2],str(self.worker));self.assertTrue(kwargs['check'])
        self.assertEqual(args[args.index('--session')+1],str(self.session))
        self.assertNotIn('--watch-seconds',args)
        result=json.loads(self.a.watch_status.read_text())
        self.assertGreater(result['idlePolls'],0);self.assertFalse(result['modelAcceptanceImplied'])

    def test_failed_child_is_not_counted_as_verified(self):
        def fail(*args,**kwargs):raise RuntimeError('actual child failed')
        with self.assertRaisesRegex(RuntimeError,'actual child failed'):self.run_watch(fail)
        self.assertEqual(json.loads(self.a.watch_status.read_text())['finiteRuns'],0)

    def test_owner_stop_starts_no_child(self):
        (self.root.parent/'OWNERSTOP.json').write_text('{}');self.run_watch()
        self.assertFalse(self.calls)
        self.assertEqual(json.loads(self.a.watch_status.read_text())['phase'],'STOPPED_AT_FINITE_BOUNDARY')

    def test_pin_mutation_after_child_fails_before_any_idle_reuse(self):
        def change(*args,**kwargs):self.worker.write_text('changed worker')
        with self.assertRaisesRegex(ValueError,'PIN_CHANGED'):self.run_watch(change)


if __name__=='__main__':unittest.main()
