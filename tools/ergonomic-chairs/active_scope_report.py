"""Read-only graph accounting plus a reversible scheduling projection.

Do not confuse a source job shared by active and hidden cards with a hidden-only
job. Known pending edges are counted from actual source states, not ETA caches.
"""
import argparse, collections, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def read(p):
    return json.loads(Path(p).read_text(encoding='utf-8-sig'))


def count_pending(folder):
    candidates = [p for p in [folder/'graph-checkpoint.json', folder/'graph-manifest.json'] if p.exists()]
    if not candidates:
        return None
    # A checkpoint may be newer than a previously closed manifest. Prefer the
    # freshest actual graph and pin it; do not silently merge two histories.
    path = max(candidates, key=lambda p:p.stat().st_mtime_ns)
    graph = read(path)
    measured = {(e['from'],e['field'],e['requested']) for e in graph.get('edges',[]) if e.get('measured') is True}
    states = {p.stem:read(p) for p in (folder/'states').glob('*.json')}
    roots={graph['baseline']} if graph.get('baseline') else set()
    roots.update(r['state'] for r in graph.get('references',[]) if r.get('state') and r.get('sourceMeasured') is True)
    reachable=set(roots)
    while True:
        next_states={e['to'] for e in graph.get('edges',[]) if e.get('measured') is True and e['from'] in reachable}
        if next_states <= reachable:break
        reachable |= next_states
    missing=reachable-set(states)
    if missing:raise ValueError('Graph references absent source states: '+str(path))
    orphan_count=len(set(states)-reachable)
    states={key:state for key,state in states.items() if key in reachable}
    pending = collections.Counter()
    required = 0
    for state_id,s in states.items():
        for field,values in s['choices'].items():
            prop = s['properties'].get(field,{})
            if not prop.get('visible') or not prop.get('editable'):
                continue
            for value in {v['value'] for v in values if v.get('selectable',True)}:
                if value == prop.get('value'):
                    continue
                required += 1
                if (state_id,field,value) not in measured:
                    cls=field.rsplit('.',1)[0].rsplit('_',1)[-1]
                    pending[cls]+=1
    return dict(graph=str(path), graphSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                states=len(states), unreachableStateFilesExcluded=orphan_count, measuredEdges=len(measured), observedRequiredEdges=required,
                pending=sum(pending.values()), pendingByClass=dict(pending), graphClaimsComplete=graph.get('complete',False))


def build(web,nonchair,chair):
    source=read(web/'content/admin-source-status.json')
    active={m['key'] for m in source['models'] if m['active']}
    models={m['key']:m for m in source['models']}
    seed=read(web/'content/seed.json')
    jobs=collections.defaultdict(list)
    for p in seed['products']:
        for c in p['configurations']:
            params=parse_qs(urlparse(c.get('configurator') or '').fragment,keep_blank_values=True)
            if c.get('code') and params.get('sid') and params.get('ban')==[c['code']]:
                jobs[(p['categorySlug']=='kedes',params['sid'][0]+'::'+c['code'])].append(p['id']+':'+c['id'])
    rows=[]
    for (is_chair,job),bindings in jobs.items():
        a=[k for k in bindings if k in active]
        h=[k for k in bindings if k not in active]
        graph=count_pending(nonchair/'native-source'/job.split('::')[1]) if not is_chair else None
        rows.append(dict(job=job,category='chairs' if is_chair else 'nonchairs',activeModels=a,hiddenModels=h,
                         scheduling='ACTIVE' if a else 'DEFER_HIDDEN_ONLY',observedGraph=graph))
    totals={}
    for category in ['chairs','nonchairs']:
        selected=[r for r in rows if r['category']==category]
        for label,subset in [('active',[r for r in selected if r['activeModels']]),('hiddenOnly',[r for r in selected if not r['activeModels']])]:
            graphs=[r['observedGraph'] for r in subset if r['observedGraph'] is not None]
            totals[category+'_'+label]=dict(sourceJobs=len(subset), observedJobs=len(graphs),
                observedPendingEdges=sum(g['pending'] for g in graphs) if graphs or not subset else None,
                unobservedJobs=len(subset)-len(graphs),
                pendingByClass=dict(sum((collections.Counter(g['pendingByClass']) for g in graphs),collections.Counter())))
    roadmap=read(nonchair/'ROADMAP-STATE.json')
    measurement=roadmap.get('fullCollection',{}).get('measuredNative',{})
    speed=measurement.get('newEdgesPerNativeHour')
    idle=measurement.get('nativeAbsentFraction')
    remaining=totals['nonchairs_active']['observedPendingEdges']
    scenarios=[]
    if speed and idle is not None:
        for growth in [1,2,5]:
            scenarios.append(dict(frontierGrowthAssumption=growth, observedEdgesTimesAssumption=remaining*growth,
                nativeHours=remaining*growth/speed, singleWorkerWallHours=remaining*growth/speed/(1-idle)))
    count=lambda seq:dict(total=len(seq),chairs=sum(m['categorySlug']=='kedes' for m in seq),nonchairs=sum(m['categorySlug']!='kedes' for m in seq))
    return dict(at=datetime.now(timezone.utc).isoformat(),sourceInventorySha256=hashlib.sha256((web/'content/admin-source-status.json').read_bytes()).hexdigest(),
        models=dict(before=count(source['models']),active=count([m for m in source['models'] if m['active']]),hidden=count([m for m in source['models'] if not m['active']])),
        sourceJobs=totals,chairVariantJobs=dict(before=chair['counts']['distinctInitialVariantJobs'],active=len(chair['queue']),hiddenOnly=len(chair['deferredHiddenQueue']),
            activeObservedInitialTransitions=chair['counts']['observedInitialTransitions'],hiddenObservedInitialTransitions=chair['counts']['hiddenOnlyObservedInitialTransitions'],
            missingInitialSources=chair['counts']['missingOriginalVariant'],xiliumUnchanged=len(chair['excludedXilium']),activeXiliumUnchanged=sum(m['active'] for m in chair['excludedXilium'])),
        eta=dict(scope='OBSERVED_ACTIVE_NONCHAIR_FRONTIER_ONLY',speed=measurement,scenarios=scenarios,
            caveats=['Unstarted jobs have unknown frontier; no whole-catalogue completion date is measured.',
                     'Chair initial one-hop transitions are not full remaining graphs or a measured chair speed.',
                     'Two-worker speedup is unmeasured. Do not divide ETA by two.',
                     'Shared article graphs remain necessary for an active model even when some historical initial bindings are deferred.']),
        orderedActiveSourceJobs=[r['job'] for r in rows if r['activeModels']],deferredHiddenOnlySourceJobs=[r['job'] for r in rows if not r['activeModels']],jobs=rows,
        activeModelKeys=[m['key'] for m in source['models'] if m['active']],hiddenModelKeys=[m['key'] for m in source['models'] if not m['active']],
        sourceDataDeleted=False,approvalOrReleaseChanged=False)


if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--web',type=Path,required=True);ap.add_argument('--nonchair',type=Path,required=True);ap.add_argument('--chairs',type=Path,required=True);ap.add_argument('--output',type=Path,required=True)
    args=ap.parse_args();result=build(args.web,args.nonchair,read(args.chairs));args.output.parent.mkdir(parents=True,exist_ok=True)
    tmp=args.output.with_suffix('.tmp');tmp.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf8');tmp.replace(args.output)
    print(json.dumps({k:result[k] for k in ['at','models','sourceJobs','chairVariantJobs','eta']},ensure_ascii=True))
