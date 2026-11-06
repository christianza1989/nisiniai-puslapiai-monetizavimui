import test from'node:test';import assert from'node:assert/strict';
import{originalColourName}from'../src/lib/original-colour-names';
import{manufacturerOptionName}from'../src/lib/manufacturer-option-names';
import{publishedReviewValue}from'../src/lib/text-review-value';
import{customerLabel,customerColourLabel}from'../src/lib/customer-names';
import type{ReviewScope}from'../src/lib/text-review-types';
test('captured Acacia Light and original whites take precedence over translated colour labels',()=>{
 assert.equal(originalColourName('KEM2013WW004','FTOPCOLOR','NJ'),'NJ Acacia Light');
 assert.equal(originalColourName('K2ME004WW001','CSEATCOVERPLASTICCOLOR','BL'),'Black');
 assert.equal(originalColourName('K2ME004WW001','CBENCHARMMETALCOLOR','RAL9016'),'RAL 9016 Traffic White BI, WT, W');
 assert.equal(originalColourName('KEM2013WW004','FDESKTOPTYPE','FIXEDTOP'),undefined);
 assert.equal(originalColourName('KEM2013WW004','FTOPCOLOR','NONE'),undefined);
 assert.equal(manufacturerOptionName('value:FTOPCOLOR=NJ','NJ Acacia Light'),'NJ Acacia Light');
 assert.equal(manufacturerOptionName('value:CPLASTICCOLORVERSION=WT','White'),'White');
});
test('original colour is resolved per field even when translated terms share an ID, and codes stay private to visitors',()=>{
 const review={publicScope:{model:'model',bindings:{model:{'value:FBASECOLOR=WT':'same','value:FTOPCOLOR=WT':'same'}},values:{'model:same':'Balta'},colourNames:{'model:FBASECOLOR=WT':'WT White','model:FTOPCOLOR=WT':'WT Traffic White'}},entries:[]}as unknown as ReviewScope;
 assert.equal(publishedReviewValue(review,'model','FBASECOLOR','WT'),'WT White');assert.equal(publishedReviewValue(review,'model','FTOPCOLOR','WT'),'WT Traffic White');
 assert.equal(customerLabel(originalColourName('KEM2013WW004','FTOPCOLOR','NJ'),['NJ'],''),'Acacia Light');
 assert.equal(customerLabel('WT White',['WT'],''),'White');
 assert.equal(customerColourLabel('CSE01 (extended)',['CSE01'],'Spalva 1'),'Spalva 1');
 assert.equal(customerColourLabel('RAL 9016 Traffic White BI, WT, W',['RAL9016'],'Spalva 1'),'Traffic White');
 assert.equal(customerColourLabel('1.007 Beech 0C',['_1007'],'Spalva 1'),'Beech');
});
test('CMS can keep/approve a fixed supplier colour label without reopening translation or accepting non-colour codes',async()=>{
 const{mkdtempSync}=await import('node:fs'),before=process.env.RUNTIME_DIR;process.env.RUNTIME_DIR=mkdtempSync('D:/Core/output/ergonomic-all-option-explanations-20261105/colour-edit-test-');
 try{const{mutateText,allTextEdits}=await import('../src/lib/text-review-server');
  const def={id:'runtime:TESTCOLOUR:value:CUPHCOLOR=CSE01',sourceHash:'unchanged-test-source',role:'Parinktis',english:'CSE01 (extended)',polish:'',sourceCode:'CUPHCOLOR=CSE01',suggested:'CSE01 (extended)',context:'Spalva',notes:'',current:['CSE01'],modelCount:1,originalColourName:'CSE01 (extended)',currentText:'CSE01 (extended)'},key='local:TESTCOLOUR:'+def.id;
  assert.equal(await mutateText(def,{key,sourceHash:def.sourceHash,expectedRevision:0,action:'keep'}),1);
  assert.equal(await mutateText(def,{key,sourceHash:def.sourceHash,expectedRevision:1,action:'approve',text:'Lietuviškas vertimas'}),2);
  assert.equal((await allTextEdits()).get(key)?.draft,'CSE01 (extended)');
  const other={...def,id:'runtime:TESTCOLOUR:value:CARMRESTS=R35',sourceCode:'CARMRESTS=R35',current:['R35'],currentText:'R35',originalColourName:undefined};
  await assert.rejects(mutateText(other,{key:other.id,sourceHash:other.sourceHash,expectedRevision:0,action:'keep'}),/pavadinimo be gamintojo kodo/);
 }finally{if(before===undefined)delete process.env.RUNTIME_DIR;else process.env.RUNTIME_DIR=before;}
});

test('only verified colour values are visible to visitors; structural and model codes stay private',()=>{
 const codes=['CSE01','RAL9016','R55POLWBPU','KEM2013WW004','CUPHCOLOR'];
 assert.equal(customerColourLabel('CSE01 (extended)',codes,'Spalva',['CSE01']),'CSE01 (extended)');
 assert.equal(customerColourLabel('Acacia Light',['NJ'],'Spalva',['NJ']),'NJ · Acacia Light');
 assert.equal(customerColourLabel('RAL 9016 Traffic White',codes,'Spalva',['RAL9016']),'RAL 9016 Traffic White');
 assert.equal(customerColourLabel('CSE01 R55POLWBPU KEM2013WW004 CUPHCOLOR',codes,'Spalva',['CSE01']),'CSE01');
 assert.equal(customerLabel('CSE01 R55POLWBPU',codes,'Parinktis'),'Parinktis');
});
