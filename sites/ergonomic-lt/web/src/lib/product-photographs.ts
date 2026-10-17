import rejectedData from '../../content/rejected-product-images.json';
import {optimizedProductImage} from './product-media';
import type {Product} from './types';
import {uniqueGalleryPhotos} from './gallery-photo-identity';

const rejected=new Set<string>(rejectedData);
const nonPhoto=/(?:^|[-_.])(?:logo|icon|placeholder|spacer|blank|pixel)(?:[-_.]|$)/i;
// Bounded memo of a pure transform against immutable asset metadata. Product
// edits and publication state are still read for every catalog render.
const photoMemo=new Map<string,string|null>();
function fileName(source:string){try{return decodeURIComponent(new URL(source,'https://catalog.invalid').pathname).split('/').pop()||'';}catch{return '';}}

// URL safety is checked by the importer/admin separately. A valid image URL
// may still be a logo, feature icon or empty graphic, rather than a photograph.
export function productPhotograph(source:string|null|undefined):string|null{
  if(!source)return null;
  if(photoMemo.has(source))return photoMemo.get(source)!;
  if(photoMemo.size>=20000)photoMemo.clear();
  const result=resolvePhotograph(source);photoMemo.set(source,result);return result;
}
function resolvePhotograph(source:string){
  if(rejected.has(source)||nonPhoto.test(fileName(source)))return null;
  const resolved=optimizedProductImage(source);
  if(rejected.has(resolved)||nonPhoto.test(fileName(resolved))||! /\.(?:jpe?g|png|webp|avif)$/i.test(fileName(resolved)))return null;
  return resolved;
}
export function productPhotographs(sources:string[]){return uniqueGalleryPhotos(sources.map(productPhotograph));}
export function cleanProductPhotographs(product:Product):Product{
  const configurations=product.configurations.map(c=>({...c,image:productPhotograph(c.image),gallery:productPhotographs(c.gallery||[])}));
  const gallery=productPhotographs(product.gallery);
  const image=productPhotograph(product.image)||configurations.find(c=>c.image)?.image||gallery[0]||null;
  return {...product,image,gallery:gallery.length?gallery:(image?[image]:[]),configurations};
}
