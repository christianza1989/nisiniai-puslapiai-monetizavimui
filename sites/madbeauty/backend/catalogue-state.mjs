import {TAXONOMY_NODES,TAXONOMY_VERSION,taxonomyNode} from '../prototype/taxonomy.mjs';
export function catalogueTaxonomy(d){
 const changes=d.taxonomyChanges||[],custom=changes.filter(c=>c.operation==='add').map(c=>c.node);
 const nodes=[...TAXONOMY_NODES,...custom].map(n=>({...n,...changes.filter(c=>c.nodeId===n.id).reduce((a,c)=>({...a,...c.values}),{})}));
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const path=n=>n.parentId?[...path(byId.get(n.parentId)),n.label]:[n.label];
 const archived=n=>!!n.archived||!!n.parentId&&archived(byId.get(n.parentId));
 return nodes.map(n=>({...n,path:path(n),archived:archived(n)})).sort((a,b)=>(a.rank||0)-(b.rank||0));
}
export function taxonomyProjection(d){return {version:d.taxonomyVersion||TAXONOMY_VERSION,nodes:catalogueTaxonomy(d).filter(n=>!n.archived).map(n=>({...n,enabled:n.scope==='core'}))};}
export function serviceEligible(d,s,now){
 const n=taxonomyNode(s.taxonomyServiceId,catalogueTaxonomy(d));
 return !!n&&n.scope==='core'&&!n.archived&&(!s.staffOptions||!n.reviewRequired||(d.qualifications||[]).some(q=>q.organizationId===s.organizationId&&q.locationId===s.locationId&&q.taxonomyNodeId===n.id&&q.state==='approved'&&Date.parse(q.expiresAt)>now));
}
