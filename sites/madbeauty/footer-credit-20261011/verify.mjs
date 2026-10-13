import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {core} from '../release-20261010/pinned-core.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),kind=process.argv[2],live=process.argv[3]==='live',dir=path.join(repo,'sites/madbeauty/cloudflare/output/footer-credit-20261011',kind),trial=kind==='trial',origin=trial?'https://bandymas.madbeauty.lt':'https://madbeauty.lt';assert.ok(['main','trial'].includes(kind));
const hash=b=>createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'))),script=await readFile(path.join(dir,'worker.mjs'),'utf8');assert.equal(hash(script),manifest.artifactSha256);
let mf;
if(!live){const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js'))),config=JSON.parse(await readFile(path.join(dir,'wrangler.json')));mf=new Miniflare({modules:true,script,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,durableObjects:trial?{PLATFORM:{className:'TemporaryTestPlatform',useSQLite:true}}:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},ORGANIZATION_STAGING:{className:'MadbeautyOrganizationStaging',useSQLite:true}},durableObjectsPersist:await mkdtemp(path.join(os.tmpdir(),'madbeauty-credit-')),bindings:{...config.vars,SESSION_SECRET:'local-credit-only-no-production-credentials'},serviceBindings:{ASSETS:async request=>{const root=path.join(dir,'assets'),file=path.resolve(root,'.'+new URL(request.url).pathname);if(!file.startsWith(root+path.sep))return new Response('',{status:404});try{return new Response(await readFile(file));}catch{return new Response('',{status:404});}}}});}
const get=url=>live?fetch(url):mf.dispatchFetch(url);let checks=0;
try{
 for(const route of ['/','/paslaugos','/salonai']){const r=await get(origin+route),html=await r.text();assert.equal(r.status,200);const footer=html.match(/<footer id="footer">([\s\S]*?)<\/footer>/)?.[1];assert.ok(footer);assert.match(footer,/<a href="https:\/\/verslomatika\.lt">verslomatika\.lt<\/a>/);if(trial){assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.ok(!html.includes('rel="canonical"'));}else{assert.match(html,/content="index,follow"/);assert.ok(!/noindex|nofollow/.test(r.headers.get('x-robots-tag')||''));}checks++;}
 const asset=await get(origin+'/footer.mjs');assert.equal(asset.status,200);assert.equal(hash(Buffer.from(await asset.arrayBuffer())),hash(await readFile(path.join(dir,'assets/footer.mjs'))));checks++;
 await writeFile(path.join(dir,live?'live.json':'native.json'),JSON.stringify({state:'PASS',kind,checks,artifactSha256:manifest.artifactSha256,at:new Date().toISOString(),link:'https://verslomatika.lt',rel:null,trialRobotsPreserved:trial},null,2));console.log(JSON.stringify({state:'PASS',kind,live,checks}));
}finally{if(mf)await mf.dispose();}
