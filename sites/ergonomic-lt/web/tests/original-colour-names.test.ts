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
});
