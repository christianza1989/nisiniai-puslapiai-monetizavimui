import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { open, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { selectCapturedPages } from './capture.mjs';
import { normalizeGeminiPrompt } from './gemini-ui.mjs';

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
  const rejected = repair.modelRejection;
  const knownRejected = repair.phase === 'model_rejected' && rejected?.status === 'COMPLETED_RESPONSE_MODEL_UNACCEPTED' && rejected.uncertain === false &&
    repair.candidateId == null && rejected.actor === repair.actor && [rejected.requestId, rejected.hostAttemptId, rejected.responseId].every(s => typeof s === 'string' && s.trim()) && Number.isInteger(rejected.responseIndex) &&
    rejected.responseIndex >= 0 && rejected.batchId === record.attempts[0]?.batchId && rejected.attemptId === record.attempts[0]?.attemptId &&
    rejected.originalResultSha256 === hash(JSON.stringify(record.generationResults[0])) && record.generationResults[0]?.status === 'UNKNOWN' &&
    record.generationResults[0]?.attemptId === rejected.attemptId && [rejected.captureRef, rejected.promptRef].every(p => p?.path && /^[a-f0-9]{64}$/.test(p.sha256));
  assert(repair.phase === 'before_author' || repair.phase === 'preflight_failed' && repair.candidateId === record.candidates.at(-1)?.candidateId || knownRejected, 'Import key repair belongs to another candidate or rejected response');
  return validateImportKey(repair.after);
}

function rejectedModelRequest(document, record) {
  for (const field of ['candidates', 'reviews', 'imports']) assert.equal(record[field]?.length ?? 0, 0, 'Rejected-model repair requires no candidate/review/import');
  assert.equal(record.attempts.length, 1, 'Exactly one historical author attempt required');
  assert.equal(record.generationResults.length, 1, 'Exactly one preserved UNKNOWN result required');
  const attempt = record.attempts[0], result = record.generationResults[0];
  assert(result.status === 'UNKNOWN' && result.attemptId === attempt.attemptId, 'Original UNKNOWN history required');
  const batches = document.pipeline.batches.filter(b => b.pageIds.includes(record.pageId));
  assert(batches.length === 1 && batches[0].batchId === attempt.batchId && batches[0].status === 'UNKNOWN' && !batches[0].lateRetained, 'Only the original UNKNOWN batch may be repaired');
  const requests = (document.requests ?? []).filter(q => q.kind === 'GEMINI_GENERATE' &&
    (q.payload?.batchId === attempt.batchId || q.payload?.pages?.some(p => p.pageId === record.pageId)));
  assert.equal(requests.length, 1, 'Exactly one original Gemini request required');
  const request = requests[0], answer = request.response, send = answer?.send;
  assert(request.status === 'ANSWERED' && request.actor?.trim() && request.attemptId && Number.isFinite(Date.parse(request.claimedAt)), 'Actual claiming host and ANSWERED request required');
  assert.equal(hash(JSON.stringify(request.payload)), request.payloadSha256, 'Original request payload changed');
  assert.equal(request.payload.batchId, attempt.batchId);
  assert.deepEqual(request.payload.pages.map(p => p.pageId), batches[0].pageIds, 'Original batch pages changed');
  assert.deepEqual(request.payload.pages.find(p => p.pageId === record.pageId), record.input.capturePage, 'Own original capture spec changed');
  assert(send?.status === 'COMPLETED_RESPONSE_MODEL_UNACCEPTED' && send.uncertain === false && answer.accepted === false, 'Known completed rejected UI model required; no uncertain/ACK-only repair');
  assert.equal(send.attemptId, request.attemptId, 'Rejected response belongs to another host attempt');
  assert(Date.parse(request.claimedAt) <= Date.parse(send.at) && Date.parse(send.at) <= Date.parse(request.answeredAt), 'Claim/retained/answer chronology differs');
  const intent = request.sendIntent?.prepared?.intent ?? request.sendIntent;
  assert(intent?.kind === 'GEMINI_SEND_INTENT' && intent.batchId === attempt.batchId && intent.preparedId && intent.retryAllowed === false && /^\/u\/[2-6]$/.test(intent.accountPath), 'Original allowed-account send intent required');
  if (request.sendIntent.prepared) assert(request.sendIntent.receipt?.durable === true && request.sendIntent.receipt.state === 'ATTEMPTED' && request.sendIntent.receipt.attemptId === request.attemptId, 'Original durable host attempt required');
  return request;
}

function repairable(document, pageId, candidateId) {
  const record = document.pipeline.pages.find(p => p.pageId === pageId);
  assert(record, 'Existing pipeline page required');
  assert(!/WrittenDraft$/u.test(record.input.key) && typeof record.input.key === 'string' && /^\S+$/u.test(record.input.key), 'Only an invalid suffix may be repaired');
  assert(!(record.imports ?? []).some(i => i.status === 'metadata_repaired'), 'Import metadata already repaired');
  if (record.status === 'UNKNOWN') {
    assert(candidateId == null, 'Rejected model has no accepted candidate');
    return { record, phase: 'model_rejected', request: rejectedModelRequest(document, record) };
  }
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
    const document = await store.read(), { record, phase, request } = repairable(document, pageId, candidateId);
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
    let modelRejection;
    if (phase === 'model_rejected') {
      assert.equal(actor, request.actor, 'Original actual claiming host required for rejected-model metadata repair');
      const answer = request.response, artifact = async pin => {
        assert(pin?.path && /^[a-f0-9]{64}$/.test(pin.sha256), 'Exact retained/source artifact pin required');
        const value = await bytes(pin.path); assert(value && hash(value) === pin.sha256, 'Retained/source artifact changed'); return value;
      };
      const raw = JSON.parse(await artifact(answer.captureRef)), prompt = (await artifact(answer.promptRef)).toString('utf8');
      assert.equal(prompt, request.payload.prompt, 'Actual sent prompt differs');
      assert(raw.batchId === request.payload.batchId && raw.completionMarker === true && raw.stopCount === 0, 'Actual batch completion/Stop metadata required');
      assert(raw.queryCount === 1 && raw.responseCount === 1 && raw.responseIndex === 0, 'Only one retained query/response may explain this single historical attempt');
      assert.equal(raw.at, answer.send.at, 'Actual retained timestamp differs');
      assert.equal(new URL(raw.url).pathname.split('/').slice(0, 3).join('/'), (request.sendIntent.prepared?.intent ?? request.sendIntent).accountPath, 'Retained account differs from send intent');
      selectCapturedPages(raw, { responseIndex: raw.responseIndex, responseId: raw.responseId, pages: request.payload.pages });
      const query = raw.queries[raw.responseIndex];
      assert.equal(normalizeGeminiPrompt(typeof query === 'string' ? query : query?.text ?? ''), normalizeGeminiPrompt(prompt), 'Actual retained query differs');
      if (raw.queryText !== undefined) assert.equal(normalizeGeminiPrompt(raw.queryText), normalizeGeminiPrompt(prompt), 'Actual query projection differs');
      assert(normalizeGeminiPrompt(prompt).includes('BATCH_ID: ' + request.payload.batchId), 'Actual prompt lacks original batch identity');
      assert(Array.isArray(answer.observedProofs) && answer.observedProofs.length >= 6, 'Retained PRE/POST artifact pins required');
      for (const pin of [...answer.observedProofs, record.input.factsRef, ...Object.values(config.contracts ?? {}), ...(config.immutablePins ?? [])]) await artifact(pin);
      modelRejection = { status: answer.send.status, uncertain: false, requestId: request.id, actor: request.actor, hostAttemptId: request.attemptId,
        attemptId: record.attempts[0].attemptId, batchId: request.payload.batchId, responseIndex: raw.responseIndex, responseId: raw.responseId,
        captureRef: answer.captureRef, promptRef: answer.promptRef, originalResultSha256: hash(JSON.stringify(record.generationResults[0])) };
    }
    const unchanged = async () => { for (const pin of pins) {
      if (pin.absent) await assert.rejects(readFile(pin.path), { code: 'ENOENT' });
      else assert.equal(hash(await readFile(pin.path)), pin.sha256, 'Repair preimage changed');
    } };
    await unchanged();
    const receipt = { status: 'metadata_repaired', field: 'key', before: record.input.key, after, phase, candidateId: candidateId ?? null, actor, reason, at: new Date().toISOString(), preflightPins: pins, ...(modelRejection ? { modelRejection } : {}) };
    await store.update(current => {
      const rechecked = repairable(current, pageId, candidateId), checked = rechecked.record;
      assert.equal(JSON.stringify(checked), beforeRecord, 'Page changed during metadata repair');
      if (request) assert.deepEqual(rechecked.request, request, 'Original rejected request changed during metadata repair');
      assert(!current.pipeline.pages.some(p => p.status === 'IMPORTING'), 'Serial importer started during repair');
      checked.imports.push(receipt);
      if (phase !== 'model_rejected') checked.status = phase === 'before_author' ? 'QUEUED' : 'ACCEPTED';
    });
    if (phase === 'model_rejected') await unchanged();
    return receipt;
  } finally {
    await lock.close();
    const owner = JSON.parse(await readFile(config.sharedLockPath, 'utf8'));
    assert.equal(owner.token, token, 'Import repair lock ownership changed'); await unlink(config.sharedLockPath);
  }
}
