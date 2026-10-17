"""Save a human-readable checkpoint without promoting partial model results."""
from pathlib import Path
from capture_structure import read,save,now

ROOT=Path('D:/Core/output/ergonomic-chairs-structure-20261017')


def main():
    state=read(ROOT/'STATE.json');queue=read(Path(state['activeRun'])/'SOURCE-QUEUE.json')
    offline=read(ROOT/'prepared/OFFLINE-STATUS.json');inventory=read(ROOT/'INVENTORY.json')
    rows={r['job']:r for r in offline.get('rows',[])}
    closed=set(queue['completedSource']);tail={r['job']:r for r in queue['tail']}
    state.update(updatedAt=now(),sourceClosedThisTask=len(closed),offlineGeometryRuntimePassThisTask=sum(r['result']=='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY' for r in rows.values()),
        frozenBuild=str(ROOT/'runtime-v3/BUILD.json'),offlineRuntime=str(ROOT/'offline-v2/prepare_closed.py'),measuredNative=queue.get('measuredNative'),
        remainingSourceJobs=259-len(closed),nextSteps=['Continue active chair construction sources and separate offline queue','Resolve Gemini/browser availability before full text/UI acceptance','Activate only fully accepted draft candidates; no owner approvals or launch release'])
    state['policy']['maxOwnedNative']=1
    state['policy']['touchNonchairFilesOrProcesses']=False
    state['policyTests']={'passed':27,'nativeProof':'First variable KATM006WW001 2states/2edges independent full offline PASS; fixed and other models have their own evidence','command':'python -B -m unittest discover -s tools/ergonomic-chairs -p test_*.py'}
    save(ROOT/'STATE.json',state)
    text=['# Aktyvių kėdžių modelių patikros','',f'Atnaujinta {now()}. 259 ruošiami variantai, 11 aktyvių Xilium nepakeisti, 2 be šaltinio PABAIGAI.json.','',
        'Uždaras šaltinio grafas ir offline PASS dar nėra pilnas modelio priėmimas. Gemini tekstai, faktų ir tikra desktop/mobile peržiūra tikrinami atskirai.','']
    for job in inventory['queue']:
        key=job['job'];o=rows.get(key);stage='šaltinis dar renkamas'
        if key in closed:stage='šaltinio grafas uždaras'
        if o:stage+='; '+o['result']
        if key in tail:stage+='; Pabaigai: '+str(tail[key]['result']['stopReason'])
        text.append(f"- [ ] {job['code']} · {job['modelKeys'][0]} — {stage}; Gemini ir galutinė peržiūra nepriimti.")
    (ROOT/'MODELIAI-CHECKLIST.md').write_text('\n'.join(text)+'\n',encoding='utf8')
    print({'sourceClosed':len(closed),'geometryRuntimePass':state['offlineGeometryRuntimePassThisTask'],'acceptedModels':state['acceptedThisTask']})


if __name__=='__main__':main()
