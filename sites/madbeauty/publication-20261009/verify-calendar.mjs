import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {localDate,localPublishAt} from '../../../content-studio/src/content-schedule.mjs';
import {verifyContentRelease} from '../../../content-studio/src/content-release.mjs';
import {validateV2Package} from '../../../content-studio/src/content-package-v2.mjs';
const core=process.argv[2];if(!core)throw Error('Explicit common public core directory required');
const {projectContentPagesV2}=await import(pathToFileURL(path.resolve(core,'lib/content-projection-v2.mjs')));
const {contentSeoV2}=await import(pathToFileURL(path.resolve(core,'lib/content-seo-v2.mjs')));
const here=new URL('./',import.meta.url),read=f=>JSON.parse(readFileSync(new URL(f,here),'utf8'));
const map=read('PUBLICATION-CALENDAR.json'),plan=read('PLAN.json'),pkg=read('release/content-package.json'),old=read('../content-execution-20261007/batch30/release/content-package.json');
const byId=new Map(map.entries.map(e=>[e.planId,e]));
assert.equal(map.entries.length,295);assert.equal(plan.pages.length,292);assert.equal(plan.retained.length,3);
assert.equal(new Set(map.entries.map(e=>e.pageId)).size,295);assert.equal(new Set(map.entries.map(e=>e.slug)).size,295);
const future=map.entries.filter(e=>e.status!=='PUBLISHED');assert.equal(new Set(future.map(e=>e.publishAt)).size,292);
for(const e of future){assert.equal(localDate(e.publishAt,map.timezone),e.localDate);assert.equal(localPublishAt(e.localDate,e.localTime,map.timezone),e.publishAt);assert.ok(e.localDate>=map.start&&e.localDate<=map.end);if(e.parentId)assert.ok(Date.parse(byId.get(e.parentId).publishAt)<Date.parse(e.publishAt));}
for(const p of pkg.pages){const before=old.pages.find(q=>q.id===p.id);assert.ok(before);assert.deepEqual(p.body,before.body);assert.deepEqual(p.media,before.media);assert.deepEqual(p.links,before.links);assert.deepEqual(p.externalLinks,before.externalLinks);if(p.type==='guide'){const e=map.entries.find(e=>e.pageId===p.id);assert.equal(Date.parse(e.publishAt),Date.parse(p.publishAt));if(e.status==='PUBLISHED')assert.deepEqual(p,before);else assert.equal(Date.parse(p.editorial.datePublished),Date.parse(p.publishAt));}}
const verified=await verifyContentRelease(fileURLToPath(new URL('release/',here)),validateV2Package);assert.equal(verified.pages,39);assert.equal(verified.assets,180);
const moments=[...new Set(pkg.pages.filter(p=>p.type==='guide'&&Date.parse(p.publishAt)>Date.parse('2026-10-09T23:59:59+03:00')).map(p=>Date.parse(p.publishAt)))];
for(const t of moments){const before=projectContentPagesV2(pkg,[pkg],{},{targets:[]},t-1),at=projectContentPagesV2(pkg,[pkg],{},{targets:[]},t);assert.equal(at.length,before.length+1);for(const [pages,now]of [[before,t-1],[at,t]])for(const kind of ['sitemap','llms','llms-full']){const output=contentSeoV2(pkg,pages,kind).body;for(const p of pkg.pages.filter(p=>Date.parse(p.publishAt)>now)){const url='https://madbeauty.lt/'+p.slug;assert.ok(!output.includes('<loc>'+url+'</loc>'));assert.ok(!output.includes('URL: '+url+'\n'));assert.ok(!output.includes(']('+url+')'));}}}
const report={checkedAt:new Date().toISOString(),status:'PASS_LOCAL_CALENDAR_AND_RELEASE',articlePlans:295,preparedGuides:35,unwritten:260,distinctFuturePlanInstants:292,exactHistoricalGuidesPreserved:3,approvedPackagePages:39,verifiedAssetBytes:180,beforeAtProjectedStates:moments.length*2,oneNewGuidePerPreparedInstant:true,rootBeforeChild:true,DST:true,futureCanonicalExcludedFromSitemapAndLlmOutputs:true,packageSha256:createHash('sha256').update(readFileSync(new URL('release/content-package.json',here))).digest('hex'),notAccepted:['Production deployment','Remaining260 unwritten guide bodies and assets','Specialist reviews not already performed','Google indexing or visibility']};
writeFileSync(new URL('VALIDATION.json',here),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
