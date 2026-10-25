// Canonical pure authoring kernel, shared by local Studio and hosted adapters.
import { createHash } from 'node:crypto';
import { v2RevisionPayload, v2RevisionHash, validateV2Draft } from './content-package-v2.mjs';
import { hasMinimumContent } from './minimum-content.mjs';
import { networkStatus } from './network-links.mjs';
const plain = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
export const PAGE_MEDIA_LIMIT = 60;
export const publicSite = site => ({id:site.id,name:site.name,canonicalHost:site.canonicalHost,locale:site.locale,timezone:site.timezone,brand:site.brand,offer:site.offer,contact:site.contact,...(site.schemaVersion===2?{renderer:site.renderer,operatorName:site.operatorName}: {})});
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function revisionPayload(page) {
  if(page.contentVersion===2)return v2RevisionPayload(page);
  const { siteId, type, slug, title, description, intent, body, publishAt, media, links } = page;
  const payload = { siteId, type, slug, title, description, intent, body, publishAt, media, links };
  if (page.externalLinks?.length) payload.externalLinks = page.externalLinks.map(({ url, label, reason }) => ({ url, label, reason }));
  return payload;
}
export function revisionHash(page) { return page.contentVersion===2?v2RevisionHash(page):createHash('sha256').update(stable(revisionPayload(page))).digest('hex'); }
export function isPublic(page, now = Date.now()) {
  return page?.approval?.status === 'approved'
    && page.approval.revisionHash === page.revisionHash
    && revisionHash(page) === page.revisionHash
    && Date.parse(page.publishAt) <= now;
}
export function normalizeBlocks(input) {
  if (!Array.isArray(input)) throw new Error('Turinys turi būti blokų sąrašas.');
  if (input.length > 100) throw new Error('Per daug turinio blokų.');
  return input.map(block => {
    if (block.type === 'heading') return { type: 'heading', level: block.level === 3 ? 3 : 2, text: plain(block.text, 500) };
    if (block.type === 'list') return { type: 'list', items: (Array.isArray(block.items) ? block.items : []).slice(0, 30).map(item => plain(item, 700)) };
    if (block.type === 'image') return { type: 'image', assetId: plain(block.assetId, 80) };
    if (block.type === 'paragraph') return { type: 'paragraph', text: plain(block.text, 3000) };
    throw new Error('Nežinomas turinio bloko tipas.');
  });
}
export function approveDraftSnapshot(site, page, actorId, { batchIds = new Set(), networkIndex, networkDomains, now = Date.now() }) {
    const siteId = site.id;
    if (!page) throw Object.assign(new Error('Puslapis nerastas.'), { status: 404 });
    if (page.factChecks?.length) throw new Error('Išspręskite faktų patikros pastabas ir išsaugokite naują versiją prieš tvirtinimą.');
    if (!site.name || !site.offer || !site.facts?.trim() || !page.title || !page.description || !page.intent || !page.body.length) throw new Error('Patvirtinimui reikia patikrintų svetainės verslo faktų, pasiūlymo, puslapio antraštės, aprašymo, ketinimo ir turinio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contact.email || '')) throw new Error('Prieš publikavimą įrašykite taisyklingą veikiančio el. pašto adresą.');
    if (site.contact.phone && !/^\+?[\d\s().-]{7,30}$/.test(site.contact.phone)) throw new Error('Neteisingas telefono numeris. Palikite lauką tuščią arba įrašykite tikrą numerį.');
    if(page.contentVersion===2){
      page.siteSnapshot=structuredClone(publicSite(site));
      validateV2Draft(page,publicSite(site));
      if(['article','guide'].includes(page.type)&&!page.editorial.authors.length)throw new Error('Straipsniui reikia tikro redakcinio autoriaus snapshot.');
    }
    if (!hasMinimumContent(site, page)) throw new Error('Turinyje per mažai naudingos informacijos.');
    for (const block of page.body) {
      if ((block.type === 'paragraph' || block.type === 'heading') && !block.text) throw new Error('Puslapyje yra tuščias teksto blokas.');
      if (block.type === 'list' && (!block.items.length || block.items.some(item => !item))) throw new Error('Puslapyje yra tuščias sąrašas.');
    }
    if(page.media.length>PAGE_MEDIA_LIMIT)throw new Error(`Puslapyje telpa iki ${PAGE_MEDIA_LIMIT} medijos variantų.`);
    for (const item of page.media) if (!item.alt || !item.rights || !item.width || !item.height) throw new Error('Vaizdams reikia alt teksto, matmenų ir naudojimo teisių.');
    for (const block of page.body) if (block.type === 'image' && !page.media.some(item => item.id === block.assetId)) throw new Error('Turinio vaizdas nėra priskirtas puslapio medijai.');
    for (const link of page.links) if (!link.label || !site.pages.some(item => item.id === link.targetPageId && (page.contentVersion===2||item.publishedRevision||batchIds.has(item.id)))) throw new Error('Vidinė nuoroda nurodo nepatvirtintą arba nežinomą puslapį.');
    if (!Array.isArray(networkIndex) || !(networkDomains instanceof Set)) throw new Error("Approval network context is required.");
    for (const source of page.externalLinks || []) {
      let url;
      try { url = new URL(source.url); } catch { throw new Error('Išorinio šaltinio URL neteisingas.'); }
      if (!source.url.startsWith('https://') || url.protocol !== 'https:' || !url.hostname || url.username || url.password || !source.label || !source.reason || !source.verified) throw new Error('Išoriniam šaltiniui reikia viešo HTTPS adreso be prisijungimo duomenų, pavadinimo, paaiškinimo ir patikros.');
      if (networkDomains.has(url.hostname)) {
        const proposed = (page.networkLinkSuggestions || []).find(link => networkIndex.some(target => target.siteId === link.targetSiteId && target.pageId === link.targetPageId && target.url === source.url));
        if (!proposed || proposed.label !== source.label || networkStatus(siteId, page, proposed, networkIndex).status !== 'ready') throw new Error('Tinklo nuoroda dar nepatikrinta, jos tikslas neviešas arba tekste nėra numatyto konteksto.');
      }
    }
    const hash = revisionHash(page);
    const approval = { status: 'approved', revisionHash: hash, approvedAt: new Date(now).toISOString(), actorId: plain(actorId, 120) || 'local-editor' };
    page.status = 'approved'; page.approval = approval; page.revisionHash = hash;
    page.publishedRevision = structuredClone({ ...revisionPayload(page), id: page.id, revisionHash: hash, approval });
    for (const asset of site.assets) if (page.media.some(item => item.id === asset.id)) asset.metadataPublished = true;
    page.updatedAt = new Date(now).toISOString();
    return page;
}
