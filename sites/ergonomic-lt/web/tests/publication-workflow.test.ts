import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const testRoot='D:/Core/output/ergonomic-admin-launch-20261017/tests';mkdirSync(testRoot,{recursive:true});
process.env.RUNTIME_DIR=mkdtempSync(path.join(testRoot,'workflow-'));
import {bindSourceModels,stages,blockers,transition as transitionOriginal,release as releaseOriginal,priorities,document,saveDocument,Conflict} from '../src/lib/publication-workflow';
import type {Workflow} from '../src/lib/publication-workflow';
import {launchProjection} from '../src/lib/launch-projection';
import seed from '../content/seed.json';
import {allProductModels,productModels,resolveCatalogProduct} from '../src/lib/product-models';
import {technicalSources,technicalSourceHash} from '../src/lib/publication-geometry';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {publicationOne} from '../src/lib/publication-db';
const sourceModels=bindSourceModels(seed.products as any);
const models=new Map(sourceModels.map(m=>[m.key,m]));
const transition=(w:Workflow,key:string,hash:string,action:string,input:any,actor:string)=>transitionOriginal(w,key,hash,action,input,actor,models);
const release=(w:Workflow)=>releaseOriginal(w,models);
const empty=():Workflow=>({version:1,models:{},released:{},releaseId:null});
const model=sourceModels.find(m=>!m.active&&blockers(m).length===0)!;
const review={desktop:true,mobile:true,evidence:Object.fromEntries(['usefulness','facts','sources','media','links','presentation'].map(a=>[a,'TEST ONLY: independent fixture evidence for '+a]))};
test('original inventory is unique and stages do not manufacture owner approvals',()=>{
 assert.equal(sourceModels.length,1111);assert.equal(new Set(sourceModels.map(m=>m.key)).size,1111);assert.equal(stages.length,7);assert.ok(model);assert.deepEqual(release(empty()).released,{});
});
test('only actual original IDs may enter the priority document, in exact order',()=>{
 const ids=sourceModels.slice(0,3).map(m=>m.key).reverse();assert.deepEqual(priorities(ids).order,ids);assert.throws(()=>priorities([ids[0],ids[0]]));assert.throws(()=>priorities(['invented']));assert.throws(()=>priorities('all'));assert.equal(priorities([]).writer.thinking,'low');
});
test('review → approve → release is required and stale revisions fail closed',()=>{
 assert.throws(()=>transition(empty(),model.key,model.revisionHash,'approve',{},'TEST'));
 assert.throws(()=>transition(empty(),model.key,'old','review',review,'TEST'),Conflict);
 assert.throws(()=>transition(empty(),model.key,model.revisionHash,'review',{...review,mobile:false},'TEST'));
 let w=transition(empty(),model.key,model.revisionHash,'review',review,'TEST');assert.deepEqual(w.released,{});
 w=transition(w,model.key,model.revisionHash,'approve',{},'TEST');assert.deepEqual(w.released,{});
 w=release(w);assert.equal(w.released[model.key].revisionHash,model.revisionHash);
 w=transition(w,model.key,model.revisionHash,'remove',{comment:'TEST removal'},'TEST');assert.deepEqual(w.released,{});assert.equal(w.models[model.key].approval,undefined);
});
test('unprepared candidates cannot bypass model evidence by supplying review fields',()=>{
 const m=sourceModels.find(m=>!m.geminiReady)!;assert.throws(()=>transition(empty(),m.key,m.revisionHash,'review',review,'TEST'));assert.throws(()=>transition(empty(),model.key,model.revisionHash,'return',{comment:''},'TEST'));
});
test('review tampering invalidates Core readiness and old release hashes never transfer',()=>{
 let w=transition(empty(),model.key,model.revisionHash,'review',review,'TEST');w.models[model.key].review!.binding='tampered';assert.throws(()=>transition(w,model.key,model.revisionHash,'approve',{},'TEST'));
 w=empty();w.models[model.key]={revisionHash:'old',approval:{actor:'TEST',at:'2026-10-17'}};assert.deepEqual(release(w).released,{});
});

test('a consistently changed 3D release cannot inherit an old approval or old acceptance snapshot',()=>{
 let w=transition(empty(),model.key,model.revisionHash,'review',review,'TEST');w=transition(w,model.key,model.revisionHash,'approve',{},'TEST');
 const changed=structuredClone(technicalSources);const code=Object.keys(changed.index.articles)[0];
 (changed.index.articles as any)[code]={asset:'/models/configurator/runtime/'+code+'-11111111111111111111.json',sha256:'1'.repeat(64)};
 const updated=bindSourceModels(seed.products as any,undefined,technicalSourceHash(changed));const map=new Map(updated.map(m=>[m.key,m]));
 assert.notEqual(map.get(model.key)!.revisionHash,model.revisionHash);assert.equal(map.get(model.key)!.geometryAccepted,false);
 assert.deepEqual(releaseOriginal(w,map).released,{});assert.throws(()=>transitionOriginal(w,model.key,model.revisionHash,'approve',{},'TEST',map),Conflict);
 assert.throws(()=>transitionOriginal(empty(),model.key,map.get(model.key)!.revisionHash,'review',review,'TEST',map));
});

test('historical presets outside the approved projection return a controlled not-found',()=>{
 const parent=seed.products.find(p=>p.configurations.some(c=>c.id==='19840265'))!;
 const keeper=parent.configurations.find(c=>c.id==='19840265')!;
 const projected={...parent,publicationOriginalCount:parent.configurations.length,configurations:[keeper]};
 const slug=parent.slug+'-modelis-19840265';
 assert.ok(resolveCatalogProduct([projected] as any,parent.categorySlug,slug));
 assert.equal(resolveCatalogProduct([projected] as any,parent.categorySlug,slug,'19840266'),undefined);
});

test('a single released member retains its real embedded engine without releasing siblings',()=>{
 const engine=createExpandedEngine();
 for(const id of ['23636152','20402096']){
  const parent=seed.products.find(p=>p.configurations.some(c=>c.id===id))!;
  const projected={...parent,publicationOriginalCount:parent.configurations.length,configurations:parent.configurations.filter(c=>c.id===id)};
  const p=allProductModels([projected] as any)[0];
  assert.ok(engine.expandedForProduct(p));const state=engine.initialStateForProduct(p);
  assert.deepEqual(engine.validateState(p,state),state);assert.ok(engine.assembledAssets(state).base.asset);
  assert.equal(engine.expandedSelection(p,state).configuration.id,id);
  assert.equal(p.configurations.length,1);
 }
});
test('SQLite/D1-compatible CAS, atomic audit and launch projection preserve IDs/URLs',async()=>{
 const d=await document<Workflow>('workflow.json');assert.equal(d.revision,0);
 let w=transition(empty(),model.key,model.revisionHash,'review',review,'TEST');w=transition(w,model.key,model.revisionHash,'approve',{},'TEST');w=release(w);
 await saveDocument('workflow.json',d.revision,w,'TEST','release',model.key);
 await assert.rejects(()=>saveDocument('workflow.json',d.revision,empty(),'TEST','stale'),Conflict);
 assert.equal((await document<Workflow>('workflow.json')).payload.released[model.key].revisionHash,model.revisionHash);
 assert.ok((await document<Workflow>('workflow.json')).payload.models[model.key].approval);
 const compact=await publicationOne<{payload:string}>("SELECT payload FROM admin_documents WHERE name='workflow.json'");assert.deepEqual(JSON.parse(compact!.payload).models,{},'Model reviews use individual rows, not a growing singleton');
 process.env.LAUNCH_SITE='true';const projection=await launchProjection(seed as any);const models=allProductModels(projection.products);
 assert.equal(models.length,1);assert.equal(models[0].modelConfigurationId,model.configurationId);assert.equal(`/produktai/${models[0].categorySlug}/${models[0].slug}/`,model.path);
 assert.equal(productModels(projection.products).length,1,'An explicitly approved original example must remain visible in launch even if the public draft consolidates it');
 const original=seed.products.find(p=>p.id===model.productId)!;assert.equal(original.configurations.length,(projection.products[0] as any).publicationOriginalCount);
 process.env.LAUNCH_SITE='false';assert.equal((await launchProjection(seed as any)).products.length,seed.products.length);
 const removed=transition(w,model.key,model.revisionHash,'remove',{comment:'TEST rollback'},'TEST');await saveDocument('workflow.json',1,removed,'TEST','remove',model.key);
 const before=await publicationOne<{payload:string}>("SELECT payload FROM publication_versions WHERE document='workflow.json' AND revision=1");assert.ok(JSON.parse(before!.payload).approval,'Original approval remains immutable after removal');
});
