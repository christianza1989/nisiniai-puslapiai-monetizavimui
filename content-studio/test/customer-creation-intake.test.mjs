import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { stableV2 } from '../src/content-package-v2.mjs';

const script = path.resolve(import.meta.dirname, '../scripts/customer-creation-intake.mjs');
const digest = value => createHash('sha256').update(stableV2(value), 'utf8').digest('hex');
function draftFixture() {
  const section = { heading: 'Pasirinkite vieną darbo užduotį', body: 'Komanda gali pradėti nuo pasikartojančios užduoties ir palyginti įprastą darbą su nauju būdu.', items: [], layout: 'prose' };
  return { business_name: 'Komandos dirbtuvės', tagline: 'Praktinis mokymas mažų įmonių komandoms',
    assistant_reply: 'Parengiau verslo pasiūlymo juodraštį. Tikrus vykdymo duomenis dar reikia patvirtinti.',
    business: { customer: 'Mažų įmonių komandos, norinčios sumažinti pasikartojantį darbą.',
      paid_result: 'Parengtas vienos darbo užduoties atlikimo būdas ir jo praktinis išbandymas.',
      payer: 'Mokantis įmonės vadovas arba už komandos mokymą atsakingas asmuo.',
      offer: 'Praktinės dirbtuvės vienai darbo užduočiai, pasirinktos pagal tikrą komandos poreikį.',
      monetization: 'Įmonė mokėtų už dirbtuves, tačiau kaina ir vykdymo sąnaudos dar nepatvirtintos.',
      interest_test: 'Surinkti tikras užklausas ir patikrinti, kokį rezultatą komanda norėtų pirkti.',
      alternatives: ['Palyginti individualų konsultavimą ir nedidelės komandos mokymą.'],
      execution_steps: ['Pasirinkti konkrečią pasikartojančią darbo užduotį.', 'Patikrinti mokytojo kompetenciją ir vykdymo galimybes.', 'Apskaičiuoti išlaidas prieš siūlant mokamą vykdymą.'],
      expansion_criteria: ['Gauti tinkamų klientų užklausų.', 'Patikrinti pajamas ir vykdymo sąnaudas.'] },
    confirmed_facts: ['AI įvardytas teiginys nėra savininko patvirtintas verslo faktas.'],
    assumptions: ['Mažoms komandoms gali būti naudinga siaura dirbtuvių tema.'], open_questions: ['Kas galėtų patikimai vesti pirmąsias dirbtuves?'],
    research: [{ title: 'Šaltinio kandidatas', url: 'https://example.org/research', market: 'Lietuva', finding: 'Tai tyrimo kandidatas; jo turinys šiame teste nebuvo perskaitytas.', is_counterevidence: false }],
    tools: ['Turinys', 'Peržiūra'].map(area => ({ area, tool: 'Turinio studija', purpose: 'Parengti ir patikrinti turinio juodraštį.', phase: 'draft', limitation: 'Tikras publikavimas dar nepatikrintas.' })),
    brand: { accent: 'indigo', composition: 'editorial', rationale: 'Aiški teksto struktūra padeda palyginti praktinio mokymo galimybes.' },
    pages: [['/', 'Komandos dirbtuvės'], ['/uzduoties-pasirinkimas/', 'Užduoties pasirinkimas'], ['/mokymo-paruosimas/', 'Mokymo paruošimas']].map(([pathname, title]) => ({ path: pathname, title, navigation_label: title,
      meta_description: 'Praktinio komandos mokymo pasirinkimas pagal vieną konkrečią darbo užduotį.', intent: 'Padėti komandai pasirinkti prasmingą mokymosi užduotį.', sections: [structuredClone(section), { ...structuredClone(section), heading: 'Patikrinkite vykdymo galimybes' }] })),
    language_review: 'Tekstas peržiūrėtas kaip sintetinis testas; tikra redakcinė peržiūra neatlikta.',
    remaining_gates: ['Patikrinti faktinius mokymo pajėgumus.', 'Parengti tikrus temos vaizdus.', 'Patikrinti kontaktinio laiško pristatymą.'] };
}
async function sandbox(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'creation-intake-'));
  t.after(async () => { assert.ok(path.basename(directory).startsWith('creation-intake-')); await rm(directory, { recursive: true, force: true }); });
  const artifactsRoot = path.join(directory, 'runtime', 'artifacts'); await mkdir(artifactsRoot, { recursive: true });
  const settings = path.join(directory, 'network.json');
  await writeFile(settings, JSON.stringify({ defaultEmail: 'seed@example.invalid', operatorName: 'Nepatvirtintas numatytasis operatorius', contactsBySite: {} }));
  const input = { creationId: randomUUID(), acceptedRevision: 1, draft: draftFixture(), canonicalHost: 'mokymai-ai.lt', artifactsRoot, verifiedFacts: [], operatorName: '' };
  update(input);
  const call = (value = input, extraEnv = {}) => {
    const result = spawnSync(process.execPath, [script], { input: JSON.stringify(value), encoding: 'utf8', timeout: 20000, windowsHide: true,
      env: { ...process.env, STUDIO_NETWORK_SETTINGS: settings, ...extraEnv } });
    assert.equal(result.error, undefined);
    return { status: result.status, value: JSON.parse(result.status === 0 ? result.stdout : result.stderr) };
  };
  const sitePath = () => path.join(input.dataDir, 'sites', 'creation-' + input.creationId.replaceAll('-', '') + '.json');
  return { input, call, sitePath, directory };
}
function update(input) {
  input.sourceHash = digest(input.draft);
  const base = path.join(input.artifactsRoot, 'customer-content', input.creationId, 'revision-' + input.acceptedRevision);
  input.dataDir = path.join(base, 'data'); input.outputDir = path.join(base, 'output');
}

test('native proposal contact/about/index types retain exact URLs without inheriting guide image or author gates', async t => {
  const { input, call, sitePath } = await sandbox(t);
  const template = input.draft.pages[1];
  input.draft.pages = [input.draft.pages[0], ...['/kontaktai/','/apie/','/gidai/'].map(path => ({...structuredClone(template),path})),
    {...structuredClone(template),path:'/taisykles/',type:'policy'}];
  update(input);
  assert.equal(call().status,0);
  const site = JSON.parse(await readFile(sitePath()));
  assert.deepEqual(site.pages.map(p=>p.type),['home','contact','about','index','policy']);
  assert.deepEqual(site.pages.map(p=>p.slug),['','kontaktai','apie','gidai','taisykles']);
  assert.ok(site.pages.every(p=>p.approval===null && p.publishedRevision===null));
  assert.equal(site.contact.email,'');assert.equal(site.operatorName,'');
});

test('unknown or misplaced explicit native proposal types fail before original intake artifacts are created', async t => {
  const { input, call } = await sandbox(t);
  for(const type of ['made-up','home']) {
    input.draft.pages[1].type=type;update(input);
    assert.equal(call().value.code,'invalid_server_page_type');
    await assert.rejects(readFile(path.join(input.dataDir,'sites','creation-'+input.creationId.replaceAll('-','')+'.json')),/ENOENT/);
  }
});

test('canonical intake keeps exact V2 text and exposes actual shared blockers without seeds or approval', async t => {
  const { input, call, sitePath } = await sandbox(t);
  input.draft.pages[1].sections[0].items = ['Ž'.repeat(800)]; update(input);
  const result = call(); assert.equal(result.status, 0, JSON.stringify(result.value));
  const receipt = result.value, site = JSON.parse(await readFile(sitePath(), 'utf8'));
  assert.equal(site.id, 'creation-' + input.creationId.replaceAll('-', ''));
  assert.equal(site.contentWorkflowVersion, 1); assert.equal(site.schemaVersion, 2);
  assert.deepEqual(site.contact, { email: '', phone: '' }); assert.equal(site.operatorName, ''); assert.equal(site.facts, '');
  assert.equal(site.offer, input.draft.tagline); assert.equal(site.audience, input.draft.business.customer);
  assert.equal(site.pages[1].body.find(block => block.type === 'list').items[0], 'Ž'.repeat(800));
  assert.ok(site.pages.every(page => page.status === 'review' && page.contentVersion === 2 && page.approval === null && page.publishedRevision === null));
  assert.equal((await readdir(path.dirname(sitePath()))).length, 1); assert.deepEqual(await readdir(input.outputDir), []);
  assert.equal(receipt.contentPlanState, 'not-provided'); assert.equal(receipt.fullF1, 'UNVERIFIED'); assert.equal(receipt.launch, 'UNVERIFIED');
  assert.ok(receipt.workflow.pages.every(page => page.state === 'blocked' && !page.reviewCurrent && !page.hasApprovedRevision));
  assert.ok(receipt.workflow.pages[1].blockers.some(note => note.includes('vaizdo')));
  assert.ok(receipt.workflow.pages[1].blockers.some(note => note.includes('šaltinių')));
  assert.ok(receipt.workflow.pages[1].blockers.some(note => note.includes('nuorodos')));
  assert.ok(receipt.workflow.pages[1].blockers.some(note => note.includes('faktų')));
  assert.ok(receipt.workflow.pages[1].blockers.some(note => note.includes('peržiūros')));
  assert.deepEqual(JSON.parse(await readFile(path.join(path.dirname(input.dataDir), 'source-draft.json'), 'utf8')), input.draft);
  const inspect = `const m=await import(${JSON.stringify(pathToModel())});process.stdout.write(JSON.stringify(await m.getContentWorkflow(${JSON.stringify(site.id)})));`;
  const actual = spawnSync(process.execPath, ['--input-type=module', '-e', inspect], { encoding: 'utf8', windowsHide: true, env: { ...process.env, STUDIO_DATA_DIR: input.dataDir, STUDIO_OUTPUT_DIR: input.outputDir } });
  assert.equal(actual.status, 0, actual.stderr); assert.deepEqual(receipt.workflow, JSON.parse(actual.stdout));
});
function pathToModel() { return new URL('../src/model.mjs', import.meta.url).href; }

test('exact replay preserves bytes; changed draft or verified inputs conflict with the pinned revision', async t => {
  const { input, call, sitePath } = await sandbox(t);
  input.knownContact = { email: 'info@pinet.lt', phone: '' }; input.operatorName = 'MB Pinet';
  input.verifiedFacts = ['Serverio patvirtintas sintetinio bandymo faktas.'];
  const first = call(); assert.equal(first.status, 0, JSON.stringify(first.value));
  const before = await readFile(sitePath());
  assert.deepEqual(JSON.parse(before).contact, input.knownContact); assert.equal(JSON.parse(before).operatorName, 'MB Pinet');
  assert.equal(JSON.parse(before).facts, input.verifiedFacts[0]);
  const second = call(); assert.equal(second.status, 0); assert.equal(second.value.replayed, true); assert.deepEqual(await readFile(sitePath()), before);
  const altered = structuredClone(input); altered.draft.pages[1].title = 'Kita tos pačios revizijos antraštė'; update(altered);
  assert.equal(call(altered).value.code, 'intake_revision_conflict');
  input.knownContact.email = 'another@example.invalid'; assert.equal(call().value.code, 'intake_revision_conflict');
  assert.deepEqual(await readFile(sitePath()), before);
});

test('new revision imports separately and customer names never become directory identity', async t => {
  const { input, call, sitePath } = await sandbox(t);
  input.draft.business_name = '../../client/desktop'; update(input);
  assert.equal(call().status, 0); const oldPath = sitePath(), original = await readFile(oldPath);
  input.acceptedRevision = 2; input.draft.pages[1].title = 'Patikslintas užduoties pasirinkimas'; update(input);
  const second = call(); assert.equal(second.status, 0, JSON.stringify(second.value));
  assert.equal(second.value.acceptedRevision, 2); assert.deepEqual(await readFile(oldPath), original);
  assert.equal(JSON.parse(await readFile(sitePath(), 'utf8')).name, '../../client/desktop');
  assert.ok(second.value.dataDir.includes('revision-2')); assert.ok(!second.value.dataDir.includes('client'));
});

test('hash, absolute paths, revision scope and directory junction escapes fail before touching foreign state', async t => {
  const { input, call, directory } = await sandbox(t);
  const bad = structuredClone(input); bad.sourceHash = '0'.repeat(64); assert.equal(call(bad).value.code, 'source_hash_mismatch');
  bad.sourceHash = input.sourceHash; bad.dataDir = path.join(directory, 'outside'); assert.equal(call(bad).value.code, 'revision_directory_mismatch');
  bad.dataDir = 'data'; assert.equal(call(bad).value.code, 'absolute_artifact_paths_required');
  const outside = path.join(directory, 'outside'); await mkdir(outside);
  await symlink(outside, path.join(input.artifactsRoot, 'customer-content'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(call().value.code, 'unsafe_artifact_directory'); assert.deepEqual(await readdir(outside), []);
});

test('interrupted or changed imports are preserved and never overwritten or silently resumed', async t => {
  const { input, call, sitePath } = await sandbox(t);
  const revisionDir = path.dirname(input.dataDir); await mkdir(revisionDir, { recursive: true });
  const partial = path.join(revisionDir, 'source-draft.json'); await writeFile(partial, 'preserved partial receipt');
  assert.equal(call().value.code, 'intake_interrupted'); assert.equal(await readFile(partial, 'utf8'), 'preserved partial receipt');
  input.acceptedRevision = 2; update(input); assert.equal(call().status, 0);
  await writeFile(sitePath(), '{}'); assert.equal(call().value.code, 'intake_artifact_changed'); assert.equal(await readFile(sitePath(), 'utf8'), '{}');
});

test('actual month-only plan uses shared mergePlan with empty future bodies and unresolved dependency checks', async t => {
  const { input, call, sitePath } = await sandbox(t);
  input.draft.content_plan = ['uzduoties-pasirinkimas', 'pirmas-bandymas', 'rezultato-patikra'].map((slug, index) => ({ path: '/' + slug + '/',
    title: 'Praktinio mokymo klausimas ' + (index + 1), intent: 'Padėti komandai patikrinti vieną praktinio mokymo sprendimą.', head_query: 'Kaip komandai pasirinkti praktinį mokymą', month: index ? '' : '2026-12',
    audience_problem: 'Komandai reikia suprasti, ar pasirinkta darbo užduotis tinka praktiniam mokymui.', business_goal: 'Prieš mokamą vykdymą patikrinti vieną aiškų poreikį.',
    primary_topic: 'Praktinis komandos mokymas', reason: 'Atskiras klausimas su tikrais vykdymo ir šaltinių priklausomybių poreikiais.',
    outline: ['Pasirinkti užduotį.', 'Paruošti bandymą.', 'Patikrinti rezultatą.'], source_queries: ['Ž'.repeat(500)], source_urls: ['https://example.org/guide'],
    pillar_path: index ? '/uzduoties-pasirinkimas/' : '', internal_links: index === 2 ? ['/nerastas-gidas/'] : ['/'],
    media_brief: 'Sukurti konkrečios temos paaiškinimo schemą apie praktinį komandos mokymą.', media_alt: 'Praktinio mokymo užduoties schema.', priority: 'initial', seasonal_hook: '' }));
  update(input); const result = call(); assert.equal(result.status, 0, JSON.stringify(result.value));
  assert.equal(result.value.contentPlanState, 'imported-unscheduled'); assert.equal(result.value.planImported, 3);
  const site = JSON.parse(await readFile(sitePath(), 'utf8')); assert.equal(site.pages.length, 5);
  const rootGuide = site.pages.find(page => page.slug === 'uzduoties-pasirinkimas');
  const supportGuide = site.pages.find(page => page.slug === 'pirmas-bandymas');
  assert.equal(supportGuide.pillarPageId, rootGuide.id); assert.deepEqual(supportGuide.sourceQueries, ['Ž'.repeat(500)]);
  assert.deepEqual(supportGuide.planningBrief, input.draft.content_plan[1]);
  assert.equal(result.value.planningBriefState, 'partial'); assert.equal(result.value.writer, 'not-executed');
  assert.ok(result.value.dependencies.includes('native-v2-writer-integration-unverified'));
  const planned = site.pages.find(page => page.slug === 'rezultato-patikra');
  assert.deepEqual(planned.body, []); assert.equal(planned.publishAt, result.value.importedAt);
  assert.ok(planned.factChecks.some(note => note.includes('/nerastas-gidas/')));
  assert.equal(planned.externalLinks[0].verified, false); assert.equal(planned.approval, null);
  assert.ok(result.value.workflow.pages.find(page => page.pageId === planned.id).blockers.includes('Turinys neparengtas.'));
});

test('real plan parent precedes existing draft support even when inventory was created in the opposite order', async t => {
  const { input, call, sitePath } = await sandbox(t);
  const paths = ['/platesnis-gidas/', '/uzduoties-pasirinkimas/', '/praktinis-bandymas/'];
  input.contentPlan = paths.map((pathname, index) => ({ path: pathname, title: 'Praktinio mokymo klausimas ' + index,
    intent: 'Padėti komandai išsiaiškinti vieną mokymo pasirinkimo klausimą.', head_query: 'Kaip pasirinkti komandos mokymą',
    audience_problem: 'Komandai reikia aiškaus atsakymo apie praktinio mokymo pasirinkimą.', business_goal: 'Patikrinti vieną tikrą komandos mokymo poreikį.',
    primary_topic: 'Praktinis komandos mokymas', reason: 'Atskiras pasirinkimo klausimas su aiškiais vykdymo ir šaltinių tikrinimo poreikiais.', month: '', seasonal_hook: '',
    pillar_path: index ? paths[0] : '', outline: ['Pasirinkti užduotį.', 'Paruošti bandymą.', 'Patikrinti rezultatą.'],
    source_queries: ['Praktinio mokymo pasirinkimas'], source_urls: [], internal_links: ['/'],
    media_brief: 'Parengti schemą, paaiškinančią pasirinktą komandos mokymo klausimą.', media_alt: 'Komandos mokymo klausimo schema', priority: 'initial' }));
  const result = call(); assert.equal(result.status, 0, JSON.stringify(result.value)); assert.equal(result.value.planningBriefState, 'attached');
  const site = JSON.parse(await readFile(sitePath(), 'utf8'));
  const parent = site.pages.find(page => page.slug === 'platesnis-gidas'), child = site.pages.find(page => page.slug === 'uzduoties-pasirinkimas');
  assert.equal(parent.pillarPageId, ''); assert.equal(child.pillarPageId, parent.id);
  assert.ok(site.pages.indexOf(child) < site.pages.indexOf(parent));
  assert.deepEqual(child.planningBrief, input.contentPlan[1]);
});

test('nested intent destinations retain exact canonical identity, parents and briefs in native V2', async t => {
  const { input, call, sitePath } = await sandbox(t);
  const paths = ['/gidai/uzduoties-pasirinkimas/', '/gidai/bandymo-duomenys/', '/gidai/rezultato-patikra/'];
  input.draft.pages[1].path = paths[0];
  input.contentPlan = paths.map((pathname, index) => ({ path: pathname, title: 'Praktinio mokymo klausimas ' + index,
    intent: 'Padėti komandai išsiaiškinti vieną mokymo pasirinkimo klausimą.', head_query: 'Kaip pasirinkti komandos mokymą',
    audience_problem: 'Komandai reikia aiškaus atsakymo apie praktinio mokymo pasirinkimą.', business_goal: 'Patikrinti vieną tikrą komandos mokymo poreikį.',
    primary_topic: 'Praktinis komandos mokymas', reason: 'Atskiras pasirinkimo klausimas su aiškiais vykdymo ir šaltinių tikrinimo poreikiais.', month: '', seasonal_hook: '',
    pillar_path: index ? paths[0] : '', outline: ['Pasirinkti užduotį.', 'Paruošti bandymą.', 'Patikrinti rezultatą.'],
    source_queries: ['Praktinio mokymo pasirinkimas'], source_urls: [], internal_links: index ? ['/', paths[0]] : ['/'],
    media_brief: 'Parengti schemą, paaiškinančią pasirinktą komandos mokymo klausimą.', media_alt: 'Komandos mokymo klausimo schema', priority: 'initial' }));
  update(input); const result = call(); assert.equal(result.status, 0, JSON.stringify(result.value));
  assert.equal(result.value.planImported, 3); assert.equal(result.value.planningBriefState, 'attached');
  const site = JSON.parse(await readFile(sitePath(), 'utf8'));
  const parent = site.pages.find(page => page.slug === 'gidai/uzduoties-pasirinkimas');
  for (let index = 0; index < paths.length; index++) {
    const page = site.pages.find(page => page.slug === paths[index].slice(1, -1));
    assert.ok(page); assert.deepEqual(page.planningBrief, input.contentPlan[index]);
    if (index) { assert.equal(page.pillarPageId, parent.id); assert.ok(page.linkSuggestions.some(link => link.targetPageId === parent.id)); }
    assert.equal(page.approval, null);
  }
  assert.equal(result.value.fullF1, 'UNVERIFIED'); assert.equal(result.value.launch, 'UNVERIFIED');
});

test('partial malformed plan is preserved as original and produces shared publication blockers', async t => {
  const { input, call, sitePath } = await sandbox(t);
  input.contentPlan = [{ path: '../../outside', title: 'Netinkamas planas' }];
  const result = call(); assert.equal(result.status, 0, JSON.stringify(result.value));
  assert.equal(result.value.contentPlanState, 'partial'); assert.equal(result.value.planImported, 0); assert.equal(result.value.planIssues.length, 2);
  const site = JSON.parse(await readFile(sitePath(), 'utf8')); assert.equal(site.pages.length, 3);
  assert.ok(site.pages.every(page => page.factChecks.some(note => note.includes('Turinio plano įrašas 1'))));
  assert.deepEqual(JSON.parse(await readFile(path.join(path.dirname(input.dataDir), 'intake-context.json'), 'utf8')).contentPlan, input.contentPlan);
});

test('nested path alignment keeps reserved, traversal, alias and excessive server paths rejected before writes', async t => {
  const { input, call } = await sandbox(t);
  for (const pathname of ['/api/guide/', '/niche/guide/', '/gidai//guide/', '/gidai/../guide/', '/gidai/guide?x=1',
    '/gidai/guide#section', '/gidai/guide', 'https://example.org/guide/', '/' + 'a'.repeat(150) + '/']) {
    input.draft.pages[1].path = pathname; update(input);
    assert.equal(call().value.code, 'invalid_server_page');
    assert.deepEqual(await readdir(input.artifactsRoot), []);
  }
});

test('foreign lock stays intact and missing companion settings do not claim an immutable revision', async t => {
  const { input, call, directory } = await sandbox(t);
  assert.equal(call(input, { STUDIO_NETWORK_SETTINGS: path.join(directory, 'missing.json') }).value.code, 'studio_network_settings_unavailable');
  assert.deepEqual(await readdir(input.artifactsRoot), []);
  const revisionDir = path.dirname(input.dataDir); await mkdir(revisionDir, { recursive: true });
  const lock = path.join(revisionDir, '.intake.lock'); await writeFile(lock, 'foreign-owner');
  assert.equal(call().value.code, 'intake_busy'); assert.equal(await readFile(lock, 'utf8'), 'foreign-owner');
});

test('replay refuses a changed original or altered approval manifest', async t => {
  const { input, call } = await sandbox(t);
  const first = call(); assert.equal(first.status, 0);
  const manifestPath = first.value.manifestPath;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  await writeFile(manifestPath, JSON.stringify({ ...manifest, launch: 'PASS' }));
  assert.equal(call().value.code, 'intake_revision_conflict');
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(path.join(path.dirname(input.dataDir), 'source-draft.json'), 'changed-original');
  assert.equal(call().value.code, 'intake_artifact_changed');
});
