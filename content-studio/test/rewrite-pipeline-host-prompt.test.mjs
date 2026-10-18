import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRetainedAuthorRejections, buildGenerationPayload } from '../src/rewrite-pipeline/host-ports.mjs';
import { buildAuthorPrompt } from '../src/rewrite-pipeline/gemini-ui.mjs';

const captureRef = { path: 'fixture/actual-retained.json', sha256: 'a'.repeat(64) };
const rawRef = { path: 'fixture/whole-original.json', sha256: 'b'.repeat(64) };
const parser = (reason, extra = {}) => ({ attemptId: 'attempt-1', status: 'REJECTED', captureRef, rawRef, rejection: { pageId: 'piccolo', status: 'rejected', reason }, ...extra });
const review = (reason, extra = {}) => ({ candidateId: 'candidate-1', decision: 'rejected', reason, ...extra });
const record = () => ({ pageId: 'piccolo', status: 'RETRY', generationResults: [parser('Description is 161 UTF16; own description over 160 UTF16 or contains anchors')], candidates: [{ candidateId: 'candidate-1', attemptId: 'attempt-0', captureRef, candidate: { pageId: 'piccolo' } }], reviews: [review('Vieno komponento apkrovos nepriskirk visam vežimėliui.')] });

test('selects latest retained parser and latest own-candidate review rejection separately', () => {
  const own = record();
  own.generationResults.unshift(parser('OLD_PARSER'));
  own.generationResults.push(parser('UNKNOWN_NOT_A_CORRECTION', { status: 'UNKNOWN' }));
  own.reviews.unshift(review('OLD_REVIEW'));
  own.reviews.push(review('NO_CAPTURE', { candidateId: 'missing-candidate' }));
  const unrelated = { ...record(), pageId: 'unrelated', reviews: [review('UNRELATED_REVIEW')] };
  const result = collectRetainedAuthorRejections({ pageIds: ['piccolo'], records: [own, unrelated] });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(({ pageId, kind, status }) => ({ pageId, kind, status })), [{ pageId: 'piccolo', kind: 'parser', status: 'REJECTED' }, { pageId: 'piccolo', kind: 'review', status: 'rejected' }]);
  assert.equal(result[0].reason, own.generationResults[1].rejection.reason);
  assert.equal(result[1].reason, own.reviews[1].reason);
  assert.deepEqual(result[0].rawRef, rawRef);
  assert.doesNotMatch(JSON.stringify(result), /OLD_PARSER|OLD_REVIEW|UNKNOWN_NOT_A_CORRECTION|UNRELATED_REVIEW|NO_CAPTURE/);
});

test('UNKNOWN records, another page capture, absent pins and unobserved candidate outcomes never supply corrections', () => {
  const unknown = { ...record(), status: 'UNKNOWN' };
  assert.deepEqual(collectRetainedAuthorRejections({ pageIds: ['piccolo'], records: [unknown] }), []);
  for (const mutate of [
    r => { r.generationResults[0].captureRef = null; r.candidates[0].captureRef = null; },
    r => { r.generationResults[0].rejection.pageId = 'other'; r.candidates[0].candidate.pageId = 'other'; },
    r => { r.generationResults[0].status = 'UNKNOWN'; r.generationResults.push({ attemptId: 'attempt-0', status: 'UNKNOWN', captureRef }); },
  ]) {
    const r = record(); mutate(r);
    assert.deepEqual(collectRetainedAuthorRejections({ pageIds: ['piccolo'], records: [r] }), []);
  }
});

test('actual GEMINI_GENERATE payload prompt contains retained parser/review fixes and exact current facts', () => {
  const batch = { batchId: 'retry-piccolo-002', pages: [{ pageId: 'piccolo', capturePage: { pageId: 'piccolo', title: 'PICCOLO vežimėliai', bodyParagraphCount: 2, sourceReasonCount: 1 } }] };
  const authorTasks = { piccolo: { readerJob: 'Palyginti du dokumentuotus modelius.', paragraphCount: 2, facts: ['SKU01: 50 kg visam gaminiui.'], limits: ['Nesumuoti komponentų apkrovų.'], sources: [{ url: 'https://example.com/sku01', label: 'Produkto kortelė', documentRole: 'individual product facts' }], links: [{ url: 'https://example.com/sku01', label: 'Produkto kortelė' }] } };
  const examples = [{ accepted: true, reference: 'fixture/accepted-a', text: 'Priimtas A.' }, { accepted: true, reference: 'fixture/accepted-b', text: 'Priimtas B.' }];
  const commonMistakes = ['Kalbėk apie konkretų gaminį, ne redagavimo procesą.'];
  const pipeline = { pages: [record(), { ...record(), pageId: 'other', reviews: [review('DO_NOT_SEND_OTHER_PAGE')] }] };
  const before = JSON.stringify({ pipeline, authorTasks });
  const payload = buildGenerationPayload({ batch, pipeline, authorTasks, examples, commonMistakes });
  assert.equal(payload.batchId, batch.batchId);
  assert.deepEqual(payload.pages, batch.pages.map(p => p.capturePage));
  assert.ok(payload.prompt.includes('Description is 161 UTF16; own description over 160 UTF16 or contains anchors'));
  assert.ok(payload.prompt.includes('Vieno komponento apkrovos nepriskirk visam vežimėliui.'));
  assert.ok(payload.prompt.includes('SKU01: 50 kg visam gaminiui.'));
  assert.doesNotMatch(payload.prompt, /DO_NOT_SEND_OTHER_PAGE/);
  assert.equal(payload.prompt, buildAuthorPrompt({ batchId: batch.batchId, pages: [{ ...authorTasks.piccolo, id: 'piccolo', h1: 'PICCOLO vežimėliai' }], examples, commonMistakes, previousRejections: payload.previousRejections }), 'the exact returned bridge prompt includes the same selected correction records');
  assert.equal(JSON.stringify({ pipeline, authorTasks }), before, 'retained capture/review/original facts are immutable');
});
