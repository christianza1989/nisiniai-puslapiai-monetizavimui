import test from 'node:test';
import assert from 'node:assert/strict';
import { validateParagraphEdit, applyBodyEdits, sha256Text, sha256Body } from '../src/rewrite-pipeline/bounded-edits.mjs';

const reviewer = { reviewerId: 'actual-editor-thread-id', factsAndLanguageAccepted: true, meaningPreserved: true,
  reason: 'Perskaičiau visą galutinę pastraipą ir palyginau teiginius su originalu; taisyta tik kalba.' };
const check = (before, after, extra = {}) => validateParagraphEdit(before, after, { originalSha256: sha256Text(before), reviewer, ...extra });
const edit = (body, index, edited) => ({ paragraphIndex: index, originalSha256: sha256Text(body[index]), edited, reviewer });

function replay(original, hunks) {
  let out = '', at = 0;
  for (const h of hunks) {
    assert.equal(original.slice(h.before.start, h.before.end), h.before.text);
    out += original.slice(at, h.before.start) + h.after.text;
    at = h.before.end;
  }
  return out + original.slice(at);
}

test('grammar correction retains exact original, reviewer, word diff and replayable UTF16 spans', () => {
  const before = 'Šiame aprašymas aptariamas vežimėlis SV01, 50 kg.';
  const after = 'Šiame aprašyme aptariamas vežimėlis SV01, 50 kg.';
  const audit = check(before, after);
  assert.equal(audit.changedWords, 1);
  assert.equal(audit.original, before);
  assert.equal(audit.edited, after);
  assert.equal(audit.originalSha256, sha256Text(before));
  assert.equal(audit.editedSha256, sha256Text(after));
  assert.deepEqual(audit.reviewer, reviewer);
  assert.equal(audit.wordDiff[0].before.text, 'aprašymas');
  assert.equal(replay(before, audit.utf16Diff), after);
});

test('punctuation-only correction costs zero words; emoji offsets remain UTF16', () => {
  const before = '🔎 Aprašymas aiškus o sakinys trumpas.';
  const after = '🔎 Aprašymas aiškus, o sakinys trumpas.';
  const audit = check(before, after);
  assert.equal(audit.changedWords, 0);
  assert.equal(replay(before, audit.utf16Diff), after);
  assert.equal(audit.utf16Diff[0].before.start, before.indexOf(' o'));
});

test('aggregate original-relative limit accepts 8 and rejects 9 across separated hunks', () => {
  const a = ['ala', 'cala', 'dala', 'fala', 'hala', 'jala', 'kala', 'pala', 'rala'];
  const b = ['alo', 'calo', 'dalo', 'falo', 'halo', 'jalo', 'kalo', 'palo', 'ralo'];
  const before = a.join(' sakinys ') + '.';
  const eight = b.slice(0, 8).concat(a[8]).join(' sakinys ') + '.';
  assert.equal(check(before, eight).changedWords, 8);
  assert.throws(() => check(before, b.join(' sakinys ') + '.'), /aggregate changed words 9/);
});

test('insertions and deletions count toward the same aggregate budget', () => {
  assert.equal(check('Aiškus sakinys.', 'Trumpas aiškus sakinys.').changedWords, 2);
  assert.equal(check('Aiškus trumpas sakinys.', 'Aiškus sakinys.').changedWords, 1);
  assert.throws(() => check('Aprašymas.', 'Aprašymas ala cala dala fala hala jala kala pala rala.'), /exceeds 8/);
});

for (const [name, before, after, extra = {}] of [
  ['numeric', 'Apkrova 50 kg.', 'Apkrova 60 kg.'],
  ['decimal', 'Talpa 1,5 l.', 'Talpa 15 l.'],
  ['range punctuation', 'Telpa 15–18 indų.', 'Telpa 15/18 indų.'],
  ['dimension operation', 'Matmenys 50 × 60 cm.', 'Matmenys 50 + 60 cm.'],
  ['sign removal', 'Temperatūra −5 °C.', 'Temperatūra 5 °C.'],
  ['percentage removal', 'Aprašyta 50%.', 'Aprašyta 50.'],
  ['numeric words', 'Aprašyti du modeliai.', 'Aprašyti trys modeliai.'],
  ['unit', 'Matmuo 50 cm.', 'Matmuo 50 mm.'],
  ['written unit', 'Aprašyta kilogramais.', 'Aprašyta tonomis.'],
  ['model', 'Aprašytas SV01.', 'Aprašytas SV02.'],
  ['configured family marker', 'Aprašytas SV01*.', 'Aprašytas SV01.'],
  ['model multiplicity', 'SV01 ir SV01.', 'SV01 ir SV02.'],
  ['URL', 'Žr. https://example.test/sv01 dabar.', 'Žr. https://example.test/sv02 dabar.'],
  ['URL removal', 'Žr. https://example.test/a dabar.', 'Žr. dabar.'],
  ['URL reordering', 'https://example.test/a https://example.test/b', 'https://example.test/b https://example.test/a'],
  ['negation insertion', 'Vežimėlis stabilus.', 'Vežimėlis ne stabilus.'],
  ['negation deletion', 'Vežimėlis ne stabilus.', 'Vežimėlis stabilus.'],
  ['negation scope', 'Ne dėžė, o stovas aprašytas.', 'Ne stovas, o dėžė aprašytas.'],
  ['qualifier', 'Apkrova iki 50 kg.', 'Apkrova nuo 50 kg.'],
  ['qualifier movement', 'Tik dėžė aprašyta, stovas matomas.', 'Dėžė aprašyta, tik stovas matomas.'],
  ['material', 'Chromuotas plienas.', 'Nerūdijantis plienas.'],
  ['capacity relationship', '15 kg vienai lentynai.', '15 kg visam vežimėliui.'],
  ['mounting type', 'Sieninis stovas.', 'Mobilus stovas.'],
  ['inclusion', 'Priedai aprašyti.', 'Priedai įtraukti.'],
  ['quantity reorder', 'SV01: 50 kg, SV02: 60 kg.', 'SV02: 50 kg, SV01: 60 kg.'],
  ['declared model literal', 'Modelis Alpha aprašytas.', 'Modelis Bravo aprašytas.', { protectedLiterals: ['Alpha'] }],
  ['declared literal reordering', 'Alpha lyginamas su Bravo.', 'Bravo lyginamas su Alpha.', { protectedLiterals: ['Alpha', 'Bravo'] }],
  ['declared literal multiplicity', 'Alpha ir Alpha.', 'Alpha ir Bravo.', { protectedLiterals: ['Alpha'] }],
]) test(`rejects ${name} change even within eight words`, () => assert.throws(() => check(before, after, extra), /Bounded edit:/));

test('explicit fact span cannot be changed despite absent automatic vocabulary', () => {
  const before = 'Aprašymas: apvalus objektas aiškiai pavaizduotas.';
  const start = before.indexOf('apvalus objektas');
  assert.throws(() => check(before, before.replace('apvalus', 'kampuotas'), {
    protectedFactSpans: [{ start, end: start + 16, text: 'apvalus objektas' }],
  }), /fact span/);
});

test('repeated fact spans map the exact occurrence after an earlier grammar edit', () => {
  const before = 'Klaidingas žodis. Apvalus objektas ir apvalus objektas.';
  const after = 'Klaidingai parašytas žodis. Apvalus objektas ir apvalus objektas.';
  const start = before.lastIndexOf('apvalus objektas');
  const span = { start, end: start + 'apvalus objektas'.length, text: 'apvalus objektas' };
  const audit = check(before, after, { protectedFactSpans: [span], protectedLiterals: ['apvalus objektas'] });
  assert.equal(audit.protectedFactMappings[0].final.start, after.lastIndexOf(span.text));
  assert.equal(audit.protectedLiteralMappings[0].final[0].start, after.lastIndexOf(span.text));
  assert.equal(replay(before, audit.utf16Diff), after);
});

test('duplicate fact literal occurrences are individually mapped', () => {
  const before = 'apvalus objektas, apvalus objektas.';
  const after = 'apvalus objektas; apvalus objektas.';
  const audit = check(before, after, { protectedLiterals: ['apvalus objektas'] });
  assert.equal(audit.protectedLiteralMappings[0].original.length, 2);
  assert.equal(audit.protectedLiteralMappings[0].final[1].start, after.lastIndexOf('apvalus objektas'));
});

test('missing, stale or malformed manifest and reviewer attestations fail closed', () => {
  const before = 'Aiškus sakinys.';
  for (const extra of [
    { originalSha256: undefined }, { originalSha256: sha256Text('Kitas sakinys.') },
    { reviewer: null }, { reviewer: { ...reviewer, reviewerId: '' } },
    { reviewer: { ...reviewer, meaningPreserved: false } },
    { reviewer: { ...reviewer, factsAndLanguageAccepted: false } },
    { reviewer: { ...reviewer, reason: '' } },
    { protectedLiterals: ['absent'] },
    { protectedFactSpans: [{ start: 0, end: 6, text: 'stale!' }] },
  ]) assert.throws(() => check(before, before, extra));
  assert.throws(() => check('Du\npastraipos.', 'Du sakiniai.'), /single bounded paragraph/);
  assert.throws(() => check('a\ud800', 'a.'), /Unicode/);
});

test('body edit leaves untouched paragraphs and records original/final mapping', () => {
  const original = ['Šiame aprašymas aptariamas.', 'Antras sakinys.'];
  const accepted = applyBodyEdits(original, [edit(original, 0, 'Šiame aprašyme aptariamas.')], { originalBodySha256: sha256Body(original) });
  assert.deepEqual(original, ['Šiame aprašymas aptariamas.', 'Antras sakinys.']);
  assert.equal(accepted.body[1], original[1]);
  assert.equal(accepted.audits.length, 1);
  assert.equal(accepted.mappings[0].original, original[0]);
  assert.equal(accepted.mappings[0].final, accepted.body[0]);
  assert.equal(accepted.finalBodySha256, sha256Body(accepted.body));
});

test('duplicate/chained edits cannot reset the per-paragraph budget', () => {
  const original = ['Aprašymas aiškus.'];
  const first = edit(original, 0, 'Aprašymas trumpas.');
  const next = { ...first, originalSha256: sha256Text(first.edited), edited: 'Aprašymas išsamus.' };
  assert.throws(() => applyBodyEdits(original, [first, next], { originalBodySha256: sha256Body(original) }), /duplicate\/chained/);
  assert.throws(() => applyBodyEdits(original, [next], { originalBodySha256: sha256Body(original) }), /stale/);
  assert.throws(() => applyBodyEdits([first.edited], [next], { originalBodySha256: sha256Body(original) }), /stale/);
});

test('edit proposal cannot replace manifest protection or address sourceReason', () => {
  const original = ['Apvalus objektas.'];
  const proposal = edit(original, 0, 'Kampuotas objektas.');
  const context = { originalBodySha256: sha256Body(original), paragraphs: { 0: { protectedLiterals: ['Apvalus'] } } };
  assert.throws(() => applyBodyEdits(original, [proposal], context), /protected literal/);
  assert.throws(() => applyBodyEdits(original, [{ ...proposal, protectedLiterals: [] }], context), /override/);
  assert.throws(() => applyBodyEdits(original, [{ ...proposal, paragraphIndex: 'sourceReason' }], context), /paragraph index/);
});
