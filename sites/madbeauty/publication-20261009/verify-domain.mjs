// Independent read-only acceptance of the exact date-only package on its domain.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url);
const bytes=readFileSync(new URL('release/content-package.json',here));
const pkg=JSON.parse(bytes), sha=createHash('sha256').update(bytes).digest('hex');
const origin='https://madbeauty.lt',now=Date.now();
const due=pkg.pages.filter(p=>Date.parse(p.publishAt)<=now);
const future=pkg.pages.filter(p=>Date.parse(p.publishAt)>now);
assert.equal(sha,'bb1b90aa2929d9cc63607afb9b77977203eb9bc45031a6c8ae5e8775ce378511');
const paths=['/content.json','/sitemap.xml','/llms.txt','/llms-full.txt',...future.map(p=>'/'+p.slug)];
const results=await Promise.allSettled(paths.map(async path=>{
  const response=await fetch(origin+path,{cache:'no-store'});
  return {path,status:response.status,sha:response.headers.get('x-madbeauty-content-sha256'),text:await response.text()};
}));
assert.ok(results.every(r=>r.status==='fulfilled'),'Every HTTP request must complete');
const responses=results.map(r=>r.value),feed=responses[0];
assert.equal(feed.status,200);assert.equal(feed.sha,sha,'Actual domain must serve the new package');
const publicData=JSON.parse(feed.text);
assert.deepEqual(publicData.pages.map(p=>p.slug).sort(),due.map(p=>p.slug).sort());
for(const response of responses.slice(1,4)){
  assert.equal(response.status,200,response.path);
  for(const p of future)assert.ok(!response.text.includes(origin+'/'+p.slug),response.path+' excludes '+p.slug);
}
for(const response of responses.slice(4))assert.equal(response.status,404,response.path+' stays hidden until due');
const receipt={status:'PASS_ACTUAL_DOMAIN',checkedAt:new Date().toISOString(),origin,packageSha256:sha,publicPages:due.length,publicGuides:due.filter(p=>p.type==='guide').length,futureGuidesHidden:future.length,discoveryOutputs:['/sitemap.xml','/llms.txt','/llms-full.txt'],checks:{exactDueSlugSet:true,allFutureGuides404:true,futureCanonicalsExcludedFromDiscovery:true},limitations:['Future HTTP timing boundary acceptance is supplied separately by the platform owner','This receipt does not claim remaining 260 article bodies exist'],http:responses.map(({path,status,sha})=>({path,status,packageSha256:sha}))};
writeFileSync(new URL('DOMAIN-ACCEPTANCE.json',here),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,packageSha256:sha,publicPages:receipt.publicPages,publicGuides:receipt.publicGuides,futureGuidesHidden:receipt.futureGuidesHidden},null,2));
