import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validatePackage,compilePackage,numberTokens} from '../scripts/editorial/contract.mjs';
import {editorialProductWithCopy} from '../src/lib/editorial-server';
import {baseSeed} from '../src/lib/catalog';
const baseline=JSON.parse(fs.readFileSync('content/editorial/baseline-package.json','utf8'));
const candidate=()=>structuredClone(baseline);
test('Unedited revision inherits sources; original seed and supplier identities stay immutable',()=>{
 assert.equal(validatePackage(candidate(),baseline).changed,0);
 assert.deepEqual(compilePackage(candidate()),{ui:{},server:{pages:{},products:{},categories:{},html:{}}});
 assert.equal(createHash('sha256').update(fs.readFileSync('content/seed.json')).digest('hex'),baseline.protected.seedHash);
});
test('Returned package rejects missing or duplicated IDs and readonly binding/header changes',()=>{
 for(const alter of [(p:any)=>p.fields.pop(),(p:any)=>p.fields.push(p.fields[0]),(p:any)=>p.fields.reverse(),(p:any)=>p.fields[0].binding.kind='configuration',(p:any)=>p.protected.catalogHash='fake',(p:any)=>p.canonicalHost='other.lt']){
  const p=candidate();alter(p);assert.throws(()=>validatePackage(p,baseline));
 }
});
test('Rich copy cannot remove link placeholders, inject HTML or publish supplier names',()=>{
 const field=baseline.fields.find((f:any)=>f.original.includes('[[open'));
 for(const value of [field.original.replace(/\[\[open\d+\]\]/,''),'<script>alert(1)</script>','Nowy Styl']){const p=candidate();p.fields.find((f:any)=>f.id===field.id).value=value;assert.throws(()=>validatePackage(p,baseline));}
});
test('Dynamic values and specification numbers remain exact through editing',()=>{
 const template=baseline.fields.find((f:any)=>f.original.includes('{{p0}}'));
 const p=candidate();p.fields.find((f:any)=>f.id===template.id).value=template.original.replace('{{p0}}','123');assert.throws(()=>validatePackage(p,baseline));
 const numbered=baseline.fields.find((f:any)=>f.preserveNumbers&&/\b\d+(?:[.,]\d+)?\b/.test(f.original));assert(numbered);
 const q=candidate();q.fields.find((f:any)=>f.id===numbered.id).value=numbered.original.replace(/\b\d+(?:[.,]\d+)?\b/,'99999');assert.throws(()=>validatePackage(q,baseline));
});
test('Server product copy stays out of the client UI dictionary',()=>{
 const p=candidate(),f=p.fields.find((f:any)=>f.binding.kind==='product');f.value+=' Pasirinkimą aptarsime individualiai.';
 assert.equal(validatePackage(p,baseline).changed,1);const compiled=compilePackage(p);
 assert.deepEqual(compiled.ui,{});assert.equal(compiled.server.products[f.binding.productId].description,f.value);
 assert(!JSON.stringify(compiled).includes('sourceUrl'));assert(!JSON.stringify(compiled).includes('supplierOptions'));
});
test('Full English product translations fit and private source metadata never ships in compiled copy',()=>{
 const p=candidate(),f=p.fields.find((f:any)=>f.binding.kind==='product'&&f.translationSource);
 assert(f);const oldLimit=Math.max(f.original.length*3,500);
 f.value='Aprašymo sakinys. '.repeat(Math.ceil(oldLimit/17)+1);assert(f.value.length>oldLimit);assert(f.value.length<f.maxLength);
 assert.equal(validatePackage(p,baseline).changed,1);
 const compiled=compilePackage(p);assert.deepEqual(compiled.ui,{});assert.equal(compiled.server.products[f.binding.productId].description,f.value);
 assert(!JSON.stringify(compiled).includes(f.translationSource));assert(!JSON.stringify(compiled).includes('translationSource'));
 const q=candidate();q.fields.find((x:any)=>x.id===f.id).translationSource='different facts';assert.throws(()=>validatePackage(q,baseline));
});
test('Translations may include source-backed numbers but reject invented specifications',()=>{
 const p=candidate(),f=p.fields.find((f:any)=>f.binding.kind==='product'&&f.sourceNumberTokens?.length&&!numberTokens(f.original).length);assert(f);
 f.value+=' '+f.sourceNumberTokens[0].replace('.',',');assert.equal(validatePackage(p,baseline).changed,1);
 f.value+=' 999999999';assert.throws(()=>validatePackage(p,baseline));
});
test('Family pages receive translated configuration copy without changing supplier identity or model naming source',()=>{
 const original=baseSeed().products.find(p=>p.configurations.length>1)!,c=original.configurations[0];
 const translated=editorialProductWithCopy(original,{configurations:{[c.id]:'Lietuviškas konkretaus modelio aprašymas.'}});
 assert.equal(translated.configurations[0].description,'Lietuviškas konkretaus modelio aprašymas.');
 assert.equal(translated.configurations[0].sourceDescription,c.sourceDescription||c.description);
 assert.equal(translated.configurations[0].code,c.code);assert.equal(translated.configurations[0].id,c.id);
 assert.deepEqual(translated.configurations[0].supplierOptions,c.supplierOptions);
 assert.equal(original.configurations[0],c);assert.equal(translated.configurations[1],original.configurations[1]);
});
