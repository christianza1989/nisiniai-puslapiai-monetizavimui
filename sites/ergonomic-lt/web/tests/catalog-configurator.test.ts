import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import sourceFixtures from '../content/configurator-catalog-fixtures.json';
import {catalog} from '../src/lib/catalog';
import {catalogFamilies,catalogInitial,catalogForProduct} from '../src/lib/catalog-configurator';
import {validateState,stateChoices,changeField,stateToken,parseStateToken,expandedSelection,fieldLabels} from '../src/lib/expanded-configurator';
import {storeQuote} from '../src/lib/quotes';
import {getDb} from '../src/lib/db';
import {GET} from '../src/app/api/produkto-kortele/route';
const folder=fs.mkdtempSync(path.join(tmpdir(),'ergonomic-ten-'));process.env.RUNTIME_DIR=folder;process.env.PREVIEW_CATALOG='true';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
after(()=>{getDb().close();fs.rmSync(folder,{recursive:true,force:true});});
const product=(id:string)=>catalog().products.find(p=>p.id===id)!;
const fixtures=sourceFixtures as unknown as {family:string;productId:string;anchor:string;sample:string;values:Record<string,string>;choices:Record<string,string[]>;supplierOptions:string[]}[];
test('Dešimt papildomų prekių apima visus 16 viešai paskelbtų bazinių artikulų',async()=>{
 assert.equal(catalogFamilies.length,10);assert.equal(catalogFamilies.reduce((n,f)=>n+f.articles.length,0),16);
 for(const f of catalogFamilies){const p=product(f.productId);assert.equal(catalogForProduct(p)?.id,f.id);assert.deepEqual([...new Set(p.configurations.map(c=>c.code))].sort(),f.articles.map(a=>a.code).sort());
  for(const article of f.articles){const s=catalogInitial(f,article.code);assert.doesNotThrow(()=>validateState(p,s));for(const k of Object.keys(stateChoices(s)))assert(fieldLabels[k],'Lietuviško lauko nėra: '+k);}
 }
});
test('Sudėtingų komplektacijų kodai ir pasirinkimų sąrašai sutampa su nepriklausomais tiekėjo eksportais',async()=>{
 assert(fixtures.length>=16);
 for(const proof of fixtures){const p=product(proof.productId),s=validateState(p,{family:proof.family,anchor:proof.anchor,values:proof.values});
  assert.deepEqual(stateChoices(s),proof.choices,proof.anchor+' source choices');
  const selected=expandedSelection(p,s);assert.deepEqual(selected.configuration.supplierOptions,proof.supplierOptions,proof.anchor+' source options');
  assert.equal(selected.configuration.id,proof.sample);assert.deepEqual(parseStateToken(p,stateToken(s)),s);
 }
});
test('2000 perėjimų tikrina priklausomybes, kitus artikulus ir neleistinų kodų atmetimą',async()=>{
 let seed=7041;
 for(const f of catalogFamilies){const p=product(f.productId);let s=catalogInitial(f);
  for(let i=0;i<200;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const lists=stateChoices(s),field=Object.keys(lists)[seed%Object.keys(lists).length],list=lists[field];s=changeField(s,field,list[(seed>>>8)%list.length]);assert.deepEqual(validateState(p,s),s);assert.deepEqual(parseStateToken(p,stateToken(s)),s);}
  assert.throws(()=>validateState(p,{...s,values:{...s.values,FAKE:'FAKE'}}));const key=Object.keys(s.values)[0];assert.throws(()=>validateState(p,{...s,values:{...s.values,[key]:'FAKE'}}));
  assert.throws(()=>validateState(product(catalogFamilies.find(other=>other.id!==f.id)!.productId),s));
 }
});
test('Z-body odinė sėdynė nustato ir paslepia fiksuotą odinį galvos atramos audinį',async()=>{
 const f=catalogFamilies.find(f=>f.id==='z-body')!;
 let s=catalogInitial(f);s=changeField(s,'CHEADREST','HRUA');s=changeField(s,'CPRICEGROUP','_5');s=changeField(s,'CSEATUPHGROUP','LE');
 assert.equal(stateChoices(s).CHEADRESTUPHCHGROUP,undefined);
 const selected=expandedSelection(product(f.productId),s);
 assert(selected.configuration.supplierOptions!.some(v=>v.endsWith('.CHEADRESTUPHCHGROUP=LE')));
});
test('Bjarg susieti apmušalai seka tikrą galvos atramos spalvą, o nepriklausomi išlieka atskiri',async()=>{
 const f=catalogFamilies.find(f=>f.id==='bjarg')!;let s=catalogInitial(f);s=changeField(s,'CHEADREST','HRUA');
 s=changeField(s,'CHEADRESTUPHCOLOR','CSE33');let selection=expandedSelection(product(f.productId),s);
 assert(selection.configuration.supplierOptions!.some(v=>v.endsWith('.CUPHCOLOR=CSE33')));
 s=changeField(s,'CPRICEGROUP','_3');assert(stateChoices(s).CUPHCOLOR);s=changeField(s,'CUPHCOLOR',stateChoices(s).CUPHCOLOR.at(-1)!);
 selection=expandedSelection(product(f.productId),s);assert(selection.configuration.supplierOptions!.some(v=>v.endsWith('.CUPHCOLOR='+s.values.CUPHCOLOR)));
});
test('Kiekvienos detalės SHA256, koordinatės, indeksai ir visos originalo trikampių geometrijos galioja',async()=>{
 await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}),assets=new Map();
 for(const f of catalogFamilies)for(const a of f.anchors){assets.set(a.geometry.asset,a.geometry);for(const c of a.components)for(const v of c.variants)for(const asset of [...(v.patch.geometry?[v.patch.geometry]:[]),...(v.patch.geometries||[])])assets.set(asset.asset,asset);}
 assert(assets.size>=50);
 for(const a of assets.values()){const bytes=fs.readFileSync(path.join('public',a.asset));assert.equal(createHash('sha256').update(bytes).digest('hex'),a.assetSha256);assert(bytes.length<=32_000_000);const doc=await io.readBinary(bytes);let triangles=0;
  for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){const pos=p.getAttribute('POSITION')!;assert([...pos.getArray()!].every(Number.isFinite));assert([...p.getIndices()!.getArray()!].every(i=>i<pos.getCount()));triangles+=p.getIndices()!.getCount()/3;}
  assert.equal(triangles,a.sourceTriangles);
  assert.deepEqual(doc.getRoot().listNodes().filter(n=>n.getMesh()).map(n=>n.getName()).sort(),[...a.partIds].sort(),a.asset+' part identifiers');
  for(const node of doc.getRoot().listNodes().filter(n=>n.getMesh()))assert.equal(node.getExtras().partId,node.getName());
 }
});
test('Visų artikulų lietuviškas PDF ir užklausa išsaugo tinkamą modelį bei gamintojo kodus',async()=>{
 for(const f of catalogFamilies)for(const article of f.articles){const p=product(f.productId),s=catalogInitial(f,article.code),choice=expandedSelection(p,s);
  const saved=await storeQuote({name:'[PATIKRA] 10 prekių',email:article.code.toLowerCase()+'@example.invalid',phone:'',company:'',message:'Bandomoji užklausa',consent:true,website:'',startedAt:Date.now()-5000,submissionKey:randomUUID(),items:[{productId:p.id,configurationId:article.sample,configurationState:s,quantity:2,note:''}]});
  const row=getDb().prepare('SELECT payload FROM quotes WHERE id=?').get(saved.id) as {payload:string},item=JSON.parse(row.payload).items[0];assert.equal(item.configurationId,article.sample);assert.deepEqual(item.supplierOptions,choice.configuration.supplierOptions);assert(item.configurationEvidence.base.assetSha256);
  const r=await GET(new Request('http://127.0.0.1/api/produkto-kortele/?produktas='+p.id+'&konfig='+encodeURIComponent(stateToken(s))));assert.equal(r.status,200);assert(Buffer.from(await r.arrayBuffer()).subarray(0,5).equals(Buffer.from('%PDF-')));
 }
});
