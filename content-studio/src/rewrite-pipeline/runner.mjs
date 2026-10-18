import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const clone = value => structuredClone(value);
const now = () => new Date().toISOString();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const message = error => error?.message ?? String(error);
const populated = value => typeof value === 'string' && value.trim().length > 0;
const retainedPin = value => value && populated(value.path) && /^[a-f0-9]{64}$/.test(value.sha256 ?? '');
const activeRuns = new Set();

export function createPipelineState({ siteId, pages, publication = 'paused_by_owner' }) {
  if (!populated(siteId) || !Array.isArray(pages) || publication !== 'paused_by_owner') throw new Error('A site, pages and paused publication are required');
  const ids = pages.map(page => page.pageId);
  if (ids.some(id => !populated(id)) || new Set(ids).size !== ids.length) throw new Error('Unique page IDs are required');
  return { version: 1, siteId, publication, status: 'IDLE', batches: [], pages: pages.map(input => ({
    pageId: input.pageId, input: clone(input), status: input.factsReady === false ? 'FACTS_WAIT' : 'QUEUED',
    attempts: [], generationResults: [], candidates: [], reviews: [], imports: [],
  })) };
}

// Normal delivery and explicit retained reconciliation attach the same parsed
// result to existing page attempts. Neither path creates an author attempt here.
export function attachGenerationResult(p, batch, result, { maxAttemptsPerPage = 2, reconciliation } = {}) {
  const responsePages=result?.pages??[],rejections=result?.rejections??[];
  const ids=Array.isArray(responsePages)&&Array.isArray(rejections)?[...responsePages,...rejections].map(page=>page?.pageId):[];
  const valid=retainedPin(result?.captureRef)&&retainedPin(result?.rawRef??result?.captureRef)&&
    Array.isArray(responsePages)&&Array.isArray(rejections)&&new Set(ids).size===ids.length&&ids.every(id=>batch.pageIds.includes(id))&&
    rejections.every(page=>page.status==='rejected'&&populated(page.reason)&&page.reason.length<=4000)&&
    !/unknown|uncertain|not.?sent|failed/i.test(String(result.send?.status))&&result.send?.uncertain!==true;
  if(reconciliation&&!valid)throw new Error('Reconciliation requires a verified retained result');
  const saved=p.batches.find(item=>item.batchId===batch.batchId);
  if(reconciliation)saved.lateRetained=clone(reconciliation);
  else{
    saved.status=valid?'OBSERVED':'UNKNOWN';saved.finishedAt=now();
    if(result?.captureRef)saved.captureRef=clone(result.captureRef);
    if(result?.send)saved.send=clone(result.send);
  }
  for(const page of p.pages.filter(item=>batch.pageIds.includes(item.pageId))){
    const matches=Array.isArray(responsePages)?responsePages.filter(item=>item?.pageId===page.pageId):[];
    const candidate=matches.length===1?matches[0]:undefined,rejection=valid&&rejections.find(item=>item.pageId===page.pageId),attempt=page.attempts.at(-1);
    page.generationResults.push({attemptId:attempt.attemptId,at:now(),status:valid&&candidate?'OBSERVED':rejection?'REJECTED':'UNKNOWN',
      ...(result?.captureRef?{captureRef:clone(result.captureRef),rawRef:clone(result.rawRef??result.captureRef)}:{}),
      ...(rejection?{rejection:clone(rejection)}:{}),...(reconciliation?{reconciliation:clone(reconciliation)}:{})});
    if(candidate){
      page.candidates.push({candidateId:randomUUID(),attemptId:attempt.attemptId,batchId:batch.batchId,
        captureRef:result.captureRef?clone(result.captureRef):null,candidate:clone(candidate),...(reconciliation?{reconciliation:clone(reconciliation)}:{})});
      page.status=valid?'GENERATED':'UNKNOWN';
    }else page.status=rejection?!reconciliation&&page.attempts.length<maxAttemptsPerPage?'RETRY':'HELD':'UNKNOWN';
  }
  return valid;
}

/** A short exclusive file lock protects each read/modify/rename. No stale-lock deletion:
 * ambiguous abandoned locks require inspection. Only document.pipeline may be mutated;
 * CURRENT_LEAN_BATCH legacy fields and other requests/responses remain untouched. */
export class JsonPipelineStore {
  constructor(stateFile, { lockTimeoutMs = 30000 } = {}) {
    this.stateFile = path.resolve(stateFile);
    this.lockFile = `${this.stateFile}.pipeline.lock`;
    this.lockTimeoutMs = lockTimeoutMs;
  }
  async read() { return JSON.parse(await readFile(this.stateFile, 'utf8')); }
  async locked(work) {
    await mkdir(path.dirname(this.stateFile), { recursive: true });
    const started = Date.now(), token = randomUUID();
    let handle;
    while (!handle) {
      try { handle = await open(this.lockFile, 'wx'); }
      catch (error) {
        // Windows may report EPERM/EACCES while another short lock is delete-pending.
        if (!['EEXIST', 'EPERM', 'EACCES'].includes(error.code)) throw error;
        if (Date.now() - started >= this.lockTimeoutMs) throw new Error('Pipeline state lock busy; inspect owner before recovery');
        await sleep(Math.min(100,10+Math.floor((Date.now()-started)/100))+Math.floor(Math.random()*10));
      }
    }
    try { await handle.writeFile(JSON.stringify({ token, pid: process.pid })); return await work(); }
    finally {
      await handle.close();
      const owner = JSON.parse(await readFile(this.lockFile, 'utf8'));
      if (owner.token !== token) throw new Error('Pipeline lock ownership changed');
      await unlink(this.lockFile);
    }
  }
  async write(document) {
    const temporary = `${this.stateFile}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { flag: 'wx', flush: true });
      const deadline = Date.now() + 5000;
      while (true) {
        try { await rename(temporary, this.stateFile); break; }
        catch (error) {
          if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || Date.now() >= deadline) throw error;
          // Existing readers may temporarily deny replace on Windows. Keep the old
          // complete file; never unlink it or fall back to non-atomic overwrite.
          await sleep(10);
        }
      }
    } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }
  async init(state) {
    return this.locked(async () => {
      let document;
      try { document = await this.read(); } catch (error) { if (error.code !== 'ENOENT') throw error; document = {}; }
      if (!document.pipeline) { document.pipeline = clone(state); await this.write(document); }
      else if (document.pipeline.siteId !== state.siteId) throw new Error('Existing pipeline belongs to another site');
      return clone(document);
    });
  }
  async update(mutator) {
    return this.locked(async () => {
      const document = await this.read(), before = clone(document);
      const result = mutator(document);
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        throw new Error('Pipeline store mutator must be synchronous');
      }
      const legacy = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'pipeline'));
      if (JSON.stringify(legacy(before)) !== JSON.stringify(legacy(document))) throw new Error('Pipeline update cannot modify legacy document fields');
      if (document.pipeline?.publication !== 'paused_by_owner') throw new Error('Publication hold must remain active');
      if (before.pipeline && (before.pipeline.siteId !== document.pipeline.siteId || before.pipeline.version !== document.pipeline.version)) throw new Error('Pipeline site and version are immutable');
      for (const previous of before.pipeline?.pages ?? []) {
        const current = document.pipeline?.pages?.find(page => page.pageId === previous.pageId);
        for (const field of ['attempts', 'candidates', 'generationResults', 'reviews', 'imports']) {
          const history = previous[field] ?? [];
          if (history.length && (!current || JSON.stringify(current[field]?.slice(0, history.length)) !== JSON.stringify(history))) {
            throw new Error(`Immutable pipeline ${field} history changed`);
          }
        }
        if (previous.attempts?.length && JSON.stringify(previous.input) !== JSON.stringify(current?.input)) throw new Error('Attempted page input is immutable');
      }
      if (JSON.stringify(document) !== JSON.stringify(before)) await this.write(document);
      return clone(document);
    });
  }
}

/** Candidate records contain captureRef and candidate exactly as returned by generate.
 * captureRef (and optional rawRef) is a retained {path,sha256} pin. Explicit retained
 * rejections [{pageId,status:'rejected',reason}] retry that page; omissions stay UNKNOWN.
 * Read current input via record.input and latest original via record.candidates.at(-1).
 * Reviews/final edits are separate records; originals are never replaced. Ports perform real
 * browser/reviewer/import work. Only importPages may mutate native data, and calls are serial.
 * This runner creates no automation and never publishes. Existing in-flight send/import work
 * is held for inspection on restart instead of replayed. */
export async function runRewritePipeline({ store, ports, batchSize = 3, maxBatches = 2,
  maxAttemptsPerPage = 2, signal, pollMs = 1000, importCoalesceMs = 3000 }) {
  for (const [name, value] of Object.entries({ batchSize, maxBatches, maxAttemptsPerPage, pollMs, importCoalesceMs })) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  }
  if (importCoalesceMs > 5000) throw new Error('importCoalesceMs must not exceed 5000ms');
  if (batchSize > 3) throw new Error('Importer and generation batch limit is three');
  for (const name of ['generate', 'review', 'importPages']) if (typeof ports?.[name] !== 'function') throw new Error(`Missing real pipeline port: ${name}`);
  const internalStop = new AbortController();
  signal = signal ? AbortSignal.any([signal, internalStop.signal]) : internalStop.signal;
  const runId = randomUUID();
  await store.update(document => {
    const p = document.pipeline;
    if (!p || p.publication !== 'paused_by_owner') throw new Error('Publication hold must remain active');
    const prior = p.runner;
    let priorAlive = false;
    if (prior?.status === 'RUNNING') {
      try { process.kill(prior.pid, 0); priorAlive = true; } catch (error) { if (error.code !== 'ESRCH') priorAlive = true; }
    }
    if (priorAlive || activeRuns.has(prior?.runId)) throw new Error('Another pipeline runner may still own this queue');
    for (const page of p.pages) {
      if (page.status === 'GENERATING') page.status = 'UNKNOWN';
      if (page.status === 'IMPORTING') page.status = 'UNKNOWN_IMPORT';
      if (page.status === 'REVIEWING') page.status = 'GENERATED';
    }
    p.runner = { runId, pid: process.pid, status: 'RUNNING', startedAt: now() };
    p.status = 'RUNNING';
  });
  activeRuns.add(runId);
  let generationDone = false, reviewDone = false, factsDone = typeof ports.prepareFacts !== 'function';
  let issued = 0;
  const ctx = extra => ({ store, signal, runId, ...extra });
  const mutate = work => store.update(document => {
    if (document.pipeline.runner.runId !== runId) throw new Error('Pipeline run ownership changed');
    work(document.pipeline);
  });
  const read = async () => (await store.read()).pipeline;
  const cancelled = () => signal?.aborted === true;
  const cancellationError = () => Object.assign(new Error(message(signal?.reason??'Pipeline cancelled')+'; inspect external outcome'),{name:'AbortError',cause:signal?.reason});
  async function invoke(callback) {
    if (cancelled()) throw cancellationError();
    if (!signal) return callback();
    let listener;
    const abort = new Promise((_, reject) => {
      listener = () => reject(cancellationError());
      signal.addEventListener('abort', listener, { once: true });
    });
    try { return await Promise.race([Promise.resolve().then(callback), abort]); }
    finally { signal.removeEventListener('abort', listener); }
  }
  async function generateLane() {
    try {
      while (!cancelled() && issued < maxBatches) {
        let batch;
        await mutate(p => {
          const pages = p.pages.filter(page => ['QUEUED', 'RETRY'].includes(page.status) && page.attempts.length < maxAttemptsPerPage).slice(0, batchSize);
          if (!pages.length) return;
          batch = { batchId: randomUUID(), pageIds: pages.map(page => page.pageId), status: 'GENERATING', startedAt: now() };
          p.batches.push(batch);
          for (const page of pages) {
            page.status = 'GENERATING';
            page.attempts.push({ attemptId: randomUUID(), batchId: batch.batchId, startedAt: now() });
          }
        });
        if (!batch) {
          const p = await read();
          if (factsDone && !p.pages.some(page => ['GENERATED', 'REVIEWING'].includes(page.status))) break;
          await sleep(pollMs); continue;
        }
        issued++;
        const before = await read(), records = before.pages.filter(page => batch.pageIds.includes(page.pageId));
        try {
          const result = await invoke(() => ports.generate({ batchId: batch.batchId, pages: records.map(page => clone(page.input)) }, ctx({ batchId: batch.batchId })));
          await mutate(p => attachGenerationResult(p,batch,result,{maxAttemptsPerPage}));
        } catch (error) {
          let notSent=error?.code==='HOST_NOT_SENT';
          if(cancelled()&&typeof ports.cancelUnclaimedGeneration==='function'){
            try{notSent=await ports.cancelUnclaimedGeneration(batch.batchId,message(error),ctx({batchId:batch.batchId}));}catch{/* Unproven delivery remains UNKNOWN. */}
          }
          await mutate(p => {
            const saved = p.batches.find(item => item.batchId === batch.batchId);
            saved.status = notSent?'NOT_SENT':'UNKNOWN'; saved.error = message(error); saved.finishedAt = now();
            for (const page of p.pages.filter(item => batch.pageIds.includes(item.pageId))) {
              page.status = notSent?'HELD':'UNKNOWN'; page.generationResults.push({ attemptId: page.attempts.at(-1).attemptId, status: saved.status, at: now(), error: message(error) });
            }
          });
        }
      }
    } finally { generationDone = true; }
  }
  async function reviewLane() {
    try {
      while (!cancelled()) {
        let record;
        await mutate(p => {
          const page = p.pages.find(item => item.status === 'GENERATED');
          if (page) { page.status = 'REVIEWING'; record = clone(page); }
        });
        if (!record) { if (generationDone && factsDone) break; await sleep(pollMs); continue; }
        try {
          const review = await invoke(() => ports.review(record, ctx({ batchId: record.candidates.at(-1).batchId })));
          await mutate(p => {
            const page = p.pages.find(item => item.pageId === record.pageId);
            page.reviews.push({ ...clone(review), candidateId: record.candidates.at(-1).candidateId, at: now() });
            if (review?.decision === 'accepted' && populated(review.reviewer) && review.allH1DescriptionBodyReasonsPersonallyRead === true && review.factsAndLanguageAccepted === true) page.status = 'ACCEPTED';
            else if (review?.decision === 'rejected') page.status = page.attempts.length < maxAttemptsPerPage ? 'RETRY' : 'HELD';
            else { page.status = 'HELD'; page.blocker = 'Missing truthful complete factual/language review'; }
          });
        } catch (error) {
          await mutate(p => {
            const page = p.pages.find(item => item.pageId === record.pageId);
            page.status = cancelled() ? 'GENERATED' : 'HELD';
            page.reviews.push({ candidateId: record.candidates.at(-1).candidateId, decision: 'error', at: now(), error: message(error) });
          });
        }
      }
    } finally { reviewDone = true; }
  }
  async function importLane() {
    while (!cancelled()) {
      let available;
      await mutate(p => { available = p.pages.filter(page => page.status === 'ACCEPTED').length; });
      if (!available) { if (reviewDone && generationDone && factsDone) break; await sleep(pollMs); continue; }
      // Briefly collect independently accepted pages to amortize one serial import
      // epoch. This is never a barrier waiting for rejected/held siblings or a batch.
      if (available < batchSize && !(reviewDone && generationDone && factsDone)) await sleep(importCoalesceMs);
      if (cancelled()) break;
      let records;
      await mutate(p => {
        if (cancelled()) return;
        const pages = p.pages.filter(page => page.status === 'ACCEPTED').slice(0, batchSize);
        if (pages.length) { pages.forEach(page => { page.status = 'IMPORTING'; }); records = clone(pages); }
      });
      if (!records) { if (reviewDone && generationDone && factsDone) break; await sleep(pollMs); continue; }
      try {
        const result = await invoke(() => ports.importPages(records, ctx()));
        await mutate(p => {
          for (const record of records) {
            const page = p.pages.find(item => item.pageId === record.pageId);
            const matches = result?.outcomes?.filter(item => item.pageId === record.pageId) ?? [];
            const outcome = matches.length === 1 ? matches[0] : { status: 'unknown', error: 'Missing or duplicate per-page import outcome' };
            page.imports.push({ ...clone(outcome), at: now(), candidateId: record.candidates.at(-1).candidateId });
            const receipt = outcome.receipt;
            const complete = outcome.status === 'complete' && receipt?.officialCurrentReview === true && receipt.cpTesExact === true &&
              populated(receipt.canonicalRevision) && [1440, 390].every(width => receipt.domWidths?.includes(width));
            page.status = complete ? 'COMPLETE' : outcome.status === 'failed' ? 'HELD_IMPORT' : 'UNKNOWN_IMPORT';
          }
        });
      } catch (error) {
        await mutate(p => {
          for (const record of records) {
            const page = p.pages.find(item => item.pageId === record.pageId);
            page.status = 'UNKNOWN_IMPORT'; page.imports.push({ status: 'unknown', error: message(error), at: now(), candidateId: record.candidates.at(-1).candidateId });
          }
        });
      }
    }
  }
  async function factsLane() {
    if (factsDone) return;
    try { await invoke(() => ports.prepareFacts(ctx())); }
    catch (error) { await mutate(p => { p.factsError = { at: now(), error: message(error) }; }); }
    finally { factsDone = true; }
  }
  const jobs = [generateLane(), reviewLane(), importLane(), factsLane()];
  try {
    await Promise.all(jobs);
    await mutate(p => {
      for (const page of p.pages) if (['QUEUED', 'RETRY'].includes(page.status) && page.attempts.length >= maxAttemptsPerPage) page.status = 'HELD';
      p.status = cancelled() ? 'PAUSED' : p.pages.every(page => page.status === 'COMPLETE') ? 'COMPLETE' : 'IDLE_WITH_BLOCKERS';
      p.runner.status = p.status; p.runner.finishedAt = now();
    });
    return await read();
  } catch (error) {
    internalStop.abort();
    await Promise.allSettled(jobs);
    await mutate(p => { p.status = 'NEEDS_INSPECTION'; p.runner.status = 'NEEDS_INSPECTION'; p.runner.error = message(error); }).catch(() => {});
    throw error;
  } finally { activeRuns.delete(runId); }
}
