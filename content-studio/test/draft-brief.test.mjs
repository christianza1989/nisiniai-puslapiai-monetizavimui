import test from 'node:test';
import assert from 'node:assert/strict';
import { draftBrief } from '../src/draft-brief.mjs';
test('full researched brief is lossless, isolated and bound to its exact destination', () => {
  const page = { slug: 'guide/occasion' };
  const input = { slug: page.slug, question: 'Which choice fits?', contribution: 'A worked choice', outline: ['Compare'], aliases: Array.from({length: 60}, (_,i) => 'long-tail-question-' + i), mediaBrief: 'Original scene', notes: 'ž'.repeat(4000) };
  const saved = draftBrief(input, page);
  assert.deepEqual(saved, input);
  input.aliases.push('later mutation'); assert.equal(saved.aliases.length, 60);
  assert.throws(() => draftBrief(saved, {slug:'other'}), /nesutampa/);
  assert.throws(() => draftBrief({...saved, contribution:''}, page), /contribution/);
  assert.throws(() => draftBrief({...saved, notes:'ž'.repeat(70000)}, page), /128 KiB/);
  assert.equal(draftBrief(null, page), null);
});
