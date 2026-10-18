import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { selectCapturedPages, MAX_SOURCE_REASONS } from '../src/rewrite-pipeline/capture.mjs';

const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function block(tag, text, anchors = []) {
  let html = escape(text), at = 0;
  for (const anchor of anchors) {
    const label = escape(anchor.label), found = html.indexOf(label, at);
    assert.ok(found >= 0);
    const replacement = `<a href="${escape(anchor.url)}"><span>${label}</span></a>`;
    html = html.slice(0, found) + replacement + html.slice(found + label.length);
    at = found + replacement.length;
  }
  return { tag, text, html: `<${tag.toLowerCase()}>${html}</${tag.toLowerCase()}>`, anchors };
}
function page(title, options = {}) {
  const a = { url: 'https://example.test/a?x=1&y=2', label: 'Modelis A' };
  const b = { url: 'https://example.test/b', label: 'Modelis B' };
  const contact = { url: 'https://promedical.lt/kontaktai', label: 'Susisiekite' };
  const sources = options.sources ?? [
    { ...b, label: 'B kortelė', reason: 'Šis dokumentas aprašo modelį B.' },
    { ...a, label: 'A kortelė', reason: 'Šis dokumentas aprašo modelį A.' },
  ];
  const footer = options.footer ?? `PRIVATE_SOURCE_JSON: ${JSON.stringify(sources)}`;
  const footerLinks = options.footerLinks ? [{ url: b.url, label: b.url }, { url: a.url, label: a.url }] : [];
  return [block('H1', title), block('P', options.description ?? 'Trumpas tikslus aprašymas.'),
    block('P', 'Modelis A aptariamas pirmoje pastraipoje. Susisiekite dėl užklausos.', [a, contact]),
    block('P', 'Modelis B aptariamas antroje pastraipoje.', [b]), block('P', footer, footerLinks)];
}
function flat(blocks) {
  return { at: '2026-10-16T16:31:04.398Z', url: 'https://gemini.google.com/u/4/app/test-conversation',
    queryCount: 1, responseCount: 1, responseIndex: 0, responseId: 'actual-response-0', queries: [{ text: 'Actual prompt' }], stopControls: [],
    text: blocks.map(b => b.text).join('\n\n'), html: blocks.map(b => b.html).join(''), blocks,
    orderedAnchors: blocks.flatMap(b => b.anchors) };
}
const specs = [
  { pageId: 'a', title: 'Pirmas puslapis', bodyParagraphCount: 2, sourceReasonCount: 2 },
  { pageId: 'b', title: 'Antras puslapis', bodyParagraphCount: 2, sourceReasonCount: 2 },
];
const selection = pages => ({ responseIndex: 0, responseId: 'actual-response-0', pages: pages ?? specs });
const good = () => flat([...page(specs[0].title), ...page(specs[1].title)]);

function multiSourcePage(title, count) {
  const sources = Array.from({ length: count }, (_, i) => ({ url: `https://example.test/source-${i + 1}`, label: `Šaltinis ${i + 1}`, reason: `Šis sintetinis dokumentas aprašo atskirą dalį ${i + 1}.` }));
  const split = Math.ceil(count / 2);
  const first = sources.slice(0, split).map(({ url, label }) => ({ url, label }));
  const second = sources.slice(split).map(({ url, label }) => ({ url, label }));
  const p1 = first.map(s => s.label).join(', ') + ' pateikia pirmos dalies duomenis.';
  const p2 = second.map(s => s.label).join(', ') + ' paaiškina likusią dalį.';
  return [block('H1', title), block('P', 'Sintetinis kelių dokumentų aprašymas.'), block('P', p1, first), block('P', p2, second), block('P', 'PRIVATE_SOURCE_JSON: ' + JSON.stringify([...sources].reverse()))];
}

test('explicit 4/4/3 mixed batch preserves every source, exact original words and independent footer order', () => {
  const pages = [4, 4, 3].map((count, i) => ({ pageId: `mixed-${i}`, title: `Mišrus puslapis ${i}`, bodyParagraphCount: 2, sourceReasonCount: count }));
  const raw = flat(pages.flatMap(p => multiSourcePage(p.title, p.sourceReasonCount))), before = JSON.stringify(raw);
  const result = selectCapturedPages(raw, selection(pages));
  assert.deepEqual(result.outcomes.map(o => o.status), ['captured', 'captured', 'captured']);
  assert.deepEqual(result.outcomes.map(o => o.candidate.original.sourceItems.length), [4, 4, 3]);
  for (const [i, outcome] of result.outcomes.entries()) {
    assert.deepEqual(outcome.candidate.original.sourceItems, JSON.parse(raw.blocks[i * 5 + 4].text.slice('PRIVATE_SOURCE_JSON:'.length)));
    assert.deepEqual(outcome.candidate.orderedBodyLinks, raw.blocks.slice(i * 5 + 2, i * 5 + 4).flatMap(b => b.anchors));
    const slice = outcome.candidate.slice;
    assert.equal(slice.sha256, createHash('sha256').update(raw.text.slice(slice.startUtf16, slice.endUtf16Exclusive)).digest('hex'));
  }
  assert.equal(JSON.stringify(raw), before);
});

test('explicit upper bound ten is supported while invalid per-page counts fail before parsing', () => {
  assert.equal(MAX_SOURCE_REASONS, 10);
  const spec = { pageId: 'ten', title: 'Dešimt šaltinių', bodyParagraphCount: 2, sourceReasonCount: 10 };
  const raw = flat(multiSourcePage(spec.title, 10));
  assert.equal(selectCapturedPages(raw, selection([spec])).outcomes[0].candidate.original.sourceItems.length, 10);
  for (const count of [0, -1, 1.5, 11, '4', null, undefined]) assert.throws(() => selectCapturedPages(raw, selection([{ ...spec, sourceReasonCount: count }])), /invalid expected page shape/);
});

test('four-source mismatch rejects only its page; extra URL and anchor tamper remain guarded', () => {
  const four = { pageId: 'four', title: 'Keturi šaltiniai', bodyParagraphCount: 2, sourceReasonCount: 4 };
  const raw = flat([...multiSourcePage(four.title, 4), ...page(specs[1].title)]);
  const mismatched = selectCapturedPages(raw, selection([{ ...four, sourceReasonCount: 3 }, specs[1]]));
  assert.deepEqual(mismatched.outcomes.map(o => o.status), ['rejected', 'captured']);
  assert.match(mismatched.outcomes[0].reason, /source reason count mismatch/);
  const extra = multiSourcePage(four.title, 4), sources = JSON.parse(extra.at(-1).text.slice('PRIVATE_SOURCE_JSON:'.length));
  sources[3].url = 'https://example.test/unlinked';
  extra[4] = block('P', 'PRIVATE_SOURCE_JSON: ' + JSON.stringify(sources));
  assert.match(selectCapturedPages(flat(extra), selection([four])).outcomes[0].reason, /source URL sets mismatch/);
  const tampered = structuredClone(raw); tampered.orderedAnchors[3].label = 'Changed label';
  assert.throws(() => selectCapturedPages(tampered, selection([four, specs[1]])), /anchor pairs mismatch/);
});

test('flat capture preserves exact words, links and independent footer order, with immutable raw', () => {
  const raw = good(), before = JSON.stringify(raw);
  const result = selectCapturedPages(raw, selection());
  assert.deepEqual(result.outcomes.map(p => p.status), ['captured', 'captured']);
  const candidate = result.outcomes[0].candidate;
  assert.equal(candidate.original.title, specs[0].title);
  assert.equal(candidate.original.body.length, 2);
  assert.ok(candidate.original.body.every(p => !p.includes('PRIVATE_SOURCE_JSON')));
  assert.deepEqual(candidate.orderedBodyLinks.map(l => l.label), ['Modelis A', 'Susisiekite', 'Modelis B']);
  assert.deepEqual(candidate.original.sourceItems.map(l => l.label), ['B kortelė', 'A kortelė']);
  assert.equal(candidate.factsAccepted, false);
  assert.equal(candidate.evidenceKind, 'rendered_dom_text_html');
  assert.equal(JSON.stringify(raw), before);
  const { startUtf16, endUtf16Exclusive, sha256 } = candidate.slice;
  const exact = raw.text.slice(startUtf16, endUtf16Exclusive);
  assert.equal(exact, raw.blocks.slice(0, 5).map(b => b.text).join('\n\n'));
  assert.equal(sha256, createHash('sha256').update(exact).digest('hex'));
});

test('array layout selects only explicit response ID/index and supports inner block HTML', () => {
  const original = good();
  const selected = { id: 'array-response-1', text: original.text, html: original.html,
    blocks: original.blocks.map(b => ({ tag: b.tag, text: b.text, html: b.html.replace(/^<[^>]+>|<\/[^>]+>$/gu, ''), links: b.anchors })),
    orderedLinks: original.orderedAnchors };
  const raw = { at: original.at, url: original.url, queries: [{}, {}], stopButtons: [], responses: [{ ...selected, id: 'array-response-0' }, selected] };
  const result = selectCapturedPages(raw, { responseIndex: 1, responseId: 'array-response-1', pages: specs });
  assert.equal(result.response.responseIndex, 1);
  assert.equal(result.response.layout, 'responses-array');
  assert.ok(result.outcomes.every(o => o.status === 'captured'));
  assert.throws(() => selectCapturedPages(raw, { responseIndex: 0, responseId: 'array-response-1', pages: specs }), /ID mismatch/);
});

test('all actual footer anchors are checked and preserved separately', () => {
  const raw = flat([...page(specs[0].title, { footerLinks: true }), ...page(specs[1].title)]);
  const result = selectCapturedPages(raw, selection());
  assert.equal(result.outcomes[0].candidate.orderedFooterLinks.length, 2);
  assert.equal(result.response.orderedAnchors.length, 8);
  assert.equal(result.outcomes[0].candidate.orderedBodyLinks.length, 3);
});

test('lowercase collector tag names normalize without changing any captured words', () => {
  const raw = good(); raw.blocks.forEach(b => { b.tag = b.tag.toLowerCase(); });
  const result = selectCapturedPages(raw, selection());
  assert.ok(result.outcomes.every(p => p.status === 'captured'));
  assert.equal(result.response.blocks[0].tag, 'H1');
  assert.equal(raw.blocks[0].tag, 'h1');
});

test('second page UTF16 bounds account for surrogate pairs before its heading', () => {
  const raw = flat([...page(specs[0].title, { description: '🔎 Trumpas aprašymas.' }), ...page(specs[1].title)]);
  const result = selectCapturedPages(raw, selection());
  const slice = result.outcomes[1].candidate.slice;
  assert.equal(slice.startUtf16, raw.text.indexOf(specs[1].title));
  assert.equal(raw.text.slice(slice.startUtf16, slice.endUtf16Exclusive), raw.blocks.slice(5).map(b => b.text).join('\n\n'));
});

for (const [name, mutate, pattern] of [
  ['whole block/text mismatch', r => { r.text += ' ignored'; }, /join mismatch/],
  ['absent block HTML', r => { r.blocks[1].html = '<p>Not in whole HTML</p>'; }, /HTML missing/],
  ['words differ from HTML', r => { r.blocks[1].text = 'Replaced words'; r.text = r.blocks.map(b => b.text).join('\n\n'); }, /HTML\/text mismatch/],
  ['global anchor tamper', r => { r.orderedAnchors[0] = { ...r.orderedAnchors[0], url: 'https://evil.test/' }; }, /anchor pairs mismatch/],
  ['block anchor tamper', r => { r.blocks[2].anchors[0] = { ...r.blocks[2].anchors[0], label: 'Different label' }; }, /anchor pairs mismatch/],
  ['hidden extra HTML anchor', r => { r.html += '<a href="https://evil.test/">Extra</a>'; }, /anchor pairs mismatch/],
  ['unmapped HTML H1', r => { r.html += '<h1>Extra</h1>'; }, /unmapped HTML H1/],
  ['Stop control', r => { r.stopControls = [{ text: 'Stop' }]; }, /completed\/noStop/],
  ['missing Stop evidence', r => { delete r.stopControls; }, /completed\/noStop/],
  ['contradictory Stop evidence', r => { r.stopButtons = [{ text: 'Stop' }]; }, /contradictory Stop/],
  ['explicit incomplete', r => { r.completed = false; }, /completed\/noStop/],
  ['wrong index', r => { r.responseIndex = 1; }, /counters mismatch/],
  ['wrong ID', r => { r.responseId = 'other'; }, /ID mismatch/],
  ['missing query history', r => { r.queries = []; }, /query history/],
  ['wrong query count', r => { r.queryCount = 2; }, /counters mismatch/],
  ['undefined timestamp', r => { delete r.at; }, /timestamp/],
  ['numeric timestamp', r => { r.at = 1; }, /timestamp/],
  ['account 0', r => { r.url = r.url.replace('/u/4/', '/u/0/'); }, /allowed Gemini/],
  ['account 1', r => { r.url = r.url.replace('/u/4/', '/u/1/'); }, /allowed Gemini/],
  ['no conversation ID', r => { r.url = 'https://gemini.google.com/u/4/app'; }, /allowed Gemini/],
  ['spoofed hostname', r => { r.url = 'https://gemini.google.com.evil.test/u/4/app/x'; }, /allowed Gemini/],
]) test(`global rejection: ${name}`, () => {
  const raw = good(); mutate(raw);
  assert.throws(() => selectCapturedPages(raw, selection()), pattern);
});

test('extra or duplicate actual H1 and unmapped prefix globally reject', () => {
  assert.throws(() => selectCapturedPages(flat([...page(specs[0].title), ...page(specs[1].title), ...page('Unmapped title')]), selection()), /unmapped.*count mismatch/);
  assert.throws(() => selectCapturedPages(flat(page('Unmapped title')), selection()), /unmapped.*count mismatch/);
  assert.throws(() => selectCapturedPages(flat([...page(specs[0].title), ...page(specs[0].title)]), selection()), /duplicate actual H1/);
  assert.throws(() => selectCapturedPages(flat([block('P', 'Unexpected preface'), ...page(specs[0].title)]), selection()), /prefix/);
});

test('same-count unknown H1 rejects only its missing exact page, never assigning an unknown section', () => {
  const three = [...specs, { ...specs[0], pageId: 'c', title: 'Trečias puslapis' }];
  for (let missing = 0; missing < three.length; missing++) {
    const actual = three.map((s, i) => page(i === missing ? 'Nežinomas puslapis' : s.title));
    // Reorder sections as well: extraction is by exact H1, not expected position.
    const blocks = [...actual[2], ...actual[0], ...actual[1]], raw = flat(blocks), before = JSON.stringify(raw);
    const result = selectCapturedPages(raw, selection(three));
    assert.deepEqual(result.outcomes.map(o => o.status), three.map((_, i) => i === missing ? 'rejected' : 'captured'));
    assert.match(result.outcomes[missing].reason, /expected H1 missing/);
    for (const outcome of result.outcomes.filter(o => o.status === 'captured')) {
      const candidate = outcome.candidate, spec = three.find(s => s.pageId === outcome.pageId);
      const start = blocks.findIndex(b => b.tag === 'H1' && b.text === spec.title);
      assert.deepEqual(candidate.original.body, blocks.slice(start + 2, start + 4).map(b => b.text));
      assert.equal(raw.text.slice(candidate.slice.startUtf16, candidate.slice.endUtf16Exclusive), blocks.slice(start, start + 5).map(b => b.text).join('\n\n'));
      assert.equal(candidate.slice.sha256, createHash('sha256').update(raw.text.slice(candidate.slice.startUtf16, candidate.slice.endUtf16Exclusive)).digest('hex'));
      assert.ok(!candidate.original.title.includes('Nežinomas'));
    }
    assert.equal(JSON.stringify(raw), before);
  }
});

test('missing expected H1 rejects only missing page without ignoring extra actual content', () => {
  const result = selectCapturedPages(flat(page(specs[0].title)), selection());
  assert.deepEqual(result.outcomes.map(p => p.status), ['captured', 'rejected']);
  assert.match(result.outcomes[1].reason, /H1 missing/);
});

for (const [name, broken] of [
  ['description over limit', () => page(specs[0].title, { description: 'a'.repeat(161) })],
  ['malformed source JSON', () => page(specs[0].title, { footer: 'PRIVATE_SOURCE_JSON: {broken' })],
  ['source footer absent', () => page(specs[0].title, { footer: 'Unrelated paragraph' })],
  ['missing own paragraph', () => { const p = page(specs[0].title); p.splice(3, 1); return p; }],
  ['reason over sixty words', () => page(specs[0].title, { sources: [
    { url: 'https://example.test/b', label: 'B', reason: Array(61).fill('žodis').join(' ') },
    { url: 'https://example.test/a?x=1&y=2', label: 'A', reason: 'Konkretus dokumentas.' },
  ] })],
  ['source URL mismatch', () => page(specs[0].title, { sources: [
    { url: 'https://example.test/c', label: 'C', reason: 'Konkretus dokumentas.' },
    { url: 'https://example.test/a?x=1&y=2', label: 'A', reason: 'Konkretus dokumentas.' },
  ] })],
  ['unexpected source keys', () => page(specs[0].title, { sources: [
    { url: 'https://example.test/b', label: 'B', reason: 'Konkretus dokumentas.', verified: true },
    { url: 'https://example.test/a?x=1&y=2', label: 'A', reason: 'Konkretus dokumentas.' },
  ] })],
]) test(`own-page rejection leaves other candidate intact: ${name}`, () => {
  const result = selectCapturedPages(flat([...broken(), ...page(specs[1].title)]), selection());
  assert.deepEqual(result.outcomes.map(p => p.status), ['rejected', 'captured']);
  assert.ok(result.outcomes[0].reason);
});

test('description exactly160 and reason exactly60 words accepted', () => {
  const p = page(specs[0].title, { description: 'a'.repeat(160), sources: [
    { url: 'https://example.test/b', label: 'B', reason: Array(60).fill('žodis').join(' ') },
    { url: 'https://example.test/a?x=1&y=2', label: 'A', reason: 'Konkretus dokumentas.' },
  ] });
  assert.equal(selectCapturedPages(flat(p), selection([specs[0]])).outcomes[0].status, 'captured');
});

test('expected body URLs compare exact multiset, independent of order', () => {
  const expectedBodyUrls = ['https://example.test/b', 'https://promedical.lt/kontaktai', 'https://example.test/a?x=1&y=2'];
  const result = selectCapturedPages(good(), selection([{ ...specs[0], expectedBodyUrls }, specs[1]]));
  assert.equal(result.outcomes[0].status, 'captured');
  expectedBodyUrls[0] = 'https://example.test/other';
  const rejected = selectCapturedPages(good(), selection([{ ...specs[0], expectedBodyUrls }, specs[1]]));
  assert.deepEqual(rejected.outcomes.map(p => p.status), ['rejected', 'captured']);
});

test('duplicate specs cannot alias two page IDs to one original capture', () => {
  assert.throws(() => selectCapturedPages(good(), selection([specs[0], specs[0]])), /duplicate expected/);
  assert.throws(() => selectCapturedPages(good(), selection([specs[0], { ...specs[1], title: specs[0].title }])), /duplicate expected/);
});
