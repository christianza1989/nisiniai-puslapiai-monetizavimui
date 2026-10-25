import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCopy,applyDrafts} from '../src/lib/publication-copy';
import {allProductModels} from '../src/lib/product-models';
import seed from '../content/seed.json';
const hash='a'.repeat(64),p=seed.products.find(p=>p.configurations.length>1)!,c=p.configurations[0],key=p.id+':'+c.id;
const copy={summary:'TEST ONLY privatus produkto aprašymas peržiūrai ir faktų patikrai.',paragraphs:['TEST ONLY pirmoji privataus teksto pastraipa, kuri nepatenka į viešą draft.', 'TEST ONLY antroji privataus teksto pastraipa, išsaugota su tikro šaltinio ryšiu.']};
const fixture=()=>({key,baseRevisionHash:hash,copy,gemini:{provider:'Gemini App',model:'4 Argon',thinking:'low',conversation:'https://gemini.google.com/u/3/app/abcdef123456',originalResponse:JSON.stringify(copy)},factualReview:{actor:'TEST ONLY',notes:'TEST ONLY konkretus faktų ir kalbos patikros kvitas bandomajai versijai.',sourceRevisionHash:hash}});
test('new text requires exact original response, requested writer, source revision and factual receipt',()=>{
 assert.match(validateCopy(fixture(),hash).responseSha256,/^[a-f0-9]{64}$/);
 assert.throws(()=>validateCopy(fixture(),'b'.repeat(64)));
 const altered=fixture();altered.copy={...copy,summary:'Pakeistas tekstas, kurio Gemini originaliame atsakyme nebuvo.'};assert.throws(()=>validateCopy(altered,hash));
 const wrong=fixture();wrong.gemini.model='invented API alias';assert.throws(()=>validateCopy(wrong,hash));
 const brand=fixture();brand.copy={...copy,summary:'Verslomatika yra šios svetainės operatorius – neteisingas priskyrimas.'};brand.gemini.originalResponse=JSON.stringify(brand.copy);assert.throws(()=>validateCopy(brand,hash));
});
test('private copy is opt-in and does not mutate source, options, geometry or sibling model',()=>{
 const original=JSON.stringify(p);const draft=validateCopy(fixture(),hash);
 const products=applyDrafts([p] as any,{version:1,models:{[key]:draft}});
 const models=allProductModels(products);assert.equal(models.find(m=>m.modelConfigurationId===c.id)?.modelArticle?.summary,copy.summary);
 assert.equal(JSON.stringify(p),original);assert.deepEqual(products[0].configurations,p.configurations);
 assert.notEqual(models.find(m=>m.modelConfigurationId!==c.id)?.modelArticle?.summary,copy.summary);
 assert.notEqual(allProductModels([p] as any)[0].modelArticle?.summary,copy.summary);
});
