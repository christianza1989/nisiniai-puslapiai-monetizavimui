import data from '../../content/preview-option-dictionary.json';

type Labels = Record<string, string>;
const fields: Labels = data.fields;
const values: Labels = data.values;
const models: Record<string, Labels> = data.models;
const collections: Labels = data.collections;
const colourNames: Labels = data.colourNames;
const numberFields = new Set(data.numberFields);
const format = new Intl.NumberFormat('lt-LT', { maximumFractionDigits: 3 });
const number = /^_?(\d+(?:[.,]\d+)?)(?:T(\d+(?:[.,]\d+)?))?$/;

export function previewField(field: string): string {
  return fields[field] ?? 'Papildoma parinktis';
}

export function previewFinishField(field: string): boolean {
  return /COLOU?R|CHCOL|COL$|DECSTITCHING|UPHGROUP|MESHGROUP|GROUP.*(?:UPH|MESH)/.test(field);
}

export function previewCollection(value: string): string | undefined {
  return collections[value] ?? colourNames[value];
}

export function previewValue(model: string, field: string, value: string, collection?: string): string {
  if (value === 'NONE') return 'Nėra';
  if (value === 'YES') return 'Taip';
  if (value === 'NO') return 'Ne';
  if (['UNDEFINED', 'NOTDEFINED', 'N/A'].includes(value)) return 'Nenurodyta';

  const match = number.exec(value);
  if (match) {
    const [first, last] = match.slice(1).map(part => Number(part?.replace(',', '.')));
    if (field === 'GWEIGHT') return format.format(first) + ' kg';
    if (field.includes('PRICEGROUP') || field === 'CPRICE2') return 'Kainų grupė ' + format.format(first);
    if (numberFields.has(field)) {
      const start = format.format(first / 10);
      return (Number.isFinite(last) ? start + '–' + format.format(last / 10) : start) + ' cm';
    }
  }

  const key = field + '=' + value;
  const label = models[model]?.[key] ?? values[key];
  if (!previewFinishField(field)) return label ?? 'Aprašymas nepateiktas';
  const name = label ?? colourNames[value] ?? collections[value];
  return [collection, name].filter((part, index, all) => part && all.indexOf(part) === index).join(' · ')
    || 'Spalvos pavadinimas nepateiktas';
}

export function previewTuple(model: string, values: Record<string, string | undefined>, caption = false): string {
  return [...new Set(Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined).map(([field, value]) =>
    caption ? previewValue(model, field, value) : previewField(field) + ' – ' + previewValue(model, field, value)
  ))].join(' · ');
}

export function distinctPreviewLabels<T>(options: T[], getLabel: (option: T) => string): string[] {
  const labels = options.map(getLabel);
  const totals = new Map<string, number>();
  for (const label of labels) totals.set(label, (totals.get(label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return labels.map(label => {
    if (totals.get(label) === 1) return label;
    const index = (seen.get(label) ?? 0) + 1;
    seen.set(label, index);
    return label + ' · ' + index;
  });
}

export function previewQuoteDetails(model: string, options: string[]) {
  const rows = new Map<string, string>();
  for (const option of options) {
    const separator = option.indexOf('=');
    if (separator <= 0) continue;
    const field = option.slice(0, separator).split('.').at(-1)!;
    rows.set(field, option.slice(separator + 1));
  }
  return [...rows].map(([field, value]) => ({ label: previewField(field), value: previewValue(model, field, value) }));
}
