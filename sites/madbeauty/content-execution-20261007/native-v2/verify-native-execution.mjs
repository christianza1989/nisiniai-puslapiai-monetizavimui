import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {verifyContentRelease} from '../../../../content-studio/src/content-release.mjs';
import {validateV2Package,v2RevisionHash,inlineNodes} from '../../../../content-studio/src/content-package-v2.mjs';
const directory=new URL('./release/',import.meta.url),load=async name=>JSON.parse(await readFile(new URL(name,import.meta.url))),execution=await load('EXECUTION.json');
const bytes=await readFile(new URL('content-package.json',directory)),pkg=JSON.parse(bytes),manifest=await load('release/release-manifest.json'),receipts=await load('GENERATION-RECEIPTS.json'),media=await load('MEDIA-PROVENANCE.json');
assert.equal(createHash('sha256').update(bytes).digest('hex'),execution.packageSha256);
const verified=await verifyContentRelease(fileURLToPath(directory),validateV2Package);
assert.equal(verified.pages,9);assert.equal(verified.assets,30);assert.equal(pkg.canonicalHost,'madbeauty.lt');assert.equal(pkg.site.contact.email,'info@pinet.lt');assert.equal(pkg.site.operatorName,'MB Pinet');
assert.equal(pkg.pages.filter(p=>p.type==='home').length,1);assert.equal(pkg.pages.filter(p=>p.type==='guide').length,5);
assert.equal(pkg.pages.find(p=>p.slug==='autoriai/redakcija')?.type,'author');assert.equal(pkg.pages.some(p=>p.slug.startsWith('paslaugos/')),false);
for(const p of pkg.pages){assert.equal(v2RevisionHash(p),p.revisionHash);assert.equal(p.approval.revisionHash,p.revisionHash);assert.equal(p.editorial.authors[0].kind,'organization');for(const key of ['usefulness','facts','sources','media','links','presentation'])assert.ok(manifest.pages.find(x=>x.pageId===p.id).review.evidence[key].length>=20);}
const pilot=pkg.pages.find(p=>p.slug==='gidai/bendri-registracija'),category=pkg.pages.find(p=>p.slug==='gidai/bendri-gidas');assert.equal(pilot.revisionHash,execution.pilotRevisionUnchanged);
for(const p of [pilot,category])assert.equal(p.publishAt,'2026-10-13T07:00:00.000Z');
assert.equal(inlineNodes(category).filter(n=>n.type==='link'&&n.target.kind==='commerce').length,14);assert.equal(category.body.some(b=>b.type==='image'),false);
assert.equal(pkg.pages.reduce((n,p)=>n+p.links.length,0),execution.linkSelection.kept);assert.equal(execution.linkSelection.deferred,44);
const due=pkg.pages.filter(p=>![pilot.id,category.id].includes(p.id)),dueMedia=new Set(due.flatMap(p=>p.media.map(m=>m.id)));
assert.equal(pilot.media.length,5);assert.ok(pilot.media.every(m=>!dueMedia.has(m.id)));assert.ok(category.media.every(m=>dueMedia.has(m.id)));
for(const r of receipts){assert.equal(r.model,'gpt-6-luna');assert.equal(r.observed.model,r.model);assert.equal(r.reasoningEffort,'xhigh');assert.equal(r.observed.reasoningEffort,'xhigh');assert.equal(r.fallback,false);assert.match(r.resultSha256,/^[a-f0-9]{64}$/);}
for(const m of media.actualVariantInventory){const expected=manifest.assets.find(a=>a.name===m.src.split('/').at(-1));assert.equal(expected.sha256,m.sha256);}
assert.equal(execution.originalV1ApprovalsConverted,false);assert.equal(execution.newPaidResearchUsd,0);assert.equal(execution.sourceDocuments.length,3);
console.log(JSON.stringify({...verified,state:'verified-reviewed-export-not-hosted-acceptance',model:'gpt-6-luna',reasoningEffort:'xhigh',preservedPilot:true,duePagesBeforeFirstDate:7,futurePages:2,privatePromptsNotIncluded:true}));
