// Server catalogue boundary. Private evidence must never be passed to clients.
import registryData from '../../content/photo-attribution.json';
import sourceSeed from '../../content/seed.json';
import type {Product,Configuration} from './types';
import {supplierOptions} from './configuration-labels';
import {productPhotograph,productPhotographs} from './product-photographs';
type Record={primary:string;gallery:string[]};
type Family={configurations:{[id:string]:Record};standalone?:{primary:string;gallery:string[]};familyGallery?:string[]};
const registry=registryData as unknown as {records:{[id:string]:Family}};
const signature=(c:Configuration)=>JSON.stringify([c.code,[...supplierOptions(c)].sort()]);
const originalSignatures=new Map((sourceSeed.products as unknown as Product[]).map(p=>[p.id,new Map(p.configurations.map(c=>[c.id,signature(c)]))]));
export function attributedProduct(product:Product):Product{
 const evidence=registry.records[product.id];
 const configurations=product.configurations.map(c=>{
  const own=evidence?.configurations[c.id],accepted=!!own&&originalSignatures.get(product.id)?.get(c.id)===signature(c);
  return {...c,image:accepted?productPhotograph(own.primary):null,gallery:accepted?productPhotographs(own.gallery):[],galleryOwner:product.id+':'+c.id};
 });
 if(configurations.length){
  const gallery=productPhotographs([...configurations.flatMap(c=>[...(c.image?[c.image]:[]),...c.gallery]),...(evidence?.familyGallery||[])]);
  const original=productPhotograph(product.image),image=original&&gallery.includes(original)?original:gallery[0]||null;
  return {...product,image,gallery,configurations};
 }
 const own=evidence?.standalone;
 return {...product,image:own?productPhotograph(own.primary):null,gallery:own?productPhotographs(own.gallery):[],configurations};
}
