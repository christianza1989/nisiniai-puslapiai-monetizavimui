// Bounded read-only reception against the intended canonical host. No fake providers.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TAXONOMY_NODES} from '../prototype/taxonomy.mjs';
import {CITIES} from '../prototype/cities.mjs';
import {planTarget,resolveContentTarget} from '../prototype/content-targets.mjs';
const origin=process.argv[2]||'https://madbeauty.lt';assert.equal(origin,'https://madbeauty.lt');
const receipt=JSON.parse(await readFile(new URL('output/content-release-receipt.json',import.meta.url)));
async function get(path){const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.headers.get('x-madbeauty-content-sha256'),receipt.packageSha256,path);return {status:r.status,headers:r.headers,text:await r.text()};}
const r=await get('/content-targets.json');assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');const registry=JSON.parse(r.text),now=Date.now();assert.equal(registry.siteId,'madbeauty');assert.equal(registry.deployed,true);assert.ok(Date.parse(registry.generatedAt)<=now&&Date.parse(registry.expiresAt)>now);assert.ok(!/email|@|clientId|bookingId|practitionerId/.test(r.text));
const proof={origin,at:new Date(now).toISOString(),packageSha256:receipt.packageSha256,registryHash:createHash('sha256').update(r.text).digest('hex'),counts:{nodes:TAXONOMY_NODES.length,cities:CITIES.length,readyNational:0,readyLocal:0,plannedExtensions:0},routes:[],negative:[],indexEligible:0};
assert.equal(new Set(registry.routes.map(r=>r.routeRegistryId)).size,registry.routes.length);
const sitemap=await get('/sitemap.xml');assert.equal(sitemap.status,200);assert.ok(!sitemap.text.includes(origin+'/paslaugos'));
for(const node of TAXONOMY_NODES){const planned=planTarget({taxonomyNodeId:node.id}),resolved=resolveContentTarget({taxonomyNodeId:node.id},registry,{now});assert.equal(resolved.status,node.scope==='core'?'ready':'planned');assert.equal(resolved.indexEligible,false);if(node.scope==='extension')proof.counts.plannedExtensions++;else proof.counts.readyNational++;assert.equal(planned.canonicalUrl,origin+'/paslaugos/'+node.id);}
// Six simultaneous read requests, capped by the finite current registry.
const routes=registry.routes.filter(r=>r.status==='ready');
for(let i=0;i<routes.length;i+=6){await Promise.all(routes.slice(i,i+6).map(async route=>{const r=await get(route.canonicalPath);assert.equal(r.status,200,route.canonicalPath);assert.match(r.headers.get('x-robots-tag'),/noindex/);assert.ok(r.text.includes(`rel="canonical" href="${route.canonicalUrl}"`));assert.equal((r.text.match(/<h1(?:\s|>)/g)||[]).length,1);assert.ok(!r.text.includes('application/ld+json'));assert.ok(!r.text.includes('Įkeliama…'));assert.ok(r.text.includes('id="catalogue-city"'));assert.equal((r.text.match(/<option value="/g)||[]).length,104);if(route.cityId){proof.counts.readyLocal++;assert.match(r.text,/href="\/(meistrai|salonai)\/provider_/);}proof.routes.push({path:route.canonicalPath,status:200,indexEligible:false});}));}
for(const path of ['/paslaugos/unknown','/paslaugos/nagai/unknown','/content-assets/madbeauty/unknown.webp','/content-package.json','/runtime/platform.sqlite','/content-execution-20261007/DRAFT-V2.json']){const r=await get(path);assert.equal(r.status,404,path);assert.ok(!r.text.includes('rel="canonical"'));proof.negative.push({path,status:404});}
const absent=TAXONOMY_NODES.find(n=>n.kind==='treatment'&&n.scope==='core'&&!registry.routes.some(r=>r.taxonomyNodeId===n.id&&r.cityId));if(absent){const path='/paslaugos/'+absent.id+'/vilnius',r=await get(path);assert.equal(r.status,404,path);proof.negative.push({path,status:404});}
const extension=TAXONOMY_NODES.find(n=>n.scope==='extension'),ext=await get('/paslaugos/'+extension.id);assert.equal(ext.status,404);
const form=await get('/paslaugos/nagai?miestas=vilnius');assert.equal(form.status,303);assert.equal(form.headers.get('location'),origin+'/paslaugos/nagai/vilnius');
const privateIndex=process.argv.indexOf('--private-path');if(privateIndex>=0){const privatePath=process.argv[privateIndex+1];assert.match(privatePath,/^\/gidai\/[a-z0-9-]+$/);const privateArticle=await get(privatePath);assert.equal(privateArticle.status,404);assert.ok(!sitemap.text.includes(origin+privatePath));proof.privatePilot={path:privatePath,state:'not-approved-not-public'};}
await mkdir(new URL('output/',import.meta.url),{recursive:true});await writeFile(new URL('output/catalogue-verification.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,registryHash:proof.registryHash,routes:proof.routes.length,negative:proof.negative.length,pass:true}));
