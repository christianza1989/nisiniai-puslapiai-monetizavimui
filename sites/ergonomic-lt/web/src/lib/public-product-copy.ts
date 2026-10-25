import type {Product} from './types';
import {productHeading} from './product-presentation';

// Presentation only. Source IDs, manufacturer, URLs, codes and rules remain intact.
const supplierNames=String.raw`(?:SOHOS(?:\s+by\s+Nowy\s*Styl)?|Nowy\s*Styl|Kusch\s*\+\s*Co\.?)`;
export function publicProductText(value:string){
 return value
  .replace(new RegExp('iš\\s+'+supplierNames+'\\s+asortimento','gi'),'iš mūsų asortimento')
  .replace(new RegExp('(?<![\\p{L}\\p{N}])'+supplierNames+'(?![\\p{L}\\p{N}])','giu'),'')
  .replace(/\bby\s+(?=[.,;:]|$)/gi,'').replace(/[ \t]{2,}/g,' ').replace(/ +([,.;:])/g,'$1').trim();
}
export function publicProductCopy(product:Product):Product{
 return {...product,name:publicProductText(product.name),description:publicProductText(product.description),
  features:product.features.map(publicProductText),
  documents:product.documents.map(d=>({...d,title:publicProductText(d.title)||'Techninis dokumentas'})),
  configurations:product.configurations.map(c=>({...c,name:publicProductText(c.name),description:publicProductText(c.description)}))};
}
// Only this view is serialized to public client components. The authoritative
// catalogue and order resolution retain the private manufacturer reference.
export function publicProductView(product:Product):Product{
 const copy=publicProductCopy(product);
 return {...copy,publicHeading:productHeading(product),brand:'',sourceUrl:'',sourceDescription:'',documents:[],configurations:copy.configurations.map(c=>({...c,
  configurator:null,sourceDescription:c.sourceDescription?publicProductText(c.sourceDescription):undefined}))};
}
