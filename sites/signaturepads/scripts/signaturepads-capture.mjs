import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Read-only capture of the owner's existing public WordPress site.
// Never sends forms, authenticates, modifies WordPress, or follows other hosts.
const origin = 'https://signaturepads.lt';
const output = path.resolve(process.argv[2] || '../capture');
await mkdir(path.join(output, 'responses'), { recursive: true });
const records = [];
async function capture(url, name) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(output, 'responses', name), bytes);
  records.push({ url, finalUrl: response.url, status: response.status, file: `responses/${name}`, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), contentType: response.headers.get('content-type') });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return bytes.toString('utf8');
}
const pages = JSON.parse(await capture(`${origin}/wp-json/wp/v2/pages?per_page=100`, 'pages.json'));
const products = JSON.parse(await capture(`${origin}/wp-json/wc/store/v1/products?per_page=100`, 'products.json'));
const categories = JSON.parse(await capture(`${origin}/wp-json/wc/store/v1/products/categories?per_page=100`, 'categories.json'));
const sitemapIndex = await capture(`${origin}/sitemap_index.xml`, 'sitemap_index.xml');
await capture(`${origin}/robots.txt`, 'robots.txt');
const locs = xml => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replaceAll('&amp;', '&'));
const urls = new Set([`${origin}/`, ...pages.map(p => p.link), ...products.map(p => p.permalink), ...categories.map(c => c.permalink).filter(Boolean)]);
for (const [index, url] of locs(sitemapIndex).entries()) {
  const xml = await capture(url, `sitemap-${index}.xml`);
  for (const location of locs(xml)) if (new URL(location).origin === origin) urls.add(location);
}
const queue = [...urls].filter(url => new URL(url).origin === origin);
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < queue.length) {
    const index = next++;
    try { await capture(queue[index], `page-${String(index).padStart(3, '0')}.html`); }
    catch (error) { console.error(String(error)); }
  }
}));
await writeFile(path.join(output, 'inventory.json'), JSON.stringify({ capturedAt: new Date().toISOString(), origin,
  authority: { core: '25292e20219b735df7f04c5807dd4c100f98addc', companion: 'c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da' },
  counts: { pages: pages.length, products: products.length, categories: categories.length, urlCandidates: queue.length },
  records }, null, 2));
console.log(JSON.stringify({ output, pages: pages.map(p => ({ id: p.id, url: p.link, title: p.title.rendered })),
  products: products.map(p => ({ id: p.id, url: p.permalink, purchasable: p.is_purchasable, addToCart: p.add_to_cart })),
  categories: categories.map(c => ({ id: c.id, url: c.permalink, name: c.name, count: c.count })),
  urls: queue, failed: records.filter(r => r.status !== 200) }, null, 2));
