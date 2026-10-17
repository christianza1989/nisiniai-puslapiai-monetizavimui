"""Small current health report; no GLB reads, grants, or process restarts."""
import argparse,json,shutil
from pathlib import Path
from capture_structure import read,save,now
from run_chairs import processes,native_workers


def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path('D:/Core/output/ergonomic-chairs-structure-20261017'));a=p.parse_args()
    state=read(a.root/'STATE.json');source=Path(state['activeRun']);queue=read(source/'SOURCE-QUEUE.json')
    offline=read(a.root/'prepared/OFFLINE-STATUS.json') if (a.root/'prepared/OFFLINE-STATUS.json').exists() else {}
    allrows=processes();workers=native_workers(allrows)
    selected=[{k:r[k] for k in ['ProcessId','ParentProcessId','created','CommandLine']} for r in allrows if any(n in (r.get('CommandLine') or '') for n in ['run_chairs.py','capture_structure.py','prepare_closed.py'])]
    closed=len(queue['completedSource']);known_pending=0;observed=0
    for f in (source/'source').glob('*/RESULT.json'):
        r=read(f);observed+=1;known_pending+=len(r['graph']['missingEdges'])
    total=state['scope']['activeVariantJobs']
    result={'at':now(),'scope':{'activeChairs':272,'unchangedXilium':11,'missingInitialSource':2,'sourceJobs':total},
        'sourceClosed':closed,'remainingSourceJobs':total-closed,'observedJobs':observed,'observedPendingEdges':known_pending,'unknownGraphs':total-observed,
        'sourcePhase':queue['phase'],'sourceTail':len(queue['tail']),'deferredGrowing':len(queue.get('deferredQueue',[])),
        'geometryRuntimePass':sum(r['result']=='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY' for r in offline.get('rows',[])),
        'offlinePhase':offline.get('phase'),'offlineErrors':[{'job':r['job'],'error':r.get('error')} for r in offline.get('rows',[]) if r['result']=='REVIEW_REQUIRED'],
        'acceptedModels':state['acceptedThisTask'],'draftPublished':state['draftPublishedThisTask'],'launchPublished':state['launchPublishedThisTask'],
        'processes':selected,'actualNativeLeafCount':sum(not any(c['ParentProcessId']==r['ProcessId'] for c in workers) for r in workers),'measuredNative':queue.get('measuredNative'),
        'freeGB':round(shutil.disk_usage(a.root).free/1e9,2),'belowReserve':shutil.disk_usage(a.root).free<101000000000,
        'blockers':state.get('textAndBrowserBlocked'),'wholeTaskComplete':False}
    save(a.root/'HEALTH.json',result)
    print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':main()
