import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { OUTPUT, getSite, editPage, approvePage, saveAsset, exportPackage, editSite } from '../src/model.mjs';
const source = process.argv[2]; if (!source) throw new Error('Provide the generated source image path.');
const require = createRequire('C:/Users/lenovo/Documents/dovanos-memorycasting/package.json');
const sharp = require('sharp'); const id = 'traktoriupadangos'; const before = await getSite(id);
const prompt = 'Create a premium industrial product photograph illustration for a Lithuanian agricultural tractor tyre selection information website. ONE single large unbranded rear agricultural radial tractor tyre, standing upright, dramatic three-quarter view with the tread face turned slightly towards the camera and the circular empty center visible on the left. Deep sharp V-shaped agricultural lugs, technically plausible heavy black rubber tread, richly detailed subtle rubber texture, clean new surface, no dust. NO wheel rim, NO metal hub, no tractor, no people, no lettering, NO logos, no model names or sidewall numbers. Fully isolated on TRANSPARENT background with clean alpha edges, no background scene, no floor, no drop shadow. Entire tyre fits comfortably within image margins, tall substantial silhouette. High-end equipment showroom studio lighting from upper left, crisp soft silver highlights defining every tread block, realistic black not muddy grey, meticulous commercial art direction. Near-photographic, confident sculptural object, not plastic render. Image is illustrative, not an actual product offered for sale. Composition landscape 3:2 with tyre occupying middle ~65%, suitable for large cutout placement on warm pale industrial yellow or chalk white web background. No designed webpage, typography or UI elements.';
const sourceBytes = await readFile(source);
const folder = path.resolve(import.meta.dirname, '../../sites/traktoriupadangos'); await mkdir(folder, { recursive: true });
await copyFile(source, path.join(folder, 'tyre-source-2026-09-30.png'));
await writeFile(path.join(folder, 'image-prompt.txt'), prompt);
await mkdir(path.join(OUTPUT, 'site-snapshots'), { recursive: true });
await writeFile(path.join(OUTPUT, 'site-snapshots', `${id}-before-showroom-${Date.now()}.json`), JSON.stringify(before, null, 2));
const media = [];
for (const width of [1080, 720, 480]) {
  const image = await sharp(sourceBytes).trim({ threshold: 10 }).resize({ width, withoutEnlargement: true }).webp({ quality: 79, effort: 6 }).toBuffer({ resolveWithObject: true });
  const asset = await saveAsset(id, { mime: 'image/webp', alt: 'Iliustracinė nepaženklinta žemės ūkio padanga su V formos protektoriumi', width: image.info.width, height: image.info.height,
    credit: 'Originali ImageGen iliustracija, ne konkretus parduodamas modelis.', rights: 'Originalus OpenAI ImageGen vaizdas, sukurtas šiam projektui 2026-09-30. Iliustracija, ne reali prekių katalogo fotografija.', prompt }, image.data);
  media.push(asset); console.log(JSON.stringify({ width: image.info.width, height: image.info.height, bytes: image.data.length, file: asset.src }));
}
await editSite(id, { brand: { accent: '#d7ba3f' } });
for (const page of before.pages.filter(page => page.publishedRevision)) {
  if (page.type === 'home') { await editPage(id, page.id, { media }); await approvePage(id, page.id, 'codex-showroom-media-review-2026-09-30'); }
  if (page.slug === 'gidas/kaip-issirinkti-traktoriaus-padangas') {
    const body = page.body.map(block => block.text ? { ...block, text: block.text.replace('Jei dydį keičiama', 'Jei dydis keičiamas') } : block);
    await editPage(id, page.id, { body }); await approvePage(id, page.id, 'codex-language-review-2026-09-30');
  }
}
console.log(await exportPackage(id));
