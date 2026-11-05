import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/text-review/import-inventory.mjs PATH_TO_VERIFIED_TRANSLATION_DATA');
const d=JSON.parse(fs.readFileSync(input,'utf8'));
const previous=fs.existsSync('content/text-review-inventory.json')?JSON.parse(fs.readFileSync('content/text-review-inventory.json','utf8')):undefined;
assert(Array.isArray(d.terms)&&Array.isArray(d.uses)&&Array.isArray(d.models));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const terms=Object.fromEntries(d.terms.map(t=>[t.id,{id:t.id,sourceHash:hash([t.role,t.semantic,t.source]),role:t.role,english:t.role==='Lauko pavadinimas'?'':t.source,polish:'',sourceCode:t.source,suggested:t.translation,context:t.context,notes:t.notes||'',current:t.current,modelCount:t.models.length}]));
const models=Object.fromEntries(d.models.map(m=>[m.code,{productId:m.productId,sample:m.sample,name:m.indexName,path:m.path,sourceUrl:m.sourceURL,bindings:{},current:{},inventoryComplete:false}]));
for(const u of d.uses){
 assert(terms[u.termId]&&models[u.model]);
 const m=models[u.model],t=terms[u.termId];
 for(const binding of u.bindings){
  const key=t.role==='Lauko pavadinimas'?'field:'+binding.split('=')[0]:t.role==='Pavadinimo dalis'?'name:'+t.sourceCode:'value:'+binding;
  assert(!m.bindings[key]||m.bindings[key]===u.termId,'Ambiguous binding '+u.model+' '+key);
  m.bindings[key]=u.termId;
 }
 m.current[u.termId]=u.shown.join('\n');
}
// A changed source may split a formerly shared phrase into a new term ID.
// Retain lineage for review/history, without inheriting stale approval/text.
for(const [code,m]of Object.entries(models))for(const [binding,id]of Object.entries(m.bindings)){
 const old=previous?.models[code]?.bindings[binding];
 if(old&&old!==id){terms[id].previousIds=[...new Set([...(terms[id].previousIds||[]),old])];}
 else if(previous?.terms[id]?.previousIds)terms[id].previousIds=previous.terms[id].previousIds;
}
const out={version:1,at:d.at,sourceSha256:hash(d),terms,models};
fs.writeFileSync('content/text-review-inventory.json',JSON.stringify(out));
console.log(JSON.stringify({terms:Object.keys(terms).length,models:Object.keys(models).length,bytes:fs.statSync('content/text-review-inventory.json').size}));
