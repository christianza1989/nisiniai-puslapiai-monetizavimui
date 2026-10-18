import { createHash } from 'node:crypto';

// Core V1 retains up to 20 externalLinks. Keep this pipeline's explicit per-page
// count bounded below that limit without dropping legitimate four-source briefs.
export const MAX_SOURCE_REASONS = 10;

const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
const fail = message => { throw new Error(`Captured response: ${message}`); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function text(value, name, max = 1000000) {
  if (typeof value !== 'string' || !value || !value.isWellFormed() || value.length > max) fail(`invalid ${name}`);
  return value;
}
function pairs(items) {
  if (!Array.isArray(items)) fail('anchor array required');
  return items.map(item => {
    const url = text(item?.url, 'anchor URL', 2048), label = text(item?.label, 'anchor label', 500);
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || label.trim() !== label) fail('invalid anchor pair');
    return { url, label };
  });
}
function decodeHtml(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-zA-Z]+);/giu, (_, entity) => {
    if (entity[0] === '#') {
      const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      if (!Number.isInteger(n) || n <= 0 || n > 0x10ffff || n >= 0xd800 && n <= 0xdfff) fail('invalid HTML character reference');
      return String.fromCodePoint(n);
    }
    if (!(entity in named)) fail(`unsupported named HTML entity ${entity}`);
    return named[entity];
  });
}
function htmlAnchors(html) {
  const found = [];
  const pattern = /<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/a\s*>/giu;
  for (const match of html.matchAll(pattern)) {
    const href = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)')/iu.exec(match[1]);
    if (!href) fail('HTML anchor missing quoted href');
    const label = decodeHtml(match[2].replace(/<!--[\s\S]*?-->/gu, '').replace(/<[^>]*>/gu, '')).trim();
    found.push({ url: decodeHtml(href[1] ?? href[2]), label });
  }
  if ([...html.matchAll(/<a(?:\s|>)/giu)].length !== found.length) fail('unsupported or unclosed HTML anchor');
  return pairs(found);
}

function selectResponse(raw, selection) {
  if (!raw || typeof raw.at !== 'string' || raw.at.trim() !== raw.at || !Number.isFinite(Date.parse(raw.at))) fail('actual container timestamp required');
  const conversation = new URL(text(raw.url, 'conversation URL', 2048));
  if (conversation.protocol !== 'https:' || conversation.hostname !== 'gemini.google.com' || conversation.username || conversation.password ||
      !/^\/u\/[2-6]\/app\/[a-zA-Z0-9_-]+\/?$/u.test(conversation.pathname) || conversation.search || conversation.hash)
    fail('actual allowed Gemini conversation URL required');
  if (!Number.isInteger(selection.responseIndex) || selection.responseIndex < 0 || typeof selection.responseId !== 'string' || !selection.responseId)
    fail('explicit response index and ID required');
  const layout = Array.isArray(raw.responses) ? 'responses-array' : 'flat';
  const stop = layout === 'flat' ? raw.stopControls : raw.stopButtons;
  if (!Array.isArray(stop) || stop.length || raw.completed === false || raw.generationComplete === false) fail('actual completed/noStop metadata required');
  for (const field of ['stopControls', 'stopButtons'])
    if (raw[field] !== undefined && (!Array.isArray(raw[field]) || raw[field].length)) fail('contradictory Stop metadata');
  if (!Array.isArray(raw.queries) || !raw.queries.length || raw.queries.length <= selection.responseIndex) fail('actual query history missing');
  let selected, anchorField, blockAnchorField;
  if (layout === 'flat') {
    if (raw.responseIndex !== selection.responseIndex || !Number.isInteger(raw.responseCount) || raw.responseCount <= selection.responseIndex ||
        raw.queryCount !== raw.queries.length) fail('flat response/query counters mismatch');
    selected = raw; anchorField = 'orderedAnchors'; blockAnchorField = 'anchors';
  } else {
    selected = raw.responses[selection.responseIndex]; anchorField = 'orderedLinks'; blockAnchorField = 'links';
    if (raw.responseCount !== undefined && raw.responseCount !== raw.responses.length) fail('response array count mismatch');
    if (raw.queryCount !== undefined && raw.queryCount !== raw.queries.length) fail('query array count mismatch');
  }
  if (!selected || (layout === 'flat' ? selected.responseId : selected.id) !== selection.responseId) fail('explicit selected response ID mismatch');
  if (selected.completed === false || selected.generationComplete === false) fail('selected response incomplete');
  const wholeText = text(selected.text, 'whole text'), html = text(selected.html, 'whole HTML');
  if (!Array.isArray(selected.blocks) || !selected.blocks.length) fail('whole actual block array required');
  let textAt = 0, htmlAt = 0;
  const blocks = selected.blocks.map((block, index) => {
    const blockText = text(block.text, 'block text'), blockHtml = text(block.html, 'block HTML');
    if (typeof block.tag !== 'string' || !/^[a-zA-Z][a-zA-Z0-9]*$/u.test(block.tag)) fail('actual block tag required');
    const found = html.indexOf(blockHtml, htmlAt);
    if (found < 0) fail('actual block HTML missing or reordered');
    htmlAt = found + blockHtml.length;
    const renderedText = decodeHtml(blockHtml.replace(/<!--[\s\S]*?-->/gu, '').replace(/<br\s*\/?\s*>/giu, '\n').replace(/<[^>]*>/gu, '')).trim();
    if (renderedText !== blockText) fail('block HTML/text mismatch');
    const anchors = pairs(block[blockAnchorField]);
    if (!equal(htmlAnchors(blockHtml), anchors)) fail('block HTML/anchor pairs mismatch');
    const out = { index, tag: block.tag.toUpperCase(), text: blockText, html: blockHtml, anchors,
      startUtf16: textAt, endUtf16Exclusive: textAt + blockText.length };
    textAt += blockText.length + 2;
    return out;
  });
  if (blocks.map(block => block.text).join('\n\n') !== wholeText) fail('whole block/text join mismatch');
  const orderedAnchors = pairs(selected[anchorField]);
  if (!equal(blocks.flatMap(block => block.anchors), orderedAnchors) || !equal(htmlAnchors(html), orderedAnchors))
    fail('whole HTML/block/global anchor pairs mismatch');
  if ([...html.matchAll(/<h1(?:\s|>)/giu)].length !== blocks.filter(block => block.tag === 'H1').length) fail('unmapped HTML H1');
  return { at: raw.at, url: raw.url, responseIndex: selection.responseIndex, responseId: selection.responseId,
    layout, text: wholeText, html, blocks, orderedAnchors, completed: true, noStop: true, evidenceKind: 'rendered_dom_text_html' };
}

// Structural extraction is not source verification, factual acceptance or Copy proof.
// Global capture inconsistencies throw; an own-page content error rejects only that page.
export function selectCapturedPages(raw, selection) {
  if (!selection || !Array.isArray(selection.pages) || !selection.pages.length) fail('expected page specs required');
  const ids = new Set(), titles = new Set();
  for (const page of selection.pages) {
    text(page.pageId, 'page ID', 120); text(page.title, 'expected title', 300);
    if (ids.has(page.pageId) || titles.has(page.title)) fail('duplicate expected page ID/title');
    if (!Number.isInteger(page.bodyParagraphCount) || page.bodyParagraphCount < 1 || page.bodyParagraphCount > 2 ||
        !Number.isInteger(page.sourceReasonCount) || page.sourceReasonCount < 1 || page.sourceReasonCount > MAX_SOURCE_REASONS) fail('invalid expected page shape');
    ids.add(page.pageId); titles.add(page.title);
  }
  const response = selectResponse(raw, selection), headings = response.blocks.filter(block => block.tag === 'H1');
  if (!headings.length || headings[0].index !== 0) fail('unmapped response prefix/no H1');
  const seenTitles = new Set();
  for (const heading of headings) {
    if (!titles.has(heading.text) || seenTitles.has(heading.text)) fail('extra, unmapped or duplicate actual H1');
    seenTitles.add(heading.text);
    if (heading.anchors.length) fail('unexpected H1 anchors');
  }
  const outcomes = selection.pages.map(spec => {
    try {
      const h = headings.find(block => block.text === spec.title);
      if (!h) fail('expected H1 missing');
      const next = headings.find(block => block.index > h.index);
      const blocks = response.blocks.slice(h.index, next?.index ?? response.blocks.length);
      if (!equal(blocks.map(block => block.tag), ['H1', ...Array(spec.bodyParagraphCount + 2).fill('P')])) fail('own paragraph/footer block shape mismatch');
      const description = blocks[1], footer = blocks.at(-1), bodyBlocks = blocks.slice(2, -1);
      for (const block of blocks) if (block.text.trim() !== block.text) fail('own block would be trimmed');
      if (description.text.length > 160 || description.anchors.length) fail('own description over 160 UTF16 or contains anchors');
      if (!footer.text.startsWith('PRIVATE_SOURCE_JSON:') || bodyBlocks.some(block => block.text.includes('PRIVATE_SOURCE_JSON:')))
        fail('own PRIVATE_SOURCE_JSON must be a separate footer');
      const sourceItems = JSON.parse(footer.text.slice('PRIVATE_SOURCE_JSON:'.length).trim());
      if (!Array.isArray(sourceItems) || sourceItems.length !== spec.sourceReasonCount) fail('own source reason count mismatch');
      for (const source of sourceItems) {
        if (!source || !equal(Object.keys(source).sort(), ['label', 'reason', 'url'])) fail('own source keys mismatch');
        pairs([source]); text(source.reason, 'own source reason', 10000);
        if (source.reason.trim() !== source.reason || source.reason.split(/\s+/u).length > 60) fail('own reason exceeds 60 words or would be trimmed');
        if (new URL(source.url).hostname === 'promedical.lt') fail('own primary source must be external');
      }
      const orderedBodyLinks = bodyBlocks.flatMap(block => block.anchors);
      const external = orderedBodyLinks.filter(link => new URL(link.url).hostname !== 'promedical.lt').map(link => link.url);
      const sources = sourceItems.map(source => source.url);
      if (new Set(sources).size !== sources.length || !equal([...new Set(external)].sort(), [...sources].sort())) fail('own external body/source URL sets mismatch');
      if (footer.anchors.some(anchor => !sources.includes(anchor.url))) fail('own footer anchor differs from declared source URL');
      if (spec.expectedBodyUrls !== undefined) {
        if (!Array.isArray(spec.expectedBodyUrls) || !spec.expectedBodyUrls.every(url => typeof url === 'string') ||
            !equal(orderedBodyLinks.map(link => link.url).sort(), [...spec.expectedBodyUrls].sort())) fail('own expected body URL multiset mismatch');
      }
      const startUtf16 = h.startUtf16, endUtf16Exclusive = footer.endUtf16Exclusive;
      return { pageId: spec.pageId, status: 'captured', candidate: {
        original: { title: h.text, description: description.text, body: bodyBlocks.map(block => block.text), sourceItems },
        orderedBodyLinks, orderedFooterLinks: footer.anchors, bodyBlocks, firstBlockIndex: h.index, footerBlockIndex: footer.index,
        slice: { startUtf16, endUtf16Exclusive, sha256: sha(response.text.slice(startUtf16, endUtf16Exclusive)) },
        responseId: response.responseId, responseIndex: response.responseIndex, capturedAt: response.at,
        conversationUrl: response.url, evidenceKind: response.evidenceKind, factsAccepted: false } };
    } catch (error) { return { pageId: spec.pageId, status: 'rejected', reason: String(error.message) }; }
  });
  return { response, outcomes };
}
