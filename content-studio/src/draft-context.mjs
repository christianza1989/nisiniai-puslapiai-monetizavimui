// Drafts need the actual page's source graph, not an entire commerce inventory.
// This projection is private prompt context. It never changes a public revision.
export function draftContext(site, page, network = []) {
  const ids = new Set([page.id, page.pillarPageId, ...(page.links || []).map(x => x.targetPageId),
    ...(page.linkSuggestions || []).map(x => x.targetPageId)].filter(Boolean));
  const urls = new Set((page.externalLinks || []).map(x => x.url));
  const sources = site.pages.filter(p => ids.has(p.id) || (p.publishedRevision?.externalLinks || []).some(x => urls.has(x.url)));
  const summaries = site.pages.filter(p => ids.has(p.id) || ['guide', 'article', 'home', 'about', 'contact'].includes(p.type));
  const snapshots = sources.filter(p => p.id !== page.id && p.publishedRevision).map(p => ({
    id: p.id, ...structuredClone(p.publishedRevision),
    contextRole: 'previously-approved-native-snapshot; verify applicability before citing model facts'
  }));
  const assetIds = new Set([...page.media || [], ...snapshots.flatMap(p => p.media || [])].map(x => x.id));
  const seen = new Set();
  const assets = site.assets.filter(a => assetIds.has(a.id)).filter(a => {
    const family = a.groupId || a.id;
    if (seen.has(family)) return false;
    seen.add(family); return true;
  }).map(({ id, groupId, alt, credit, rights }) => ({ id, groupId, alt, credit, rights }));
  const planned = page.networkLinkSuggestions || [];
  const selectedNetwork = network.filter(n => planned.some(x => x.targetSiteId === n.siteId && x.targetPageId === n.pageId));
  return { pages: summaries, sourceSnapshots: snapshots, assets, network: selectedNetwork,
    coverage: { totalPages: site.pages.length, summaryPages: summaries.length, sourceSnapshots: snapshots.length,
      totalAssets: site.assets.length, assetFamilies: assets.length, totalNetworkTargets: network.length,
      plannedNetworkTargets: selectedNetwork.length, limitation: 'Omitted catalogue/network targets were not assessed; do not invent unavailable facts or new links.' } };
}
