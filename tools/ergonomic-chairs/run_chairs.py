"""Single owned chair lane, finite children and real matching global release."""
import argparse, hashlib, json, os, shutil, subprocess, sys, time, uuid
from pathlib import Path
from capture_structure import read,save,now,sha
from queue_policy import continuation_visits,record_visit,remaining_order

HERE=Path(__file__).resolve().parent
GLOBAL=Path('D:/Core/output/ergonomic-configurators-20261015/native-slot-coordination')


class Slot:
    def __enter__(self):
        import msvcrt
        GLOBAL.mkdir(parents=True,exist_ok=True);self.file=(GLOBAL/'GLOBAL-OWNERSHIP.lock').open('a+b')
        self.file.seek(0,2)
        if not self.file.tell():self.file.write(b'0');self.file.flush()
        self.file.seek(0)
        try:msvcrt.locking(self.file.fileno(),msvcrt.LK_NBLCK,1)
        except OSError:self.file.close();raise ValueError('ANOTHER_NATIVE_OWNER_HOLDS_SLOT')
        return self
    def __exit__(self,*args):
        import msvcrt
        self.file.seek(0);msvcrt.locking(self.file.fileno(),msvcrt.LK_UNLCK,1);self.file.close()


def processes():
    command="Get-CimInstance Win32_Process | Where-Object {$_.Name -in @('python.exe','pythonw.exe')} | Select-Object ProcessId,ParentProcessId,@{n='created';e={$_.CreationDate.ToUniversalTime().ToString('o')}},CommandLine | ConvertTo-Json -Compress"
    result=subprocess.run(['powershell.exe','-NoProfile','-Command',command],capture_output=True,check=True,text=True)
    value=json.loads(result.stdout or '[]');return value if isinstance(value,list) else [value]


def native_workers(rows):
    return [r for r in rows if any(name in (r.get('CommandLine') or '') for name in ['native_transport_bridge.py','collect_catalog_configurators.py','collect_expanded_pilot.py','capture_structure.py'])]


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,required=True);ap.add_argument('--inventory',type=Path,required=True);ap.add_argument('--session',type=Path,required=True);ap.add_argument('--max-jobs',type=int,default=3);args=ap.parse_args()
    assert 1<=args.max_jobs<=2590
    root=args.root.resolve();root.mkdir(parents=True,exist_ok=True)
    build=read(HERE/'BUILD.json')
    for pin in build['files']:
        if sha(Path(pin['path']).read_bytes())!=pin['sha256']:raise ValueError('FROZEN_CAPTURE_BUILD_CHANGED')
    inv=read(args.inventory);jobs=inv['queue'];assert all(j['modelKeys'] for j in jobs)
    state_path=root/'SOURCE-QUEUE.json';state=read(state_path) if state_path.exists() else {'policy':'chairs-original-default-finish-v1','completedSource':[],'tail':[],'chunks':{},'taskComplete':False}
    count=0;queue=remaining_order(jobs,state);continuation_visits(state);hold=False
    metrics=state.setdefault('measuredNative',{'occupancySeconds':0,'idleSeconds':0,'newEdges':0,'newStates':0,'chunks':0})
    previous=time.monotonic()
    while queue:
        job=queue.pop(0)
        if count>=args.max_jobs:break
        if job['job'] in state['completedSource'] or any(r['job']==job['job'] for r in state['tail']):continue
        if (root/'PAUSE.json').exists():break
        if shutil.disk_usage(root).free<101000000000:raise ValueError('DISK_RESERVE')
        with Slot():
            ownership=GLOBAL/'GLOBAL-OWNERSHIP.json'
            old=read(ownership) if ownership.exists() else None
            if old and old['status']=='RESERVED':raise ValueError('PRIOR_NATIVE_RESERVATION_REQUIRES_RECONCILIATION')
            if native_workers(processes()):raise ValueError('ANOTHER_REAL_NATIVE_WORKER_PRESENT')
            lease=uuid.uuid4().hex;folder=root/'leases'/lease;folder.mkdir(parents=True)
            ready,grant=folder/'READY.json',folder/'GRANT.private.json'
            source=root/'source'/job['job'];source.mkdir(parents=True,exist_ok=True)
            stream=(folder/'worker.log').open('xb')
            env={**os.environ,'PYTHONUTF8':'1','PYTHONDONTWRITEBYTECODE':'1'}
            child=subprocess.Popen([sys.executable,'-B',str(HERE/'capture_structure.py'),'--inventory',str(args.inventory),'--job',job['job'],
                '--root',str(source),'--grant',str(grant),'--ready',str(ready)],cwd=HERE,env=env,stdout=stream,stderr=subprocess.STDOUT)
            granted=False;value=None
            try:
                end=time.monotonic()+45
                while not ready.exists() and child.poll() is None:
                    if time.monotonic()>end:raise ValueError('WORKER_NO_READY')
                    time.sleep(.2)
                if not ready.exists():raise ValueError('WORKER_RETURNED_WITHOUT_READY')
                identity=read(ready);rows=processes();actual=next(r for r in rows if r['ProcessId']==identity['pid'])
                unexpected=[r for r in native_workers(rows) if r['ProcessId']!=identity['pid'] and r['ProcessId']!=child.pid]
                if unexpected:raise ValueError('UNEXPECTED_REAL_NATIVE_WORKER_BEFORE_GRANT')
                worker={'pid':actual['ProcessId'],'created':actual['created'],'commandLineSha256':sha(actual['CommandLine'].encode())}
                if old:save(folder/'PRIOR-GLOBAL-OWNERSHIP.json',old)
                value={'version':'chair-structure-single-lane-v1','status':'RESERVED','leaseId':lease,'allowedJobs':[job['series']+'::'+job['code']],
                       'worker':worker,'coordinatorPid':os.getpid(),'maxGlobalConcurrentJobs':2,'maxConcurrentThisWork':1,'createsSessions':False,'at':now()}
                save(ownership,value)
                save(grant,{'job':job['job'],'workerPid':worker['pid'],'leaseId':lease,'sessionPath':str(args.session),'sessionSha256':sha(args.session.read_bytes()),
                     'globalOwnershipPath':str(ownership),'inventorySha256':sha(args.inventory.read_bytes()),'pausePath':str(root/'PAUSE.json'),
                     'createsSessions':False,'maxSeconds':900,'maxNewStates':120,'maxNewEdges':800})
                granted=True;occupied=time.monotonic();metrics['idleSeconds']+=occupied-previous
                state.update(at=now(),phase='CAPTURING',job=job['job'],code=job['code'],leaseId=lease,worker=worker)
                save(state_path,state)
                child.wait(timeout=1100)
                if any(r['ProcessId']==worker['pid'] and r['created']==worker['created'] for r in processes()):raise ValueError('WORKER_NOT_REALLY_GONE')
                if child.returncode!=0:raise ValueError('CHILD_ERROR_REQUIRES_REVIEW')
                result=read(source/'RESULT.json');assert result['job']==job['job']
                ended=time.monotonic();metrics['occupancySeconds']+=ended-occupied;previous=ended
                metrics['newEdges']+=result['newEdges'];metrics['newStates']+=result['newStates'];metrics['chunks']+=1
                metrics['newEdgesPerNativeHour']=metrics['newEdges']*3600/metrics['occupancySeconds']
                metrics['idleFraction']=metrics['idleSeconds']/(metrics['idleSeconds']+metrics['occupancySeconds'])
                metrics['definition']='Matching grant to actual worker return and identity disappearance; idle between these measured chunks. Historical v2 batches excluded.'
                state['chunks'][job['job']]=state['chunks'].get(job['job'],0)+1
                outcome=record_visit(state,job['job'],result)
                if outcome=='SOURCE_CLOSED':
                    state['completedSource'].append(job['job']);state['phase']='SOURCE_CLOSED_PENDING_FULL_QUALITY_AND_GEMINI'
                    state['deferredQueue']=[k for k in state.get('deferredQueue',[]) if k!=job['job']]
                elif outcome=='CONTINUE_CURRENT':
                    queue.insert(0,job);state['phase']='CONTINUE_CURRENT_FROM_REAL_CHECKPOINT'
                elif outcome=='DEFER_GROWING':
                    deferred=state.setdefault('deferredQueue',[])
                    if job['job'] not in deferred:deferred.append(job['job'])
                    state['phase']='TEN_CHUNKS_GROWING_DEFERRED_NEXT_CHAIR'
                elif outcome in {'GLOBAL_HOLD','TRANSPORT_REVIEW'}:
                    state['phase']=outcome;hold=True
                else:
                    state['tail'].append({'job':job['job'],'result':result,'modelPrepared':False});state['phase']='PROBLEM_PRESERVED_NEXT_CHAIR'
                state.update(at=now(),lastResult=result);save(state_path,state);count+=1
                if hold:break
            finally:
                stream.close()
                if granted and child.poll() is not None:
                    current=read(ownership)
                    if current.get('leaseId')==lease:
                        current.update(status='RELEASED',exitCode=child.returncode,modelAcceptanceImplied=False,releasedAt=now());save(ownership,current)
                # Unknown or live children retain ownership. Never kill them or
                # label an uncertain request as released/successful.
    state.update(at=now(),taskComplete=False);save(state_path,state)
    print(json.dumps({'phase':state.get('phase'),'sourceClosed':len(state['completedSource']),'tail':len(state['tail']),'modelPrepared':0}))


if __name__=='__main__':main()
