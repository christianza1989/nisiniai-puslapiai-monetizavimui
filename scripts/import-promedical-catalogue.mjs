// Site adapter only. Uses the canonical studio model/media pipeline; does not deploy.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [catalogueFile, manifestFile, publicCore = path.join(root, '../promedical-public-20261009')] = process.argv.slice(2);
if (!catalogueFile || !manifestFile) throw Error('Usage: node scripts/import-promedical-catalogue.mjs <normalized-catalogue.json> <asset-manifest.json> [public-core]');
process.env.STUDIO_PUBLIC_CORE_DIR = path.resolve(publicCore);
process.env.STUDIO_NETWORK_SETTINGS = path.join(path.resolve(publicCore), 'config/niche-network.json');
const { initialize, getSite, addPage, editPage, deleteDraftPage, saveResponsiveAsset } = await import('../content-studio/src/model.mjs');
const sourceBytes=await readFile(catalogueFile);
const sourceSha256=createHash('sha256').update(sourceBytes).digest('hex');
const data = JSON.parse(sourceBytes);
if (data.contentReady !== true && data.coverage?.contentReady !== true && data.products.length>3) throw Error('Catalogue translation/validation is incomplete; private data preserved, public import refused.');
if(data.products.some(v=>v.reviewEvidence&&v.reviewEvidence.contentReviewReady!==true))throw Error('Some product source reviews are incomplete.');
const sourceCategoryCount=data.categories.length;
data.categories=data.categories.filter(c=>c.publicEligible!==false);
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
const work = path.join(root, 'content-studio/data/promedical-import'); await mkdir(work, {recursive:true});
const cacheFile = path.join(work, 'media-cache.json'); let cache = {};
try { cache = JSON.parse(await readFile(cacheFile,'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await initialize(); let site = await getSite('promedical');
const existing = new Map(site.pages.map(p=>[p.slug,p]));
const categories = new Map(data.categories.map(c=>[c.id,c]));
const assetsByProduct = new Map(), assetsByCategory = new Map(), childrenByCategory = new Map();
for(const entry of manifest.assets){for(const id of entry.productIds||[]){const key=String(id);if(!assetsByProduct.has(key))assetsByProduct.set(key,[]);assetsByProduct.get(key).push(entry);}for(const id of entry.categoryIds||[])if(!assetsByCategory.has(id))assetsByCategory.set(id,entry);}
for(const c of data.categories){if(!childrenByCategory.has(c.parentId))childrenByCategory.set(c.parentId,[]);childrenByCategory.get(c.parentId).push(c);}
const categoryPages = new Map(), productPages = new Map();
async function editIfChanged(page,input){const changed=Object.entries(input).some(([key,value])=>key==='media'?value.length!==new Set(page.media.map(m=>m.alt)).size||value.some(m=>!page.media.some(a=>a.id===m.id)):JSON.stringify(page[key])!==JSON.stringify(value));if(!changed)return page;const updated=await editPage('promedical',page.id,input);Object.assign(page,updated);return updated;}
const now = new Date().toISOString();
const h = text=>({type:'heading',level:2,text}), p=text=>({type:'paragraph',text}), list=items=>({type:'list',items});
function listBlocks(items){const blocks=[];let pending=[];function flush(){if(pending.length){blocks.push(list(pending));pending=[];}}for(const item of items){if(item.length>700){flush();let rest=item;while(rest.length>3000){let cut=rest.lastIndexOf(' ',3000);if(cut<1)throw Error('Unbreakable long technical text');blocks.push(p(rest.slice(0,cut)));rest=rest.slice(cut+1);}blocks.push(p(rest));}else{pending.push(item);if(pending.length===30)flush();}}flush();return blocks;}
function clean(value) { return String(value??'').replace(/\s+/g,' ').trim(); }
function summary(value){const text=clean(value);if(text.length<=300)return text;const head=text.slice(0,299);const sentence=Math.max(head.lastIndexOf('. '),head.lastIndexOf('; '));return sentence>80?head.slice(0,sentence+1):head.slice(0,head.lastIndexOf(' '))+'…';}
function sourceLink(url, label, reason) { return {url,label,reason,verified:true}; }
for (const c of data.categories) {
  const routeId=c.id.replace(/-\/-/g,'/');
  const slug = `kategorijos/${routeId}`;
  const title = clean(c.nameLt || c.titleLt);
  if (!title || !/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(routeId)) throw Error(`Invalid category ${c.id}`);
  const description = clean(c.descriptionLt || `${title}: Klaro įrangos grupė. Peržiūrėkite konkrečius modelius, jų techninius duomenis ir pateikite įstaigos poreikio užklausą.`);
  const input = {type:'faq',slug,title,description,intent:`Klaro produktų grupė: ${title}`,publishAt:now,body:[p(description),h('Modelio pasirinkimas'),p('Pasirinkite modelį pagal naudojimo paskirtį, matmenis ir reikalingą komplektaciją. Tikslų katalogo kodą ir norimus kiekius įtraukite į užklausą. Priedų suderinamumą ir tiekimo sąlygas suderinsime pagal konkretų poreikį.')]};
  const page = existing.get(slug) || await addPage('promedical',input); categoryPages.set(c.id,page);
}
for (const v of data.products) {
  const slug = `produktai/${v.slug}`;
  if (!/^[a-z0-9-]+$/.test(v.slug)) throw Error(`Invalid product slug ${v.slug}`);
  const title=clean(v.nameLt), description=clean(v.descriptionLt);
  if (!title || !description) throw Error(`Untranslated product ${v.id}`);
  const input={type:'product',slug,title,description:summary(description),intent:`Katalogo kodas: ${clean(v.sku)} | Klaro produktas ${v.id}`,publishAt:now,body:[p(description)]};
  const page=existing.get(slug)||await addPage('promedical',input);productPages.set(String(v.id),page);
}
site=await getSite('promedical');const assetIds=new Set(site.assets.map(a=>a.id));
const inFlight=new Map();let cacheWrite=Promise.resolve();
function persistCache(){const snapshot=JSON.stringify(cache,null,2);cacheWrite=cacheWrite.then(async()=>{const tmp=cacheFile+'.tmp';await writeFile(tmp,snapshot);await rename(tmp,cacheFile);});return cacheWrite;}
async function asset(entry,alt) {
  if (!entry || entry.status!=='verified-image') return null;
  const key=entry.sha256;
  if (cache[key] && assetIds.has(cache[key].id)) return cache[key];
  if(inFlight.has(key))return inFlight.get(key);
  const pending=(async()=>{
  const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[path.extname(entry.localPath).toLowerCase()];
  const record=await saveResponsiveAsset('promedical',{mime,alt:clean(alt).slice(0,300),rights:'Gamintojo Klaro produkto nuotrauka; naudojama savininko užsakytame atstovaujamo tiekėjo kataloge.',credit:'',prompt:`Šaltinis ${entry.sourceUrl}; originalas ${entry.originalUrl}; šaltinio SHA256 ${entry.sha256}; tikra gamintojo produkto nuotrauka, negeneruota.`},await readFile(entry.localPath));
  cache[key]={id:record.id,sourceUrl:entry.sourceUrl,originalUrl:entry.originalUrl,sha256:entry.sha256,variants:record.variants.map(({id,width,height,bytes})=>({id,width,height,bytes}))};
  for(const a of record.variants)assetIds.add(a.id);
  await persistCache();return cache[key];
  })();inFlight.set(key,pending);return pending;
}
function categoryIds(v) {
  const ids=[...new Set(v.listingCategoryIds||v.categories||[])].filter(id=>categories.has(id));
  if(ids.length>30)throw Error(`Product ${v.id} exceeds V1 direct category link limit.`);
  if(!ids.length)throw Error(`Product ${v.id} has no eligible category.`);
  return ids;
}
let imageCount=0;
for(const v of data.products){const entry=assetsByProduct.get(String(v.id))?.[0];if(entry)for(let id of categoryIds(v)){let depth=0;while(id&&categories.has(id)&&depth++<25){if(!assetsByCategory.has(id))assetsByCategory.set(id,entry);id=categories.get(id).parentId;}}}
// Prefer the category's observed source image over an arbitrary first descendant.
for(const c of data.categories){const match=data.products.find(v=>v.imageUrls.includes(c.imageUrl));const entry=match&&assetsByProduct.get(String(match.id))?.[0];if(entry)assetsByCategory.set(c.id,entry);}
const representativeProducts={'iso-modul-system':'zs1211'};
for(const [id,slug] of Object.entries(representativeProducts)){const product=data.products.find(v=>v.slug===slug),category=categories.get(id);if(!product||!category?.productIds.includes(String(product.id)))throw Error('Representative photo is outside its observed category');assetsByCategory.set(id,assetsByProduct.get(String(product.id))[0]);}
const required=new Map();
for(const v of data.products){const entries=assetsByProduct.get(String(v.id))||[];const entry=entries.find(a=>v.imageUrls?.some(url=>url===a.sourceUrl||url===a.originalUrl))||entries[0];if(entry)required.set(entry.sha256,{entry,alt:`Klaro ${v.nameLt}`});}
for(const c of data.categories){const entry=assetsByCategory.get(c.id);if(entry&&!required.has(entry.sha256))required.set(entry.sha256,{entry,alt:`Klaro ${c.nameLt}`});}
const queue=[...required.values()];let cursor=0,finished=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<queue.length){const item=queue[cursor++];await asset(item.entry,item.alt);finished++;if(finished%50===0)console.log(JSON.stringify({stage:'canonical-responsive-assets',done:finished,total:queue.length}));}}));
await cacheWrite;
for (const [index,v] of data.products.entries()) {
  const page=productPages.get(String(v.id));
  const entries=assetsByProduct.get(String(v.id))||[];
  const entry=entries.find(a=>v.imageUrls?.some(url=>url===a.sourceUrl||url===a.originalUrl))||entries[0];
  const media=await asset(entry,`Klaro ${v.nameLt}`);if(media)imageCount++;
  const specs=(v.specs||[]).map(t=>{const name=clean(t.nameLt || t.labelLt || 'Parametras'),value=clean(t.value || t.valueLt);return value?`${name}: ${value}`:name;});
  const features=(v.featuresLt||[]).map(clean).filter(Boolean);
  const options=(v.options||v.variants||[]).map(o=>typeof o==='string'?clean(o):`${clean(o.nameLt||o.labelLt)}: ${(o.valuesLt||o.values||[]).map(a=>clean(typeof a==='string'?a:a.labelLt||a.label||a.value)).join('; ')}`).filter(Boolean);
  if(v.descriptionLt.length>3000||v.nameLt.length>300)throw Error(`Product ${v.id} exceeds V1 text limits; refuse truncation.`);
  const body=[p(v.descriptionLt),...(specs.length?[h('Techniniai duomenys'),...listBlocks(specs)]:[]),...(features.length?[h('Konstrukcija ir komplektacija'),...listBlocks(features)]:[]),...(options.length?[h('Pasirenkami variantai'),...listBlocks(options)]:[]),h('Poreikio užklausa'),p(`Nurodykite katalogo kodą ${v.sku}, norimą kiekį ir reikalingus priedus. Galutinė kaina, komplektacija ir tiekimo sąlygos aptariamos individualiai. Produktų fotografijose gali būti pasirenkamų priedų.`)];
  const links=categoryIds(v).map(id=>({targetPageId:categoryPages.get(id).id,label:categories.get(id).nameLt}));
  // Related product links are attached after the first dependency-closed approval.
  const sources=[sourceLink(v.sourceUrl,`Klaro gamintojo informacija: ${v.sku}`,'2026-10-09 patikrintas gamintojo modelis, katalogo kodas, techniniai duomenys ir variantai. Lietuviškas tekstas parengtas savarankiškai pagal faktus.'),...(v.documents||[]).slice(0,8).map(d=>sourceLink(d.url,d.labelLt||d.label||'Gamintojo dokumentas','Konkretaus modelio gamintojo dokumentas; dokumento kalba gali būti čekų arba anglų.'))];
  await editIfChanged(page,{title:v.nameLt,description:summary(v.descriptionLt),intent:`Katalogo kodas: ${clean(v.sku)} | Klaro produktas ${v.id}`,body,links,externalLinks:sources,media:media?[{id:media.id}]:[],factChecks:[]});
  if(index%50===0)console.log(JSON.stringify({stage:'product-import',done:index+1,total:data.products.length,images:imageCount}));
}
for (const c of data.categories) {
  const page=categoryPages.get(c.id);
  const links=c.parentId&&categoryPages.has(c.parentId)?[{targetPageId:categoryPages.get(c.parentId).id,label:categories.get(c.parentId).nameLt}]:[];
  const entry=assetsByCategory.get(c.id);
  const media=await asset(entry,`Klaro ${c.nameLt}`);
  await editIfChanged(page,{title:c.nameLt,links,externalLinks:[sourceLink(c.sourceUrl,`Klaro produktų grupė: ${c.nameLt}`,'2026-10-09 gamintojo katalogo struktūra ir produktų paskirtis. Kaina, likutis ir tiekimo terminai pateikiami individualiame pasiūlyme.')],media:media?[{id:media.id}]:[],factChecks:[]});
}
site=await getSite('promedical');const named=slug=>site.pages.find(v=>v.slug===slug);
const getProduct=(slug)=>site.pages.find(v=>v.slug===`produktai/${slug}`);
const featured=getProduct('zv1253n-pz')||site.pages.find(v=>v.type==='product');
if(featured?.media[0])await editPage('promedical',named('').id,{title:'Medicininė įranga jūsų įstaigai',media:[{id:featured.media[0].id}]});
const guideImages=[['gidai/medicininio-vezimelio-pasirinkimas',getProduct('zv1253n-pz')],['gidai/iso-moduliu-sistema',named('kategorijos/iso-modul-system')],['gidai/irangos-pirkimo-uzklausa',getProduct('nerez1002is')]];
for(const [guide,source] of guideImages){const target=named(guide),image=source?.media[0];if(target&&image)await editPage('promedical',target.id,{media:[{id:image.id}]});}
const rootCategories=data.topCategoryIds.filter(id=>categories.has(id)).map(id=>({targetPageId:categoryPages.get(id).id,label:categories.get(id).nameLt}));
if(rootCategories.length>29)throw Error('Root groups exceed V1 link capacity.');
const catalog=named('produktai');if(catalog)await editPage('promedical',catalog.id,{links:[...rootCategories,{targetPageId:named('kontaktai').id,label:'Pateikti įstaigos poreikį'}]});
for(const obsolete of site.pages.filter(p=>p.slug.startsWith('kategorijos/')&&![...categoryPages.values()].some(c=>c.id===p.id))){if(obsolete.publishedRevision)throw Error('Refuse removal of a published obsolete category');await deleteDraftPage('promedical',obsolete.id);}
const receipt={siteId:'promedical',importedAt:new Date().toISOString(),sourceCatalogue:path.resolve(catalogueFile),sourceSha256,products:data.products.length,categories:data.categories.length,sourceCategories:sourceCategoryCount,productsWithImages:imageCount,assets:Object.keys(cache).length,categoryPageIds:Object.fromEntries([...categoryPages].map(([id,p])=>[id,p.id])),productPageIds:Object.fromEntries([...productPages].map(([id,p])=>[id,p.id])),state:'drafts-with-media-not-approved'};
await writeFile(path.join(work,'catalogue-import.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({...receipt,categoryPageIds:undefined,productPageIds:undefined}));
