import { readFile } from 'node:fs/promises';

const project = JSON.parse(await readFile(new URL('./project.json', import.meta.url), 'utf8'));
// Data remains private/ignored. Uses the shared locking model, not a JSON copy.
const model = await import('../../content-studio/src/model.mjs');
await model.initialize();
const sites = await model.listSites();
const existing = sites.find(s => s.id === project.siteId || s.canonicalHost === project.canonicalHost);
if (existing && (existing.id !== project.siteId || existing.canonicalHost !== project.canonicalHost)) throw Error('PhoneBridger identity collision');
if (existing) {
  const site = await model.getSite(existing.id);
  if (site.locale !== project.locale || site.timezone !== project.timezone || site.contact.email !== project.contact.email) throw Error('Existing site differs: review through studio; bootstrap will not overwrite it');
  console.log(JSON.stringify({ siteId: site.id, unchanged: true, pages: site.pages.length }));
} else {
  const created = await model.createSite(project);
  if (created.id !== project.siteId) throw Error('Shared model derived an unexpected ID');
  const site = await model.editSite(project.siteId, project);
  await model.addPage(project.siteId, { type: 'home', slug: '', title: 'PhoneBridger — Your mouse. Now on your phone.', description: 'A connected Windows and Android workspace. Explore a local interactive demonstration.', intent: 'Understand PhoneBridger and try its browser simulation.', body: [{ type: 'paragraph', text: 'PhoneBridger is a Windows and Android project. This page is a draft for editorial review; the interactive prototype uses fictional local data.' }] });
  console.log(JSON.stringify({ siteId: site.id, locale: site.locale, contact: site.contact.email, stage: site.stage, pages: 1, publication: 'draft, not exported' }));
}
