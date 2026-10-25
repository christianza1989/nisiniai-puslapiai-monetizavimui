// Scoped recovery from a supplied bulk-edit candidate. Default is read-only.
// Keep the original accepted prose byte-for-byte, the reviewed new link graph,
// the homepage recipe correction and title change. Never replay the old editor.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const siteRoot=path.dirname(fileURLToPath(import.meta.url));
const core=path.resolve(siteRoot,'../..'),pub=path.resolve(core,'../dovanos-memorycasting');
const beforeBytes=await fs.readFile(pub+'/content-packages/memocasting/content-package.json');
const candidate=JSON.parse(beforeBytes);
assert.equal(createHash('sha256').update(beforeBytes).digest('hex'),'9061a419fd6f3c68b8a87a687f01abe49ea16217a13d919a0a5ca4b25966e409','Unexpected candidate; inspect instead of replaying.');
const baseline=JSON.parse(execFileSync('git',['show','12f76461cd16e8796b59a3fdfe93e609e791937b:content-packages/memocasting/content-package.json'],{cwd:pub,maxBuffer:20*1024*1024}));
const byId=new Map(baseline.pages.map(p=>[p.id,p]));
const changed=candidate.pages.filter(p=>p.slug!==''&&JSON.stringify(p.body)!==JSON.stringify(byId.get(p.id)?.body));
const report={candidateSha256:createHash('sha256').update(beforeBytes).digest('hex'),baselineSource:'12f76461cd16e8796b59a3fdfe93e609e791937b',restoredPages:changed.map(p=>({id:p.id,slug:p.slug})),bodyRestorationOnly:true,linksRetained:candidate.pages.reduce((n,p)=>n+p.links.length,0),allDatesPreserved:true};
console.log(JSON.stringify(report));
if(!process.argv.includes('--apply'))process.exit(0);
process.env.STUDIO_DATA_DIR=siteRoot+'/studio-data';
process.env.STUDIO_OUTPUT_DIR=siteRoot+'/studio-output';
process.env.STUDIO_NETWORK_SETTINGS=pub+'/config/niche-network.json';
const m=await import('../../content-studio/src/model.mjs');
const site=await m.getSite('memocasting');
for(const p of changed){const native=site.pages.find(q=>q.id===p.id);assert.ok(native);assert.equal(m.revisionHash(native),p.revisionHash,'Native draft differs: '+p.slug);assert.equal(byId.get(p.id)?.approval?.status,'approved');}
await fs.writeFile(siteRoot+'/qa/antigravity-review-20261025/before-prose-recovery.private.json',beforeBytes);
for(const p of changed){
 const prior=byId.get(p.id);
 const page=await m.editPage('memocasting',p.id,{body:structuredClone(prior.body)});
 await m.recordEditorialReview('memocasting',p.id,{revisionHash:m.revisionHash(page),reviewer:'memocasting-prose-recovery-20261025',evidence:{
  usefulness:`${p.slug}: restored the exact previously approved complete body from ${report.baselineSource}; retained the candidate's useful new related-page links and all existing selection tools. The candidate's repeated sentence fragments add no reader value. This is scoped prose recovery, not a newly claimed full 97-article audit.`,
  facts:'The complete restored body exactly matches the accepted baseline, including its existing business numbers and conditions; no new price, safety, capacity, age or delivery claim is introduced. Homepage factual correction is outside this restoration and retained.',
  sources:'Existing accepted baseline text and sources are reused without introducing external claims or pretending to repeat supplier research. Candidate media and external-source metadata are unchanged.',
  media:'Exact existing media families, alt and provenance are preserved. No new generated image or customer-work claim.',
  links:`Existing candidate target IDs and labels are retained. Missing literal inline labels may use the supported related-page block. Current eligible/future filtering is verified in the public projection and hosted acceptance.`,
  presentation:`Removed supplied repeated prose by exact baseline-body restoration for ${p.slug}; no blanket keyword-insertion or fallback paragraph. The restored complete text is byte-identical to its prior approved body. Hosted desktop/mobile verification follows this native release; it is not claimed here.`
 }});
}
await m.approveReviewedBatch('memocasting',changed.map(p=>p.id),'memocasting-prose-recovery-20261025');
const released=await m.releaseContent('memocasting');
const next=JSON.parse(await fs.readFile(released.path));
assert.equal(next.pages.length,187);
for(const p of candidate.pages){
 const n=next.pages.find(q=>q.id===p.id);assert.ok(n);
 assert.equal(n.publishAt,p.publishAt);assert.deepEqual(n.links,p.links);assert.deepEqual(n.media,p.media);
 if(changed.some(q=>q.id===p.id)){assert.deepEqual(n.body,byId.get(p.id).body);assert.equal(n.title,p.title);assert.equal(n.description,p.description);}
 else assert.deepEqual(n,p);
}
const receipt={...report,...released,at:new Date().toISOString(),bodyRecoveryVerified:true};
await fs.writeFile(siteRoot+'/qa/antigravity-review-20261025/prose-recovery-release.private.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt));
