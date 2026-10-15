import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { BLOCK, mergeBlock, installBootstrap } from './install-agent-git-bootstrap.mjs';

test('preserves personal guidance, replaces only managed block, remains idempotent', () => {
  const original = '# Personal guidance\r\nUse my coding style.\r\n';
  const installed = mergeBlock(original);
  assert(installed.startsWith(original));
  assert(installed.includes('All agents working with this core'));
  assert(installed.includes('CORE_IMPROVEMENT.md'));
  assert(installed.includes('scripts/core-upgrade-check.mjs'));
  assert.equal(mergeBlock(installed), installed);
  const surrounded = original + BLOCK.trimEnd() + '\r\n# More unrelated instructions\r\n';
  assert.equal(mergeBlock(surrounded), surrounded);
  assert.throws(() => mergeBlock('<!-- PINET_GIT_BOOTSTRAP_BEGIN --> broken'), /ambiguous/);
});
test('installs into effective nonempty global override and does not replace base', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'pinet-bootstrap-'));
  try {
    await writeFile(path.join(home, 'AGENTS.md'), 'base preferences\n');
    await writeFile(path.join(home, 'AGENTS.override.md'), 'override preferences\n');
    const result = await installBootstrap(home);
    assert.equal(result.target, path.join(home, 'AGENTS.override.md'));
    assert.equal(await readFile(path.join(home, 'AGENTS.md'), 'utf8'), 'base preferences\n');
    assert((await readFile(result.target, 'utf8')).startsWith('override preferences\n'));
    assert.equal((await installBootstrap(home)).status, 'UNCHANGED');
  } finally {
    assert.equal(path.dirname(home), tmpdir());
    assert(path.basename(home).startsWith('pinet-bootstrap-'));
    await rm(home, { recursive: true, force: true });
  }
});
