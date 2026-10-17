import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'meshoptimizer';
import {catalog,visibleProducts} from '../src/lib/catalog';
import {getDb} from '../src/lib/db';
import {pilotModels,pilotForProduct,pilotSelection} from '../src/lib/configurator';
import {storeQuote} from '../src/lib/quotes';
import {GET} from '../src/app/api/produkto-kortele/route';

const folder=mkdtempSync(path.join(tmpdir(),'ergonomic-3d-tests-'));
process.env.RUNTIME_DIR=folder;process.env.PREVIEW_CATALOG='true';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
after(()=>{getDb().close();rmSync(folder,{recursive:true,force:true});});
const products=()=>catalog().products;

test('3D etapas apima tik 2 modelius ir 10 tikslių gamintojo receptų',async()=>{
  assert.deepEqual(pilotModels.map(m=>m.name),['Xilium','Souly']);
  assert.equal(pilotModels.reduce((n,m)=>n+m.variants.length,0),10);
  assert.equal(products().filter(p=>pilotForProduct(p)).length,2);
  for(const model of pilotModels){const p=products().find(p=>p.id===model.productId)!;
    assert.equal(pilotForProduct(p)?.variants.length,5);
    for(const v of model.variants)assert(pilotSelection(p,v.id));}
});
test('Pasikeitus tiekėjo kodui ar vienam pasirinkimui 3D atitikmuo atmetamas',async()=>{
  const p=products().find(p=>p.id===pilotModels[0].productId)!,id=pilotModels[0].variants[0].id;
  const edit=(change:object)=>({...p,configurations:p.configurations.map(c=>c.id===id?{...c,...change}:c)});
  assert(!pilotSelection(edit({code:'forged'}),id));
  assert(!pilotSelection(edit({supplierOptions:['KXIL044WW001_OPTIONS.CBASE=FAKE']}),id));
  assert(!pilotSelection(p,pilotModels[1].variants[0].id));assert(!pilotSelection(p,'unknown'));
});
test('Visi GLB failai turi patikrintą SHA256, tinkamą geometriją ir surinktos kėdės ribas',async()=>{
  await MeshoptDecoder.ready;
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  for(const model of pilotModels)for(const v of model.variants){
    const bytes=readFileSync(path.join('public',v.asset));assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),v.assetSha256);assert(bytes.length<1_000_000);
    const doc=await io.readBinary(bytes),scene=doc.getRoot().listScenes()[0],bounds=getBounds(scene);
    assert(doc.getRoot().listMeshes().length>=10);assert([...bounds.min,...bounds.max].every(Number.isFinite));
    assert(Math.abs(bounds.max[1]-bounds.min[1]-2)<.02);
    assert(bounds.max[0]-bounds.min[0]<1.6);assert(bounds.max[2]-bounds.min[2]<1.6);
    const headrest=doc.getRoot().listNodes().some(n=>/HEADREST/i.test(n.getName()));
    const option=v.supplierOptions.find(s=>s.includes('.CHEADREST='))!.split('=')[1];
    assert.equal(headrest,option!=='NONE');
  }
});
test('Užklausoje išsaugomi tikri variantų kodai ir ilgalaikiai 3D įrodymai',async()=>{
  const model=pilotModels[1],v=model.variants[4];
  const payload={name:'[PATIKRA] 3D bandymas',email:'3d-test@example.invalid',phone:'',company:'',message:'Bandymas',
    items:[{productId:model.productId,configurationId:v.id,quantity:3,note:'Bandomasis 3D pasirinkimas'}],consent:true,
    submissionKey:randomUUID(),website:'',startedAt:Date.now()-5000};
  const saved=await storeQuote(payload);assert.equal((await storeQuote(payload)).id,saved.id);
  const row=getDb().prepare('SELECT payload FROM quotes WHERE id=?').get(saved.id) as {payload:string};
  const item=JSON.parse(row.payload).items[0];assert.equal(item.baseArticle,v.supplierCode);assert.equal(item.quantity,3);
  assert.deepEqual(item.supplierOptions,v.supplierOptions);assert.equal(item.configurationEvidence.modelSha256,v.assetSha256);
  assert.equal(item.configurationEvidence.sourceCadSha256,v.sourceCadSha256);assert.equal(item.configurationName,v.label);
});
test('Lietuviškas PDF sukuriamas visiems 10 leistinų pilotinių variantų',async()=>{
  for(const model of pilotModels)for(const v of model.variants){
    const response=await GET(new Request(`http://127.0.0.1/api/produkto-kortele/?produktas=${model.productId}&komplektacija=${v.id}`));
    assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');
    assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');
    const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert(bytes.length>10_000);
  }
});
test('PDF endpointas atmeta svetimą variantą, nežinomą produktą ir nepaskelbtus produktus',async()=>{
  assert.equal((await GET(new Request('http://127.0.0.1/api/produkto-kortele/'))).status,400);
  const q=(pid:string,cid:string)=>new Request(`http://127.0.0.1/api/produkto-kortele/?produktas=${pid}&komplektacija=${cid}`);
  assert.equal((await GET(q(pilotModels[0].productId,pilotModels[1].variants[0].id))).status,404);
  assert.equal((await GET(q('unknown',pilotModels[0].variants[0].id))).status,404);
  process.env.PREVIEW_CATALOG='false';assert.equal(visibleProducts().length,0);
  assert.equal((await GET(q(pilotModels[0].productId,pilotModels[0].variants[0].id))).status,404);
  process.env.PREVIEW_CATALOG='true';
});
