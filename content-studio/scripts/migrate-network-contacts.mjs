// Serial local API mutations share the GUI's lock. Retains draft/public revision separation.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revisionHash } from '../src/model.mjs';
const base = process.env.STUDIO_URL || 'http://127.0.0.1:4317';
const request = async (route, method = 'GET', body) => {
  const response = await fetch(base + route, { method, headers: { 'x-studio-request': '1', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json(); if (!response.ok) throw new Error(`Studio mutation failed: ${route}`); return result;
};
const rewrite = value => typeof value === 'string' ? value.replaceAll('info@memorycasting.lt', 'info@pinet.lt').replaceAll('info@verslomatika.lt', 'info@pinet.lt').replace(/MB\s+memocasting/gi, 'MB Pinet')
  : Array.isArray(value) ? value.map(rewrite) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)])) : value;
const results = [];
for (const item of await request('/api/sites')) {
  const route = `/api/sites/${item.id}`; const site = await request(route);
  const snapshots = path.resolve(import.meta.dirname, '../output/site-snapshots'); await mkdir(snapshots, { recursive: true });
  await writeFile(path.join(snapshots, `${item.id}-before-pinet-${Date.now()}.json`), JSON.stringify(site, null, 2));
  await request(route, 'PUT', { contact: { ...site.contact, email: 'info@pinet.lt' }, facts: rewrite(site.facts) });
  let reviewed = 0;
  for (const page of site.pages) {
    const selected = { title: page.title, description: page.description, body: page.body };
    const changed = rewrite(selected);
    if (page.slug === 'privatumas' && !JSON.stringify(changed.body).includes('MB Pinet')) changed.body.unshift({ type: 'paragraph', text: 'Projekto operatorius: MB Pinet. Bendras kontaktas dėl užklausų ir pateiktų duomenų: info@pinet.lt.' });
    if (JSON.stringify(changed) === JSON.stringify(selected)) continue;
    const approvedUnchanged = page.publishedRevision && revisionHash(page) === page.publishedRevision.revisionHash;
    await request(`${route}/pages/${page.id}`, 'PUT', changed);
    if (approvedUnchanged) { await request(`${route}/pages/${page.id}/approve`, 'POST', { actorId: 'codex-owner-contact-change-2026-09-30' }); reviewed++; }
  }
  const current = await request(route);
  if (current.pages.some(page => page.type === 'home' && page.publishedRevision)) await request(`${route}/export`, 'POST');
  results.push({ siteId: item.id, email: 'info@pinet.lt', reviewedContactRevisions: reviewed });
}
console.log(JSON.stringify(results));
