import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {ChairQualifiedData} from '../src/lib/chair-qualified-colors';
const canonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
/** Retain entire old witnesses. Equal construction is never permission to
 * compose groups measured by different package versions. */
export function retainQualifiedScopes(next:ChairQualifiedData,prior?:ChairQualifiedData):ChairQualifiedData{
 if(!prior)return next;
 assert(next.code===prior.code&&next.runtimeSha256===prior.runtimeSha256,'Qualified base changed');
 const result:ChairQualifiedData={...next,witnesses:[...next.witnesses],legacyScopes:[...next.legacyScopes],materials:{...next.materials},extraAssets:{...next.extraAssets},opaqueAssets:[...next.opaqueAssets]};
 for(const [id,value]of Object.entries(prior.materials)){
  assert(!result.materials[id]||canonical(result.materials[id])===canonical(value),'Conflicting material identity');result.materials[id]=value;
 }
 for(const [id,value]of Object.entries(prior.extraAssets)){
  assert(!result.extraAssets[id]||canonical(result.extraAssets[id])===canonical(value),'Conflicting OWN extra asset');result.extraAssets[id]=value;
 }
 for(const w of prior.witnesses){
  const existing=result.witnesses.find(n=>n.id===w.id);
  if(existing&&canonical(existing)===canonical(w))continue;
  const keep=existing?{...w,id:createHash('sha256').update(canonical(['retained-qualified-witness',prior.version,w])).digest('hex'),label:w.label+' · ankstesnis rinkinys'}:w;
  assert(!result.witnesses.some(n=>n.id===keep.id),'Qualified witness collision');result.witnesses.push(keep);
 }
 for(const s of prior.legacyScopes)if(!result.legacyScopes.some(n=>canonical(n)===canonical(s)))result.legacyScopes.push(s);
 const targeted=new Set(result.witnesses.flatMap(w=>[...w.groups.flatMap(g=>g.options),...w.singles,...w.branches.flatMap(b=>b.groups.flatMap(g=>g.options))].flatMap(o=>o.patch.bindings.map(b=>b.assetSha256))));
 result.opaqueAssets=Object.keys(result.extraAssets).filter(h=>!targeted.has(h));return result;
}
