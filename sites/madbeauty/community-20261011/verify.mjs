import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {core} from '../release-20261010/pinned-core.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),kind=process.argv[2],live=process.argv[3]==='live';assert.ok(['main','trial','review'].includes(kind));
const dir=path.join(repo,'sites/madbeauty/cloudflare/output/community-20261011',kind),trial=kind!=='main',origin={main:'https://madbeauty.lt',trial:'https://bandymas.madbeauty.lt',review:'https://perziura.madbeauty.lt'}[kind];
const hash=b=>createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'))),script=await readFile(path.join(dir,'worker.mjs'),'utf8');assert.equal(hash(script),manifest.artifactSha256);
let mf;
if(!live){const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js'))),config=JSON.parse(await readFile(path.join(dir,'wrangler.json')));mf=new Miniflare({modules:true,script,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,durableObjects:trial?{COMMUNITY:{className:'MadbeautyCommunity',useSQLite:true},PLATFORM:{className:'TemporaryTestPlatform',useSQLite:true}}:{COMMUNITY:{className:'MadbeautyCommunity',useSQLite:true},PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},ORGANIZATION_STAGING:{className:'MadbeautyOrganizationStaging',useSQLite:true}},images:{binding:'IMAGES'},durableObjectsPersist:await mkdtemp(path.join(os.tmpdir(),'madbeauty-home-')),bindings:{...config.vars,SESSION_SECRET:'local-credit-only-no-production-credentials'},serviceBindings:{ASSETS:async request=>{const root=path.join(dir,'assets'),file=path.resolve(root,'.'+new URL(request.url).pathname);if(!file.startsWith(root+path.sep))return new Response('',{status:404});try{return new Response(await readFile(file));}catch{return new Response('',{status:404});}}}});}
const get=url=>live?fetch(url):mf.dispatchFetch(url);let checks=0;
try{
 const homepage=await get(origin+'/'),home=await homepage.text();assert.equal(homepage.status,200);assert.equal((home.match(/class="home-service"/g)||[]).length,14);assert.match(home,/Madbeauty — Grožio laikas\. Tavo ritmu\./);checks++;
 const links=[...home.matchAll(/class="home-service" href="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(links).size,14);
 for(const link of links){const r=await get(origin+link);assert.equal(r.status,200,link);checks++;}
 const pictures=[...home.matchAll(/class="services-illustration" src="([^"]+)"/g)].map(m=>m[1]);assert.equal(pictures.length,15);
 for(const picture of pictures){const r=await get(origin+picture);assert.equal(r.status,200);const data=Buffer.from(await r.arrayBuffer());assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');checks++;}
 for(const route of ['/','/paslaugos','/salonai']){const r=await get(origin+route),html=await r.text();assert.equal(r.status,200);const footer=html.match(/<footer id="footer">([\s\S]*?)<\/footer>/)?.[1];assert.ok(footer);assert.match(footer,/<a href="https:\/\/verslomatika\.lt">verslomatika\.lt<\/a>/);if(trial){assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.ok(!html.includes('rel="canonical"'));}else{assert.match(html,/content="index,follow"/);assert.ok(!/noindex|nofollow/.test(r.headers.get('x-robots-tag')||''));}checks++;}
 for(const file of ['footer.mjs','public-views.mjs','profile-seo.mjs','services.css','app.css','catalogue-page.mjs','auth-entry.mjs','account-ui.mjs','profile-invite.mjs','app.mjs','community-ui.mjs','http-adapter.mjs','workspace-ui.mjs','profile-service-menu.mjs','search-results-ui.mjs','booking-ui.mjs','visit-sequence-ui.mjs','form-state.mjs','booking-channel-model.mjs','booking-channel-ui.mjs']){const asset=await get(origin+'/'+file);assert.equal(asset.status,200);assert.equal(hash(Buffer.from(await asset.arrayBuffer())),hash(await readFile(path.join(dir,'assets',file))));checks++;}
 const registry=JSON.parse(await readFile(path.join(dir,'assets/media.json'))),heroes=registry.assets.filter(a=>/^hero-.*-violet$/.test(a.id));assert.equal(heroes.length,6);
 for(const a of heroes)for(const v of a.variants){const r=await get(origin+'/'+v.file);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),v.sha256);checks++;}
 const authAssets=registry.assets.filter(a=>a.id.startsWith('auth-'));assert.equal(authAssets.length,2);for(const a of authAssets)for(const v of a.variants){const r=await get(origin+'/'+v.file);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),v.sha256);checks++;}
 const authPage=await get(origin+'/paskyra');assert.equal(authPage.status,200);assert.match(await authPage.text(),/noindex/);checks++;
 if(kind==='main'&&JSON.parse(await readFile(path.join(dir,'wrangler.json'))).vars.COMMUNITY_ENABLED==='true'){
  const boot=await(await get(origin+'/boot.json')).json();assert.equal(boot.communityEnabled,true);checks++;
  const session=await(await get(origin+'/api/madbeauty/session')).json();assert.equal(session.user,null);assert.equal(session.facebook.enabled,false);checks++;
  const page=await get(origin+'/bendruomene'),html=await page.text();assert.equal(page.status,200);assert.match(page.headers.get('x-robots-tag'),/noindex/);assert.ok(!html.includes('application/ld+json'));checks++;
  const privacy=await(await get(origin+'/privatumas')).text();assert.match(privacy,/Bendruomenės profilis, darbai ir idėjos/);assert.match(privacy,/12 kalendorinių mėnesių/);checks++;
  const options={method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({method:'feed',input:{}})},anonymous=live?await fetch(origin+'/api/madbeauty/community',options):await mf.dispatchFetch(origin+'/api/madbeauty/community',options);assert.equal(anonymous.status,401);checks++;
  const image=await get(origin+'/api/madbeauty/community-media?author=person:unknown&post=unknown&id=unknown');assert.equal(image.status,401);assert.equal(image.headers.get('cache-control'),'no-store');checks++;
  const providers=await(await get(origin+'/providers.json')).json();assert.ok(providers.profiles.every(p=>!p.isDemo&&!p.id.startsWith('demo-')));checks++;
 }
 if(trial){const projected=await(await get(origin+'/providers.json')).json();assert.equal(projected.profiles.filter(p=>p.kind==='solo').length,40);assert.equal(projected.profiles.filter(p=>p.kind==='salon').length,5);checks++;
  for(const p of projected.profiles){const r=await get(origin+(p.kind==='solo'?'/meistrai/':'/salonai/')+p.id),html=await r.text();assert.equal(r.status,200);assert.match(html,/Bandomieji atsiliepimai/);assert.ok(!html.includes('application/ld+json'));const count=(html.match(/\/5 · bandomasis atsiliepimas/g)||[]).length;assert.ok(count>=11&&count<=21,p.id+': '+count);checks++;}
 }
 await writeFile(path.join(dir,live?'live.json':'native.json'),JSON.stringify({state:'PASS',kind,checks,artifactSha256:manifest.artifactSha256,at:new Date().toISOString(),link:'https://verslomatika.lt',rel:null,trialRobotsPreserved:trial},null,2));console.log(JSON.stringify({state:'PASS',kind,live,checks}));
}finally{if(mf)await mf.dispose();}
