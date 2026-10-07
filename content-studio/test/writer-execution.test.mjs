import test from 'node:test';
import assert from 'node:assert/strict';
import { writerSelection, writerArguments, writerReceipt } from '../src/writer-execution.mjs';
test('explicit Luna/xhigh reaches argv and observed header is distinguished from a request', () => {
  const selection = writerSelection({STUDIO_CODEX_MODEL:'gpt-6-luna',STUDIO_CODEX_REASONING_EFFORT:'xhigh'});
  assert.deepEqual(writerArguments(selection), ['--model','gpt-6-luna','-c','model_reasoning_effort="xhigh"']);
  assert.equal(writerReceipt(selection,{stderr:'model: gpt-6-luna\nreasoning effort: xhigh\n'}).status,'cli-header-observed');
  assert.equal(writerReceipt(selection,{}).status,'arguments-recorded-runtime-unverified');
  assert.throws(()=>writerReceipt(selection,{stderr:'model: gpt-6-sol\n'}),/different model/);
  assert.throws(()=>writerReceipt(selection,{stderr:'model: gpt-6-luna\nreasoning effort: low\n'}),/different reasoning/);
});
test('unknown default is literal; invalid or incomplete configuration fails before spawn', () => {
  assert.equal(writerSelection({}).selection,'cli-default-unverified');
  assert.throws(()=>writerSelection({STUDIO_CODEX_REASONING_EFFORT:'xhigh'}),/explicit/);
  assert.throws(()=>writerSelection({STUDIO_CODEX_MODEL:'gpt-6-luna',STUDIO_CODEX_REASONING_EFFORT:'very high'}),/Invalid/);
});
