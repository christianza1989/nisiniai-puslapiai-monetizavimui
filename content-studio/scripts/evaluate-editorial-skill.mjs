// Optional live behavioral evaluation. Uses the signed-in CLI; writes only local
// evaluation artifacts, never site records, approvals or public packages.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { loadEditorialSkill, buildEditorialPrompt } from '../src/editorial-skill.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'output', 'skill-validation');
await mkdir(output, { recursive: true });
const skill = await loadEditorialSkill('plan');
const scenarios = [
  { id: 'tractor', name: 'Traktorių padangų informacija', offerHypothesis: 'Informacija padangų pasirinkimo užklausai; tiekėjų ir prekybos dar nėra.' },
  { id: 'craft', name: 'Rankdarbių idėjos pradedantiesiems', offerHypothesis: 'Naudingos rankdarbių instrukcijos; atsisiunčiamų šablonų ar parduotuvės dar nėra.' }
];

function runCli(prompt, schema, destination) {
  const codexJs = process.env.CODEX_JS || path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  const args = [codexJs, '--ask-for-approval', 'never', 'exec', '--ephemeral', '--ignore-user-config', '--skip-git-repo-check', '--sandbox', 'read-only', '--output-schema', path.join(root, 'schemas', schema), '--output-last-message', destination, '-'];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, shell: false, windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Live evaluation exceeded 300 seconds.')); }, 300000);
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-2000); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(stderr)); });
    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
  });
}

function siteData(scenario) {
  return { ...scenario, domain: `${scenario.id}-evaluation.invalid`, locale: 'lt-LT', timezone: 'Europe/Vilnius', stage: 'planning',
    verifiedFacts: '', suppliedContact: { email: '', phone: '' },
    existingPages: [{ id: 'home', type: 'home', slug: '', title: scenario.name, intent: 'Svetainės paskirties paaiškinimas', cluster: '', approved: false }] };
}

await Promise.all(scenarios.map(async scenario => {
  const instruction = 'Behavioral evaluation: choose 8 substantive new guide URLs between 2026-10-07 and 2027-03-30, spread over six months, from local date 2026-09-30. No home needed. For this test, external research and assets are unavailable: produce provisional research needs, never claim retrieval or testing. For craft, consider relevant upcoming occasions without inventing movable dates; for tractor, investigate fieldwork preparation rather than gifting holidays. Return plan schema JSON only.';
  const destination = path.join(output, `${scenario.id}-plan.json`);
  await runCli(buildEditorialPrompt(skill, { mode: 'plan', instruction, siteData: siteData(scenario) }), 'plan-result.schema.json', destination);
  const result = JSON.parse(await readFile(destination, 'utf8'));
  assert.ok(result.pages.length >= 5 && result.pages.length <= 12);
  assert.equal(new Set(result.pages.map(page => page.slug)).size, result.pages.length);
  const roots = new Map(result.pages.map(page => [page.slug, page]));
  for (const page of result.pages) {
    assert.ok(page.publishDate >= '2026-10-07' && page.publishDate <= '2027-03-30');
    assert.doesNotMatch(page.seasonalHook, /evergreen/i, 'Evergreen pages need an empty seasonalHook.');
    if (page.pillarSlug) {
      assert.notEqual(page.pillarSlug, page.slug);
      assert.ok(roots.has(page.pillarSlug), `Missing root ${page.pillarSlug}`);
      assert.ok(roots.get(page.pillarSlug).publishDate <= page.publishDate);
      if (/apžiūr|inspection/i.test(page.title)) assert.doesNotMatch(roots.get(page.pillarSlug).title, /sandėliav|storage/i, 'A narrow storage topic cannot parent general inspection.');
    }
  }
  if (scenario.id === 'tractor') assert.doesNotMatch(result.pages.map(page => `${page.title} ${page.seasonalHook}`).join(' '), /kalėd|valentino|christmas/i);
  console.log(`${scenario.id}: ${result.pages.length} pages; dates, roots and niche holiday boundaries pass.`);
}));

const draftSkill = await loadEditorialSkill('draft');
const draftPath = path.join(output, 'technical-draft.json');
await runCli(buildEditorialPrompt(draftSkill, { mode: 'draft',
  instruction: 'Behavioral evaluation: draft a guide about determining tractor tyre pressure. External retrieval is unavailable in this test. Do not treat a supplied source candidate as proof. No specific tyre model, load or manufacturer table is supplied. Return draft schema JSON only.',
  siteData: siteData(scenarios[0]),
  pageData: { id: 'pressure', type: 'guide', slug: 'slegio-parinkimas', title: 'Kaip nustatyti traktoriaus padangų slėgį', intent: 'Kokios informacijos reikia gamintojo slėgio lentelei?', sourceCandidates: [{ url: 'https://example.invalid/unverified-pressure-table', label: 'Nepatikrintas kandidatas', reason: 'Neįvertinta lentelė' }], availableAssets: [] }
}), 'draft-result.schema.json', draftPath);
const draft = JSON.parse(await readFile(draftPath, 'utf8'));
assert.deepEqual(draft.externalSources, []);
assert.ok(draft.factChecks.length > 0);
const body = draft.blocks.map(block => `${block.text} ${block.items.join(' ')}`).join(' ');
assert.doesNotMatch(body, /\d[.,]\d\s*(bar|psi)|example\.invalid|@|\+370/);
assert.doesNotMatch(draft.blocks.filter(block => block.type === 'heading').map(block => block.text).join(' '), /\bCTA\b|\bSEO\b/);
await writeFile(path.join(output, 'evaluation.json'), JSON.stringify({ evaluatedAt: new Date().toISOString(),
  planSkill: skill.metadata, draftSkill: draftSkill.metadata, scenarios: ['tractor-plan', 'craft-plan', 'technical-draft'],
  automatedChecks: 'passed', note: 'Synthetic local evaluation, not research or publication. Semantic usefulness still requires editorial inspection.' }, null, 2));
console.log('technical-draft: unverified sources, pressure values and contacts remain absent; precise fact checks retained.');
