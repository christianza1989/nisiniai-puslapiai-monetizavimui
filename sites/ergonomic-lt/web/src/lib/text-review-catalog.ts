import {createHash} from 'node:crypto';
import {dbAll} from './text-review-db';
import {modelProduct} from './product-models';
import {publicProductView} from './public-product-copy';
import {contentTextKey} from './text-review-types';
import inventoryData from '../../content/text-review-inventory.json';
import type {Seed} from './types';
const inventory=inventoryData as unknown as {models:Record<string,{bindings:Record<string,string>}>;terms:Record<string,{sourceHash:string}>};
const nameIds=[...new Set(Object.values(inventory.models).flatMap(m=>Object.entries(m.bindings).filter(([key])=>key.startsWith('name:')).map(([,id])=>id)))];
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Display overrides never modify supplier identity, URLs or Native values. */
export async function reviewedCatalogTitles(seed:Seed):Promise<Seed>{
 const where=["key LIKE 'content:%:title'",...nameIds.map(()=>'(key=? OR key LIKE ?)')].join(' OR ');
 const rows=await dbAll<{key:string;published:string;published_hash:string}>('SELECT key,published,published_hash FROM text_review_edits WHERE published IS NOT NULL AND ('+where+')',...nameIds.flatMap(id=>[id,'local:%:'+id]));
 if(!rows.length)return seed;
 const edits=new Map(rows.map(r=>[r.key,r]));
 return {...seed,products:seed.products.map(p=>{
  const names:Record<string,string>={};
  for(const sample of ['line',...p.configurations.map(c=>c.id)]){
   const edit=edits.get(contentTextKey(p.id+':'+sample,'title'));
   const original=sample==='line'?p:modelProduct(p,p.configurations.find(c=>c.id===sample)!);
   const view=publicProductView({...original,textReviewHeading:undefined});
   const hash=createHash('sha256').update(JSON.stringify(view.publicHeading||view.name)).digest('hex');
   const baseline=view.publicHeading||view.name;
   let title=edit?.published_hash===hash?edit.published:baseline;
   const code=original.configurations.find(c=>c.id===original.modelConfigurationId)?.code;
   for(const [key,id]of Object.entries(code?inventory.models[code]?.bindings||{}:{}))if(key.startsWith('name:')){
    const local=edits.get('local:'+code+':'+id),global=edits.get(id),source=inventory.terms[id]?.sourceHash;
    const value=local?.published_hash===source?local.published:global?.published_hash===source?global.published:undefined;
    if(value)title=title.replace(new RegExp('(^|[^A-Za-z0-9])'+escaped(key.slice(5))+'(?=$|[^A-Za-z0-9])','g'),(_,prefix)=>prefix+value);
   }
   if(title!==baseline||edit?.published_hash===hash)names[sample]=title;
  }
  return Object.keys(names).length?{...p,textReviewNames:names,textReviewHeading:names.line}:p;
 })};
}
