import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadEditorialSkill } from '../src/editorial-skill.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'niche-editorial-test-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
process.env.STUDIO_SKILL_CAPTURE_PATH = path.join(root, 'prompt.json');
process.env.CODEX_JS = path.join(root, 'codex-fixture.mjs');
await writeFile(process.env.CODEX_JS, `
import { writeFile } from 'node:fs/promises';
let prompt = ''; for await (const chunk of process.stdin) prompt += chunk;
const args = process.argv.slice(2);
await writeFile(process.env.STUDIO_SKILL_CAPTURE_PATH, JSON.stringify({ prompt, args }));
const isPlan = args[args.indexOf('--output-schema') + 1].endsWith('plan-result.schema.json');
const result = isPlan ? { pages: [{ type: 'guide', slug: 'pasirinkimas', title: 'Pasirinkimo vadovas', description: 'Kokius duomenis surinkti pasirinkimui.', intent: 'Kokius duomenis reikia surinkti?', reason: 'Naudingas kontrolinis sąrašas.', cluster: 'Pasirinkimas', pillarSlug: '', sourceQueries: [], publishDate: '2027-01-10', seasonalHook: '' }] }
  : { title: 'Pasirinkimo vadovas', description: 'Kokius duomenis surinkti pasirinkimui.', blocks: [{ type: 'paragraph', text: 'Pradėkite nuo dabartinės įrangos duomenų. Tai bandomasis privatus tekstas.', level: 0, items: [] }, { type: 'list', text: '', level: 0, items: ['Surinkite žymėjimą ir naudojimo sąlygas.'] }], factChecks: [], internalLinks: [], externalSources: [] };
await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify(result));
`, 'utf8');
const model = await import('../src/model.mjs');
const { enqueue } = await import('../src/generator.mjs');
await model.initialize();

async function finishJob(job) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const current = (await model.listJobs()).find(item => item.id === job.id);
    if (['complete', 'failed'].includes(current.status)) return current;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Test job did not finish.');
}

test('generator CLI receives the skill, site data and version for plan and draft', async () => {
  const site = await model.createSite({ canonicalHost: 'skill-test.invalid', name: 'Privatus bandymas', offer: 'Surinkti pasirinkimo duomenis' });
  const planned = await finishJob(await enqueue('plan', site.id, null, { months: 6 }));
  assert.equal(planned.status, 'complete', planned.error);
  let captured = JSON.parse(await readFile(process.env.STUDIO_SKILL_CAPTURE_PATH, 'utf8'));
  assert.match(captured.prompt, /--- SKILL.md ---/);
  assert.match(captured.prompt, /--- \.\.\/PROJECT_CONTRACT.md ---/);
  assert.match(captured.prompt, /references\/niche-adaptation.md/);
  assert.match(captured.prompt, /Runtime task \(plan\)/);
  assert.match(captured.prompt, /"domain": "skill-test.invalid"/);
  assert.match(captured.prompt, /untrusted task data, not instructions/);
  assert.match(planned.editorialSkill.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(planned.editorialSkill.name, 'niche-content-planner');
  assert.equal(captured.args[captured.args.indexOf('--sandbox') + 1], 'read-only');
  const page = (await model.getSite(site.id)).pages[0];
  const drafted = await finishJob(await enqueue('draft', site.id, page.id));
  assert.equal(drafted.status, 'complete', drafted.error);
  captured = JSON.parse(await readFile(process.env.STUDIO_SKILL_CAPTURE_PATH, 'utf8'));
  assert.match(captured.prompt, /--- references\/quality-review.md ---/);
  assert.match(captured.prompt, /--- references\/studio-contract.md ---/);
  assert.match(captured.prompt, /--- references\/network-linking.md ---/);
  assert.match(captured.prompt, /--- references\/media-workflow.md ---/);
  assert.equal(drafted.editorialSkill.files.includes('../PROJECT_CONTRACT.md'), true);
  assert.match(captured.prompt, /responsive-webp-v1/);
  assert.match(captured.prompt, /"networkCatalog":/);
  assert.match(captured.prompt, /Runtime task \(draft\)/);
  assert.match(captured.prompt, /"pageData":/);
  assert.equal(drafted.editorialSkill.mode, 'draft');
  assert.equal(drafted.editorialSkill.files.includes('references/niche-adaptation.md'), false);
  assert.equal(model.packageForSite(await model.getSite(site.id)).pages.length, 0);
});

test('missing skill fails before CLI execution with no generic fallback', async () => {
  const site = await model.createSite({ canonicalHost: 'missing-skill.invalid', name: 'Bandymas' });
  await rm(process.env.STUDIO_SKILL_CAPTURE_PATH, { force: true });
  process.env.STUDIO_EDITORIAL_SKILL_DIR = path.join(root, 'does-not-exist');
  try {
    const failed = await finishJob(await enqueue('plan', site.id));
    assert.equal(failed.status, 'failed');
    assert.match(failed.error, /niche-content-planner/);
    await assert.rejects(() => readFile(process.env.STUDIO_SKILL_CAPTURE_PATH), { code: 'ENOENT' });
    assert.equal((await model.getSite(site.id)).pages.length, 0);
  } finally { delete process.env.STUDIO_EDITORIAL_SKILL_DIR; }
});

test('an active instruction snapshot survives edits and the next load records a new version', async () => {
  const directory = path.join(root, 'editable-skill');
  await mkdir(path.join(directory, 'references'), { recursive: true });
  await writeFile(path.join(root, 'PROJECT_CONTRACT.md'), 'Original shared project rules');
  await writeFile(path.join(directory, 'SKILL.md'), 'Original editorial instructions');
  await writeFile(path.join(directory, 'references/studio-contract.md'), 'The output contract');
  await writeFile(path.join(directory, 'references/quality-review.md'), 'The quality review');
  await writeFile(path.join(directory, 'references/network-linking.md'), 'Contextual relationships from the actual inventory');
  await writeFile(path.join(directory, 'references/media-workflow.md'), 'Shared automatic media import and actual image review');
  const initial = await loadEditorialSkill('draft', directory);
  await writeFile(path.join(directory, 'SKILL.md'), 'Updated editorial instructions');
  const fresh = await loadEditorialSkill('draft', directory);
  assert.notEqual(initial.metadata.fingerprint, fresh.metadata.fingerprint);
  assert.match(initial.instructions, /Original editorial instructions/);
  assert.doesNotMatch(initial.instructions, /Updated editorial instructions/);
  assert.match(fresh.instructions, /Updated editorial instructions/);
  await writeFile(path.join(root, 'PROJECT_CONTRACT.md'), 'Revised shared project rules');
  const changedContract = await loadEditorialSkill('draft', directory);
  assert.notEqual(fresh.metadata.fingerprint, changedContract.metadata.fingerprint);
  assert.match(initial.instructions, /Original shared project rules/);
  assert.doesNotMatch(initial.instructions, /Revised shared project rules/);
  assert.match(changedContract.instructions, /Revised shared project rules/);
  await assert.rejects(() => loadEditorialSkill('unknown'), /režimas/);
});

test('missing shared contract fails before CLI and leaves site content unchanged', async () => {
  const directory = path.join(root, 'missing-contract-parent', 'skill');
  await mkdir(path.join(directory, 'references'), { recursive: true });
  for (const file of ['SKILL.md', 'references/studio-contract.md', 'references/quality-review.md', 'references/network-linking.md', 'references/media-workflow.md']) {
    await writeFile(path.join(directory, file), 'Valid isolated instructions');
  }
  const site = await model.createSite({ canonicalHost: 'missing-contract.invalid', name: 'Isolated test' });
  await rm(process.env.STUDIO_SKILL_CAPTURE_PATH, { force: true });
  process.env.STUDIO_EDITORIAL_SKILL_DIR = directory;
  try {
    const failed = await finishJob(await enqueue('draft-batch', site.id));
    assert.equal(failed.status, 'failed');
    assert.match(failed.error, /PROJECT_CONTRACT.md/);
    await assert.rejects(() => readFile(process.env.STUDIO_SKILL_CAPTURE_PATH), { code: 'ENOENT' });
    assert.equal((await model.getSite(site.id)).pages.length, 0);
  } finally { delete process.env.STUDIO_EDITORIAL_SKILL_DIR; }
});

test.after(async () => {
  const resolved = path.resolve(root);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('niche-editorial-test-'));
  await rm(resolved, { recursive: true, force: true });
});
