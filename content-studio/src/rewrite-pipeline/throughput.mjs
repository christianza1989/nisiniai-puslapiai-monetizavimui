/** Counts completion only when native canonical, current official review and both
 * checkpoint rows agree. Revisions, briefs, retries and aliases never add pages. */
export function measurePipelineThroughput({site,checkpoints,model,workflow,baseline,now=Date.now()}){
  if(!baseline||!Number.isFinite(Date.parse(baseline.at))||Date.parse(baseline.at)>now||!Number.isInteger(baseline.completed)||baseline.completed<0)throw Error('Truthful baseline required');
  if(checkpoints.length!==2)throw Error('Both checkpoint views required');
  const maps=checkpoints.map(cp=>{
    const rows=Object.entries(cp.work).filter(([k])=>k.endsWith('WrittenDraft')).map(([,r])=>r);
    if(new Set(rows.map(r=>r.pageId)).size!==rows.length)throw Error('Duplicate checkpoint page ID');return new Map(rows.map(r=>[r.pageId,r]));
  });
  const complete=site.pages.filter(p=>{const h=model.revisionHash(p);return workflow.reviewCurrent(site,p,h)&&maps.every(m=>{const r=m.get(p.id);return r?.reviewed&&!r.layoutPending&&r.canonicalRevision===h&&(!r.currentNormalReviewBinding||r.currentNormalReviewBinding===p.editorialReview.binding);});});
  const elapsedSeconds=(now-Date.parse(baseline.at))/1000,delta=complete.length-baseline.completed;
  if(delta<0)throw Error('Completion regressed from saved baseline');
  const within=complete.filter(p=>{const t=Date.parse(p.editorialReview.checkedAt);return t>now-3600000&&t<=now;});
  return{at:new Date(now).toISOString(),completed:complete.length,newUniqueCompleted:delta,elapsedSeconds,textsPerHour:elapsedSeconds?delta*3600/elapsedSeconds:0,rolling60MinuteCompleted:within.length,target:50,targetMeasured:elapsedSeconds>=3600&&within.length>=50,includeAllElapsedWorkTime:true};
}
