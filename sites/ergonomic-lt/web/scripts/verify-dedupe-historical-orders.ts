import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import manifest from '../content/catalog-consolidation.json';
import {visibleProductsAsync} from '../src/lib/catalog';
import {modelProduct,resolveCatalogProduct} from '../src/lib/product-models';
import {supplierOptions} from '../src/lib/configuration-labels';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {storeQuote} from '../src/lib/quotes';
import {getDb} from '../src/lib/db';
import {GET} from '../src/app/api/produkto-kortele/route';
const parents=await visibleProductsAsync(),retired=manifest.groups.flatMap(g=>g.members.filter(m=>m.id!==g.keeperId).map(m=>({group:g,id:m.id}))),rows:any[]=[],pdfs:any[]=[],normalizationDifferences:any[]=[];
for(let start=0;start<retired.length;start+=30){
 const batch=retired.slice(start,start+30),saved=await storeQuote({name:'Istorinių ID vietinė regresija',email:'dedupe-'+start+'@example.invalid',phone:'',company:'',message:'Tik izoliuota vietinė patikra, nesiųsti',items:batch.map(r=>({productId:r.group.productId,configurationId:r.id,quantity:1,note:''})),consent:true,submissionKey:randomUUID(),website:'',startedAt:Date.now()-5000});
 const record=getDb().prepare('SELECT payload FROM quotes WHERE id=?').get(saved.id) as {payload:string},items=JSON.parse(record.payload).items;
 assert.equal(items.length,batch.length);
 for(const [i,r]of batch.entries()){
  const p=parents.find(p=>p.id===r.group.productId)!,old=p.configurations.find(c=>c.id===r.id)!,keep=p.configurations.find(c=>c.id===r.group.keeperId)!;
  assert.equal(items[i].configurationId,r.id);assert.equal(items[i].baseArticle,old.code);assert.deepEqual(items[i].supplierOptions,supplierOptions(old));assert.equal(items[i].brand,p.brand);assert.equal(items[i].sourceUrl,p.sourceUrl);
  const restored=resolveCatalogProduct(parents,p.categorySlug,modelProduct(p,keep).slug,r.id)!;
  const original=modelProduct(p,old),engine=createExpandedEngine(await loadCatalogRuntime(original));
  if(engine.expandedForProduct(original)){
   const before=engine.initialStateForProduct(original),after=engine.initialStateForProduct(restored);
   assert.deepEqual(after,before);assert.deepEqual(engine.parseStateToken(restored,engine.stateToken(before)),before);assert.deepEqual(engine.expandedSelection(restored,after),engine.expandedSelection(original,before));
   const actual=engine.expandedSelection(original,before).configuration.supplierOptions||[],expected=supplierOptions(old),actualMap=new Map(actual.map(o=>o.split('=') as [string,string]));
   const delta=expected.filter(o=>{const[k,v]=o.split('=');return actualMap.get(k)!==v;});if(delta.length)normalizationDifferences.push({productId:p.id,id:r.id,sourceOptionsNotRepresentedLiterally:delta,behavior:'Existing before/after3D normalization is identical; original preset and direct historical quote remain exact. No source choices invented.'});
   if(pdfs.length<8||r.id==='23636152'){
    const token=engine.stateToken(before),response=await GET(new Request('http://localhost/api/produkto-kortele/?produktas='+p.id+'&konfig='+encodeURIComponent(token)));
    assert.equal(response.status,200,r.id);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.toString('ascii',0,5),'%PDF-');pdfs.push({id:r.id,status:response.status,bytes:bytes.length});
   }
  }
  rows.push({id:r.id,productId:p.id,code:old.code,originalOrderPreserved:true,previous3DStatePreserved:!!engine.expandedForProduct(original)});
 }
}
assert.equal(rows.length,314);
const report={at:new Date().toISOString(),result:'PASS',historicalOrders:rows.length,rows,pdfs,preExistingNormalizationDifferences:normalizationDifferences};
fs.writeFileSync('D:/Core/output/ergonomic-catalog-dedupe-20261016/HISTORICAL-ORDERS-PDF-PARITY.json',JSON.stringify(report,null,2));getDb().close();console.log(JSON.stringify({result:'PASS',orders:rows.length,pdfs:pdfs.length,preExistingNormalizationDifferences:normalizationDifferences.length}));
