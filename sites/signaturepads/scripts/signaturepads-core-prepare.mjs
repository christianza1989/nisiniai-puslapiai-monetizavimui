import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Migration preparation only. Review/approval/release use the native Studio
// APIs in a separate step after inspecting the resulting exact drafts.
const [outputArg, publicArg, python] = process.argv.slice(2);
if (!outputArg || !publicArg || !python) throw Error('Usage: node signaturepads-core-prepare.mjs <capture-output> <public-core> <python-executable>');
const output = path.resolve(outputArg), publicRoot = path.resolve(publicArg);
const privateRoot = path.resolve(import.meta.dirname, '../../..');
const studioRoot = path.resolve(privateRoot, '../studio');
const prepared = path.join(output, 'core-integration');
await mkdir(prepared, { recursive: true });
process.env.STUDIO_DATA_DIR = path.join(studioRoot, 'data');
process.env.STUDIO_OUTPUT_DIR = path.join(studioRoot, 'output');
process.env.STUDIO_PUBLIC_CORE_DIR = publicRoot;
process.env.STUDIO_NETWORK_SETTINGS = path.join(publicRoot, 'config/niche-network.json');
const model = await import(pathToFileURL(path.join(privateRoot, 'content-studio/src/model.mjs')));
const sourceFile = path.join(publicRoot, 'sites/signaturepads/migration/site-source.json');
const sourceBytes = await readFile(sourceFile), data = JSON.parse(sourceBytes);
await model.initialize();
if ((await model.listSites()).some(s => s.id === 'signaturepads')) throw Error('Drafts already exist. Inspect them; do not overwrite or create duplicate media.');
await model.createSite({ siteId: 'signaturepads', schemaVersion: 2, renderer: 'niche', canonicalHost: 'signaturepads.lt', name: 'signaturepads.lt', offer: data.routes[0].description });
await model.editSite('signaturepads', { contact: data.contact, operatorName: 'signaturepads.lt', brand: { accent: '#276d72' },
  facts: 'Owner requested preservation of the existing signaturepads.lt catalogue, texts, contacts and active URLs. Inquiries only; no website orders or Paysera. Six software descriptions have a specific direct Codex authorship exception. Local integration only: production, DNS and existing WordPress remain unchanged. Legal entity and expanded inquiry privacy notice are not verified by this migration.',
  contentPolicy: { months: 1, articlesPerMonth: 1 } });
const digest = x => createHash('sha256').update(x).digest('hex');
const idFor = route => route.kind === 'home' ? 'sp-home' : route.kind === 'product' ? `sp-product-${route.productId}` : route.kind === 'category' ? `sp-category-${route.categoryId}` : `sp-page-${digest(route.path).slice(0,12)}`;
const paths = Object.fromEntries(data.routes.map(r => [r.path, idFor(r)]));
const familyBySrc = new Map(), familyByHash = new Map(), aliases = new Map();
const imagePath = src => new URL(src, data.origin).pathname;
const addImage = async (image, label, ownerId) => {
  if (!image?.src) return null;
  const src = imagePath(image.src);
  let family = familyBySrc.get(src);
  if (!family) {
    const file = path.resolve(output, 'public', '.' + decodeURIComponent(src));
    if (!file.startsWith(path.resolve(output, 'public') + path.sep)) throw Error('Asset escaped capture directory');
    const bytes = await readFile(file), sha = digest(bytes);
    family = familyByHash.get(sha);
    if (!family) {
      const mime = /\.png$/i.test(src) ? 'image/png' : /\.webp$/i.test(src) ? 'image/webp' : 'image/jpeg';
      const asset = await model.saveResponsiveAsset('signaturepads', { mime, alt: image.alt || label,
        credit: 'signaturepads.lt', rights: 'Perkelta iš savininko signaturepads.lt svetainės pagal jo pavedimą; originali gaminio ar svetainės iliustracija.' }, bytes);
      const variants = [...asset.variants].sort((a,b) => b.width-a.width);
      family = { familyId: asset.groupId, primaryId: variants[0].id, assetIds: variants.map(a=>a.id), sourceSha256: sha };
      familyByHash.set(sha, family);
    }
    familyBySrc.set(src, family);
  }
  for (const old of [src, ...(image.variants || []).map(v => imagePath(v.src))]) {
    if (!aliases.has(old)) aliases.set(old, { siteId: 'signaturepads', pageId: ownerId, assetId: family.primaryId, from: old });
  }
  return family;
};
const entries = [], layout = { version: 1, siteId: 'signaturepads', routes: {}, home: {}, styles: {}, families: {} };
const byPath = new Map(data.routes.map(r => [r.path,r]));
for (const route of data.routes) {
  const id = idFor(route), product = data.products.find(p => p.id === route.productId);
  const gallery = [];
  for (const image of product?.images || []) gallery.push(await addImage(image, product.name, id));
  const introSource = route.kind === 'category' ? route.images.find(i => /Paraso-plansetes-signotec-1024x602\.jpg$|epsilon_produktbild_12-1\.png$/.test(i.src)) : null;
  const intro = introSource ? await addImage(introSource, route.title, id) : null;
  const fragment = product ? product.contentHtml : ['page','category'].includes(route.kind) ? route.html : '';
  for (const match of fragment.matchAll(/<img\b[^>]*src=["']([^"']+)/gi)) await addImage({ src: match[1] }, route.title, id);
  entries.push({ key: id, html: fragment });
  layout.routes[id] = { path: route.path, kind: route.kind, ...(route.productId ? {productId:route.productId} : {}),
    ...(route.categoryId ? {categoryId:route.categoryId} : {}), productIds: route.productIds,
    gallery: gallery.map(g=>g.familyId), intro: intro?.familyId || null };
}
const homeId = paths['/'];
const homeImages = [];
for (const image of data.home.images) homeImages.push((await addImage(image, data.home.title, homeId)).familyId);
const logo = await addImage(data.home.logo, 'signaturepads.lt', homeId);
const background = await addImage({ src: data.home.background }, data.home.title, homeId);
// Favicon is also ingested through the common media pipeline, retaining a
// publication-bound original alias without exposing an unreviewed static file.
const favicon = await addImage({ src: data.favicon }, 'signaturepads.lt', homeId);
layout.home = { images: homeImages, logo: logo.familyId, background: background.familyId, favicon: favicon.primaryId,
  cardImages: [], accordions: [] };
for (const card of data.home.categoryCards) layout.home.cardImages.push((await addImage(card.image, card.title, homeId)).familyId);
for (const [i,a] of data.home.accordions.entries()) entries.push({ key: `accordion-${i}`, html: a.html });
const input = path.join(prepared,'html-input.private.json'), convertedFile = path.join(prepared,'html-converted.private.json');
await writeFile(input, JSON.stringify({ entries, paths, images: Object.fromEntries([...familyBySrc].map(([src,f])=>[src,f.primaryId])) }));
const conversion = spawnSync(python, [path.join(import.meta.dirname,'signaturepads-html-to-core.py'), input, convertedFile], {encoding:'utf8'});
if (conversion.status !== 0) throw Error(conversion.stderr || 'HTML conversion failed');
const converted = JSON.parse(await readFile(convertedFile,'utf8'));
const editorial = {category:'',readingMinutes:0,authors:[],sources:[],datePublished:null,dateModified:null,productRecommendation:false,featuredImageId:null,relatedPageIds:[],commerceTargets:[]};
const bodyReports = [];
for (const route of data.routes) {
  const id = paths[route.path], blueprint = layout.routes[id], fragment = converted[id];
  const body = [{ type:'heading',level:2,text:route.title.replace(/ -$/,'') }, ...fragment.blocks];
  const styles = [{tag:'h2'}, ...fragment.styles];
  blueprint.copyStart = 1;
  blueprint.copyEnd = body.length;
  if (route.kind === 'home') {
    for (const [i,a] of data.home.accordions.entries()) {
      const titleBlock = body.length;
      body.push({type:'heading',level:2,text:a.title}); styles.push({tag:'h2'});
      const group = converted[`accordion-${i}`], start = body.length;
      body.push(...group.blocks); styles.push(...group.styles);
      layout.home.accordions.push({titleBlock,start,end:body.length});
    }
    layout.home.cardBlock = body.length;
    body.push({type:'richList',ordered:false,items:data.home.categoryCards.map(c=>[{type:'link',text:c.title,target:{kind:'page',pageId:paths[c.href]}}])});styles.push({tag:'ul'});
    layout.home.trustBlock = body.length;
    const trust = data.routes[0].links.filter(l=>['https://www.post.lt/','https://www.registrucentras.lt/','https://www.antakpol.lt/'].includes(l.href));
    body.push({type:'richList',ordered:false,items:trust.map(l=>[{type:'link',text:l.text,target:{kind:'external',url:l.href}}])});styles.push({tag:'ul'});
  }
  if (route.kind === 'catalog' || route.kind === 'category') {
    const ids = route.kind === 'catalog' ? data.products.map(p=>p.id) : route.productIds;
    blueprint.inventoryBlock = body.length;
    body.push({type:'richList',ordered:false,items:ids.map(pid=>{const p=data.products.find(p=>p.id===pid);return [{type:'link',text:p.name,target:{kind:'page',pageId:paths[p.path]}}];})});styles.push({tag:'ul'});
  }
  if (route.kind === 'product') {
    const p=data.products.find(p=>p.id===route.productId);
    blueprint.priceBlock = body.length;
    body.push({type:'paragraph',text:`${(Number(p.prices.price)/100).toFixed(2).replace('.',',')}€ be PVM`});styles.push({tag:'p'});
  }
  const familyIds = route.kind === 'home' ? [logo.familyId,background.familyId,favicon.familyId,...homeImages,...layout.home.cardImages] : [...blueprint.gallery,...(blueprint.intro?[blueprint.intro]:[])];
  const embedded = fragment.blocks.filter(b=>b.type==='image').map(b=>b.assetId);
  const familyRecords = [...familyByHash.values()];
  const primaryIds = [...new Set([...familyIds.map(fid=>familyRecords.find(f=>f.familyId===fid).primaryId),...embedded])];
  const page = await model.addPage('signaturepads',{ id, type:route.kind==='home'?'home':route.kind==='product'?'product':['category','catalog'].includes(route.kind)?'index':route.path.includes('slapuku')?'policy':'about',
    slug:route.path.replace(/^\/+|\/+$/g,''),title:route.metaTitle,description:route.description,intent:route.description,body,publishAt:new Date().toISOString(),editorial });
  const hero = blueprint.gallery[0] || (route.kind==='home'?homeImages[0]:blueprint.intro);
  const featuredImageId = hero ? familyRecords.find(f=>f.familyId===hero).primaryId : null;
  await model.editPage('signaturepads',page.id,{media:primaryIds.map(id=>({id})),editorial:{...editorial,featuredImageId}});
  layout.styles[id] = styles;
  bodyReports.push({pageId:id,path:route.path,blocks:body.length,sourceFragmentSha256:digest(entries.find(e=>e.key===id).html),fragmentBlocks:fragment.blocks.length});
}
layout.families = Object.fromEntries([...familyByHash.values()].map(f=>[f.familyId,{assetIds:f.assetIds,primaryId:f.primaryId}]));
await writeFile(path.join(prepared,'layout.json'),JSON.stringify(layout,null,2)+'\n');
await writeFile(path.join(prepared,'media-aliases.json'),JSON.stringify([...aliases.values()],null,2)+'\n');
await writeFile(path.join(prepared,'draft-import.json'),JSON.stringify({state:'draft-only',siteId:'signaturepads',sourceSha256:digest(sourceBytes),studioData:process.env.STUDIO_DATA_DIR,preparedAt:new Date().toISOString(),mediaFamilies:familyByHash.size,pages:bodyReports},null,2)+'\n');
console.log(JSON.stringify({state:'draft-only',pages:bodyReports.length,mediaFamilies:familyByHash.size,prepared,approval:false,release:false,deployment:false}));
