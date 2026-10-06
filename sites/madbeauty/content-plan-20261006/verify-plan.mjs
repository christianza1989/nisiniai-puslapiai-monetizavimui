import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {localDate,localPublishAt,scheduledPlan} from '../../../content-studio/src/content-schedule.mjs';
const read=x=>readFileSync(new URL(x,import.meta.url),'utf8');
const p=JSON.parse(read('PLAN.json')),schema=JSON.parse(read('../../../content-studio/schemas/plan-result.schema.json'));
const html=read('MADBEAUTY-6-MENESIU-PLANAS.html'),ids=new Set([...p.existing,...p.pages].map(x=>x.id)),byId=Object.fromEntries([...p.existing,...p.pages].map(x=>[x.id,x]));
assert.equal(p.pages.length,64);assert.equal(p.reviews.length,12);assert.equal(p.window.target,76);assert.equal(p.targetGap,12);
assert.equal(new Set(p.pages.map(x=>x.slug)).size,64);assert.equal(ids.size,p.existing.length+64);
const allDates=[...p.pages,...p.reviews].map(x=>x.publishDate).sort();assert.equal(new Set(allDates).size,76);
const coreDates=scheduledPlan(Array.from({length:76},()=>({type:'guide'})),[],p.policy,Date.parse('2026-10-06T12:00:00Z')).map(x=>x.publishAt.slice(0,10));
assert.deepEqual(allDates,coreDates);
const weekCounts={};
for(const x of p.pages){
 assert.ok(/^gidai\/[a-z0-9-]+$/.test(x.slug));assert.ok(!p.existing.some(e=>e.slug===x.slug));
 assert.equal(x.status,'PLAN_ONLY');assert.equal(x.imageBrief.status,'NOT_GENERATED');
 assert.equal(x.publishDate,localDate(x.publishAt,p.policy.timezone));assert.equal(x.publishAt,localPublishAt(x.publishDate,'10:00','Europe/Vilnius'));
 const week=Math.floor((Date.parse(x.publishDate+'T12:00Z')-Date.parse('1970-01-05T12:00Z'))/604800000);weekCounts[week]=(weekCounts[week]||0)+1;
 assert.ok(x.sourceIds.length>0&&x.sourceIds.every(id=>p.sources.some(s=>s.id===id)));
 assert.equal(x.outline.length,4);assert.ok(x.originalContribution.length>25&&x.requiredResearch.length>25);
 if(x.parentId){assert.ok(ids.has(x.parentId));assert.equal(x.pillarSlug,byId[x.parentId].slug);assert.ok(!byId[x.parentId].publishAt||byId[x.parentId].publishAt<=x.publishAt);}
 else assert.equal(x.pillarSlug,'');
 let current=x,visited=new Set();while(current.parentId){assert.ok(!visited.has(current.id),'Pillar hierarchy cycle');visited.add(current.id);current=byId[current.parentId];}
 assert.equal((html.match(new RegExp('id="'+x.id+'"','g'))||[]).length,1);
}
assert.ok(Object.values(weekCounts).every(n=>n<=3));assert.equal(Object.values(weekCounts).filter(n=>n===1).length,1);assert.ok(Object.values(weekCounts).filter(n=>n===2).length===12);
assert.equal(p.pages.find(x=>x.id==='M01').publishAt,'2026-10-13T07:00:00.000Z');
assert.equal(p.pages.find(x=>x.id==='M64').publishAt,'2027-04-06T07:00:00.000Z');
assert.ok(p.pages.some(x=>x.publishAt.endsWith('08:00:00.000Z')));
const linkKeys=new Set();for(const e of p.links){assert.ok(ids.has(e.from)&&ids.has(e.to));assert.notEqual(e.from,e.to);assert.ok(!linkKeys.has(e.from+'>'+e.to));linkKeys.add(e.from+'>'+e.to);assert.equal(e.status,'SUGGESTION_REQUIRES_REVIEW_AND_DEPLOY');assert.ok(e.anchor&&e.reason);for(const id of [e.from,e.to])if(byId[id].publishAt)assert.ok(e.activateNoEarlierThan>=byId[id].publishAt);assert.equal(e.targetPath,'/'+byId[e.to].slug);}
for(const x of p.pages)assert.ok(linkKeys.has('E-guides>'+x.id)&&linkKeys.has(x.id+'>'+x.ctaTargetId));
assert.equal(p.networkLinks.length,0);assert.equal(p.pages.filter(x=>x.seasonalHook).length,6);
// Evaluate the actual plan-result schema subset used here, including exact allowed keys, type, enum and pattern.
function validate(value,s,path='$'){
 if(s.type==='object'){assert.ok(value&&typeof value==='object'&&!Array.isArray(value),path);for(const k of s.required||[])assert.ok(Object.hasOwn(value,k),path+'.'+k);for(const [k,v]of Object.entries(value)){if(s.additionalProperties===false)assert.ok(Object.hasOwn(s.properties,k),path+' unexpected '+k);if(s.properties?.[k])validate(v,s.properties[k],path+'.'+k);}}
 if(s.type==='array'){assert.ok(Array.isArray(value),path);if(s.minItems!==undefined)assert.ok(value.length>=s.minItems);if(s.maxItems!==undefined)assert.ok(value.length<=s.maxItems);value.forEach((x,i)=>validate(x,s.items,path+'['+i+']'));}
 if(s.type==='string'){assert.equal(typeof value,'string',path);if(s.enum)assert.ok(s.enum.includes(value),path);if(s.pattern)assert.ok(new RegExp(s.pattern).test(value),path);}
}
let batchCount=0;for(let i=1;i<=3;i++){const b=JSON.parse(read('batches/plan-0'+i+'.json'));validate(b,schema);batchCount+=b.pages.length;for(const page of b.pages){const full=p.pages.find(x=>x.slug===page.slug);assert.ok(full);for(const [k,v]of Object.entries(page))assert.deepEqual(v,full[k]);}}assert.equal(batchCount,64);
const raw=readFileSync(new URL('../content/initial-release/content-package.json',import.meta.url));assert.equal(p.packageSha256,createHash('sha256').update(raw).digest('hex'));
assert.ok(!html.includes('undefined'));assert.ok(!html.includes('[object Object]'));
const report={checkedAt:'2026-10-06',status:'PLAN_STRUCTURE_PASS',articles:64,reviews:12,target:76,gap:12,links:p.links.length,checks:['Unique URL / date / ID and existing URL reconciliation','Core scheduler dates and Europe/Vilnius DST','2–3 article cadence and explicit review / target separation','Pillar chronology and hierarchy without cycles','Source references and brief / image planning status','Link targets, no self-links or duplicates, activation boundaries','All articles discoverable from /gidai and have truthful CTA route','Exact plan-result schema: 24 / 24 / 16; projection equals PLAN.json','HTML contains all 64 briefs and source / link data','Initial immutable package SHA unchanged'],notAccepted:['Unwritten article text, claims, medical/legal editorial approval','Images or their actual responsive media acceptance','Private studio state/import and actual future UUIDs','Deployment, ranking, search volume, qualified demand or ROI']};
writeFileSync(new URL('VALIDATION.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
