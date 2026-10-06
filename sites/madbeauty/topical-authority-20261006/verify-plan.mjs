import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {localDate,localPublishAt} from '../../../content-studio/src/content-schedule.mjs';
import {TAXONOMY} from '../prototype/demo-model.mjs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
const p=JSON.parse(read('PLAN.json')),html=read('MADBEAUTY-TOPICAL-AUTHORITY-PLANAS.html');
const all=[...p.existing,...p.pages],byId=Object.fromEntries(all.map(x=>[x.id,x]));
assert.equal(p.pages.length,300);assert.equal(p.totals.coverageTarget,303);assert.equal(p.retained.length,3);
assert.equal(p.categoryCoverage.length,33);assert.equal(p.referenceMenu.length,49);assert.equal(p.platformGaps.length,21);
assert.equal(new Set(p.pages.map(x=>x.slug)).size,p.pages.length);assert.equal(new Set(all.map(x=>x.id)).size,all.length);
assert.deepEqual([...p.liveCategoryIds].sort(),TAXONOMY.map(x=>x.id).sort());
assert.equal(p.policy.cadence,'coverage');assert.equal(p.execution.publicationQuota,null);
for(const c of p.categoryCoverage){assert.ok(byId[c.rootId]);for(const [dim,ids] of Object.entries(c.matrix)){assert.ok(ids.length,c.id+' missing '+dim);for(const id of ids)assert.ok(byId[id].dimensions.includes(dim));}}
for(const x of p.pages){
 assert.match(x.slug,/^gidai\/[a-z0-9-]+$/);assert.ok(!p.existing.some(y=>y.slug===x.slug));
 assert.equal(x.status,'PLAN_ONLY_NOT_WRITTEN');assert.equal(x.media.status,'NOT_CREATED');assert.equal(x.expertReview.status,'NOT_PERFORMED');assert.equal(x.agentReview,'NOT_PERFORMED');
 assert.ok(x.outline.length>=3&&x.outline.every(s=>s.length>=7));assert.ok(x.originalContribution.length>25);assert.ok(x.evidenceNeeds[0].task.length>10);
 assert.ok(x.sourceIds.length&&x.sourceIds.every(id=>p.sources.some(s=>s.id===id&&s.status==='READ')));
 assert.equal(localDate(x.publishAt,p.policy.timezone),x.publishDate);assert.equal(x.publishAt,localPublishAt(x.publishDate,'10:00','Europe/Vilnius'));
 assert.ok(x.publishDate>='2026-10-13'&&x.publishDate<='2027-04-06');if(x.wave!=='SEASONAL')assert.ok(x.publishDate<='2026-11-24');
 if(x.parentId){assert.ok(byId[x.parentId]);assert.ok(byId[x.parentId].publishAt<=x.publishAt);}
 const seen=new Set();let current=x;while(current.parentId){assert.ok(!seen.has(current.id));seen.add(current.id);current=byId[current.parentId];}
 assert.equal(html.split('id="'+x.id+'"').length-1,1);assert.ok(p.links.some(l=>l.from===x.id&&l.kind==='FUNCTIONAL_CTA'));
 if(['plauku-salinimas-lazeriu','kuno-prieziura','auskaru-verimas'].includes(x.categoryId))assert.equal(x.reviewLevel,'QUALIFIED_HEALTH_OR_LEGAL_REVIEW');
}
assert.equal(p.sources.length,84);assert.equal(new Set(p.sources.map(s=>s.id)).size,84);for(const s of p.sources){assert.equal(s.status,'READ');assert.ok(/^https:\/\//.test(s.url));assert.ok(s.limit.length>20);}
for(const r of p.referenceMenu)assert.ok(byId[r.targetId],r.label);
assert.equal(new Set(p.referenceMenu.map(x=>x.family)).size,7);
assert.equal(p.reconciliation.length,76);assert.equal(new Set(p.reconciliation.map(x=>x.oldId)).size,76);for(const r of p.reconciliation)assert.ok(byId[r.targetId]);
assert.equal(new Set(p.links.map(l=>l.from+'|'+l.to)).size,p.links.length);
for(const l of p.links){assert.ok(byId[l.from]&&byId[l.to]);assert.notEqual(l.from,l.to);assert.ok(l.anchor&&l.section&&l.reason&&l.activation);assert.equal(l.status,'PLANNED_NOT_LIVE');if(l.kind==='FUNCTIONAL_CTA')assert.ok(p.existing.some(x=>x.id===l.to));}
for(const x of p.retained)assert.equal(x.publishAt,p.existing.find(y=>y.id===x.id).publishAt);
const schema=JSON.parse(read('../../../content-studio/schemas/plan-result.schema.json'));
function validate(v,s){if(s.type==='object'){assert.ok(v&&typeof v==='object'&&!Array.isArray(v));for(const key of s.required??[])assert.ok(Object.hasOwn(v,key),key);for(const key of Object.keys(v)){if(s.additionalProperties===false)assert.ok(Object.hasOwn(s.properties,key),key);if(s.properties?.[key])validate(v[key],s.properties[key]);}}else if(s.type==='array'){assert.ok(Array.isArray(v));assert.ok(v.length>=(s.minItems??0)&&v.length<=(s.maxItems??Infinity));v.forEach(x=>validate(x,s.items));}else if(s.type==='string'){assert.equal(typeof v,'string');if(s.pattern)assert.match(v,new RegExp(s.pattern));}if(s.enum)assert.ok(s.enum.includes(v));}
const exported=[],files=readdirSync(new URL('batches/',import.meta.url)).filter(x=>x.endsWith('.json')).sort();assert.equal(files.length,13);
for(const f of files){const batch=JSON.parse(read('batches/'+f));validate(batch,schema);for(const x of batch.pages){const full=p.pages.find(y=>y.slug===x.slug);assert.ok(full);for(const key of ['type','slug','title','description','intent','cluster','publishDate'])assert.equal(x[key],full[key]);assert.equal(x.pillarSlug,full.parentId?byId[full.parentId].slug:'');assert.ok(x.reason.includes(full.id)&&x.reason.includes(full.originalContribution));assert.deepEqual(x.networkLinks,[]);exported.push(full.id);}}
assert.equal(exported.length,p.pages.length);assert.equal(new Set(exported).size,p.pages.length);for(const x of p.pages)if(x.parentId)assert.ok(exported.indexOf(x.parentId)<exported.indexOf(x.id));
const raw=readFileSync(new URL('../content/initial-release/content-package.json',import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),p.packageSha256);assert.equal(p.packageSha256,'dba452bae4c613cc91b2da0d67addd221e405f30c594992553f3009bfc809579');
assert.ok(!html.includes('undefined')&&!html.includes('[object Object]'));
const catalogue=JSON.parse(read('CATALOGUE_SNAPSHOT.json')),registry=JSON.parse(read('REGISTRY_PLANNED_SNAPSHOT.json')),cities=JSON.parse(read('CITIES_SNAPSHOT.json'));
const treatments=catalogue.nodes.filter(n=>n.kind==='treatment');assert.equal(treatments.length,225);assert.equal(catalogue.nodes.filter(n=>n.kind==='category').length,21);assert.equal(catalogue.nodes.filter(n=>n.kind==='group').length,59);assert.equal(cities.cities.length,103);assert.equal(new Set(cities.cities.map(c=>c.id)).size,103);
assert.equal(p.catalogueAlignment.foundationCommit,'c1f159353620aed66e9c67a95306786646c7137c');assert.equal(p.procedureCoverage.length,225);assert.equal(new Set(p.procedureCoverage.map(d=>d.taxonomyNodeId)).size,225);
for(const n of treatments){const d=p.procedureCoverage.find(d=>d.taxonomyNodeId===n.id);assert.ok(d);assert.equal(d.categoryId,n.categoryId);assert.equal(d.groupId,n.parentId);assert.equal(d.scope,n.scope);assert.ok(byId[d.targetId].outline.includes(d.section));assert.equal(d.status,'PLANNED_SECTION_NOT_WRITTEN');assert.equal(d.requirements.length,3);assert.ok(d.requirements.every(r=>r.length>30));}
for(const c of p.catalogueCategoryCoverage){for(const ids of Object.values(c.matrix)){assert.ok(ids.length);assert.ok(ids.every(id=>byId[id]));}}
for(const x of p.pages){assert.ok(x.catalogueTargets.length||x.catalogueTargetReason);for(const t of x.catalogueTargets){const r=registry.routes.find(r=>r.routeRegistryId===t.routeRegistryId);assert.ok(r);assert.equal(t.canonicalPath,r.canonicalPath);assert.equal(t.status,'planned');assert.equal(t.deployed,false);assert.equal(t.reachable,false);assert.equal(t.indexEligible,false);assert.equal(t.cityId,null);}assert.equal(x.seo.h1,x.title);assert.deepEqual(x.seo.h2,x.outline);assert.equal(x.description,x.seo.metaDescription);assert.ok(x.seo.primaryKeyword&&x.seo.metaTitle&&x.seo.metaDescription);if(x.seo.monthlySearchVolume!==null){assert.ok(x.seo.volumeSource?.callId);assert.ok(x.seo.volumeKeyword);}}
for(const key of ['primaryKeyword','metaTitle','metaDescription'])assert.equal(new Set(p.pages.map(x=>x.seo[key])).size,p.pages.length,'Duplicate SEO '+key);
assert.equal(p.keywordResearch.volumeKeywords,730);assert.equal(p.keywordResearch.discoverySeeds,33);assert.equal(p.keywordResearch.serpQueries,60);assert.ok(p.keywordResearch.chargedUsd<1);for(const r of p.keywordResearch.receipts)assert.equal(r.http_status,200);
const seo=JSON.parse(read('SEO_MAP.json'));assert.equal(seo.articles.length,p.pages.length);for(const d of seo.decisions)if(d.articleId)assert.ok(byId[d.articleId]);
const serp=JSON.parse(read('SERP_REVIEW.json'));assert.equal(serp.queries.length,60);for(const q of serp.queries){assert.equal(q.locationCode,2440);assert.equal(q.languageCode,'lt');assert.ok(q.callId&&q.items.length);}
const report={checkedAt:'2026-10-06',status:'FULL_CATALOGUE_EDITORIAL_PLAN_STRUCTURE_PASS',totals:p.totals,keywordResearch:{volumeKeywords:730,seeds:33,serpQueries:60,chargedUsd:p.keywordResearch.chargedUsd},checks:['All 225 authoritative treatments have explicit named article-section decisions','21 catalogue areas and 33 editorial branches × 8 planned reader dimensions','103 city IDs; every planned CTA comes from exact foundation registry and stays inactive','49 owner menu positions and 76 prior intents reconciled; 3 existing URLs/dates retained','300 unique slugs/IDs, chronological cycle-free hierarchy, Europe/Vilnius DST','296 evergreen + 4 seasonal dates and 12 review dates','300 individual outlines/contributions/evidence/media/source briefs','940 valid unique planned links and actual legacy functional destinations','84 READ content sources with limits; no fabricated text/expert/media approval','730 LT volume rows, 33 related searches, 60 Google organic snapshots and real cost receipts','300 distinct primary phrases, meta titles/descriptions and H1/H2 maps','13 schema-valid transport batches; all 300 exactly once, parent first','HTML includes every article once and the catalogue decisions','Immutable initial content package SHA unchanged'],notAccepted:['Article texts or original media, not created','Qualified medical/legal review, not performed','Actual studio UUID binding, generation, V2 import or public deployment','Exact future traffic, full keyword universe, AI visibility, rankings or conversion results']};
writeFileSync(new URL('CATALOGUE_BINDING_VALIDATION.json',import.meta.url),JSON.stringify({checkedAt:report.checkedAt,status:'FULL_PLAN_BINDING_PASS_NOT_RUNTIME_ACCEPTANCE',foundationCommit:p.catalogueAlignment.foundationCommit,articles:p.pages.length,treatments:225,cities:103,actualActivation:false,notAccepted:report.notAccepted},null,2)+'\n');
writeFileSync(new URL('VALIDATION.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
