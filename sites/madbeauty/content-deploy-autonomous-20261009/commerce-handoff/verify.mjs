// Read-only handoff of the actual public registry; no taxonomy-only ready targets.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TAXONOMY_NODES} from '../../prototype/taxonomy.mjs';
import {CITIES} from '../../prototype/cities.mjs';
import {resolveContentTarget} from '../../prototype/content-targets.mjs';
const origin='https://madbeauty.lt';
const receipt=JSON.parse(await readFile(new URL('../RECEIPT.json',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const file=name=>new URL(name,import.meta.url);
async function get(path){
  const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(response.headers.get('x-madbeauty-content-sha256'),receipt.packageSha256,path);
  return {status:response.status,headers:response.headers,bytes,text:bytes.toString('utf8')};
}
const received=await get('/content-targets.json');
assert.equal(received.status,200);assert.equal(received.headers.get('cache-control'),'no-store');
const registry=JSON.parse(received.text),startedAt=new Date().toISOString();
assert.equal(registry.siteId,'madbeauty');assert.equal(registry.deployed,true);
assert.ok(Date.parse(registry.generatedAt)<=Date.now()&&Date.parse(registry.expiresAt)>Date.now());
assert.equal(registry.taxonomyVersion,'2026-10-06-v1');
assert.equal(new Set(registry.routes.map(r=>r.routeRegistryId)).size,registry.routes.length);
const nodes=new Map(TAXONOMY_NODES.map(n=>[n.id,n]));
const ready=registry.routes.filter(r=>r.status==='ready');
const contexts=[];
for(const route of registry.routes){
  const node=nodes.get(route.taxonomyNodeId);assert.ok(node,route.taxonomyNodeId);
  const resolved=resolveContentTarget({taxonomyNodeId:node.id,cityId:route.cityId},registry,{now:Date.now()});
  assert.equal(resolved.status,route.status);
  assert.equal(route.indexEligible,false);
  assert.ok(!/[?#]/.test(route.canonicalUrl));
  contexts.push({...route,kind:node.kind,parentId:node.parentId,categoryId:node.categoryId,
    path:node.path,scope:node.scope,purpose:'information',
    hasApprovedCityRoutes:registry.routes.some(r=>r.taxonomyNodeId===node.id&&r.cityId&&r.status==='ready')});
}
assert.equal(registry.targets.length,ready.length);
for(const target of registry.targets){assert.deepEqual(target.allowedQueryParams,[]);assert.equal(target.purpose,'information');}
const expectedOptions=['',...CITIES.map(([id])=>id)].sort();
const checks=[];
for(let i=0;i<ready.length;i+=6){
  await Promise.all(ready.slice(i,i+6).map(async route=>{
    const r=await get(route.canonicalPath);assert.equal(r.status,200,route.canonicalPath);
    assert.match(r.headers.get('x-robots-tag'),/noindex/);
    assert.ok(r.text.includes(`rel="canonical" href="${route.canonicalUrl}"`));
    assert.equal((r.text.match(/<h1(?:\s|>)/g)||[]).length,1);
    assert.ok(!r.text.includes('application/ld+json'));
    const select=r.text.match(/<select[^>]*id="catalogue-city-select"[^>]*>([\s\S]*?)<\/select>/);
    assert.ok(select,route.canonicalPath);
    assert.deepEqual([...select[1].matchAll(/<option value="([^"]*)"/g)].map(m=>m[1]).sort(),expectedOptions);
    const providerLinks=(r.text.match(/href="\/(?:meistrai|salonai)\/provider_/g)||[]).length;
    const context=contexts.find(c=>c.routeRegistryId===route.routeRegistryId);
    const emptySupply=r.text.includes('Šiai paslaugai paskelbtų pasiūlymų šiuo metu nėra');
    if(route.cityId)assert.ok(providerLinks>0);
    else if(!context.hasApprovedCityRoutes)assert.ok(emptySupply,route.canonicalPath);
    checks.push({routeRegistryId:route.routeRegistryId,url:route.canonicalUrl,status:r.status,
      indexEligible:false,cities:CITIES.length,providerLinks,emptySupply});
  }));
}
const sitemap=await get('/sitemap.xml');assert.equal(sitemap.status,200);assert.ok(!sitemap.text.includes(origin+'/paslaugos'));
const extension=registry.routes.find(r=>r.status==='planned'&&!r.cityId);
const absent=ready.find(r=>!r.cityId&&!contexts.find(c=>c.routeRegistryId===r.routeRegistryId).hasApprovedCityRoutes);
const negatives=[];
for(const path of [extension.canonicalPath,absent.canonicalPath+'/vilnius','/paslaugos/unknown','/paslaugos/nagai/unknown']){
  const r=await get(path);assert.equal(r.status,404,path);negatives.push({path,status:r.status});
}
assert.ok(Date.parse(registry.expiresAt)>Date.now(),'Registry expired during verification; fetch again.');
checks.sort((a,b)=>a.url.localeCompare(b.url));
const context={schemaVersion:1,siteId:'madbeauty',registryUrl:origin+'/content-targets.json',
  registrySha256:sha(received.bytes),generatedAt:registry.generatedAt,expiresAt:registry.expiresAt,
  routes:contexts,cities:CITIES.map(([id,label])=>({id,label,status:'selection-only',canonicalUrl:null})),
  localTargets:registry.routes.filter(r=>r.cityId&&r.status==='ready'),
  usage:'Refresh the public registry before revision-bound review/export. National targets are informational and noindex. Cities are selector choices; only ready localTargets establish published city supply.'};
const contextBytes=Buffer.from(JSON.stringify(context,null,2)+'\n');
const proof={state:'PASS',startedAt,finishedAt:new Date().toISOString(),origin,
  baselineProductionVersion:receipt.productionVersion,packageSha256:receipt.packageSha256,
  runtimeSource:receipt.runtimeSource,coreSource:receipt.coreSource,
  registry:{url:origin+'/content-targets.json',status:received.status,cacheControl:received.headers.get('cache-control'),
    sha256:sha(received.bytes),generatedAt:registry.generatedAt,expiresAt:registry.expiresAt},
  contextSha256:sha(contextBytes),counts:{routes:registry.routes.length,readyNational:ready.filter(r=>!r.cityId).length,
    readyLocal:ready.filter(r=>r.cityId).length,planned:registry.routes.filter(r=>r.status==='planned').length,
    cities:CITIES.length,indexEligible:registry.routes.filter(r=>r.indexEligible).length,
    readyKinds:Object.fromEntries(['category','group','treatment'].map(kind=>[kind,contexts.filter(r=>r.status==='ready'&&r.kind===kind).length]))},
  sitemap:{status:sitemap.status,catalogueExcluded:true},routes:checks,negative:negatives};
await writeFile(file('content-targets.json'),received.bytes);
await writeFile(file('catalogue-context.json'),contextBytes);
await writeFile(file('VERIFICATION.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify({...proof,routes:checks.length},null,2));
