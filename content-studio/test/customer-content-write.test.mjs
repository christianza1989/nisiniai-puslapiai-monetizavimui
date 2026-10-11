import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { stableV2, normalizeV2Blocks } from '../src/content-package-v2.mjs';
import { writerOutputSchema } from '../scripts/customer-content-write.mjs';

const digest = value => createHash('sha256').update(stableV2(value)).digest('hex');
const intakeScript = path.resolve(import.meta.dirname, '../scripts/customer-creation-intake.mjs');
const writerScript = path.resolve(import.meta.dirname, '../scripts/customer-content-write.mjs');
const modelUrl = new URL('../src/model.mjs', import.meta.url).href;

test('provider GUIDE schema preserves disjoint native blocks and targets in supported strict format', async () => {
  const native = JSON.parse(await readFile(new URL('../schemas/content-package.v2.schema.json', import.meta.url), 'utf8'));
  const sourceBefore = stableV2(native);
  for (const [name, tag] of [['block', 'type'], ['inline', 'type'], ['target', 'kind']]) {
    const branches = native.$defs[name].oneOf.filter(branch => name !== 'target' || ['page', 'external'].includes(branch.properties.kind.const));
    // Distinct required singleton tags prove oneOf -> anyOf keeps the same valid set.
    assert.equal(new Set(branches.map(branch => branch.properties[tag].const)).size, branches.length);
    assert.ok(branches.every(branch => branch.required.includes(tag)));
    const expected = structuredClone(branches);
    for (const branch of expected) {
      branch.properties[tag].type = 'string';
      if (branch.properties.level) branch.properties.level.type = 'integer';
    }
    if (name === 'target') delete expected.find(branch => branch.properties.kind.const === 'external').properties.url.format;
    assert.deepEqual(writerOutputSchema.$defs[name], { anyOf: expected });
  }
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    assert.equal('oneOf' in node, false);
    if ('const' in node || 'enum' in node) assert.ok(['string', 'integer'].includes(node.type));
    if (node.type === 'object') {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual(new Set(node.required), new Set(Object.keys(node.properties)));
    }
    if ('format' in node) assert.ok(['date-time', 'time', 'date', 'duration', 'email', 'hostname', 'ipv4', 'ipv6', 'uuid'].includes(node.format));
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else walk(value);
  };
  walk(writerOutputSchema);
  assert.equal(writerOutputSchema.type, 'object'); assert.equal('anyOf' in writerOutputSchema, false);
  assert.equal(stableV2(native), sourceBefore);
  const text = { type: 'text', text: 'Sintetinis pavyzdys' };
  const blocks = [{ type: 'paragraph', text: text.text }, { type: 'heading', level: 2, text: text.text },
    { type: 'list', items: [text.text] }, { type: 'image', assetId: 'known-asset' },
    { type: 'richParagraph', content: [text, { type: 'link', text: 'Kitas puslapis', target: { kind: 'page', pageId: 'known-page' } }] },
    { type: 'richHeading', level: 3, content: [text] },
    { type: 'richList', ordered: true, items: [[{ type: 'link', text: 'Šaltinis', target: { kind: 'external', url: 'https://example.invalid/source' } }]] }];
  assert.deepEqual(normalizeV2Blocks(blocks), blocks);
  assert.throws(() => normalizeV2Blocks([{ type: 'richParagraph', content: [{ type: 'link', text: 'Netinkamas adresas', target: { kind: 'external', url: 'http://example.invalid/source' } }] }]));
});
function brief(pathname, parent = '') {
  return { path: pathname, title: 'Praktinės komandos užduoties pasirinkimas', intent: 'Padėti komandai pasirinkti konkrečią pasikartojančią darbo užduotį.',
    head_query: 'Kaip pasirinkti komandos mokymosi užduotį', audience_problem: 'Komanda nežino, kurią pasikartojančią darbo užduotį verta išbandyti pirmiausia.',
    business_goal: 'Patikrinti konkretaus komandos mokymo poreikį prieš siūlant mokamą vykdymą.', primary_topic: 'Praktinis komandos mokymas',
    reason: 'Atskiras pasirinkimo klausimas padeda pasirengti mažam bandymui; tikras vykdymas ir šaltiniai dar nepatikrinti.',
    month: '', seasonal_hook: '', pillar_path: parent, outline: ['Pasirinkti vieną užduotį.', 'Palyginti bandymo sąlygas.', 'Įvertinti rezultatą.'],
    source_queries: ['Tikri komandos mokymosi bandymo vertinimo kriterijai'], source_urls: ['https://example.org/candidate'],
    internal_links: parent ? [parent] : ['/'], media_brief: 'Iliustracija turi parodyti vienos darbo užduoties pasirinkimą ir rezultato palyginimą.',
    media_alt: 'Darbo užduoties pasirinkimo ir bandymo schema', priority: 'initial' };
}
function proposal() {
  const section = { heading: 'Pasirinkite mažą bandymą', body: 'Pradėkite nuo vienos pasikartojančios užduoties ir palyginkite bandymo rezultatą su įprastu darbu.', items: [], layout: 'prose' };
  return { business_name: 'Izoliuotas turinio testas', tagline: 'Praktinio komandos mokymo hipotezė',
    business: { customer: 'Mažų įmonių komandos, norinčios išbandyti konkrečią darbo užduotį.', paid_result: 'Hipotetinis praktinės dirbtuvės rezultatas; vykdymas dar nepatvirtintas.' },
    confirmed_facts: ['Modelio teiginys nėra patvirtintas verslo faktas.'], assumptions: ['Dirbtuvės gali būti naudingos komandai.'], open_questions: ['Kas galėtų patikimai vesti dirbtuves?'],
    research: [{ title: 'Neperskaitytas šaltinio kandidatas', url: 'https://example.org/candidate', finding: 'Tai tik izoliuoto bandymo kandidatas.' }],
    brand: { accent: 'indigo' },
    pages: [['/', 'Komandos mokymosi bandymas'], ['/uzduotis/', 'Praktinės užduoties pasirinkimas'], ['/pasiruosimas/', 'Pasiruošimas komandos bandymui']].map(([pathname, title]) => ({ path: pathname, title, navigation_label: title,
      meta_description: 'Praktinės komandos užduoties pasirinkimas ir nedidelio bandymo pasiruošimas.', intent: 'Padėti komandai pasirinkti naudingą mažą bandymą.', sections: [section, { ...section, heading: 'Patikrinkite rezultatą' }] })),
    content_plan: [brief('/uzduotis/'), brief('/pasiruosimas/', '/uzduotis/'), brief('/vertinimas/', '/uzduotis/')] };
}
async function sandbox(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'native-writer-'));
  t.after(async () => { assert.ok(directory.startsWith(path.join(os.tmpdir(), 'native-writer-'))); await rm(directory, { recursive: true, force: true }); });
  const artifactsRoot = path.join(directory, 'runtime', 'artifacts'); await mkdir(artifactsRoot, { recursive: true });
  const settings = path.join(directory, 'network.json'); await writeFile(settings, JSON.stringify({ defaultEmail: 'unused@example.invalid', operatorName: 'Nepatvirtintas operatorius', contactsBySite: {} }));
  const draft = proposal(), creationId = randomUUID(), acceptedRevision = 1;
  const revisionDir = path.join(artifactsRoot, 'customer-content', creationId, 'revision-' + acceptedRevision);
  const input = { creationId, acceptedRevision, sourceHash: digest(draft), draft, canonicalHost: 'writer.example.invalid', artifactsRoot,
    dataDir: path.join(revisionDir, 'data'), outputDir: path.join(revisionDir, 'output'), verifiedFacts: [], knownContact: { email: '', phone: '' }, operatorName: '' };
  const env = { ...process.env, STUDIO_NETWORK_SETTINGS: settings };
  function run(script, value) {
    const result = spawnSync(process.execPath, [script], { input: JSON.stringify(value), encoding: 'utf8', timeout: 20000, windowsHide: true, env });
    assert.equal(result.error, undefined);
    return { status: result.status, value: JSON.parse(result.status === 0 ? result.stdout : result.stderr) };
  }
  const imported = run(intakeScript, input); assert.equal(imported.status, 0, JSON.stringify(imported.value));
  const pageId = imported.value.pageMappings.find(item => item.path === '/uzduotis/').pageId;
  const base = { creationId, acceptedRevision, sourceHash: input.sourceHash, canonicalHost: input.canonicalHost,
    artifactsRoot, dataDir: input.dataDir, outputDir: input.outputDir, pageId };
  const siteId = imported.value.siteId, filename = path.join(input.dataDir, 'sites', siteId + '.json');
  const call = value => run(writerScript, { ...base, ...value });
  const read = async () => JSON.parse(await readFile(filename, 'utf8'));
  function mutate(code) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `const m=await import(${JSON.stringify(modelUrl)});const siteId=${JSON.stringify(siteId)},pageId=${JSON.stringify(pageId)};${code}`], {
      encoding: 'utf8', timeout: 20000, windowsHide: true, env: { ...env, STUDIO_DATA_DIR: input.dataDir, STUDIO_OUTPUT_DIR: input.outputDir } });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim() ? JSON.parse(result.stdout) : undefined;
  }
  const prepare = () => { const result = call({ command: 'prepare' }); assert.equal(result.status, 0, JSON.stringify(result.value)); return result.value; };
  const apply = (prepared, output = richOutput()) => call({ command: 'apply', expectedRevisionHash: prepared.expectedRevisionHash,
    expectedPlanningHash: prepared.expectedPlanningHash, expectedContextHash: prepared.expectedContextHash, output });
  return { input, base, filename, directory, revisionDir, siteId, pageId, call, read, mutate, prepare, apply };
}
function richOutput(target) {
  return { title: 'Kaip pasirinkti vieną komandos darbo užduotį', description: 'Pasirinkite nedidelę pasikartojančią užduotį, susitarkite dėl bandymo sąlygų ir palyginkite jo rezultatą.',
    intent: 'Padėti komandai pasirinkti konkrečią darbo užduotį ir sąžiningai įvertinti mažo bandymo rezultatą.',
    body: [{ type: 'richParagraph', content: [{ type: 'text', text: 'Pasirinkite vieną pasikartojančią užduotį, kurios rezultatą komanda gali aiškiai palyginti. Pirmas bandymas padeda patikrinti darbo būdą, tačiau savaime neįrodo sutaupyto laiko ar mokymo kokybės.' }] },
      { type: 'richHeading', level: 2, content: [{ type: 'text', text: 'Susitarkite dėl palyginimo' }] },
      { type: 'richList', ordered: true, items: [[{ type: 'text', text: 'Aprašykite įprastą rezultatą ir sąlygas.' }], [{ type: 'text', text: 'Išbandykite vieną pakeitimą tomis pačiomis sąlygomis.' }], [{ type: 'text', text: 'Palyginkite rezultatus ir užrašykite pastebėtus skirtumus.' }]] },
      ...(target ? [{ type: 'richParagraph', content: [{ type: 'text', text: 'Tada peržiūrėkite ' }, { type: 'link', text: 'pasiruošimo bandymui gaires', target: { kind: 'page', pageId: target } }, { type: 'text', text: '.' }] }] : [])],
    factChecks: ['Mokytojas ir mokamo vykdymo sąlygos dar nepatvirtinti; tekste jų nežadame.'] };
}

test('repeated prepare keeps the exact creator prompt and meaningful research context stable', async t => {
  const fixture = await sandbox(t), first = fixture.prepare(), second = fixture.prepare();
  for (const key of ['expectedRevisionHash', 'expectedPlanningHash', 'expectedContextHash', 'instructionHash', 'researchSnapshotHash'])
    assert.equal(second[key], first[key]);
  assert.equal(digest(second.instructions), digest(first.instructions));
  const data = JSON.parse(first.instructions.split('matching the supplied output schema.\n')[1]);
  assert.equal('assessedAt' in data.siteData.seoResearch, false);
  assert.deepEqual(data.pageData, first.pageData);
});

test('prepare exposes the whole real brief, candidate sources and unknown facts without mutating intake', async t => {
  const fixture = await sandbox(t), before = await readFile(fixture.filename), prepared = fixture.prepare();
  assert.equal(prepared.state, 'prepared'); assert.deepEqual(prepared.pageData.planningBrief, fixture.input.draft.content_plan[0]);
  assert.deepEqual(prepared.siteData.verifiedFacts, []); assert.equal(prepared.siteData.currentSiteFacts, '');
  assert.deepEqual(prepared.siteData.contact, { email: '', phone: '' }); assert.equal(prepared.siteData.operatorName, '');
  assert.deepEqual(prepared.pageData.sourceCandidates, ['https://example.org/candidate']); assert.deepEqual(prepared.pageData.existingVerifiedExternalUrls, []);
  assert.ok(prepared.instructions.includes('language-quality.md')); assert.ok(prepared.instructions.includes('planningBrief'));
  assert.equal(prepared.instructionMetadata.mode, 'draft'); assert.ok(prepared.workflow.pages.every(page => page.state === 'blocked'));
  assert.deepEqual(prepared.outputSchema, writerOutputSchema);
  assert.deepEqual(await readFile(fixture.filename), before); assert.equal(prepared.fullF1, 'UNVERIFIED'); assert.equal(prepared.launch, 'UNVERIFIED');
});

test('native useful rich content is applied losslessly and retains actual unresolved publication gates', async t => {
  const fixture = await sandbox(t), prepared = fixture.prepare(), siteBefore = await fixture.read();
  const originalNames = ['intake-manifest.json', 'intake-context.json', 'source-draft.json'];
  const originals = await Promise.all(originalNames.map(name => readFile(path.join(fixture.revisionDir, name))));
  const other = siteBefore.pages.find(page => page.slug === 'pasiruosimas').id, output = richOutput(other);
  const result = fixture.apply(prepared, output); assert.equal(result.status, 0, JSON.stringify(result.value));
  const receipt = result.value, site = await fixture.read(), page = site.pages.find(page => page.id === fixture.pageId);
  assert.equal(receipt.state, 'private-draft-written'); assert.deepEqual(page.body, output.body); assert.equal(page.title, output.title);
  assert.ok(page.factChecks.includes(output.factChecks[0])); assert.ok(siteBefore.pages.find(page => page.id === fixture.pageId).factChecks.every(note => page.factChecks.includes(note)));
  assert.equal(page.approval, null); assert.equal(page.publishedRevision, null); assert.equal(page.publishAt, siteBefore.pages.find(page => page.id === fixture.pageId).publishAt);
  assert.deepEqual(page.planningBrief, prepared.pageData.planningBrief); assert.deepEqual(page.externalLinks, prepared.pageData.externalLinks);
  const workflowPage = receipt.workflow.pages.find(value => value.pageId === fixture.pageId);
  assert.equal(workflowPage.revisionHash, receipt.appliedRevisionHash); assert.equal(workflowPage.state, 'blocked');
  assert.ok(workflowPage.blockers.some(note => note.includes('vaizdo'))); assert.ok(workflowPage.blockers.some(note => note.includes('šaltinių')));
  assert.equal(receipt.sourceVerification, 'not-performed'); assert.equal(receipt.mediaVerification, 'not-performed');
  assert.deepEqual(await Promise.all(originalNames.map(name => readFile(path.join(fixture.revisionDir, name)))), originals);
});

test('validate returns exact normalized native candidate and never mutates any intake or site bytes', async t => {
  const fixture = await sandbox(t), prepared = fixture.prepare(), current = await readFile(fixture.filename);
  const names = ['intake-manifest.json', 'intake-context.json', 'source-draft.json'];
  const originals = await Promise.all(names.map(name => readFile(path.join(fixture.revisionDir, name))));
  const output = richOutput();
  const request = { command: 'validate', expectedRevisionHash: prepared.expectedRevisionHash,
    expectedPlanningHash: prepared.expectedPlanningHash, expectedContextHash: prepared.expectedContextHash, output };
  const result = fixture.call(request);
  assert.equal(result.status, 0); assert.equal(result.value.state, 'validated');
  assert.deepEqual(result.value.output, output); assert.equal(result.value.outputHash, digest(output));
  assert.deepEqual(await readFile(fixture.filename), current);
  assert.deepEqual(await Promise.all(names.map(name => readFile(path.join(fixture.revisionDir, name)))), originals);
  const invented = richOutput('page-' + 'f'.repeat(24));
  assert.equal(fixture.call({ ...request, output: invented }).value.code, 'writer_unknown_link');
  assert.deepEqual(await readFile(fixture.filename), current);
  assert.equal(fixture.call({ ...request, expectedContextHash: '0'.repeat(64) }).value.code, 'writer_context_stale');
  assert.deepEqual(await readFile(fixture.filename), current);
  const applied = fixture.apply(prepared, result.value.output);
  assert.equal(applied.status, 0); assert.equal(applied.value.outputHash, result.value.outputHash);
});

for (const mutation of ['content', 'planning', 'site']) test(`stale ${mutation} context cannot overwrite the accepted current private draft`, async t => {
  const fixture = await sandbox(t), prepared = fixture.prepare();
  fixture.mutate({ content: `await m.editPage(siteId,pageId,{title:'Naujas jau išsaugotas puslapio pavadinimas'});`,
    planning: `const p=(await m.getSite(siteId)).pages.find(p=>p.id===pageId);await m.reconcilePlanningBrief(siteId,pageId,{expectedRevisionHash:m.revisionHash(p),expectedPlanningHash:m.planningContextHash(p),planningBrief:{...p.planningBrief,head_query:'Kitas tikras skaitytojo klausimas'}});`,
    site: `await m.editSite(siteId,{facts:'Pasikeitę atskirai pateikti sintetiniai verslo duomenys.'});` }[mutation]);
  const current = await readFile(fixture.filename), result = fixture.apply(prepared);
  assert.equal(result.status, 1); assert.equal(result.value.code, 'writer_context_stale'); assert.deepEqual(await readFile(fixture.filename), current);
});

test('cross-page hashes and cross-creation manifest identities are rejected without writes', async t => {
  const fixture = await sandbox(t), prepared = fixture.prepare(), site = await fixture.read(), current = await readFile(fixture.filename);
  const secondId = site.pages.find(page => page.slug === 'pasiruosimas').id;
  const crossPage = fixture.call({ command: 'apply', pageId: secondId, expectedRevisionHash: prepared.expectedRevisionHash,
    expectedPlanningHash: prepared.expectedPlanningHash, expectedContextHash: prepared.expectedContextHash, output: richOutput() });
  assert.equal(crossPage.value.code, 'writer_context_stale'); assert.deepEqual(await readFile(fixture.filename), current);
  const manifestFile = path.join(fixture.revisionDir, 'intake-manifest.json'), manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  manifest.creationId = randomUUID(); await writeFile(manifestFile, JSON.stringify(manifest));
  assert.equal(fixture.call({ command: 'prepare' }).value.code, 'writer_intake_binding_mismatch');
  assert.deepEqual(await readFile(fixture.filename), current);
});

test('original draft hash tampering and pages without an actual planning brief stop preparation', async t => {
  const fixture = await sandbox(t), site = await fixture.read(), current = await readFile(fixture.filename);
  const homeId = site.pages.find(page => page.type === 'home').id;
  assert.equal(fixture.call({ command: 'prepare', pageId: homeId }).value.code, 'writer_planning_brief_required');
  assert.equal(fixture.call({ command: 'prepare', sourceHash: '0'.repeat(64) }).value.code, 'writer_intake_binding_mismatch');
  const original = path.join(fixture.revisionDir, 'source-draft.json');
  await writeFile(original, Buffer.concat([await readFile(original), Buffer.from('\n')]));
  assert.equal(fixture.call({ command: 'prepare' }).value.code, 'writer_original_hash_mismatch');
  assert.deepEqual(await readFile(fixture.filename), current);
});

test('changed private research evidence invalidates prepared context without inventing source coverage', async t => {
  const fixture = await sandbox(t), directory = path.join(fixture.base.dataDir, 'seo-research', fixture.siteId);
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, 'current.json');
  const bundle = { version: 1, siteId: fixture.siteId, domain: fixture.base.canonicalHost, language: 'lt', country: 'LT', observations: [] };
  await writeFile(file, JSON.stringify(bundle));
  const prepared = fixture.prepare(), current = await readFile(fixture.filename);
  assert.ok(prepared.instructions.includes('"status": "unverified"'));
  assert.ok(prepared.instructions.includes('"paidExecution": "disabled-in-generation"'));
  await writeFile(file, JSON.stringify({ ...bundle, testMarker: 'Kitas izoliuotas privataus įrodymo snapshot' }));
  assert.equal(fixture.apply(prepared).value.code, 'writer_context_stale');
  assert.deepEqual(await readFile(fixture.filename), current);
});

test('malformed rich blocks, invented assets, candidate citations and review claims never write', async t => {
  const fixture = await sandbox(t), prepared = fixture.prepare(), current = await readFile(fixture.filename);
  const invalid = [
    { ...richOutput(), body: [{ type: 'richParagraph', content: [{ type: 'text', text: 'Tekstas', html: '<script/>' }] }] },
    { ...richOutput(), body: [{ type: 'image', assetId: 'invented-image' }] },
    { ...richOutput(), body: [{ type: 'richParagraph', content: [{ type: 'link', text: 'Tariamai patikrintas šaltinis', target: { kind: 'external', url: 'https://example.org/candidate' } }] }] },
    { ...richOutput(), body: [{ type: 'richParagraph', content: [{ type: 'link', text: 'Svetimas puslapis', target: { kind: 'page', pageId: 'foreign-page' } }] }] },
    { ...richOutput(), sourceVerification: 'PASS' },
  ];
  for (const output of invalid) { assert.equal(fixture.apply(prepared, output).status, 1); assert.deepEqual(await readFile(fixture.filename), current); }
});

test('writing an approved page preserves its exact prior public snapshot and immutable release', async t => {
  const fixture = await sandbox(t);
  const before = fixture.mutate(`await m.editSite(siteId,{facts:'Tik šio izoliuoto bandymo duomenys.',contact:{email:'fixture@example.invalid',phone:''},operatorName:'Sintetinio bandymo operatorius'});
    const s=await m.getSite(siteId),home=s.pages.find(p=>p.type==='home');
    for(const id of [home.id,pageId]){await m.editPage(siteId,id,{type:id===pageId?'service':'home',factChecks:[],externalLinks:[],linkSuggestions:[]});
      const p=(await m.getSite(siteId)).pages.find(p=>p.id===id);await m.recordEditorialReview(siteId,id,{reviewer:'synthetic-writer-test',revisionHash:m.revisionHash(p),evidence:Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(area=>[area,'Izoliuotos sintetinės fixture patikra: '+area+'; tai nėra tikro kliento priėmimas.']))});}
    await m.approveReviewedBatch(siteId,[home.id,pageId],'synthetic-test-editor');const release=await m.releaseContent(siteId);
    process.stdout.write(JSON.stringify({page:(await m.getSite(siteId)).pages.find(p=>p.id===pageId),release}));`);
  const releaseBytes = await readFile(before.release.path), releaseManifest = await readFile(before.release.manifestPath), prepared = fixture.prepare();
  assert.equal(fixture.apply(prepared).status, 0);
  const page = (await fixture.read()).pages.find(page => page.id === fixture.pageId);
  assert.deepEqual(page.publishedRevision, before.page.publishedRevision); assert.equal(page.publishAt, before.page.publishAt); assert.equal(page.approval, null);
  assert.deepEqual(await readFile(before.release.path), releaseBytes);
  assert.deepEqual(await readFile(before.release.manifestPath), releaseManifest);
});

test('the atomic model CAS rejects a concurrent second writer from one prepared context', async t => {
  const fixture = await sandbox(t);
  const result = fixture.mutate(`const site=await m.getSite(siteId),p=site.pages.find(p=>p.id===pageId);
    const expected={expectedRevisionHash:m.revisionHash(p),expectedPlanningHash:m.planningContextHash(p),expectedSiteHash:m.studioContextHash(site)};
    const outcomes=await Promise.allSettled([m.editPage(siteId,pageId,{title:'Pirmas tikras privatus pakeitimas'},expected),m.editPage(siteId,pageId,{title:'Antras pasenęs pakeitimas'},expected)]);
    process.stdout.write(JSON.stringify(outcomes.map(result=>({status:result.status,code:result.reason?.code}))));`);
  assert.equal(result.filter(value => value.status === 'fulfilled').length, 1); assert.equal(result.filter(value => value.code === 'writer_context_stale').length, 1);
  assert.equal((await fixture.read()).pages.find(page => page.id === fixture.pageId).title, 'Pirmas tikras privatus pakeitimas');
});
