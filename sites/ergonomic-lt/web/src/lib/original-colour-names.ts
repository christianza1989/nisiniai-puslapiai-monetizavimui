import english from'../../content/manufacturer-english-review.json';
import materials from'../../content/text-review-material-references.json';
import inventory from'../../content/text-review-inventory.json';
import aliases from'../../content/manufacturer-runtime-aliases.json';
import{isColourField}from'./colour-fields';
const models:Record<string,Record<string,string>>=Object.fromEntries(Object.entries(inventory.models).map(([code])=>[code,{...(materials.models as Record<string,Record<string,string>>)[code],...(english.models as Record<string,Record<string,string>>)[code]}]));
const canonical=new Map(aliases.rows.map(r=>[r.model+'|'+r.binding,r.supplierValue]));
const references=new Map<string,Set<string>>();
for(const[model,labels]of Object.entries(models))for(const[binding,name]of Object.entries(labels)){
 const match=binding.match(/^value:([^=]+)=(.*)$/);if(!match||!isColourField(match[1]))continue;
 const group=inventory.models[model as keyof typeof inventory.models].path.includes('/rasomieji-stalai-ir-darbo-vietos/')?'desks':'chairs',key=group+'|'+binding,set=references.get(key)||new Set<string>();set.add(name);references.set(key,set);
}
/** Actual supplier spelling only; no reverse translation or colour inference. */
export function originalColourName(model:string,field:string,value:string){
 if(!isColourField(field)||/^(?:NONE|UNDEFINED|NOTDEFINED|N\/A)$/i.test(value))return;
 const binding='value:'+field+'='+value,selected=canonical.get(model+'|'+binding),other=selected?'value:'+field+'='+selected:binding;
 const own=models[model]?.[binding]||models[model]?.[other];if(own)return own;
 const group=inventory.models[model as keyof typeof inventory.models]?.path.includes('/rasomieji-stalai-ir-darbo-vietos/')?'desks':'chairs',set=references.get(group+'|'+other)||references.get(group+'|'+binding);
 return set?.size===1?[...set][0]:undefined;
}
