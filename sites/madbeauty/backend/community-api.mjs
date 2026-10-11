import {createAuth} from './auth.mjs';
import {ApiError,reject} from './primitives.mjs';
import {personActor,organizationActor,conversationKey} from './community.mjs';
import {createPlatform} from './platform.mjs';
const safeActor=v=>{if(typeof v!=='string'||! /^(person|organization):[a-zA-Z0-9_-]{1,80}$/.test(v))reject('VALIDATION_FAILED','Netinkamas profilis.');return v;};
export function createCommunityApi(store,{origin,enabled=false,getObject,dispatch}={}){
 if(!store.communityRegistryInitialized){store.db.exec('CREATE TABLE IF NOT EXISTS community_registry(actor TEXT PRIMARY KEY,name TEXT NOT NULL,city TEXT NOT NULL,kind TEXT NOT NULL,discoverable INTEGER NOT NULL,updated_at INTEGER NOT NULL) STRICT;');store.communityRegistryInitialized=true;}
 const auth=createAuth(store),platform=createPlatform(store);
 const object=(kind,id)=>getObject(kind+':'+id);
 const invoke=async(kind,id,p,m,v={})=>{const r=await object(kind,id).call(kind,id,p,m,v);if(r.error)throw new ApiError(r.error.code,r.error.message,r.error.status);return r.result;};
 const ownProfile=async actor=>(await invoke('person',actor,{actor},'profile')).profile;
 const context=async(actor,target)=>{
  const own=await invoke('person',actor,{actor},'profile'),other=target===actor?own:await invoke('person',target,{actor:target},'profile');
  const blocked=!!own.blocked?.includes(target)||!!other.blocked?.includes(actor);
  let friend=false;
  if(actor!==target&&actor.startsWith('person:')&&target.startsWith('person:')&&!blocked){const relation=await invoke('conversation',conversationKey(actor,target),{actor},'status');friend=relation.friendship.state==='accepted';}
  return {actor,name:own.profile?.name||'Bendruomenės narys',blocked,friend,messagePolicy:other.profile?.messagePolicy||'closed'};
 };
 async function handle(request){
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
  try{
   if(!enabled||!getObject)reject('COMMUNITY_UNAVAILABLE','Bendruomenės bandymas dar neįjungtas.',503);
   if(new URL(request.url).origin!==origin||request.method!=='POST'||request.headers.get('origin')!==origin||!request.headers.get('content-type')?.startsWith('application/json'))reject('ORIGIN','Užklausa neleidžiama.',403);
   const cookieName=new URL(origin).protocol==='https:'?'__Host-madbeauty_sid':'madbeauty_sid',token=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1),s=auth.session(token,{create:false}),user=auth.requireAccount(s);auth.csrf(s,request.headers.get('x-csrf-token'));
   store.limit('community-account:'+user.id,120,60);
   if(Number(request.headers.get('content-length'))>20000)reject('PAYLOAD_TOO_LARGE','Per didelė užklausa.',413);
   let bytes=0,chunks=[];if(request.body){const reader=request.body.getReader();try{while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>20000)reject('PAYLOAD_TOO_LARGE','Per didelė užklausa.',413);chunks.push(r.value);}}finally{reader.releaseLock();}}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{reject('VALIDATION_FAILED','Netinkama užklausa.');}
   const method=body.method,input=body.input||{},roomMethod=['request','respond','send','read','remove','conversation','relationships'].includes(method);let actor=personActor(user.id),canManage=false,inbox=null;
   if(body.organizationId){const session=dispatch?await dispatch('session',user,{}):platform.session(user),org=session.organizations.find(o=>o.id===body.organizationId);if(!org||!(roomMethod?['owner','manager','reception'].includes(org.membershipRole):org.capabilities?.includes('profile')))reject('FORBIDDEN','Šio salono bendruomenės prieigos neturi.',403);if(roomMethod)inbox=organizationActor(org.id);else{actor=organizationActor(org.id);canManage=true;}}
   const principal={actor,canManage,isDemo:store.fixturePreview===true,operator:!!user.operator};
   let result;
   if(method==='settings'){
    result=await invoke('person',actor,principal,method,input);
    const p=result.profile;store.db.prepare('INSERT INTO community_registry(actor,name,city,kind,discoverable,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(actor) DO UPDATE SET name=excluded.name,city=excluded.city,discoverable=excluded.discoverable,updated_at=excluded.updated_at').run(actor,p.name,p.city,actor.split(':')[0],p.discoverable?1:0,store.clock());
   }else if(method==='session'){result={actor,...await invoke('person',actor,principal,'profile'),isDemo:principal.isDemo};}
   else if(method==='people'){const rows=store.db.prepare('SELECT actor,name,city,kind FROM community_registry WHERE discoverable=1 AND actor>? ORDER BY actor LIMIT 60').all(String(input.after||''));result=(await Promise.all(rows.map(async r=>(await context(actor,r.actor)).blocked?null:r))).filter(Boolean);}
   else if(method==='relationships'){
    const self=inbox||actor,own=await invoke('person',self,{actor:self},'profile');
    result=(await Promise.all(own.references.map(async key=>{const target=key.split('|').find(x=>x!==self);if(!target)return null;const p=await context(self,target);if(p.blocked)return null;const r=await invoke('conversation',key,inbox?{...p,actor,organization:inbox,canReadInbox:true}:p,'status');return {target,name:(await ownProfile(target))?.name||'Bendruomenės narys',...r};}))).filter(Boolean);
   }
   else if(method==='feed'){
    const own=await invoke('person',actor,principal,'profile'),authors=input.author?[{actor:safeActor(input.author)}]:store.db.prepare('SELECT actor FROM community_registry WHERE discoverable=1 ORDER BY actor LIMIT 60').all();
    const pages=await Promise.all(authors.filter(a=>input.mode!=='following'||own.following.includes(a.actor)||a.actor===actor).map(async a=>{const p=await context(actor,a.actor);return (await invoke('person',a.actor,p,'list',{before:input.before,limit:24,serviceId:input.serviceId})).posts;}));
    const posts=pages.flat().filter(p=>!input.city||p.city===input.city).sort((a,b)=>b.order.localeCompare(a.order));result={posts:posts.slice(0,24),next:posts.length>24?posts[23].order:null};
   }else if(['friendship','request','respond','send','read','remove','conversation'].includes(method)){
    if(body.organizationId&&!inbox)reject('FORBIDDEN','Asmeninių pokalbių iš salono profilio neatidaryk.',403);
    const target=safeActor(input.target);if(target===actor)reject('VALIDATION_FAILED','Pasirink kitą profilį.');
    const p=inbox?{...await context(inbox,target),actor,organization:inbox,canReadInbox:true}:await context(actor,target),key=conversationKey(inbox||actor,target);
    if(method==='send'&&input.media?.length)reject('MEDIA_UNAVAILABLE','Privačių nuotraukų priedai dar neįjungti.',409);
    result=await invoke('conversation',key,p,method==='conversation'?'status':method,input);
    if(['friendship','request'].includes(method))for(const a of [inbox||actor,target])await invoke('person',a,{actor:a},'reference',{key});
   }else if(method==='block'){
    const t=safeActor(input.target);result=await invoke('person',actor,principal,'block',{...input,target:t});if(input.blocked===true)await invoke('conversation',conversationKey(actor,t),{actor},'resetBlocked');
   }else if(method==='follow'){
    const t=safeActor(input.target),p=await context(actor,t);result=await invoke('person',actor,principal,'follow',{...input,target:t,targetBlocked:p.blocked});
   }else if(['publish','edit','save','export'].includes(method)){
    if(method==='publish'&&input.media?.length)reject('MEDIA_UNAVAILABLE','Nuotraukų įkėlimas dar neįjungtas.',409);
    result=await invoke('person',actor,principal,method,input);
   }else if(['get','like','comment','editComment','report','review','profile'].includes(method)){
    const t=safeActor(input.author||actor),p={...await context(actor,t),operator:principal.operator};result=await invoke('person',t,p,method,input);
   }else reject('NOT_FOUND','Operacija nerasta.',404);
   // Revalidate after child RPC: an in-flight logout or account removal wins.
   if(!auth.account(auth.session(token,{create:false})))reject('FORBIDDEN','Sesija pasibaigė. Prisijunk iš naujo.',403);
   return Response.json({result},{headers});
  }catch(e){return Response.json({error:{code:e instanceof ApiError?e.code:'SERVER_ERROR',message:e instanceof ApiError?e.message:'Veiksmas nepavyko.'}},{status:e instanceof ApiError?e.status:500,headers});}
 }
 return {handle,context,invoke};
}
