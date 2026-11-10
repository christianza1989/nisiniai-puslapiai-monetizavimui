import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const publicRoot=process.env.STUDIO_PUBLIC_CORE_DIR||path.resolve(import.meta.dirname,'../../../dovanos-memorycasting');

const root = await mkdtemp(path.join(os.tmpdir(), 'niche-studio-test-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
process.env.STUDIO_PORT = '4319';
const model = await import('../src/model.mjs');
const { createServer } = await import('../src/server.mjs');
await model.initialize();
const longText = 'Tai bandomasis informacinis puslapis. Jis aiškiai aprašo pasirenkamos paslaugos eigą, klausimus klientui ir sąlygas, kurias būtina patikrinti prieš siunčiant užklausą.';

test('too many links fail without silently dropping links or changing the draft', async () => {
  const site = await model.createSite({ canonicalHost: 'link-limit-fixture.lt', name: 'Link fixture', offer: 'Test' });
  const page = await model.addPage(site.id, { type: 'home', slug: '', title: 'Original title', description: 'Fixture', intent: 'Fixture' });
  const links = Array.from({length:31}, (_, i) => ({targetPageId:`fixture-${i}`,label:`Link ${i}`}));
  await assert.rejects(() => model.editPage(site.id, page.id, {title:'Must not be saved',links}), /iki 30.*netrumpinamos/);
  const persisted=(await model.getSite(site.id)).pages.find(p=>p.id===page.id);
  assert.equal(persisted.title,'Original title');
  assert.deepEqual(persisted.links,[]);
  await model.editPage(site.id, page.id, {links:links.slice(0,30)});
  assert.equal((await model.getSite(site.id)).pages.find(p=>p.id===page.id).links.length,30);
});

test('approved revision survives draft edits, time gate and export stay isolated', async () => {
  const site = await model.createSite({ canonicalHost: 'bandymas.lt', name: 'Bandymas', offer: 'Paslaugų užklausos' });
  const second = await model.createSite({ canonicalHost: 'kitas-bandymas.lt', name: 'Kitas', offer: 'Kita paslauga' });
  await model.editSite(site.id, { facts: 'Teikiama tik faktinė konsultacija.', contact: { email: 'labas@bandymas.lt', phone: '+37060000000' } });
  const future = new Date(Date.now() + 86400000).toISOString();
  const page = await model.addPage(site.id, { type: 'home', slug: '', title: 'Bandymo svetainė', description: 'Aiškus bandomos paslaugos aprašymas.', intent: 'Paslaugos pasirinkimas', publishAt: future, body: [{ type: 'paragraph', text: longText }] });
  await model.editPage(site.id, page.id, { factChecks: ['Patikrinti pasiūlymo sąlygas'] });
  await assert.rejects(() => model.approvePage(site.id, page.id, 'tester'), /faktų patikros/);
  await model.editPage(site.id, page.id, { factChecks: [] });
  const approved = await model.approvePage(site.id, page.id, 'tester');
  assert.equal(model.isPublic(approved.publishedRevision), false);
  assert.equal(model.isPublic(approved.publishedRevision, Date.now() + 2 * 86400000), true);
  const tampered = structuredClone(approved.publishedRevision); tampered.title = 'Nepatvirtintas pakeitimas';
  assert.equal(model.isPublic(tampered, Date.now() + 2 * 86400000), false);
  await model.editPage(site.id, page.id, { title: 'Naujas juodraštis' });
  let packageData = model.packageForSite(await model.getSite(site.id));
  assert.equal(packageData.pages[0].title, 'Bandymo svetainė');
  assert.equal(packageData.pages[0].siteId, site.id);
  assert.notEqual(packageData.pages[0].siteId, second.id);
  await assert.rejects(() => model.editPage(site.id, page.id, { links: [{ targetPageId: 'wrong', label: 'Kita' }] }).then(() => model.approvePage(site.id, page.id, 'tester')), /Vidinė nuoroda/);
  await model.editPage(site.id, page.id, { links: [], title: 'Naujas patvirtintas tekstas' });
  await model.approvePage(site.id, page.id, 'tester');
  packageData = model.packageForSite(await model.getSite(site.id));
  assert.equal(packageData.pages[0].title, 'Naujas patvirtintas tekstas');
  const exported = await model.exportPackage(site.id);
  assert.equal(exported.pages, 1);
  assert.equal(JSON.parse(await readFile(exported.path, 'utf8')).pages[0].title, 'Naujas patvirtintas tekstas');
  await assert.rejects(() => model.deleteDraftPage(site.id, page.id), /Patvirtintą puslapį/);
  await model.revokePage(site.id, page.id);
  assert.equal(model.packageForSite(await model.getSite(site.id)).pages.length, 0);
  await model.deleteDraftPage(site.id, page.id);
  assert.equal((await model.getSite(site.id)).pages.length, 0);
});

test('HTTP studio is local, previews are noindex and state changes need studio header', async () => {
  const server = await createServer();
  await new Promise(resolve => server.listen(4319, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:4319';
    const home = await fetch(base); assert.equal(home.status, 200); assert.match(await home.text(), /Turinio studija/);
    const blocked = await fetch(`${base}/api/sites`, { method: 'POST', body: '{}' }); assert.equal(blocked.status, 403);
    const allowed = await fetch(`${base}/api/sites`); assert.equal(allowed.status, 200); assert.ok((await allowed.json()).length >= 20);
    const site = await model.getSite('bandymas');
    const page = await model.addPage(site.id, { type: 'home', slug: '', title: 'Peržiūros bandymas', description: 'Vietinis puslapis', intent: 'Peržiūra' });
    const preview = await fetch(`${base}/preview/${site.id}/${page.id}`);
    assert.equal(preview.status, 200); assert.equal(preview.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(await preview.text(), /Tik privatus juodraštis/);
    const calendar = await fetch(`${base}/api/calendar`);
    assert.equal(calendar.status, 200);
    assert.ok((await calendar.json()).some(entry => entry.siteId === site.id && entry.pageId === page.id && entry.status === 'planned'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('V1 preview renders public-style contextual links safely to local future previews', async () => {
  const site = await model.createSite({canonicalHost:'preview-links.example', name:'Preview links', offer:'Synthetic preview'});
  const target = await model.addPage(site.id, {type:'guide',slug:'future-guide',title:'Future',description:'Future only',intent:'Future'});
  const page = await model.addPage(site.id, {type:'guide',slug:'source',title:'Source',description:'Source',intent:'Source'});
  await model.editPage(site.id,target.id,{publishAt:'2099-01-01T00:00:00.000Z'});
  await model.editPage(site.id,page.id,{
    body:[{type:'paragraph',text:'Future guide and Seller offer. Future guidebook is different. <script>alert(1)</script>'},
      {type:'list',items:['Use Seller offer or the other future.','Ignore unsafe source.']}],
    links:[{targetPageId:target.id,label:'Future guide'}],
    externalLinks:[{url:'https://merchant.example/item?a=1&b=2',label:'Seller offer',reason:'Example',verified:false},
      {url:'https://preview-links.example/future-guide',label:'other future',reason:'Local target',verified:false},
      {url:'https://user:password@merchant.example/item',label:'unsafe source',reason:'Do not expose credentials',verified:false}]
  });
  const server=await createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    const response=await fetch(`${base}/preview/${site.id}/${page.id}`);const html=await response.text();
    assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
    const local=`/preview/${site.id}/${target.id}`;
    assert.ok(html.includes(`<p><a href="${local}">Future guide</a> and <a href="https://merchant.example/item?a=1&amp;b=2">Seller offer</a>. Future guidebook is different.`));
    assert.ok(html.includes(`<li>Use <a href="https://merchant.example/item?a=1&amp;b=2">Seller offer</a> or the <a href="${local}">other future</a>.</li>`));
    assert.ok(html.includes('Ignore unsafe source.'));
    assert.ok(!html.includes('href="https://preview-links.example/future-guide"'));
    assert.ok(!html.includes('user:password@merchant.example'));
    assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('email-only contact can publish without inventing a phone number', async () => {
  const site = await model.createSite({ canonicalHost: 'tik-pastas.lt', name: 'Tik paštas', offer: 'Paslauga per el. paštą' });
  await model.editSite(site.id, { contact: { email: 'info@memorycasting.lt', phone: '' } });
  const page = await model.addPage(site.id, { type: 'home', slug: '', title: 'Paslaugos puslapis', description: 'Susisiekite el. paštu.', intent: 'Paslaugos pasirinkimas', body: [{ type: 'paragraph', text: longText }] });
  await assert.rejects(() => model.approvePage(site.id, page.id, 'tester'), /patikrintų svetainės verslo faktų/);
  await model.editSite(site.id, { facts: 'Užklausos priimamos el. paštu.' });
  await model.approvePage(site.id, page.id, 'tester');
  assert.equal((await model.getSite(site.id)).contact.phone, '');
  const packageData = model.packageForSite(await model.getSite(site.id));
  assert.equal(packageData.site.contact.email, 'info@memorycasting.lt');
});

test('six-month calendar keeps drafts private and external sources require verification', async () => {
  const site = await model.createSite({ canonicalHost: 'kalendorius.lt', name: 'Kalendorius', offer: 'Bandoma paslauga' });
  await model.editSite(site.id, { facts: 'Bandomoji paslauga dokumentuota.', contact: { email: 'info@kalendorius.lt', phone: '' } });
  const home = await model.addPage(site.id, { type: 'home', slug: '', title: 'Pagrindinis', description: 'Paslaugos aprašas', intent: 'Paslaugos paieška', body: [{ type: 'paragraph', text: longText }] });
  await model.approvePage(site.id, home.id, 'tester');
  const chosenDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const plan = await model.mergePlan(site.id, [
    { type: 'guide', slug: 'gidas/pirmas', title: 'Pirmasis gidas', description: 'Pirmas klausimas', intent: 'Pirmas ketinimas', cluster: 'Pasirinkimas', pillarSlug: '', sourceQueries: ['Oficialios gairės'], reason: 'Atsakyti į klausimą', publishDate: chosenDate, seasonalHook: 'Ruošiantis sezono pradžiai' },
    { type: 'guide', slug: 'gidas/antras', title: 'Antrasis gidas', description: 'Antras klausimas', intent: 'Antras ketinimas', cluster: 'Pasirinkimas', pillarSlug: 'gidas/pirmas', sourceQueries: [], reason: 'Papildomas klausimas' },
    { type: 'guide', slug: 'gidas/trecias', title: 'Trečiasis gidas', description: 'Trečias klausimas', intent: 'Trečias ketinimas', cluster: 'Pasirinkimas', pillarSlug: '', sourceQueries: [], reason: 'Dar vienas savitas klausimas' },
  ], 6);
  assert.equal(plan.added, 3);
  const draftSite = await model.getSite(site.id);
  const first = draftSite.pages.find(page => page.slug === 'gidas/pirmas');
  const second = draftSite.pages.find(page => page.slug === 'gidas/antras');
  const third = draftSite.pages.find(page => page.slug === 'gidas/trecias');
  assert.equal(first.pillarPageId, '');
  assert.equal(second.pillarPageId, first.id);
  assert.equal(third.pillarPageId, first.id);
  assert.equal(first.publishAt.slice(0, 10), chosenDate);
  assert.equal(first.seasonalHook, 'Ruošiantis sezono pradžiai');
  assert.ok(Date.parse(first.publishAt) > Date.now());
  assert.ok(Date.parse(second.publishAt) > Date.parse(first.publishAt));
  assert.equal(model.packageForSite(draftSite).pages.length, 1);
  assert.equal((await model.listCalendar()).find(item => item.pageId === first.id).status, 'planned');
  await model.editPage(site.id, first.id, { body: [{ type: 'paragraph', text: longText }], externalLinks: [{ url: 'https://example.com/gaires', label: 'Oficialios gairės', reason: 'Patikrinti konkretų teiginį', verified: false }] });
  await assert.rejects(() => model.approvePage(site.id, first.id, 'tester'), /patikros/);
  await model.editPage(site.id, first.id, { externalLinks: [{ url: 'https://example.com/gaires', label: 'Oficialios gairės', reason: 'Patikrinti konkretų teiginį', verified: true }] });
  await model.approvePage(site.id, first.id, 'tester');
  const pkg = model.packageForSite(await model.getSite(site.id));
  assert.equal(pkg.pages.length, 2);
  assert.equal(pkg.pages.find(page => page.slug === 'gidas/pirmas').externalLinks[0].url, 'https://example.com/gaires');
  assert.equal(pkg.pages.find(page => page.slug === 'gidas/pirmas').externalLinks[0].verified, undefined);
  const { validateContentPackage } = await import(pathToFileURL(path.join(publicRoot,'scripts/content-package-core.mjs')));
  assert.equal(validateContentPackage(pkg).pages.length, 2);
  assert.equal((await model.listCalendar()).find(item => item.pageId === first.id).status, 'scheduled');
  assert.equal(pkg.pages.find(page => page.slug === 'gidas/antras'), undefined);
});

test.after(async () => rm(root, { recursive: true, force: true }));
