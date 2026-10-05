import { createHash } from 'node:crypto';
import { bodyPlainText, inlineNodes } from './content-package-v2.mjs';
import { contentPolicy, planningWindow } from './content-schedule.mjs';

export const REVIEW_AREAS = ['usefulness', 'facts', 'sources', 'media', 'links', 'presentation'];
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}` : JSON.stringify(value);
export function reviewBinding(site, page, hash) {
  return createHash('sha256').update(stable({ siteId: site.id, revisionHash: hash,
    context: { name: site.name, offer: site.offer, facts: site.facts, audience: site.audience, contact: site.contact, canonicalHost: site.canonicalHost, timezone: site.timezone, locale: site.locale, brand: site.brand, operatorName: site.operatorName ?? null, renderer: site.renderer ?? null },
    factChecks: page.factChecks || [], linkSuggestions: page.linkSuggestions || [], networkLinkSuggestions: page.networkLinkSuggestions || [] })).digest('hex');
}
export function editorialReview(site, page, hash, input, now = Date.now()) {
  if (input?.revisionHash !== hash) throw new Error('Peržiūrima revizija pasikeitė; iš naujo perskaitykite turinį.');
  if (typeof input.reviewer !== 'string' || !input.reviewer.trim() || input.reviewer.length > 120) throw new Error('Reikia tikro peržiūrinčio agento / redaktoriaus ID.');
  const evidence = {};
  for (const area of REVIEW_AREAS) {
    const note = input.evidence?.[area];
    if (typeof note !== 'string' || note.trim().length < 20 || note.length > 4000) throw new Error(`Peržiūros sričiai ${area} reikia konkretaus įrodymų paaiškinimo (20–4000 simbolių).`);
    evidence[area] = note.trim();
  }
  return { version: 1, reviewer: input.reviewer.trim(), checkedAt: new Date(now).toISOString(), revisionHash: hash, binding: reviewBinding(site, page, hash), evidence };
}
export function reviewCurrent(site, page, hash) {
  return page.editorialReview?.version === 1 && page.editorialReview.revisionHash === hash && page.editorialReview.binding === reviewBinding(site, page, hash);
}
export function internalTargets(page) {
  const ids = [...(page.links || []).map(l => l.targetPageId)];
  if (page.contentVersion === 2) ids.push(...inlineNodes(page).filter(n => n.type === 'link' && n.target.kind === 'page').map(n => n.target.pageId), ...(page.editorial?.relatedPageIds || []));
  return [...new Set(ids)];
}
export function draftLinks(site, page) {
  const links = [...(page.links || [])];
  for (const suggestion of page.linkSuggestions || []) {
    if (!suggestion.reason?.trim()) throw new Error('Planuotai nuorodai reikia skaitytojo naudos paaiškinimo.');
    if (!links.some(l => l.targetPageId === suggestion.targetPageId)) links.push({ targetPageId: suggestion.targetPageId, label: suggestion.label });
  }
  for (const link of links) if (!link.label?.trim() || link.targetPageId === page.id || !site.pages.some(p => p.id === link.targetPageId && p.siteId === site.id && p.status !== 'revoked')) throw new Error('Vidinės nuorodos tikslas nežinomas, atšauktas arba yra pats puslapis.');
  if (links.length > 30) throw new Error('Puslapyje gali būti iki 30 prasmingų vidinių nuorodų.');
  return links;
}
export function pageReadiness(site, page, hash, selectedIds = new Set()) {
  const blockers = [];
  if (!page.body.length || !bodyPlainText(page.body).trim()) blockers.push('Turinys neparengtas.');
  if (page.factChecks?.length) blockers.push('Yra neišspręstų faktų / asetų pastabų.');
  if (!reviewCurrent(site, page, hash)) blockers.push('Trūksta aktualios agento redakcinės peržiūros.');
  if (['guide', 'article'].includes(page.type) && !page.media.length) blockers.push('Gidui / straipsniui reikia tikro peržiūrėto temos vaizdo.');
  if ((page.externalLinks || []).some(l => !l.verified)) blockers.push('Yra nepatikrintų išorinių šaltinių.');
  const linked = new Set((page.links || []).map(l => l.targetPageId));
  if ((page.linkSuggestions || []).some(l => !linked.has(l.targetPageId))) blockers.push('Planuotos vidinės nuorodos dar neužbaigtos.');
  for (const id of internalTargets(page)) {
    const target = site.pages.find(p => p.id === id && p.siteId === site.id);
    if (!target || target.status === 'revoked' || !selectedIds.has(id) && !target.publishedRevision) blockers.push(`Vidinio ryšio tikslas dar neparengtas: ${id}.`);
  }
  return { pageId: page.id, title: page.title, publishAt: page.publishAt, revisionHash: hash, state: blockers.length ? 'blocked' : 'reviewed', blockers };
}
export function workflowOverview(site, hashForPage) {
  const policy = contentPolicy(site.contentPolicy, site.timezone), window = planningWindow(policy);
  const candidates = site.pages.filter(p => p.status !== 'revoked');
  const selected = new Set(candidates.map(p => p.id));
  return { siteId: site.id, canonicalHost: site.canonicalHost, policy, window,
    workflowVersion: site.contentWorkflowVersion || 0,
    publication: 'approved-package-request-time', deployment: 'not-verified-by-studio',
    pages: candidates.map(page => ({ ...pageReadiness(site, page, hashForPage(page), selected), hasApprovedRevision: Boolean(page.publishedRevision), reviewCurrent: reviewCurrent(site, page, hashForPage(page)), internalPlanned: (page.linkSuggestions || []).length, internalAttached: (page.links || []).length, external: (page.externalLinks || []).length })) };
}
