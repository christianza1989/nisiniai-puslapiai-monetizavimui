import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { importRevisionBaseline, readRevisionBaseline, revisionState, revisionComparison, baselineSha256 } from '../src/revision-history.mjs';

await mkdir(path.resolve(import.meta.dirname, '../tmp'), { recursive: true });
const root = await mkdtemp(path.resolve(import.meta.dirname, '../tmp/revision-history-'));
process.env.STUDIO_DATA_DIR = path.join(root, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'output');
process.env.STUDIO_REVISION_HISTORY_DIR = path.join(root, 'history');
const model = await import('../src/model.mjs');
const { createServer } = await import('../src/server.mjs');
const { reviewCurrent } = await import('../src/content-workflow.mjs');
await model.initialize();
const paragraph = text => [{ type: 'paragraph', text }];

test('private baseline prefers the old published text and cannot overwrite a saved archive', async () => {
  const old = { id: 'history-example', pages: [{ id: 'p1', title: 'New draft at cleanup', body: paragraph('Already rewritten'), publishedRevision: { title: 'Old published title', description: 'Old', body: paragraph('Old published body') } }] };
  const args = { label: 'Before rewrite', capturedAt: '2026-10-19T10:00:00Z', sourceSha256: baselineSha256(Buffer.from('synthetic backup')) };
  await importRevisionBaseline(process.env.STUDIO_REVISION_HISTORY_DIR, old, args);
  const baseline = await readRevisionBaseline(process.env.STUDIO_REVISION_HISTORY_DIR, old.id);
  assert.equal(baseline.pages.p1.title, 'Old published title');
  assert.equal(baseline.pages.p1.body[0].text, 'Old published body');
  await assert.rejects(importRevisionBaseline(process.env.STUDIO_REVISION_HISTORY_DIR, old, args), { code: 'EEXIST' });
  await assert.rejects(readRevisionBaseline(root, '../outside'), /ID/);
  assert.equal(await readRevisionBaseline(root, 'no-history'), null);
});

test('empty cleared drafts are not rewritten, absent baselines are explicit, and key order is irrelevant', () => {
  const old = { title: 'Before', description: 'Meta', body: paragraph('Same text') };
  const baseline = { label: 'Archive', capturedAt: '2026-10-19', pages: { p1: old } };
  assert.equal(revisionState({ id: 'p1', body: [] }, baseline).changed, false);
  assert.equal(revisionState({ id: 'p1', ...old, body: [{ text: 'Same text', type: 'paragraph' }] }, baseline).changed, false);
  const changed = { id: 'p1', ...old, body: paragraph('Rewritten text') };
  assert.equal(revisionState(changed, baseline).rewritten, true);
  assert.equal(revisionState(changed, null).rewritten, false);
  assert.equal(revisionState(changed, null).changed, true);
  assert.equal(revisionComparison(changed, null).before, null);
  assert.equal(revisionComparison(changed, baseline).before.body[0].text, 'Same text');
});

test('HTTP comparison is read-only and current review badge disappears after a text edit', async () => {
  const site = await model.createSite({ canonicalHost: 'revision-test.example', name: 'Synthetic comparison' });
  const page = await model.addPage(site.id, { slug: 'guide', type: 'guide', title: 'Synthetic new title', description: 'Only isolated test data.', body: paragraph('Synthetic current text for comparison, not public business content.') });
  const previous = { ...site, pages: [{ ...page, title: 'Synthetic old title', body: paragraph('<script>untrusted archived prose</script>') }] };
  await importRevisionBaseline(process.env.STUDIO_REVISION_HISTORY_DIR, previous, { label: 'Synthetic old copy', capturedAt: new Date().toISOString(), sourceSha256: baselineSha256(Buffer.from('test')) });
  const currentSite = await model.getSite(site.id), p = currentSite.pages.find(item => item.id === page.id);
  await model.recordEditorialReview(site.id, p.id, { reviewer: 'Synthetic test', revisionHash: model.revisionHash(p), evidence: Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(area => [area, 'Synthetic isolated evidence for ' + area + ', not a real editorial review.'])) });
  const before = await readFile(path.join(process.env.STUDIO_DATA_DIR, 'sites', site.id + '.json'));
  const server = await createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const listed = await (await fetch(base + '/api/sites/' + site.id)).json();
    assert.equal(listed.pages[0].revisionState.rewritten, true);
    assert.equal(listed.pages[0].revisionState.reviewed, true);
    const compared = await (await fetch(base + '/api/sites/' + site.id + '/pages/' + page.id + '/revisions')).json();
    assert.equal(compared.before.title, 'Synthetic old title');
    assert.equal(compared.before.body[0].text, '<script>untrusted archived prose</script>');
    assert.equal(compared.after.title, 'Synthetic new title');
    assert(!JSON.stringify(compared).includes(process.env.STUDIO_REVISION_HISTORY_DIR));
    assert.deepEqual(await readFile(path.join(process.env.STUDIO_DATA_DIR, 'sites', site.id + '.json')), before);
    assert.equal((await fetch(base + '/api/sites/' + site.id + '/pages/not-found/revisions')).status, 404);
    await model.editPage(site.id, page.id, { body: paragraph('Edited after review; archived text must never replace this body.') });
    const edited = await (await fetch(base + '/api/sites/' + site.id)).json();
    assert.equal(edited.pages[0].revisionState.reviewed, false);
    assert.equal(edited.pages[0].body[0].text, 'Edited after review; archived text must never replace this body.');
    assert.equal(reviewCurrent(edited, edited.pages[0], model.revisionHash(edited.pages[0])), false);
    const response = await fetch(base + '/api/sites/' + site.id + '/pages/' + page.id + '/revisions', { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(response.status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

