import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {editorialChanges,sourceEvidence} from './FINAL_SEO_CONTENT_2026_10_25.mjs';
const root=import.meta.dirname, pub=path.resolve(root,'../../../dovanos-memorycasting');
const qa=root+'/qa/final-seo-20261025';
const bytes=await fs.readFile(qa+'/before-package.private.json').catch(e=>{if(e.code!=='ENOENT')throw e;return fs.readFile(pub+'/content-packages/memocasting/content-package.json');});
assert.equal(createHash('sha256').update(bytes).digest('hex'),'cfec71cb4763224748be22fb5084688dd7f80c16d9e11b6f47c9fd6398db01bb');
const baseline=JSON.parse(bytes),changes=editorialChanges(baseline);
process.env.STUDIO_DATA_DIR=root+'/studio-data';process.env.STUDIO_OUTPUT_DIR=root+'/studio-output';
process.env.STUDIO_NETWORK_SETTINGS=pub+'/config/niche-network.json';
process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const m=await import('../../content-studio/src/model.mjs');
const phase=process.argv[2]||'inspect';
if(phase==='final-edit'){
 for(const slug of ['gidai/kaledines-dovanos-porai','gidai/kaledines-dovanos-paskutine-minute']){const c=changes.find(c=>c.slug===slug);const p=await m.editPage('memocasting',c.id,c.input);assert.deepEqual(p.body,c.input.body);}
}
if(phase==='draft'){
 const site=await m.getSite('memocasting');
 for(const c of changes)assert.equal(m.revisionHash(site.pages.find(p=>p.id===c.id)),c.expectedRevisionHash,c.slug);
 await fs.writeFile(qa+'/before-package.private.json',bytes);
 await fs.writeFile(qa+'/before-studio.private.json',JSON.stringify(site));
 await fs.writeFile(qa+'/sources.private.json',JSON.stringify(sourceEvidence,null,2));
 for(const c of changes){const p=await m.editPage('memocasting',c.id,c.input);assert.deepEqual(p.body,c.input.body,'No silent text truncation: '+c.slug);}
}
if(phase==='release'){
 // Run only after the full-text self-edit and actual native previews described
 // in the private review receipt. No historical review or approval is rewritten.
 const rendered=JSON.parse(await fs.readFile(qa+'/native-preview-review.private.json'));
 const site=await m.getSite('memocasting');
 for(const c of changes){
  const p=site.pages.find(p=>p.id===c.id);assert.deepEqual(p.body,c.input.body);assert.equal(p.publishAt,c.input.publishAt||baseline.pages.find(q=>q.id===c.id).publishAt);
  assert.ok(rendered.pageIds.includes(c.id));
  await m.recordEditorialReview('memocasting',c.id,{revisionHash:m.revisionHash(p),reviewer:'final-seo-editor-20261025',evidence:{
   usefulness:`${c.slug}: ${c.input.body===undefined?'future cadence exchange':c.slug.includes('pakavimas')?'Replaced duplicated wrapping manual with multi-recipient Christmas preparation, labels, style and dispatch workflow':c.slug.includes('paskutine-minute')?'Three actual electronic alternatives, payment/delivery/reservation distinction and a half-hour fallback sequence':c.slug.includes('jubiliejui')?'Three concrete 50th-birthday plans, voluntary group budget and ownership':c.slug.includes('moterims')?'Distinct relationship/occasion decision for evergreen, seasonal timing and whole-budget decision for Christmas':'Scoped decision aid or correction documented in FINAL_SEO_CONTENT_2026_10_25.mjs'}. Existing useful prose is retained; no word-count target or new competing URL.`,
   facts:'Complete final body checked against baseline and owner facts: couple32/family48, white paint included, baseOutOfStock. New MOKA180ml/no-induction, coupon20/six-month and electronic delivery caveats verified in primary sources in sources.private.json. Illustrative budgets recomputed; no fake delivery deadline, capacity, age or product test. Only six future slots swapped; all public dates unchanged.',
   sources:'Primary seller pages re-read2026-10-25 for new facts, with sourceEvidence exact URLs/context. Existing Oct22 research date retained for unchanged offers. Links are comparisons, not affiliate claims or purchased products. Practical original planning advice is editorial reasoning, not attributed research.',
   media:'Previously inspected exact original responsive families and provenance retained. No supplier image downloaded or documentary packshot invented; existing AI scenes retain illustration disclosure. Packing image chosen from its existing body. Owner video in product help is separate, authentic existing video.',
   links:'Existing real page IDs retained; Christmas packing links to the actual universal manual and last-minute page. New external labels match literal prose and verified primary URLs. Shared eligibility hides future targets, sitemap and media before publication. No all-to-all or backlink fabrication.',
   presentation:`Full final Lithuanian text self-edited for meaning, grammar, continuity and numbers. Native current-draft previews inspected per native-preview-review.private.json (${rendered.viewports.join(', ')}); no claim of hosted candidate before deployment. Public renderer desktop/mobile and all187 HTTP routes are a separate final acceptance.`,
  }});
 }
 await m.approveReviewedBatch('memocasting',changes.map(c=>c.id),'final-seo-editor-20261025');
 const release=await m.releaseContent('memocasting');const next=JSON.parse(await fs.readFile(release.path));
 assert.equal(next.pages.length,baseline.pages.length);
 for(const old of baseline.pages){const n=next.pages.find(p=>p.id===old.id),c=changes.find(c=>c.id===old.id);assert.ok(n);assert.deepEqual(n.media,old.media);assert.equal(n.slug,old.slug);assert.equal(n.publishAt,c?.input.publishAt||old.publishAt);if(!c)assert.deepEqual(n,old);else assert.deepEqual(n.body,c.input.body);}
 const changedDates=next.pages.filter(p=>p.publishAt!==baseline.pages.find(q=>q.id===p.id).publishAt);assert.equal(changedDates.length,6);
 const cadence=x=>{const a={};for(const p of x.pages)if(p.type==='guide'&&p.slug.startsWith('gidai/')){const d=p.publishAt.slice(0,10);a[d]=(a[d]||0)+1;}return a;};assert.deepEqual(cadence(next),cadence(baseline));
 await fs.writeFile(qa+'/native-release.private.json',JSON.stringify({...release,at:new Date().toISOString(),changed:changes.map(c=>({id:c.id,slug:c.slug})),dates:changedDates.map(p=>({slug:p.slug,publishAt:p.publishAt})),unchangedPages:baseline.pages.length-changes.length,allMediaPreserved:true},null,2));console.log(JSON.stringify(release));
}
console.log(JSON.stringify({phase,pages:changes.length,bodyChanges:changes.filter(c=>JSON.stringify(c.input.body)!==JSON.stringify(baseline.pages.find(p=>p.id===c.id).body)).length,futureDates:changes.filter(c=>c.input.publishAt).length}));
