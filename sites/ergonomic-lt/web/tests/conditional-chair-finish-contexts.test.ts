import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeReadyChairPalettes} from '../scripts/normalize-ready-chair-palettes';
import {qualifiedChairPlan,qualifiedDefaultSelection} from '../src/lib/chair-qualified-colors';
import {chairInitialQualifiedSelection} from '../src/lib/chair-preview';
import type {ChairPreview} from '../src/lib/chair-preview';

// Finite producer metadata only; no factory exports or geometry replay. Real
// selector/geometry/material admission is separately recorded by the receiver.
function fixture(number:'4341'|'4461'|'6601'){
 const docs:Record<string,any>=JSON.parse(readFileSync(new URL('./fixtures/conditional-finish-'+number+'.json',import.meta.url),'utf8'));
 const c=docs['conditional-context.json'],refs=c.requiredOwnedBaseAssetShas as string[],materials:Record<string,unknown>={};
 const values=(v:any):any[]=>Array.isArray(v)?v:Object.values(v);
 const bindings=docs['colors-groups.json'].groups.flatMap((g:any)=>values(g.values).flatMap(v=>v.bindings));
 const part=(h:string)=>({file:h+'.glb',sha256:h,bytes:100});
 const dimensions=Object.fromEntries(Object.entries(c.exactConstructionAndDerivedValues).map(([k,v])=>[k.split('.')[1],v]));
 const context={dimensions,invariant:part(refs[0]),groups:refs.slice(1).map((h:string)=>({fields:[],variants:[{values:{},asset:part(h)}]}))};
 for(const b of bindings)materials[b.materialId]={pbrMetallicRoughness:{baseColorFactor:[1,0,0,1]}};
 const data={code:c.code,runtimeSha256:c.runtimeSha256,runtime:{contexts:Array.from({length:c.runtimeContextIndex+1},()=>structuredClone(context))},
  palette:{schema:'chair-base-observed-colours-v1',code:c.code,runtimeSha256:c.runtimeSha256},
  assets:Object.fromEntries(refs.map(h=>[h,{asset:'/base/'+h+'.glb',assetSha256:h,bytes:100}])),textures:{},
  selectors:{assets:Object.fromEntries(refs.map(h=>[h,{assetSha256:h,slots:[...new Map(bindings.filter((b:any)=>b.assetSha256===h).map((b:any)=>[b.selectorId,{selectorId:b.selectorId,materialId:b.baseMaterialId}])).values()],materials:{}}]))},
 }as unknown as ChairPreview;
 const normalize=()=>normalizeReadyChairPalettes(data,docs,materials,{},'finite-test');
 return {docs,data,c,refs,normalize};
}
test('NXT finite scope has exactly thirteen whole YB tuples and keeps the original startup',()=>{
 const f=fixture('4341');f.data.qualified=f.normalize().qualified;const w=f.data.qualified.witnesses[0];
 assert.equal(w.groups.length,1);assert.equal(w.groups[0].options.length,13);assert.equal(w.singles.length,0);
 assert.equal(chairInitialQualifiedSelection(f.data),undefined);
 for(const o of w.groups[0].options){assert.deepEqual(Object.keys(o.values).sort(),['CPRICEGROUP','CUPHCOLOR','CUPHGROUP']);assert.equal(o.values.CPRICEGROUP,'_1');assert.equal(o.values.CUPHGROUP,'YB');const s=qualifiedDefaultSelection(w);s.groups[w.groups[0].id]=o.id;assert.equal(qualifiedChairPlan(f.data,1,[],f.refs,s).status,'observed-state');}
 assert.deepEqual(w.fixed,{CBACKCOVERPLASTICCOLOR:'BLACK',CSEATCOVERPLASTICCOLOR:'BL'});
 assert.equal(qualifiedChairPlan(f.data,0,[],f.refs,qualifiedDefaultSelection(w)).status,'unavailable');
});
test('UTI uses two disjoint controls; thirteen coupled UPH tuples and six mesh choices',()=>{
 const f=fixture('4461');f.data.qualified=f.normalize().qualified;const w=f.data.qualified.witnesses[0],up=w.groups.find(g=>g.options.length===13)!,mesh=w.groups.find(g=>g.options.length===6)!;
 assert.equal(w.groups.length,2);assert.equal(chairInitialQualifiedSelection(f.data),undefined);
 assert.deepEqual(up.options.map(o=>o.values).sort((a,b)=>a.CUPHCOLOR.localeCompare(b.CUPHCOLOR)),f.c.scopedUpholsteryAtomicTuples.sort((a:any,b:any)=>a.CUPHCOLOR.localeCompare(b.CUPHCOLOR)));
 // These are consumer-plan checks for the supplied disjoint grammar, not a
 // claim of78 independent manufacturer exports (producer evidence remains28).
 for(const a of up.options)for(const b of mesh.options){const s=qualifiedDefaultSelection(w);s.groups[up.id]=a.id;s.groups[mesh.id]=b.id;const p=qualifiedChairPlan(f.data,0,w.variants,f.refs,s);assert.equal(p.status,'observed-state');assert.equal(p.fullPalettePass,false);}
 assert.equal(f.docs['GROUP-PALETTE-VERIFIED-SAFE.json'].actualWholeManufacturerStatesReconstructed,28);
 assert.equal(f.normalize().qualified.witnesses.length,1);
});
for(const number of ['4341','4461','6601']as const){
 test(number+' rejects a changed runtime, construction, OWN assembly or full-palette promotion',()=>{
  const a=fixture(number);a.data.runtimeSha256='f'.repeat(64);assert.throws(a.normalize,/runtime/i);
  const b=fixture(number);b.data.runtime.contexts[b.c.runtimeContextIndex].dimensions.DDEPTH='_999';assert.throws(b.normalize,/dimensions/i);
  const c=fixture(number);c.docs['colors-groups.json'].requiredOwnedBaseAssetShas=['f'.repeat(64)];c.c.requiredOwnedBaseAssetShas=['f'.repeat(64)];assert.throws(c.normalize,/OWN asset set/i);
  const d=fixture(number);d.docs['colors-groups.json'].actualPaletteComplete=true;assert.throws(d.normalize,/full coverage/i);
 });
 test(number+' rejects incomplete tuples, invented domains, foreign selectors and geometry grants',()=>{
  const first=(f:ReturnType<typeof fixture>)=>{const g=f.docs['colors-groups.json'].groups.find((g:any)=>g.fields.includes('CUPHCOLOR'));return Object.values(g.values)[0]as any;};
  const a=fixture(number);delete first(a).values.CUPHGROUP;assert.throws(a.normalize,/incomplete|split/i);
  const b=fixture(number);first(b).values.CUPHCOLOR='YB999';assert.throws(b.normalize,/invented|prefix/i);
  const c=fixture(number);first(c).bindings[0].selectorId='f'.repeat(64);assert.throws(c.normalize,/OWN selectors/i);
  const d=fixture(number);first(d).mode='primitiveSwap';assert.throws(d.normalize,/geometry/i);
 });
}
test('UTI readonly side stays in the tuple and cannot become an independent menu',()=>{
 const a=fixture('4461'),g=a.docs['colors-groups.json'].groups.find((g:any)=>g.fields.includes('CUPHSIDECOLOR'));delete (Object.values(g.values)[0]as any).values.CUPHSIDECOLOR;assert.throws(a.normalize,/incomplete|split/i);
 const b=fixture('4461');b.docs['GROUP-PALETTE-VERIFIED-SAFE.json'].selectableFields.push('CUPHSIDECOLOR');assert.throws(b.normalize,/Readonly field/i);
});

test('UTI4V1 admits exactly fifteen CUR upholstery tuples and six independent mesh choices in context1',()=>{
 const f=fixture('6601');f.data.qualified=f.normalize().qualified;const w=f.data.qualified.witnesses[0],up=w.groups.find(g=>g.options.length===15)!,mesh=w.groups.find(g=>g.options.length===6)!;
 assert.equal(w.context,1);assert.equal(w.groups.length,2);assert.equal(w.singles.length,0);assert.match(up.label,/CUR/);
 assert.deepEqual(up.options.map(o=>o.values).sort((a,b)=>a.CUPHCOLOR.localeCompare(b.CUPHCOLOR)),f.c.scopedUpholsteryAtomicTuples.sort((a:any,b:any)=>a.CUPHCOLOR.localeCompare(b.CUPHCOLOR)));
 assert(up.options.every(o=>o.values.CPRICEGROUP==='_2'&&o.values.CUPHGROUP==='CUR'&&o.values.CUPHSIDECOLOR===o.values.CUPHCOLOR&&o.patch.bindings.length===3));
 assert.deepEqual(w.fixed,{CFRAMEPLASTICCOLOR:'BLACK',CHEADRESTSPLASTICCOLOR:'BLACK',CMESHGROUP:'MT',CSEATCOVERPLASTICCOLOR:'BL'});
 // Ninety consumer plans exercise only the supplied disjoint grammar. The
 // producer reports31 WHOLE exports; this does not grant90 factory states.
 for(const a of up.options)for(const b of mesh.options){const s=qualifiedDefaultSelection(w);s.groups[up.id]=a.id;s.groups[mesh.id]=b.id;const p=qualifiedChairPlan(f.data,1,w.variants,f.refs,s);assert.equal(p.status,'observed-state');assert.equal(p.fullPalettePass,false);}
 assert.equal(f.docs['GROUP-PALETTE-VERIFIED-SAFE.json'].actualWholeManufacturerStatesReconstructed,31);
 assert.equal(qualifiedChairPlan(f.data,0,w.variants,f.refs,qualifiedDefaultSelection(w)).status,'unavailable');
});

test('UTI4V1 rejects PRICE1/YB, split side upholstery, a changed certificate and fewer OWN upholstery selectors',()=>{
 const a=fixture('6601');a.c.fixedSelectableFinishValues={CPRICEGROUP:'_1',CUPHGROUP:'YB'};assert.throws(a.normalize,/prefix/i);
 const b=fixture('6601');b.docs['GROUP-PALETTE-VERIFIED-SAFE.json'].selectableFields.push('CUPHSIDECOLOR');assert.throws(b.normalize,/Readonly field/i);
 const c=fixture('6601');c.c.qualification6601Sha256='f'.repeat(64);assert.throws(c.normalize,/qualification SHA/i);
 const d=fixture('6601');d.docs['colors-groups.json'].groups.find((g:any)=>g.fields.includes('CUPHCOLOR')).ownedBaselineSelectors.pop();assert.throws(d.normalize,/OWN baseline selector count/i);
 const e=fixture('6601');delete (Object.values(e.docs['colors-groups.json'].groups.find((g:any)=>g.fields.includes('CUPHCOLOR')).values)[0]as any).values.CUPHSIDECOLOR;assert.throws(e.normalize,/incomplete|split/i);
});
