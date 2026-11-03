import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProductPdfImageLoader} from '../src/lib/product-pdf-image';
import type {Product} from '../src/lib/types';

const bytes=Buffer.from('sealed same-model photo'),sha256=createHash('sha256').update(bytes).digest('hex');
const asset='/media/pdf-products/'+sha256+'.png',legacy='/media/configurator/23846540.jpg';
const product={id:'desk',configurations:[{id:'23846540',code:'KEM2013WW009'}]} as Product;
const configuration=product.configurations[0],images={schemaVersion:1,models:{'desk:23846540':{code:configuration.code!,asset,sha256,size:bytes.length}}};

test('existing legacy image is preserved; only its absence reads the sealed same-model photo',async()=>{
 const reads:string[]=[];
 const existing=createProductPdfImageLoader(images,async path=>{reads.push(path);return bytes;});
 assert.deepEqual(await existing(product,configuration,legacy),bytes);assert.deepEqual(reads,[legacy]);
 reads.length=0;
 const fallback=createProductPdfImageLoader(images,async path=>{reads.push(path);if(path===legacy)throw Error('missing');return bytes;});
 assert.deepEqual(await fallback(product,configuration,legacy),bytes);assert.deepEqual(reads,[legacy,asset]);
});

test('another sample/code, arbitrary URL and changed fallback bytes cannot become the product photo',async()=>{
 const reads:string[]=[];const load=createProductPdfImageLoader(images,async path=>{reads.push(path);if(path===legacy)throw Error('missing');return Buffer.from('changed');});
 await assert.rejects(load(product,{...configuration,code:'OTHER'},legacy),/missing/);
 await assert.rejects(load(product,{...configuration,id:'OTHER'},legacy),/missing/);
 await assert.rejects(load({...product,id:'another'},configuration,legacy),/missing/);
 const count=reads.length;await assert.rejects(load(product,configuration,'https://example.invalid/photo.png'),/Invalid local/);assert.equal(reads.length,count);
 await assert.rejects(load(product,configuration,legacy),/source changed/);
 const injected=createProductPdfImageLoader({schemaVersion:1,models:{'desk:23846540':{...images.models['desk:23846540'],asset:'https://example.invalid/photo.png'}}},async()=>{throw Error('missing');});
 await assert.rejects(injected(product,configuration,legacy),/Invalid prepared/);
});
