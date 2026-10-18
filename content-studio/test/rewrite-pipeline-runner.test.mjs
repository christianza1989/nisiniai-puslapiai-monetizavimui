import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createPipelineState, JsonPipelineStore, runRewritePipeline } from '../src/rewrite-pipeline/runner.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
// Scheduling tests use an in-memory atomic store so the coalescing deadline is
// measured independently of Windows filesystem/antivirus latency. Disk tests below remain unchanged.
function memoryStore(pages) {
  const document = { pipeline: createPipelineState({ siteId: 'promedical', pages: pages.map(pageId => ({ pageId })) }) };
  return { read: async () => structuredClone(document), update: async mutator => { mutator(document); return structuredClone(document); } };
}
const temporaryRoot = fileURLToPath(new URL('../tmp/rewrite-pipeline-tests/', import.meta.url));
async function fixture(t, pages, { legacy } = {}) {
  await mkdir(temporaryRoot, { recursive: true });
  const directory = await mkdtemp(path.join(temporaryRoot, 'runner-'));
  t.after(async () => { assert.ok(directory.startsWith(path.join(temporaryRoot, 'runner-'))); await rm(directory, { recursive: true, force: true }); });
  const filename = path.join(directory, 'CURRENT_LEAN_BATCH.json');
  if (legacy) await writeFile(filename, JSON.stringify(legacy));
  const store = new JsonPipelineStore(filename);
  await store.init(createPipelineState({ siteId: 'promedical', pages: pages.map(page => typeof page === 'string' ? { pageId: page } : page) }));
  return { store, filename, directory };
}
function ports(overrides = {}) {
  return {
    generate: async ({ batchId, pages }) => ({ captureRef: { path: `fixture:${batchId}`, sha256: 'b'.repeat(64) }, pages: pages.map(page => ({ pageId: page.pageId, originalBody: `Original ${page.pageId}` })) }),
    review: async () => ({ decision: 'accepted', reviewer: 'fixture reviewer', allH1DescriptionBodyReasonsPersonallyRead: true, factsAndLanguageAccepted: true }),
    importPages: async records => ({ outcomes: records.map(record => ({ pageId: record.pageId, status: 'complete', receipt: {
      officialCurrentReview: true, cpTesExact: true, canonicalRevision: 'a'.repeat(64), domWidths: [1440, 390],
    } })) }), ...overrides,
  };
}

test('generation N+1 overlaps one reviewer N; only one importer runs', { timeout: 5000 }, async t => {
  const { store } = await fixture(t, ['a', 'b', 'c', 'd', 'e', 'f']);
  const reviewing = deferred(), secondGenerated = deferred();
  let generations = 0, reviewActive = 0, reviewMax = 0, importActive = 0, importMax = 0;
  const normal = ports();
  const result = await runRewritePipeline({ store, pollMs: 1, ports: ports({
    generate: async (request, ctx) => {
      generations++;
      if (generations === 2) { await reviewing.promise; assert.equal(reviewActive, 1); secondGenerated.resolve(); }
      return normal.generate(request, ctx);
    },
    review: async record => {
      reviewActive++; reviewMax = Math.max(reviewMax, reviewActive);
      if (record.pageId === 'a') { reviewing.resolve(); await secondGenerated.promise; }
      await delay(2); reviewActive--; return normal.review(record);
    },
    importPages: async records => {
      importActive++; importMax = Math.max(importMax, importActive);
      await delay(10); importActive--; return normal.importPages(records);
    },
  }) });
  assert.equal(result.status, 'COMPLETE');
  assert.equal(generations, 2);
  assert.equal(reviewMax, 1);
  assert.equal(importMax, 1);
  assert.equal(result.pages.filter(page => page.status === 'COMPLETE').length, 6);
});

test('accepted page imports immediately while sibling review is pending; rejected sibling retries alone', { timeout: 5000 }, async t => {
  const { store } = await fixture(t, ['a', 'b', 'c']);
  const aImported = deferred(), requests = [], imports = [];
  const normal = ports();
  const result = await runRewritePipeline({ store, pollMs: 1, maxBatches: 3, ports: ports({
    generate: async (request, ctx) => { requests.push(request.pages.map(page => page.pageId)); return normal.generate(request, ctx); },
    review: async record => {
      if (record.pageId === 'b' && record.attempts.length === 1) { await aImported.promise; return { decision: 'rejected', reviewer: 'fixture reviewer', reason: 'Wrong source attribution' }; }
      return normal.review(record);
    },
    importPages: async records => { imports.push(records.map(record => record.pageId)); if (records.some(record => record.pageId === 'a')) aImported.resolve(); return normal.importPages(records); },
  }) });
  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(requests, [['a', 'b', 'c'], ['b']]);
  assert.deepEqual(imports[0], ['a']);
  assert.equal(result.pages.find(page => page.pageId === 'b').candidates.length, 2);
});

test('short coalescing window groups three independently accepted pages into one import epoch', { timeout: 5000 }, async t => {
  const store = memoryStore(['a', 'b', 'c']);
  const normal = ports(), imports = [];
  let active = 0, maximum = 0;
  const result = await runRewritePipeline({ store, pollMs: 2, importCoalesceMs: 200, ports: ports({
    review: async record => { await delay(15); return normal.review(record); },
    importPages: async records => {
      active++; maximum = Math.max(maximum, active);
      imports.push(records.map(record => record.pageId));
      try { return await normal.importPages(records); } finally { active--; }
    },
  }) });
  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(imports, [['a', 'b', 'c']]);
  assert.equal(maximum, 1);
});

test('default coalescing deadline imports one page without waiting for a subsequently held sibling', { timeout: 5000 }, async t => {
  const store = memoryStore(['a', 'b']);
  const normal = ports(), imported = deferred(), imports = [];
  let acceptedAt, importedAt;
  const result = await runRewritePipeline({ store, pollMs: 2, ports: ports({
    review: async record => {
      if (record.pageId === 'a') { acceptedAt = Date.now(); return normal.review(record); }
      await imported.promise;
      return { decision: 'held', reason: 'Separate factual issue; not accepted' };
    },
    importPages: async records => {
      importedAt = Date.now(); imports.push(records.map(record => record.pageId));
      imported.resolve(); return normal.importPages(records);
    },
  }) });
  assert.deepEqual(imports, [['a']]);
  assert.deepEqual(result.pages.map(page => page.status), ['COMPLETE', 'HELD']);
  // The configured wait is 500ms; allow ordinary scheduler overhead.
  assert.ok(importedAt - acceptedAt >= 400 && importedAt - acceptedAt < 1200, `elapsed ${importedAt - acceptedAt}ms`);
});

test('owner pause during coalescing leaves accepted page unclaimed and performs no native import', { timeout: 5000 }, async t => {
  const store = memoryStore(['a', 'b']);
  const normal = ports(), controller = new AbortController();
  let imports = 0;
  const result = await runRewritePipeline({ store, pollMs: 2, signal: controller.signal, ports: ports({
    review: async record => {
      if (record.pageId === 'b') { await delay(20); controller.abort(); await delay(5); }
      return normal.review(record);
    },
    importPages: async records => { imports++; return normal.importPages(records); },
  }) });
  assert.equal(result.status, 'PAUSED');
  assert.equal(result.pages[0].status, 'ACCEPTED');
  assert.equal(result.pages[0].imports.length, 0);
  assert.equal(imports, 0);
});

test('coalesced uncertain native epoch stays unknown and cannot replay after restart', { timeout: 5000 }, async t => {
  const store = memoryStore(['a', 'b', 'c']);
  let imports = 0;
  const first = await runRewritePipeline({ store, pollMs: 2, importCoalesceMs: 200, ports: ports({
    importPages: async () => { imports++; throw new Error('Native write outcome unknown'); },
  }) });
  assert.equal(imports, 1);
  assert.ok(first.pages.every(page => page.status === 'UNKNOWN_IMPORT'));
  const restarted = await runRewritePipeline({ store, pollMs: 2, ports: ports({ importPages: async () => { imports++; } }) });
  assert.equal(imports, 1);
  assert.ok(restarted.pages.every(page => page.status === 'UNKNOWN_IMPORT'));
});

test('max attempts holds rejected page; candidate and attempt originals remain immutable', async t => {
  const { store } = await fixture(t, ['a']);
  const result = await runRewritePipeline({ store, pollMs: 1, maxBatches: 5, ports: ports({ review: async () => ({ decision: 'rejected', reviewer: 'fixture', reason: 'Needs new factual author response' }) }) });
  assert.equal(result.status, 'IDLE_WITH_BLOCKERS');
  assert.equal(result.pages[0].status, 'HELD');
  assert.equal(result.pages[0].attempts.length, 2);
  await assert.rejects(store.update(document => { document.pipeline.pages[0].candidates[0].candidate.originalBody = 'Silent replacement'; }), /Immutable/);
  await assert.rejects(store.update(document => { document.pipeline.pages[0].attempts[0].startedAt = 'changed'; }), /Immutable/);
  assert.equal((await store.read()).pipeline.pages[0].candidates[0].candidate.originalBody, 'Original a');
});

test('unknown send or thrown generation never automatically retries; independent page proceeds', async t => {
  for (const method of ['throw', 'unknown']) {
    const { store } = await fixture(t, ['a', 'b']);
    const requests = [], normal = ports();
    const result = await runRewritePipeline({ store, batchSize: 1, maxBatches: 4, pollMs: 1, ports: ports({
      generate: async (request, ctx) => {
        requests.push(request.pages[0].pageId);
        if (request.pages[0].pageId === 'a') {
          if (method === 'throw') throw new Error('Send acknowledgement unknown');
          return { ...(await normal.generate(request, ctx)), send: { status: 'UNKNOWN' } };
        }
        return normal.generate(request, ctx);
      },
    }) });
    assert.deepEqual(requests, ['a', 'b']);
    assert.deepEqual(result.pages.map(page => page.status), ['UNKNOWN', 'COMPLETE']);
    assert.equal(result.pages[0].attempts.length, 1);
  }
});

test('retained parser rejection retries only that page while accepted sibling completes', async t => {
  const { store } = await fixture(t, ['a', 'b']), normal = ports(), requests = [];
  const result = await runRewritePipeline({ store, maxBatches: 3, pollMs: 1, ports: ports({ generate: async (request, ctx) => {
    requests.push(request.pages.map(page => page.pageId));
    const response = await normal.generate(request, ctx);
    if (requests.length === 1) {
      response.pages = response.pages.filter(page => page.pageId !== 'b');
      response.rejections = [{ pageId: 'b', status: 'rejected', reason: 'Retained paragraph is present but malformed source footer' }];
    }
    return response;
  } }) });
  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(requests, [['a', 'b'], ['b']]);
  const rejected = result.pages[1];
  assert.equal(rejected.generationResults[0].status, 'REJECTED');
  assert.equal(rejected.generationResults[0].rejection.reason, 'Retained paragraph is present but malformed source footer');
  assert.deepEqual(rejected.generationResults[0].rawRef, rejected.generationResults[0].captureRef);
  assert.equal(rejected.attempts.length, 2);
  assert.equal(result.pages[0].attempts.length, 1);
});

test('only explicit retained rejection can retry; missing candidate remains UNKNOWN and repeated rejection holds', async t => {
  const { store } = await fixture(t, ['missing', 'rejected']);
  const requests = [];
  const result = await runRewritePipeline({ store, maxBatches: 4, pollMs: 1, ports: ports({ generate: async request => {
    requests.push(request.pages.map(page => page.pageId));
    return { captureRef: { path: 'fixture:retained-whole-raw', sha256: 'c'.repeat(64) }, pages: [],
      rejections: request.pages.filter(page => page.pageId === 'rejected').map(page => ({ pageId: page.pageId, status: 'rejected', reason: 'Retained invalid page' })) };
  } }) });
  assert.deepEqual(requests, [['missing', 'rejected'], ['rejected']]);
  assert.deepEqual(result.pages.map(page => page.status), ['UNKNOWN', 'HELD']);
  assert.equal(result.pages[0].attempts.length, 1);
  assert.equal(result.pages[1].attempts.length, 2);
});

test('duplicate, cross-batch or overlapping candidate/rejection IDs cannot authorize generation retry', async t => {
  for (const corrupt of [
    response => { response.rejections = [{ pageId: 'a', status: 'rejected', reason: 'Overlaps captured candidate' }]; },
    response => { response.pages.push(cloneCandidate(response.pages[0])); },
    response => { response.rejections = [{ pageId: 'other-batch', status: 'rejected', reason: 'Outside this batch' }]; },
    response => { response.pages = []; response.rejections = [{ pageId: 'a', status: 'rejected', reason: 'one' }, { pageId: 'a', status: 'rejected', reason: 'two' }]; },
    response => { response.pages = []; response.rejections = [{ pageId: 'a', status: 'failed', reason: 'Not a known retained parser rejection' }]; },
  ]) {
    const { store } = await fixture(t, ['a']), normal = ports();
    let calls = 0;
    const result = await runRewritePipeline({ store, maxBatches: 3, pollMs: 1, ports: ports({ generate: async (request, ctx) => {
      calls++; const response = await normal.generate(request, ctx); corrupt(response); return response;
    } }) });
    assert.equal(calls, 1);
    assert.equal(result.pages[0].status, 'UNKNOWN');
  }
});
const cloneCandidate = candidate => structuredClone(candidate);

test('missing retained capture pin or unknown dispatch overrides explicit parser rejection', async t => {
  for (const captureRef of [undefined, {}, { path: 'fixture:raw', sha256: 'bad' }, 'fixture:unpinned-raw']) {
    const { store } = await fixture(t, ['a']);
    const result = await runRewritePipeline({ store, maxBatches: 3, pollMs: 1, ports: ports({ generate: async () => ({
      captureRef, pages: [], rejections: [{ pageId: 'a', status: 'rejected', reason: 'Would otherwise retry' }],
    }) }) });
    assert.equal(result.pages[0].status, 'UNKNOWN');
    assert.equal(result.pages[0].attempts.length, 1);
  }
  const { store } = await fixture(t, ['a']);
  const result = await runRewritePipeline({ store, maxBatches: 3, pollMs: 1, ports: ports({ generate: async () => ({
    captureRef: { path: 'fixture:raw', sha256: 'c'.repeat(64) }, send: { status: 'UNKNOWN_DISPATCH' }, pages: [],
    rejections: [{ pageId: 'a', status: 'rejected', reason: 'Not evidence of known retained response' }],
  }) }) });
  assert.equal(result.pages[0].status, 'UNKNOWN');
  assert.equal(result.pages[0].attempts.length, 1);
});

test('restart holds interrupted generation and import without replay, then works other queued pages', async t => {
  const { store } = await fixture(t, ['a', 'b', 'c']);
  await store.update(document => { document.pipeline.pages[0].status = 'GENERATING'; document.pipeline.pages[1].status = 'IMPORTING'; });
  const generated = [], normal = ports();
  const result = await runRewritePipeline({ store, pollMs: 1, ports: ports({ generate: async (request, ctx) => { generated.push(...request.pages.map(page => page.pageId)); return normal.generate(request, ctx); } }) });
  assert.deepEqual(generated, ['c']);
  assert.deepEqual(result.pages.map(page => page.status), ['UNKNOWN', 'UNKNOWN_IMPORT', 'COMPLETE']);
});

test('owner pause during external generation records uncertainty; explicit resumed runner skips that send', async t => {
  const { store } = await fixture(t, ['a', 'b']);
  const controller = new AbortController();
  const first = await runRewritePipeline({ store, signal: controller.signal, batchSize: 1, pollMs: 1,
    ports: ports({ generate: async () => { controller.abort(); await delay(10); throw new Error('No response known'); } }) });
  assert.equal(first.status, 'PAUSED');
  assert.deepEqual(first.pages.map(page => page.status), ['UNKNOWN', 'QUEUED']);
  const requests = [], normal = ports();
  const second = await runRewritePipeline({ store, pollMs: 1, ports: ports({ generate: async (request, ctx) => { requests.push(...request.pages.map(page => page.pageId)); return normal.generate(request, ctx); } }) });
  assert.deepEqual(requests, ['b']);
  assert.equal(second.pages[0].status, 'UNKNOWN');
});

test('missing whole-text factual/language attestation cannot be imported', async t => {
  const { store } = await fixture(t, ['a']);
  let imports = 0;
  const result = await runRewritePipeline({ store, pollMs: 1, ports: ports({ review: async () => ({ decision: 'accepted', reviewer: 'fixture', factsAndLanguageAccepted: true }), importPages: async () => { imports++; } }) });
  assert.equal(result.pages[0].status, 'HELD');
  assert.equal(imports, 0);
});

test('complete receipt needs current review, CP/TES exactness, canonical and both DOM widths', async t => {
  for (const omit of ['officialCurrentReview', 'cpTesExact', 'canonicalRevision', 'domWidths']) {
    const { store } = await fixture(t, ['a']);
    const normal = ports();
    const result = await runRewritePipeline({ store, pollMs: 1, ports: ports({ importPages: async records => { const response = await normal.importPages(records); delete response.outcomes[0].receipt[omit]; return response; } }) });
    assert.equal(result.pages[0].status, 'UNKNOWN_IMPORT');
  }
});

test('import failure is isolated and uncertain importer never replays on restart', async t => {
  const { store } = await fixture(t, ['a', 'b']);
  let called = 0;
  const result = await runRewritePipeline({ store, pollMs: 1, ports: ports({ importPages: async () => { called++; throw new Error('Native write outcome unknown'); } }) });
  assert.equal(result.pages.every(page => page.status === 'UNKNOWN_IMPORT'), true);
  const beforeRestart = called;
  const restarted = await runRewritePipeline({ store, pollMs: 1, ports: ports({ importPages: async () => { called++; } }) });
  assert.equal(restarted.status, 'IDLE_WITH_BLOCKERS');
  assert.equal(called, beforeRestart);
  assert.ok(called <= 2);
});

test('one explicitly failed import cannot mark complete or block an independent accepted page', async t => {
  const { store } = await fixture(t, ['a', 'b']);
  const normal = ports();
  const result = await runRewritePipeline({ store, pollMs: 1, ports: ports({ importPages: async records => {
    const response = await normal.importPages(records);
    response.outcomes = response.outcomes.map(outcome => outcome.pageId === 'a' ? { pageId: 'a', status: 'failed', reason: 'Page source changed before write' } : outcome);
    return response;
  } }) });
  assert.deepEqual(result.pages.map(page => page.status), ['HELD_IMPORT', 'COMPLETE']);
});

test('facts lane is independent and may enqueue a ready reviewed pack without native writes', async t => {
  const { store } = await fixture(t, [{ pageId: 'a', factsReady: false }, { pageId: 'b' }]);
  const bGenerated = deferred(), normal = ports(), requests = [];
  const result = await runRewritePipeline({ store, pollMs: 1, maxBatches: 3, ports: ports({
    generate: async (request, ctx) => { requests.push(request.pages.map(page => page.pageId)); if (request.pages.some(page => page.pageId === 'b')) bGenerated.resolve(); return normal.generate(request, ctx); },
    prepareFacts: async ({ store: actualStore }) => {
      await bGenerated.promise;
      await actualStore.update(document => { const page = document.pipeline.pages.find(item => item.pageId === 'a'); page.input.factsReady = true; page.input.preparedPackRef = 'fixture:explicit-reviewed-pack'; page.status = 'QUEUED'; });
    },
  }) });
  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(requests, [['b'], ['a']]);
});

test('bounded run stops at maxBatches and leaves remaining inputs queued', async t => {
  const { store } = await fixture(t, ['a', 'b', 'c', 'd']);
  const result = await runRewritePipeline({ store, maxBatches: 1, pollMs: 1, ports: ports() });
  assert.equal(result.status, 'IDLE_WITH_BLOCKERS');
  assert.equal(result.pages[3].status, 'QUEUED');
  assert.equal(result.batches.length, 1);
});

test('separate store instances serialize updates and preserve legacy requests/history', async t => {
  const legacy = { status: 'PAUSED_BY_OWNER', requests: [{ id: 'old' }], responses: ['original'], authorOperation: { doNotResend: true } };
  const { store, filename } = await fixture(t, [], { legacy });
  const another = new JsonPipelineStore(filename);
  await Promise.all(Array.from({ length: 20 }, (_, index) => (index % 2 ? store : another).update(document => { document.pipeline.count = (document.pipeline.count ?? 0) + 1; })));
  const document = JSON.parse(await readFile(filename, 'utf8'));
  assert.equal(document.pipeline.count, 20);
  const { pipeline, ...rest } = document;
  assert.deepEqual(rest, legacy);
  await assert.rejects(store.update(value => { value.requests.push({ id: 'fake' }); }), /legacy/);
  await assert.rejects(store.update(value => { value.pipeline.publication = 'active'; }), /Publication hold/);
  await assert.rejects(store.update(async value => { value.pipeline.count++; }), /synchronous/);
  assert.equal((await store.read()).pipeline.count, 20);
});

test('busy/abandoned state lock fails closed and an active second runner is rejected', async t => {
  const { store, filename } = await fixture(t, ['a']);
  await writeFile(`${filename}.pipeline.lock`, JSON.stringify({ token: 'another-owner' }));
  await assert.rejects(new JsonPipelineStore(filename, { lockTimeoutMs: 20 }).update(() => {}), /lock busy/);
  assert.equal(JSON.parse(await readFile(`${filename}.pipeline.lock`, 'utf8')).token, 'another-owner');
  await rm(`${filename}.pipeline.lock`);
  const started = deferred(), release = deferred();
  const first = runRewritePipeline({ store, pollMs: 1, ports: ports({ generate: async request => { started.resolve(); await release.promise; return ports().generate(request); } }) });
  await started.promise;
  await assert.rejects(runRewritePipeline({ store, ports: ports() }), /Another pipeline runner/);
  release.resolve(); await first;
});

test('publication cannot be activated and inputs/limits are explicit', async () => {
  assert.throws(() => createPipelineState({ siteId: 'promedical', pages: [], publication: 'active' }), /paused/);
  assert.throws(() => createPipelineState({ siteId: 'promedical', pages: [{ pageId: 'a' }, { pageId: 'a' }] }), /Unique/);
  await assert.rejects(runRewritePipeline({ batchSize: 4, ports: ports() }), /limit is three/);
  for (const importCoalesceMs of [0, -1, 1.5, NaN])
    await assert.rejects(runRewritePipeline({ importCoalesceMs, ports: ports() }), /importCoalesceMs must be a positive integer/);
  await assert.rejects(runRewritePipeline({ importCoalesceMs: 1001, ports: ports() }), /must not exceed 1000ms/);
});

test('CLI forwards importer coalescing config through the same bounded validation', async t => {
  const { filename, directory } = await fixture(t, []);
  const source = 'export function createPorts(){return {generate(){},review(){},importPages(){}};}';
  const modulePath = path.join(directory, 'fixture-ports.mjs'), configPath = path.join(directory, 'config.json');
  await writeFile(modulePath, source);
  for (const importCoalesceMs of [0, 1001]) {
    await writeFile(configPath, JSON.stringify({ portsModule: { path: modulePath, sha256: createHash('sha256').update(source).digest('hex') }, importCoalesceMs }));
    const child = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/rewrite-pipeline.mjs', import.meta.url)),
      'run', '--state', filename, '--config', configPath], { encoding: 'utf8', timeout: 10000 });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /importCoalesceMs must/);
  }
});
