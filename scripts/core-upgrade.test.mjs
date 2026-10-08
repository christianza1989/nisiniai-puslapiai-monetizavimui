import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRecord, appendEvent, listRecords, planQuarantine, applyQuarantine, restoreQuarantine } from './core-upgrade.mjs';

async function removeFixture(root) {
  const resolved = path.resolve(root);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.match(path.basename(resolved), /^pinet-(?:upgrade|outside|clone)-/);
  await fs.rm(resolved, { recursive: true, force: true });
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pinet-upgrade-'));
  t.after(() => removeFixture(root));
  const git = (...args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  git('init', '-b', 'codex/fixture');
  git('config', 'user.email', 'fixture@example.invalid'); git('config', 'user.name', 'Fixture');
  await fs.mkdir(path.join(root, 'lib'));
  await fs.writeFile(path.join(root, 'lib/obsolete.mjs'), '// obsolete\nexport const old = 1;\n');
  await fs.writeFile(path.join(root, 'AGENTS.md'), '# protected\n');
  git('add', '.'); git('commit', '-m', 'fixture');
  const input = { siteId: 'fixture', summary: 'Unused module confirmed by source review', category: 'cleanup',
    evidence: ['fixture only: no callers, meaningful replacement check recorded'],
    paths: ['lib/obsolete.mjs'], issue: 'fixture-issue', rollback: 'restore from exact quarantine payload' };
  return { root, git, input, source: path.join(root, 'lib/obsolete.mjs') };
}
test('dry plan preserves source; quarantine and restore preserve exact bytes and provenance', async t => {
  const f = await fixture(t), bytes = await fs.readFile(f.source);
  const r = await createRecord(f.root, f.input);
  await planQuarantine(f.root, r.id, 'lib/obsolete.mjs', 'No static or dynamic consumers; replacement fixture passed');
  assert.deepEqual(await fs.readFile(f.source), bytes);
  await applyQuarantine(f.root, r.id);
  await assert.rejects(fs.access(f.source), { code: 'ENOENT' });
  await restoreQuarantine(f.root, r.id);
  assert.deepEqual(await fs.readFile(f.source), bytes);
  assert.equal(f.git('diff', '--', 'lib/obsolete.mjs'), '');
  assert.deepEqual(await fs.readFile(path.join(f.root, 'core-improvements/entries', r.id, 'quarantine/source.txt')), bytes);
});
test('reject traversal, outside scope, dirty/protected/untracked files without deleting anything', async t => {
  const f = await fixture(t), r = await createRecord(f.root, f.input);
  await assert.rejects(planQuarantine(f.root, r.id, '../other.mjs', 'why'), /outside_record_scope/);
  await assert.rejects(createRecord(f.root, { ...f.input, paths: ['C:/other.mjs'] }), /unsafe_relative_path/);
  await assert.rejects(createRecord(f.root, { ...f.input, paths: ['lib/.. /other.mjs'] }), /unsafe_relative_path/);
  await assert.rejects(createRecord(f.root, { ...f.input, paths: ['lib/CON.txt'] }), /unsafe_relative_path/);
  const protectedRecord = await createRecord(f.root, { ...f.input, paths: ['AGENTS.md'] });
  await assert.rejects(planQuarantine(f.root, protectedRecord.id, 'AGENTS.md', 'why'), /protected_or_nontext_file/);
  await fs.writeFile(f.source, '// new work\n');
  await assert.rejects(planQuarantine(f.root, r.id, 'lib/obsolete.mjs', 'why'), /source_has_uncommitted_changes/);
  await fs.writeFile(path.join(f.root, 'untracked.mjs'), '// untracked');
  const untracked = await createRecord(f.root, { ...f.input, paths: ['untracked.mjs'] });
  await assert.rejects(planQuarantine(f.root, untracked.id, 'untracked.mjs', 'why'), /tracked_regular_file_required/);
  assert.equal(await fs.readFile(f.source, 'utf8'), '// new work\n');
});
test('stale plan, restored-path collision and payload tampering all block safely', async t => {
  const f = await fixture(t), r = await createRecord(f.root, f.input);
  await planQuarantine(f.root, r.id, 'lib/obsolete.mjs', 'reviewed');
  await fs.writeFile(f.source, '// replacement\n'); f.git('add', '.'); f.git('commit', '-m', 'replacement');
  await assert.rejects(applyQuarantine(f.root, r.id), /source_changed_since_plan/);
  const r2 = await createRecord(f.root, f.input);
  await planQuarantine(f.root, r2.id, 'lib/obsolete.mjs', 'reviewed');
  await applyQuarantine(f.root, r2.id);
  await fs.writeFile(f.source, '// new implementation\n');
  await assert.rejects(restoreQuarantine(f.root, r2.id), { code: 'EEXIST' });
  assert.equal(await fs.readFile(f.source, 'utf8'), '// new implementation\n');
  await fs.unlink(f.source); // Exact known fixture file only.
  await fs.writeFile(path.join(f.root, 'core-improvements/entries', r2.id, 'quarantine/source.txt'), 'tampered');
  await assert.rejects(restoreQuarantine(f.root, r2.id), /payload_corrupt/);
});
test('journal entries are unique; events append in order and require actual checks / delivery references', async t => {
  const f = await fixture(t);
  const records = await Promise.all([createRecord(f.root, f.input), createRecord(f.root, f.input)]);
  assert.notEqual(records[0].id, records[1].id);
  const id = records[0].id;
  await assert.rejects(appendEvent(f.root, id, { status: 'local-verified', note: 'claimed' }), /checks_required/);
  await assert.rejects(appendEvent(f.root, id, { status: 'local-verified', note: 'failed',
    checks: [{ command: 'check', result: 'FAIL', evidence: 'fixture' }] }), /checks_required/);
  await assert.rejects(appendEvent(f.root, id, { status: 'merged', note: 'claimed' }), /pr_reference_required/);
  await appendEvent(f.root, id, { status: 'fixing', note: 'Scoped repair started' });
  await appendEvent(f.root, id, { status: 'local-verified', note: 'Fixture validation passed',
    checks: [{ command: 'fixture', result: 'PASS', evidence: 'fixture only' }] });
  assert.equal((await listRecords(f.root)).find(r => r.id === id).status, 'local-verified');
  const dir = path.join(f.root, 'core-improvements/entries', id);
  await fs.writeFile(path.join(dir, 'operation.lock'), 'foreign operation');
  await assert.rejects(appendEvent(f.root, id, { status: 'fixing', note: 'parallel' }), { code: 'EEXIST' });
  assert.equal(await fs.readFile(path.join(dir, 'operation.lock'), 'utf8'), 'foreign operation');
});
test('prepared-state recovery preserves bytes after interruption before payload or after unlink', async t => {
  const f = await fixture(t), bytes = await fs.readFile(f.source);
  const r = await createRecord(f.root, f.input);
  await planQuarantine(f.root, r.id, 'lib/obsolete.mjs', 'reviewed');
  const dir = path.join(f.root, 'core-improvements/entries', r.id);
  await fs.writeFile(path.join(dir, 'quarantine-state.json'), JSON.stringify({ status: 'prepared' }));
  await applyQuarantine(f.root, r.id);
  await fs.writeFile(path.join(dir, 'quarantine-state.json'), JSON.stringify({ status: 'prepared' }));
  await applyQuarantine(f.root, r.id); // Source already absent, payload remains intact.
  await restoreQuarantine(f.root, r.id);
  assert.deepEqual(await fs.readFile(f.source), bytes);
});
test('quarantine commit cloned to another PC retains original CRLF bytes and restores there', async t => {
  const f = await fixture(t);
  const bytes = Buffer.from('// original CRLF\r\nexport const old = 1;\r\n');
  await fs.writeFile(path.join(f.root, '.gitattributes'), '* text=auto\n*.mjs text eol=lf\n/core-improvements/entries/**/quarantine/source.txt -text\n');
  await fs.writeFile(f.source, bytes);
  f.git('add', '.'); f.git('commit', '-m', 'CRLF source and payload attributes');
  const r = await createRecord(f.root, f.input);
  await planQuarantine(f.root, r.id, 'lib/obsolete.mjs', 'reviewed');
  await applyQuarantine(f.root, r.id);
  f.git('add', '.'); f.git('commit', '-m', 'quarantine with original bytes');
  const clone = await fs.mkdtemp(path.join(os.tmpdir(), 'pinet-clone-'));
  t.after(() => removeFixture(clone));
  const result = spawnSync('git', ['clone', '--no-hardlinks', f.root, clone], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  await restoreQuarantine(clone, r.id);
  assert.deepEqual(await fs.readFile(path.join(clone, 'lib/obsolete.mjs')), bytes);
});
test('symlink paths never escape workspace (skip only if host denies symlink creation)', async t => {
  const f = await fixture(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'pinet-outside-'));
  t.after(() => removeFixture(outside));
  try { await fs.symlink(outside, path.join(f.root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (e) { if (['EPERM', 'EACCES'].includes(e.code)) return t.skip('Host denies symlinks'); throw e; }
  const r = await createRecord(f.root, { ...f.input, paths: ['escape/old.mjs'] });
  await assert.rejects(planQuarantine(f.root, r.id, 'escape/old.mjs', 'why'), /symlink_path/);
  assert.deepEqual(await fs.readdir(outside), []);
});
