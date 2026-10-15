import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'planning-brief-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data'); process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
process.env.STUDIO_NETWORK_SETTINGS = path.join(root, 'network.json');
await writeFile(process.env.STUDIO_NETWORK_SETTINGS, JSON.stringify({ defaultEmail: 'fixture@example.invalid', operatorName: 'Sintetinis testas', contactsBySite: {} }));
await mkdir(path.join(process.env.STUDIO_DATA_DIR, 'sites'), { recursive: true });
await mkdir(path.join(process.env.STUDIO_DATA_DIR, 'media'), { recursive: true });
const model = await import('../src/model.mjs');
test.after(async () => { assert.ok(root.startsWith(path.join(os.tmpdir(), 'planning-brief-'))); await rm(root, { recursive: true, force: true }); });

function brief(pathname = '/praktine-uzduotis/', parent = '', links = []) {
  return { path: pathname, title: 'Praktinės darbo užduoties pasirinkimas', intent: 'Padėti komandai pasirinkti vieną prasmingą praktinio mokymo užduotį.',
    head_query: 'Kaip komandai pasirinkti mokymo užduotį', audience_problem: 'Komanda nežino, nuo kurios pasikartojančios darbo užduoties pradėti mokymą.',
    business_goal: 'Patikrinti aiškios praktinės dirbtuvės paklausą prieš mokamą vykdymą.', primary_topic: 'Praktinis komandos mokymas',
    reason: 'Atskiras pasirinkimo klausimas; vykdymą ir šaltinius dar reikia patikrinti prieš siūlant mokamą rezultatą.',
    month: '', seasonal_hook: '', pillar_path: parent,
    outline: ['Pasirinkti pasikartojančią užduotį.', 'Palyginti vykdymo galimybes.', 'Patikrinti pirmo bandymo rezultatą.'],
    source_queries: ['Ž'.repeat(500)], source_urls: ['https://example.org/research'], internal_links: links,
    media_brief: 'Temos schema turi aiškiai parodyti darbo užduoties pasirinkimą, bandymą ir rezultato patikrą.',
    media_alt: 'Darbo užduoties pasirinkimo ir bandymo schema', priority: 'initial' };
}
let next = 0;
async function site() {
  const value = await model.createSite({ siteId: 'planning-test-' + (++next), canonicalHost: 'planning' + next + '.example.invalid', name: 'Sintetinis planavimo testas', offer: 'Tik izoliuotas modelio bandymas', schemaVersion: 2 });
  await model.editSite(value.id, { facts: 'Sintetiniai testo faktai; tai nėra tikro verslo pasiūlymas.', contentPolicy: {} });
  return value;
}
async function page(siteId, id, slug, planningBrief) {
  return model.addPage(siteId, { id, type: slug ? 'service' : 'home', slug, title: 'Sintetinio testo praktinė užduotis', description: 'Izoliuotas testas tikrina privataus plano perdavimą, o ne tikrą paslaugą.',
    intent: 'Patikrinti privataus planavimo kontraktą.', publishAt: '2030-01-01T10:00:00.000Z',
    body: [{ type: 'paragraph', text: 'Šis izoliuotas sintetinis bandymas tikrina planavimo metaduomenis, nekurdamas tikro viešo paslaugos pažado. Rašytas puslapio turinys ir jo datos turi likti visiškai nepakeisti po privataus planavimo užduoties suderinimo.' }],
    ...(planningBrief ? { planningBrief } : {}) });
}
const input = (page, planningBrief) => ({ expectedRevisionHash: model.revisionHash(page), expectedPlanningHash: model.planningContextHash(page), planningBrief });

test('full private brief survives creation without legacy source query truncation or public projection', async () => {
  const current = await site(), original = brief();
  const created = await page(current.id, 'private-guide', 'praktine-uzduotis', original);
  assert.deepEqual(created.planningBrief, original); assert.deepEqual(created.sourceQueries, original.source_queries);
  assert.equal(created.sourceQueries[0].length, 500);
  assert.equal(Object.hasOwn(model.revisionPayload(created), 'planningBrief'), false);
  assert.equal(Object.hasOwn(model.revisionPayload(created), 'sourceQueries'), false);
  assert.throws(() => model.normalizePlanningBrief({ ...original, verified: true }));
  assert.throws(() => model.normalizePlanningBrief({ ...original, seasonal_hook: 'Išgalvotas sezoniškumas' }));
  assert.throws(() => model.normalizePlanningBrief({ ...original, source_queries: ['Ž'.repeat(501)] }));
  assert.throws(() => model.normalizePlanningBrief({ ...original, source_urls: ['http://example.org'] }));
});

test('revision and private-context CAS preserve body dates approval and published snapshots', async () => {
  const current = await site();
  const homepage = await page(current.id, 'homepage', '');
  await page(current.id, 'pillar', 'praktine-uzduotis');
  const child = await page(current.id, 'support', 'pasiruosimas');
  const evidence = Object.fromEntries(['usefulness', 'facts', 'sources', 'media', 'links', 'presentation'].map(area => [area, 'Tikras izoliuotos sintetinės fixture ' + area + ' patikrinimas; tai nėra tikro kliento ar viešo verslo priėmimas.']));
  for (const candidate of [homepage, child]) await model.recordEditorialReview(current.id, candidate.id, { reviewer: 'isolated-planning-test', revisionHash: model.revisionHash(candidate), evidence });
  await model.approveReviewedBatch(current.id, [homepage.id, child.id], 'isolated-test-editor');
  const before = (await model.getSite(current.id)).pages.find(value => value.id === child.id);
  const request = input(before, brief('/pasiruosimas/', '/praktine-uzduotis/', ['/praktine-uzduotis/']));
  const result = await model.reconcilePlanningBrief(current.id, child.id, request);
  assert.equal(result.changed, true); assert.equal(result.writer, 'not-executed');
  const after = (await model.getSite(current.id)).pages.find(value => value.id === child.id);
  for (const key of ['id', 'slug', 'type', 'title', 'description', 'intent', 'body', 'publishAt', 'createdAt', 'status', 'approval', 'publishedRevision', 'editorialReview', 'siteSnapshot']) assert.deepEqual(after[key], before[key], key);
  assert.equal(after.pillarPageId, 'pillar'); assert.deepEqual(after.sourceQueries, request.planningBrief.source_queries);
  assert.equal(model.revisionHash(after), model.revisionHash(before));
  assert.equal(Object.hasOwn(model.packageForSite(await model.getSite(current.id)).pages.find(value => value.id === child.id), 'planningBrief'), false);
  const filename = path.join(process.env.STUDIO_DATA_DIR, 'sites', current.id + '.json'), exact = await readFile(filename);
  await assert.rejects(model.reconcilePlanningBrief(current.id, child.id, request), /Pasikeitė/);
  assert.deepEqual(await readFile(filename), exact);
  const replay = await model.reconcilePlanningBrief(current.id, child.id, input(after, request.planningBrief));
  assert.equal(replay.changed, false); assert.deepEqual(await readFile(filename), exact);
  await model.editPage(current.id, child.id, { title: 'Pasikeitęs sintetinio puslapio pavadinimas' });
  await assert.rejects(model.reconcilePlanningBrief(current.id, child.id, input(after, request.planningBrief)), /Pasikeitė/);
});

test('unknown foreign self and cyclic parents do not change current planning state', async () => {
  const current = await site();
  const parent = await page(current.id, 'parent', 'praktine-uzduotis');
  const child = await page(current.id, 'child', 'pasiruosimas');
  const other = await site(); await page(other.id, 'foreign', 'svetimas-puslapis');
  await assert.rejects(model.reconcilePlanningBrief(current.id, child.id, input(child, brief('/pasiruosimas/', '/svetimas-puslapis/'))), /tikro šios svetainės ID/);
  await assert.rejects(model.reconcilePlanningBrief(current.id, child.id, input(child, brief('/pasiruosimas/', '', ['/svetimas-puslapis/']))), /tikro šios svetainės puslapio/);
  await assert.rejects(model.reconcilePlanningBrief(current.id, child.id, input(child, brief('/pasiruosimas/', '/pasiruosimas/'))), /Netaisyklinga/);
  await model.reconcilePlanningBrief(current.id, child.id, input(child, brief('/pasiruosimas/', '/praktine-uzduotis/')));
  await assert.rejects(model.reconcilePlanningBrief(current.id, parent.id, input(parent, brief('/praktine-uzduotis/', '/pasiruosimas/'))), /ciklo/);
  const fresh = await model.getSite(current.id);
  assert.equal(fresh.pages.find(value => value.id === parent.id).planningBrief, undefined);
  assert.equal(fresh.pages.find(value => value.id === child.id).pillarPageId, parent.id);
});

test('concurrent planning requests from the same snapshot cannot overwrite the first accepted brief', async () => {
  const current = await site(), child = await page(current.id, 'concurrent', 'praktine-uzduotis');
  const first = brief(), second = { ...brief(), head_query: 'Kaip palyginti praktinio mokymo galimybes' };
  const results = await Promise.allSettled([model.reconcilePlanningBrief(current.id, child.id, input(child, first)), model.reconcilePlanningBrief(current.id, child.id, input(child, second))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.deepEqual((await model.getSite(current.id)).pages.find(page => page.id === child.id).planningBrief, first);
});
