import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {approvedEnrichment} from './enrichments.mjs';
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const tokens=value=>value.match(/\[\[(?:open|close|void)\d+\]\]|\{\{p\d+\}\}/g)||[];
export const numberTokens=value=>(value.match(/\b\d+(?:[.,]\d+)?\b/g)||[]).map(n=>n.replace(',','.'));
export function validatePackage(candidate,baseline){
 assert.equal(candidate.schemaVersion,1,'Unsupported schema');
 assert.equal(candidate.siteId,'ergonomic-lt');assert.equal(candidate.canonicalHost,'ergonomic.lt');
 assert.equal(candidate.baselineId,baseline.baselineId,'Wrong baseline');
 const {fields:_,...header}=candidate,{fields:__,...expectedHeader}=baseline;
 assert.deepEqual(header,expectedHeader,'Readonly package header changed');
 assert.equal(candidate.fields.length,baseline.fields.length,'Fields missing or added');
 assert.deepEqual(candidate.fields.map(f=>f.id),baseline.fields.map(f=>f.id),'Readonly field order changed');
 const original=new Map(baseline.fields.map(f=>[f.id,f])),seen=new Set();
 for(const field of candidate.fields){
  assert(!seen.has(field.id),'Duplicate ID '+field.id);seen.add(field.id);
  const base=original.get(field.id);assert(base,'Unknown ID '+field.id);
  const {value:_,...metadata}=field,{value:__,...expected}=base;
  assert.deepEqual(metadata,expected,'Readonly structure changed '+field.id);
  assert.equal(typeof field.value,'string');assert(field.value.trim(),'Empty field '+field.id);
  const enrichment=approvedEnrichment(field);
  assert(enrichment||field.value.length<=(field.maxLength||20000),'Field too long '+field.id);
  assert.deepEqual(tokens(field.value),tokens(base.original),'Protected placeholders changed '+field.id);
  if(field.value!==base.original){
   assert(!/[<>]/.test(field.value),'HTML is not allowed '+field.id);
   assert(!/Nowy\s*Styl|Kusch\s*\+\s*Co|SOHOS/i.test(field.value),'Public supplier name '+field.id);
   for(const term of field.protectedTerms||[])assert(field.value.includes(term),'Protected fact missing '+field.id+': '+term);
   if(field.preserveNumbers&&!enrichment){
    const current=numberTokens(field.value),original=numberTokens(base.original);
    if(field.sourceNumberTokens){
     const allowed=new Set([...original,...field.sourceNumberTokens]);
     assert(current.every(n=>allowed.has(n)),'Number not supported by original or English source '+field.id);
     for(const n of new Set(original))assert(current.filter(x=>x===n).length>=original.filter(x=>x===n).length,'Original specification number removed '+field.id);
    }else assert.deepEqual(current,original,'Specification numbers changed '+field.id);
   }
  }
 }
 assert.equal(seen.size,original.size);
 const homeTitle=candidate.fields.find(f=>f.binding.kind==='page'&&f.binding.path==='/'&&f.binding.field==='h1');
 const homeHtml=candidate.fields.find(f=>f.binding.kind==='html'&&f.binding.scope==='home-hero'&&f.context==='hero-title');
 if(homeTitle&&homeHtml){const plain=s=>s.replace(/\[\[\w+\]\]/g,'').replace(/\s+/g,' ').trim();assert.equal(plain(homeTitle.value),plain(homeHtml.value),'Homepage H1 and hero text must agree');}
 return {fields:seen.size,changed:candidate.fields.filter(f=>f.value!==f.original).length};
}
export function compilePackage(candidate){
 const ui={},server={pages:{},products:{},categories:{},html:{}};
 for(const f of candidate.fields){
  if(f.value===f.original)continue; // unchanged entries inherit current source/DB values
  const b=f.binding;
  if(b.kind==='ui')ui[f.id]=f.value;
  else if(b.kind==='value')ui['value:'+f.original]=f.value;
  else if(b.kind==='page'){server.pages[b.path]??={};server.pages[b.path][b.field]=f.value;}
  else if(b.kind==='product'){server.products[b.productId]??={};server.products[b.productId].description=f.value;}
  else if(b.kind==='feature'){server.products[b.productId]??={};server.products[b.productId].features??={};server.products[b.productId].features[f.original]=f.value;}
  else if(b.kind==='configuration'){server.products[b.productId]??={};server.products[b.productId].configurations??={};const enriched=approvedEnrichment(f);server.products[b.productId].configurations[b.configurationId]=enriched?.summary??f.value;if(enriched){server.products[b.productId].articles??={};server.products[b.productId].articles[b.configurationId]=enriched;}}
  else if(b.kind==='category')server.categories[b.id]=f.value;
  else if(b.kind==='html'){server.html[b.scope]??=[];server.html[b.scope].push({id:f.id,selector:b.selector,index:b.index,attribute:b.attribute,original:f.original,value:f.value,tokens:b.tokens});if(b.attribute==='alt')ui['value:'+f.original]=f.value;}
  else throw Error('Unknown binding '+b.kind);
  for(const linked of f.htmlBindings||[]){server.html[linked.scope]??=[];server.html[linked.scope].push({id:f.id,selector:linked.selector,index:linked.index,attribute:linked.attribute,original:f.original,value:f.value,tokens:linked.tokens});}
 }
 return {ui,server};
}
