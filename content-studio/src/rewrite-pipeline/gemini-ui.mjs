/**
 * Page-only Gemini adapter. No browser launch, HTTP, profile, filesystem or API access.
 * Journal/capture hooks belong to the caller and MUST persist outside this module.
 * Exported browser functions can be bundled with geminiBrowserFunctionsSource() for
 * an existing Microsoft Playwright MCP page; this module is not a browser connector.
 */

export function normalizeGeminiPrompt(value) {
  return String(value).replace(/\r\n?/g, '\n').replace(/\s+/gu, ' ').trim();
}

export async function hashGeminiText(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function validateGeminiProof(proof, request, liveUrl, now = Date.now()) {
  const fail = (message) => { throw new Error(`Gemini preflight: ${message}`); };
  if (proof?.mechanism !== 'ACTUAL_PLAYWRIGHT_UI') fail('actual UI proof required');
  const age = now - Date.parse(proof.at);
  const maxAge = request.proofMaxAgeMs ?? 120_000;
  if (!Number.isFinite(maxAge) || maxAge <= 0 || maxAge > 120_000) fail('invalid proof freshness limit');
  if (!Number.isFinite(age) || age < -5_000 || age > maxAge) fail('stale/future proof');
  let actual;
  try { actual = new URL(liveUrl); } catch { fail('invalid live URL'); }
  const accountPath = actual.origin === 'https://gemini.google.com'
    ? actual.pathname.match(/^\/u\/([2-6])\/app(?:\/|$)/)?.[1] : null;
  if (!accountPath || proof.accountPath !== `/u/${accountPath}`) fail('account path mismatch or forbidden account');
  if (!request.expectedAccount || proof.accountIdentity !== request.expectedAccount) fail('identity mismatch');
  for (const field of ['ax', 'dom', 'png']) {
    if (typeof proof.refs?.[field] !== 'string' || !proof.refs[field].trim()) fail(`missing ${field} proof reference`);
  }
  if (proof.model?.label !== '4 Argon' || proof.model.selected !== true || proof.model.enabled !== true || proof.model.expanded !== true) fail('selected enabled expanded 4 Argon required');
  if (!['Low', 'Žema'].includes(proof.thinking?.label) || proof.thinking.selected !== true || proof.thinking.enabled !== true || proof.thinking.expanded !== true) fail('selected enabled expanded Low/Žema required');
  return { ...proof, backendModelId: null };
}

export async function readGeminiUi(page, selectors) {
  for (const key of ['editor', 'query', 'queryText', 'response', 'responseText', 'stop', 'blocks', 'responseComplete']) {
    if (typeof selectors?.[key] !== 'string' || !selectors[key].trim()) throw new Error(`Observed unique selectors required: ${key}`);
  }
  return page.evaluate((s) => {
    const editors = [...document.querySelectorAll(s.editor)];
    const editor = editors.length === 1 ? editors[0] : null;
    const rect = editor?.getBoundingClientRect();
    const style = editor ? getComputedStyle(editor) : null;
    const isInput = editor && /^(TEXTAREA|INPUT)$/.test(editor.tagName);
    const editorText = editor ? (isInput ? editor.value : editor.innerText) : null;
    const accounts = s.accountControl ? [...document.querySelectorAll(s.accountControl)] : [];
    const accountControl = accounts.length === 1 ? [accounts[0].getAttribute('aria-label'), accounts[0].getAttribute('title'), accounts[0].textContent].filter(Boolean).join('\n') : null;
    const queries = [...document.querySelectorAll(s.query)].map((node, index) => {
      const textNode = node.querySelector(s.queryText);
      // Gemini's visually-hidden "You said" summary repeats a truncated prompt.
      // Preserve it verbatim as renderedText/HTML, but compare the observed real
      // paragraph lines when this UI shape is present. Never trim arbitrary prose.
      const lines = textNode ? [...textNode.querySelectorAll('p.query-text-line')] : [];
      const renderedText = textNode?.innerText ?? null;
      return { index, id: node.id || node.getAttribute('data-query-id') || null, text: lines.length ? lines.map(line => line.innerText).join('\n') : renderedText, renderedText, html: node.outerHTML };
    });
    const responses = [...document.querySelectorAll(s.response)].map((node, index) => {
      const content = node.querySelector(s.responseText);
      return {
        index, id: content?.id || node.id || null,
        text: content?.innerText ?? '', html: content?.innerHTML ?? '', responseHtml: node.outerHTML,
        blocks: content ? [...content.querySelectorAll(s.blocks)].map((b) => ({ tag: b.tagName.toLowerCase(), text: b.innerText, html: b.outerHTML, anchors: [...b.querySelectorAll('a[href]')].map((a) => ({ url: a.href, label: a.textContent.trim() })) })) : [],
        orderedAnchors: content ? [...content.querySelectorAll('a[href]')].map((a) => ({ url: a.href, label: a.textContent.trim() })) : [],
        completionMarker: !!node.querySelector(s.responseComplete),
      };
    });
    return {
      at: new Date().toISOString(), url: location.href, visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(), innerWidth, innerHeight,
      accountControl: { count: accounts.length, text: accountControl },
      editor: {
        count: editors.length, text: editorText,
        visible: !!editor && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0,
        enabled: !!editor && !editor.disabled && editor.getAttribute('aria-disabled') !== 'true' && (isInput || editor.isContentEditable),
      },
      queries, responses,
      stopControls: [...document.querySelectorAll(s.stop)].map((node) => ({ label: node.getAttribute('aria-label'), text: node.innerText })),
      stopCount: document.querySelectorAll(s.stop).length,
    };
  }, selectors);
}

/** Shared live-state validation used by the two-RPC host handshake. */
export function verifyPreparedGeminiState(actual, prepared) {
  if (actual.visibilityState !== 'visible') throw new Error('Gemini document must be visible in its active, non-minimized window; no send');
  if (actual.url !== prepared.before.url || actual.stopCount || actual.editor.count !== 1 || !actual.editor.visible || !actual.editor.enabled || actual.editor.text !== prepared.before.editor.text || normalizeGeminiPrompt(actual.editor.text ?? '') !== normalizeGeminiPrompt(prepared.prompt)) throw new Error('Prepared editor/context changed; no send');
  if (actual.accountControl?.count !== 1 || !actual.accountControl.text?.includes(prepared.proof.accountIdentity)) throw new Error('Actual account control changed or unavailable; no send');
  const history = (state) => ({ queries: state.queries.map((q) => ({ id: q.id, index: q.index, text: q.text })), responses: state.responses.map((r) => ({ id: r.id, index: r.index, text: r.text, html: r.html, completionMarker: r.completionMarker })) });
  if (JSON.stringify(history(actual)) !== JSON.stringify(history(prepared.before))) throw new Error('Prepared conversation history changed; observe only');
}

/**
 * Official MCP RPC 1: read/prove only. The host must durably store this exact
 * returned preparation in its existing RESULT and mark ATTEMPTED before RPC 2.
 * No journal callbacks or pretend persistence occur inside the browser function.
 */
export async function prepareGeminiSend(page, request) {
  const { batchId, prompt, expectedAccount, selectors } = request ?? {};
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,119}$/.test(batchId ?? '') || typeof prompt !== 'string' || !prompt.includes(`BATCH_ID: ${batchId}`)) throw new Error('Unique batchId and exact BATCH_ID prompt required');
  if (!selectors?.accountControl) throw new Error('Freshly observed accountControl selector required for host handshake');
  const capturedProof = request.capturePreflight ? await request.capturePreflight(page) : request.preflightProof;
  const before = await readGeminiUi(page, selectors);
  const proof = validateGeminiProof(capturedProof, request, before.url);
  if (before.queries.length !== before.responses.length || before.responses.some((r) => !r.id || !r.text.trim() || !r.completionMarker)) throw new Error('Previous conversation is not fully retained/completed; observe only');
  if (before.queries.some((q) => q.text?.includes(`BATCH_ID: ${batchId}`))) throw new Error('Batch already appears in actual history; observe, never resend');
  const preparedId = globalThis.crypto.randomUUID();
  const prepared = {
    kind: 'PREPARED_GEMINI_SEND', version: 1, preparedId, batchId, preparedAt: new Date().toISOString(),
    prompt, promptSha256: await hashGeminiText(prompt), normalizedPromptSha256: await hashGeminiText(normalizeGeminiPrompt(prompt)),
    editorSha256: await hashGeminiText(before.editor.text ?? ''), expectedAccount, selectors, proof,
    proofMaxAgeMs: request.proofMaxAgeMs ?? 120_000, before,
    preQueryIds: before.queries.map((q) => q.id), preResponseIds: before.responses.map((r) => r.id),
    intent: { kind: 'GEMINI_SEND_INTENT', preparedId, batchId, accountPath: proof.accountPath, transport: 'PLAYWRIGHT_LOCATOR_ENTER', retryAllowed: false },
  };
  verifyPreparedGeminiState(before, prepared);
  prepared.preparedSha256 = await hashGeminiText(JSON.stringify(prepared));
  return prepared;
}

/**
 * Official MCP RPC 2. persistedIntent is the HOST's durable ATTEMPTED receipt,
 * not proof manufactured here. The host must not redeliver any ATTEMPTED record,
 * including after RPC timeout/page navigation/browser restart. A page-global guard
 * additionally prevents repeated Enter on the same live document. This is no
 * distributed exactly-once guarantee: uncertain delivery is retained as UNKNOWN.
 */
export async function dispatchPreparedGeminiSend(page, request) {
  const { prepared, persistedIntent: receipt } = request ?? {};
  if (prepared?.kind !== 'PREPARED_GEMINI_SEND' || prepared.version !== 1 || !prepared.preparedId || !prepared.expectedAccount) throw new Error('Exact verified preparation required');
  const { preparedSha256, ...payload } = prepared;
  if (await hashGeminiText(JSON.stringify(payload)) !== preparedSha256 || await hashGeminiText(prepared.prompt) !== prepared.promptSha256 || await hashGeminiText(normalizeGeminiPrompt(prepared.prompt)) !== prepared.normalizedPromptSha256 || await hashGeminiText(prepared.before.editor.text ?? '') !== prepared.editorSha256) throw new Error('Preparation hash binding mismatch; no send');
  const attemptAge = Date.now() - Date.parse(receipt?.attemptedAt);
  if (receipt?.durable !== true || receipt.state !== 'ATTEMPTED' || receipt.batchId !== prepared.batchId || receipt.preparedId !== prepared.preparedId || receipt.preparedSha256 !== preparedSha256 || receipt.promptSha256 !== prepared.promptSha256 || !receipt.attemptId || !receipt.recordRef || !Number.isFinite(attemptAge) || attemptAge < -5_000 || attemptAge > 120_000 || Date.parse(receipt.attemptedAt) < Date.parse(prepared.preparedAt) - 5_000) throw new Error('Host durable ATTEMPTED receipt binding missing/mismatched; no send');
  const actual = await readGeminiUi(page, prepared.selectors);
  validateGeminiProof(prepared.proof, { expectedAccount: prepared.expectedAccount, proofMaxAgeMs: prepared.proofMaxAgeMs }, actual.url);
  verifyPreparedGeminiState(actual, prepared);
  const claim = await page.evaluate(({ preparedId, attemptId, batchId }) => {
    const key = Symbol.for('pinet.gemini.consumed.dispatches');
    if (!globalThis[key]) Object.defineProperty(globalThis, key, { value: new Map(), configurable: false, enumerable: false });
    if (globalThis[key].has(preparedId) || [...globalThis[key].values()].some((entry) => entry.batchId === batchId)) return { claimed: false };
    globalThis[key].set(preparedId, { attemptId, batchId, consumedAt: new Date().toISOString() });
    return { claimed: true };
  }, { preparedId: prepared.preparedId, attemptId: receipt.attemptId, batchId: prepared.batchId });
  if (claim?.claimed !== true) return { status: 'NO_SEND_CONSUMED_INTENT', batchId: prepared.batchId, retryAllowed: false, completedResponse: false };
  let transportError = null;
  const enterAttemptedAt = new Date().toISOString();
  try { await page.locator(prepared.selectors.editor).press('Enter', { timeout: Math.min(request.sendTimeoutMs ?? 5_000, 10_000) }); }
  catch (error) { transportError = String(error.message ?? error); }
  const deadline = Date.now() + Math.max(0, Math.min(request.ackTimeoutMs ?? 15_000, 30_000));
  let observed = actual;
  try {
    do {
      observed = await readGeminiUi(page, prepared.selectors);
      const candidates = observed.queries.filter((q) => q.index >= prepared.before.queries.length && q.text?.includes(`BATCH_ID: ${prepared.batchId}`) && normalizeGeminiPrompt(q.text) === normalizeGeminiPrompt(prepared.prompt));
      const url = new URL(observed.url);
      const appPath = `${prepared.proof.accountPath}/app`;
      if (candidates.length === 1 && url.origin === 'https://gemini.google.com' && (url.pathname === appPath || url.pathname.startsWith(`${appPath}/`))) return { status: 'QUERY_ACKNOWLEDGED', batchId: prepared.batchId, retryAllowed: false, completedResponse: false, intentId: receipt.attemptId, preparedId: prepared.preparedId, enterAttemptedAt, preparedToEnterMs: Date.parse(enterAttemptedAt)-Date.parse(prepared.preparedAt), conversationUrl: observed.url, retainedConversationUrl: url.pathname.length > appPath.length + 1 ? observed.url : null, queryId: candidates[0].id, queryIndex: candidates[0].index, query: candidates[0], baselineResponseCount: prepared.before.responses.length, baselineResponseIds: prepared.preResponseIds, at: observed.at, transportError, observed };
      if (Date.now() >= deadline) break;
      await page.waitForTimeout(Math.min(250, Math.max(1, deadline - Date.now())));
    } while (Date.now() <= deadline);
  } catch (error) { transportError = [transportError, String(error.message ?? error)].filter(Boolean).join('; '); }
  return { status: 'SEND_OUTCOME_UNKNOWN', batchId: prepared.batchId, intentId: receipt.attemptId, preparedId: prepared.preparedId, enterAttemptedAt, preparedToEnterMs: Date.parse(enterAttemptedAt)-Date.parse(prepared.preparedAt), retryAllowed: false, completedResponse: false, transportError, observed };
}

/**
 * journal.read(batchId) -> null or an existing attempt (any attempt prevents replay).
 * journal.writeIntent(intent) -> {durable:true,intentId,batchId,promptNormalized}.
 * It MUST atomically create-if-absent, then be readable before Enter. Returning a
 * receipt without durable persistence violates this adapter's caller contract.
 * writeOutcome is best-effort after dispatch; a surviving intent always blocks retry.
 */
export async function sendGeminiOnce(page, request) {
  const { batchId, prompt, journal } = request ?? {};
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,119}$/.test(batchId ?? '')) throw new Error('Unique safe batchId required');
  if (typeof prompt !== 'string' || !prompt.includes(`BATCH_ID: ${batchId}`)) throw new Error('Exact BATCH_ID marker required in prompt');
  if (!journal?.read || !journal?.writeIntent || !journal?.writeOutcome || !request.capturePreflight) throw new Error('Durable journal and actual proof hooks required');
  // An in-memory guard complements, but never replaces, atomic durable intent.
  const guardKey = Symbol.for('pinet.gemini.send.inflight');
  if (page[guardKey]) throw new Error('This Gemini page already has an in-flight send');
  page[guardKey] = true;
  let dispatched = false;
  let intent;
  try {
    if (await journal.read(batchId)) return { status: 'NO_SEND_EXISTING_ATTEMPT', batchId, retryAllowed: false };
    const capturedProof = await request.capturePreflight(page);
    const before = await readGeminiUi(page, request.selectors);
    const proof = validateGeminiProof(capturedProof, request, before.url);
    if (before.visibilityState !== 'visible') throw new Error('Gemini document must be visible in its active, non-minimized window; no send');
    if (before.stopCount || before.editor.count !== 1 || !before.editor.visible || !before.editor.enabled) throw new Error('Editor not uniquely visible/enabled or response still running');
    if (before.queries.length !== before.responses.length || before.responses.some((r) => !r.id || !r.text.trim() || !r.completionMarker)) throw new Error('Previous conversation is not fully retained/completed; observe only');
    const normalized = normalizeGeminiPrompt(prompt);
    if (normalizeGeminiPrompt(before.editor.text ?? '') !== normalized) throw new Error('Actual editor differs from exact normalized prompt');
    if (before.queries.some((q) => q.text?.includes(`BATCH_ID: ${batchId}`))) throw new Error('Batch already appears in actual history; observe, never resend');
    intent = { batchId, at: new Date().toISOString(), prompt, promptNormalized: normalized, accountPath: proof.accountPath, accountIdentity: proof.accountIdentity, preflightProof: proof, before, transport: 'PLAYWRIGHT_LOCATOR_ENTER', retryAllowed: false };
    const receipt = await journal.writeIntent(intent);
    const persisted = await journal.read(batchId);
    if (receipt?.durable !== true || !receipt.intentId || receipt.batchId !== batchId || receipt.promptNormalized !== normalized || persisted?.intentId !== receipt.intentId || persisted?.promptNormalized !== normalized) throw new Error('Intent durability/readback not confirmed; no dispatch');
    const latest = await readGeminiUi(page, request.selectors);
    validateGeminiProof(proof, request, latest.url);
    if (latest.visibilityState !== 'visible' || latest.url !== before.url || latest.stopCount || latest.queries.length !== before.queries.length || latest.responses.length !== before.responses.length || latest.editor.count !== 1 || !latest.editor.visible || !latest.editor.enabled || normalizeGeminiPrompt(latest.editor.text ?? '') !== normalized) throw new Error('UI changed after intent; keep intent and do not dispatch/retry');
    // Mark ambiguity BEFORE awaiting the transport. A timeout may follow delivery.
    dispatched = true;
    let transportError = null;
    try { await page.locator(request.selectors.editor).press('Enter', { timeout: Math.min(request.sendTimeoutMs ?? 5_000, 10_000) }); }
    catch (error) { transportError = String(error.message ?? error); }
    const timeout = Math.max(0, Math.min(request.ackTimeoutMs ?? 15_000, 30_000));
    const deadline = Date.now() + timeout;
    let actual;
    do {
      actual = await readGeminiUi(page, request.selectors);
      const candidates = actual.queries.filter((q) => q.index >= before.queries.length && q.text?.includes(`BATCH_ID: ${batchId}`) && normalizeGeminiPrompt(q.text) === normalized);
      const url = new URL(actual.url);
      const appPath = `${proof.accountPath}/app`;
      const correctApp = url.origin === 'https://gemini.google.com' && (url.pathname === appPath || url.pathname.startsWith(`${appPath}/`));
      if (candidates.length === 1 && correctApp) {
        const outcome = { status: 'QUERY_ACKNOWLEDGED', batchId, retryAllowed: false, completedResponse: false, intentId: receipt.intentId, conversationUrl: actual.url, retainedConversationUrl: url.pathname.length > appPath.length + 1 ? actual.url : null, queryId: candidates[0].id, queryIndex: candidates[0].index, query: candidates[0], baselineResponseCount: before.responses.length, baselineResponseIds: before.responses.map((r) => r.id), at: actual.at, transportError, observed: actual };
        try { await journal.writeOutcome(outcome); } catch (error) { outcome.journalError = String(error.message ?? error); }
        return outcome;
      }
      if (Date.now() >= deadline) break;
      await page.waitForTimeout(Math.min(250, Math.max(1, deadline - Date.now())));
    } while (Date.now() <= deadline);
    const outcome = { status: 'SEND_OUTCOME_UNKNOWN', batchId, intentId: receipt.intentId, retryAllowed: false, completedResponse: false, transportError, observed: actual };
    try { await journal.writeOutcome(outcome); } catch (error) { outcome.journalError = String(error.message ?? error); }
    return outcome;
  } catch (error) {
    if (!dispatched) throw error;
    const outcome = { status: 'SEND_OUTCOME_UNKNOWN', batchId, retryAllowed: false, completedResponse: false, error: String(error.message ?? error) };
    try { await journal.writeOutcome(outcome); } catch { /* durable intent remains the replay barrier */ }
    return outcome;
  } finally { page[guardKey] = false; }
}

/**
 * Observe only. Query acknowledgement is never a completed-authored-text claim.
 * captureRaw MUST create an immutable new artifact per changed version and return
 * {durable:true,ref}. It must never overwrite earlier actual originals.
 */
export async function observeGeminiResponse(page, request) {
  const ack = request?.acknowledgement;
  if (ack?.status !== 'QUERY_ACKNOWLEDGED' || ack.retryAllowed !== false || !Number.isInteger(ack.queryIndex) || !Number.isInteger(ack.baselineResponseCount) || !Array.isArray(ack.baselineResponseIds) || !ack.query?.text || !request.captureRaw || !request.capturePostflight) throw new Error('Acknowledged query and immutable capture hooks required');
  const deadline = Date.now() + Math.max(0, Math.min(request.responseTimeoutMs ?? 45_000, 60_000));
  let previous = null;
  let last = null;
  let lastCaptured = null;
  let expectedUrl = ack.conversationUrl;
  let awaitingConversationUrl = ack.retainedConversationUrl === null;
  do {
    const actual = await readGeminiUi(page, request.selectors);
    last = actual;
    // The UI can acknowledge a query before allocating its conversation URL.
    // Permit that initial transition only; the exact query is rechecked below.
    const initialUrl = new URL(expectedUrl), currentUrl = new URL(actual.url);
    const allocatedAfterAck = awaitingConversationUrl && /^\/u\/[2-6]\/app$/.test(initialUrl.pathname) && currentUrl.origin === initialUrl.origin && currentUrl.pathname.startsWith(initialUrl.pathname + '/');
    if (actual.url !== expectedUrl && !allocatedAfterAck) return { status: 'RESPONSE_CONTEXT_CHANGED', retryAllowed: false, observed: actual };
    if (allocatedAfterAck) { expectedUrl = actual.url; awaitingConversationUrl = false; }
    const query = actual.queries[ack.queryIndex];
    if (!query || normalizeGeminiPrompt(query.text ?? '') !== normalizeGeminiPrompt(ack.query.text)) return { status: 'QUERY_NOT_RETAINED', retryAllowed: false, observed: actual };
    const candidates = actual.responses.filter((r) => r.index >= ack.baselineResponseCount && !ack.baselineResponseIds.includes(r.id) && r.id && r.text.trim());
    // A later user query would make positional response association ambiguous.
    if (actual.queries.length !== ack.queryIndex + 1 || candidates.length > 1) return { status: 'RESPONSE_ASSOCIATION_AMBIGUOUS', retryAllowed: false, observed: actual };
    const current = candidates[0];
    if (current) {
      const raw = { kind: 'ACTUAL_RENDERED_GEMINI_RESPONSE', at: actual.at, url: actual.url, conversationUrl: actual.url, batchId: ack.batchId, intentId: ack.intentId, responseIndex: current.index, responseId: current.id, queryIndex: ack.queryIndex, queryId: query.id, queryText: query.text, queries: actual.queries, queryCount: actual.queries.length, responseCount: actual.responses.length, text: current.text, html: current.html, responseHtml: current.responseHtml, blocks: current.blocks, orderedAnchors: current.orderedAnchors, stopControls: actual.stopControls, stopCount: actual.stopCount, completionMarker: current.completionMarker };
      const signature = JSON.stringify([current.id, current.text, current.html, current.blocks, current.orderedAnchors]);
      // Save each new actual version immediately, before further waits or dialogs.
      if (signature !== lastCaptured) {
        const receipt = await request.captureRaw(raw);
        if (receipt?.durable !== true || !receipt.ref) throw new Error('Full raw capture not durably retained');
        lastCaptured = signature;
      }
      if (previous === signature && actual.stopCount === 0 && current.completionMarker) {
        const proof = validateGeminiProof(await request.capturePostflight(page), request, actual.url);
        const recheck = await readGeminiUi(page, request.selectors);
        const retained = recheck.responses[current.index];
        if (recheck.url !== actual.url || recheck.stopCount || recheck.queries.length !== actual.queries.length || !retained || !retained.completionMarker || JSON.stringify([retained.id, retained.text, retained.html, retained.blocks, retained.orderedAnchors]) !== signature) return { status: 'RESPONSE_CHANGED_DURING_POST_PROOF', retryAllowed: false, observed: recheck };
        const result = { status: 'COMPLETE_RESPONSE_CAPTURED', batchId: ack.batchId, intentId: ack.intentId, retryAllowed: false, raw, postflightProof: proof, authorshipAccepted: false, limitation: 'Actual rendered UI completion and retained text; no backend model ID or editorial acceptance claim.' };
        if (request.journal?.writeOutcome) await request.journal.writeOutcome(result);
        return result;
      }
      previous = signature;
    } else previous = null;
    if (Date.now() >= deadline) break;
    await page.waitForTimeout(Math.min(request.pollMs ?? 500, Math.max(1, deadline - Date.now())));
  } while (Date.now() <= deadline);
  return { status: 'RESPONSE_PENDING_OR_UNCERTAIN', retryAllowed: false, observed: last };
}

export function buildAuthorPrompt({ batchId, pages, examples, commonMistakes }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,119}$/.test(batchId ?? '')) throw new Error('Unique batchId required');
  if (!Array.isArray(pages) || !pages.length || pages.length > 3) throw new Error('One to three independent page jobs required');
  if (!Array.isArray(examples) || examples.length !== 2 || examples.some((e) => e.accepted !== true || typeof e.text !== 'string' || !e.text.trim() || !e.reference)) throw new Error('Exactly two referenced accepted examples required');
  if (!Array.isArray(commonMistakes) || commonMistakes.length < 1 || commonMistakes.length > 12 || commonMistakes.some((m) => typeof m !== 'string' || !m.trim() || m.length > 500)) throw new Error('One to twelve concise factual/language corrections required');
  const ids = new Set();
  const headings = new Set();
  const jobs = pages.map((p) => {
    if (!p.id || ids.has(p.id) || typeof p.h1 !== 'string' || !p.h1.trim() || /[\r\n]/.test(p.h1) || headings.has(p.h1.trim()) || !p.readerJob || !Array.isArray(p.facts) || !p.facts.length || !Array.isArray(p.limits) || !Array.isArray(p.sources) || !p.sources.length || !Array.isArray(p.links) || ![1, 2].includes(p.paragraphCount)) throw new Error('Each distinct page needs id/exact unique h1/readerJob/facts/limits/sources/links and one or two paragraphs');
    ids.add(p.id);
    headings.add(p.h1.trim());
    for (const source of p.sources) {
      const url = new URL(source.url);
      if (!['https:', 'http:'].includes(url.protocol) || !source.label || !source.documentRole) throw new Error('Each primary source needs URL, label and its own document role');
    }
    for (const link of p.links) { if (!/^https?:\/\//.test(link.url) || !link.label) throw new Error('Exact URL and label required'); }
    return { id: p.id, h1: p.h1, readerJob: p.readerJob, paragraphCount: p.paragraphCount, facts: p.facts, limits: p.limits, sources: p.sources, links: p.links };
  });
  return [
    `BATCH_ID: ${batchId}`,
    'Parašyk savarankiškus lietuviškus katalogo tekstus patyrusiam medicinos darbuotojui ar įrangos pirkėjui. Kiekvienas puslapis atsako tik į savo skaitytojo klausimą. Rašyk natūraliai, rišliai, be bendrinių procedūrinių įvadų.',
    'Kiekvieno puslapio vienintelis skirtukas yra tikslus užduoties h1 tekstas kaip H1 antraštė (Markdown #). Po jos pateik vieną paprastą metaaprašymo pastraipą iki 160 simbolių, tada tikslų paragraphCount nurodytą vienos arba dviejų pagrindinio teksto pastraipų skaičių. Po jų atskiroje paprastoje pastraipoje pateik PRIVATE_SOURCE_JSON: [{"url":"...","label":"...","reason":"..."}]. Nenaudok papildomų antraščių, skiriamųjų linijų, kodų blokų ar atskirų PAGE_ID, DESCRIPTION, BODY žymų. Reason iki 60 žodžių apibūdina tik to dokumento turinį. Techninius duomenis priskirk individualiai produkto kortelei, kategorijos sąrašą naudok asortimentui. Nuorodų aibės tekste ir šaltinių sąraše turi sutapti; eilė gali skirtis.',
    'Skaičius, vienetus, modelius, URL ir faktų sąlygas išsaugok. Komponento apkrova nėra viso gaminio apkrova; šeimos pavyzdys nėra nekintamas komplektas; matomas priedas neįrodo įtraukimo į kainą. „Vienduris/viendurė“ keisk į „vienų durų“. „Bėgeliai“ tinka laikymo/stalčių dalims, ne ratukų krypties fiksavimui.',
    'Šios užduoties BATCH_ID, PAGE_ID ir id, redakcinės ribos ir tikrinimo instrukcijos yra privatūs: jų neperkelk į atsakymą, aprašymą ar pagrindinį tekstą. Pavyzdžiai rodo kalbos kokybę, jų faktų ir formuluočių nekopijuok į kitus modelius.',
    `ANKSTESNIŲ KLAIDŲ TAISYKLĖS:\n${commonMistakes.map((m) => `- ${m}`).join('\n')}`,
    `DU PRIIMTI PAVYZDŽIAI:\n${examples.map((e, i) => `PAVYZDYS ${i + 1} (${e.reference}):\n${e.text}`).join('\n\n')}`,
    `KONKREČIOS UŽDUOTYS:\n${JSON.stringify(jobs, null, 2)}`,
    'Prieš grąžindamas pats perskaityk visus tekstus: patikrink kalbą, faktų ribas, aprašymų ilgį ir kiekvieną šaltinio reason. Grąžink visus puslapius užduočių eilės tvarka, kiekvieną pradėdamas tikslia jo H1 antrašte. Šaltinių JSON nelaikyk pagrindinio teksto dalimi.',
  ].join('\n\n');
}

/** A reviewed launch proposal, not a command or evidence that flags took effect. */
export function buildChromeLaunchPlan({ existingSignedInProfile, nonMinimized, chromeAlreadyRunning }) {
  if (existingSignedInProfile !== true || nonMinimized !== true || typeof chromeAlreadyRunning !== 'boolean') throw new Error('Existing signed-in profile, non-minimized window and actual process state required');
  return {
    browser: 'Existing signed-in Chrome profile via Microsoft Playwright MCP extension',
    requestedFlags: ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
    ownNonMinimizedWindow: true, isolatedProfileAllowed: false, restartOtherChromeAllowed: false,
    flagsVerifiedEffective: false,
    requiresLaunchVerification: true,
    limitation: chromeAlreadyRunning ? 'A new window in an already running Chrome process does not prove new launch flags took effect. Do not restart or kill other windows; verify actual launch separately or leave flags unverified.' : 'Requested flags are only a plan until the actual process launch is verified. This module does not launch Chrome.',
  };
}

/** Dependencies included so the two page-only operations can be pasted into MCP. */
export function geminiBrowserFunctionsSource() {
  return [normalizeGeminiPrompt, hashGeminiText, validateGeminiProof, readGeminiUi, verifyPreparedGeminiState, prepareGeminiSend, dispatchPreparedGeminiSend, sendGeminiOnce, observeGeminiResponse].map((fn) => fn.toString()).join('\n\n');
}
