import type {Product,Configuration} from './types';
import {localizeConfiguration} from './configuration-labels';
import {uniqueGalleryPhotos} from './gallery-photo-identity';
import {editorialConfiguration,editorialModelArticle} from './editorial-server';
import {catalogModelVisible,historicalCatalogPreset} from './catalog-consolidation';
import {privateArticle} from './publication-copy-view';

// Supplier record IDs remain the authority for quotes, imports and saved 3D
// specifications. Public model URLs identify the individual supplier example.
export function modelName(product:Product,configuration:Configuration){
  const source=configuration.sourceDescription||configuration.description;
  const name=source.replace(/\bNowy\s+Styl\b|\bKusch\s*\+\s*Co\b|\bSOHOS\b/gi,'')
    .replace(/\b(?:swivel chairs?|meeting chairs?|conference chairs?|visitor chairs?|chairs?|armchairs?|sofas?|coffee tables?|cafe tables?|tables?|desks?|stools?|pouffes?|benches?|beam seating|cabinets?|pedestals?|storage|screens?|partitions?)\b/gi,'')
    .replace(/\s+/g,' ').trim();
  return name||product.name;
}
export function modelProduct(product:Product,configuration:Configuration):Product{
  const localized=localizeConfiguration(configuration,product.name,product.configurations.findIndex(x=>x.id===configuration.id));
  const c={...localized,description:editorialConfiguration(product.id,configuration.id,localized.description)};
  const modelArticle=privateArticle(product,configuration.id,editorialModelArticle(product.id,configuration.id));
  const specific=uniqueGalleryPhotos([c.image,...(c.galleryOwner===product.id+':'+c.id?c.gallery||[]:[])]);
  const gallery=specific;
  return {...product,...(modelArticle?{modelArticle,description:modelArticle.summary}:{}),name:modelArticle?.configurable?.displayName||modelName(product,c),familyName:product.name,familySlug:product.slug,
    slug:((product as Product&{publicationOriginalCount?:number}).publicationOriginalCount??product.configurations.length)>1?`${product.slug}-modelis-${encodeURIComponent(c.id)}`:product.slug,
    modelConfigurationId:c.id,image:c.image||specific[0]||null,gallery,modelGalleryCount:specific.length,
    configurations:product.configurations.map(x=>x.id===c.id?c:x)};
}
export function productModels(products:Product[]):Product[]{
  return products.flatMap(p=>p.configurations.length?p.configurations.filter(c=>typeof (p as Product&{publicationOriginalCount?:number}).publicationOriginalCount==='number'||catalogModelVisible(p.id,c)).map(c=>modelProduct(p,c)):[p]);
}
/** Historical source/quote checks deliberately include retired public cards. */
export function allProductModels(products:Product[]):Product[]{
 return products.flatMap(p=>p.configurations.length?p.configurations.map(c=>modelProduct(p,c)):[p]);
}
// Resolve a saved original example at its surviving public URL. The selection
// retains its own photos, editorial article, supplier ID and order options.
export function resolveCatalogProduct(products:Product[],category:string,slug:string,preset?:unknown){
 const resolved=resolveProduct(products,category,slug);if(!resolved)return;
 const keeper=selectedModelConfiguration(resolved);if(!keeper)return resolved;
 const id=historicalCatalogPreset(resolved.id,keeper,preset);if(!id||id===keeper.id)return resolved;
 const parent=products.find(p=>p.id===resolved.id),configuration=parent?.configurations.find(c=>c.id===id&&c.code===keeper.code);
 if(!parent||!configuration)return;
 return {...modelProduct(parent,configuration),slug:resolved.slug};
}
export function resolveProduct(products:Product[],category:string,slug:string){
  const parents=products.filter(p=>p.categorySlug===category);
  const parent=parents.find(p=>p.slug===slug);
  if(parent)return parent.configurations.length===1?modelProduct(parent,parent.configurations[0]):parent;
  for(const p of parents){
    const prefix=p.slug+'-modelis-';if(!slug.startsWith(prefix))continue;
    const c=p.configurations.find(c=>encodeURIComponent(c.id)===slug.slice(prefix.length));
    if(c)return modelProduct(p,c);
  }
}
export function selectedModelConfiguration(p:Product){return p.configurations.find(c=>c.id===p.modelConfigurationId);}
