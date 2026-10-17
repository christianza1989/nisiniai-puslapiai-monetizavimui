"""Finite offline queue for closed chair sources. Never grants Native or publishes.

Each result is tied to the exact checkpoint, verifier and compiler bytes. Failed
checks retain their evidence and are left for review; no PASS is inferred from
a child exiting or from graph closure alone.
"""
import argparse, hashlib, json, os, subprocess, sys, time, shutil
from pathlib import Path
from capture_structure import read, save, now, sha
from verify_structure_wire import verify


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--inventory',type=Path,required=True)
    p.add_argument('--session',type=Path,required=True)
    p.add_argument('--prepared',type=Path,required=True)
    p.add_argument('--web',type=Path,required=True)
    p.add_argument('--node',required=True)
    p.add_argument('--watch-seconds',type=int,default=0)
    a=p.parse_args()
    if a.watch_seconds:
        # A finite watcher, with one offline worker at a time. The child keeps
        # exact per-model evidence and reuses only content-sealed prior PASS.
        deadline=time.monotonic()+a.watch_seconds
        arguments=sys.argv[1:];index=arguments.index('--watch-seconds');del arguments[index:index+2]
        while time.monotonic()<deadline:
            if shutil.disk_usage(a.root).free<101000000000:raise ValueError('DISK_RESERVE')
            subprocess.run([sys.executable,'-B',str(Path(__file__).resolve()),*arguments],check=True,cwd=a.web)
            time.sleep(min(20,max(0,deadline-time.monotonic())))
        return
    jobs={j['job']:j for j in read(a.inventory)['queue']}
    queue=read(a.root/'SOURCE-QUEUE.json')
    a.prepared.mkdir(parents=True,exist_ok=True)
    status={'at':now(),'phase':'OFFLINE_CHECKING','rows':[], 'modelAcceptanceImplied':False,'nativeRequests':0}
    statusfile=a.prepared/'OFFLINE-STATUS.json'
    prior=read(statusfile) if statusfile.exists() else None
    priorrows={r['job']:r for r in prior.get('rows',[])} if prior else {}
    compiler=a.web/'scripts/prepare-chair-structure.mjs'
    runtime=a.web/'scripts/check-chair-structure-runtime.ts'
    sourcepins={str(f):sha(f.read_bytes()) for f in [Path(__file__),Path(__file__).with_name('verify_structure_wire.py'),compiler,runtime]}
    if prior and [r['job'] for r in prior.get('rows',[])]==queue['completedSource'] and all(r.get('tools')==sourcepins and r.get('result')=='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY' and r.get('artifacts') for r in prior.get('rows',[])):
        if all(r['checkpointSha256']==sha((a.root/'source'/r['job']/'CHECKPOINT.json').read_bytes()) and all((a.prepared/r['job']/f).is_file() and sha((a.prepared/r['job']/f).read_bytes())==digest for f,digest in r['artifacts'].items()) for r in prior['rows']):
            print(json.dumps({'phase':'UNCHANGED_SEALED_OFFLINE_PROOFS','rows':len(prior['rows']),'nativeRequests':0}));return
    if prior:save(a.prepared/('OFFLINE-HISTORY-'+now().replace(':','').replace('+','')+'.json'),prior)
    for key in queue['completedSource']:
        if shutil.disk_usage(a.root).free<101000000000:raise ValueError('DISK_RESERVE')
        source=a.root/'source'/key
        output=a.prepared/key
        output.mkdir(parents=True,exist_ok=True)
        row={'job':key,'code':jobs[key]['code'],'at':now(),'result':'RUNNING','checkpointSha256':sha((source/'CHECKPOINT.json').read_bytes()),'tools':sourcepins,'modelPrepared':False}
        old=priorrows.get(key)
        if old and old['result']=='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY' and old['checkpointSha256']==row['checkpointSha256'] and old.get('tools')==sourcepins and old.get('artifacts'):
            if all((output/f).is_file() and sha((output/f).read_bytes())==digest for f,digest in old['artifacts'].items()):
                status['rows'].append(old);continue
        status['rows'].append(row);save(statusfile,status)
        try:
            proof=verify(source,jobs[key],a.session)
            save(source/'WIRE-PROOF.json',proof)
            log=output/('OFFLINE-'+now().replace(':','').replace('+','')+'.log')
            with log.open('xb') as stream:
                subprocess.run([a.node,str(compiler),'--source='+str(source),'--output='+str(output),'--inventory='+str(a.inventory)],cwd=a.web,stdout=stream,stderr=subprocess.STDOUT,check=True,timeout=1800)
                subprocess.run([a.node,'--import','tsx',str(runtime),'--source='+str(source),'--prepared='+str(output)],cwd=a.web,stdout=stream,stderr=subprocess.STDOUT,check=True,timeout=1800)
            for file in ['GEOMETRY-PBR-PROOF.json','RUNTIME-PROOF.json']:
                if read(output/file)['result']!='PASS':raise ValueError('INDEPENDENT_PROOF_NOT_PASS:'+file)
            if row['checkpointSha256']!=sha((source/'CHECKPOINT.json').read_bytes()):raise ValueError('CLOSED_CHECKPOINT_CHANGED_DURING_OFFLINE')
            row.update(result='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY',wire=proof,runtimeSha256=sha((output/'runtime.json').read_bytes()),textAccepted=False,browserAccepted=False)
            row['artifacts']={str(f.relative_to(output)):sha(f.read_bytes()) for f in [output/'runtime.json',output/'GEOMETRY-PBR-PROOF.json',output/'RUNTIME-PROOF.json',*sorted((output/'assets').glob('*.glb'))]}
        except Exception as error:
            row.update(result='REVIEW_REQUIRED',errorClass=type(error).__name__,error=str(error))
        row['finishedAt']=now();status['at']=now();save(statusfile,status)
    status.update(at=now(),phase='FINITE_OFFLINE_QUEUE_RETURNED',sourceGeometryRuntimePass=sum(r['result']=='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY' for r in status['rows']),reviewRequired=sum(r['result']=='REVIEW_REQUIRED' for r in status['rows']))
    save(statusfile,status)
    print(json.dumps({k:status[k] for k in ['phase','sourceGeometryRuntimePass','reviewRequired','modelAcceptanceImplied','nativeRequests']}))


if __name__=='__main__':main()
