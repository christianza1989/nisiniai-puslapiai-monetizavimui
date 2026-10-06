import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(os.tmpdir(), 'studio-domain-migration-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
const model = await import('../src/model.mjs');
await model.initialize();
test.after(async () => {
  assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
  await rm(root, { recursive: true, force: true });
});
async function reviewAll(id) {
  for (const page of (await model.getSite(id)).pages) {
    await model.recordEditorialReview(id, page.id, {
      reviewer: 'synthetic-migration-test', revisionHash: model.revisionHash(page),
      evidence: Object.fromEntries(['usefulness', 'facts', 'sources', 'media', 'links', 'presentation'].map(area => [area, `Synthetic ${area} fixture verifies migration gates only; not real editorial evidence.`])),
    });
  }
  await model.approveReviewedBatch(id, (await model.getSite(id)).pages.map(page => page.id), 'synthetic-test');
}
const body = [{ type: 'paragraph', text: 'This synthetic test explains how an explicit domain migration preserves the original publication schedule, stable page identifiers, internal relationships and approved historical release bytes. It contains no real customer or product data and does not establish editorial quality or demand.' }];

test('explicit domain migration preserves identity/material/dates/history and requires fresh review', async () => {
  const site = await model.createSite({ siteId: 'stable-learning', canonicalHost: 'old-learning.example', name: 'Synthetic learning', offer: 'Synthetic fixture only' });
  await model.editSite(site.id, { facts: 'Synthetic facts for this isolated test only.' });
  const home = await model.addPage(site.id, { type: 'home', slug: '', title: 'Synthetic home', description: 'Test only', intent: 'Synthetic home intent', body, publishAt: '2026-10-06T18:30:00Z' });
  const service = await model.addPage(site.id, { type: 'service', slug: 'help', title: 'Synthetic help', description: 'Test only', intent: 'Synthetic help intent', body, publishAt: '2026-10-06T18:30:00Z' });
  await model.editPage(site.id, home.id, { links: [{ targetPageId: service.id, label: 'Synthetic help' }] });
  await reviewAll(site.id);
  const before = await model.getSite(site.id), historicalRelease = await model.releaseContent(site.id);
  const historicalBytes = await readFile(historicalRelease.path);
  await assert.rejects(model.editSite(site.id, { canonicalHost: 'new-learning.example' }));
  await model.createSite({ canonicalHost: 'occupied.example', name: 'Other synthetic site' });
  const migrate = input => model.migrateSiteDomain(site.id, { expectedCanonicalHost: 'old-learning.example', canonicalHost: 'new-learning.example', actorId: 'synthetic-test', ...input });
  for (const input of [{ actorId: '' }, { expectedCanonicalHost: 'wrong.example' }, { canonicalHost: 'occupied.example' }, { canonicalHost: 'old-learning.example' }, { canonicalHost: 'not-a-domain' }]) await assert.rejects(migrate(input));
  assert.deepEqual(await model.getSite(site.id), before, 'failed migrations are atomic');
  await migrate({});
  const migrated = await model.getSite(site.id);
  assert.equal(migrated.id, before.id);
  assert.equal(migrated.canonicalHost, 'new-learning.example');
  assert.deepEqual(migrated.contact, before.contact);
  assert.deepEqual(migrated.domainMigrations.map(({ from, to }) => ({ from, to })), [{ from: 'old-learning.example', to: 'new-learning.example' }]);
  for (let index = 0; index < before.pages.length; index++) {
    for (const key of ['id', 'siteId', 'slug', 'body', 'links', 'media', 'publishAt', 'publishedRevision', 'editorialReview']) assert.deepEqual(migrated.pages[index][key], before.pages[index][key]);
  }
  assert.ok((await model.getContentWorkflow(site.id)).pages.every(page => !page.reviewCurrent));
  await assert.rejects(model.releaseContent(site.id), /peržiūros/);
  await assert.rejects(model.exportPackage(site.id), /peržiūros/);
  await assert.rejects(model.approveReviewedBatch(site.id, before.pages.map(page => page.id), 'synthetic-test'), /peržiūros/);
  await reviewAll(site.id);
  const release = await model.releaseContent(site.id), pkg = JSON.parse(await readFile(release.path, 'utf8'));
  assert.equal(pkg.canonicalHost, 'new-learning.example');
  assert.equal(pkg.siteId, before.id);
  assert.deepEqual(pkg.pages.map(page => page.publishAt), before.pages.map(page => page.publishAt));
  assert.deepEqual(await readFile(historicalRelease.path), historicalBytes);
  await assert.rejects(migrate({}), /pasikeitė/);
});

test('V2 migration changes only current draft site snapshot; revoked drafts stay revoked', async () => {
  const site = await model.createSite({ canonicalHost: 'rich-old.example', name: 'Synthetic rich site', schemaVersion: 2 });
  const page = await model.addPage(site.id, { type: 'home', slug: '', title: 'Synthetic rich home', body: [{ type: 'richParagraph', content: [{ type: 'text', text: body[0].text }] }], publishAt: '2026-10-06T18:30:00Z' });
  const removed = await model.addPage(site.id, { type: 'service', slug: 'revoked', title: 'Removed synthetic draft' });
  await model.revokePage(site.id, removed.id);
  const before = (await model.getSite(site.id)).pages;
  await model.migrateSiteDomain(site.id, { expectedCanonicalHost: 'rich-old.example', canonicalHost: 'rich-new.example', actorId: 'synthetic-test' });
  const after = (await model.getSite(site.id)).pages;
  assert.equal(after[0].id, page.id);
  assert.equal(after[0].siteSnapshot.canonicalHost, 'rich-new.example');
  assert.deepEqual(after[0].body, before[0].body);
  assert.equal(after[0].publishAt, before[0].publishAt);
  assert.deepEqual(after[1], before[1]);
});
