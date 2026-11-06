import aliases from'../../content/manufacturer-runtime-aliases.json';
import type{ReviewScope}from'./text-review-types';
const canonical=new Map(aliases.rows.map(row=>[row.model+'|'+row.binding,row.supplierValue]));
export function canonicalReviewValue(model:string,field:string,value:string){return canonical.get(model+'|value:'+field+'='+value)||value;}
/** Presentation lookup only. A verified supplier spelling never changes the
 * selected code, geometry or quote. Existing human wording has precedence.
 */
export function publishedReviewValue(review:ReviewScope,model:string,field:string,value?:string){
 if(value!==undefined&&review.publicScope.colourNames?.[model+':'+field+'='+value])return review.publicScope.colourNames[model+':'+field+'='+value];
 const binding=(value===undefined?'field:':'value:')+field+(value===undefined?'':'='+value),rawId=review.publicScope.bindings[model]?.[binding],raw=rawId?review.publicScope.values[model+':'+rawId]:undefined;
 if(value===undefined)return raw;
 const selected=canonicalReviewValue(model,field,value);if(selected===value)return raw;
 const id=review.publicScope.bindings[model]?.['value:'+field+'='+selected],preferred=id?review.publicScope.values[model+':'+id]:undefined;
 const entry=rawId&&review.entries.find(e=>e.id===rawId),edit=entry&&(entry.edit||entry.globalEdit);
 if(raw&&raw!==value&&raw!==selected&&edit&&edit.source_hash===entry.sourceHash)return raw;
 return preferred||raw;
}
