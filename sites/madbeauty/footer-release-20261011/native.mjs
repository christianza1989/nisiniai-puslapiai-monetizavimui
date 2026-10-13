import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {core} from '../release-20261010/pinned-core.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),out=path.join(repo,'sites/madbeauty/cloudflare/output/footer-release-20261011'),kind=process.argv[2];assert.ok(['main','trial'].includes(kind));
const dir=path.join(out,kind),manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'))),script=await readFile(path.join(dir,'worker.mjs'),'utf8');assert.equal(createHash('sha256').update(script).digest('hex'),manifest.artifactSha256);
if(kind==='trial')execFileSync(process.execPath,['--test','sites/madbeauty/footer-release-20261011/trial.test.mjs'],{cwd:repo,stdio:'inherit'});
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js'))),trial=kind==='trial',origin=trial?'https://bandymas.madbeauty.lt':'https://madbeauty.lt',config=JSON.parse(await readFile(path.join(dir,'wrangler.json'))),persist=await mkdtemp(path.join(os.tmpdir(),'madbeauty-footer-'));
const mf=new Miniflare({modules:true,script,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,durableObjects:trial?{PLATFORM:{className:'TemporaryTestPlatform',useSQLite:true}}:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},ORGANIZATION_STAGING:{className:'MadbeautyOrganizationStaging',useSQLite:true}},durableObjectsPersist:persist,images:{binding:'IMAGES'},bindings:{...config.vars,SESSION_SECRET:'isolated-footer-native-no-production-access'},serviceBindings:{ASSETS:async req=>{const root=path.join(dir,'assets'),file=path.resolve(root,'.'+new URL(req.url).pathname);if(!file.startsWith(root+path.sep))return new Response('',{status:404});try{return new Response(await readFile(file));}catch{return new Response('',{status:404});}},MAIL_TRANSPORT:async()=>{throw Error('No real mail in native acceptance');}}});
let checks=0;
try{
 for(const route of ['/','/paslaugos','/paslaugos/ilgalaikis-makiazas','/salonai','/meistrai','/salonai/miestas/vilnius','/privatumas','/slapukai','/taisykles','/apie','/pagalba','/kontaktai','/redakcija','/meistrams','/tikrinimas','/gidai','/kaip-veikia','/meistrui/kalendorius']){
  const r=await mf.dispatchFetch(origin+route),html=await r.text();assert.equal(r.status,200,route);assert.match(html,/<footer id="footer"><div class="container mb-footer">/,route);assert.match(html,/aria-label="Teisinė informacija"/);assert.match(html,/mailto:info@pinet.lt/);
  if(trial){assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.ok(!html.includes('rel="canonical"'));assert.ok(!html.includes('application/ld+json'));}else if(['/','/paslaugos','/salonai','/meistrai'].includes(route))assert.match(html,/content="index,follow"/);
  checks++;
 }
 const projection=await (await mf.dispatchFetch(origin+'/providers.json')).json();assert.equal(projection.profiles.filter(p=>p.kind==='solo').length,trial?40:0);assert.equal(projection.profiles.filter(p=>p.kind==='salon').length,trial?5:0);checks++;
 if(trial){for(const p of projection.profiles){const route=(p.kind==='solo'?'/meistrai/':'/salonai/')+p.id,r=await mf.dispatchFetch(origin+route),html=await r.text();assert.equal(r.status,200,route);assert.match(html,/mb-footer/);assert.match(html,/gallery-grid/);assert.ok(!html.includes('application/ld+json'));assert.ok(!html.includes('rel="canonical"'));checks++;}assert.equal((await mf.dispatchFetch(origin+'/sitemap.xml')).status,404);assert.equal((await mf.dispatchFetch(origin+'/content-targets.json')).status,404);checks+=2;}
 await writeFile(path.join(dir,'native.json'),JSON.stringify({state:'PASS',kind,artifactSha256:manifest.artifactSha256,checks,bookingAndRestart:trial,canonicalWrites:0,realMail:0},null,2));console.log(JSON.stringify({state:'PASS',kind,checks,bookingAndRestart:trial}));
}finally{await mf.dispose();}
