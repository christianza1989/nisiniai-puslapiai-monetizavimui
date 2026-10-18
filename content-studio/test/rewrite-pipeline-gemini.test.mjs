import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { sendGeminiOnce, prepareGeminiSend, dispatchPreparedGeminiSend, hashGeminiText, observeGeminiResponse, readGeminiUi, buildAuthorPrompt, buildChromeLaunchPlan, validateGeminiProof, geminiBrowserFunctionsSource } from '../src/rewrite-pipeline/gemini-ui.mjs';

const batchId = 'TEST-BATCH-001';
const prompt = `BATCH_ID: ${batchId}\nParašyk tris tekstus.`;
const selectors = { editor: '.editor', query: '.query', queryText: '.query-text', response: '.response', responseText: '.response-text', stop: '.stop', blocks: 'h1,p,pre', responseComplete: '.copy-response', accountControl: '.account' };
const proof = () => ({ mechanism: 'ACTUAL_PLAYWRIGHT_UI', at: new Date().toISOString(), accountPath: '/u/4', accountIdentity: 'test-account', model: { label: '4 Argon', selected: true, enabled: true, expanded: true }, thinking: { label: 'Žema', selected: true, enabled: true, expanded: true }, refs: { ax: 'fixture/pre.ax', dom: 'fixture/pre.dom', png: 'fixture/pre.png' } });
const start = () => ({ at: new Date().toISOString(), url: 'https://gemini.google.com/u/4/app', visibilityState: 'visible', hasFocus: true, accountControl: { count: 1, text: 'Google account: test-account' }, editor: { count: 1, text: prompt, visible: true, enabled: true }, stopControls: [], stopCount: 0, queries: [], responses: [] });
function response(overrides = {}) {
  return { index: 0, id: 'actual-response-id', text: 'H1\nVisas tikras tekstas.', html: '<h1>H1</h1><p>Visas tikras tekstas.</p>', responseHtml: '<model-response>actual</model-response>', blocks: [{ tag: 'h1', text: 'H1', html: '<h1>H1</h1>' }, { tag: 'p', text: 'Visas tikras tekstas.', html: '<p>Visas tikras tekstas.</p>' }], orderedAnchors: [{ url: 'https://example.com/product', label: 'gaminio kortelė' }, { url: 'https://example.com/group', label: 'grupės sąrašas' }], completionMarker: true, ...overrides };
}
function fixture({ initial = start(), onPress, proofOverride, durability = true, outcomeError = false } = {}) {
  let state = structuredClone(initial);
  const attempts = new Map();
  const events = [];
  const captured = [];
  const outcomes = [];
  const claimContext = vm.createContext({ Date, Map, Symbol });
  const journal = {
    async read(id) { events.push('read'); return attempts.get(id) ?? null; },
    async writeIntent(intent) {
      events.push('intent');
      if (attempts.has(intent.batchId)) throw new Error('Intent already exists');
      const receipt = { durable: durability, intentId: 'actual-durable-intent', batchId: intent.batchId, promptNormalized: intent.promptNormalized };
      if (durability) attempts.set(intent.batchId, { ...intent, ...receipt });
      return receipt;
    },
    async writeOutcome(outcome) { events.push('outcome'); if (outcomeError) throw new Error('Disk full'); outcomes.push(outcome); },
  };
  const page = {
    evaluate: async (_fn, args) => {
      if (args?.preparedId && args?.attemptId) {
        claimContext.input = args;
        return vm.runInContext(`(${_fn.toString()})(input)`, claimContext);
      }
      assert.deepEqual(args, selectors); return structuredClone(state);
    },
    locator(selector) { assert.equal(selector, selectors.editor); return { async press(key, options) {
      events.push(`press:${key}`); assert.equal(key, 'Enter'); assert.ok(options.timeout <= 10_000);
      assert.ok(attempts.has(batchId), 'intent must exist before Enter');
      if (onPress) return onPress({ set: (s) => { state = s; }, get: () => state });
      state.url = 'https://gemini.google.com/u/4/app/new-conversation';
      state.queries.push({ index: state.queries.length, id: 'actual-query-id', text: prompt, html: '<user-query>actual</user-query>' });
    } }; },
    async waitForTimeout(ms) { await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 2))); },
  };
  const request = { batchId, prompt, expectedAccount: 'test-account', selectors, journal, ackTimeoutMs: 0, capturePreflight: async () => proofOverride ?? proof(), capturePostflight: async () => proofOverride ?? proof(), captureRaw: async (raw) => { captured.push(structuredClone(raw)); return { durable: true, ref: `raw-${captured.length}.json` }; } };
  return { page, request, events, captured, outcomes, attempts, set: (s) => { state = s; }, get: () => state };
}

test('durable intent precedes exactly one Enter; actual query ack is not completion', async () => {
  const f = fixture();
  const ack = await sendGeminiOnce(f.page, f.request);
  assert.equal(ack.status, 'QUERY_ACKNOWLEDGED');
  assert.equal(ack.completedResponse, false);
  assert.equal(ack.queryId, 'actual-query-id');
  assert.equal(ack.queryIndex, 0);
  assert.equal(ack.baselineResponseCount, 0);
  assert.ok(f.events.indexOf('intent') < f.events.indexOf('press:Enter'));
  assert.equal((await sendGeminiOnce(f.page, f.request)).status, 'NO_SEND_EXISTING_ATTEMPT');
  assert.equal(f.events.filter((e) => e.startsWith('press')).length, 1);
});

test('undurable intent or failed readback prevents all dispatch', async () => {
  const f = fixture({ durability: false });
  await assert.rejects(sendGeminiOnce(f.page, f.request), /durability/);
  assert.equal(f.events.includes('press:Enter'), false);
});

test('ambiguous Enter timeout never retries and retains UNKNOWN', async () => {
  const f = fixture({ onPress() { throw new Error('Timeout 5000ms'); } });
  const result = await sendGeminiOnce(f.page, f.request);
  assert.equal(result.status, 'SEND_OUTCOME_UNKNOWN');
  assert.equal(result.retryAllowed, false);
  assert.match(result.transportError, /Timeout/);
  assert.equal((await sendGeminiOnce(f.page, f.request)).status, 'NO_SEND_EXISTING_ATTEMPT');
  assert.equal(f.events.filter((e) => e === 'press:Enter').length, 1);
});

test('timeout after actual delivery may acknowledge exact current history without resending', async () => {
  const f = fixture({ onPress({ get, set }) {
    const state = get(); state.url += '/retained'; state.queries.push({ index: 0, id: 'retained-query', text: prompt, html: '<q/>' }); set(state); throw new Error('Transport timeout');
  } });
  const result = await sendGeminiOnce(f.page, f.request);
  assert.equal(result.status, 'QUERY_ACKNOWLEDGED');
  assert.equal(result.queryId, 'retained-query');
  assert.equal(f.events.filter((e) => e === 'press:Enter').length, 1);
});

test('same ID with different text is not an acknowledgement', async () => {
  const f = fixture({ onPress({ get }) { const s = get(); s.url += '/new'; s.queries.push({ index: 0, id: 'q', text: prompt + ' ANOTHER REQUEST', html: '<q/>' }); } });
  assert.equal((await sendGeminiOnce(f.page, f.request)).status, 'SEND_OUTCOME_UNKNOWN');
});

test('exact query history acknowledges UI delivery before conversation URL allocation, never completion', async () => {
  const f = fixture({ onPress({ get }) { get().queries.push({ index: 0, id: 'q', text: prompt, html: '<q/>' }); } });
  const ack = await sendGeminiOnce(f.page, f.request);
  assert.equal(ack.status, 'QUERY_ACKNOWLEDGED');
  assert.equal(ack.retainedConversationUrl, null);
  assert.equal(ack.completedResponse, false);
  f.get().url += '/new-retained'; f.get().responses = [response()];
  assert.equal((await observeGeminiResponse(f.page,{...f.request,acknowledgement:ack,responseTimeoutMs:100,pollMs:1})).status,'COMPLETE_RESPONSE_CAPTURED');
});

test('old matching history blocks dispatch, rather than claiming a new response', async () => {
  const state = start(); state.queries = [{ index: 0, id: 'old', text: prompt }];
  state.responses = [response()];
  const f = fixture({ initial: state });
  await assert.rejects(sendGeminiOnce(f.page, f.request), /already appears/);
  assert.equal(f.events.includes('intent'), false);
});

test('unretained previous conversation is not safe to send into', async () => {
  const state = start(); state.queries = [{ index: 0, id: 'old', text: 'old different request' }];
  const f = fixture({ initial: state });
  await assert.rejects(sendGeminiOnce(f.page, f.request), /not fully retained/);
  assert.equal(f.events.includes('intent'), false);
});

test('UI changes after durable intent prevent dispatch and keep replay barrier', async () => {
  const f = fixture();
  const write = f.request.journal.writeIntent;
  f.request.journal.writeIntent = async (intent) => { const receipt = await write(intent); f.get().editor.text = 'different text'; return receipt; };
  await assert.rejects(sendGeminiOnce(f.page, f.request), /UI changed/);
  assert.equal(f.events.includes('press:Enter'), false);
  assert.equal((await sendGeminiOnce(f.page, f.request)).status, 'NO_SEND_EXISTING_ATTEMPT');
});

test('concurrent sends into the same page fail before a second dispatch', async () => {
  const f = fixture();
  let release;
  f.request.capturePreflight = async () => { await new Promise((resolve) => { release = resolve; }); return proof(); };
  const running = sendGeminiOnce(f.page, f.request);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(sendGeminiOnce(f.page, f.request), /in-flight send/);
  release(); await running;
  assert.equal(f.events.filter((e) => e === 'press:Enter').length, 1);
});

for (const [name, change] of [
  ['wrong model', (p) => { p.model.label = 'Flash-Lite'; }],
  ['wrong thinking', (p) => { p.thinking.label = 'Medium'; }],
  ['unselected model', (p) => { p.model.selected = false; }],
  ['disabled model', (p) => { p.model.enabled = false; }],
  ['unexpanded proof', (p) => { p.thinking.expanded = false; }],
  ['wrong account identity', (p) => { p.accountIdentity = 'other'; }],
  ['wrong account path', (p) => { p.accountPath = '/u/3'; }],
  ['missing PNG', (p) => { p.refs.png = ''; }],
  ['stale proof', (p) => { p.at = '2020-01-01T00:00:00Z'; }],
]) test(`${name} fails closed before intent/Enter`, async () => {
  const p = proof(); change(p); const f = fixture({ proofOverride: p });
  await assert.rejects(sendGeminiOnce(f.page, f.request), /preflight/);
  assert.equal(f.events.includes('intent'), false);
});

test('u/0, u/1, lookalike domain and non-app pages rejected', () => {
  for (const url of ['https://gemini.google.com/u/0/app', 'https://gemini.google.com/u/1/app', 'https://gemini.google.com.attacker.test/u/4/app', 'https://gemini.google.com/u/4/search']) assert.throws(() => validateGeminiProof(proof(), { expectedAccount: 'test-account' }, url), /path mismatch/);
});

test('invalid freshness limits cannot disable stale-proof rejection', () => {
  for (const proofMaxAgeMs of [NaN, Infinity, -1, 0, 120_001]) assert.throws(() => validateGeminiProof(proof(), { expectedAccount: 'test-account', proofMaxAgeMs }, 'https://gemini.google.com/u/4/app'), /freshness limit/);
});

test('editor mismatch, duplicate editor, hidden editor and active Stop block dispatch', async () => {
  for (const mutate of [(s) => { s.editor.text += ' altered'; }, (s) => { s.editor.count = 2; }, (s) => { s.editor.visible = false; }, (s) => { s.stopCount = 1; }]) {
    const s = start(); mutate(s); const f = fixture({ initial: s });
    await assert.rejects(sendGeminiOnce(f.page, f.request));
    assert.equal(f.events.includes('press:Enter'), false);
  }
});

test('hidden document blocks Enter even when editor is CSS-visible', async () => {
  const s = start(); s.visibilityState = 'hidden'; const f = fixture({ initial: s });
  await assert.rejects(sendGeminiOnce(f.page, f.request), /document must be visible/);
  assert.equal(f.events.includes('press:Enter'), false);
  assert.equal(f.attempts.size, 0);
});

test('covered visible document may send without keyboard focus', async () => {
  const s = start(); s.hasFocus = false;
  const f = fixture({ initial: s });
  assert.equal((await sendGeminiOnce(f.page, f.request)).status, 'QUERY_ACKNOWLEDGED');
  assert.equal(f.events.filter(e => e === 'press:Enter').length, 1);
});

test('two-RPC flow blocks a hidden document both before and after preparation', async () => {
  const hidden = fixture(); hidden.get().visibilityState = 'hidden';
  await assert.rejects(prepareGeminiSend(hidden.page, {...hidden.request, capturePreflight:undefined, preflightProof:proof()}), /document must be visible/);
  const f = fixture(); const request = await hostPrepared(f);
  f.get().visibilityState = 'hidden';
  await assert.rejects(dispatchPreparedGeminiSend(f.page, request), /document must be visible/);
  assert.equal(f.events.includes('press:Enter'), false);
});

test('outcome write failure leaves durable intent replay barrier', async () => {
  const f = fixture({ outcomeError: true });
  const ack = await sendGeminiOnce(f.page, f.request);
  assert.equal(ack.status, 'QUERY_ACKNOWLEDGED'); assert.match(ack.journalError, /Disk full/);
  assert.equal((await sendGeminiOnce(f.page, f.request)).status, 'NO_SEND_EXISTING_ATTEMPT');
});

test('new response captured before wait; stable text + completion marker + post-proof required', async () => {
  const f = fixture(); const ack = await sendGeminiOnce(f.page, f.request);
  f.get().responses = [response()];
  const result = await observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, responseTimeoutMs: 100, pollMs: 1 });
  assert.equal(result.status, 'COMPLETE_RESPONSE_CAPTURED');
  assert.equal(result.authorshipAccepted, false);
  assert.equal(result.raw.responseId, 'actual-response-id');
  assert.equal(result.raw.responseIndex, 0);
  assert.equal(result.raw.url, ack.conversationUrl);
  assert.equal(result.raw.queryCount, 1);
  assert.equal(result.raw.responseCount, 1);
  assert.deepEqual(result.raw.queries, f.get().queries);
  assert.deepEqual(result.raw.stopControls, []);
  assert.equal(f.captured.length, 1);
  assert.deepEqual(result.raw.orderedAnchors, response().orderedAnchors, 'all actual source/body anchors retained in original order');
  assert.equal(result.postflightProof.backendModelId, null, 'must not invent backend ID');
});

test('query acknowledgement alone never proves completed authored text', async () => {
  const f = fixture(); const ack = await sendGeminiOnce(f.page, f.request);
  const result = await observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, responseTimeoutMs: 0 });
  assert.equal(result.status, 'RESPONSE_PENDING_OR_UNCERTAIN'); assert.equal(f.captured.length, 0);
});

test('nonempty response with Stop or no actual completion marker stays pending', async () => {
  for (const [stop, marker] of [[1, true], [0, false]]) {
    const f = fixture(); const ack = await sendGeminiOnce(f.page, f.request); f.get().responses = [response({ completionMarker: marker })]; f.get().stopCount = stop;
    assert.equal((await observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, responseTimeoutMs: 5, pollMs: 1 })).status, 'RESPONSE_PENDING_OR_UNCERTAIN');
    assert.equal(f.captured.length, 1, 'actual early text still retained');
  }
});

test('old response, lost query, changed conversation and later queries cannot be accepted', async () => {
  const f = fixture(); const ack = await sendGeminiOnce(f.page, f.request);
  f.get().responses = [response()];
  const baseline = { ...ack, baselineResponseCount: 1, baselineResponseIds: ['actual-response-id'] };
  assert.equal((await observeGeminiResponse(f.page, { ...f.request, acknowledgement: baseline, responseTimeoutMs: 0 })).status, 'RESPONSE_PENDING_OR_UNCERTAIN');
  f.get().queries.push({ index: 1, text: 'other query' });
  assert.equal((await observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, responseTimeoutMs: 0 })).status, 'RESPONSE_ASSOCIATION_AMBIGUOUS');
  f.get().queries = [];
  assert.equal((await observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, responseTimeoutMs: 0 })).status, 'QUERY_NOT_RETAINED');
  f.get().url += '-other';
  assert.equal((await observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, responseTimeoutMs: 0 })).status, 'RESPONSE_CONTEXT_CHANGED');
});

test('post-proof wrong model and failed durable raw capture never accept response', async () => {
  const f = fixture(); const ack = await sendGeminiOnce(f.page, f.request); f.get().responses = [response()];
  const wrong = proof(); wrong.model.label = 'Flash-Lite';
  await assert.rejects(observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, capturePostflight: async () => wrong, responseTimeoutMs: 100, pollMs: 1 }), /4 Argon/);
  await assert.rejects(observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, captureRaw: async () => ({ durable: false }), responseTimeoutMs: 0 }), /durably retained/);
});

test('actual changing early versions are retained separately before completion', async () => {
  const f = fixture(); const ack = await sendGeminiOnce(f.page, f.request);
  f.get().responses = [response({ text: 'Pradžia', html: '<p>Pradžia</p>', completionMarker: false })]; f.get().stopCount = 1;
  const versions = [];
  const result = await observeGeminiResponse(f.page, { ...f.request, acknowledgement: ack, responseTimeoutMs: 100, pollMs: 1, captureRaw: async (raw) => {
    versions.push(raw.text);
    f.get().responses = [response()]; f.get().stopCount = 0;
    return { durable: true, ref: `immutable-${versions.length}.json` };
  } });
  assert.equal(result.status, 'COMPLETE_RESPONSE_CAPTURED');
  assert.deepEqual(versions, ['Pradžia', 'H1\nVisas tikras tekstas.']);
});

test('DOM read executes the actual page-only collector and preserves exact body/footer anchor order', async () => {
  const anchors = [{ href: 'https://example.com/b', innerText: 'B', textContent: ' B ' }, { href: 'https://example.com/a', innerText: 'A', textContent: ' A ' }];
  const block = { tagName: 'P', innerText: 'Visas tekstas.', outerHTML: '<p>Visas tekstas.</p>', querySelectorAll: () => anchors };
  const content = { id: 'actual-content-id', innerText: 'Visas tekstas.', innerHTML: '<p>Visas tekstas.</p>', querySelectorAll: (s) => s === 'a[href]' ? anchors : [block] };
  const model = { id: '', outerHTML: '<model-response/>', querySelector: (s) => s === selectors.responseText ? content : {} };
  const query = { id: '', outerHTML: '<user-query/>', getAttribute: () => null, querySelector: () => ({ innerText: 'You said truncated summary\n' + prompt, querySelectorAll: () => prompt.split('\n').map(innerText => ({innerText})) }) };
  const editor = { tagName: 'DIV', innerText: prompt, disabled: false, isContentEditable: true, getAttribute: () => null, getBoundingClientRect: () => ({ width: 500, height: 100, left: 0, right: 500, top: 0, bottom: 100 }) };
  const account = { getAttribute: () => 'Google Account: test-account', textContent: '' };
  const ctx = { document: { querySelectorAll: (s) => ({ [selectors.editor]: [editor], [selectors.query]: [query], [selectors.response]: [model], [selectors.stop]: [], [selectors.accountControl]: [account] })[s], visibilityState: 'hidden', hasFocus: () => false }, location: { href: 'https://gemini.google.com/u/4/app/actual' }, innerWidth: 1440, innerHeight: 1000, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }), Date, selectors };
  const page = { evaluate: async (fn) => vm.runInNewContext(`(${fn.toString()})(selectors)`, ctx) };
  const actual = await readGeminiUi(page, selectors);
  assert.equal(actual.editor.visible, true);
  assert.equal(actual.responses[0].id, 'actual-content-id');
  assert.equal(actual.queries[0].id, null, 'do not invent query IDs when DOM has none');
  assert.equal(actual.queries[0].text, prompt);
  assert.equal(actual.queries[0].renderedText, 'You said truncated summary\n' + prompt);
  assert.deepEqual(JSON.parse(JSON.stringify(actual.responses[0].orderedAnchors)), [{ url: 'https://example.com/b', label: 'B' }, { url: 'https://example.com/a', label: 'A' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(actual.responses[0].blocks[0].anchors)), [{ url: 'https://example.com/b', label: 'B' }, { url: 'https://example.com/a', label: 'A' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(actual.stopControls)), []);
});

test('browser bundle is pasteable without imports, fs, fetch, launch, CDP or hidden profile', () => {
  const source = geminiBrowserFunctionsSource();
  const api = vm.runInNewContext(`${source}\n({sendGeminiOnce, observeGeminiResponse})`, { URL, Date, Symbol });
  assert.equal(typeof api.sendGeminiOnce, 'function');
  assert.equal(typeof api.observeGeminiResponse, 'function');
  assert.doesNotMatch(source, /\bimport\s|\bfetch\s*\(|require\(|connectOverCDP|launchPersistentContext/);
});

const promptInput = () => ({ batchId, pages: [{ id: 'page1', h1: 'Gipsavimo vežimėliai', readerJob: 'Palyginti du modelius', facts: ['SKU01 50 kg'], limits: ['Komponentas nėra visas gaminys'], paragraphCount: 2, sources: [{ url: 'https://example.com/product', label: 'Kortelė', documentRole: 'individual technical card' }], links: [{ url: 'https://example.com/contact', label: 'Susisiekite' }] }], examples: [{ accepted: true, text: 'Priimtas tekstas vienas.', reference: 'approved/page-a' }, { accepted: true, text: 'Priimtas tekstas du.', reference: 'approved/page-b' }], commonMistakes: ['Techninius duomenis priskirk produkto kortelei, ne kategorijos sąrašui.'] });
test('prompt includes unique batch, two referenced accepted examples, own facts and separate source footer', () => {
  const result = buildAuthorPrompt(promptInput());
  assert.match(result, /BATCH_ID: TEST-BATCH-001/);
  assert.match(result, /PRIVATE_SOURCE_JSON/);
  assert.match(result, /PAVYZDYS 1 \(approved\/page-a\)/);
  assert.match(result, /PAVYZDYS 2 \(approved\/page-b\)/);
  assert.match(result, /"paragraphCount": 2/);
  assert.match(result, /"facts": \[\n\s+"SKU01 50 kg"/);
  assert.match(result, /jų neperkelk į atsakymą/);
  assert.match(result, /vienintelis skirtukas yra tikslus užduoties h1 tekstas/);
  assert.match(result, /Nenaudok papildomų antraščių.*PAGE_ID, DESCRIPTION, BODY žymų/);
  assert.doesNotMatch(result, /Grąžink visus puslapius su jų PAGE_ID/);
  assert.match(result, /"h1": "Gipsavimo vežimėliai"/);
  assert.match(result, /eilė gali skirtis/);
  assert.match(result, /siek iki 140 UTF16 kodo vienetų, absoliuti riba 160 UTF16/);
  assert.match(result, /„patikrintas“, „išnagrinėtas“, „apjungia“/);
});

test('prompt contains latest retained own-page parser and review corrections, not unrelated or UNKNOWN text', () => {
  const input = promptInput(), captureRef = { path: 'retained/raw.json', sha256: 'a'.repeat(64) };
  input.previousRejections = [
    { pageId: 'page1', kind: 'parser', status: 'REJECTED', reason: 'OLD_PARSE_SHOULD_NOT_REPEAT', captureRef },
    { pageId: 'other', kind: 'review', status: 'rejected', reason: 'UNRELATED_PAGE_TEXT', captureRef },
    { pageId: 'page1', kind: 'parser', status: 'UNKNOWN', reason: 'UNKNOWN_AUTHOR_TEXT', captureRef },
    { pageId: 'page1', kind: 'parser', status: 'REJECTED', reason: 'Own description has 161 UTF16; shorten below target.', captureRef },
    { pageId: 'page1', kind: 'review', status: 'rejected', reason: 'Apkrova priklauso vienai lentynai, ne visam gaminiui.', captureRef },
  ];
  const prompt = buildAuthorPrompt(input);
  assert.ok(prompt.includes('Own description has 161 UTF16; shorten below target.'));
  assert.ok(prompt.includes('Apkrova priklauso vienai lentynai, ne visam gaminiui.'));
  assert.doesNotMatch(prompt, /OLD_PARSE_SHOULD_NOT_REPEAT|UNRELATED_PAGE_TEXT|UNKNOWN_AUTHOR_TEXT/);
  assert.match(prompt, /ankstesnio varianto klaida nėra užrakintas faktas/);
  assert.deepEqual(input.pages[0].facts, ['SKU01 50 kg'], 'fact pack is unchanged by correction formatting');
});

test('unretained own correction cannot be smuggled into author prompt', () => {
  const input = promptInput();
  input.previousRejections = [{ pageId: 'page1', kind: 'review', status: 'rejected', reason: 'Changed prose without captured original', captureRef: { path: 'raw.json', sha256: 'not-a-pin' } }];
  assert.throws(() => buildAuthorPrompt(input), /retained own capture/);
});
test('prompt rejects unaccepted examples, duplicates and incomplete primary sources', () => {
  for (const mutate of [(i) => { i.examples[0].accepted = false; }, (i) => { i.examples.pop(); }, (i) => { i.pages.push(i.pages[0]); }, (i) => { delete i.pages[0].sources[0].documentRole; }, (i) => { i.pages[0].paragraphCount = 0; }, (i) => { i.pages[0].paragraphCount = 3; }, (i) => { delete i.pages[0].h1; }, (i) => { i.pages[0].h1 = ' '; }, (i) => { i.pages.push({ ...i.pages[0], id: 'page2' }); }]) {
    const input = promptInput(); mutate(input); assert.throws(() => buildAuthorPrompt(input));
  }
});

test('prompt supports at most three independent exact H1s and one or two body paragraphs', () => {
  const input = promptInput();
  input.pages.push({ ...input.pages[0], id: 'page2', h1: 'Drabužių kabinimo skersiniai', paragraphCount: 1 }, { ...input.pages[0], id: 'page3', h1: 'Sandėlio vežimėliai vaistinėms' });
  const result = buildAuthorPrompt(input);
  for (const p of input.pages) assert.ok(result.includes(`"h1": "${p.h1}"`));
  input.pages.push({ ...input.pages[0], id: 'page4', h1: 'Ketvirtas puslapis' });
  assert.throws(() => buildAuthorPrompt(input), /One to three/);
});
test('Chrome flags are a plan, never falsely effective on an already running process', () => {
  const plan = buildChromeLaunchPlan({ existingSignedInProfile: true, nonMinimized: true, chromeAlreadyRunning: true });
  assert.equal(plan.flagsVerifiedEffective, false); assert.equal(plan.restartOtherChromeAllowed, false); assert.equal(plan.isolatedProfileAllowed, false);
  assert.deepEqual(plan.requestedFlags, ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding']);
  assert.match(plan.limitation, /does not prove/);
  assert.throws(() => buildChromeLaunchPlan({ existingSignedInProfile: false, nonMinimized: true, chromeAlreadyRunning: false }));
});

async function hostPrepared(f) {
  const prepared = JSON.parse(JSON.stringify(await prepareGeminiSend(f.page, { ...f.request, capturePreflight: undefined, preflightProof: proof() })));
  // Simulates the host's durable RESULT write/readback BEFORE the dispatch RPC.
  // The browser adapter never creates or acknowledges a filesystem write itself.
  const persistedIntent = { durable: true, state: 'ATTEMPTED', preparedId: prepared.preparedId, batchId, preparedSha256: prepared.preparedSha256, promptSha256: prepared.promptSha256, attemptId: 'host-attempt-001', attemptedAt: new Date().toISOString(), recordRef: 'fixture/RESULT.json#attempts/0' };
  f.attempts.set(batchId, structuredClone(persistedIntent));
  return { prepared, persistedIntent, ackTimeoutMs: 0 };
}

test('prepare RPC is read-only and SHA256 binds full editor/prompt/history before host persistence', async () => {
  const f = fixture();
  const prepared = await prepareGeminiSend(f.page, { ...f.request, capturePreflight: undefined, preflightProof: proof() });
  assert.equal(prepared.kind, 'PREPARED_GEMINI_SEND');
  assert.equal(prepared.promptSha256, await hashGeminiText(prompt));
  assert.equal(await hashGeminiText('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(prepared.editorSha256, await hashGeminiText(f.get().editor.text));
  assert.equal(prepared.preQueryIds.length, 0); assert.equal(prepared.preResponseIds.length, 0);
  assert.deepEqual(f.events, [], 'no fake browser-side journal write or Enter');
});

test('two-RPC dispatch accepts only host ATTEMPTED receipt then one actual Enter', async () => {
  const f = fixture(); const request = await hostPrepared(f);
  const ack = await dispatchPreparedGeminiSend(f.page, request);
  assert.equal(ack.status, 'QUERY_ACKNOWLEDGED'); assert.equal(ack.completedResponse, false);
  assert.equal(ack.intentId, request.persistedIntent.attemptId);
  assert.equal(ack.preparedId, request.prepared.preparedId);
  assert.equal(f.events.filter((e) => e === 'press:Enter').length, 1);
  assert.equal(f.events.includes('intent'), false, 'actual host receipt only; browser does not pretend to persist');
});

test('prepared dispatch changed editor or history fails before Enter', async () => {
  for (const mutate of [
    (s) => { s.editor.text += ' altered'; },
    (s) => { s.editor.text = s.editor.text.replace('\n', ' '); },
    (s) => { s.queries.push({ id: 'new-query', index: 0, text: 'other request' }); },
    (s) => { s.responses.push(response()); },
    (s) => { s.accountControl.text = 'Google Account: other'; },
    (s) => { s.url = 'https://gemini.google.com/u/3/app'; },
  ]) {
    const f = fixture(); const request = await hostPrepared(f); mutate(f.get());
    await assert.rejects(dispatchPreparedGeminiSend(f.page, request));
    assert.equal(f.events.includes('press:Enter'), false);
  }
});

test('mismatched durable host receipt or tampered preparation never dispatches', async () => {
  for (const mutate of [
    (r) => { r.persistedIntent.durable = false; },
    (r) => { r.persistedIntent.state = 'PREPARED'; },
    (r) => { r.persistedIntent.preparedId = 'wrong'; },
    (r) => { r.persistedIntent.preparedSha256 = '0'.repeat(64); },
    (r) => { r.persistedIntent.promptSha256 = '0'.repeat(64); },
    (r) => { delete r.persistedIntent.recordRef; },
    (r) => { r.persistedIntent.attemptedAt = '2020-01-01T00:00:00Z'; },
    (r) => { r.prepared.prompt += ' tampered'; },
    (r) => { r.prepared.before.queries.push({ id: 'invented', index: 0, text: 'bad' }); },
  ]) {
    const f = fixture(); const request = await hostPrepared(f); mutate(request);
    await assert.rejects(dispatchPreparedGeminiSend(f.page, request), /binding/);
    assert.equal(f.events.includes('press:Enter'), false);
  }
});

test('two-RPC Enter timeout remains UNKNOWN and consumed live-page intent cannot be retried', async () => {
  const f = fixture({ onPress() { throw new Error('Timeout during Enter'); } });
  const request = await hostPrepared(f);
  const first = await dispatchPreparedGeminiSend(f.page, request);
  assert.equal(first.status, 'SEND_OUTCOME_UNKNOWN'); assert.equal(first.retryAllowed, false);
  assert.equal((await dispatchPreparedGeminiSend(f.page, JSON.parse(JSON.stringify(request)))).status, 'NO_SEND_CONSUMED_INTENT');
  assert.equal(f.events.filter((e) => e === 'press:Enter').length, 1);
});

test('concurrent prepared RPCs consume the actual page-global guard only once', async () => {
  const f = fixture({ onPress() { throw new Error('Unknown Enter delivery'); } });
  const request = await hostPrepared(f);
  const results = await Promise.all([dispatchPreparedGeminiSend(f.page, request), dispatchPreparedGeminiSend(f.page, request)]);
  assert.deepEqual(results.map((r) => r.status).sort(), ['NO_SEND_CONSUMED_INTENT', 'SEND_OUTCOME_UNKNOWN']);
  assert.equal(f.events.filter((e) => e === 'press:Enter').length, 1);
});

test('two-RPC handshake preflight rejects missing live account-control evidence', async () => {
  const f = fixture(); f.get().accountControl = { count: 0, text: null };
  await assert.rejects(prepareGeminiSend(f.page, { ...f.request, capturePreflight: undefined, preflightProof: proof() }), /account control/);
  assert.equal(f.events.length, 0);
});
