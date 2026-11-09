import { bodyPlainText } from './content-package-v2.mjs';
import {catalogueIndexDefinition,catalogueIndexHasContent} from './catalogue-index.mjs';

// Owner decision 606, 2026-10-24: only these two reviewed category indices.
// Keep their existing body lengths as floors; no general short-content switch.
const promedicalIndexMinimums = new Map([
  ['10af45c9-03a7-4e29-8145-661dde7f44e4', 117],
  ['4a80eebf-f530-44b2-b734-caba73aab699', 97],
]);
export function shortIndexMinimum(site, page) {
  return site.id === 'promedical' && page.siteId === site.id && page.type === 'faq'
    ? promedicalIndexMinimums.get(page.id) : undefined;
}
export function hasMinimumContent(site, page) {
  if(catalogueIndexDefinition(site,page))return catalogueIndexHasContent(site,page);
  const text = page.contentVersion === 2 ? bodyPlainText(page.body)
    : page.body.map(block => block.text || block.items?.join(' ') || '').join(' ');
  const exception = shortIndexMinimum(site, page);
  return text.length >= (exception ?? 120) && (exception === undefined || Boolean(text.trim()));
}
