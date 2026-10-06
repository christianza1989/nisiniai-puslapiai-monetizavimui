import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'external-site-id-test-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
process.env.STUDIO_NETWORK_SETTINGS = path.join(root, 'network.json');
await writeFile(process.env.STUDIO_NETWORK_SETTINGS, JSON.stringify({ defaultEmail: 'default@example.com',
  contactsBySite: { 'mokytoja-ai': { email: 'teacher@example.com' } } }));
const model = await import('../src/model.mjs');
await model.initialize();
test.after(() => rm(root, { recursive: true, force: true }));

test('external platform has stable explicit ID and matching contact without changing legacy IDs', async () => {
  const teacher = await model.createSite({ siteId: 'mokytoja-ai', canonicalHost: 'mokytoja-ai.vercel.app', name: 'Synthetic teacher', offer: 'Isolated registration test' });
  assert.equal(teacher.id, 'mokytoja-ai');
  assert.equal(teacher.canonicalHost, 'mokytoja-ai.vercel.app');
  assert.equal(teacher.contact.email, 'teacher@example.com');
  await assert.rejects(model.createSite({ siteId: 'mokytoja-ai', canonicalHost: 'different.example.com' }), /ID jau naudojamas/);
  await assert.rejects(model.createSite({ siteId: 'another-id', canonicalHost: teacher.canonicalHost }), /Domenas jau/);
  for (const id of ['../escape', '', null, 'Uppercase', 'a'.repeat(64)]) {
    await assert.rejects(model.createSite({ siteId: id, canonicalHost: 'unsafe.example.com' }), /Netinkamas stabilus/);
  }
  const legacy = await model.createSite({ canonicalHost: 'normal.example.com', name: 'Legacy' });
  assert.equal(legacy.id, 'normal-example');
  assert.equal(legacy.contact.email, 'default@example.com');
  // Existing domain-derived IDs are not newly restricted by the explicit ID contract.
  const longLegacy = await model.createSite({ canonicalHost: 'a'.repeat(63) + '.example.com', name: 'Long legacy host' });
  assert.equal(longLegacy.id, 'a'.repeat(60)); // Existing domain ID truncation is unchanged.
  // No implicit host migration or namespace rewriting is introduced.
  await assert.rejects(model.editSite(teacher.id, { canonicalHost: 'superiora.lt' }), /Pirminio domeno/);
  assert.equal((await model.getSite(teacher.id)).canonicalHost, teacher.canonicalHost);
});
