import { createHash } from 'node:crypto';

export const sha256Text = text => createHash('sha256').update(text, 'utf8').digest('hex');
export const sha256Body = body => sha256Text(JSON.stringify(body));
const fail = message => { throw new Error(`Bounded edit: ${message}`); };
const wordPattern = /[\p{L}\p{M}\p{N}]+(?:[-_][\p{L}\p{M}\p{N}]+)*/gu;
const words = text => [...text.matchAll(wordPattern)].map(m => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
const lower = text => text.toLocaleLowerCase('lt-LT');
const qualifiers = new Set(('ne be tik iki nuo bent apie daugiau mažiau daugiausia mažiausiai gali galima negalima privalo privaloma reikia nereikia nėra yra arba ir bei nei vienas viena vieną vienam vienai vienos vienų du dvi dviejų trys trijų keturi keturios keturių penki penkios penkių šeši šešios šešių septyni septynios septynių aštuoni aštuonios aštuonių devyni devynios devynių dešimt visam visai visas visa viso visos kiekvienai kiekvienam').split(' '));
const facts = /^(?:plien|aliumin|plastik|chrom|nerūdij|nerudij|cinkuot|metalin|medin|stikl|gumin|varin|titan|sienin|mobil|neslid|antistat|komplekt|įtraukt|itraukt|apkrov|talp|matmen|ilgi|ilgį|ilgio|ilgis|ploč|plot|aukšt|aukst|gyli|gylį|gylio|gylis|reguliuoj|fiksuot|stabd|ratuk|lentyn|stalči|stalci|stalvirš|pavirš|bėgel|begel|tvirtin|montuoj|dezinfek|steril|antimikrob|plaun|įskait|iskait|skirt|tink|pakeist|gamint|garant|bendr|nauding|maksimal|minimal|atspar|nerūd|nereguliuoj|svor|sver|kilogram|miligram|gram|centimetr|milimetr|metr|litr|liumen|liuks|kelvin|vien|dvie|tri|ketur|penk|šeš|septyn|aštuon|devyn|dešimt)/u;
const units = new Set('kg g mg t cm mm m km ml l w kw v mah ah lm lx lux k °c proc'.split(' '));

// Conservative lexical guard, not a semantic validator. Caller supplies all known
// fact spans/model names; a real reviewer must attest the whole final paragraph.
function protectedTokens(text) {
  const found = [];
  for (const w of words(text)) {
    const folded = lower(w.text);
    if (/\p{N}/u.test(w.text) || qualifiers.has(folded) || units.has(folded) || facts.test(folded) ||
        /^(?:ne|be)[\p{L}]{3,}$/u.test(folded) || /^[A-ZĄČĘĖĮŠŲŪŽ]{2,}$/u.test(w.text)) found.push(w.text);
  }
  return found;
}
const urls = text => [...text.matchAll(/https?:\/\/[^\s<>"\]]+/gu)].map(m => m[0]);
const numericExpressions = text => [...text.matchAll(/[+−-]?\p{N}+(?:[.,]\p{N}+)*(?:\s*[×x*+/=<>≤≥±:–—−-]\s*[+−-]?\p{N}+(?:[.,]\p{N}+)*)*\s*[%°]?/gu)]
  .map(m => m[0].trimEnd());
const modelExpressions = text => [...text.matchAll(/[\p{L}\p{N}]+(?:[._/*+-][\p{L}\p{N}]+)*\*?/gu)]
  .map(m => m[0]).filter(t => /\p{L}/u.test(t) && /\p{N}/u.test(t));
function occurrences(text, literal) {
  const out = [];
  for (let at = 0; (at = text.indexOf(literal, at)) !== -1; at += literal.length) out.push({ start: at, end: at + literal.length });
  return out;
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function qualifierContexts(text) {
  const tokens = words(text).map(w => lower(w.text));
  const scoped = new Set(['ne', 'be', 'tik', 'iki', 'nuo', 'bent', 'nėra', 'negalima', 'gali', 'galima']);
  return tokens.flatMap((token, i) => scoped.has(token) || /^ne[\p{L}]{3,}$/u.test(token)
    ? [tokens.slice(Math.max(0, i - 3), i + 4)] : []);
}

function wordDiff(original, edited) {
  const a = words(original), b = words(edited);
  if (a.length > 2000 || b.length > 2000) fail('paragraph exceeds word limit');
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1].text === b[j - 1].text ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
  const changes = [];
  let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && a[i - 1].text === b[j - 1].text) { i--; j--; }
    else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) { changes.push({ type: 'replace', before: a[--i], after: b[--j] }); }
    else if (i && dp[i][j] === dp[i - 1][j] + 1) changes.push({ type: 'delete', before: a[--i], after: null });
    else changes.push({ type: 'insert', before: null, after: b[--j] });
  }
  return { changedWords: dp[a.length][b.length], changes: changes.reverse() };
}

// LCS over lexical tokens (including whitespace and punctuation) gives exact,
// replayable UTF16 ranges, including repeated occurrences and punctuation-only edits.
function exactDiff(original, edited) {
  const tokenize = text => [...text.matchAll(/[\p{L}\p{M}\p{N}]+|\s+|[^\p{L}\p{M}\p{N}\s]/gu)]
    .map(m => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
  const a = tokenize(original), b = tokenize(edited);
  if ((a.length + 1) * (b.length + 1) > 4_000_000) fail('paragraph exceeds diff budget');
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i].text === b[j].text ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hunks = [];
  let i = 0, j = 0, start = null;
  const boundary = (tokens, index, text) => tokens[index]?.start ?? text.length;
  const flush = () => {
    if (!start) return;
    const before = { start: start.a, end: boundary(a, i, original) };
    const after = { start: start.b, end: boundary(b, j, edited) };
    hunks.push({ before: { ...before, text: original.slice(before.start, before.end) }, after: { ...after, text: edited.slice(after.start, after.end) } });
    start = null;
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].text === b[j].text) { flush(); i++; j++; }
    else {
      start ??= { a: boundary(a, i, original), b: boundary(b, j, edited) };
      if (i < a.length && (j === b.length || dp[i + 1][j] >= dp[i][j + 1])) i++; else j++;
    }
  }
  flush();
  return hunks;
}

export function validateParagraphEdit(original, edited, options = {}) {
  if (typeof original !== 'string' || typeof edited !== 'string' || !original.trim() || !edited.trim()) fail('nonempty paragraph strings required');
  if (!original.isWellFormed() || !edited.isWellFormed()) fail('ill-formed Unicode');
  if (original.length > 16000 || edited.length > 16000 || /[\r\n]/u.test(original + edited)) fail('single bounded paragraph required');
  const originalSha256 = sha256Text(original), editedSha256 = sha256Text(edited);
  if (options.originalSha256 !== originalSha256) fail('stale or missing immutable original SHA');
  const reviewer = options.reviewer;
  if (!reviewer || typeof reviewer.reviewerId !== 'string' || !reviewer.reviewerId.trim() || reviewer.reviewerId.length > 120 ||
      reviewer.factsAndLanguageAccepted !== true || reviewer.meaningPreserved !== true ||
      typeof reviewer.reason !== 'string' || !reviewer.reason.trim()) fail('whole paragraph reviewer attestation required');
  if (!equal(urls(original), urls(edited))) fail('URL literal, multiplicity or order changed');
  if (!equal(numericExpressions(original), numericExpressions(edited))) fail('numeric expression changed');
  if (!equal(modelExpressions(original), modelExpressions(edited))) fail('model/SKU expression changed');
  if (!equal(protectedTokens(original), protectedTokens(edited))) fail('protected fact/number/unit/model/qualifier changed or reordered');
  if (!equal(qualifierContexts(original), qualifierContexts(edited))) fail('qualifier/negation context changed');
  const literals = options.protectedLiterals ?? [];
  const spans = options.protectedFactSpans ?? [];
  if (!Array.isArray(literals) || !Array.isArray(spans)) fail('protected lists must be arrays');
  for (const literal of literals) if (typeof literal !== 'string' || !literal || !original.includes(literal)) fail('protected literal missing from original');
  const literalOrder = text => literals.flatMap((textLiteral, index) => occurrences(text, textLiteral).map(p => ({ ...p, index })))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.index - b.index).map(p => p.index);
  for (const literal of literals) if (occurrences(original, literal).length !== occurrences(edited, literal).length) fail('protected literal changed');
  if (!equal(literalOrder(original), literalOrder(edited))) fail('protected literal order changed');
  const diff = wordDiff(original, edited);
  if (diff.changedWords > 8) fail(`aggregate changed words ${diff.changedWords} exceeds 8`);
  const hunks = exactDiff(original, edited);
  const mappings = [];
  for (const span of spans) {
    if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end) || span.start < 0 || span.end <= span.start || span.end > original.length ||
        typeof span.text !== 'string' || !span.text.isWellFormed() || original.slice(span.start, span.end) !== span.text) fail('stale protected fact span');
    let delta = 0;
    for (const h of hunks) {
      if ((h.before.start < span.end && h.before.end > span.start) ||
          (h.before.start === h.before.end && h.before.start > span.start && h.before.start < span.end)) fail('protected fact span edited');
      if (h.before.end <= span.start) delta += h.after.text.length - h.before.text.length;
    }
    const finalStart = span.start + delta;
    if (edited.slice(finalStart, finalStart + span.text.length) !== span.text) fail('protected fact span moved ambiguously');
    mappings.push({ original: { ...span }, final: { start: finalStart, end: finalStart + span.text.length, text: span.text } });
  }
  return { version: 1, kind: 'BOUNDED_CODEX_BODY_EDIT', original, edited, originalSha256, editedSha256,
    changedWords: diff.changedWords, wordDiff: diff.changes, utf16Diff: hunks, protectedFactMappings: mappings,
    protectedLiteralMappings: literals.map(text => ({ text, original: occurrences(original, text), final: occurrences(edited, text) })),
    reviewer: { reviewerId: reviewer.reviewerId, factsAndLanguageAccepted: true, meaningPreserved: true, reason: reviewer.reason },
    limitation: 'Lexical guards do not prove semantic invariance; reviewer attests the complete final paragraph.' };
}

// originalBody is the immutable Gemini paragraph array, never a prior edited body.
// Persist its SHA in the author manifest; the supplied original is checked against it.
export function applyBodyEdits(originalBody, edits, context = {}) {
  if (!Array.isArray(originalBody) || !originalBody.length || originalBody.some(p => typeof p !== 'string') || !Array.isArray(edits)) fail('paragraph array and edits required');
  const originalBodySha256 = sha256Body(originalBody);
  if (context.originalBodySha256 !== originalBodySha256) fail('stale or missing immutable body SHA');
  const seen = new Set(), body = [...originalBody], audits = [];
  for (const edit of edits) {
    if (!edit || !Number.isInteger(edit.paragraphIndex) || edit.paragraphIndex < 0 || edit.paragraphIndex >= originalBody.length) fail('invalid paragraph index');
    const index = edit.paragraphIndex;
    if (seen.has(index)) fail('duplicate/chained paragraph edits forbidden; submit one final paragraph against original');
    seen.add(index);
    const defaults = context.paragraphs?.[index] ?? {};
    // Protection belongs to immutable manifest context, not to an edit proposal.
    if ('protectedLiterals' in edit || 'protectedFactSpans' in edit) fail('edit cannot override manifest protections');
    const audit = validateParagraphEdit(originalBody[index], edit.edited, { ...defaults, originalSha256: edit.originalSha256, reviewer: edit.reviewer });
    body[index] = edit.edited;
    audits.push({ paragraphIndex: index, ...audit });
  }
  return { body, audits, originalBodySha256, finalBodySha256: sha256Body(body),
    mappings: originalBody.map((original, paragraphIndex) => ({ paragraphIndex, original, final: body[paragraphIndex],
      originalSha256: sha256Text(original), finalSha256: sha256Text(body[paragraphIndex]) })) };
}
