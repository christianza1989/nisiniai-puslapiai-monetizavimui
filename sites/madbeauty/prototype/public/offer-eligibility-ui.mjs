// Presentation only; the server rechecks eligibility on submission and booking.
export const qualificationDisplayState=(q,now)=>q.state==='approved'&&!(Date.parse(q.expiresAt)>Date.parse(now))?'expired':q.state;
export function offerEligibilityNotice(nodes,qualifications,offer,now){
 const node=nodes.find(n=>n.id===offer.taxonomyServiceId&&n.enabled&&!n.archived);
 if(!node)return 'Ši procedūra kataloge neaktyvi. Pasirink aktyvią procedūrą arba kreipkis į platformos komandą.';
 if(!node.reviewRequired)return '';
 const own=(qualifications||[]).filter(q=>q.organizationId===offer.organizationId&&q.locationId===offer.locationId&&q.taxonomyNodeId===node.id&&q.state==='approved');
 if(own.some(q=>Date.parse(q.expiresAt)>Date.parse(now)))return '';
 return (own.some(q=>Date.parse(q.expiresAt)<=Date.parse(now))?'Tinkamumo patikros galiojimas baigėsi.':'Šiai procedūrai reikia tinkamumo patikros.')+' Registracija neprieinama, kol patikra neatnaujinta.';
}
export function offerProcedureLabel(nodes,offer,retainedNodes=[]){
 const node=nodes.find(n=>n.id===offer.taxonomyServiceId)||retainedNodes.find(n=>n.id===offer.taxonomyServiceId);
 return node?.path?.join(' → ')||node?.label||'Ankstesnė procedūra';
}
export function offerProcedureOptions(nodes,offer,retainedNodes=[]){
 const options=nodes.filter(n=>n.kind==='treatment'&&n.enabled&&!n.archived).map(n=>[n.id,n.path.join(' → ')]);
 if(!options.some(([id])=>id===offer.taxonomyServiceId))options.unshift([offer.taxonomyServiceId,offerProcedureLabel(nodes,offer,retainedNodes)+' · neaktyvi kataloge']);
 return options;
}
