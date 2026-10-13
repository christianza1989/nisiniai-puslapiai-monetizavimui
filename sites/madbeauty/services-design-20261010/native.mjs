import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {core} from '../release-20261010/pinned-core.mjs';
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),out=path.resolve(repo,'sites/madbeauty/cloudflare/output/services-release-20261010'),manifest=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8')),script=await readFile(path.join(out,'worker.mjs'),'utf8');
assert.equal(createHash('sha256').update(script).digest('hex'),manifest.artifactSha256);
const {Miniflare}=await import(pathToFileURL(path.join(core,'node_modules/miniflare/dist/src/index.js')));
const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],durableObjects:{PLATFORM:{className:'MadbeautyPlatform',useSQLite:true},ORGANIZATION_STAGING:{className:'MadbeautyOrganizationStaging',useSQLite:true}},bindings:{APP_ORIGIN:'https://madbeauty.lt',RELEASE_MODE:'production',RETENTION_POLICY_VERSION:'madbeauty-2026-10-10-v1',SESSION_SECRET:'local-native-services-acceptance-no-external-access'},serviceBindings:{ASSETS:async req=>{try{return new Response(await readFile(path.resolve(repo,'sites/madbeauty/cloudflare/output/assets-release','.'+new URL(req.url).pathname)));}catch{return new Response('Not found',{status:404});}}}});
let checks=0;
const request=p=>mf.dispatchFetch('https://madbeauty.lt'+p),get=async p=>{const r=await request(p);assert.equal(r.status,200,p);checks++;return r.text();};
try{
 const html=await get('/paslaugos');assert.equal((html.match(/class="services-category"/g)||[]).length,14);assert.equal((html.match(/<h1 /g)||[]).length,1);assert.ok(html.includes('/services.css'));assert.ok(!html.includes('Dizaino koncepcija'));
 for(const n of TAXONOMY_NODES.filter(n=>n.kind==='category'&&n.scope==='core')){assert.ok(html.includes('href="/paslaugos/'+n.id+'"'));assert.ok((await get('/paslaugos/'+n.id)).includes(n.label));}
 const result=await get('/paslaugos?q=antakiu%20laminavimas');assert.ok(result.includes('Susijusios procedūros'));assert.ok(result.includes('Antakių laminavimas'));assert.equal((result.match(/class="services-category"/g)||[]).length,1);
 assert.ok((await get('/paslaugos?q=zzzneregistruotapaslauga')).includes('Tokios paslaugos neradome'));
 const hostile=await get('/paslaugos?q='+encodeURIComponent('"><script>alert(1)</script>'));assert.ok(!hostile.includes('<script>alert(1)</script>'));
 assert.ok((await get('/paslaugos?q=manikiuras')).includes('Nagai'));
 assert.equal((await request('/paslaugos/not-a-service')).status,404);checks++;
 const assets=JSON.parse(await readFile(path.resolve(import.meta.dirname,'ASSET_MANIFEST.json'),'utf8'));
 assert.equal(assets.assets.length,16);for(const a of assets.assets)for(const v of a.variants){const r=await request('/'+v.file);assert.equal(r.status,200,v.file);assert.equal(createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),v.sha256);checks++;}
 await get('/services-media.mjs');await get('/services.css');await get('/app.mjs');
 const pkg=JSON.parse(await readFile(path.resolve(repo,'sites/madbeauty/cloudflare/output/content-package.json'),'utf8')),future=pkg.pages.filter(p=>Date.parse(p.publishAt)>Date.now());
 for(const p of future){assert.equal((await request('/'+p.slug)).status,404,p.slug);checks++;}
 const visible=await(await request('/content.json')).json();assert.equal(visible.pages.length,pkg.pages.length-future.length);
 const boot=await(await request('/boot.json')).json();assert.equal(boot.retentionPolicy.version,'madbeauty-2026-10-10-v1');checks+=2;
 await writeFile(path.join(out,'native.json'),JSON.stringify({state:'PASS',at:new Date().toISOString(),artifactSha256:manifest.artifactSha256,checks,categories:14,transparentAssets:16,variants:assets.assets.reduce((n,a)=>n+a.variants.length,0),futureHidden:future.length,sourceCommit:manifest.sourceCommit},null,2));
 console.log(JSON.stringify({state:'PASS',checks,categories:14,assets:16,futureHidden:future.length}));
}finally{await mf.dispose();}
