// Inventory is not evidence of a deployed website.
const plain = (value, size) => String(value ?? '').trim().slice(0, size);
export function normalizeNetworkSuggestions(input) {
  return (Array.isArray(input) ? input : []).slice(0, 12).map(link => ({
    targetSiteId: plain(link.targetSiteId, 80), targetPageId: plain(link.targetPageId, 80),
    label: plain(link.label, 180), reason: plain(link.reason, 500),
  })).filter((link, i, all) => link.targetSiteId && link.targetPageId && link.label && link.reason
    && all.findIndex(other => other.targetSiteId === link.targetSiteId && other.targetPageId === link.targetPageId) === i);
}
export function targetCatalog(sites, isPublic, now = Date.now()) {
  return sites.flatMap(site => site.pages.filter(page => page.status !== 'revoked').map(page => ({
    siteId: site.id, pageId: page.id, domain: site.canonicalHost, title: page.title, intent: page.intent, cluster: page.cluster || '',
    slug: page.slug, url: `https://${site.canonicalHost}/${page.slug}`,
    publishAt: page.publishedRevision?.publishAt || page.publishAt,
    approved: Boolean(page.publishedRevision), eligibleRevision: Boolean(page.publishedRevision && isPublic(page.publishedRevision, now)),
    revisionHash: page.publishedRevision?.revisionHash || '', stage: site.stage,
  })));
}
export function anchorPlacement(page, label) {
  return (page.body || []).findIndex(block => block.type === 'paragraph' && block.text.includes(label)
    || block.type === 'list' && block.items.some(text => text.includes(label)));
}
export function networkStatus(sourceSiteId, page, link, catalog, now = Date.now()) {
  const target = catalog.find(item => item.siteId === link.targetSiteId && item.pageId === link.targetPageId);
  const placement = anchorPlacement(page, link.label);
  let status;
  if (!target) status = 'missing';
  else if (target.siteId === sourceSiteId) status = 'internal';
  else if (!target.approved) status = 'unapproved';
  else if (Date.parse(target.publishAt) > now) status = 'scheduled';
  else if (!target.eligibleRevision) status = 'revoked';
  else if (target.stage !== 'live') status = 'not-live';
  else if (placement < 0) status = 'no-anchor';
  else if (!link.evidence || link.evidence.revisionHash !== target.revisionHash || link.evidence.canonical !== target.url
    || link.evidence.status !== 200 || now - Date.parse(link.evidence.checkedAt) > 7 * 86400000
    || !Number.isFinite(Date.parse(link.evidence.checkedAt))) status = 'needs-check';
  else status = 'ready';
  return { ...link, target, placement, status };
}
export function networkOverview(sites, isPublic, now = Date.now()) {
  const catalog = targetCatalog(sites, isPublic, now);
  const links = sites.flatMap(site => site.pages.flatMap(page => (page.networkLinkSuggestions || []).map(link => ({
    sourceSiteId: site.id, sourcePageId: page.id, sourceDomain: site.canonicalHost, sourceTitle: page.title,
    sourcePublishAt: page.publishAt, ...networkStatus(site.id, page, link, catalog, now),
  }))));
  return { checkedAt: new Date(now).toISOString(), catalog, links,
    sites: sites.map(site => ({ id: site.id, domain: site.canonicalHost,
      outgoing: links.filter(link => link.sourceSiteId === site.id).length,
      incoming: links.filter(link => link.targetSiteId === site.id).length })) };
}
// Registered HTTPS domains only, bounded body, no redirect following.
// Availability/canonical checks do not prove editorial claims.
export async function checkTarget(target, fetcher = fetch) {
  const url = new URL(target.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname !== target.domain
    || /(^localhost$|\.local$|\.invalid$|^\d+(?:\.\d+){3}$)/.test(url.hostname)) throw new Error('Netinkamas viešo domeno tikslas.');
  const response = await fetcher(url.href, { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'NicheEditorialLinkCheck/1.0' } });
  if (response.status !== 200 || !(response.headers.get('content-type') || '').includes('text/html')
    || /noindex/i.test(response.headers.get('x-robots-tag') || '')) throw new Error('Tikslas nėra viešas HTML puslapis.');
  const reader = response.body.getReader(); let bytes = 0; let html = ''; const decoder = new TextDecoder();
  try { while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.length;
    if (bytes > 512 * 1024) throw new Error('Tikslo atsakymas per didelis.'); html += decoder.decode(value, { stream: true }); } }
  finally { await reader.cancel().catch(() => {}); }
  if ([...html.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) => /name=["']robots["']/i.test(tag) && /noindex/i.test(tag))) throw new Error('Tikslas neindeksuojamas.');
  const tag = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => tag).find(tag => /rel=["']canonical["']/i.test(tag));
  const canonical = tag?.match(/href=["']([^"']+)["']/i)?.[1];
  if (canonical !== target.url) throw new Error('Tikslo canonical nesutampa.');
  return { checkedAt: new Date().toISOString(), revisionHash: target.revisionHash, status: 200, canonical };
}
