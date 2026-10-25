"""One finite watcher around an immutable accepted offline worker.

Every invoked worker performs its existing complete SHA and quality gates.
Idle polls have no authority to produce, revalidate or accept a model.
"""
import argparse
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid
from offline_watch_policy import AuditSchedule,input_snapshot


def read(path):return json.loads(path.read_bytes())


def file_sha(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def check_pins(pins):
    for name,digest in pins.items():
        if file_sha(Path(name))!=digest:raise ValueError('PIN_CHANGED:'+name)


def save_status(path,value):
    temp=path.with_name(path.name+'.tmp-'+uuid.uuid4().hex)
    temp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temp.replace(path)


def main():
    p=argparse.ArgumentParser()
    for name in ['root','inventory','session','prepared','web','worker','pins','watch-status','stop-file','lock-file']:
        p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--node',required=True)
    p.add_argument('--watch-seconds',type=int,default=14400)
    p.add_argument('--audit-seconds',type=int,default=900)
    p.add_argument('--poll-seconds',type=int,default=20)
    a=p.parse_args()
    if not (1<=a.watch_seconds<=14400 and 20<=a.audit_seconds<=900 and 1<=a.poll_seconds<=20):
        raise ValueError('SCHEDULING_LIMITS')
    # Share the existing renewal lock so an old renewal helper cannot start a
    # second watcher while this outer is idle between finite invocations.
    import msvcrt
    a.lock_file.parent.mkdir(parents=True,exist_ok=True)
    lock=a.lock_file.open('a+b')
    if not lock.tell():lock.write(b'0');lock.flush()
    lock.seek(0)
    msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
    try:
        run(a)
    finally:
        lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1);lock.close()


def run(a,*,clock=time.monotonic,sleep=time.sleep,runner=subprocess.run):
    pins=read(a.pins)['pins']
    for critical in [a.worker,a.inventory,a.session,Path(__file__).resolve(),Path(__file__).with_name('offline_watch_policy.py').resolve()]:
        if str(critical) not in pins:raise ValueError('UNPINNED_WATCH_INPUT:'+str(critical))
    check_pins(pins)
    schedule=AuditSchedule(a.audit_seconds)
    deadline=clock()+a.watch_seconds
    counts={'finiteRuns':0,'idlePolls':0}
    a.watch_status.parent.mkdir(parents=True,exist_ok=True)
    def status(phase,**extra):
        value=dict(at=datetime.now(timezone.utc).isoformat(),phase=phase,**counts,
                   auditSeconds=a.audit_seconds,pollSeconds=a.poll_seconds,
                   nativeRequests=0,modelAcceptanceImplied=False,**extra)
        save_status(a.watch_status,value)
        print(json.dumps(value),flush=True)
    args=[sys.executable,'-B',str(a.worker),'--root',str(a.root),'--inventory',str(a.inventory),
          '--session',str(a.session),'--prepared',str(a.prepared),'--web',str(a.web),'--node',a.node]
    while clock()<deadline:
        if a.stop_file.exists() or (a.root.parent/'OWNERSTOP.json').exists():
            status('STOPPED_AT_FINITE_BOUNDARY');return
        if shutil.disk_usage(a.root).free<101000000000:raise ValueError('DISK_RESERVE')
        check_pins(pins)
        snapshot,retry,entries=input_snapshot(a.root,a.prepared,a.inventory,a.session)
        reason=schedule.reason(snapshot,retry,clock())
        if reason:
            status('RUNNING_UNCHANGED_FULL_VERIFIER',reason=reason,metadataEntries=entries)
            runner(args,check=True,cwd=a.web)
            # Exit zero is recorded only as an exit; the worker's real rows
            # retain all their independent PASS/REVIEW evidence and fingerprints.
            check_pins(pins)
            counts['finiteRuns']+=1
            schedule.completed(snapshot,clock())
            status('FINITE_VERIFIER_RETURNED',reason=reason,workerExitCode=0)
        else:
            counts['idlePolls']+=1
            status('WAITING_UNCHANGED_INPUTS',metadataEntries=entries,newProofs=0)
        sleep(min(a.poll_seconds,max(0,deadline-clock())))
    status('WATCH_DEADLINE_FINISHED_AFTER_LAST_FINITE')


if __name__=='__main__':main()
