import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {trialBrowser} from '../trial-20261010/operations-accept.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),out=path.join(repo,'sites/madbeauty/cloudflare/output/footer-release-20261011'),phase=process.argv[2],hash=b=>createHash('sha256').update(b).digest('hex');
async function publicData(){const browser=trialBrowser();await browser.request('session');const catalog=await browser.rpc('catalog'),ids=[...new Set(catalog.map(o=>o.organizationId))].sort(),profiles=[];for(const id of ids)profiles.push(await browser.rpc('profile',{id}));assert.equal(profiles.filter(p=>p.kind==='solo').length,40);assert.equal(profiles.filter(p=>p.kind==='salon').length,5);return {profiles,catalog};}
if(phase==='before-trial'){
 const data=await publicData(),boot=await(await fetch('https://bandymas.madbeauty.lt/boot.json')).json();assert.equal(boot.temporaryTest.expiresAt,'2026-10-16T21:10:47.982Z');await writeFile(path.join(out,'trial/public-before.private.json'),JSON.stringify({sha256:hash(JSON.stringify(data)),data}));console.log(JSON.stringify({state:'TRIAL_DATA_CAPTURED',solos:40,salons:5,expiresAt:boot.temporaryTest.expiresAt}));
}else{
 assert.ok(['main','trial'].includes(phase));const trial=phase==='trial',origin=trial?'https://bandymas.madbeauty.lt':'https://madbeauty.lt',dir=path.join(out,phase),manifest=JSON.parse(await readFile(path.join(dir,'manifest.json')));let checks=0;
 const get=async route=>{const r=await fetch(origin+route);return {r,html:await r.text()};};
 for(const route of ['/','/paslaugos','/salonai','/meistrai','/salonai/miestas/vilnius','/paslaugos/ilgalaikis-makiazas','/paslaugos/veido-kaukes-maitinamoji-veido-procedura','/privatumas','/slapukai','/taisykles','/meistrams','/meistrui/kalendorius','/kontaktai','/apie','/redakcija','/tikrinimas','/gidai','/pagalba','/kaip-veikia']){
  const {r,html}=await get(route);assert.equal(r.status,200,route);assert.match(html,/<footer id="footer"><div class="container mb-footer">/);assert.match(html,/mailto:info@pinet.lt/);
  if(trial){assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.ok(!html.includes('rel="canonical"'));assert.ok(!html.includes('application/ld+json'));}else if(['/','/paslaugos','/salonai','/meistrai'].includes(route))assert.match(html,/content="index,follow"/);checks++;
 }
 for(const file of ['app.mjs','app.css','footer.mjs','search-select.mjs','provider-directory.mjs','profile-seo.mjs','services.css','catalogue-page.mjs']){const r=await fetch(origin+'/'+file);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile(path.join(dir,'assets',file))));checks++;}
 if(trial){
  const before=JSON.parse(await readFile(path.join(dir,'public-before.private.json'))),data=await publicData();assert.equal(hash(JSON.stringify(data)),before.sha256,'Existing public profiles offers galleries and reviews preserved');checks++;
  const projected=await(await fetch(origin+'/providers.json')).json();assert.equal(projected.profiles.filter(p=>p.kind==='solo').length,40);assert.equal(projected.profiles.filter(p=>p.kind==='salon').length,5);checks++;
  for(const p of data.profiles){const {r,html}=await get((p.kind==='solo'?'/meistrai/':'/salonai/')+p.id);assert.equal(r.status,200);assert.match(html,/gallery-grid/);assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.ok(!html.includes('rel="canonical"'));assert.ok(!html.includes('application/ld+json'));checks++;}
  for(const v of [manifest.mediaProof[0],manifest.mediaProof[200],manifest.mediaProof.at(-1)]){const r=await fetch(origin+v.path);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),v.sha256);checks++;}
  for(const route of ['/sitemap.xml','/llms.txt','/content-targets.json','/private-originals/profiles-v2/profile-01-portrait.png']){assert.equal((await fetch(origin+route)).status,404);checks++;}
  const boot=await(await fetch(origin+'/boot.json')).json();assert.equal(boot.temporaryTest.expiresAt,manifest.expiresAt);assert.match((await get('/robots.txt')).html,/Disallow: \//);checks+=2;
 }else{const {r,html}=await get('/sitemap.xml');assert.equal(r.status,200);assert.ok(!html.includes('demo-org-'));checks++;}
 await writeFile(path.join(dir,'live.json'),JSON.stringify({state:'PASS',kind:phase,at:new Date().toISOString(),checks,artifactSha256:manifest.artifactSha256,profilesPreserved:trial?45:null,realMail:0,paymentWrites:0},null,2));console.log(JSON.stringify({state:'PASS',kind:phase,checks,profilesPreserved:trial?45:null}));
}
