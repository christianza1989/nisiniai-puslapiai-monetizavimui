import { createHash } from 'node:crypto';
import { pageReadiness } from './content-workflow.mjs';
export const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}` : JSON.stringify(value);
export const releaseSha = bytes => createHash('sha256').update(bytes).digest('hex');
export function scopedIds(ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Scoped release needs 1–200 unique existing page IDs.');
  return new Set(ids);
}
export function assertScopedDiff(base, result, ids) {
  const selected = scopedIds(ids);
  if (base.schemaVersion !== 1 || result.schemaVersion !== 1) throw new Error('Scoped release currently supports native V1 only; V2 is not flattened.');
  const envelope = pkg => Object.fromEntries(Object.entries(pkg).filter(([key]) => !['pages', 'generatedAt'].includes(key)));
  if (stable(envelope(base)) !== stable(envelope(result))) throw new Error('Scoped release changed the pinned site envelope.');
  if (base.pages.length !== result.pages.length) throw new Error('Scoped release cannot add or remove pages.');
  const before = new Map(base.pages.map(p => [p.id, p]));
  if (before.size !== base.pages.length || new Set(result.pages.map(p => p.id)).size !== result.pages.length) throw new Error('Duplicate baseline/result page ID.');
  for (const id of selected) if (!before.has(id)) throw new Error('Selected page is absent from the pinned baseline.');
  for (let i = 0; i < result.pages.length; i++) {
    const page = result.pages[i], original = before.get(page.id);
    if (!original || base.pages[i].id !== page.id) throw new Error('Scoped release changed page identity/order.');
    if (!selected.has(page.id)) {
      if (stable(page) !== stable(original)) throw new Error('Unselected baseline page changed.');
    } else {
      for (const key of ['id', 'siteId', 'slug', 'type', 'publishAt']) if (page[key] !== original[key]) throw new Error(`Scoped release cannot change ${key}.`);
    }
  }
  return selected;
}
export function composeReviewedOverlay(site, base, ids, revisionHash, validatePackage) {
  validatePackage(base);
  if (base.siteId !== site.id || base.canonicalHost !== site.canonicalHost || base.locale !== site.locale) throw new Error('Scoped baseline/site identity mismatch.');
  const selected = scopedIds(ids), replacements = new Map();
  for (const id of selected) {
    const page = site.pages.find(p => p.id === id && p.siteId === site.id);
    if (!page || page.status === 'revoked') throw new Error('Unknown/revoked selected page.');
    const hash = revisionHash(page), ready = pageReadiness(site, page, hash, selected);
    if (ready.blockers.length) throw new Error(`${page.slug}: ${ready.blockers.join(' ')}`);
    if (!page.publishedRevision || page.publishedRevision.revisionHash !== hash || page.publishedRevision.approval?.revisionHash !== hash || revisionHash(page.publishedRevision) !== hash) throw new Error('Selected page needs its exact current genuine approval.');
    replacements.set(id, structuredClone(page.publishedRevision));
  }
  const result = structuredClone(base);
  result.pages = result.pages.map(p => replacements.get(p.id) ?? p);
  result.generatedAt = new Date().toISOString();
  assertScopedDiff(base, result, ids);
  const existing = new Set(result.pages.map(p => p.id));
  for (const page of result.pages) for (const link of page.links ?? []) if (!existing.has(link.targetPageId)) throw new Error('Scoped result has a missing approved dependency.');
  validatePackage(result);
  return result;
}
