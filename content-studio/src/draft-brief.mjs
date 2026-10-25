// Optional private orchestration data, never a public package or approval field.
export function draftBrief(input, page) {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'object' || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype) {
    throw new Error('Pilnas temos aprašas turi būti JSON objektas.');
  }
  const serialized = JSON.stringify(input);
  if (Buffer.byteLength(serialized, 'utf8') > 128 * 1024) throw new Error('Pilnas temos aprašas viršija 128 KiB.');
  const brief = JSON.parse(serialized);
  if (typeof brief.slug !== 'string' || brief.slug !== page.slug) throw new Error('Temos aprašo adresas nesutampa su puslapiu.');
  for (const field of ['question', 'contribution']) {
    if (typeof brief[field] !== 'string' || !brief[field].trim()) throw new Error(`Temos aprašui trūksta ${field}.`);
  }
  if (!Array.isArray(brief.outline) || !brief.outline.length) throw new Error('Temos aprašui trūksta struktūros.');
  return brief;
}
