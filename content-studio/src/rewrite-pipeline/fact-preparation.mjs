import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const copy = value => structuredClone(value);
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const keyOf = ref => `${ref.url}\n${ref.sha256}`;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function sourceUrl(value) {
  let url;
  try { url = new URL(value); } catch { fail('Invalid Klaro source URL'); }
  if (url.protocol !== 'https:' || !['klaro.cz', 'www.klaro.cz'].includes(url.hostname) ||
      url.username || url.password || url.hash || url.port) fail('Source must be an exact HTTPS Klaro URL');
}
function checkRef(ref) {
  sourceUrl(ref?.url);
  if (!/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) fail('Missing exact source SHA-256');
  if (!['product', 'category'].includes(ref.kind)) fail('Source kind must be product or category');
  const identity = ref.identity;
  sourceUrl(identity?.canonicalUrl);
  if (!nonempty(identity?.h1)) fail('Missing source H1 identity');
  if (ref.kind === 'product' && !nonempty(identity?.sku)) fail('Missing product SKU identity');
}
function checkTask(task) {
  if (task.siteId !== 'promedical') fail('Wrong site for Promedical fact lane');
  if (!nonempty(task.pageId)) fail('Missing page ID');
  sourceUrl(task.primaryCategoryUrl);
  if (!Array.isArray(task.sources) || !task.sources.length) fail('Missing pinned sources');
  task.sources.forEach(checkRef);
  if (!task.sources.some(ref => ref.kind === 'category' && ref.url === task.primaryCategoryUrl)) {
    fail('Primary category must be one of this page’s pinned category sources');
  }
  const keys = task.sources.map(keyOf);
  if (new Set(keys).size !== keys.length) fail('Duplicate source pin');
  if (!Array.isArray(task.modelSkus)) fail('Explicit modelSkus list required');
  for (const ref of task.sources.filter(ref => ref.kind === 'product')) {
    if (!task.modelSkus.includes(ref.identity.sku)) fail('Product source SKU is outside this page');
  }
}
function checkDocument(ref, document) {
  if (typeof document?.content !== 'string' || sha(document.content) !== ref.sha256) fail('Source content hash mismatch');
  for (const field of ['canonicalUrl', 'h1', ...(ref.kind === 'product' ? ['sku'] : [])]) {
    if (document.identity?.[field] !== ref.identity[field]) fail(`Source identity mismatch: ${field}`);
  }
  if (document.url !== undefined && document.url !== ref.url) fail('Source URL mismatch');
  return freeze({ url: ref.url, sha256: ref.sha256, content: document.content, identity: copy(document.identity) });
}
function checkPack(task, pack, documents) {
  if (pack?.version !== 1 || pack.siteId !== task.siteId || pack.pageId !== task.pageId) fail('Fact pack page/site mismatch');
  const review = pack.sourceReview;
  if (!nonempty(review?.reviewer) || !nonempty(review?.reviewedAt) ||
      !Number.isFinite(Date.parse(review.reviewedAt)) || review.wholeDocumentsRead !== true) {
    fail('Explicit whole-source review identity required');
  }
  const own = pack.ownFactsAttestation;
  if (own?.siteId !== task.siteId || own?.pageId !== task.pageId ||
      own?.reviewer !== review.reviewer || own?.allFactsFromOwnSources !== true) {
    fail('Explicit own-page facts attestation required');
  }
  if (!Array.isArray(review.identities) || review.identities.length !== documents.length) fail('All source identities must be reviewed');
  for (const document of documents) {
    const matches = review.identities.filter(identity => keyOf(identity) === keyOf(document));
    if (matches.length !== 1 || ['canonicalUrl', 'h1', 'sku'].some(field =>
      matches[0][field] !== document.identity[field])) fail('Reviewed source identity mismatch');
  }
  if (!Array.isArray(pack.facts) || !pack.facts.length) fail('Reviewed own-page facts required');
  for (const fact of pack.facts) {
    if (!nonempty(fact.text)) fail('Empty fact');
    const ref = task.sources.find(source => keyOf(source) === keyOf(fact.source ?? {}));
    if (!ref) fail('Fact references another page’s source');
    if (ref.kind === 'product' && fact.sku !== ref.identity.sku) fail('Fact SKU does not match its product document');
    if (fact.sku !== undefined && !task.modelSkus.includes(fact.sku)) fail('Fact SKU is outside this page');
    if (ref.kind === 'category' && fact.sku !== undefined) fail('SKU facts require the individual product document');
  }
  return freeze(copy(pack));
}

/** Read-only selection from already prepared briefs. Reservations are supplied by the owner;
 * this helper is not a distributed lease and never clears a hold or writes native state. */
export function selectEligibleFactTasks({ tasks, siteId = 'promedical', heldPageIds = [],
  completedPageIds = [], inFlightPageIds = [], reservedPageIds = [] }) {
  if (!Array.isArray(tasks)) fail('tasks must be an array');
  const exclusions = [
    ['held', new Set(heldPageIds)], ['completed', new Set(completedPageIds)],
    ['in-flight', new Set(inFlightPageIds)], ['reserved', new Set(reservedPageIds)],
  ];
  const seen = new Set(), eligible = [], skipped = [];
  for (const task of tasks) {
    const reason = task.siteId !== siteId ? 'wrong-site' : seen.has(task.pageId) ? 'duplicate-page' :
      exclusions.find(([, ids]) => ids.has(task.pageId))?.[0];
    seen.add(task.pageId);
    if (reason) skipped.push({ pageId: task.pageId, status: 'skipped', reason });
    else eligible.push(task);
  }
  return { eligible, skipped };
}

/** Independent preparation lane; callbacks must read real pinned source bytes and perform
 * a real agent review or import an already reviewed pack. Existence of JSON is not acceptance.
 * Tasks: {siteId,pageId,primaryCategoryUrl,modelSkus,sources:[{url,sha256,kind,identity:{canonicalUrl,h1,sku?}}]}.
 * Packs: {version:1,siteId,pageId,facts:[{text,source:{url,sha256},sku?}],sourceReview:
 * {reviewer,reviewedAt,wholeDocumentsRead:true,identities:[{url,sha256,canonicalUrl,h1,sku?}]},
 * ownFactsAttestation:{siteId,pageId,reviewer,allFactsFromOwnSources:true}}.
 * Category grouping shares source reads only; it proves neither measured intent nor URL merge.
 * persist is caller-owned private prepared-pack storage, never a native/catalogue mutation.
 */
export async function prepareFactGroups({ tasks, existingArtifacts = {}, readSource, preparePage,
  persist, signal, concurrency = 2, selection = {} }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) fail('concurrency must be an integer from 1 to 8');
  if (![readSource, preparePage, persist].every(callback => typeof callback === 'function')) fail('All preparation callbacks are required');
  const chosen = selectEligibleFactTasks({ ...selection, tasks: copy(tasks) });
  const queue = [], outcomes = [...chosen.skipped], groupMap = new Map();
  for (const task of chosen.eligible) {
    try {
      checkTask(task);
      freeze(task);
      queue.push(task);
      if (!groupMap.has(task.primaryCategoryUrl)) groupMap.set(task.primaryCategoryUrl, []);
      groupMap.get(task.primaryCategoryUrl).push(task.pageId);
    } catch (error) { outcomes.push({ pageId: task.pageId, status: 'failed', reason: error.message }); }
  }
  const cache = new Map(), validated = new Map();
  const storedSources = new Map((existingArtifacts.sources ?? []).map(document => [keyOf(document), document]));
  const storedPacks = new Map((existingArtifacts.pages ?? []).map(pack => [pack.pageId, pack]));
  const aborted = () => { if (signal?.aborted) throw Object.assign(new Error('Preparation cancelled'), { name: 'AbortError' }); };
  async function documentFor(ref) {
    const key = keyOf(ref);
    if (!cache.has(key)) cache.set(key, (async () => {
      aborted();
      const stored = storedSources.get(key);
      const document = checkDocument(ref, stored ?? await readSource(ref, { signal }));
      aborted();
      validated.set(key, document);
      return document;
    })());
    const document = await cache.get(key);
    // Same bytes with a contradictory caller identity must not borrow the first page’s validation.
    return checkDocument(ref, document);
  }
  let next = 0;
  async function worker() {
    while (next < queue.length) {
      const task = queue[next++];
      try {
        aborted();
        const sources = [];
        for (const ref of task.sources) sources.push(await documentFor(ref));
        aborted();
        const previous = storedPacks.get(task.pageId);
        let pack;
        if (previous) {
          try { pack = checkPack(task, previous, sources); } catch { /* changed pins or invalid old pack: prepare again */ }
        }
        if (pack) { outcomes.push({ pageId: task.pageId, status: 'reused', artifact: pack }); continue; }
        pack = checkPack(task, await preparePage(task, { sources: freeze(sources), signal }), sources);
        aborted();
        await persist(pack, { task, signal });
        // A completed persist is a durable prepared pack even if cancellation arrived during it.
        outcomes.push({ pageId: task.pageId, status: 'ready', artifact: pack });
      } catch (error) {
        outcomes.push({ pageId: task.pageId, status: signal?.aborted || error.name === 'AbortError' ? 'cancelled' : 'failed', reason: error.message });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  const order = new Map(tasks.map((task, index) => [task.pageId, index]));
  outcomes.sort((a, b) => order.get(a.pageId) - order.get(b.pageId));
  return { groups: [...groupMap].map(([categoryUrl, pageIds]) => ({ categoryUrl, pageIds })),
    outcomes, sourceCache: [...validated.values()] };
}
