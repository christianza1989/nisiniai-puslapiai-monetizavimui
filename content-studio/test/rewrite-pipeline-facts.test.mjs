import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareFactGroups, selectEligibleFactTasks } from '../src/rewrite-pipeline/fact-preparation.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
function source(path, sku, content = `<h1>${path}</h1>`) {
  const url = `https://www.klaro.cz/${path}`;
  return { ref: { url, sha256: hash(content), kind: sku ? 'product' : 'category',
    identity: { canonicalUrl: url, h1: path, ...(sku ? { sku } : {}) } }, content };
}
const category = source('carts');
function fixture(pageId, sku = pageId, group = category) {
  const product = source(`produkt/${sku}`, sku);
  return { task: { siteId: 'promedical', pageId, primaryCategoryUrl: group.ref.url,
    modelSkus: [sku], sources: [clone(group.ref), clone(product.ref)] }, sources: [group, product] };
}
function reviewed(task, sources) {
  return { version: 1, siteId: task.siteId, pageId: task.pageId,
    facts: task.sources.filter(ref => ref.kind === 'product').map(ref => ({ text: `Own fixture fact for ${ref.identity.sku}`,
      source: { url: ref.url, sha256: ref.sha256 }, sku: ref.identity.sku })),
    sourceReview: { reviewer: 'actual-fixture-reviewer', reviewedAt: '2026-10-18T08:00:00Z', wholeDocumentsRead: true,
      identities: sources.map(document => ({ url: document.url, sha256: document.sha256, ...document.identity })) },
    ownFactsAttestation: { siteId: task.siteId, pageId: task.pageId, reviewer: 'actual-fixture-reviewer', allFactsFromOwnSources: true } };
}
function setup(fixtures, options = {}) {
  const documents = new Map(fixtures.flatMap(item => item.sources).map(item => [`${item.ref.url}\n${item.ref.sha256}`, item]));
  const reads = [], saves = [], prepares = [];
  return { reads, saves, prepares, args: { tasks: fixtures.map(item => item.task),
    readSource: async ref => {
      reads.push(ref.url);
      const item = documents.get(`${ref.url}\n${ref.sha256}`);
      return { content: item.content, identity: clone(item.ref.identity) };
    },
    preparePage: async (task, { sources }) => { prepares.push(task.pageId); return reviewed(task, sources); },
    persist: async pack => { saves.push(pack); }, ...options } };
}

test('groups by category but keeps separate SKU facts; overlapping source pins read once', async () => {
  const other = source('ward-carts');
  const a = fixture('a', 'A'), b = fixture('b', 'B'), c = fixture('c', 'C', other);
  c.task.sources.push(clone(category.ref));
  c.sources.push(category);
  const run = setup([a, b, c]);
  const result = await prepareFactGroups(run.args);
  assert.deepEqual(result.groups, [{ categoryUrl: category.ref.url, pageIds: ['a', 'b'] }, { categoryUrl: other.ref.url, pageIds: ['c'] }]);
  assert.equal(run.reads.filter(url => url === category.ref.url).length, 1);
  assert.deepEqual(result.outcomes.map(row => row.status), ['ready', 'ready', 'ready']);
  assert.deepEqual(run.saves.map(pack => pack.facts[0].sku).sort(), ['A', 'B', 'C']);
});

test('selection excludes all holds, completed, active and reserved pages without callbacks', async () => {
  const fixtures = ['held', 'done', 'active', 'reserved', 'okay'].map(id => fixture(id));
  const selection = { heldPageIds: ['held'], completedPageIds: ['done'], inFlightPageIds: ['active'], reservedPageIds: ['reserved'] };
  const selected = selectEligibleFactTasks({ tasks: fixtures.map(item => item.task), ...selection });
  assert.deepEqual(selected.eligible.map(item => item.pageId), ['okay']);
  const run = setup(fixtures, { selection });
  const result = await prepareFactGroups(run.args);
  assert.deepEqual(run.prepares, ['okay']);
  assert.equal(result.outcomes.filter(row => row.status === 'skipped').length, 4);
});

test('wrong site and duplicate page cannot enter fact preparation', async () => {
  const a = fixture('a'), wrong = fixture('wrong');
  wrong.task.siteId = 'another-site';
  const run = setup([a, a, wrong]);
  const result = await prepareFactGroups(run.args);
  assert.deepEqual(run.prepares, ['a']);
  assert.equal(result.outcomes.find(row => row.reason === 'wrong-site').pageId, 'wrong');
  assert.equal(result.outcomes.filter(row => row.reason === 'duplicate-page').length, 1);
});

test('cache is immutable and keyed by URL plus exact hash, so changed bytes require a new review', async () => {
  const a = fixture('a');
  const first = setup([a]);
  const before = await prepareFactGroups(first.args);
  const alteredProduct = source('produkt/a', 'a', '<h1>new exact bytes</h1>');
  const secondFixture = fixture('a');
  secondFixture.task.sources[1] = clone(alteredProduct.ref);
  secondFixture.sources[1] = alteredProduct;
  const second = setup([secondFixture], { existingArtifacts: { sources: before.sourceCache, pages: first.saves } });
  const after = await prepareFactGroups(second.args);
  assert.equal(after.outcomes[0].status, 'ready');
  assert.deepEqual(second.reads, [alteredProduct.ref.url]);
  assert.deepEqual(second.prepares, ['a']);
  assert.throws(() => { before.sourceCache[0].identity.h1 = 'mutated'; }, TypeError);
});

test('a fully attested current pack resumes without preparing, fetching or persisting again', async () => {
  const a = fixture('a'), first = setup([a]);
  const result = await prepareFactGroups(first.args);
  const resumed = setup([a], { existingArtifacts: { sources: result.sourceCache, pages: first.saves } });
  const after = await prepareFactGroups(resumed.args);
  assert.equal(after.outcomes[0].status, 'reused');
  assert.deepEqual([resumed.reads.length, resumed.prepares.length, resumed.saves.length], [0, 0, 0]);
});

test('existing JSON with a ready label but no real review is prepared again', async () => {
  const a = fixture('a');
  const run = setup([a], { existingArtifacts: { pages: [{ pageId: 'a', status: 'ready', facts: [] }] } });
  const result = await prepareFactGroups(run.args);
  assert.equal(result.outcomes[0].status, 'ready');
  assert.deepEqual(run.prepares, ['a']);
});

test('wrong hash or document identity fails only that SKU and never persists it', async () => {
  for (const breakDocument of [doc => { doc.content += 'changed'; }, doc => { doc.identity.sku = 'OTHER'; }, doc => { doc.identity.h1 = 'wrong'; }]) {
    const a = fixture('a'), b = fixture('b'), run = setup([a, b]);
    const read = run.args.readSource;
    run.args.readSource = async ref => { const doc = await read(ref); if (ref.identity.sku === 'a') breakDocument(doc); return doc; };
    const result = await prepareFactGroups(run.args);
    assert.deepEqual(result.outcomes.map(row => row.status), ['failed', 'ready']);
    assert.deepEqual(run.saves.map(pack => pack.pageId), ['b']);
  }
});

test('source reference needs canonical H1 and product SKU before any read', async () => {
  for (const field of ['canonicalUrl', 'h1', 'sku']) {
    const a = fixture('a'); delete a.task.sources[1].identity[field];
    const run = setup([a]);
    assert.equal((await prepareFactGroups(run.args)).outcomes[0].status, 'failed');
    assert.deepEqual(run.reads, []);
  }
});

test('wrong origin and category not pinned to own task fail before reading', async () => {
  for (const mutate of [task => { task.sources[1].url = 'https://evil.example/produkt/a'; },
    task => { task.primaryCategoryUrl = 'https://www.klaro.cz/unreviewed'; }]) {
    const a = fixture('a'); mutate(a.task);
    const run = setup([a]);
    assert.equal((await prepareFactGroups(run.args)).outcomes[0].status, 'failed');
    assert.deepEqual(run.reads, []);
  }
});

test('SKU facts cannot transfer from another product or category list', async () => {
  for (const corrupt of [pack => { pack.facts[0].sku = 'b'; },
    (pack, task) => { pack.facts[0].source = clone(task.sources[0]); },
    pack => { pack.facts[0].source.url = 'https://www.klaro.cz/produkt/b'; }]) {
    const a = fixture('a'), run = setup([a]);
    run.args.preparePage = async (task, { sources }) => { const pack = reviewed(task, sources); corrupt(pack, task); return pack; };
    const result = await prepareFactGroups(run.args);
    assert.equal(result.outcomes[0].status, 'failed');
    assert.deepEqual(run.saves, []);
  }
});

test('truthful source/own-facts attestation is mandatory, including exact reviewed source identities', async () => {
  for (const corrupt of [pack => { delete pack.sourceReview; }, pack => { pack.ownFactsAttestation.allFactsFromOwnSources = false; },
    pack => { pack.sourceReview.identities[1].sku = 'OTHER'; }, pack => { pack.sourceReview.reviewedAt = 'not-a-date'; }]) {
    const a = fixture('a'), run = setup([a]);
    run.args.preparePage = async (task, { sources }) => { const pack = reviewed(task, sources); corrupt(pack); return pack; };
    assert.equal((await prepareFactGroups(run.args)).outcomes[0].status, 'failed');
    assert.equal(run.saves.length, 0);
  }
});

test('contradictory identity cannot borrow another page’s shared cached bytes', async () => {
  const a = fixture('a'), b = fixture('b');
  b.task.sources[0].identity.h1 = 'Different identity for same bytes';
  const run = setup([a, b]);
  const result = await prepareFactGroups(run.args);
  assert.deepEqual(result.outcomes.map(row => row.status), ['ready', 'failed']);
});

test('independent workers have bounded concurrency and a failed SKU does not block later pages', async () => {
  const run = setup(['a', 'b', 'c', 'd'].map(id => fixture(id)), { concurrency: 2 });
  let active = 0, maximum = 0;
  run.args.preparePage = async (task, { sources }) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--;
    if (task.pageId === 'b') throw new Error('Actual source review unresolved');
    return reviewed(task, sources);
  };
  const result = await prepareFactGroups(run.args);
  assert.equal(maximum, 2);
  assert.deepEqual(result.outcomes.map(row => row.status), ['ready', 'failed', 'ready', 'ready']);
});

test('cancellation preserves completed packs and resume prepares only remaining pages', async () => {
  const fixtures = ['a', 'b', 'c'].map(id => fixture(id)), controller = new AbortController();
  const first = setup(fixtures, { concurrency: 1, signal: controller.signal });
  first.args.persist = async pack => { first.saves.push(pack); controller.abort(); };
  const before = await prepareFactGroups(first.args);
  assert.deepEqual(before.outcomes.map(row => row.status), ['ready', 'cancelled', 'cancelled']);
  const second = setup(fixtures, { existingArtifacts: { pages: first.saves, sources: before.sourceCache } });
  const resumed = await prepareFactGroups(second.args);
  assert.deepEqual(resumed.outcomes.map(row => row.status), ['reused', 'ready', 'ready']);
  assert.deepEqual(second.prepares.sort(), ['b', 'c']);
});

test('cancel during read cannot prepare or persist, while persist failure is not marked ready', async () => {
  const a = fixture('a'), controller = new AbortController(), run = setup([a], { signal: controller.signal });
  const read = run.args.readSource;
  run.args.readSource = async ref => { const doc = await read(ref); controller.abort(); return doc; };
  assert.equal((await prepareFactGroups(run.args)).outcomes[0].status, 'cancelled');
  assert.deepEqual(run.prepares, []);
  const failed = setup([a], { persist: async () => { throw new Error('Private pack storage unavailable'); } });
  assert.equal((await prepareFactGroups(failed.args)).outcomes[0].status, 'failed');
});

test('concurrency bounds and required real callbacks are validated', async () => {
  for (const concurrency of [0, 9, 1.5]) await assert.rejects(prepareFactGroups({ concurrency }), /concurrency/);
  await assert.rejects(prepareFactGroups({ tasks: [] }), /callbacks/);
});
