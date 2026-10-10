import app,{MadbeautyPlatform} from '../cloudflare/worker.mjs';
import {initializeFixtureRuntime} from '../backend/fixture-runtime.mjs';
import {initializeTrialReviews} from './trial-reviews.mjs';
import {escape} from '../cloudflare/content.mjs';
import {RETENTION_POLICY,policyPublic} from '../backend/retention-policy.mjs';
import trialAssets from './output/trial-assets.json';
import trialMedia from './output/trial-media.json';
import template from '../prototype/public/app.html';
import {directoryRoute,directoryRows,renderDirectory} from '../prototype/public/provider-directory.mjs';
import {renderPublicProfile} from '../prototype/public/profile-seo.mjs';
import {renderFooter} from '../prototype/public/footer.mjs';
const origin='https://bandymas.madbeauty.lt';
const assetPaths=new Set(trialAssets);
const mediaPaths=new Map(trialMedia.assets.flatMap(a=>a.variants.map(v=>[v.file.split('/').at(-1),'/'+v.file])));
const valid=env=>env.APP_ORIGIN===origin&&env.RELEASE_MODE==='temporary-live-test'&&/^\d{4}-\d\d-\d\dT/.test(env.TRIAL_EXPIRES_AT||'')&&Number.isFinite(Date.parse(env.TRIAL_EXPIRES_AT));
const expired=env=>Date.now()>=Date.parse(env.TRIAL_EXPIRES_AT);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
const deny=()=>json({error:{code:'NOT_FOUND',message:'Puslapis nerastas.'}},404);
async function inputJson(request){
  const reader=request.body?.getReader();if(!reader)return null;
  const chunks=[];let bytes=0;
  for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1024){await reader.cancel();throw Error('Request too large');}chunks.push(value);}
  return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
}
export class TemporaryTestPlatform extends MadbeautyPlatform{
 constructor(ctx,env){
  if(!valid(env))throw Error('Explicit isolated temporary test configuration required');
  let localStore;
  const capture={fetch:async(_url,init)=>{
   const mail=JSON.parse(init.body);
   if(!mail.to.endsWith('@example.com')||!localStore)throw Error('Temporary test cannot send real mail');
   const code=mail.text?.match(/kodas: (\d{6})/)?.[1];
   if(code)localStore.db.prepare('INSERT OR REPLACE INTO trial_login_codes(id,code,expires_at) VALUES(?,?,?)').run(mail.id,code,Date.now()+600000);
   return new Response('Temporary test capture only; no SMTP',{status:200});
  }};
  super(ctx,{...env,MAIL_TRANSPORT:capture},{fixturePreview:true});
  localStore=this.store;this.store.db.prepare('CREATE TABLE IF NOT EXISTS trial_login_codes(id TEXT PRIMARY KEY,code TEXT NOT NULL,expires_at INTEGER NOT NULL)').run();
  if(!expired(env)){
   initializeFixtureRuntime(this.store);
   initializeTrialReviews(this.store);
   if(!this.store.db.prepare("SELECT value FROM release_metadata WHERE key='trial-responsive-media-v1'").get())this.store.transaction(()=>{
    const d=this.store.read(),sourceMedia=new Map(trialMedia.assets.map(a=>[a.id,a]));
    for(const o of d.organizations){
     const portrait=o.avatarImageId,works=[...o.gallery];
     const install=(sourceId,usage)=>{
      const a=sourceMedia.get(sourceId);if(!a)throw Error('Existing trial media missing: '+sourceId);
      const id=o.kind==='solo'?a.id:o.id+'-'+a.id;
      if(!d.media.some(m=>m.id===id))d.media.push({id,organizationId:o.id,usage,alt:a.alt,rights:'Original AI illustration for a fictional test profile; not real provider work.',
       isDemo:true,variants:a.variants.map(v=>({...v,storageFile:v.file.split('/').at(-1)}))});
      return id;
     };
     o.avatarImageId=install(portrait,'portrait');o.gallery=works.map(id=>install(id,'gallery'));
     o.staffPortraits=[{practitionerId:d.practitioners.find(p=>p.organizationId===o.id).id,mediaId:o.avatarImageId}];
     o.galleryEntries=o.gallery.map((mediaId,i)=>({mediaId,providerServiceId:i===0?d.services.find(s=>s.organizationId===o.id).id:null,caption:i===0?'Testinio darbo iliustracija':'Testinės aplinkos iliustracija'}));
    }
    this.store.write(d);this.store.db.prepare('INSERT INTO release_metadata(key,value) VALUES(?,?)').run('trial-responsive-media-v1','1');
   });
   this.store.db.prepare('INSERT OR IGNORE INTO accounts(id,site_id,email,name,created_at,operator) VALUES(?,?,?,?,?,1)').run('trial-operator',this.store.siteId,'trial-operator@example.com','Bandymo operatorius',this.store.clock());
  }
 }
 trialProfiles(){return this.store.readCollections(['organizations']).organizations.map(o=>({id:o.id,name:o.name,kind:o.kind,city:o.city,isDemo:o.isDemo}));}
 trialCode(challengeId){return this.store.db.prepare('SELECT code FROM trial_login_codes WHERE id=? AND expires_at>?').get(challengeId.replaceAll('_','-'),Date.now())?.code||null;}
 async fetch(request){
  if(expired(this.env))return json({error:{code:'TRIAL_ENDED',message:'Laikinas bandymas baigtas.'}},410);
  const path=new URL(request.url).pathname;
  if(request.method==='POST'&&path==='/api/madbeauty/auth/start'){
   let body;try{body=await inputJson(request.clone());}catch{return json({error:{code:'INVALID_INPUT',message:'Netinkama užklausa.'}},400);}
   const email=String(body?.email||'').trim().toLowerCase();
   if(!email.endsWith('@example.com')||!this.store.db.prepare('SELECT id FROM accounts WHERE email=? AND site_id=?').get(email,this.store.siteId))return json({error:{code:'TRIAL_ACCOUNT_REQUIRED',message:'Pasirink paskyrą iš bandymo sąrašo. Tikras el. paštas čia nenaudojamas.'}},400);
   const response=await super.fetch(request);
   if(!response.ok)return response;
   const payload=await response.json(),code=this.trialCode(payload.challengeId);
   return new Response(JSON.stringify({...payload,testCode:code,message:'Bandymo kodas rodomas ekrane. Laiškas nesiunčiamas.'}),{status:response.status,headers:response.headers});
  }
  if(request.method==='POST'&&path==='/api/madbeauty/rpc'){
   // Public testing reuses existing fictional identities and never accepts a new real contact.
   const length=Number(request.headers.get('content-length')||0);if(length>65536)return json({error:{code:'INVALID_INPUT'}},413);
  }
  return super.fetch(request);
 }
 async alarm(){if(expired(this.env)){await this.ctx.storage.deleteAlarm();return;}return super.alarm();}
}
function labelHtml(expiresAt){return `<aside style="background:#fff2b8;color:#171717;padding:12px 20px;text-align:center;font:600 14px/1.5 sans-serif" aria-label="Bandymo aplinka">LAIKINAS BANDYMAS · Visi meistrai, salonai, kainos ir atsiliepimai testiniai. Rezervacija nesukuria tikro vizito. Nenaudok tikrų klientų duomenų. <a href="/bandymo-paskyros">Bandymo paskyros</a> · <a href="https://madbeauty.lt">Madbeauty.lt</a><br>Bandymas galioja iki ${escape(new Date(expiresAt).toLocaleDateString('lt-LT',{timeZone:'Europe/Vilnius'}))}.</aside>`;}
function htmlResponse(html,status=200){return new Response(html,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'self'; connect-src 'self'; img-src 'self' blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-src https://www.openstreetmap.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",'X-Content-Type-Options':'nosniff'}});}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!valid(env)||url.origin!==origin)return deny();
 if(expired(env))return htmlResponse('<!doctype html><html lang="lt"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bandymas baigtas</title><h1>Laikinas bandymas baigtas</h1><a href="https://madbeauty.lt">Grįžti į Madbeauty.lt</a></html>',410);
 const source=env.PLATFORM.getByName('madbeauty-pilot-v1');
 const publicTestMedia=url.pathname.match(/^\/api\/madbeauty\/media\/([a-z0-9-]+\.webp)$/);
 if(publicTestMedia&&mediaPaths.has(publicTestMedia[1])&&['GET','HEAD'].includes(request.method)){
  const response=await env.ASSETS.fetch(new Request(new URL(mediaPaths.get(publicTestMedia[1]),url),request));
  const headers=new Headers(response.headers);headers.set('X-Robots-Tag','noindex, nofollow');return new Response(response.body,{status:response.status,headers});
 }
 if(url.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain','X-Robots-Tag':'noindex'}});
 if(['/sitemap.xml','/llms.txt','/llms-full.txt','/content-targets.json'].includes(url.pathname))return deny();
 if(url.pathname==='/boot.json')return json({siteId:'madbeauty',now:new Date().toISOString(),deployment:'temporary-live-test',enabled:false,privatePrototype:false,apiAvailable:true,retentionPolicy:env.RETENTION_POLICY_VERSION===RETENTION_POLICY.version?policyPublic():null,temporaryTest:{profiles:40,expiresAt:env.TRIAL_EXPIRES_AT},contact:{operatorName:'MB Pinet',email:'info@pinet.lt'}});
 if(url.pathname==='/providers.json')return ['GET','HEAD'].includes(request.method)?json({profiles:await source.publicProfiles()}):deny();
 if(url.pathname==='/bandymo-paskyros'){
  if(!['GET','HEAD'].includes(request.method))return deny();
  const profiles=await source.trialProfiles();
  const cards=profiles.map(o=>`<li><a href="/paskyra?bandymo_pastas=${encodeURIComponent('demo-provider-'+o.id.slice(9)+'@example.com')}">${escape(o.name)} · ${escape(o.city)} · ${o.kind==='solo'?'meistras':'salonas'}</a></li>`).join('');
  return htmlResponse(`<!doctype html><html lang="lt"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bandymo paskyros · Madbeauty</title><link rel="stylesheet" href="/app.css"><body>${labelHtml(env.TRIAL_EXPIRES_AT)}<main class="page container"><h1>Bandymo paskyros</h1><p>Pasirink paskyrą. Jos prisijungimo kodas rodomas ekrane. Tai ne el. pašto nuosavybės patikra.</p><p><a href="/paskyra?bandymo_pastas=demo-client-0%40example.com">Kliento paskyra</a> · <a href="/paskyra?bandymo_pastas=trial-operator%40example.com">Operatoriaus paskyra</a> · <a href="/paieska">Paslaugų paieška</a></p><ol>${cards}</ol></main></body></html>`);
 }
 if(assetPaths.has(url.pathname)&&!url.pathname.startsWith('/content-assets/')){
  if(!['GET','HEAD'].includes(request.method))return deny();
  const r=await env.ASSETS.fetch(request),result=new Response(r.body,r);result.headers.set('X-Robots-Tag','noindex, nofollow');return result;
 }
 let response;
 const directory=directoryRoute(url.pathname);
 const match=url.pathname.match(/^\/(meistrai|salonai)\/(demo-org-\d+)$/);
 if(directory&&['GET','HEAD'].includes(request.method)){
  const rows=directoryRows(directory,await source.publicProfiles(),{allowDemo:true});
  response=htmlResponse(template.replace('<p class="container">Įkeliama…</p>',renderDirectory(directory,rows,url.searchParams)).replace(/<title>[^<]*<\/title>/,`<title>${escape(directory.title)} · Madbeauty bandymas</title>`));
 }else if(match&&['GET','HEAD'].includes(request.method)){
  const profile=await source.profile(match[2]);if(!profile||profile.kind!==(match[1]==='meistrai'?'solo':'salon'))return deny();
  const body=renderPublicProfile(profile);
  response=htmlResponse(template.replace('<p class="container">Įkeliama…</p>',body));
 }else response=await app.fetch(request,env);
 const headers=new Headers(response.headers);headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Cache-Control','no-store');
 response=new Response(response.body,{status:response.status,headers});
 if(headers.get('Content-Type')?.includes('text/html'))return new HTMLRewriter().on('body',{element(e){e.prepend(labelHtml(env.TRIAL_EXPIRES_AT),{html:true});}}).on('#footer',{element(e){e.setInnerContent(renderFooter(),{html:true});}}).on('link[rel="canonical"],script[type="application/ld+json"]',{element(e){e.remove();}}).transform(response);
 return response;
}};
