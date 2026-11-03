import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeReadyChairPalettes} from '../scripts/normalize-ready-chair-palettes';
import {remainingChairScopePins,assertRemainingChairHeaders,ownChairOriginalPalette,ownChairRuntimeView} from '../scripts/remaining-chair-scope-admissions';
import {qualifiedChairPlan,qualifiedDefaultSelection} from '../src/lib/chair-qualified-colors';
import type {ChairPreview} from '../src/lib/chair-preview';
import type {Asset} from '../src/lib/expanded-configurator';

// Bounded real metadata; surrogate materials and no binary geometry. Actual
// file SHA, canonical geometry and browser evidence are separate admissions.
function fixture(code:string){
 const f=JSON.parse(readFileSync(new URL('./fixtures/remaining-scope-'+code+'.json',import.meta.url),'utf8'))as {data:ChairPreview;documents:Record<string,any>;materials:Record<string,unknown>;fileAssets:Record<string,Asset>};
 const data=f.data as ChairPreview,documents=f.documents;
 return {...f,data,documents,normalize:()=>normalizeReadyChairPalettes(data,documents,f.materials,f.fileAssets,remainingChairScopePins[code].version)};
}
for(const [code,count]of Object.entries({K2ME001WW002:141,K2ME003WW002:70,K2ME004WW004:133,KNAU017WW001:1,KCHI001WW004:30,KLYN003WW002:92,KNAD001WW002:200})){
 test(code+' admits only its supplied finite plans, without a full palette claim',()=>{
  const f=fixture(code);f.data.qualified=f.normalize().qualified;let n=0;
  for(const w of f.data.qualified.witnesses){
   const initial=qualifiedDefaultSelection(w);
   for(const g of w.groups)for(const o of g.options){const p=qualifiedChairPlan(f.data,w.context,w.variants,w.requiredAssets,{...initial,kind:'groups',groups:{...initial.groups,[g.id]:o.id}});assert.notEqual(p.status,'unavailable');assert.equal(p.fullPalettePass,false);n++;}
   for(const o of w.singles){const p=qualifiedChairPlan(f.data,w.context,w.variants,w.requiredAssets,{...initial,kind:'single',single:o.id});assert.notEqual(p.status,'unavailable');assert.equal(p.fullPalettePass,false);n++;}
  }
  assert.equal(n,count);
  f.data.runtimeSha256='f'.repeat(64);assert.throws(f.normalize,/runtime|target|scope/i);
 });
 test(code+' requires the exact received version, manifest and all header SHAs',()=>{
  const p=remainingChairScopePins[code],headers=new Map(Object.entries(p.headers).map(([file,sha256])=>[file,{sha256:sha256 as string}]));
  assertRemainingChairHeaders(code,p.version,p.manifestSha256,headers);
  assert.throws(()=>assertRemainingChairHeaders(code,p.version,'f'.repeat(64),headers),/manifest/i);
  headers.set('selectors.json',{sha256:'f'.repeat(64)});assert.throws(()=>assertRemainingChairHeaders(code,p.version,p.manifestSha256,headers),/header/i);
 });
}
for(const code of ['K2ME001WW002','K2ME003WW002','K2ME004WW004']){
 test(code+' keeps PRICE/GROUP/COLOR atomic and rejects unmeasured cross-construction inference',()=>{
  const f=fixture(code),q=f.normalize().qualified,w=q.witnesses[0];assert.equal(w.inference,true);assert.equal(w.groups.length,0);
  assert(w.singles.filter(o=>'CUPHCOLOR'in o.values).every(o=>Object.keys(o.values).sort().join(',')==='CPRICEGROUP,CUPHCOLOR,CUPHGROUP'));
  const split=fixture(code);delete split.documents['colors-reuse.json'].fields[0].values[0].targetFullReachableGroupValues.CUPHGROUP;assert.throws(split.normalize,/split/i);
  const wrong=fixture(code),s=wrong.documents['colors-reuse.json'].fields[0];s.targetBaseFullActualState[code+'_OPTIONS.CSEAT']='UNMEASURED';assert.throws(wrong.normalize,/construction/i);
  const noOp=fixture(code),v=noOp.documents['colors-reuse.json'].fields[0].values.find((v:any)=>v.mode==='unchanged');assert(v);v.targetFullReachableGroupValues.CUPHCOLOR='INVENTED';v.value='INVENTED';assert.throws(noOp.normalize,/no-op/i);
 });
}
test('Lynx retains the varying readonly upholstery group inside each atomic option',()=>{
 const f=fixture('KLYN003WW002'),w=f.normalize().qualified.witnesses[0];assert.equal(w.groups.length,0);assert.equal(w.singles.length,92);
 assert(w.singles.every(o=>Object.keys(o.values).sort().join(',')==='CPRICEGROUP,CUPHCOLOR,CUPHGROUP'));
 const split=fixture('KLYN003WW002'),first=Object.values(split.documents['colors-groups.json'].groups[0].values)[0]as any;delete first.derivedFinishValues.CUPHGROUP;assert.throws(split.normalize,/readonly|derived/i);
 const menu=fixture('KLYN003WW002');menu.documents['colors-groups.json'].groups[0].fields.push('CUPHGROUP');assert.throws(menu.normalize,/atomic/i);
});
test('Nadir exposes only captured SH castors as construction, never a readonly finish',()=>{
 const f=fixture('KNAD001WW002');f.data.qualified=f.normalize().qualified;const w=f.data.qualified.witnesses[0];
 assert.deepEqual(w.structural,{CCASTORS:{value:'SH',supportedValues:['SH']}});assert.equal(w.fixed,undefined);
 f.data.runtime.contexts[0].dimensions.CCASTORS='SHH';assert.equal(qualifiedChairPlan(f.data,0,[],w.requiredAssets,qualifiedDefaultSelection(w)).status,'unavailable');
 const wrong=fixture('KNAD001WW002');wrong.documents['own-source-contract.json'].fixedSelectableStructuralFields.CCASTORS.editable=false;assert.throws(wrong.normalize,/restriction/i);
 const full=fixture('KNAD001WW002');full.documents['own-source-contract.json'].fullFormQualified=true;assert.throws(full.normalize,/full-form/i);
});
for(const code of ['KCHI001WW004','KLYN003WW002','KNAD001WW002']){
 test(code+' adapts only exact fixed-scene metadata while retaining every original asset and dimension',()=>{
  const f=fixture(code),bytes=readFileSync(new URL('./fixtures/own-runtime-'+code+'.json',import.meta.url)),raw=JSON.parse(bytes.toString()),view=ownChairRuntimeView(bytes,code,f.documents),c=view.runtime.contexts[0];
  assert.deepEqual(c.dimensions,raw.contexts[0].dimensions);assert.equal(c.invariant!.sha256,raw.contexts[0].invariant.sha256);assert.equal(c.invariant!.componentSha256,raw.contexts[0].invariant.componentSha256);assert.equal(c.invariant!.bytes,raw.contexts[0].invariant.bytes);
  assert.deepEqual(c.groups,[{fields:[],variants:[{values:{},asset:null}]}]);assert.equal(view.files[c.invariant!.file],raw.contexts[0].invariant.file);assert.equal(view.proof.addedSelectableStates,0);assert.equal(view.proof.assetPayloadChanged,false);assert.equal(view.runtime.fullGraphClosed,false);
  const altered=Buffer.from(bytes);altered[altered.length-2]^=1;assert.throws(()=>ownChairRuntimeView(altered,code,f.documents),/runtime bytes/i);
 });
 test(code+' never aliases the old Main runtime or promotes one construction to all geometry',()=>{
  const f=fixture(code);f.documents['own-source-contract.json'].existingMainRuntimeGeometryOwnershipQualified=true;assert.throws(f.normalize,/promoted|rebound/i);
  const all=fixture(code);all.documents['colors-groups.json'].allGeometryContextsCovered=true;assert.throws(all.normalize,/promoted/i);
  const p=remainingChairScopePins[code],raw={code,actualPaletteComplete:false,allGeometryContextsCovered:false,ownSourceContract:'own-source-contract.json',ownSourceContractSha256:p.headers['own-source-contract.json'],qualifiedGroupPalette:'colors-groups.json',qualifiedGroupPaletteWitnessCount:1};
  const base=fixture(code);assert.equal(ownChairOriginalPalette(raw,code,p.runtime,base.documents).availableMaterialBindings.length,0);
  raw.actualPaletteComplete=true;assert.throws(()=>ownChairOriginalPalette(raw,code,p.runtime,base.documents),/reference/i);
 });
}
test('Naudu changes the entire saved frame/footrest state and rejects altered tuples or donor geometry',()=>{
 const f=fixture('KNAU017WW001'),w=f.normalize().qualified.witnesses[0];assert.equal(w.singles.length,1);assert.equal(w.groups.length,0);
 assert.equal(w.singles[0].values.CFOOTREST,'FBCR');assert.equal(w.singles[0].patch.assets[0].assetSha256,'cfd3bd4defa94bbca61c1ec21a15447c0ffbbfe9dffd1482484b3cdba62d130b');
 const changed=fixture('KNAU017WW001');changed.documents['colors-saved-auto-construction-swaps.json'].afterActualFullValues['KNAU017WW001_OPTIONS.CFOOTREST']='OTHER';assert.throws(changed.normalize,/full tuple|state/i);
 const donor=fixture('KNAU017WW001');donor.documents['colors-saved-auto-construction-swaps.json'].addSameCodeNativeAsset.sha256='f'.repeat(64);assert.throws(donor.normalize,/target asset/i);
});
