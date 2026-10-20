// Read-only public smoke check: no inquiries, logins or customer-data writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseHTML} from 'linkedom';
import {baseSeed} from '../src/lib/catalog';
import {modelProduct} from '../src/lib/product-models';
import {createCatalogRuntimeLoader,type CatalogRuntimeIndex} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
const root=path.resolve('../research/configurator/all-chairs-20261014');
const stage=path.resolve(process.argv.find(a=>a.startsWith('--stage='))?.slice(8)||path.join(root,'stage-release-current'));
assert(stage.startsWith(root+path.sep));
const origin='https://ergonomic-preview.pinet-azprekyba.workers.dev';
const index=JSON.parse(await fs.readFile(path.join(stage,'configurator-additional-index.json'),'utf8')) as CatalogRuntimeIndex;
const checks=[],runtimeCache=new Map<string,Uint8Array>(),hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
for(const [code,receipt] of Object.entries(index.articles)){
 const response=await fetch(origin+receipt.asset),bytes=new Uint8Array(await response.arrayBuffer());
 assert.equal(response.status,200,code+' immutable runtime');assert.equal(hash(bytes),receipt.sha256);
 runtimeCache.set(receipt.asset,bytes);
 const shard=JSON.parse(Buffer.from(bytes).toString('utf8'));
 const geometry=shard.anchors[0].geometry,model=await fetch(origin+geometry.asset),modelBytes=new Uint8Array(await model.arrayBuffer());
 assert.equal(model.status,200,code+' base 3D geometry');assert.equal(hash(modelBytes),geometry.assetSha256);
 checks.push({article:code,runtime:'PASS',baseGeometry:'PASS'});
}
const load=createCatalogRuntimeLoader(index,async asset=>runtimeCache.get(asset)!);
const pages=[],pdfs=[];
for(const [id,binding] of Object.entries(index.products)){
 const parent=baseSeed().products.find(p=>p.id===id)!;assert(parent);
 for(const [position,article] of binding.articles.entries()){
  const configuration=parent.configurations.find(c=>c.id===article.sample&&c.code===article.code)!;
  const model=modelProduct(parent,configuration),url='/produktai/'+model.categorySlug+'/'+model.slug+'/';
  const response=await fetch(origin+url),html=await response.text();assert.equal(response.status,200,url);
  const {document}=parseHTML(html),main=document.querySelector('main')!;
  assert(main);
  const productSchema=[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent!)).find(s=>s['@type']==='Product');
  assert.equal(String(productSchema?.sku),article.sample,url+' exact model identity');
  assert.equal(configuration.code,article.code,url+' source article binding');
  assert([...main.querySelectorAll('button')].some(button=>button.textContent==='3D konfigūratorius'),url+' missing configurator');
  assert.equal(document.querySelectorAll('header.site-header-matched').length,1);assert.equal(document.querySelectorAll('footer').length,1);
  assert.equal(document.querySelector('link[rel=canonical]')?.getAttribute('href'),'https://ergonomic.lt'+url);
  const visible=main.cloneNode(true) as typeof main;
  for(const metadata of visible.querySelectorAll('script,style'))metadata.remove();
  assert(!/Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co/i.test(visible.textContent!),url+' visible supplier brand');
  pages.push({url,sample:article.sample,article:article.code,status:response.status});
  if(position===0){
   const runtime=await load(model);assert(runtime);const engine=createExpandedEngine(runtime),state=engine.initialStateForProduct(model);
   const response=await fetch(origin+'/api/produkto-kortele/?produktas='+parent.id+'&konfig='+encodeURIComponent(engine.stateToken(state)));
   const bytes=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,article.code+' public PDF');assert(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
   pdfs.push({article:article.code,status:response.status,bytes:bytes.length});
  }
 }
}
const receipt={checkedAt:new Date().toISOString(),origin,articles:checks.length,models:pages.length,pdfs:pdfs.length,checks,pages,pdfChecks:pdfs,result:'PASS',mutations:false};
let list;
try{list=JSON.parse(await fs.readFile(path.join(stage,'models-list.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
if(list){
 const response=await fetch(origin+'/konfiguratoriu-modeliai.csv'),csv=new Uint8Array(await response.arrayBuffer());
 assert.equal(response.status,200,'Public model list');assert.equal(hash(csv),list.csvSha256,'Published model list differs from release');
 const alreadyChecked=new Set(pages.map(p=>origin+p.url)),legacyChecks=[];
 for(const row of list.rows as {sample:string;code:string;url:string}[]){
  assert(row.url.startsWith(origin+'/produktai/kedes/'),'Unexpected model list URL');
  if(alreadyChecked.has(row.url))continue;
  const response=await fetch(row.url),{document}=parseHTML(await response.text());assert.equal(response.status,200,row.url);
  const main=document.querySelector('main');assert(main);
  const productSchema=[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent!)).find(s=>s['@type']==='Product');
  assert.equal(String(productSchema?.sku),row.sample,row.url+' exact model identity');
  assert([...main!.querySelectorAll('button')].some(button=>button.textContent==='3D konfigūratorius'),row.url+' missing 3D');
  assert.equal(document.querySelectorAll('header.site-header-matched').length,1);assert.equal(document.querySelectorAll('footer').length,1);
  legacyChecks.push({sample:row.sample,url:row.url,status:response.status});
 }
 assert.equal(alreadyChecked.size+legacyChecks.length,list.models);
 await fs.writeFile(path.join(stage,'public-model-list-verification.json'),JSON.stringify({models:list.models,interactive:list.interactive,preset:list.preset,sha256:list.csvSha256,additionalModels:pages.length,legacyChecks,result:'PASS',mutations:false},null,2)+'\n');
}
await fs.writeFile(path.join(stage,'public-smoke.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({articles:checks.length,models:pages.length,pdfs:pdfs.length,result:'PASS',mutations:false}));
