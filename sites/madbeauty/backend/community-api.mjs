import {createAuth} from './auth.mjs';
import {ApiError,reject} from './primitives.mjs';
import {personActor,organizationActor,conversationKey} from './community.mjs';
import {createPlatform} from './platform.mjs';
const safeActor=v=>{if(typeof v!=='string'||! /^(person|organization):[a-zA-Z0-9_-]{1,80}$/.test(v))reject('VALIDATION_FAILED','Netinkamas profilis.');return v;};
export function createCommunityApi(store,{origin,enabled=false,getObject,dispatch,seed}={}){
 if(!store.communityRegistryInitialized){store.db.exec('CREATE TABLE IF NOT EXISTS community_registry(actor TEXT PRIMARY KEY,name TEXT NOT NULL,city TEXT NOT NULL,kind TEXT NOT NULL,discoverable INTEGER NOT NULL,updated_at INTEGER NOT NULL) STRICT;');store.communityRegistryInitialized=true;}
 const auth=createAuth(store),platform=createPlatform(store);
 const object=(kind,id)=>getObject(kind+':'+id);
 const invoke=async(kind,id,p,m,v={})=>{const r=await object(kind,id).call(kind,id,p,m,v);if(r.error)throw new ApiError(r.error.code,r.error.message,r.error.status);return r.result;};
 const publishedProfiles=new Map();
 const publicProfile=id=>{if(!publishedProfiles.has(id))publishedProfiles.set(id,dispatch?dispatch('profile',null,{id}):Promise.resolve(platform.profile(id)));return publishedProfiles.get(id);};
 const enrich=async post=>{if(!post.author.startsWith('organization:'))return post;const profile=await publicProfile(post.author.slice(13));const service=profile?.services.find(s=>s.id===post.providerServiceId),galleryImage=profile?.works?.some(w=>w.mediaId===post.galleryMediaId)?profile.media?.find(m=>m.id===post.galleryMediaId):null;return {...post,providerServiceId:service?.id||'',serviceLabel:service?.label||null,galleryImage:galleryImage||null};};
 const ownProfile=async actor=>(await invoke('person',actor,{actor},'profile')).profile;
 const context=async(actor,target)=>{
  for(const a of [actor,target])if(a.startsWith('person:')&&!store.db.prepare('SELECT id FROM accounts WHERE site_id=? AND id=?').get(store.siteId,a.slice(7)))reject('NOT_FOUND','Profilis nerastas.',404);
  const own=await invoke('person',actor,{actor},'profile'),other=target===actor?own:await invoke('person',target,{actor:target},'profile');
  const blocked=!!own.blocked?.includes(target)||!!other.blocked?.includes(actor);
  let friend=false;
  if(actor!==target&&actor.startsWith('person:')&&target.startsWith('person:')&&!blocked){const relation=await invoke('conversation',conversationKey(actor,target),{actor},'status');friend=relation.friendship.state==='accepted';}
  return {actor,name:own.profile?.name||'Bendruomenės narys',blocked,friend,messagePolicy:other.profile?.messagePolicy||'closed'};
 };
 async function handle(request){
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
  try{
   publishedProfiles.clear();
   if(!enabled||!getObject)reject('COMMUNITY_UNAVAILABLE','Bendruomenės bandymas dar neįjungtas.',503);
   if(new URL(request.url).origin!==origin||request.method!=='POST'||request.headers.get('origin')!==origin||!request.headers.get('content-type')?.startsWith('application/json'))reject('ORIGIN','Užklausa neleidžiama.',403);
   const cookieName=new URL(origin).protocol==='https:'?'__Host-madbeauty_sid':'madbeauty_sid',token=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1),s=auth.session(token,{create:false}),user=auth.requireAccount(s);auth.csrf(s,request.headers.get('x-csrf-token'));
   store.limit('community-account:'+user.id,120,60);
   if(Number(request.headers.get('content-length'))>20000)reject('PAYLOAD_TOO_LARGE','Per didelė užklausa.',413);
   let bytes=0,chunks=[];if(request.body){const reader=request.body.getReader();try{while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>20000)reject('PAYLOAD_TOO_LARGE','Per didelė užklausa.',413);chunks.push(r.value);}}finally{reader.releaseLock();}}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{reject('VALIDATION_FAILED','Netinkama užklausa.');}
   if(!body||Array.isArray(body)||typeof body!=='object'||body.input&& (typeof body.input!=='object'||Array.isArray(body.input)))reject('VALIDATION_FAILED','Netinkama užklausa.');
   const method=body.method,input=body.input||{},roomMethod=['request','respond','send','read','remove','conversation','relationships'].includes(method);let actor=personActor(user.id),canManage=false,inbox=null;
   if(['publish','comment','report','send'].includes(method))store.limit('community-'+method+':'+user.id,method==='publish'?12:method==='send'?240:60,3600);
   if(body.organizationId){const session=dispatch?await dispatch('session',user,{}):platform.session(user),org=session.organizations.find(o=>o.id===body.organizationId);if(!org||!(roomMethod?['owner','manager','reception'].includes(org.membershipRole):org.capabilities?.includes('profile')))reject('FORBIDDEN','Šio salono bendruomenės prieigos neturi.',403);if(roomMethod)inbox=organizationActor(org.id);else{actor=organizationActor(org.id);canManage=true;}}
   const principal={actor,canManage,isDemo:store.fixturePreview===true,operator:!!user.operator};
   let result;
   if(method==='seed'){if(!principal.operator||!store.fixturePreview||!seed)reject('FORBIDDEN','Šis veiksmas neleidžiamas.',403);result=await seed();}
   else if(method==='settings'){
    result=await invoke('person',actor,principal,method,input);
    const p=result.profile;store.db.prepare('INSERT INTO community_registry(actor,name,city,kind,discoverable,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(actor) DO UPDATE SET name=excluded.name,city=excluded.city,discoverable=excluded.discoverable,updated_at=excluded.updated_at').run(actor,p.name,p.city,actor.split(':')[0],p.discoverable?1:0,store.clock());
   }else if(method==='session'){const session=dispatch?await dispatch('session',user,{}):platform.session(user);result={actor,...await invoke('person',actor,principal,'profile'),personalOrganizations:session.organizations.filter(o=>o.capabilities?.includes('profile')).map(o=>({id:o.id,name:o.name})),isDemo:principal.isDemo};}
   else if(method==='people'){const rows=store.db.prepare('SELECT actor,name,city,kind FROM community_registry WHERE discoverable=1 AND actor>? ORDER BY actor LIMIT 61').all(String(input.after||'')),page=rows.slice(0,60);result={items:(await Promise.all(page.map(async r=>(await context(actor,r.actor)).blocked?null:{...r,isDemo:principal.isDemo}))).filter(Boolean),next:rows.length>60?page.at(-1).actor:null};}
   else if(method==='relationships'){
    const self=inbox||actor,own=await invoke('person',self,{actor:self},'profile');
    result=(await Promise.all(own.references.map(async key=>{const target=key.split('|').find(x=>x!==self);if(!target)return null;const p=await context(self,target);if(p.blocked)return null;const r=await invoke('conversation',key,inbox?{...p,actor,organization:inbox,canReadInbox:true}:p,'status');return {target,name:(await ownProfile(target))?.name||'Bendruomenės narys',...r};}))).filter(Boolean);
   }
   else if(method==='feed'){
    const own=await invoke('person',actor,principal,'profile'),authors=input.author?[{actor:safeActor(input.author)}]:store.db.prepare('SELECT actor FROM community_registry WHERE discoverable=1 AND (?=\'\' OR city=?) ORDER BY actor LIMIT 201').all(String(input.city||''),String(input.city||''));
    if(authors.length>200)reject('LIMIT','Bandomasis srautas užpildytas. Pasirink miestą arba konkretų autorių.',409);
    const pages=await Promise.all(authors.filter(a=>input.mode!=='following'||own.following.includes(a.actor)||a.actor===actor).map(async a=>{const p=await context(actor,a.actor);return await invoke('person',a.actor,p,'list',{before:input.before,limit:24,serviceId:input.serviceId});}));
    const posts=pages.flatMap(p=>p.posts).sort((a,b)=>b.order.localeCompare(a.order));result={posts:await Promise.all(posts.slice(0,24).map(enrich)),next:posts.length>24||pages.some(p=>p.next)?posts.at(Math.min(23,posts.length-1))?.order||null:null};
   }else if(['friendship','request','respond','send','read','remove','conversation'].includes(method)){
    if(body.organizationId&&!inbox)reject('FORBIDDEN','Asmeninių pokalbių iš salono profilio neatidaryk.',403);
    const target=safeActor(input.target);if(target===(inbox||actor))reject('VALIDATION_FAILED','Pasirink kitą profilį.');
    const p=inbox?{...await context(inbox,target),actor,organization:inbox,canReadInbox:true}:await context(actor,target),key=conversationKey(inbox||actor,target);
    result=await invoke('conversation',key,{...p,isDemo:principal.isDemo},method==='conversation'?'status':method,input);
    if(['friendship','request'].includes(method))for(const a of [inbox||actor,target])await invoke('person',a,{actor:a},'reference',{key});
   }else if(method==='block'){
    const t=safeActor(input.target);result=await invoke('person',actor,principal,'block',{...input,target:t});if(input.blocked===true)await invoke('conversation',conversationKey(actor,t),{actor},'resetBlocked');
   }else if(method==='follow'){
    const t=safeActor(input.target),p=await context(actor,t);if(input.following===true&&! (await ownProfile(t))?.discoverable)reject('NOT_FOUND','Profilis nerastas.',404);result=await invoke('person',actor,principal,'follow',{...input,target:t,targetBlocked:p.blocked});
   }else if(method==='save'){
    const t=safeActor(input.author);if(input.saved===true)await invoke('person',t,await context(actor,t),'get',{id:input.id});result=await invoke('person',actor,principal,'save',{...input,author:t});
   }else if(method==='publish'){
    const publication={...input,serviceId:'',providerServiceId:'',galleryMediaId:''};
    if(input.providerServiceId){
     const catalog=dispatch?await dispatch('catalog',null,{}):platform.catalog({}),service=catalog.find(s=>s.id===input.providerServiceId);
     if(!service||actor!==organizationActor(service.organizationId))reject('NOT_FOUND','Pasirink savo salono paskelbtą paslaugą.',404);
     publication.providerServiceId=service.id;publication.serviceId=service.taxonomyServiceId;
    }
    if(input.galleryMediaId){const profile=actor.startsWith('organization:')?await publicProfile(actor.slice(13)):null;if(!profile?.works?.some(w=>w.mediaId===input.galleryMediaId)||!profile.media.some(m=>m.id===input.galleryMediaId))reject('NOT_FOUND','Nuotrauka nerasta tavo paskelbtoje galerijoje.',404);publication.galleryMediaId=input.galleryMediaId;}
    result=await enrich(await invoke('person',actor,principal,method,publication));
   }else if(method==='moderation'){
    if(!principal.operator)reject('FORBIDDEN','Šis veiksmas neleidžiamas.',403);
    const authors=store.db.prepare('SELECT actor FROM community_registry WHERE actor>? ORDER BY actor LIMIT 30').all(String(input.after||''));
    result={items:(await Promise.all(authors.map(a=>invoke('person',a.actor,principal,'reports')))).flatMap(p=>p.reports.map(r=>({...r,author:p.author}))),next:authors.length===30?authors.at(-1).actor:null};
   }else if(method==='export'){
    const own=await invoke('person',actor,principal,'export'),authors=store.db.prepare('SELECT actor FROM community_registry ORDER BY actor LIMIT 201').all();
    if(authors.length>200)reject('LIMIT','Bandomojo eksporto apimtis per didelė. Rašyk info@pinet.lt.',409);
    result={...own,contributions:await Promise.all(authors.map(a=>invoke('person',a.actor,principal,'contributions'))),sentMessages:actor.startsWith('person:')?await Promise.all(own.references.map(key=>invoke('conversation',key,principal,'export'))):[]};
   }else if(method==='edit'){
    result=await invoke('person',actor,principal,method,input);
   }else if(['get','like','comment','editComment','report','review','profile'].includes(method)){
    const t=safeActor(input.author||actor),p={...await context(actor,t),operator:principal.operator};result=await invoke('person',t,p,method,input);if(method==='get')result=await enrich(result);
   }else reject('NOT_FOUND','Operacija nerasta.',404);
   // Revalidate after child RPC: an in-flight logout or account removal wins.
   if(!auth.account(auth.session(token,{create:false})))reject('FORBIDDEN','Sesija pasibaigė. Prisijunk iš naujo.',403);
   return Response.json({result},{headers});
  }catch(e){return Response.json({error:{code:e instanceof ApiError?e.code:'SERVER_ERROR',message:e instanceof ApiError?e.message:'Veiksmas nepavyko.'}},{status:e instanceof ApiError?e.status:500,headers});}
 }
 return {handle,context,invoke};
}
