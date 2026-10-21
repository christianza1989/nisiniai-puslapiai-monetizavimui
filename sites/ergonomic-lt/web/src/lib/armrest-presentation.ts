import data from '../../content/armrest-presentation.json';
import type {Configuration} from '@/lib/types';

type Presentation={fieldLabel:string;choices:Record<string,{label:string;sourceText:string}>};
const articles=data.articles as Record<string,Presentation>;
// Presentation metadata is separate from the immutable capture/compiler tools.
// Entries are exact article/option identities, never a guess from a code prefix.
export function armrestFieldLabel(article:string|null){return articles[article||'']?.fieldLabel;}
export function armrestChoiceLabel(article:string|null,field:string,value:string){
 return field==='CARMRESTS'?articles[article||'']?.choices[value]?.label:undefined;
}
export function armrestSourceText(article:string|null,value:string){return articles[article||'']?.choices[value]?.sourceText;}
export function presentArmrestConfiguration(configuration:Configuration,values:Record<string,string>,sourceFieldLabel?:string):Configuration{
 const value=armrestChoiceLabel(configuration.code,'CARMRESTS',values.CARMRESTS);
 const label=armrestFieldLabel(configuration.code);
 if(!value||!label)return configuration;
 return {...configuration,details:configuration.details?.map(row=>
  row.label===(sourceFieldLabel||'Armrests')||row.label===label?{label,value}:row)};
}

/** An unknown code cannot acquire an adjustable claim merely by falling through. */
export function safeArmrestFallback(field:string,value:string,label:string){
 return field==='CARMRESTS'&&label.includes(' · reguliuojami')?value:label;
}

const values=new Map<string,string>();
for(const article of Object.values(articles))for(const [value,choice] of Object.entries(article.choices)){
 if(values.has(value)&&values.get(value)!==choice.label)throw Error('Conflicting source-backed armrest labels');
 values.set(value,choice.label);
}
export function verifiedArmrestValueLabel(value:string){return values.get(value);}
