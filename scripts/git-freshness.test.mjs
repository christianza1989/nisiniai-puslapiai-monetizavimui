import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectRepository } from './git-freshness.mjs';

function git(root, ...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
}
async function fixture() {
  const base = await mkdtemp(path.join(tmpdir(), 'pinet-freshness-'));
  const remote = path.join(base, 'remote.git'), first = path.join(base, 'first'), second = path.join(base, 'second');
  git(base, 'init', '--bare', '--initial-branch=main', remote);
  git(base, 'clone', remote, first);
  git(first, 'config', 'user.name', 'Fixture'); git(first, 'config', 'user.email', 'fixture@example.test');
  await writeFile(path.join(first, 'instructions.md'), 'initial instructions\n');
  git(first, 'add', '.'); git(first, 'commit', '-qm', 'initial'); git(first, 'push', 'origin', 'main');
  git(base, 'clone', remote, second);
  return { base, remote, first, second };
}
async function dispose(f) {
  // This fixture is the exact mkdtemp directory created here, never a user workspace.
  assert.equal(path.dirname(f.base), tmpdir());
  assert(path.basename(f.base).startsWith('pinet-freshness-'));
  await rm(f.base, { recursive: true, force: true });
}
const fixtureOption = { allowFixtureRemote: true };

test('detects another computer main change and preserves in-progress source', async () => {
  const f = await fixture();
  try {
    const original = await readFile(path.join(f.second, 'instructions.md'), 'utf8');
    assert.equal(inspectRepository(f.second, 'start', fixtureOption).status, 'PASS_FRESH_BASE');
    await writeFile(path.join(f.first, 'instructions.md'), 'new remote instructions\n');
    git(f.first, 'add', '.'); git(f.first, 'commit', '-qm', 'new instructions'); git(f.first, 'push', 'origin', 'main');
    await writeFile(path.join(f.second, 'own-work.md'), 'in progress\n');
    const report = inspectRepository(f.second, 'continue', fixtureOption);
    assert.equal(report.reason, 'main_not_in_current_base');
    assert.equal(report.main_commits_missing, 1);
    assert.equal(await readFile(path.join(f.second, 'instructions.md'), 'utf8'), original);
    assert.equal(await readFile(path.join(f.second, 'own-work.md'), 'utf8'), 'in progress\n');
  } finally { await dispose(f); }
});
test('own feature commits are allowed; dirty start fails and continue allows own work', async () => {
  const f = await fixture();
  try {
    git(f.first, 'switch', '-qc', 'codex/fixture');
    await writeFile(path.join(f.first, 'own.md'), 'committed\n');
    git(f.first, 'add', '.'); git(f.first, 'commit', '-qm', 'own feature');
    assert.equal(inspectRepository(f.first, 'start', fixtureOption).status, 'PASS_FRESH_BASE');
    await writeFile(path.join(f.first, 'own.md'), 'next step\n');
    assert.equal(inspectRepository(f.first, 'start', fixtureOption).reason, 'dirty_start_checkout');
    assert.equal(inspectRepository(f.first, 'continue', fixtureOption).status, 'PASS_FRESH_BASE');
  } finally { await dispose(f); }
});
test('failed fetch rejects cached main and unexpected origins fail closed', async () => {
  const f = await fixture();
  try {
    assert.equal(inspectRepository(f.second, 'start').reason, 'unexpected_origin_repository');
    git(f.second, 'remote', 'set-url', 'origin', path.join(f.base, 'missing.git'));
    assert.equal(inspectRepository(f.second, 'start', fixtureOption).reason, 'fetch_failed');
  } finally { await dispose(f); }
});
