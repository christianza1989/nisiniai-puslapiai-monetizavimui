import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { contentPolicy, localPublishAt, planningWindow, scheduledPlan } from '../src/content-schedule.mjs';
import { v2Fixture } from './fixtures/v2.mjs';
import { projectPublicPages } from '../../../dovanos-memorycasting/lib/niche-links.mjs';
import { validateContentPackage } from '../../../dovanos-memorycasting/scripts/content-package-core.mjs';
import { verifyContentRelease } from '../src/content-release.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'content-workflow-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
const model = await import('../src/model.mjs');
const { createServer } = await import('../src/server.mjs');
await model.initialize();
test.after(() => rm(root, { recursive: true, force: true }));
const text = 'Izoliuotas bandymo tekstas atsako į pasirinkimo klausimą, paaiškina jo ribas ir leidžia palyginti galimus variantus. Tai sintetinė testo medžiaga, ne viešo verslo pažadas ar turinio kokybės įrodymas.';
const reviewInput = page => ({ reviewer: 'isolated-test-editor', revisionHash: model.revisionHash(page), evidence: Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(area => [area, `Izoliuoto testo ${area} įrodymas; naudojama tik sintetinė medžiaga, ne live turinio patikra.`])) });
async function review(siteId, id) { const site = await model.getSite(siteId); return model.recordEditorialReview(siteId, id, reviewInput(site.pages.find(p => p.id === id))); }
async function site(domain) { const s = await model.createSite({ canonicalHost: domain, name: 'Izoliuotas testas', offer: 'Tik workflow testas' }); await model.editSite(s.id, { facts: 'Sintetiniai faktai, ne tikras pasiūlymas.' }); return s; }
async function page(s, slug, type = 'service') { return model.addPage(s.id, { type, slug, title: 'Izoliuotas atsakymas', description: 'Testas be klientų ir išgalvotų viešų faktų.', intent: 'Bandymo klausimas', publishAt: new Date(Date.now()+86400000).toISOString(), body: [{ type: 'paragraph', text }] }); }

test('local schedule preserves wall time across DST, validates dates and bounded policy', () => {
  assert.equal(localPublishAt('2026-10-24','10:00','Europe/Vilnius'),'2026-10-24T07:00:00.000Z');
  assert.equal(localPublishAt('2026-10-25','10:00','Europe/Vilnius'),'2026-10-25T08:00:00.000Z');
  assert.throws(() => localPublishAt('2026-03-29','03:30','Europe/Vilnius'), /neegzistuoja/);
  assert.throws(() => localPublishAt('2026-10-25','03:30','Europe/Vilnius'), /dviprasmis/);
  assert.throws(() => localPublishAt('2026-02-30','10:00','Europe/Vilnius'));
  assert.throws(() => contentPolicy({ articlesPerMonth: 0 }));
  assert.equal(planningWindow(contentPolicy({ months:1 }),Date.parse('2027-01-31T09:00Z')).end,'2027-02-28');
  const proposals = [{type:'guide',publishDate:'2026-11-12'},{type:'guide',publishDate:'2026-11-12'}];
  const scheduled = scheduledPlan(proposals,[],contentPolicy(),Date.parse('2026-10-05T08:00Z'));
  assert.deepEqual(scheduled.map(p => p.publishAt),['2026-11-12T08:00:00.000Z','2026-11-13T08:00:00.000Z']);
});

test('weekly cadence fills spaced dates across batches without exceeding three articles in a calendar week', () => {
  const now = Date.parse('2026-10-05T08:00Z'), policy = contentPolicy({months:6,cadence:'weekly',articlesPerWeek:3});
  const window = planningWindow(policy,now); assert.equal(window.target,76);
  assert.equal(contentPolicy().articlesPerMonth,2,'legacy monthly default stays compatible');
  assert.throws(()=>contentPolicy({cadence:'weekly',articlesPerWeek:8}));
  assert.throws(()=>contentPolicy({cadence:'daily'}));
  let pages=[];
  while(pages.length<window.target) {
    const count=Math.min(24,window.target-pages.length);
    const next=scheduledPlan(Array.from({length:count},()=>({type:'guide',publishDate:'2026-10-12'})),pages,policy,now);
    pages.push(...next);
  }
  assert.equal(new Set(pages.map(p=>p.publishAt)).size,76);
  const weekCounts=new Map();
  for(const p of pages){const date=p.publishAt.slice(0,10),week=Math.floor((Date.parse(date+'T12:00Z')-Date.parse('1970-01-05T12:00Z'))/(7*86400000));weekCounts.set(week,(weekCounts.get(week)||0)+1);assert.ok(date<=window.end);}
  assert.ok([...weekCounts.values()].every(n=>n<=3));
  assert.deepEqual(pages.slice(0,3).map(p=>p.publishAt),['2026-10-12T07:00:00.000Z','2026-10-14T07:00:00.000Z','2026-10-16T07:00:00.000Z']);
  const preexisting=[{type:'guide',publishAt:'2026-10-12T07:00Z'},{type:'guide',publishAt:'2026-10-14T07:00Z'},{type:'guide',publishAt:'2026-10-16T07:00Z'}];
  const after=scheduledPlan([{type:'guide',publishDate:'2026-10-17'}],preexisting,policy,Date.parse('2026-10-06T08:00Z'));
  assert.ok(after[0].publishAt.slice(0,10)>='2026-10-19','new run respects existing calendar-week capacity');
});

test('two sites keep distinct schedules; reciprocal drafts approve atomically and links open only when due', async () => {
  const a = await site('workflow-a.example'), b = await site('workflow-b.example');
  await model.editSite(a.id,{contentPolicy:{months:6,articlesPerMonth:4,localTime:'11:30'}});
  await model.editSite(b.id,{contentPolicy:{months:3,articlesPerMonth:1,localTime:'09:00',timezone:'Europe/London'}});
  assert.equal((await model.getContentWorkflow(a.id)).window.target,24);
  assert.equal((await model.getContentWorkflow(b.id)).window.target,3);
  const h = await page(a,'','home'), g = await page(a,'gidas');
  await model.editPage(a.id,h.id,{publishAt:new Date(Date.now()-1000).toISOString(),linkSuggestions:[{targetPageId:g.id,label:'Gidas',reason:'Padeda atsakyti kitą tikrą klausimą.'}]});
  await model.editPage(a.id,g.id,{linkSuggestions:[{targetPageId:h.id,label:'Pradžia',reason:'Grįžti prie platesnio pasirinkimo.'}]});
  await model.finalizeInternalLinks(a.id,[h.id,g.id]);
  await review(a.id,h.id);
  await assert.rejects(() => model.approveReviewedBatch(a.id,[h.id,g.id],'test'), /peržiūros/);
  assert.equal((await model.getSite(a.id)).pages.some(p => p.publishedRevision),false,'a failed batch has no partial approval');
  await review(a.id,g.id);
  await model.approveReviewedBatch(a.id,[h.id,g.id],'test');
  const before = await model.getSite(a.id), pkg = model.packageForSite(before); validateContentPackage(pkg);
  assert.equal(projectPublicPages(pkg,[pkg],{},Date.now())[0].links.length,0);
  assert.equal(projectPublicPages(pkg,[pkg],{},Date.now()+2*86400000)[0].links.length,1);
  const release = await model.releaseContent(a.id), manifest = JSON.parse(await readFile(release.manifestPath,'utf8'));
  assert.equal(manifest.state,'exported-not-deployed'); assert.equal(manifest.pages.length,2);
  assert.equal((await model.getSite(b.id)).pages.length,0);
  await model.editPage(a.id,h.id,{title:'Naujas neperžiūrėtas tekstas'});
  assert.deepEqual(model.packageForSite(await model.getSite(a.id)).pages,pkg.pages,'draft edit preserves approved revisions');
  await assert.rejects(() => model.releaseContent(a.id),/peržiūros/);
});

test('unknown and foreign links, source candidates, missing guide images and site fact changes block release', async () => {
  const a = await site('workflow-gates.example'), foreign = await site('workflow-foreign.example');
  const h = await page(a,'','home'), g = await page(a,'gidas','guide'), f = await page(foreign,'kitas');
  await model.editPage(a.id,h.id,{linkSuggestions:[{targetPageId:g.id,label:'Gidas',reason:'Prasmingas tolimesnis pasirinkimo klausimas.'}]});
  await review(a.id,h.id);
  await assert.rejects(() => model.approveReviewedBatch(a.id,[h.id],'test'),/neužbaigtos/);
  await model.editPage(a.id,h.id,{links:[{targetPageId:f.id,label:'Svetimas'}]});
  await assert.rejects(() => model.finalizeInternalLinks(a.id,[h.id]),/nežinomas/);
  await model.editPage(a.id,h.id,{links:[]}); await model.finalizeInternalLinks(a.id,[h.id,g.id]);
  await review(a.id,h.id); await review(a.id,g.id);
  await assert.rejects(() => model.approveReviewedBatch(a.id,[h.id,g.id],'test'),/vaizdo/);
  const bytes = await sharp({create:{width:32,height:24,channels:3,background:'#123456'}}).png().toBuffer();
  const asset = await model.saveResponsiveAsset(a.id,{mime:'image/png',alt:'Sintetinis bandymo vaizdas',rights:'Tik izoliuotas testas'},bytes);
  await model.editPage(a.id,g.id,{media:[{id:asset.id}],externalLinks:[{url:'https://example.org/source',label:'Testas',reason:'Tik šaltinio vartų bandymas',verified:false}]});
  await review(a.id,g.id);
  await assert.rejects(() => model.approveReviewedBatch(a.id,[h.id,g.id],'test'),/nepatikrintų/);
  await model.editPage(a.id,g.id,{externalLinks:[]}); await review(a.id,g.id);
  await model.editSite(a.id,{facts:'Pasikeitęs sintetinis pasiūlymas turi būti iš naujo peržiūrėtas.'});
  await assert.rejects(() => model.approveReviewedBatch(a.id,[h.id,g.id],'test'),/peržiūros/);
  await review(a.id,h.id); await review(a.id,g.id);
  await model.approveReviewedBatch(a.id,[h.id,g.id],'test');
  await model.finalizeInternalLinks(a.id,[h.id,g.id]);
  assert.equal((await model.getContentWorkflow(a.id)).pages.every(p => p.reviewCurrent),true,'idempotent finalization does not stale review');
  await model.revokePage(a.id,g.id);
  await assert.rejects(() => model.releaseContent(a.id),/tikslas dar neparengtas|atšauktą|nepatvirtintą/);
});

test('reviewed workflow also preserves rich v2 blocks, source metadata and author snapshots', async () => {
  const fixture = v2Fixture();
  const s = await model.createSite({canonicalHost:fixture.canonicalHost,name:fixture.site.name,offer:fixture.site.offer,schemaVersion:2,renderer:'gift'});
  await model.editSite(s.id,{facts:'Tik izoliuotas v2 bandymas.'});
  for (const source of fixture.pages) await model.addPage(s.id,source);
  const bytes=await sharp({create:{width:32,height:24,channels:3,background:'#543210'}}).png().toBuffer();
  const asset=await model.saveResponsiveAsset(s.id,{mime:'image/png',alt:'Sintetinis v2 bandymo vaizdas',rights:'Tik testas'},bytes);
  await model.editPage(s.id,fixture.pages[1].id,{media:[{id:asset.id}]});
  for (const p of fixture.pages) await review(s.id,p.id);
  await model.approveReviewedBatch(s.id,fixture.pages.map(p=>p.id),'test');
  const pkg=model.packageForSite(await model.getSite(s.id)); validateContentPackage(pkg);
  assert.deepEqual(pkg.pages[1].body,fixture.pages[1].body); assert.deepEqual(pkg.pages[1].editorial,fixture.pages[1].editorial);
  assert.equal((await model.releaseContent(s.id)).state,'exported-not-deployed');
  const release=await model.releaseContent(s.id), directory=path.dirname(release.path);
  assert.equal((await verifyContentRelease(directory,validateContentPackage)).state,'verified-export-not-deployed');
  const manifest=JSON.parse(await readFile(release.manifestPath,'utf8'));
  await writeFile(path.join(directory,'assets',manifest.assets[0].name),'changed bytes');
  await assert.rejects(()=>verifyContentRelease(directory,validateContentPackage),/medijos kontrolinė/);
});

test('workflow HTTP uses existing private-origin guards and shows real blockers without public approval', async () => {
  const s=await site('workflow-http.example'), server=await createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    const response=await fetch(`${base}/api/sites/${s.id}/workflow`);
    assert.equal(response.status,200); assert.equal((await response.json()).siteId,s.id);
    const denied=await fetch(`${base}/api/sites/${s.id}/release`,{method:'POST',headers:{origin:'https://untrusted.example'}});
    assert.equal(denied.status,403);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
