import type {Product,ConfigurableArticle,TechnicalRow} from './types';
import type {ExpandedState} from './expanded-configurator';
export type ResolvedArticleSection={id:string;heading:string;fields:string[];paragraphs:string[];rows:TechnicalRow[];missingProfile:boolean};
export type ResolvedConfigurationArticle={intro:string[];scopeNote:string;photoNote:string;sections:ResolvedArticleSection[]};
export function configurableArticle(product:Product):ConfigurableArticle|undefined{
 const article=product.modelArticle?.configurable;
 const model=product.configurations.find(c=>c.id===product.modelConfigurationId);
 return article&&article.productId===product.id&&article.configurationId===product.modelConfigurationId&&article.baseArticle===model?.code?article:undefined;
}
export function articleChoiceLabel(product:Product,field:string,value:string){return configurableArticle(product)?.choiceLabels[field]?.[value];}
export function articleFieldLabels(product:Product){return configurableArticle(product)?.fieldLabels||{};}
const finishField=(k:string)=>(!k.startsWith('CPLASTIC')||k==='CPLASTICCOLOR')&&(k.includes('GROUP')||/COLOR|CHCOL/.test(k));
// Input is the same validated, normalized selection used by geometry and order
// serialization. This module has no browser state, network calls or AI runtime.
export function resolveConfigurationArticle(product:Product,state:ExpandedState,choices:Record<string,string[]>,label:(k:string,v:string)=>string,fieldLabels:Record<string,string>):ResolvedConfigurationArticle|undefined{
 const article=configurableArticle(product);if(!article)return;
 return {intro:article.intro,scopeNote:article.scopeNote,photoNote:article.photoNote,sections:article.sections.map(section=>{
  const fields=section.id==='finishes'?Object.keys(choices).filter(finishField):section.fields.filter(k=>choices[k]);
  const blocks=section.blocks.filter(b=>Object.entries(b.when).every(([k,v])=>state.values[k]===v));
  const missing=section.fields.filter(k=>choices[k]&&!section.blocks.some(b=>b.when[k]===state.values[k]&&Object.entries(b.when).every(([field,value])=>state.values[field]===value)));
  // A newly introduced supplier option may not silently inherit a prior
  // component's claims. Its code is still present; specific facts are withheld.
  const paragraphs=blocks.flatMap(b=>b.paragraphs),rows=blocks.flatMap(b=>b.rows);
  for(const k of missing){paragraphs.push('Pasirinktas variantas: '+label(k,state.values[k])+'. Jo techninius duomenis patikslinsime pasiūlyme.');rows.push({label:fieldLabels[k]||k,value:state.values[k]});}
  if(section.id==='finishes')for(const k of fields)rows.push({label:fieldLabels[k]||k,value:label(k,state.values[k])+(label(k,state.values[k])===state.values[k]?'':' ('+state.values[k]+')')});
  return {id:section.id,heading:section.heading,fields,paragraphs,rows,missingProfile:missing.length>0};
 }).filter(section=>section.fields.length||section.paragraphs.length||section.rows.length)};
}
