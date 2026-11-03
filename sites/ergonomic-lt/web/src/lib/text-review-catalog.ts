import {createHash} from 'node:crypto';
import {dbAll} from './db';
import {modelProduct} from './product-models';
import {publicProductView} from './public-product-copy';
import {contentTextKey} from './text-review-types';
import type {Seed} from './types';
/** Display overrides never modify supplier identity, URLs or Native values. */
export async function reviewedCatalogTitles(seed:Seed):Promise<Seed>{
 const rows=await dbAll<{key:string;published:string;published_hash:string}>('SELECT key,published,published_hash FROM text_review_edits WHERE published IS NOT NULL');
 if(!rows.length)return seed;
 const edits=new Map(rows.map(r=>[r.key,r]));
 return {...seed,products:seed.products.map(p=>{
  const names:Record<string,string>={};
  for(const sample of ['line',...p.configurations.map(c=>c.id)]){
   const edit=edits.get(contentTextKey(p.id+':'+sample,'title'));if(!edit)continue;
   const original=sample==='line'?p:modelProduct(p,p.configurations.find(c=>c.id===sample)!);
   const view=publicProductView({...original,textReviewHeading:undefined});
   const hash=createHash('sha256').update(JSON.stringify(view.publicHeading||view.name)).digest('hex');
   if(edit.published_hash===hash)names[sample]=edit.published;
  }
  return Object.keys(names).length?{...p,textReviewNames:names,textReviewHeading:names.line}:p;
 })};
}
