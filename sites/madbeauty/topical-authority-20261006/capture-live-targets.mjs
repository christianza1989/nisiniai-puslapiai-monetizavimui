// Bounded read-only public deployment evidence. No registry readiness synthesis.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out=process.argv[2];if(!out)throw Error('Explicit private raw-evidence directory required.');
mkdirSync(out,{recursive:true});
const dir=import.meta.dirname,base='https://madbeauty.lt',sha=b=>createHash('sha256').update(b).digest('hex');
async function capture(url,name){const r=await fetch(url,{redirect:'manual'}),body=Buffer.from(await r.arrayBuffer());writeFileSync(path.join(out,name),body);return {status:r.status,contentType:r.headers.get('content-type'),cacheControl:r.headers.get('cache-control'),bodySha256:sha(body),text:body.toString('utf8')};}
const raw=await capture(base+'/content-targets.json','registry.json');assert.equal(raw.status,200);assert.equal(raw.cacheControl,'no-store');
const registry=JSON.parse(raw.text);assert.equal(registry.siteId,'madbeauty');assert.equal(registry.deployed,true);assert.ok(Date.parse(registry.expiresAt)>Date.now());
const planned=JSON.parse(readFileSync(path.join(dir,'REGISTRY_PLANNED_SNAPSHOT.json'),'utf8'));
assert.deepEqual(registry.routes.map(x=>x.routeRegistryId).sort(),planned.routes.map(x=>x.routeRegistryId).sort());
const routesById=new Map(registry.routes.map(x=>[x.routeRegistryId,x]));
const attrs=(tag,key)=>tag.match(new RegExp('\\b'+key+'=["\u0027]([^"\u0027]*)["\u0027]','i'))?.[1]??null;
const htmlMeta=text=>({title:text.match(/<title>([^<]*)<\/title>/i)?.[1]??null,h1:text.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g,'')??null,canonical:attrs((text.match(/<link\b[^>]*>/gi)||[]).find(x=>attrs(x,'rel')==='canonical')||'','href'),robots:attrs((text.match(/<meta\b[^>]*>/gi)||[]).find(x=>attrs(x,'name')==='robots')||'','content'),cityOptions:(text.match(/<option\b[^>]*value=["\u0027][^"\u0027]+["\u0027]/gi)||[]).length});
const samples=[];
for(const id of ['mb:catalog:kirpimai-moteru-kirpimas','mb:catalog:manikiuras']){
 const route=routesById.get(id),target=registry.targets.find(t=>t.id===id);assert.equal(route.status,'ready');assert.equal(route.indexEligible,false);assert.equal(target.canonicalUrl,route.canonicalUrl);
 const h=await capture(route.canonicalUrl,id.split(':').at(-1)+'.html'),meta=htmlMeta(h.text);assert.equal(h.status,200);assert.equal(meta.canonical,route.canonicalUrl);assert.ok(meta.robots?.includes('noindex'));assert.ok(meta.h1);assert.equal(meta.cityOptions,103);
 samples.push({routeRegistryId:id,url:route.canonicalUrl,httpStatus:h.status,bodySha256:h.bodySha256,...meta,targetSnapshot:{...target}});
}
const empty=await capture(base+'/paslaugos/kirpimai-moteru-kirpimas/vilnius','empty-local.html');assert.equal(empty.status,404);assert.ok(!registry.targets.some(t=>t.id==='mb:catalog:kirpimai-moteru-kirpimas:vilnius'));
const sitemap=await capture(base+'/sitemap.xml','sitemap.xml');assert.equal(sitemap.status,200);assert.ok(!sitemap.text.includes('/paslaugos/'));
const result={checkedAt:new Date().toISOString(),clientDate:'2026-10-07',status:'LIVE_RESOLVER_AND_TWO_NATIONAL_SAMPLES_VERIFIED_LOCAL_EMPTY_NOT_READY',registry:{httpStatus:raw.status,cacheControl:raw.cacheControl,bodySha256:raw.bodySha256,version:registry.version,taxonomyVersion:registry.taxonomyVersion,generatedAt:registry.generatedAt,expiresAt:registry.expiresAt,deployed:true,routes:registry.routes.length,readyNational:registry.routes.filter(r=>r.status==='ready'&&!r.cityId).length,plannedNational:registry.routes.filter(r=>r.status==='planned'&&!r.cityId).length,readyLocal:registry.routes.filter(r=>r.status==='ready'&&r.cityId).length,indexEligible:registry.routes.filter(r=>r.indexEligible).length,idsMatchPlannedSnapshot:true},samples,emptyLocal:{url:base+'/paslaugos/kirpimai-moteru-kirpimas/vilnius',httpStatus:404,bodySha256:empty.bodySha256,hrefReady:false},sitemap:{httpStatus:sitemap.status,bodySha256:sitemap.bodySha256,catalogueUrls:0},limits:['Independent check covers resolver identity/freshness, two national SSR routes and one empty local result; not all257 routes.','National functional browse is noindex, not proof of Google positions or approved supply.','Captured snapshot expires; actual fresh runtime registry is required for rendered typed destinations.','Does not approve a new article, V2 package, authentication, booking, clinical claims or deployment by this content session.'],newPaidUsd:0};
writeFileSync(path.join(dir,'LIVE_TARGET_REVIEW.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,nationalReady:result.registry.readyNational,nationalPlanned:result.registry.plannedNational,localReady:result.registry.readyLocal,indexEligible:result.registry.indexEligible,samples:samples.length,newPaidUsd:0}));
