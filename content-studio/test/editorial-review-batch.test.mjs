import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {REVIEW_AREAS,reviewBinding,reviewCurrent} from '../src/content-workflow.mjs';

const root=await mkdtemp(path.join(os.tmpdir(),'editorial-review-batch-'));
const config=path.join(root,'network.json');
await writeFile(config,JSON.stringify({defaultEmail:'editor@example.test',contactsBySite:{}}));
process.env.STUDIO_DATA_DIR=path.join(root,'data');
process.env.STUDIO_OUTPUT_DIR=path.join(root,'output');
process.env.STUDIO_NETWORK_SETTINGS=config;
const model=await import('../src/model.mjs');
await model.initialize();
test.after(async()=>{
  assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('editorial-review-batch-'));
  await rm(root,{recursive:true,force:true});
});
async function fixture(domain){
  const site=await model.createSite({canonicalHost:domain,name:'Isolated fixture',offer:'Synthetic workflow acceptance only'});
  await model.editSite(site.id,{facts:'Isolated synthetic evidence, never a published offer.',contentPolicy:{months:1,articlesPerMonth:1}});
  const pages=[];
  for(const slug of ['first','second'])pages.push(await model.addPage(site.id,{slug,type:'service',title:'Synthetic fixture answer',description:'An isolated test page without customer information.',intent:'Fixture question',publishAt:'2026-10-01T08:00:00Z',body:[{type:'paragraph',text:'Synthetic acceptance fixture for atomic recording. This text verifies workflow conditions only and is never published to a real website.'}]}));
  return {site:await model.getSite(site.id),pages};
}
const input=(site,page)=>({pageId:page.id,revisionHash:model.revisionHash(page),expectedBinding:reviewBinding(site,page,model.revisionHash(page)),reviewer:'isolated-fixture-editor',evidence:Object.fromEntries(REVIEW_AREAS.map(area=>[area,'Independent synthetic '+area+' fixture evidence; no live editorial review is claimed.']))});
const bytes=id=>readFile(path.join(process.env.STUDIO_DATA_DIR,'sites',id+'.json'),'utf8');

test('batch records exact per-page evidence once without approval or changing another site',async()=>{
  const a=await fixture('batch-a.example'),b=await fixture('batch-b.example');
  const other=await bytes(b.site.id);
  const inputs=a.pages.map(page=>input(a.site,page));
  inputs[1].evidence.facts='A distinct second-page synthetic fact check with different evidence.';
  const result=await model.recordEditorialReviewBatch(a.site.id,inputs);
  assert.deepEqual(result.recorded,a.pages.map(page=>page.id));
  assert.equal(result.approval,'not-performed');
  const recorded=await model.getSite(a.site.id);
  for(const page of recorded.pages){assert.equal(reviewCurrent(recorded,page,model.revisionHash(page)),true);assert.equal(Boolean(page.publishedRevision),false);}
  assert.equal(recorded.pages[1].editorialReview.evidence.facts,inputs[1].evidence.facts);
  assert.equal(await bytes(b.site.id),other);
  await model.approveReviewedBatch(a.site.id,a.pages.map(page=>page.id),'isolated-fixture-editor');
  const approved=await model.getSite(a.site.id);
  await model.recordEditorialReviewBatch(a.site.id,approved.pages.map(page=>input(approved,page)));
  assert.deepEqual((await model.getSite(a.site.id)).pages.map(page=>page.publishedRevision),approved.pages.map(page=>page.publishedRevision),'re-recording never rewrites immutable approvals');
});

test('stale context, stale revision, bad last evidence, duplicate/foreign IDs and oversized batches leave no partial write',async()=>{
  const a=await fixture('batch-fail.example'),b=await fixture('batch-foreign.example');
  const original=a.pages.map(page=>input(a.site,page));
  const expectUnchanged=async(inputs,pattern)=>{const before=await bytes(a.site.id);await assert.rejects(()=>model.recordEditorialReviewBatch(a.site.id,inputs),pattern);assert.equal(await bytes(a.site.id),before);};
  const bad=structuredClone(original);bad[1].evidence.sources='';
  await expectUnchanged(bad,/įrodymų/);
  await expectUnchanged([original[0],original[0]],/unikalių/);
  await expectUnchanged([original[0],input(b.site,b.pages[0])],/nepriklauso/);
  await expectUnchanged([],/1–200/);
  await expectUnchanged(Array.from({length:201},()=>original[0]),/1–200/);
  const missingBinding=structuredClone(original);delete missingBinding[1].expectedBinding;
  await expectUnchanged(missingBinding,/kontekstas/);
  await model.editSite(a.site.id,{contact:{email:'new-context@example.test',phone:''}});
  await expectUnchanged(original,/kontekstas/);
  let current=await model.getSite(a.site.id),fresh=current.pages.map(page=>input(current,page));
  await model.editPage(a.site.id,a.pages[1].id,{title:'Changed synthetic revision'});
  await expectUnchanged(fresh,/kontekstas|revizija/);
  current=await model.getSite(a.site.id);fresh=current.pages.map(page=>input(current,page));
  fresh[1].revisionHash='0'.repeat(64);
  await expectUnchanged(fresh,/revizija/);
  assert.equal((await model.getSite(a.site.id)).pages.some(page=>page.editorialReview),false);
});
