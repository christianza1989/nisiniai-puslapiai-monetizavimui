import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, cp, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { exportExternalContent } from '../src/external-content-export.mjs';

const fixture = path.resolve(import.meta.dirname, '../../sites/madbeauty/content/initial-release');
const core = path.resolve(import.meta.dirname, '../../../dovanos-memorycasting');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function sandbox(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'external-content-test-'));
  // Explicit owned test root, never a workspace, source release or user destination.
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'release');
  await cp(fixture, source, { recursive: true });
  return { root, source, options: { releaseDirectory: source, destination: path.join(root, 'bundle'),
    publicCoreDirectory: core, expectedSiteId: 'madbeauty', expectedCanonicalHost: 'madbeauty.lt' } };
}

test('external bundle preserves approved bytes and complete standalone SDK; excludes private review', async t => {
  const { source, options } = await sandbox(t);
  const result = await exportExternalContent(options);
  assert.deepEqual(await readdir(options.destination), ['assets', 'content-package.json', 'external-content-receipt.json', 'sdk']);
  const bytes = await readFile(path.join(options.destination, 'content-package.json'));
  assert.deepEqual(bytes, await readFile(path.join(source, 'content-package.json')));
  assert.equal(sha(bytes), result.packageSha256);
  assert.equal(result.state, 'exported-not-imported-not-deployed');
  assert.ok(result.pages.length >= 3);
  assert.equal(JSON.stringify(result).includes('"review"'), false);
  for (const file of result.sdk) assert.equal(sha(await readFile(path.join(options.destination, 'sdk', file.path))), file.sha256);
  for (const file of result.assets) assert.equal(sha(await readFile(path.join(options.destination, 'assets', file.name))), file.sha256);
  // Imported directly from the exported directory: no sibling checkout/dependency import.
  const { validateContentPackage } = await import(pathToFileURL(path.join(options.destination, 'sdk/scripts/content-package-core.mjs')));
  const { projectPublicPages, contextualParts } = await import(pathToFileURL(path.join(options.destination, 'sdk/lib/niche-links.mjs')));
  const { imageSrcSet } = await import(pathToFileURL(path.join(options.destination, 'sdk/lib/niche-media.mjs')));
  const pkg = JSON.parse(bytes);
  validateContentPackage(pkg);
  assert.deepEqual(projectPublicPages(pkg, [pkg], {}, 0), []);
  const last = Math.max(...pkg.pages.map(p => Date.parse(p.publishAt)));
  const live = projectPublicPages(pkg, [pkg], {}, last);
  assert.equal(live.length, pkg.pages.length);
  for (const page of pkg.pages) {
    assert.equal(projectPublicPages(pkg, [pkg], {}, Date.parse(page.publishAt) - 1).some(p => p.id === page.id), false);
    assert.equal(projectPublicPages(pkg, [pkg], {}, Date.parse(page.publishAt)).some(p => p.id === page.id), true);
  }
  const ids = new Set(live.map(p => p.id));
  assert.ok(live.every(p => p.links.every(l => ids.has(l.targetPageId))));
  assert.deepEqual(contextualParts('Atsakymas', []), [{ text: 'Atsakymas' }]);
  const pageWithImage = live.find(p => p.media.length);
  assert.ok(imageSrcSet(pageWithImage.media, pageWithImage.media[0]).includes('.webp'));
});

test('external export rejects foreign identity and never overwrites existing output', async t => {
  const { options } = await sandbox(t);
  await assert.rejects(exportExternalContent({ ...options, expectedSiteId: 'mokytoja-ai' }), /identity mismatch/);
  await assert.rejects(exportExternalContent({ ...options, expectedCanonicalHost: 'superiora.lt' }), /identity mismatch/);
  await assert.rejects(exportExternalContent({ ...options, destination: options.releaseDirectory }), /separate directories/);
  await exportExternalContent(options);
  const before = await readFile(path.join(options.destination, 'content-package.json'));
  await assert.rejects(exportExternalContent(options), /EEXIST/);
  assert.deepEqual(await readFile(path.join(options.destination, 'content-package.json')), before);
});

test('changed approved text or media is rejected before any destination is created', async t => {
  const { source, options } = await sandbox(t);
  const original = await readFile(path.join(source, 'content-package.json'));
  const pkg = JSON.parse(original);
  pkg.pages[0].title += ' tampered';
  await writeFile(path.join(source, 'content-package.json'), JSON.stringify(pkg));
  await assert.rejects(exportExternalContent(options), /manifest|sum/);
  await assert.rejects(readdir(options.destination), /ENOENT/);
  await writeFile(path.join(source, 'content-package.json'), original);
  const manifest = JSON.parse(await readFile(path.join(source, 'release-manifest.json')));
  await writeFile(path.join(source, 'assets', manifest.assets[0].name), 'changed media');
  await assert.rejects(exportExternalContent(options), /medijos/);
  await assert.rejects(readdir(options.destination), /ENOENT/);
});
