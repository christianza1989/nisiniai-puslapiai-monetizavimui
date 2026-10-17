import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalog,baseSeed,productPath} from '../src/lib/catalog';
import {getDb} from '../src/lib/db';
import {storeQuote} from '../src/lib/quotes';
import {publicProductText,publicProductView} from '../src/lib/public-product-copy';
import {supplierSourceUrl,withSupplierReferences,quoteOrderText} from '../src/lib/supplier-reference';
import {AdminOrderItem} from '../src/components/admin-order-item';
import {validQuoteEntry} from '../src/lib/quote-entry';
import {expandedForProduct,initialStateForProduct,expandedSelection} from '../src/lib/expanded-configurator';

const runtime=mkdtempSync(path.join(tmpdir(),'ergonomic-private-brand-'));
process.env.RUNTIME_DIR=runtime;process.env.PREVIEW_CATALOG='true';
after(()=>{getDb().close();rmSync(runtime,{recursive:true,force:true});});
const brandNames=/Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co/i;
test('Public copy removes supplier names while preserving the model and readable Lithuanian',()=>{
 for(const name of ['Nowy Styl','Nowystyl','SOHOS by Nowy Styl','Kusch+Co']){
  assert.equal(publicProductText(`Xilium – darbo kėdės iš ${name} asortimento.`),'Xilium – darbo kėdės iš mūsų asortimento.');
 }
 assert.equal(publicProductText('VL0034; KXIL044WW001_OPTIONS.CARMRESTS=R55POLWBPU'),'VL0034; KXIL044WW001_OPTIONS.CARMRESTS=R55POLWBPU');
});
test('Every catalogue product retains its exact internal identity and all codes',()=>{
 const original=baseSeed(),products=catalog().products;
 for(const p of products){const source=original.products.find(s=>s.id===p.id)!;
  assert(!brandNames.test(p.name+' '+p.description));assert.equal(p.brand,source.brand);assert.equal(p.sourceUrl,source.sourceUrl);
  assert.equal(productPath(p),productPath(source));assert.deepEqual(p.configurations.map(c=>[c.id,c.code]),source.configurations.map(c=>[c.id,c.code]));
  const view=publicProductView(p);assert.equal(view.brand,'');assert.equal(view.sourceUrl,'');assert.equal(view.sourceDescription,'');assert.deepEqual(view.documents,[]);assert.equal(p.documents.length,source.documents.length);
  assert.deepEqual(view.configurations.map(c=>[c.id,c.code,c.supplierOptions]),p.configurations.map(c=>[c.id,c.code,c.supplierOptions]));
  assert(view.configurations.every(c=>c.configurator===null));
 }
});
test('A public quote entry works without a visible manufacturer field',()=>{
 const p=publicProductView(catalog().products[0]);
 assert(validQuoteEntry({productId:p.id,name:p.name,brand:p.brand,url:productPath(p),image:p.image,configurationId:null,configurationLabel:'Pasirinkimas',quantity:1,note:''}));
});
test('Orders resolve private supplier identity on the server for presets and actual 3D selections',async()=>{
 const products=catalog().products,product=products.find(p=>expandedForProduct(p))!;
 for(const custom of [false,true]){
  const state=initialStateForProduct(product),selection=expandedSelection(product,state);
  const config=custom?selection.configuration:product.configurations[0];
  const request=await storeQuote({name:'Vidinio ryšio testas',email:'private-reference@example.invalid',phone:'',company:'',message:'Testinė užklausa',consent:true,website:'',submissionKey:randomUUID(),startedAt:Date.now()-5000,
   items:[{productId:product.id,configurationId:config.id,...(custom?{configurationState:state}:{}),quantity:1,note:'',brand:'Fake supplier',sourceUrl:'https://evil.invalid/',supplierProductId:'fake'}]});
  const row=getDb().prepare('SELECT payload FROM quotes WHERE id=?').get(request.id) as {payload:string};
  const item=JSON.parse(row.payload).items[0];assert.equal(item.brand,product.brand);assert.equal(item.sourceUrl,product.sourceUrl);assert.equal(item.supplierProductId,product.id);assert.equal(item.baseArticle,config.code);
  assert(quoteOrderText(item).includes(product.sourceUrl));assert(quoteOrderText(item).includes(product.brand));assert(quoteOrderText(item).includes(config.code!));
  const markup=renderToStaticMarkup(<AdminOrderItem item={item}/>);assert(markup.includes(product.brand));assert(markup.includes('Originali gamintojo prekė'));assert(markup.includes(config.code!));
 }
});
test('Old order references are enriched without changing saved configuration or stored payload',()=>{
 const product=catalog().products[0],payload=JSON.stringify({items:[{productId:product.id,brand:product.brand,configurationId:'saved',supplierOptions:['CBASE=KEEP'],quantity:1,productName:product.name}]});
 const record={id:'test',payload,created_at:'2026-10-13',status:'new',delivery_status:'pending',delivery_error:null,delivery_attempts:0};
 const enriched=JSON.parse(withSupplierReferences(record,[product]).payload).items[0];
 assert.equal(enriched.sourceUrl,product.sourceUrl);assert.equal(enriched.configurationId,'saved');assert.deepEqual(enriched.supplierOptions,['CBASE=KEEP']);assert.equal(record.payload,payload);
});
test('Administrator supplier links reject unsafe URLs',()=>{
 for(const value of ['javascript:alert(1)','https://evil.invalid/','https://www.nowystyl.com@evil.invalid/','http://www.nowystyl.com/'])assert.equal(supplierSourceUrl(value),undefined);
 const markup=renderToStaticMarkup(<AdminOrderItem item={{quantity:1,productName:'Test',brand:'Private',sourceUrl:'javascript:alert(1)'}}/>);
 assert(!markup.includes('href='));
});
