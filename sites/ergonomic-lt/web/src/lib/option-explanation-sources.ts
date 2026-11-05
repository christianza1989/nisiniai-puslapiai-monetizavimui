import manufacturer from '../../content/manufacturer-english-review.json';
import legacy from '../../content/configurator-expanded.json';
import seed from '../../content/seed.json';
import inventory from '../../content/text-review-inventory.json';
type ModelMeta={path:string;name:string;bindings:Record<string,string>};
export const explanationSourceModels:Record<string,Record<string,string>>={...manufacturer.models};
export const explanationSourceMetadata:Record<string,ModelMeta>={...inventory.models};
export const legacyExplanationModels=new Set(legacy.families.map(f=>f.baseArticle));
// Older captured families predate the translation inventory. Read their exact
// option domains and preserved supplier palettes, never labels from another model.
for(const family of legacy.families){
 const choices=new Map<string,Set<string>>();
 function add(field:string,values:unknown){if(!Array.isArray(values))return;const set=choices.get(field)||new Set<string>();for(const v of values)if(typeof v==='string')set.add(v);choices.set(field,set);}
 function walk(value:unknown){
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){
   if(key==='choices'&&child&&typeof child==='object')for(const [field,values]of Object.entries(child))add(field,values);
   else if((key==='defaults'||key==='changes')&&child&&typeof child==='object')for(const [field,v]of Object.entries(child))add(field,[v]);
   else if(typeof child==='object')walk(child);
  }
 }
 walk(family.anchors);
 const labels={...explanationSourceModels[family.baseArticle]},palettes=legacy.palettes as Record<string,Record<string,{text?:string}>>;
 for(const [field,values]of choices)for(const value of values){const label=palettes[field]?.[value]?.text;if(label&&!labels['value:'+field+'='+value])labels['value:'+field+'='+value]=label;}
 explanationSourceModels[family.baseArticle]=labels;
 const product=seed.products.find(p=>p.id===family.productId);
 if(product&&!explanationSourceMetadata[family.baseArticle])explanationSourceMetadata[family.baseArticle]={path:'/produktai/'+product.categorySlug+'/'+product.slug+'-modelis-'+family.sample+'/',name:product.name,bindings:{}};
}
