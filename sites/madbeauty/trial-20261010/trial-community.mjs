import {ApiError} from '../backend/primitives.mjs';
export async function seedTrialCommunity(source){
 if(!source.store.fixturePreview||source.env.COMMUNITY_ENABLED!=='true'||!source.env.COMMUNITY)throw Error('Isolated community fixture configuration required');
 const db=source.store.db,key='trial-community-fixtures-v1',cursor=Number(db.prepare('SELECT value FROM release_metadata WHERE key=?').get(key)?.value||0);
 const profiles=(await source.publicProfiles()).filter(o=>source.store.organizationRecords('organizations',o.id).some(r=>r.isDemo===true)).sort((a,b)=>a.id.localeCompare(b.id));
 if(profiles.length!==45)throw Error('Expected existing 40 solo and 5 salon fixtures');
 const call=async(actor,method,input={})=>{const r=await source.env.COMMUNITY.getByName('person:'+actor).call('person',actor,{actor,isDemo:true},method,input);if(r.error)throw new ApiError(r.error.code,r.error.message,r.error.status);return r.result;};
 for(const o of profiles.slice(cursor,cursor+5)){
  const membership=source.store.organizationRecords('memberships',o.id).find(m=>m.role==='owner'&&m.active!==false),account=membership&&db.prepare('SELECT id,email FROM accounts WHERE site_id=? AND id=?').get(source.store.siteId,membership.accountId);
  if(!account?.email.endsWith('@example.com'))throw Error('Existing fixture owner required');
  for(const actor of ['person:'+account.id,'organization:'+o.id]){
   let state=await call(actor,'profile');
   if(!state.profile)state=await call(actor,'settings',{version:state.version,name:o.name,city:o.city,discoverable:true,messagePolicy:'requests'});
   const p=state.profile;
   db.prepare('INSERT INTO community_registry(actor,name,city,kind,discoverable,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(actor) DO NOTHING').run(actor,p.name,p.city,actor.split(':')[0],p.discoverable?1:0,source.store.clock());
   if(actor.startsWith('organization:')&&p.discoverable){const service=o.services[0],work=o.works?.[0];await call(actor,'publish',{text:'Bandomasis meistro darbo įrašas. Ši nuotrauka sugeneruota testavimui; tai nėra tikro kliento procedūros rezultatas. Čia gali išbandyti komentarus, idėjų albumus ir paslaugos peržiūrą.',audience:'public',providerServiceId:service?.id||'',serviceId:service?.taxonomyServiceId||'',galleryMediaId:work?.mediaId||'',operation:'trial-community-post-v1'});}
  }
 }
 const processed=Math.min(profiles.length,cursor+5);db.prepare('INSERT INTO release_metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,String(processed));
 return {processed,total:profiles.length,complete:processed===profiles.length};
}
