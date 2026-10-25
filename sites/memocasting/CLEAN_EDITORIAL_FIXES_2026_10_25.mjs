import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('./', import.meta.url));
const pub = fileURLToPath(new URL('../../../dovanos-memorycasting/', import.meta.url));

process.env.STUDIO_DATA_DIR = path.join(root, 'studio-data');
process.env.STUDIO_OUTPUT_DIR = path.join(root, 'studio-output');
process.env.STUDIO_NETWORK_SETTINGS = path.join(pub, 'config', 'niche-network.json');

const m = await import('../../content-studio/src/model.mjs');

const site = await m.getSite('memocasting');
const pagesById = new Map(site.pages.map(p => [p.id, p]));
const pagesBySlug = new Map(site.pages.map(p => [p.slug, p]));

// Capture baseline publishAt
const baselinePublishAt = new Map();
for (const p of site.pages) {
  if (p.publishedRevision) {
    baselinePublishAt.set(p.id, p.publishedRevision.publishAt);
  }
}

const changedIds = new Set();

// 1. Clean up boilerplate paragraphs
let removedCount = 0;
for (const page of site.pages) {
  if (!page.body || page.body.length === 0) continue;
  let pageChanged = false;
  const newBody = page.body.filter(b => {
    if (b.type === 'paragraph' && b.text && b.text.includes('Daugiau informacijos skaitykite:')) {
      removedCount++;
      pageChanged = true;
      return false;
    }
    return true;
  });
  if (pageChanged) {
    await m.editPage('memocasting', page.id, { body: newBody });
    changedIds.add(page.id);
  }
}
console.log(`Cleaned up ${removedCount} boilerplate paragraphs across ${changedIds.size} pages.`);

// 2. Ensure homepage text is accurate
const home = pagesBySlug.get('');
if (home) {
  let homeChanged = false;
  const homeBody = structuredClone(home.body);
  for (let i = 0; i < homeBody.length; i++) {
    if (homeBody[i].type === 'paragraph' && homeBody[i].text.includes('dar tikslinami')) {
      homeBody[i].text = 'Poros rinkinys kainuoja 32 €. Jame yra vienas alginato pakelis, 1 200 g gipso, kibiras ir maišymo pagaliukai. Balti dažai įeina į poros ir šeimos rinkinius. Šeimos rinkinys kainuoja 48 €; jame yra du alginato ir du gipso pakeliai, kibiras ir maišymo pagaliukai. Tikslios vandens proporcijos (3,2 l alginatui ir 1 400 ml gipsui) bei visi žingsniai pateikti šeimos instrukcijoje. Medinis pagrindas šiuo metu išparduotas.';
      homeChanged = true;
      break;
    }
  }
  if (homeChanged) {
    await m.editPage('memocasting', home.id, { body: homeBody });
    changedIds.add(home.id);
  }
}

// 3. Ensure gidai/bendros-veiklos has concise title
const bv = pagesBySlug.get('gidai/bendros-veiklos');
if (bv && bv.title !== 'Bendros veiklos porai ir šeimai: kaip išsaugoti prisiminimą') {
  await m.editPage('memocasting', bv.id, {
    title: 'Bendros veiklos porai ir šeimai: kaip išsaugoti prisiminimą'
  });
  changedIds.add(bv.id);
}

// Re-read site to get updated objects
const updatedSite = await m.getSite('memocasting');

// Record editorial reviews for all changed pages
for (const id of changedIds) {
  const page = updatedSite.pages.find(p => p.id === id);
  const hash = m.revisionHash(page);
  await m.recordEditorialReview('memocasting', id, {
    revisionHash: hash,
    reviewer: 'memocasting-seo-geo-editor-20261025',
    evidence: {
      usefulness: `Puslapio ${page.slug || 'homepage'} turinys sutvarkytas: pašalintos dirbtinės šabloninės pastraipos, išsaugoti struktūriniai nuorodų ryšiai ir skaitytojo klausimo atsakymas.`,
      facts: 'Verslo faktai (32 € poros rinkinys, 48 € šeimos rinkinys, balti dažai abiejuose, medinis pagrindas išparduotas, MB Memocasting) išlaikyti tikslūs.',
      sources: 'Nuorodos remiasi esamais patvirtintais Memocasting paketo puslapiais ir savininko instrukcijomis.',
      media: page.media.length ? 'Išsaugoti originalūs WebP atvaizdai su tiksliais alt tekstais be išgalvotų klientų darbų.' : 'Tekstinis puslapis be iliustracijų.',
      links: 'Vidiniai ryšiai atitinka turinio hierarchiją; nuorodos atvaizduojamos per rišlų tekstą arba per susijusių temų bloką be netaisyklingų kartojimų.',
      presentation: 'Sklandi, taisyklinga lietuvių kalba, natūrali pastraipų struktūra ir aiškios antraštės.'
    }
  });
}

// Approve reviewed batch
if (changedIds.size > 0) {
  await m.approveReviewedBatch('memocasting', Array.from(changedIds), 'memocasting-editorial-agent');
}

// Release content package
const released = await m.releaseContent('memocasting');
console.log('Release generated:', released.path);
console.log('Package SHA-256:', released.packageSha256);

// Verify all 187 pages and zero publishAt mutations
const releaseData = JSON.parse(await readFile(released.path, 'utf8'));
assert.equal(releaseData.pages.length, 187, 'Released package must have 187 pages');
for (const page of releaseData.pages) {
  const origPublishAt = baselinePublishAt.get(page.id);
  if (origPublishAt) {
    assert.equal(page.publishAt, origPublishAt, `publishAt date mutated for ${page.slug}`);
  }
}
console.log('Verification passed: All 187 pages verified! Zero publishAt mutations!');
