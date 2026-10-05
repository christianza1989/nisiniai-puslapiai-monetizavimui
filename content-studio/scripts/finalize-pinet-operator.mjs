import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { revisionHash } from '../src/model.mjs';
const api = async (path, method = 'GET', body) => {
  const response = await fetch('http://127.0.0.1:4317/api' + path, { method, headers: { 'x-studio-request':'1', 'content-type':'application/json' }, ...(body ? { body:JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
};
const site = await api('/sites/greitossvetaines');
const page = site.pages.find(page => page.slug === 'privatumas');
if (page.body.some(block => block.text?.includes('MB Pinet, Gedimino 9, Vilnius'))) {
  await mkdir('output/site-snapshots', { recursive:true });
  await writeFile('output/site-snapshots/greitossvetaines-before-pinet-address-correction.json', JSON.stringify(site,null,2));
  const approved = page.publishedRevision && revisionHash(page) === page.publishedRevision.revisionHash;
  await api(`/sites/${site.id}/pages/${page.id}`, 'PUT', { body:page.body.map(block => block.text ? { ...block,text:block.text.replace('MB Pinet, Gedimino 9, Vilnius','MB Pinet') } : block) });
  if (approved) await api(`/sites/${site.id}/pages/${page.id}/approve`, 'POST', { actorId:'codex-owner-operator-update-2026-09-30' });
  await api(`/sites/${site.id}/export`, 'POST');
}
const tractor = await api('/sites/traktoriupadangos');
if (!tractor.facts.includes('MB Pinet')) await api('/sites/traktoriupadangos', 'PUT', { facts:tractor.facts + '\nSavininkas 2026-09-30 patvirtino bendrą operatoriaus pavadinimą MB Pinet ir kontaktą info@pinet.lt. Šiai nišai telefono, kainų, tiekėjų ir pardavimo pajėgumo nepatvirtino.' });
console.log('Current operator facts reconciled; old company address was not transferred to MB Pinet.');
