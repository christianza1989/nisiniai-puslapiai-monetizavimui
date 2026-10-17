import type {Product} from './types';
import type {ExpandedState} from './expanded-configurator';
import {configurableArticle} from './configuration-article';
export const duoSteps=[
 {id:'movement',label:'Judėjimas',title:'Mechanizmas ir atlošo judėjimas',fields:['CMECHANISM','CBACKRESTMOVEMECH']},
 {id:'supports',label:'Atramos',title:'Galvos atrama ir porankiai',fields:['CHEADREST','CARMRESTS']},
 {id:'construction',label:'Konstrukcija',title:'Konstrukcija ir ratukai',fields:['CPLASTICCOLORVERSION2','CBASE','CCASTORS','CBACKRESTCONNECTOR']},
 {id:'finishes',label:'Apmušalai',title:'Apmušalai ir spalvos',fields:[]},
] as const;
export type BuilderStep={id:string;label:string;title:string;fields:string[]};
export function productBuilderSteps(product:Product,choices:Record<string,string[]>):BuilderStep[]{
 if(product.id.includes('xilium-swivel'))return duoSteps.map((s,i)=>({...s,fields:duoStepFields(i,choices)}));
 if(product.id.includes('bjarg-swivel')||product.id.includes('4me-swivel')){
  const finish=Object.keys(choices).filter(k=>k.includes('GROUP')||/COLOR|CHCOL/.test(k)&&!k.startsWith('CPLASTIC'));
  const movement=['CMECHANISM','CGASLIFT'].filter(k=>choices[k]);
  const supports=['CHEADREST','CLUMBARSUPPORT','CARMRESTS'].filter(k=>choices[k]);
  const used=new Set([...finish,...movement,...supports]);
  return [{id:'movement',label:'Judėjimas',title:choices.CGASLIFT?'Mechanizmas ir aukščio reguliavimas':'Mechanizmas',fields:movement},{id:'supports',label:'Atramos',title:choices.CHEADREST?'Galvos atrama, juosmens atrama ir porankiai':'Juosmens atrama ir porankiai',fields:supports},{id:'construction',label:'Konstrukcija',title:choices.CSEATFOAM||choices.CBACKRESTFOAM?'Pagrindas, ratukai ir paminkštinimas':'Pagrindas ir ratukai',fields:Object.keys(choices).filter(k=>!used.has(k))},{id:'finishes',label:'Apmušalai',title:'Apmušalai ir spalvos',fields:finish}].filter(s=>s.fields.length);
 }
 const groups=Object.keys(choices).filter(k=>k.includes('GROUP'));
 const colors=Object.keys(choices).filter(k=>/COLOR|CHCOL/.test(k)&&(!k.startsWith('CPLASTIC')||k==='CPLASTICCOLOR'));
 const supports=['CSTACKINGPROTECTION','CBASE','CCASTORS','CGLIDES','CTABLET','CCONNECTOR','CNUMBERINGTYPE'].filter(k=>choices[k]);
 const preparation=['CASSEMBLY'].filter(k=>choices[k]);
 const assigned=new Set([...groups,...colors,...supports,...preparation]);
 const construction=Object.keys(choices).filter(k=>!assigned.has(k));
 return [
  {id:'construction',label:'Konstrukcija',title:'Konstrukcija ir apdaila',fields:construction},
  {id:'supports',label:'Atramos ir priedai',title:'Atramos ir priedai',fields:supports},
  {id:'finishes',label:'Apmušalai',title:'Apmušalo pasirinkimas',fields:groups},
  {id:'colors',label:'Spalvos',title:'Spalvos ir galutinė komplektacija',fields:[...colors,...preparation]},
 ].filter(s=>s.fields.length>0);
}
export function duoStepFields(index:number,choices:Record<string,string[]>){
 if(index===3)return Object.keys(choices).filter(k=>!k.startsWith('CPLASTIC')&&(k.includes('GROUP')||/COLOR|CHCOL/.test(k)));
 return duoSteps[index].fields.filter(k=>choices[k]);
}
export function duoControlExplanation(product:Product,state:ExpandedState,field:string){
 return configurableArticle(product)?.sections.filter(s=>s.fields.includes(field)).flatMap(s=>s.blocks.filter(b=>field in b.when&&Object.entries(b.when).every(([k,v])=>state.values[k]===v)).flatMap(b=>b.paragraphs))||[];
}
