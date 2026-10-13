import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {repo,out,core,json,hash,save} from './common.mjs';
const mode=process.argv[2],kind=process.env.MADBEAUTY_RELEASE_KIND||'main';assert.ok(['native','live'].includes(mode));
const m=await json(path.join(out,'manifest.json')),c=await json(path.join(out,'wrangler.json')),origin=c.vars.APP_ORIGIN;
let mf;if(mode==='native'){const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));mf=new Miniflare({modules:true,script:await readFile(path.join(out,'worker.mjs'),'utf8'),compatibilityDate:c.compatibility_date,compatibilityFlags:c.compatibility_flags,durableObjects:Object.fromEntries(c.durable_objects.bindings.map(x=>[x.name,{className:x.class_name,useSQLite:true}])),bindings:{...c.vars,SESSION_SECRET:'isolated-favicon-only-acceptance'},images:{binding:'IMAGES'},serviceBindings:{MAIL_TRANSPORT:()=>new Response('',{status:204}),ASSETS:async r=>{const file=path.resolve(out,'assets','.'+new URL(r.url).pathname);assert.ok(file.startsWith(path.join(out,'assets')+path.sep));try{return new Response(await readFile(file),{headers:{'Content-Type':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.ico')?'image/x-icon':file.endsWith('.png')?'image/png':'application/octet-stream'}});}catch(e){if(e.code!=='ENOENT')throw e;return new Response('',{status:404});}}}});}
const fetchRoute=p=>mf?mf.dispatchFetch(origin+p):fetch(origin+p,{signal:AbortSignal.timeout(30000)});
try{
 const checks=[];for(const x of m.faviconAssets){for(const query of ['', '?v=20261013']){const r=await fetchRoute('/'+x.file+query);assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),x.sha256);assert.ok(r.headers.get('content-type').startsWith(x.file.endsWith('.svg')?'image/svg+xml':x.file.endsWith('.ico')?'image/x-icon':'image/png'));checks.push({path:'/'+x.file+query,status:200,sha256:x.sha256});}}
 const html=await (await fetchRoute('/')).text();assert.ok(html.includes('href="/favicon.svg?v=20261013"'));assert.ok(html.includes('href="/apple-touch-icon.png?v=20261013"'));assert.ok(!html.includes('rel="icon" href="/wordmark.svg"'));
 const wordmark=await fetchRoute('/wordmark.svg');assert.equal(hash(Buffer.from(await wordmark.arrayBuffer())),hash(await readFile(path.join(out,'assets/wordmark.svg'))));
 const ico=await readFile(path.join(out,'assets/favicon.ico'));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);assert.deepEqual([ico[6],ico[22],ico[38]],[16,32,48]);
 if(kind==='trial'){const profiles=await (await fetchRoute('/providers.json')).json();assert.equal(profiles.profiles.filter(x=>x.kind==='solo').length,40);assert.equal(profiles.profiles.filter(x=>x.kind==='salon').length,5);}
 await save('favicon-'+mode+'.json',{state:'PASS',at:new Date().toISOString(),artifactSha256:m.artifactSha256,kind,checks,originalWordmarkPreserved:true,multiFrameIco:true});console.log(JSON.stringify({state:'PASS',mode,kind,checks:checks.length}));
}finally{await mf?.dispose();}
