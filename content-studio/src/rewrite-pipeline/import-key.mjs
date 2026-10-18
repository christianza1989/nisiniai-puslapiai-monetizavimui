import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { open, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const legacyKeyFailure = 'The expression evaluated to a falsy value:\n\n  assert(/WrittenDraft$/.test(p.key))\n';
export function validateImportKey(key) {
  assert(typeof key === 'string' && key.length <= 200 && /^\S+WrittenDraft$/u.test(key), 'INVALID_IMPORT_KEY: key must end in WrittenDraft');
  return key;
}

/** Only an explicit append-only metadata repair may override the immutable input. */
export function effectiveImportKey(record) {
  const repairs = (record.imports ?? []).filter(item => item.status === 'metadata_repaired');
  assert(repairs.length <= 1, 'Chained import metadata repair is forbidden');
  const repair = repairs[0];
  if (!repair) return validateImportKey(record.input.key);
  assert(!/WrittenDraft$/u.test(record.input.key), 'A valid original key cannot be overridden');
  assert(repair.field === 'key' && repair.before === record.input.key && repair.after === repair.before + 'WrittenDraft', 'Import key repair differs from original metadata');
  assert(repair.actor?.trim() && repair.reason?.trim() && Number.isFinite(Date.parse(repair.at)), 'Audited import metadata repair required');
  assert(repair.phase === 'before_author' || repair.phase === 'preflight_failed' && repair.candidateId === record.candidates.at(-1)?.candidateId, 'Import key repair belongs to another candidate');
  return validateImportKey(repair.after);
}

function repairable(document, pageId, candidateId) {
  const record = document.pipeline.pages.find(p => p.pageId === pageId);
  assert(record, 'Existing pipeline page required');
  assert(!/WrittenDraft$/u.test(record.input.key) && typeof record.input.key === 'string' && /^\S+$/u.test(record.input.key), 'Only an invalid suffix may be repaired');
  assert(!(record.imports ?? []).some(i => i.status === 'metadata_repaired'), 'Import metadata already repaired');
  if (record.status === 'QUEUED') {
    for (const field of ['attempts', 'candidates', 'generationResults', 'reviews', 'imports']) assert.equal(record[field]?.length ?? 0, 0, 'Queued repair requires zero author/import history');
    assert(!document.pipeline.batches.some(b => b.pageIds.includes(pageId)), 'An author batch already exists');
    assert(!(document.requests ?? []).some(q => q.kind === 'GEMINI_GENERATE' && q.payload?.pages?.some(p => p.pageId === pageId)), 'An author request already exists');
    assert(candidateId == null, 'Unattempted page has no candidate');
    return { record, phase: 'before_author' };
  }
  assert.equal(record.status, 'HELD_IMPORT', 'Only QUEUED or preflight HELD_IMPORT may be repaired');
  const candidate = record.candidates.at(-1), review = record.reviews.at(-1);
  assert(candidateId && candidate?.candidateId === candidateId && review?.candidateId === candidateId && review.decision === 'accepted' && review.allH1DescriptionBodyReasonsPersonallyRead === true && review.factsAndLanguageAccepted === true, 'Current accepted whole-text review required');
  assert(record.imports.length > 0 && record.imports.every(i => i.candidateId === candidateId && i.status === 'failed' && (i.error === legacyKeyFailure || i.code === 'INVALID_IMPORT_KEY' && i.nativeMutationAttempted === false)), 'Only key preflight failure may be requeued');
  return { record, phase: 'preflight_failed' };
}

/** Explicit operator action; never sends, edits native data or creates author attempts. */
export async function repairImportKey(store, { pageId, candidateId, actor, reason }, { model, config }) {
  assert(typeof actor === 'string' && actor.trim() && actor.length <= 120 && typeof reason === 'string' && reason.trim() && reason.length <= 2000, 'Actual repair actor and reason required');
  assert(config.publication === 'paused_by_owner' && config.checkpoints?.length === 2, 'Paused private workflow and both checkpoints required');
  const lock = await open(config.sharedLockPath, 'wx'), token = randomUUID();
  try {
    await lock.writeFile(JSON.stringify({ token, pid: process.pid, kind: 'IMPORT_KEY_REPAIR' }));
    const document = await store.read(), { record, phase } = repairable(document, pageId, candidateId);
    assert(!document.pipeline.pages.some(p => p.status === 'IMPORTING'), 'Wait for the serial importer to drain');
    const beforeRecord = JSON.stringify(record), after = validateImportKey(record.input.key + 'WrittenDraft');
    assert(!document.pipeline.pages.some(p => p.pageId !== pageId && (p.input.key === after || p.imports?.some(i => i.status === 'metadata_repaired' && i.after === after))), 'Repaired key collides with another page');
    const pins = [], bytes = async file => {
      try { const value = await readFile(file); pins.push({ path: file, sha256: hash(value) }); return value; }
      catch (error) { if (error.code !== 'ENOENT') throw error; pins.push({ path: file, absent: true }); return null; }
    };
    const native = await bytes(config.nativePath); assert(native, 'Current native file required');
    const site = JSON.parse(native), prior = site.pages.find(p => p.id === pageId);
    assert(prior && model.revisionHash(prior) === record.input.originalCanonical, 'Native page changed or was already adopted');
    assert.deepEqual(await model.getSite(config.siteId), site, 'Native preimage changed');
    for (const file of config.checkpoints) {
      const checkpoint = await bytes(file); assert(checkpoint, 'Current checkpoint required');
      const work = JSON.parse(checkpoint).work; assert(work && typeof work === 'object');
      assert(!Object.hasOwn(work, record.input.key) && !Object.hasOwn(work, after) && !Object.values(work).some(v => v?.pageId === pageId), 'Checkpoint already contains this page/key');
    }
    const result = await bytes(path.join(config.outputDir, 'RESULT.json'));
    if (result) {
      const epochs = JSON.parse(result).epochs; assert(Array.isArray(epochs));
      assert(epochs.every(e => ['COMPLETE', 'PARTIAL'].includes(e.status)), 'An unfinished native epoch requires inspection');
      assert(!epochs.some(e => e.pages?.some(p => p.pageId === pageId)), 'Native intake was already attempted');
    }
    if (phase === 'preflight_failed') {
      const { prepareReviewedPage, verifyPin } = await import('./core-adapter.mjs');
      // Validate the accepted candidate with only a temporary metadata view.
      prepareReviewedPage({ ...record, input: { ...record.input, key: after } }, site, model);
      const candidate = record.candidates.at(-1);
      for (const pin of [candidate.captureRef, candidate.candidate.promptRef, candidate.candidate.modelProofRef, record.input.factsRef]) await verifyPin(pin);
    }
    for (const pin of pins) {
      if (pin.absent) await assert.rejects(readFile(pin.path), { code: 'ENOENT' });
      else assert.equal(hash(await readFile(pin.path)), pin.sha256, 'Repair preimage changed');
    }
    const receipt = { status: 'metadata_repaired', field: 'key', before: record.input.key, after, phase, candidateId: candidateId ?? null, actor, reason, at: new Date().toISOString(), preflightPins: pins };
    await store.update(current => {
      const checked = repairable(current, pageId, candidateId).record;
      assert.equal(JSON.stringify(checked), beforeRecord, 'Page changed during metadata repair');
      assert(!current.pipeline.pages.some(p => p.status === 'IMPORTING'), 'Serial importer started during repair');
      checked.imports.push(receipt); checked.status = phase === 'before_author' ? 'QUEUED' : 'ACCEPTED';
    });
    return receipt;
  } finally {
    await lock.close();
    const owner = JSON.parse(await readFile(config.sharedLockPath, 'utf8'));
    assert.equal(owner.token, token, 'Import repair lock ownership changed'); await unlink(config.sharedLockPath);
  }
}
