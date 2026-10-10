import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRecord, appendEvent } from './core-upgrade.mjs';
import { checkUpgradeCoverage, requiresUpgrade } from './core-upgrade-check.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pinet-upgrade-gate-'));
  t.after(async () => {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert(path.basename(target).startsWith('pinet-upgrade-gate-'));
    await fs.rm(target, { recursive: true, force: true });
  });
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  const write = async (file, value) => {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), value);
  };
  const commit = () => { git('add', '.'); git('commit', '-m', 'synthetic fixture'); return git('rev-parse', 'HEAD'); };
  git('init', '-b', 'codex/fixture'); git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  await write('scripts/tool.mjs', 'export const v = 1;\n');
  const base = commit();
  const record = async (paths = ['scripts/tool.mjs'], issue = 'fixture-issue') => createRecord(root, {
    siteId: 'core', summary: 'Synthetic shared defect with a regression', category: 'code',
    evidence: ['isolated fixture only'], paths, issue, rollback: 'scoped fixture revert',
  });
  const verify = r => appendEvent(root, r.id, { status: 'local-verified', note: 'Fixture regression passed',
    checks: [{ command: 'synthetic regression', result: 'PASS', evidence: 'fixture only' }] });
  return { root, git, write, commit, base, record, verify };
}

test('shared source without a journal blocks; planning/site-only changes need no artificial upgrade', async t => {
  const f = await fixture(t);
  await f.write('docs/PLAN.md', 'Proposed roadmap only\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'PASS');
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  const result = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(result.status, 'BLOCKED'); assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
  assert.throws(() => checkUpgradeCoverage(f.root, '--bad-ref', result.head_sha), /full_commit_sha/);
});

test('finding and wrong scope cannot pass; a verified declared repair passes from committed blobs', async t => {
  const f = await fixture(t), r = await f.record(['scripts/other.mjs']);
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'BLOCKED');
  await f.verify(r);
  const wrong = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(wrong.status, 'BLOCKED'); assert.deepEqual(wrong.uncovered_paths, ['scripts/tool.mjs']);
  const correct = await f.record(); await f.verify(correct);
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'PASS');
  await f.write('scripts/tool.mjs', 'uncommitted work must not change the audited commit\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.git('rev-parse', 'HEAD')).status, 'PASS');
});

test('a changed old entry needs fresh verification and cannot rewrite previous history', async t => {
  const f = await fixture(t), r = await f.record(); await f.verify(r);
  const baseline = f.commit();
  await f.write('scripts/tool.mjs', 'export const v = 3;\n');
  assert.equal(checkUpgradeCoverage(f.root, baseline, f.commit()).status, 'BLOCKED');
  await appendEvent(f.root, r.id, { status: 'fixing', note: 'A new actual regression is being repaired' });
  const fixing = checkUpgradeCoverage(f.root, baseline, f.commit());
  assert(fixing.errors.some(e => e.reason === 'fresh_verification_event_required'));
  await f.verify(r);
  assert.equal(checkUpgradeCoverage(f.root, baseline, f.commit()).status, 'PASS');
  const file = `core-improvements/entries/${r.id}/record.json`;
  const old = JSON.parse(await fs.readFile(path.join(f.root, file), 'utf8'));
  await f.write(file, JSON.stringify({ ...old, summary: 'rewritten history' }));
  const corrupt = checkUpgradeCoverage(f.root, baseline, f.commit());
  assert.equal(corrupt.status, 'BLOCKED');
  assert(corrupt.errors.some(e => e.reason === 'journal_history_is_append_only'));
});

test('directory scope covers committed descendants; wildcard scope and fabricated checks block', async t => {
  const f = await fixture(t), r = await f.record(['scripts']); await f.verify(r);
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  assert.equal(checkUpgradeCoverage(f.root, f.base, f.commit()).status, 'PASS');
  const bad = await f.record(['scripts/**']); await f.verify(bad);
  const wildcard = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert(wildcard.errors.some(e => e.reason === 'scope_must_be_exact_path_or_directory'));
  const folder = path.join(f.root, `core-improvements/entries/${r.id}/events`);
  const files = await fs.readdir(folder);
  for (const file of files) {
    const event = JSON.parse(await fs.readFile(path.join(folder, file), 'utf8'));
    if (event.status === 'local-verified') {
      event.checks[0].result = 'FAIL'; await fs.writeFile(path.join(folder, file), JSON.stringify(event));
    }
  }
  assert(checkUpgradeCoverage(f.root, f.base, f.commit()).errors.some(e => e.reason === 'verified_checks_required'));
});

test('deletion still needs provenance; immutable SOURCE archives and events cannot be rewritten', async t => {
  const f = await fixture(t);
  await f.write('SKILLS/fixture/SOURCE_SKILL.md', 'immutable imported bytes\n');
  const base = f.commit();
  await fs.unlink(path.join(f.root, 'scripts/tool.mjs'));
  let result = checkUpgradeCoverage(f.root, base, f.commit());
  assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
  const r = await f.record(); await f.verify(r);
  assert.equal(checkUpgradeCoverage(f.root, base, f.commit()).status, 'PASS');
  await f.write('SKILLS/fixture/SOURCE_SKILL.md', 'modified archive\n');
  result = checkUpgradeCoverage(f.root, base, f.commit());
  assert(result.errors.some(e => e.reason === 'source_archive_is_immutable'));
});

test('classification includes agent/core/skill/CI paths and excludes private site plans and test-only work', () => {
  for (const file of ['AGENTS.md', 'CORE_IMPROVEMENT.md', 'SKILLS/PROJECT_CONTRACT.md',
    'agent-business-core/runtime/src/pinet_core/control/router.py', '.github/workflows/agent-workflow.yml'])
    assert.equal(requiresUpgrade(file), true, file);
  for (const file of ['sites/fixture/BUSINESS.md', 'WORKSTREAMS.md', 'docs/PLAN.md',
    'scripts/core-upgrade-check.test.mjs', 'agent-business-core/runtime/offline_tests/test_fixture.py'])
    assert.equal(requiresUpgrade(file), false, file);
});

test('a companion record with identical filenames cannot attest a private core change', async t => {
  const f = await fixture(t);
  await f.write('scripts/tool.mjs', 'export const v = 2;\n');
  const publicRecord = await f.record(['scripts/tool.mjs'], 'https://github.com/christianza1989/niche-public-core/issues/1');
  await f.verify(publicRecord);
  const result = checkUpgradeCoverage(f.root, f.base, f.commit());
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.uncovered_paths, ['scripts/tool.mjs']);
});
