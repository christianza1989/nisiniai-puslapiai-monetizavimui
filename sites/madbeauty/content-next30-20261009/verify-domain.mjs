// Read-only acceptance of this exact additional-content package.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),origin='https://madbeauty.lt';
const bytes=await fs.readFile(new URL('release/content-package.json',here));
const pkg=JSON.parse(bytes),sha=createHash('sha256').update(bytes).digest('hex');
assert.equal(sha,'320a8e0f50f1623cfa95e64bf2b3c16d96890cc998f587b114004d52bd581369');
const selection=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
const selected=new Set(selection.pages.map(p=>p.pageId));
const now=Date.now(),due=pkg.pages.filter(p=>Date.parse(p.publishAt)<=now),future=pkg.pages.filter(p=>Date.parse(p.publishAt)>now);
const fresh=pkg.pages.filter(p=>selected.has(p.id));assert.equal(fresh.length,19);
const feed=await fetch(origin+'/content.json',{cache:'no-store'});
const actual=feed.headers.get('x-madbeauty-content-sha256');
assert.equal(actual,sha,'Actual domain has not activated this exact package; no deployment claim');
assert.equal(feed.status,200);const publicData=await feed.json();
assert.deepEqual(publicData.pages.map(p=>p.slug).sort(),due.map(p=>p.slug).sort());
const publicMedia=new Set(due.flatMap(p=>p.media.map(m=>m.src)));
const privateMedia=[...new Set(fresh.flatMap(p=>p.media.map(m=>m.src)))].filter(src=>!publicMedia.has(src));
const paths=['/sitemap.xml','/llms.txt','/llms-full.txt',...due.map(p=>'/'+p.slug),...future.map(p=>'/'+p.slug),...privateMedia];
const responses=[];
for(let start=0;start<paths.length;start+=8){const batch=await Promise.allSettled(paths.slice(start,start+8).map(async path=>{const r=await fetch(origin+path,{cache:'no-store'});return {path,status:r.status,packageSha256:r.headers.get('x-madbeauty-content-sha256'),text:await r.text()};}));for(const r of batch){if(r.status!=='fulfilled')throw r.reason;responses.push(r.value);}}
for(const r of responses){
 if(['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(r.path)){assert.equal(r.status,200);for(const p of future)assert.ok(!r.text.includes(origin+'/'+p.slug),r.path+' excludes '+p.slug);}
 else if(due.some(p=>'/'+p.slug===r.path)){assert.equal(r.status,200,r.path);assert.ok(r.text.includes('Madbeauty'),r.path+' rendered');}
 else assert.equal(r.status,404,r.path+' remains private');
}
const receipt={status:'PASS_ACTUAL_DOMAIN',checkedAt:new Date().toISOString(),origin,packageSha256:sha,approvedAdditional:fresh.length,publicPages:due.length,publicGuides:due.filter(p=>p.type==='guide').length,futureGuidesHidden:future.length,newPrivateMediaHidden:privateMedia.length,uniqueAdditionalPublicationMoments:new Set(fresh.map(p=>p.publishAt)).size,checks:{exactDueSlugSet:true,futureGuides404:true,futureMedia404:true,futureCanonicalsExcludedFromDiscovery:true},limitations:['Future boundary rendering and runtime/core/version identity are supplied in separate owner consumer/deployment receipts','Does not claim specialist review of the eleven private articles or search indexing'],http:responses.map(({text,...r})=>r)};
await fs.writeFile(new URL('DOMAIN-ACCEPTANCE.json',here),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({...receipt,http:undefined}));
