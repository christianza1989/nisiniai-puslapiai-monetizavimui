import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
const repo=path.resolve(import.meta.dirname,'../../..'),out=path.resolve(repo,'sites/madbeauty/cloudflare/output/services-release-20261010');
const manifest=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8'));
const receipt=JSON.parse(await readFile(path.join(out,'deployment.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
let checks=0;
async function request(p){return fetch('https://madbeauty.lt'+p,{redirect:'manual'});}
async function html(p){const r=await request(p);assert.equal(r.status,200,p);checks++;return r.text();}
const index=await html('/paslaugos');assert.equal((index.match(/class="services-category"/g)||[]).length,14);assert.ok(index.includes('/services.css'));assert.ok(index.includes('rel="canonical" href="https://madbeauty.lt/paslaugos"'));
for(const n of TAXONOMY_NODES.filter(n=>n.kind==='category'&&n.scope==='core'))assert.ok((await html('/paslaugos/'+n.id)).includes(n.label));
const search=await html('/paslaugos?q=antakiu%20laminavimas');assert.ok(search.includes('Antakių laminavimas'));assert.equal((search.match(/class="services-category"/g)||[]).length,1);
assert.ok((await html('/paslaugos?q=zzzneregistruotapaslauga')).includes('Tokios paslaugos neradome'));
assert.ok(!(await html('/paslaugos?q='+encodeURIComponent('"><script>alert(1)</script>'))).includes('<script>alert(1)</script>'));
const assetManifest=JSON.parse(await readFile(path.join(import.meta.dirname,'ASSET_MANIFEST.json'),'utf8'));
const variants=assetManifest.assets.flatMap(a=>a.variants);
const files=[...variants.map(v=>({file:v.file,sha256:v.sha256})),...['services.css','services-media.mjs','app.mjs','public-views.mjs'].map(file=>({file}))];
for(let i=0;i<files.length;i+=6)await Promise.all(files.slice(i,i+6).map(async v=>{
 const r=await request('/'+v.file);assert.equal(r.status,200,v.file);const bytes=Buffer.from(await r.arrayBuffer());
 const expected=v.sha256||hash(await readFile(path.resolve(repo,'sites/madbeauty/cloudflare/output/assets-release',v.file)));
 assert.equal(hash(bytes),expected,v.file);checks++;
}));
for(const p of ['/paslaugos/not-a-service','/services-design-20261010/ASSET_INPUTS.json','/design-previews/services-assets-20261010/originals/plaukai.png']){assert.equal((await request(p)).status,404,p);checks++;}
const pkg=JSON.parse(await readFile(path.resolve(repo,'sites/madbeauty/cloudflare/output/content-package.json'),'utf8'));
const future=pkg.pages.filter(p=>Date.parse(p.publishAt)>Date.now());
for(const p of [future[0],future.at(-1)]){assert.equal((await request('/'+p.slug)).status,404,p.slug);checks++;}
const content=await(await request('/content.json')).json();assert.equal(content.pages.length,7);checks++;
await writeFile(path.join(out,'live-http.json'),JSON.stringify({state:'PASS',at:new Date().toISOString(),version:receipt.version,artifactSha256:manifest.artifactSha256,checks,categories:14,variants:variants.length,moduleHashes:4,futureSamplesHidden:2,visiblePages:content.pages.length},null,2)+'\n');
console.log(JSON.stringify({state:'PASS',checks,categories:14,variants:variants.length,version:receipt.version}));
