import type {Product} from './types';
import {productBuilderSteps} from './duo-builder';

/** Preserve all former flat controls when adapting models without a curated article. */
export function studioBuilderSteps(product:Product,choices:Record<string,string[]>,curated:boolean,finishFields:readonly string[]=[]){
 if(curated&&!finishFields.length)return productBuilderSteps(product,choices).map(s=>({...s,fields:[...s.fields],label:s.id==='movement'?'Mechanizmai':s.label}));
 // The same sequence as the approved studio, with only the model's real fields.
 const fields=Object.keys(choices);
 const movement=fields.filter(k=>['CMECHANISM','CBACKRESTMOVEMECH','CGASLIFT'].includes(k));
 const supports=fields.filter(k=>['CHEADREST','CARMRESTS','CLUMBARSUPPORT'].includes(k));
 const supportNames=[choices.CHEADREST&&'galvos atrama',choices.CLUMBARSUPPORT&&'juosmens atrama',choices.CARMRESTS&&'porankiai'].filter(Boolean) as string[];
 const supportTitle=supportNames.length>2?supportNames.slice(0,-1).join(', ')+' ir '+supportNames.at(-1):supportNames.join(' ir ');
 const finishes=fields.filter(k=>finishFields.includes(k)||k.includes('GROUP')||/COLOR|CHCOL/.test(k)&&!k.startsWith('CPLASTIC')&&!k.startsWith('CFRAME'));
 const assigned=new Set([...movement,...supports,...finishes]);
 const construction=fields.filter(k=>!assigned.has(k));
 return [
  {id:'movement',label:'Mechanizmai',title:choices.CBACKRESTMOVEMECH?'Mechanizmas ir atlošo judėjimas':choices.CGASLIFT?'Mechanizmas ir aukščio reguliavimas':'Mechanizmas',fields:movement},
  {id:'supports',label:'Atramos',title:supportTitle.charAt(0).toUpperCase()+supportTitle.slice(1),fields:supports},
  {id:'construction',label:'Konstrukcija',title:'Konstrukcija ir apdaila',fields:construction},
  {id:product.categorySlug==='rasomieji-stalai-ir-darbo-vietos'?'colors':'finishes',label:product.categorySlug==='rasomieji-stalai-ir-darbo-vietos'?'Spalvos':'Apmušalai',title:product.categorySlug==='rasomieji-stalai-ir-darbo-vietos'?'Apdaila ir spalvos':'Apmušalai ir spalvos',fields:finishes},
 ].filter(s=>s.fields.length>0);
}
export function studioStepIntro(id:string,choices:Record<string,string[]>){
 if(id==='movement')return choices.CBACKRESTMOVEMECH?'Pasirinkite mechanizmą ir atlošo judėjimą.':choices.CGASLIFT?'Pasirinkite mechanizmą ir aukščio reguliavimą.':'Pasirinkite mechanizmą.';
 if(id==='supports')return choices.CHEADREST?'Pasirinkite galvos atramą ir porankius.':choices.CARMRESTS?'Pasirinkite atramas ir porankius.':'Pasirinkite atramas ir priedus.';
 if(id==='construction')return choices.CBASE||choices.CCASTORS?'Pasirinkite konstrukciją, pagrindą ir ratukus.':'Pasirinkite konstrukciją ir jos apdailą.';
 if(id==='colors')return 'Pasirinkite spalvas ir galutinę komplektaciją.';
 return 'Pasirinkite apmušalus ir jų spalvas.';
}

export function productStudioPresentation(product:Product & {publicHeading?:string},paragraphs=product.modelArticle?.paragraphs||[]){
 const rooms:Record<string,string>={'23636152':'/media/product-studio/xilium-duo-office-02.png','23636148':'/media/product-studio/xilium-duo-23636148-office.png'};
 const scene=product.id==='product_xilium-swivel-chairs_0fe4091b'&&product.modelConfigurationId?rooms[product.modelConfigurationId]:undefined;
 return {illustrated:!!scene,image:scene||product.image,heading:product.publicHeading||product.name,overview:paragraphs.filter(text=>text.trim()&&text.trim()!==product.description.trim()),descriptionParagraphs:studioDescriptionParagraphs(product.description)};
}

/** Format existing sentences only; metadata and approved wording are not rewritten. */
export function studioDescriptionParagraphs(text:string){
 if(text.length<=1600)return text?[text]:[];
 const sentences=[...new Intl.Segmenter('lt',{granularity:'sentence'}).segment(text)].map(s=>s.segment.trim()).filter(Boolean);
 const paragraphs:string[]=[];let current='';
 for(const sentence of sentences){
  if(current&&(current.length+sentence.length>600)){paragraphs.push(current);current='';}
  current+=(current?' ':'')+sentence;
 }
 if(current)paragraphs.push(current);
 return paragraphs;
}
