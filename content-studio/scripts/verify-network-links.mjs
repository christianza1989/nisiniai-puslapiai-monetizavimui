import { listSites, getSite, verifyNetworkLinks } from '../src/model.mjs';
const requested = process.argv[2];
for (const site of await listSites()) {
  if (requested && requested !== site.id) continue;
  for (const page of (await getSite(site.id)).pages) if (page.networkLinkSuggestions?.length) {
    const result = await verifyNetworkLinks(site.id, page.id);
    console.log(JSON.stringify({ siteId: site.id, pageId: page.id, ...result }));
  }
}
