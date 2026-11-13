import {createHash} from 'node:crypto';
import {dbAll,dbSelectBatch} from './text-review-db';
import {modelProduct} from './product-models';
import {publicProductView} from './public-product-copy';
import {contentTextKey} from './text-review-types';
import inventoryData from '../../content/text-review-inventory.json';
import type {Seed} from './types';
import type {TextEdit} from './text-review-types';
import {displayedReviewText,suggestedModelTitle,textReviewProposalPreview} from './text-review-state';
const inventory=inventoryData as unknown as {models:Record<string,{bindings:Record<string,string>}>;terms:Record<string,{sourceHash:string;suggested:string}>};
const nameIds=[...new Set(Object.values(inventory.models).flatMap(m=>Object.entries(m.bindings).filter(([key])=>key.startsWith('name:')).map(([,id])=>id)))];
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
/** Display overrides never modify supplier identity, URLs or Native values. */
export async function reviewedCatalogTitles(seed:Seed,onlyCurrentProducts=false):Promise<Seed>{
 const where=["key LIKE 'content:%:title'",...nameIds.map(()=>'(key=? OR key LIKE ?)')].join(' OR ');
 const preview=textReviewProposalPreview();
 // Choice requests need the current product's titles and exact term bindings.
 // Do not make D1 scan every model title/name with a catalogue-wide OR query.
 const keys=new Set<string>();
 if(onlyCurrentProducts)for(const p of seed.products){
  for(const sample of ['line',...p.configurations.map(c=>c.id)])keys.add(contentTextKey(p.id+':'+sample,'title'));
  for(const c of p.configurations)for(const [key,id]of Object.entries(inventory.models[c.code||'']?.bindings||{}))if(key.startsWith('name:')){keys.add(id);keys.add('local:'+c.code+':'+id);}
 }
 const wanted=[...keys],commands=[];
 for(let offset=0;offset<wanted.length;offset+=70){const params=wanted.slice(offset,offset+70);commands.push({sql:'SELECT * FROM text_review_edits WHERE '+(preview?'':'published IS NOT NULL AND ')+'key IN ('+params.map(()=>'?').join(',')+')',params});}
 const rows=onlyCurrentProducts?(await dbSelectBatch<TextEdit>(commands)).flat():await dbAll<TextEdit>('SELECT * FROM text_review_edits WHERE '+(preview?'':'published IS NOT NULL AND ')+'('+where+')',...nameIds.flatMap(id=>[id,'local:%:'+id]));
 if(!rows.length&&!preview)return seed;
 const edits=new Map(rows.map(r=>[r.key,r]));
 return {...seed,products:seed.products.map(p=>{
  const names:Record<string,string>={},humanTitles:string[]=[];
  for(const sample of ['line',...p.configurations.map(c=>c.id)]){
   const edit=edits.get(contentTextKey(p.id+':'+sample,'title'));
   const original=sample==='line'?p:modelProduct(p,p.configurations.find(c=>c.id===sample)!);
   const view=publicProductView({...original,textReviewHeading:undefined});
   const hash=createHash('sha256').update(JSON.stringify(view.publicHeading||view.name)).digest('hex');
   const baseline=view.publicHeading||view.name;
   if(preview?edit?.source_hash===hash&&(edit.state==='kept'||!!edit.draft.trim()):edit?.published_hash===hash&&edit.published!==null)humanTitles.push(sample);
   let title=displayedReviewText({sourceHash:hash,suggested:suggestedModelTitle(original,baseline)},edit,baseline);
   const code=original.configurations.find(c=>c.id===original.modelConfigurationId)?.code;
   for(const [key,id]of Object.entries(code?inventory.models[code]?.bindings||{}:{}))if(key.startsWith('name:')){
    const local=edits.get('local:'+code+':'+id),global=edits.get(id);
    const term=inventory.terms[id];
    const globalValue=term?displayedReviewText(term,global,''):'';
    const value=term&&local?displayedReviewText(term,local,globalValue):globalValue;
    if(value)title=title.replace(new RegExp('(^|[^A-Za-z0-9])'+escaped(key.slice(5))+'(?=$|[^A-Za-z0-9])','g'),(_,prefix)=>prefix+value);
   }
   if(title!==baseline||edit?.published_hash===hash)names[sample]=title;
  }
  return Object.keys(names).length||humanTitles.length?{...p,textReviewNames:names,textReviewHeading:names.line,textReviewHumanTitles:humanTitles}:p;
 })};
}
