import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { hasMinimumContent, shortIndexMinimum } from '../src/minimum-content.mjs';
import { pageReadiness, editorialReview } from '../src/content-workflow.mjs';

const ids = ['10af45c9-03a7-4e29-8145-661dde7f44e4', '4a80eebf-f530-44b2-b734-caba73aab699'];
const floors = [117, 97];
const root = await mkdtemp(path.join(os.tmpdir(), 'minimum-content-606-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
const model = await import('../src/model.mjs');
await model.initialize();
test.after(() => rm(root, { recursive: true, force: true }));
const reviewInput = p => ({ reviewer: 'isolated-regression', revisionHash: model.revisionHash(p),
  evidence: Object.fromEntries(['usefulness','facts','sources','media','links','presentation']
    .map(a => [a, `Synthetic regression evidence for ${a}; not a live editorial review.`])) });
const page = (id, n, siteId = 'promedical') => ({ id, siteId, type: 'faq', title: 'Synthetic index',
  description: 'Synthetic isolated regression.', intent: 'Test minimum length only.', slug: `test-${id}`,
  publishAt: '2026-10-24T00:00:00.000Z', body: [{type:'paragraph',text:'x'.repeat(n)}],
  media: [], links: [], externalLinks: [], factChecks: [], linkSuggestions: [], status: 'draft' });

test('only two Promedical FAQ identities receive their explicit nonempty floors', () => {
  for (const [i, id] of ids.entries()) {
    for (const n of [0, floors[i]-1, floors[i], 119, 120]) {
      const p = page(id,n); assert.equal(hasMinimumContent({id:'promedical'},p), n>=floors[i]);
      assert.equal(shortIndexMinimum({id:'promedical'},p),floors[i]);
      assert.equal(hasMinimumContent({id:'other'},page(id,n,'other')),n>=120);
      assert.equal(hasMinimumContent({id:'promedical'},page('unlisted',n)),n>=120);
      assert.equal(hasMinimumContent({id:'promedical'},{...p,type:'product'}),n>=120);
      assert.equal(hasMinimumContent({id:'promedical'},{...p,siteId:'other'}),n>=120);
    }
    assert.equal(hasMinimumContent({id:'promedical'},{...page(id,0),body:[{type:'paragraph',text:' '.repeat(120)}]}),false);
  }
  // V2 extraction retains the same global boundary and precise exception scope.
  for (const n of [96,97,119,120]) {
    const p = {...page(ids[1],0),contentVersion:2,body:[{type:'richParagraph',content:[{type:'text',text:'x'.repeat(n)}]}]};
    assert.equal(hasMinimumContent({id:'promedical'},p),n>=97);
    assert.equal(hasMinimumContent({id:'promedical'},{...p,id:'unlisted'}),n>=120);
  }
});

test('real approve and readiness keep all other gates for both exceptions', async () => {
  const seed = await model.createSite({canonicalHost:'promedical.lt',name:'Isolated fixture',offer:'Synthetic regression only'});
  assert.equal(seed.id,'promedical');
  const site = {...seed, name:'Isolated fixture', offer:'Synthetic regression only', facts:'Test facts only.',
    contact:{email:'test@example.com',phone:''},contentWorkflowVersion:1,pages:[]};
  const persist = s => writeFile(path.join(root,'data','sites','promedical.json'),JSON.stringify(s));
  for (const [i,id] of ids.entries()) {
    const p = page(id,floors[i]); p.editorialReview = editorialReview(site,p,model.revisionHash(p),reviewInput(p));
    site.pages=[p]; await persist(site);
    assert.equal(pageReadiness(site,p,model.revisionHash(p)).state,'reviewed');
    const approved=await model.approvePage('promedical',id,'owner-authorized-test');
    assert.equal(approved.approval.revisionHash,model.revisionHash(p));
    assert.deepEqual(approved.body,p.body);
    for (const [change,pattern] of [
      [{body:[]},/Turinys|informacijos/],
      [{body:[{type:'paragraph',text:'x'.repeat(floors[i]-1)}]},/informacijos/],
      [{factChecks:['unresolved fact']},/faktų/],
      [{externalLinks:[{url:'https://example.com',label:'Source',reason:'Test evidence',verified:false}]},/šaltinių/],
      [{links:[{targetPageId:'missing',label:'Missing target'}]},/tikslas/],
      [{linkSuggestions:[{targetPageId:'missing',label:'Missing',reason:'Planned useful link'}]},/neužbaigtos/],
    ]) {
      const bad={...p,...change};bad.editorialReview=editorialReview(site,bad,model.revisionHash(bad),reviewInput(bad));
      const s={...site,pages:[bad]};await persist(s);
      assert.equal(pageReadiness(s,bad,model.revisionHash(bad)).state,'blocked');
      await assert.rejects(()=>model.approvePage('promedical',id,'test'),pattern);
    }
    const stale={...p,title:'Changed after review'};await persist({...site,pages:[stale]});
    await assert.rejects(()=>model.approvePage('promedical',id,'test'),/peržiūros/);
  }
  // Unlisted short pages still fail canonical approve, with unchanged readiness.
  const ordinary=page('unlisted',119);ordinary.editorialReview=editorialReview(site,ordinary,model.revisionHash(ordinary),reviewInput(ordinary));
  site.pages=[ordinary];await persist(site);
  assert.equal(pageReadiness(site,ordinary,model.revisionHash(ordinary)).state,'reviewed');
  await assert.rejects(()=>model.approvePage('promedical','unlisted','test'),/informacijos/);
  const full=page('unlisted',120);full.editorialReview=editorialReview(site,full,model.revisionHash(full),reviewInput(full));
  site.pages=[full];await persist(site);await model.approvePage('promedical','unlisted','test');
});
