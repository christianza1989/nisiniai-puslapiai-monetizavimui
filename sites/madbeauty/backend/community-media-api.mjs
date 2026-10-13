import {createAuth} from './auth.mjs';
import {createPlatform} from './platform.mjs';
import {createCommunityApi} from './community-api.mjs';
import {personActor,organizationActor,conversationKey} from './community.mjs';
import {ApiError,reject} from './primitives.mjs';

const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const actorId=v=>{if(typeof v!=='string'||! /^(person|organization):[a-zA-Z0-9_-]{1,80}$/.test(v))reject('INVALID_INPUT','Netinkamas profilis.');return v;};
export function createCommunityMediaApi(store,options){
 const {origin,enabled,getObject,dispatch,transformMedia}=options,auth=createAuth(store),platform=createPlatform(store),api=createCommunityApi(store,options);
 async function handle(request){
  try{
   if(!enabled||!getObject)reject('COMMUNITY_UNAVAILABLE','Bendruomenės bandymas dar neįjungtas.',503);
   const url=new URL(request.url);
   if(url.origin!==origin||!['GET','POST'].includes(request.method)||request.headers.get('sec-fetch-site')==='cross-site')reject('ORIGIN','Užklausa neleidžiama.',403);
   const upload=request.method==='POST';
   if(upload&&request.headers.get('origin')!==origin)reject('ORIGIN','Užklausa neleidžiama.',403);
   const cookieName=url.protocol==='https:'?'__Host-madbeauty_sid':'madbeauty_sid',token=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1),s=auth.session(token,{create:false}),user=auth.requireAccount(s);
   if(upload)auth.csrf(s,request.headers.get('x-csrf-token'));
   const mode=upload?request.headers.get('x-community-mode'):url.searchParams.has('post')?'post':'message';
   if(!['post','message'].includes(mode))reject('INVALID_INPUT','Pasirink nuotraukos paskirtį.');
   const organizationId=upload?request.headers.get('x-organization-id'):url.searchParams.get('organization');
   async function principal(){
    let actor=personActor(user.id),organization=null,canManage=false;
    if(organizationId){const session=dispatch?await dispatch('session',user,{}):platform.session(user),org=session.organizations.find(o=>o.id===organizationId);if(!org||(mode==='message'?!['owner','manager','reception'].includes(org.membershipRole):!org.capabilities?.includes('profile')))reject('FORBIDDEN','Salono nuotraukų prieigos neturi.',403);if(mode==='message')organization=organizationActor(org.id);else{actor=organizationActor(org.id);canManage=true;}}
    return {actor,organization,canReadInbox:!!organization,canManage};
   }
   let p=await principal(),self=p.organization||p.actor,target=mode==='message'?actorId(upload?request.headers.get('x-community-target'):url.searchParams.get('target')):upload?self:actorId(url.searchParams.get('author'));
   if(mode==='message'&&self===target)reject('INVALID_INPUT','Pasirink kitą profilį.');
   const kind=mode==='post'?'person':'conversation',entity=mode==='post'?target:conversationKey(self,target);
   async function access(){
    if(!auth.account(auth.session(token,{create:false})))reject('FORBIDDEN','Sesija pasibaigė.',403);
    p=await principal();self=p.organization||p.actor;
    const context=await api.context(self,target),trusted={...context,...p};
    if(upload){const state=await api.invoke(kind,entity,trusted,mode==='post'?'profile':'status');if(mode==='post'&&!state.profile?.discoverable)reject('PROFILE_REQUIRED','Pirmiausia paruošk bendruomenės profilį.',409);if(mode==='message'&&state.conversation.state!=='accepted')reject('FORBIDDEN','Nuotraukomis dalintis galima priėmus pokalbį.',403);}
    return trusted;
   }
   let trusted=await access();
   if(!upload){
    const data=await api.invoke(kind,entity,trusted,'readMedia',{id:url.searchParams.get('id'),post:url.searchParams.get('post'),message:url.searchParams.get('message'),width:Number(url.searchParams.get('width'))});
    await access();
    return new Response(data.bytes,{headers:{...headers,'Content-Type':'image/webp'}});
   }
   store.limit('community-image:'+user.id,20,60);
   const mime=request.headers.get('content-type');if(!['image/jpeg','image/png','image/webp'].includes(mime))reject('INVALID_IMAGE','Pasirink JPG, PNG arba WebP nuotrauką.');
   if(!transformMedia)reject('MEDIA_UNAVAILABLE','Nuotraukų įkėlimas laikinai nepasiekiamas.',503);
   if(request.headers.get('x-asset-rights-confirmed')!=='true')reject('INVALID_INPUT','Patvirtink teisę dalintis nuotrauka.');
   let alt,rights;try{alt=decodeURIComponent(request.headers.get('x-asset-alt')||'');rights=decodeURIComponent(request.headers.get('x-asset-rights')||'');}catch{reject('INVALID_INPUT','Patikrink nuotraukos aprašą.');}
   const operation=request.headers.get('x-asset-operation');if(!operation||! /^[a-zA-Z0-9_-]{8,100}$/.test(operation))reject('INVALID_INPUT','Netinkama įkėlimo tapatybė.');
   const max=6*1024*1024;if(Number(request.headers.get('content-length'))>max)reject('PAYLOAD_TOO_LARGE','Nuotrauka turi būti iki 6 MB.',413);
   const reader=request.body?.getReader();if(!reader)reject('INVALID_IMAGE','Pasirink nuotrauką.');let count=0;const parts=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>max)reject('PAYLOAD_TOO_LARGE','Nuotrauka turi būti iki 6 MB.',413);parts.push(value);}}finally{reader.releaseLock();}
   const transformed=await transformMedia(store,{bytes:Buffer.concat(parts),mime,alt,rights,usage:'gallery',organizationId:self,rightsConfirmedAt:new Date(store.clock()).toISOString(),rightsConfirmedBy:user.id});
   // Recheck session, role and blocks after the asynchronous image transform.
   trusted=await access();
   const result=await api.invoke(kind,entity,trusted,'registerMedia',{...transformed,operation});
   await access();
   return Response.json({result},{headers});
  }catch(e){return Response.json({error:{code:e instanceof ApiError?e.code:'SERVER_ERROR',message:e instanceof ApiError?e.message:'Nuotraukos paruošti nepavyko.'}},{status:e instanceof ApiError?e.status:500,headers});}
 }
 return {handle};
}
