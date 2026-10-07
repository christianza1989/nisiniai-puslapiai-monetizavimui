import {offerCsv} from '../prototype/public/offer-csv.mjs';
import {bookingUses} from './occupancy.mjs';
import {normalizePhases} from './phases.mjs';
import {staffAtLocation,resourceAtLocation,locationSchedule,publicLocation} from './locations-state.mjs';
import {TAXONOMY_NODES,TAXONOMY_VERSION,taxonomyNode} from '../prototype/taxonomy.mjs';
import {randomId,reject} from './primitives.mjs';
import {find} from './availability.mjs';
const copy=x=>structuredClone(x);
const txt=(v,max=100)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)reject('INVALID_INPUT','Patikrinkite pasiūlymo tekstą.');return v.trim();};
const int=(v,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)reject('INVALID_INPUT','Patikrinkite kainą ir trukmę.');return v;};
export function offerState(d){for(const k of ['offers','procedureRequests','taxonomyChanges','qualifications','menuGroups'])d[k]||=[];d.selectionVersions||={};}
export {catalogueTaxonomy,taxonomyProjection,serviceEligible} from './catalogue-state.mjs';
import {catalogueTaxonomy,taxonomyProjection,serviceEligible} from './catalogue-state.mjs';
export function createOfferApi({store,mutate,ownOrg,scope,event,clock}){
 const owned=(d,user,id)=>{const o=find(d,'offers',id);ownOrg(d,user,o.organizationId);return o;};
 const version=(o,v)=>{if(o.version!==v)reject('VERSION_CONFLICT','Pasiūlymas pasikeitė. Atnaujinkite puslapį.',409);};
 const node=(d,id)=>{const n=catalogueTaxonomy(d).find(n=>n.id===id);if(!n||n.archived||n.scope!=='core'||n.kind!=='treatment')reject('INVALID_INPUT','Pasirinkite aktyvią procedūrą.');return n;};
 const eligible=(d,o,n)=>!n.reviewRequired||d.qualifications.some(q=>q.organizationId===o.organizationId&&q.locationId===o.locationId&&q.taxonomyNodeId===n.id&&q.state==='approved'&&Date.parse(q.expiresAt)>store.clock());
 const variant=(d,o,v,complete=false)=>{
  const id=v.id?txt(v.id):randomId('variant'),label=txt(v.label),priceMinor=v.priceMinor==null?null:int(v.priceMinor,0,100000),durationMin=v.durationMin==null?null:int(v.durationMin,15,480);
  const target=d.services.find(s=>s.id===id);if(target&&target.offerId!==o.id&&o.legacyServiceId!==target.id)reject('FORBIDDEN','Varianto ID priklauso kitam pasiūlymui.',403);
  if(!Array.isArray(v.staffOptions)||v.staffOptions.length>32)reject('INVALID_INPUT','Pasirinkite tinkamus darbuotojus.');
  const phases=normalizePhases(v.phases,durationMin);
  const staffOptions=v.staffOptions.map(x=>{const p=find(d,'practitioners',x.practitionerId),r=find(d,'resources',x.resourceId);if(p.organizationId!==o.organizationId||r.organizationId!==o.organizationId||!staffAtLocation(d,p,o.locationId)||!resourceAtLocation(d,r,o.locationId))reject('FORBIDDEN','Darbuotojas ar resursas iš kitos organizacijos.',403);const duration=x.durationMin==null?durationMin:int(x.durationMin,15,480),timing=normalizePhases(x.phases?.length?x.phases:phases,duration);return {practitionerId:p.id,resourceId:r.id,priceMinor:x.priceMinor==null?priceMinor:int(x.priceMinor,0,100000),durationMin:duration,...(x.phases?.length?{phases:timing}:{})};});
  if(new Set(staffOptions.map(x=>x.practitionerId)).size!==staffOptions.length)reject('INVALID_INPUT','Darbuotojai dubliuojasi.');
  const addons=(v.addons||[]).map(a=>({id:txt(a.id),label:txt(a.label),priceMinor:int(a.priceMinor,0,100000),durationMin:int(a.durationMin,0,240),groupId:a.groupId?txt(a.groupId):null}));
  if(addons.length>12||new Set(addons.map(a=>a.id)).size!==addons.length)reject('INVALID_INPUT','Patikrinkite priedų sąrašą.');
  if(complete&&(priceMinor===null||durationMin===null||!staffOptions.length||staffOptions.some(x=>x.priceMinor===null||x.durationMin===null||!find(d,'practitioners',x.practitionerId).active||!find(d,'resources',x.resourceId).active||!locationSchedule(d,find(d,'practitioners',x.practitionerId),o.locationId)?.weekdays?.length)))reject('OFFER_INCOMPLETE','Įrašykite kainą, trukmę, tinkamą darbuotoją, darbo vietą ir grafiką.');
  const addonGroups=(v.addonGroups||[]).map(g=>({id:txt(g.id),label:txt(g.label),min:int(g.min??0,0,12),max:int(g.max??1,1,12)}));
  if(addonGroups.length>8||new Set(addonGroups.map(g=>g.id)).size!==addonGroups.length||addonGroups.some(g=>g.min>g.max||g.max>addons.filter(a=>a.groupId===g.id).length)||addons.some(a=>a.groupId&&!addonGroups.some(g=>g.id===a.groupId)))reject('INVALID_INPUT','Patikrinkite priedų grupes ir jų pasirinkimo ribas.');
  const rules=v.availabilityRules||{};if(Object.keys(rules).some(k=>!['weekdays','fromMin','toMin','minLeadTimeMin','maxAdvanceDays'].includes(k)))reject('INVALID_INPUT','Nežinoma prieinamumo taisyklė.');
  const availabilityRules={};if(rules.weekdays!==undefined){if(!Array.isArray(rules.weekdays)||!rules.weekdays.length||new Set(rules.weekdays).size!==rules.weekdays.length||rules.weekdays.some(x=>!['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(x)))reject('INVALID_INPUT','Patikrinkite paslaugos savaitės dienas.');availabilityRules.weekdays=[...rules.weekdays];}
  for(const [key,min,max] of [['fromMin',0,1438],['toMin',1,1439],['minLeadTimeMin',0,43200],['maxAdvanceDays',1,30]])if(rules[key]!==undefined)availabilityRules[key]=int(rules[key],min,max);
  if((availabilityRules.fromMin??0)>=(availabilityRules.toMin??1439))reject('INVALID_INPUT','Paslaugos valandų pradžia turi būti anksčiau už pabaigą.');
  const attributes={};for(const [key,value] of Object.entries(v.attributes||{})){if(!['hairLength','technique','bodyArea','audience','level'].includes(key))reject('INVALID_INPUT','Nežinomas varianto požymis.');attributes[key]=txt(value,80);}
  return {id,label,priceMinor,durationMin,bufferBeforeMin:int(v.bufferBeforeMin??0,0,120),bufferAfterMin:int(v.bufferAfterMin??0,0,120),staffOptions,phases,addons,addonGroups,active:v.active!==false,attributes,availabilityRules};
 };
 const checked=(d,o)=>{const n=node(d,o.taxonomyServiceId);if(!publicLocation(d,o.locationId))reject('LOCATION_UNPUBLISHED','Pirmiausia pateikite veiklos vietą peržiūrai.');if(o.published&&o.published.locationId!==o.locationId&&d.bookings.some(b=>b.status==='confirmed'&&Date.parse(b.endAt)>store.clock()&&d.services.some(s=>s.offerId===o.id&&bookingUses(b,'providerServiceId',s.id))))reject('LOCATION_CONFLICT','Pirmiau perkelkite arba atšaukite šio pasiūlymo būsimus vizitus.',409);const active=o.variants.filter(v=>v.active!==false);if(!active.length)reject('OFFER_INCOMPLETE','Pridėkite bent vieną aktyvų variantą.');active.forEach(v=>variant(d,o,v,true));if(!eligible(d,o,n))reject('QUALIFICATION_REQUIRED','Šiai procedūrai ir vietai reikalinga operatoriaus tinkamumo patikra.');return n;};
 return {
  exportOfferCsv(user,input){const d=store.readCollections?store.readCollections(['memberships']):store.read();ownOrg(d,user,input.organizationId);const offers=store.organizationRecords?store.organizationRecords('offers',input.organizationId):d.offers.filter(o=>o.organizationId===input.organizationId);return offerCsv(offers);},
  taxonomy(){return taxonomyProjection(store.readCollections?store.readCollections(['taxonomyChanges','taxonomyVersion']):store.read());},
  selectProcedures(user,input){return mutate(d=>{offerState(d);ownOrg(d,user,input.organizationId);const org=find(d,'organizations',input.organizationId),locationId=input.locationId||org.locationId,ids=input.procedureIds;if(find(d,'locations',locationId).organizationId!==org.id)reject('FORBIDDEN','Kita veiklos vieta.',403);
   if(!Array.isArray(ids)||ids.length<1||ids.length>512||new Set(ids).size!==ids.length)reject('INVALID_INPUT','Pasirinkite procedūras be pasikartojimų.');ids.forEach(id=>node(d,id));
   const key=user.id+':procedures:'+txt(input.idempotencyKey,160),fingerprint=store.hash(JSON.stringify({organizationId:org.id,locationId,ids:[...ids].sort(),version:input.version}));
   if(d.idempotency[key]){if(d.idempotency[key].fingerprint!==fingerprint)reject('IDEMPOTENCY_CONFLICT','Raktas jau panaudotas kitai partijai.',409);return d.offers.filter(o=>d.idempotency[key].offerIds.includes(o.id));}
   const current=d.selectionVersions[org.id]||0;if(input.version!==current)reject('VERSION_CONFLICT','Pasirinkimų sąrašas pasikeitė.',409);
   const offers=ids.map(id=>{let o=d.offers.find(o=>o.organizationId===org.id&&o.locationId===locationId&&o.taxonomyServiceId===id&&o.state!=='archived');if(!o){const n=node(d,id);o={id:randomId('offer'),organizationId:org.id,locationId,taxonomyServiceId:id,taxonomyVersion:d.taxonomyVersion||TAXONOMY_VERSION,label:n.label,description:'',bookingMode:'instant',variants:[],state:'draft',version:1,createdAt:clock().now};d.offers.push(o);}return o;});
   d.selectionVersions[org.id]=current+1;d.idempotency[key]={fingerprint,offerIds:offers.map(o=>o.id)};event(d,'provider-services-selected',org.id);return offers;
  });},
  saveOffer(user,input){return mutate(d=>{offerState(d);const o=owned(d,user,input.id);version(o,input.version);if(o.state==='archived')reject('INVALID_INPUT','Pasiūlymas archyvuotas.');const n=node(d,input.taxonomyServiceId||o.taxonomyServiceId);
   const locationId=input.locationId||o.locationId;if(find(d,'locations',locationId).organizationId!==o.organizationId)reject('FORBIDDEN','Kita vieta.',403);
   if(!Array.isArray(input.variants)||input.variants.length>24)reject('INVALID_INPUT','Patikrinkite variantų sąrašą.');
   const variants=input.variants.map(v=>variant(d,{...o,locationId},v));if(new Set(variants.map(v=>v.id)).size!==variants.length||variants.some(v=>d.offers.some(other=>other.id!==o.id&&other.variants.some(x=>x.id===v.id))))reject('INVALID_INPUT','Varianto ID dubliuojasi.');
   if(!['instant','inquiry','consultation'].includes(input.bookingMode||o.bookingMode))reject('INVALID_INPUT','Pasirinkite registracijos būdą.');
   const menuGroupId=input.menuGroupId||null;if(menuGroupId&&find(d,'menuGroups',menuGroupId).organizationId!==o.organizationId)reject('FORBIDDEN','Kita meniu grupė.',403);
   Object.assign(o,{label:txt(input.label),description:String(input.description||'').trim().slice(0,1000),locationId,menuGroupId,rank:int(input.rank??o.rank??0,0,10000),taxonomyServiceId:n.id,taxonomyVersion:d.taxonomyVersion||TAXONOMY_VERSION,bookingMode:input.bookingMode||o.bookingMode,variants,state:'draft',version:o.version+1});event(d,'offer-draft-saved',o.id);return o;
  });},
  submitOffer(user,input){return mutate(d=>{offerState(d);const o=owned(d,user,input.id);version(o,input.version);checked(d,o);o.menuGroupSnapshot=o.menuGroupId?copy(find(d,'menuGroups',o.menuGroupId)):null;o.state='pending';o.version++;o.submittedAt=clock().now;event(d,'offer-submitted',o.id);return o;});},
  moderateOffer(user,input){return mutate(d=>{offerState(d);scope(d,user,{role:'operator'});const o=find(d,'offers',input.id);version(o,input.version);if(o.state!=='pending')reject('VERSION_CONFLICT','Versija jau peržiūrėta arba pasikeitė.',409);if(!['approved','returned'].includes(input.state))reject('INVALID_INPUT','Pasirinkite peržiūros sprendimą.');
   if(input.state==='returned'){o.state='returned';o.reason=txt(input.reason,500);o.version++;event(d,'offer-returned',o.id);return o;}
   const n=checked(d,o),g=o.menuGroupId?find(d,'menuGroups',o.menuGroupId):null;if(g&&(!o.menuGroupSnapshot||o.menuGroupSnapshot.id!==g.id||o.menuGroupSnapshot.version!==g.version))reject('VERSION_CONFLICT','Meniu grupė pasikeitė. Atnaujinkite pasiūlymą ir pateikite jį peržiūrai iš naujo.',409);const {published,...draft}=o,snapshot=copy(draft);snapshot.approvedAt=clock().now;snapshot.approvedBy=user.id;
   // Existing service IDs remain the authoritative booking target. Drafts never overwrite them.
   const retained=new Set(snapshot.variants.filter(v=>v.active).map(v=>v.id));for(const s of d.services.filter(s=>s.offerId===o.id&&!retained.has(s.id)))s.active=false;
   for(const v of snapshot.variants.filter(v=>v.active)){const old=d.services.find(s=>s.id===v.id),first=v.staffOptions[0],value={...v,id:v.id,offerId:o.id,offerLabel:o.label,description:o.description,menuGroupId:o.menuGroupId||null,menuGroupLabel:snapshot.menuGroupSnapshot?.label||null,menuGroupRank:snapshot.menuGroupSnapshot?.rank??10000,rank:o.rank||0,offerVersion:o.version,taxonomyServiceId:n.id,taxonomyVersion:snapshot.taxonomyVersion,organizationId:o.organizationId,locationId:o.locationId,practitionerId:first.practitionerId,resourceId:first.resourceId,currency:'EUR',imageId:n.imageId,bookingMode:o.bookingMode,version:(old?.version||0)+1};if(old)Object.assign(old,value);else d.services.push(value);}
   o.published=snapshot;o.state='approved';o.version++;event(d,'offer-approved',o.id);return o;
  });},
  archiveOffer(user,input){return mutate(d=>{offerState(d);const o=owned(d,user,input.id);version(o,input.version);o.state='archived';o.version++;for(const s of d.services.filter(s=>s.offerId===o.id)){s.active=false;s.version++;}event(d,'offer-archived',o.id);return o;});},
  saveMenuGroup(user,input){return mutate(d=>{offerState(d);ownOrg(d,user,input.organizationId);let g=input.id?find(d,'menuGroups',input.id):null;if(g){if(g.organizationId!==input.organizationId)reject('FORBIDDEN','Kita meniu grupė.',403);version(g,input.version);}const values={label:txt(input.label),rank:int(input.rank??0,0,10000),active:input.active!==false};if(g)Object.assign(g,values,{version:g.version+1});else{g={id:randomId('menu-group'),organizationId:input.organizationId,...values,version:1};d.menuGroups.push(g);}event(d,'menu-group-saved',g.id);return g;});},
  bulkOfferPrices(user,input){return mutate(d=>{offerState(d);ownOrg(d,user,input.organizationId);const rows=input.updates;if(!Array.isArray(rows)||!rows.length||rows.length>40)reject('INVALID_INPUT','Vienoje partijoje turi būti 1–40 eilučių.');
   const key=user.id+':offer-bulk:'+txt(input.idempotencyKey,160),fingerprint=store.hash(JSON.stringify({organizationId:input.organizationId,updates:rows}));if(d.idempotency[key]){if(d.idempotency[key].fingerprint!==fingerprint)reject('IDEMPOTENCY_CONFLICT','Partijos raktas jau panaudotas.',409);return d.idempotency[key].result;}
   const modified=new Map(),seen=new Set();for(const row of rows){const o=owned(d,user,row.offerId);if(o.organizationId!==input.organizationId)reject('FORBIDDEN','Kita organizacija.',403);version(o,row.version);if(o.state==='archived')reject('INVALID_INPUT','Pasiūlymas archyvuotas.');const v=o.variants.find(v=>v.id===row.variantId);if(!v)reject('NOT_FOUND','Variantas nerastas.',404);const id=o.id+':'+v.id+':'+row.practitionerId;if(seen.has(id))reject('INVALID_INPUT','Partijos eilutė dubliuojasi.');seen.add(id);const target=row.practitionerId==='*'?v:v.staffOptions.find(x=>x.practitionerId===row.practitionerId);if(!target)reject('INVALID_INPUT','Meistras šiam variantui nepriskirtas.');target.priceMinor=int(row.priceMinor,0,100000);target.durationMin=int(row.durationMin,15,480);modified.set(o.id,o);}
   for(const o of modified.values()){o.variants=o.variants.map(v=>variant(d,o,v));o.version++;o.state='draft';event(d,'offer-bulk-draft',o.id);}const result={updated:rows.length,offers:[...modified.values()].map(o=>({id:o.id,version:o.version}))};d.idempotency[key]={fingerprint,result};return result;
  });},
  requestProcedure(user,input){return mutate(d=>{offerState(d);ownOrg(d,user,input.organizationId);if(d.procedureRequests.filter(r=>r.organizationId===input.organizationId&&r.state==='pending').length>=20)reject('LIMIT','Prašymų limitas pasiektas.');const r={id:randomId('procedure-request'),organizationId:input.organizationId,label:txt(input.label),description:txt(input.description,1000),state:'pending',version:1,createdAt:clock().now};d.procedureRequests.push(r);event(d,'procedure-requested',r.id);return r;});},
  moderateProcedure(user,input){return mutate(d=>{
   offerState(d);scope(d,user,{role:'operator'});const r=find(d,'procedureRequests',input.id);version(r,input.version);if(r.state!=='pending')reject('VERSION_CONFLICT','Prašymas jau peržiūrėtas.',409);
   r.reason=txt(input.reason,500);if(input.state==='rejected')r.state='rejected';else{const n=node(d,input.targetId);r.state='resolved';r.targetId=n.id;}r.version++;event(d,'procedure-request-'+r.state,r.id);return r;
  });},
  changeTaxonomy(user,input){return mutate(d=>{
   offerState(d);scope(d,user,{role:'operator'});if(input.version!==(d.taxonomyVersion||TAXONOMY_VERSION))reject('VERSION_CONFLICT','Taksonomijos versija pasikeitė.',409);
   const nodes=catalogueTaxonomy(d),operations=['add','archive','restore','aliases','update'];if(!operations.includes(input.operation))reject('INVALID_INPUT','Pasirinkite galiojantį katalogo veiksmą.');
   let n=nodes.find(n=>n.id===input.nodeId),values={};
   const aliases=()=>{if(!Array.isArray(input.aliases)||input.aliases.length>20)reject('INVALID_INPUT','Patikrinkite sinonimus.');return [...new Set(input.aliases.map(x=>txt(x,80)))];};
   if(input.operation==='add'){
    if(typeof input.nodeId!=='string'||! /^[a-z][a-z0-9-]{2,99}$/.test(input.nodeId)||n||taxonomyNode(input.nodeId))reject('INVALID_INPUT','Procedūros ID turi būti unikalus, iš mažųjų lotyniškų raidžių, skaitmenų ir brūkšnelių.');
    if(!['category','group','treatment'].includes(input.kind))reject('INVALID_INPUT','Pasirinkite kategoriją, grupę arba procedūrą.');
    const parent=input.kind==='category'?null:nodes.find(n=>n.id===input.parentId&&!n.archived);
    if(input.kind!=='category'&&(!parent||parent.kind!==({group:'category',treatment:'group'}[input.kind])))reject('INVALID_INPUT','Pasirinkite tinkamą hierarchijos vietą.');
    if(nodes.length>=600)reject('LIMIT','Katalogo įrašų limitas pasiektas.');
    n={id:input.nodeId,label:txt(input.label),kind:input.kind,parentId:parent?.id||null,categoryId:parent?.categoryId||input.nodeId,scope:parent?.scope||'extension',reviewRequired:true,rank:int(input.rank??0,0,10000),aliases:aliases(),imageId:parent?.imageId||null};
   }else{
    if(!n)reject('NOT_FOUND','Katalogo įrašas nerastas.',404);
    if(input.operation==='archive'&&nodes.some(x=>x.parentId===n.id&&!x.archived))reject('DEPENDENCY_CONFLICT','Pirmiau tvarkykite priklausomas procedūras.',409);
    if(input.operation==='restore'&&n.parentId&&nodes.find(x=>x.id===n.parentId)?.archived)reject('DEPENDENCY_CONFLICT','Pirmiau atkurkite aukštesnę katalogo grupę.',409);
    values=input.operation==='aliases'?{aliases:aliases()}:input.operation==='update'?{label:txt(input.label),rank:int(input.rank??0,0,10000)}:{archived:input.operation==='archive'};
   }
   d.taxonomyVersion=TAXONOMY_VERSION+'-r'+(d.taxonomyChanges.length+1);d.taxonomyChanges.push({id:randomId('taxonomy-change'),nodeId:n.id,operation:input.operation,values,...(input.operation==='add'?{node:n}:{}),version:d.taxonomyVersion,actorId:user.id,at:clock().now});event(d,'taxonomy-'+input.operation,n.id);return taxonomyProjection(d);
  });},
  assessQualification(user,input){return mutate(d=>{offerState(d);scope(d,user,{role:'operator'});const n=node(d,input.taxonomyNodeId),l=find(d,'locations',input.locationId);if(l.organizationId!==input.organizationId)reject('FORBIDDEN','Kita vieta.',403);if(!Number.isFinite(Date.parse(input.expiresAt))||Date.parse(input.expiresAt)<=store.clock())reject('INVALID_INPUT','Patikrinkite patikros galiojimo datą.');const q={id:randomId('qualification'),organizationId:l.organizationId,locationId:l.id,taxonomyNodeId:n.id,state:'approved',evidenceReference:txt(input.evidenceReference,300),assessedAt:clock().now,expiresAt:input.expiresAt,actorId:user.id};d.qualifications.push(q);event(d,'qualification-assessed',q.id);return q;});},
  migrateCatalogue(user){return mutate(d=>{offerState(d);scope(d,user,{role:'operator'});let added=0;for(const s of d.services.filter(s=>!s.offerId)){const n=taxonomyNode(s.taxonomyServiceId);if(!n)continue;const v={...copy(s),staffOptions:[{practitionerId:s.practitionerId,resourceId:s.resourceId,priceMinor:s.priceMinor,durationMin:s.durationMin}]};const o={id:'offer-legacy-'+s.id,organizationId:s.organizationId,locationId:s.locationId,taxonomyServiceId:n.id,taxonomyVersion:TAXONOMY_VERSION,label:s.label,description:'',bookingMode:'instant',variants:[v],version:1,state:'draft',migrationState:n.kind==='treatment'?'mapped':'needs-classification',legacyServiceId:s.id};d.offers.push(o);s.offerId=o.id;added++;}event(d,'catalogue-migrated','taxonomy');return {added,services:d.services.length,bookings:d.bookings.length,version:TAXONOMY_VERSION};});},
 };
}
