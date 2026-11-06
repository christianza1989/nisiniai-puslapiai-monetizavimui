import test from'node:test';import assert from'node:assert/strict';
import{reviewedSpecificationRows}from'../src/lib/reviewed-specification-rows';
import{selectedTextReviewProduct}from'../src/lib/text-review-product';
import{customerLabel}from'../src/lib/customer-names';
import{canonicalReviewValue,publishedReviewValue}from'../src/lib/text-review-value';
import type{ReviewScope}from'../src/lib/text-review-types';
import type{Product}from'../src/lib/types';
test('legacy details use the selected field edit and keep unrelated or ambiguous facts',()=>{
 const rows=[{label:'Galvos atrama',value:'Be šio elemento (NONE)'},{label:'Korpuso medienos spalva',value:'1007'},{label:'Aukštis',value:'420–545 mm'},{label:'Medžiaga',value:'Gamintojo aprašas'}];
 const values={CHEADREST:'NONE',CSHELLWOODCOLOR:'_1.007',CSEATMAT:'A',CBACKMAT:'B'};
 const labels=(f:string)=>({CHEADREST:['Galvos atrama'],CSHELLWOODCOLOR:['Korpuso medienos spalva'],CSEATMAT:['Medžiaga'],CBACKMAT:['Medžiaga']}[f]||[]);
 const result=reviewedSpecificationRows(rows,values,labels,(f,v)=>v?({CHEADREST:'Be galvos atramos',CSHELLWOODCOLOR:'Buko apdaila'}[f]):undefined);
 assert.equal(result[0].value,'Be galvos atramos');assert.equal(result[1].value,'Buko apdaila');assert.deepEqual(result.slice(2),rows.slice(2));assert.equal(rows[0].value,'Be šio elemento (NONE)');
});
test('article transitions use their own text preset without changing source codes',()=>{
 const product={id:'test-chair',name:'Test chair',slug:'test-chair',modelConfigurationId:'high',configurations:[{id:'high',code:'KHIGH001',name:'High',description:'Test chair high',image:null},{id:'low',code:'KLOW001',name:'Low',description:'Test chair low',image:null}]}as Product;
 const selected=selectedTextReviewProduct(product,'KLOW001');assert.equal(selected.modelConfigurationId,'low');assert.equal(product.modelConfigurationId,'high');assert.deepEqual(selected.configurations.map(c=>c.code),product.configurations.map(c=>c.code));assert.equal(selectedTextReviewProduct(product,'KOTHER001'),product);
});
test('customer text removes legacy absence tokens and empty code brackets while keeping dimensions',()=>{
 assert.equal(customerLabel('Be šio elemento (NONE)',[],'Nėra'),'Nėra');assert.equal(customerLabel('Juoda (RAL9005)',['RAL9005'],''),'Juoda');assert.equal(customerLabel('1007 mm',['1007'],''),'1007 mm');
});
test('verified finish spelling uses its existing name and preserves a human correction',()=>{
 const model='KVAP008WW001',field='CSHELLWOODCOLOR';assert.equal(canonicalReviewValue(model,field,'1007'),'_1007');assert.equal(canonicalReviewValue('OTHER',field,'1007'),'1007');
 const review={publicScope:{bindings:{[model]:{['value:'+field+'=1007']:'old',['value:'+field+'=_1007']:'canonical'}},values:{[model+':old']:'1007',[model+':canonical']:'Buko apdaila'}},entries:[]}as unknown as ReviewScope;
 assert.equal(publishedReviewValue(review,model,field,'1007'),'Buko apdaila');
 review.publicScope.values[model+':old']='Šviesus bukas';review.entries.push({id:'old',sourceHash:'verified',edit:{source_hash:'verified'}}as any);assert.equal(publishedReviewValue(review,model,field,'1007'),'Šviesus bukas');
});
