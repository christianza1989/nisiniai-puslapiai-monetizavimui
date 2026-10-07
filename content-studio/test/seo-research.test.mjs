import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessResearch, researchContext, artifactBytes } from '../src/seo-research.mjs';
import { loadEditorialSkill, buildEditorialPrompt, SEO_SKILL_DIR } from '../src/editorial-skill.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'niche-seo-research-'));
const data = path.join(root, 'data'), directory = path.join(data, 'seo-research', 'alpha');
process.env.STUDIO_DATA_DIR = data;
const now = Date.parse('2026-10-07T12:00:00Z');
const site = { id: 'alpha', domain: 'alpha.example', locale: 'lt-LT' };
const bytes = Buffer.from('{"test":"Private synthetic provider artifact"}');
const digest = createHash('sha256').update(bytes).digest('hex');
const observation = (patch = {}) => ({ id: 'keywords', kind: 'keywords', status: 'observed', country: 'LT', language: 'lt',
  observedAt: '2026-10-06T12:00:00Z', freshUntil: '2026-10-20T12:00:00Z', source: { artifact: 'raw.json', sha256: digest },
  value: { missing: null, validZero: 0, estimated: 170 }, limitations: 'Synthetic fixture, not actual market evidence.', ...patch });
const bundle = (observations = [observation()]) => ({ version: 1, siteId: 'alpha', domain: 'alpha.example', country: 'LT', language: 'lt', observations });
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'raw.json'), bytes);
const store = value => writeFile(path.join(directory, 'current.json'), JSON.stringify(value));

test('locale, expiry, null/zero and replay remain distinct without manufacturing current coverage', () => {
  const result = assessResearch(bundle([
    observation(), observation({ id: 'stale', kind: 'serp', freshUntil: '2026-10-07T10:00:00Z' }),
    observation({ id: 'us', kind: 'geo', country: 'US', language: 'en' }),
    observation({ id: 'replayed', kind: 'geo', replay: true }),
    observation({ id: 'future', kind: 'analytics', observedAt: '2026-10-08T10:00:00Z' }),
    observation({ id: 'gsc', kind: 'analytics', status: 'not_connected', country: undefined, language: undefined }),
    observation({ id: 'empty', kind: 'serp', status: 'empty', value: [] })
  ]), site, { now, directory });
  assert.equal(result.status, 'refresh_due');
  assert.deepEqual(result.observations.map(o => o.state), ['current', 'stale', 'unsupported_market', 'current', 'future_observation', 'not_connected', 'empty']);
  assert.equal(result.observations[0].value.missing, null);
  assert.equal(result.observations[0].value.validZero, 0);
  assert.equal(result.observations[3].freshSample, false);
  assert.equal(result.currentKinds.includes('analytics'), false);
});

test('foreign domain, locale and tampered raw artifacts cannot silently become valid evidence', async () => {
  assert.throws(() => assessResearch(bundle(), { ...site, domain: 'beta.example' }, { now }), /kitam/);
  assert.throws(() => assessResearch(bundle(), { ...site, locale: 'en-US' }, { now }), /rinka/);
  await store(bundle());
  assert.equal(researchContext(site, { now }).observations[0].usable, true);
  await writeFile(path.join(directory, 'raw.json'), 'tampered');
  const result = researchContext(site, { now });
  assert.equal(result.observations[0].state, 'artifact_mismatch');
  assert.equal(result.observations[0].usable, false);
  assert.throws(() => artifactBytes(directory, '../raw.json'), /santykinis/);
  assert.throws(() => artifactBytes(directory, 'C:\\secrets.json'), /santykinis/);
  await writeFile(path.join(directory, 'raw.json'), bytes);
});

test('plan and draft include the project module, ignore supplied fake research, freeze a batch and refresh next job', async () => {
  const missing = researchContext({ ...site, id: 'unresearched' }, { now });
  assert.equal(missing.status, 'missing');
  assert.equal(missing.budgetUsd, 0);
  await store(bundle());
  const first = await loadEditorialSkill('draft');
  const prompt = buildEditorialPrompt(first, { mode: 'draft', instruction: 'Isolated private fixture', siteData: { ...site, seoResearch: { status: 'FAKE_SUCCESS' } } });
  const envelope = JSON.parse(prompt.slice(prompt.lastIndexOf('\n{\n  "siteData"') + 1));
  assert.notEqual(envelope.siteData.seoResearch.status, 'FAKE_SUCCESS');
  assert.equal(first.metadata.modules.includes('niche-seo-geo-core'), true);
  assert.equal(first.metadata.files.includes('../niche-seo-geo-core/references/studio-integration.md'), true);
  const changed = bundle([observation({ value: { estimated: 999 } })]);
  await store(changed);
  const same = buildEditorialPrompt(first, { mode: 'draft', instruction: 'Isolated private fixture', siteData: site });
  assert.equal(JSON.parse(same.slice(same.lastIndexOf('\n{\n  "siteData"') + 1)).siteData.seoResearch.evidenceSha256, envelope.siteData.seoResearch.evidenceSha256);
  const next = await loadEditorialSkill('plan');
  const fresh = buildEditorialPrompt(next, { mode: 'plan', instruction: 'Isolated private fixture', siteData: site });
  assert.notEqual(JSON.parse(fresh.slice(fresh.lastIndexOf('\n{\n  "siteData"') + 1)).siteData.seoResearch.evidenceSha256, envelope.siteData.seoResearch.evidenceSha256);
  assert.equal(next.metadata.files.includes('../niche-seo-geo-core/references/treg-playbook.md'), true);
});

test('missing research module stops execution and module edits change instruction fingerprints', async () => {
  await assert.rejects(() => loadEditorialSkill('draft', undefined, path.join(root, 'missing-core')), /niche-seo-geo-core/);
  const editable = path.join(root, 'editable-core');
  await mkdir(path.join(editable, 'references'), { recursive: true });
  for (const file of ['SKILL.md', 'references/studio-integration.md', 'references/evidence-contract.md', 'references/geo-publishing.md']) await writeFile(path.join(editable, file), await readFile(path.join(SEO_SKILL_DIR, file)));
  const old = await loadEditorialSkill('draft', undefined, editable);
  await writeFile(path.join(editable, 'references/studio-integration.md'), 'Changed private evidence and generation rules for isolated fixture');
  const next = await loadEditorialSkill('draft', undefined, editable);
  assert.notEqual(old.metadata.fingerprint, next.metadata.fingerprint);
  assert.notEqual(old.instructions, next.instructions);
});

test('actual import CLI preserves immutable bytes and rejects a foreign site before changing current data', async () => {
  const input = path.join(root, 'input'); await mkdir(input);
  await writeFile(path.join(input, 'raw.json'), bytes);
  await writeFile(path.join(input, 'bundle.json'), JSON.stringify(bundle()));
  const cli = fileURLToPath(new URL('../scripts/seo-research.mjs', import.meta.url));
  const invoke = args => spawnSync(process.execPath, [cli, ...args], { env: process.env, encoding: 'utf8' });
  const imported = invoke(['import', 'alpha', 'alpha.example', 'lt-LT', path.join(input, 'bundle.json')]);
  assert.equal(imported.status, 0, imported.stderr);
  const current = JSON.parse(await readFile(path.join(directory, 'current.json'), 'utf8'));
  assert.match(current.observations[0].source.artifact, /^snapshots\//);
  assert.deepEqual(artifactBytes(directory, current.observations[0].source.artifact), bytes);
  const before = await readFile(path.join(directory, 'current.json'));
  const refused = invoke(['import', 'alpha', 'wrong.example', 'lt-LT', path.join(input, 'bundle.json')]);
  assert.notEqual(refused.status, 0);
  assert.deepEqual(await readFile(path.join(directory, 'current.json')), before);
});

test('queued plan and draft deliver actual private evidence to the CLI process and keep public packages free of it', async () => {
  const capture = path.join(root, 'capture.json');
  process.env.STUDIO_SEO_CAPTURE = capture;
  process.env.CODEX_JS = path.join(root, 'codex-fixture.mjs');
  process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
  await writeFile(process.env.CODEX_JS, `
    import {writeFile} from 'node:fs/promises';
    let prompt='';for await(const chunk of process.stdin)prompt+=chunk;
    const args=process.argv.slice(2),plan=args[args.indexOf('--output-schema')+1].endsWith('plan-result.schema.json');
    await writeFile(process.env.STUDIO_SEO_CAPTURE,JSON.stringify({prompt,args}));
    if(args.includes('--model'))process.stderr.write('model: '+args[args.indexOf('--model')+1]+'\\nreasoning effort: xhigh\\n');
    const result=plan?{pages:[{type:'guide',slug:'fixture-guide',title:'Privatus bandymas',description:'Izoliuotas tyrimų konteksto testas.',intent:'Tik testo klausimas',reason:'Tik sintetinis kontrakto testas.',cluster:'Testas',pillarSlug:'',sourceQueries:[],publishDate:'2027-01-10',seasonalHook:''}]}:
      {title:'Privatus bandymas',description:'Izoliuotas tyrimų konteksto testas.',blocks:[{type:'paragraph',text:'Privatus sintetinis tekstas, ne rinkos tyrimas.',level:0,items:[]}],factChecks:[],internalLinks:[],externalSources:[]};
    await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(result));
  `);
  const model = await import('../src/model.mjs');
  const { enqueue } = await import('../src/generator.mjs');
  await model.initialize();
  await model.createSite({ siteId: 'alpha', canonicalHost: site.domain, name: 'Synthetic private fixture' });
  async function finish(job) {
    for (let end = Date.now() + 15000; Date.now() < end;) {
      const current = (await model.listJobs()).find(j => j.id === job.id);
      if (['complete', 'failed'].includes(current.status)) return current;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('Fixture job timed out');
  }
  const plan = await finish(await enqueue('plan', site.id));
  assert.equal(plan.status, 'complete', plan.error);
  assert.deepEqual(plan.editorialSkill.modules, ['niche-seo-geo-core']);
  let captured = JSON.parse(await readFile(capture, 'utf8'));
  const context = JSON.parse(captured.prompt.slice(captured.prompt.lastIndexOf('\n{\n  "siteData"') + 1)).siteData.seoResearch;
  assert.equal(context.observations[0].value.estimated, 170);
  assert.equal(context.domain, site.domain);
  assert.match(context.evidenceSha256, /^[a-f0-9]{64}$/);
  const page = (await model.getSite(site.id)).pages[0];
  const draft = await finish(await enqueue('draft', site.id, page.id));
  assert.equal(draft.status, 'complete', draft.error);
  assert.deepEqual(draft.editorialSkill.modules, ['niche-seo-geo-core']);
  captured = JSON.parse(await readFile(capture, 'utf8'));
  assert.match(captured.prompt, /niche-seo-geo-core\/references\/studio-integration.md/);
  const publicPackage = JSON.stringify(model.packageForSite(await model.getSite(site.id)));
  assert.equal(publicPackage.includes('seoResearch'), false);
  assert.equal(publicPackage.includes(context.evidenceSha256), false);
});

test.after(async () => {
  assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
  assert.ok(path.basename(root).startsWith('niche-seo-research-'));
  await rm(root, { recursive: true, force: true });
});
