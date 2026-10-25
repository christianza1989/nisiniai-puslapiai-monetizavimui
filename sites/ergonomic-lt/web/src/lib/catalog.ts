import seedData from '../../content/seed.json';
import {cache} from 'react';
import {z} from 'zod';
import { getDb,dbOne,dbAll } from './db';
import type { Seed, Product, LegacyPage, Category, Line } from './types';
import detailImages from '../../content/detail-image-overrides.json';
import {localizeConfiguration} from './configuration-labels';
import {pilotModels} from './configurator';
import {productPhotograph,cleanProductPhotographs} from './product-photographs';
import {productModels,resolveProduct,resolveCatalogProduct} from './product-models';
import {galleryPhotoBackdrops} from './gallery-photo-metadata';
import {uniqueGalleryPhotos} from './gallery-photo-identity';
import {categoryLabel} from './category-labels';
import additions from '../../content/legacy-additions.json';
import {publicProductCopy,publicProductText} from './public-product-copy';
import {editorialPage,editorialProduct,editorialCategory} from './editorial-server';
import {attributedProduct} from './photo-attribution';
import {productIsVisible} from './site-publication';
import {launchProjection} from './launch-projection';
import {readDrafts,applyDrafts} from './publication-copy';
import {headers} from 'next/headers';
import {isAdmin} from './auth';

let seedCache: Seed | undefined;
export function baseSeed(): Seed {
  return seedCache ??= seedData as Seed;
}
export function previewMode() { return process.env.PREVIEW_CATALOG === 'true'; }
export function indexable() { return process.env.SITE_INDEXABLE === 'true' && !previewMode(); }
async function privatePreview(){try{return (await headers()).get('x-ergonomic-preview')==='1'&&await isAdmin();}catch{return false;}}
export function catalog(): Seed {
  const imported=getDb().prepare('SELECT data FROM supplier_import WHERE id=1').get() as {data:string}|undefined;
  const edits=getDb().prepare('SELECT id,data FROM product_edits').all() as {id:string;data:string}[];
  return assembleCatalog(imported,edits);
}
function assembleCatalog(imported:{data:string}|undefined,edits:{id:string;data:string}[]):Seed {
  const seed=imported ? {...baseSeed(),...JSON.parse(imported.data)} as Seed : baseSeed();
  const map=new Map(edits.map(r=>[r.id,JSON.parse(r.data)]));
  const products=seed.products.map(p=>{
    const edit=map.get(p.id),product={...p,...edit,id:p.id,categorySlug:p.categorySlug,slug:p.slug,sourceUrl:p.sourceUrl};
    const detail=detailImages[p.id as keyof typeof detailImages];
    if(detail&&!edit?.gallery)product.gallery=['/'+detail.path,...product.gallery.slice(1)];
    if(pilotModels.some(m=>m.productId===p.id))product.configurations=product.configurations.map((c:Product['configurations'][number],n:number)=>localizeConfiguration(c,product.name,n));
    const clean=attributedProduct(cleanProductPhotographs(product));
    return {...editorialProduct(publicProductCopy(clean)),galleryBackdrops:galleryPhotoBackdrops([...clean.gallery,...clean.configurations.flatMap(c=>c.gallery||[])])};
  });
  return {...seed,categories:seed.categories.map(c=>({...c,name:editorialCategory(c.id,categoryLabel(c.id,c.name))})),products,lines:seed.lines.map(l=>({...l,name:publicProductText(l.name),image:productPhotograph(l.image)||products.find(p=>p.lineId===l.id&&p.image)?.image||null}))};
}
// React cache is scoped to a server render, never shared between visitors.
export const catalogAsync=cache(async():Promise<Seed>=>{
  const [imported,edits]=await Promise.all([
    dbOne<{data:string}>('SELECT data FROM supplier_import WHERE id=1'),
    dbAll<{id:string;data:string}>('SELECT id,data FROM product_edits'),
  ]);
  let seed=assembleCatalog(imported,edits);
  if(process.env.LAUNCH_SITE==='true'){
    try{const drafts=await readDrafts();return launchProjection({...seed,products:applyDrafts(seed.products,drafts)},drafts);}catch{return {...seed,products:[],lines:[]};}
  }else if(await privatePreview()){
    seed={...seed,products:applyDrafts(seed.products,await readDrafts())};
  }
  return launchProjection(seed);
});
export async function visibleProductsAsync(){return (await catalogAsync()).products.filter(p=>productIsVisible(p,previewMode()));}
export async function visibleModelsAsync(){return productModels(await visibleProductsAsync());}
export async function findProductAsync(category:string,slug:string,preset?:unknown){return resolveCatalogProduct(await visibleProductsAsync(),category,slug,preset);}
export async function categoryForAsync(p:Product){return (await catalogAsync()).categories.find(c=>c.id===p.subcategoryId)!;}
export async function lineForAsync(p:Product){return (await catalogAsync()).lines.find(l=>l.id===p.lineId);}
export async function normalizeSupplierAsync(input:unknown){return normalizeSupplier(input,await catalogAsync());}
export function visibleProducts() { return catalog().products.filter(p=>productIsVisible(p,previewMode())); }
export function productPath(p:Product) { return `/produktai/${p.categorySlug}/${p.slug}/`; }
export function findProduct(category:string,slug:string) { return resolveProduct(visibleProducts(),category,slug); }
export function legacyPages():LegacyPage[]{return [...baseSeed().legacy,...additions as LegacyPage[]].map(editorialPage);}
export function findLegacy(route:string): LegacyPage|undefined { return legacyPages().find(p=>p.path===route); }
export function categoryFor(p:Product):Category { return catalog().categories.find(c=>c.id===p.subcategoryId)!; }
export function lineFor(p:Product):Line|undefined { return catalog().lines.find(l=>l.id===p.lineId); }
export function slugify(s:string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'modelis'; }

// CLI supplier refresh may replace source fields, while local product_edits stay
// separate and always win. No old WooCommerce product object is accepted here.
export function normalizeSupplier(input:unknown,incumbent=catalog()) {
  const id=z.string().min(1).max(200),name=z.string().min(1).max(500);
  const row=z.record(z.string(),z.unknown());
  const schema=z.object({categories:z.array(z.object({id,parent_id:id.nullish(),name_en:name,name_lt:name.nullish()}).passthrough()).min(1).max(500),lines:z.array(z.object({id,name,brand:name}).passthrough()).max(2000),products:z.array(z.object({id,name,brand:name,category_id:id,subcategory_id:id,line_id:id.nullish(),source_url:z.url().max(2000),images:z.array(row).max(500),sections:z.array(row).max(500),documents:z.array(row).max(200),configurations:z.array(row).max(500)}).passthrough()).min(1).max(2000)});
  const parsed=schema.safeParse(input);if(!parsed.success)throw new Error('Netinkamas tiekėjo eksporto formatas. Naudokite nextjs_catalog.json.');const data=parsed.data;
  for(const rows of [data.categories,data.products,data.lines])if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Tiekėjo ID negali kartotis.');
  const categoryMap=new Map(incumbent.categories.map(c=>[c.id,c])),lineMap=new Map(incumbent.lines.map(l=>[l.id,l]));
  const categories:Category[]=data.categories.map(c=>({id:c.id,parentId:c.parent_id||null,name:c.name_lt||c.name_en,nameEn:c.name_en,slug:categoryMap.get(c.id)?.slug||slugify(c.name_lt||c.name_en),icon:categoryMap.get(c.id)?.icon||null}));
  if(new Set(categories.map(c=>(c.parentId||'root')+':'+c.slug)).size!==categories.length||categories.some(c=>c.parentId&&!categories.some(p=>p.id===c.parentId&&!p.parentId)))throw new Error('Kategorijų ryšiai arba adresai netinkami.');
  const existing=new Map(incumbent.products.map(p=>[p.id,p]));
  const paths=new Set<string>();
  const products:Product[]=data.products.map(raw=>{
    const p=raw as Record<string,any>;
    const source=new URL(p.source_url);if(!p.id.startsWith('product_')||source.protocol!=='https:'||source.hostname!=='www.nowystyl.com'||source.username||source.password) throw new Error('Leidžiamas tik Nowy Styl tiekėjo eksportas.');
    const category=categories.find(c=>c.id===p.category_id),sub=categories.find(c=>c.id===p.subcategory_id);
    if(!category||category.parentId||!sub||sub.parentId!==category.id) throw new Error('Prekė neturi galiojančios kategorijos.');
    if(p.line_id&&!data.lines.some(l=>l.id===p.line_id))throw new Error('Prekės linijos ryšys netinkamas.');
    const prior=existing.get(p.id);
    let slug=prior?.slug||slugify(p.name)+'-'+sub.slug;
    if(paths.has(category.slug+'/'+slug))slug+='-'+p.id.slice(-8);
    paths.add(category.slug+'/'+slug);
    const gallery=uniqueGalleryPhotos((p.images||[]).map((i:any)=>i.display_url||i.url).filter((url:string)=>safeImage(url)&&!!productPhotograph(url)));
    return {id:p.id,name:p.name,brand:p.brand,categoryId:category.id,subcategoryId:sub.id,categorySlug:prior?.categorySlug||category.slug,slug,
      lineId:p.line_id||null,image:productPhotograph(prior?.image)?prior!.image:gallery[0]||null,gallery:prior?.gallery?uniqueGalleryPhotos(prior.gallery.filter(src=>!!productPhotograph(src))):gallery,
      description:prior?.description||`${p.name} – ${sub.name.toLocaleLowerCase('lt')} iš ${p.brand} asortimento. Dėl komplektacijos ir kainos pateikite užklausą.`,
    sourceDescription:p.sections.filter((s:any)=>s.source_module&&typeof s.text==='string'&&!s.text.trim().toLowerCase().startsWith('gallery')&&!s.text.trim().toLowerCase().startsWith('functions and options')).map((s:any)=>s.text.replace(/\u200b/g,'').trim()).join('\n\n'),sourceUrl:p.source_url,
      documents:(p.documents||[]).filter((d:any)=>safeDocument(d.url)).map((d:any)=>({title:String(d.title),url:String(d.url)})),
      configurations:p.configurations.map((c:any,n:number)=>{if(typeof c.id!=='string'||typeof c.description!=='string')throw new Error('Netinkama produkto konfigūracija.');return {id:c.id,name:`Konfigūracija ${n+1}`,description:c.description,image:safeImage(c.image_url)&&productPhotograph(c.image_url)?c.image_url:null,code:typeof c.base_article_number==='string'?c.base_article_number:null,configurator:typeof c.configurator_url==='string'&&c.configurator_url.startsWith('https://configurator.nowystyl.com/')?c.configurator_url:null};}),
      features:[],isNew:!!p.is_new,published:false,translationReviewed:false};
  });
  const seen=new Set<string>();
  const lines:Line[]=data.lines.map((l:any)=>{
    let slug=lineMap.get(l.id)?.slug||slugify(l.name);if(seen.has(slug))slug+='-'+String(l.id).slice(-8);seen.add(slug);
    const related=products.filter(p=>p.lineId===l.id);
    return {id:String(l.id),name:String(l.name),brand:String(l.brand),slug,image:related[0]?.image||null,productIds:related.map(p=>p.id)};
  });
  return {categories,products,lines};
}
export function safeImage(value:string) {
  if(typeof value!=='string')return false;
  if(/^\/(media|wp-content\/uploads)\/[a-zA-Z0-9._%/\-]+$/.test(value)&&!value.includes('..'))return true;
  try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.nowystyl.com'&&u.pathname.startsWith('/getmedia/');}catch{return false;}
}
export function safeDocument(value:string) {
  try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='www.nowystyl.com'||u.hostname==='dam.nowystyl.com');}catch{return false;}
}
