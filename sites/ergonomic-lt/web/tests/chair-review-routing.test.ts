import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chairReviewRoute,chairConstructionMenus,validateChairConstructionBinding,type ChairReviewEntry,type ChairConstructionBinding} from '../src/lib/chair-review-routing';
import type {ChairPreview} from '../src/lib/chair-preview';
import constructionPins from '../scripts/segla-construction-exact-pins.json';
import reviewRegistry from '../content/pc2-chair-review-candidates.json';

const structuralValues={CMECHANISM:'FST',CARMRESTS:'R35K3SB2',CGASLIFT:'GLR',CBASE:'TS25',CCASTORS:'ESH60',CSEATPADFOAM:'STANDARD',CASSEMBLY:'PACKUA'};
const binding:ChairConstructionBinding={runtimeSha256:'new-runtime',dimensions:{...structuralValues,DHEIGHT:'_840T1045'},structuralValues};
const entry:ChairReviewEntry={code:'KSEG001WW001',name:'LOW',asset:'old-own',sha256:'old-sha',bytes:100,contexts:[{id:'PRICE_4',label:'PRICE4',asset:'old-price4',sha256:'old-four',bytes:100}],constructions:[{id:'LOW_R35K3SB2',label:'R35K3SB2',asset:'new-own',sha256:'new-sha',bytes:100,construction:binding}]};
test('construction is selected before its finish domain; legacy price cannot leak into new arms',()=>{
 assert.equal(chairReviewRoute(entry,'default','PRICE_4').source.asset,'old-price4');
 assert.equal(chairReviewRoute(entry,'LOW_R35K3SB2','default').source.asset,'new-own');
 assert.throws(()=>chairReviewRoute(entry,'LOW_R35K3SB2','PRICE_4'),/Unknown finish/);
 assert.throws(()=>chairReviewRoute(entry,'R74','default'),/Unknown chair construction/);
 assert.equal(chairReviewRoute(entry,'default','default').source.asset,'old-own');
});

test('MEDIUM NONE requires the new OWN runtime and exact hidden205 dimension',()=>{
 const route=constructionPins.MEDIUM_NONE.route;
 const values=Object.fromEntries(Object.entries(route.fixedSelectableStructuralFields).map(([k,v])=>[k,v.fixedValue]));
 const scoped:ChairConstructionBinding={runtimeSha256:route.runtimeSha256,dimensions:route.exactRuntimeConstructionDimensions,structuralValues:values};
 const own={runtimeSha256:scoped.runtimeSha256,runtime:{contexts:[{dimensions:{...scoped.dimensions}}]},qualified:{witnesses:[{structural:Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{value,supportedValues:[value]}]))}]}} as unknown as ChairPreview;
 assert.equal(values.CARMRESTS,'NONE');assert.equal(scoped.dimensions.DARMRESTSHEIGHT,'_205T280');
 assert.doesNotThrow(()=>validateChairConstructionBinding(own,scoped));
 for(const nominal of ['_210T280','']){const wrong=structuredClone(own);wrong.runtime.contexts[0].dimensions.DARMRESTSHEIGHT=nominal;assert.throws(()=>validateChairConstructionBinding(wrong,scoped));}
 const old=structuredClone(own);old.runtimeSha256='default-medium-own';assert.throws(()=>validateChairConstructionBinding(old,scoped));
});

test('HIGH NONE never accepts MEDIUM geometry or a nominal210 hidden dimension',()=>{
 const high=constructionPins.HIGH_NONE.route,medium=constructionPins.MEDIUM_NONE.route;
 assert.notEqual(high.baselineAssetSha256,medium.baselineAssetSha256);
 assert.notEqual(high.runtimeSha256,medium.runtimeSha256);
 const values=Object.fromEntries(Object.entries(high.fixedSelectableStructuralFields).map(([k,v])=>[k,v.fixedValue]));
 const binding:ChairConstructionBinding={runtimeSha256:high.runtimeSha256,dimensions:high.exactRuntimeConstructionDimensions,structuralValues:values};
 const own={runtimeSha256:high.runtimeSha256,runtime:{contexts:[{dimensions:{...binding.dimensions}}]},qualified:{witnesses:[{structural:Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{value,supportedValues:[value]}]))}]}} as unknown as ChairPreview;
 assert.doesNotThrow(()=>validateChairConstructionBinding(own,binding));
 const mixed=structuredClone(own);mixed.runtime.contexts[0].dimensions={...medium.exactRuntimeConstructionDimensions};assert.throws(()=>validateChairConstructionBinding(mixed,binding));
 const nominal=structuredClone(own);nominal.runtime.contexts[0].dimensions.DARMRESTSHEIGHT='_210T280';assert.throws(()=>validateChairConstructionBinding(nominal,binding));
});

test('MEDIUM base menu selects only complete admitted NONE constructions, never R35K3SB2+TS34BL',()=>{
 const medium=reviewRegistry.entries.find(e=>e.code==='KSEG002WW001')! as ChairReviewEntry;
 const menu=chairConstructionMenus(medium,'MEDIUM_NONE_TS34BL')!;
 assert.equal(menu.armId,'MEDIUM_NONE');assert.equal(menu.arms.length,2);
 assert.deepEqual(menu.bases,[{id:'MEDIUM_NONE',label:'TS25'},{id:'MEDIUM_NONE_TS34BL',label:'TS34BL'},{id:'MEDIUM_NONE_ST61POLBL',label:'ST61POLBL'}]);
 assert.deepEqual(chairConstructionMenus(medium,'default')!.bases,[{id:'default',label:'TS25'}]);
 const routed=chairReviewRoute(medium,'MEDIUM_NONE_TS34BL','default');
 assert.equal(routed.construction.construction!.structuralValues.CARMRESTS,'NONE');
 assert.equal(routed.construction.construction!.structuralValues.CBASE,'TS34BL');
 assert.equal(routed.construction.construction!.dimensions.DARMRESTSHEIGHT,'_205T280');
 assert.throws(()=>chairReviewRoute(medium,'MEDIUM_NONE_TS34BL','PRICE_2_CUR'),/Unknown finish/);
 const pin=constructionPins.MEDIUM_NONE_TS34BL.route;
 assert.notEqual(pin.runtimeSha256,constructionPins.MEDIUM_NONE.route.runtimeSha256);
 assert.notEqual(pin.baselineAssetSha256,constructionPins.MEDIUM_NONE.route.baselineAssetSha256);
});
function data(){return {runtimeSha256:binding.runtimeSha256,runtime:{contexts:[{dimensions:{...binding.dimensions}}]},qualified:{witnesses:[{structural:Object.fromEntries(Object.entries(structuralValues).map(([k,value])=>[k,{value,supportedValues:[value]}]))}]}} as unknown as ChairPreview;}
test('same chair code or finish does not authorize a different runtime or any of seven fields',()=>{
 assert.doesNotThrow(()=>validateChairConstructionBinding(data(),binding));
 const wrongRuntime=data();wrongRuntime.runtimeSha256='old-runtime';assert.throws(()=>validateChairConstructionBinding(wrongRuntime,binding));
 for(const key of Object.keys(structuralValues)){
  const wrong=data();wrong.runtime.contexts[0].dimensions[key]='unqualified';assert.throws(()=>validateChairConstructionBinding(wrong,binding));
 }
 const derived=data();derived.runtime.contexts[0].dimensions.DHEIGHT='other';assert.throws(()=>validateChairConstructionBinding(derived,binding));
 const wrongWitness=data();wrongWitness.qualified!.witnesses[0].structural!.CARMRESTS.supportedValues.push('R35K3');assert.throws(()=>validateChairConstructionBinding(wrongWitness,binding));
});

test('HIGH NONE bases keep their distinct HIGH runtime and exact derived heights',()=>{
 const high=reviewRegistry.entries.find(e=>e.code==='KSEG003WW001')! as ChairReviewEntry;
 assert.deepEqual(chairConstructionMenus(high,'HIGH_NONE_TS25')!.bases,[{id:'HIGH_NONE',label:'TS34BL'},{id:'HIGH_NONE_TS25',label:'TS25'},{id:'HIGH_NONE_ST61POLBL',label:'ST61POLBL'}]);
 assert.equal(chairConstructionMenus(high,'HIGH_NONE_TS25')!.armId,'HIGH_NONE');
 assert.deepEqual(chairConstructionMenus(high,'default')!.bases,[{id:'default',label:'TS34BL'}]);
 const route=chairReviewRoute(high,'HIGH_NONE_TS25','default');
 assert.equal(route.construction.construction!.dimensions.DHEIGHT,'_985T1200');
 assert.equal(route.construction.construction!.dimensions.DSEATHEIGHT,'_400T530');
 assert.notEqual(route.construction.runtimeSha256,constructionPins.HIGH_NONE.route.runtimeSha256);
 assert.notEqual(route.construction.runtimeSha256,constructionPins.MEDIUM_NONE.route.runtimeSha256);
 assert.throws(()=>chairReviewRoute(high,'HIGH_NONE_TS25','PRICE_4'),/Unknown finish/);
});

test('HIGH castors select only admitted ST61POLBL whole constructions and other bases fall back safely',()=>{
 const high=reviewRegistry.entries.find(e=>e.code==='KSEG003WW001')! as ChairReviewEntry;
 const id='HIGH_NONE_ST61POLBL_ESHH60',menu=chairConstructionMenus(high,id)!;
 assert.equal(menu.baseId,id);assert.equal(menu.armId,'HIGH_NONE');
 assert.deepEqual(menu.castors,[{id:'HIGH_NONE_ST61POLBL',label:'ESH60'},{id,label:'ESHH60'}]);
 assert.deepEqual(menu.bases,[{id:'HIGH_NONE',label:'TS34BL'},{id:'HIGH_NONE_TS25',label:'TS25'},{id,label:'ST61POLBL'}]);
 for(const base of menu.bases){const bound=chairReviewRoute(high,base.id,'default').construction.construction!;assert.equal(bound.structuralValues.CCASTORS,base.label==='ST61POLBL'?'ESHH60':'ESH60');}
 assert.deepEqual(chairConstructionMenus(high,'HIGH_NONE_TS25')!.castors,[{id:'HIGH_NONE_TS25',label:'ESH60'}]);
 assert.deepEqual(chairConstructionMenus(high,'default')!.castors,[{id:'default',label:'ESH60'}]);
 assert.notEqual(constructionPins.HIGH_NONE_ST61POLBL_ESHH60.route.runtimeSha256,constructionPins.HIGH_NONE_ST61POLBL.route.runtimeSha256);
 assert.notEqual(constructionPins.HIGH_NONE_ST61POLBL_ESHH60.route.baselineAssetSha256,constructionPins.MEDIUM_NONE_ST61POLBL.route.baselineAssetSha256);
 assert.throws(()=>chairReviewRoute(high,id,'PRICE_4'),/Unknown finish/);
});

test('HIGH GLR is scoped to NONE ST61POLBL ESHH60 and parent choices resolve only complete sources',()=>{
 const high=reviewRegistry.entries.find(e=>e.code==='KSEG003WW001')! as ChairReviewEntry,id='HIGH_NONE_ST61POLBL_ESHH60_GLR';
 const menu=chairConstructionMenus(high,id)!;
 assert.equal(menu.baseId,id);assert.equal(menu.castorId,id);
 assert.deepEqual(menu.gaslifts,[{id:'HIGH_NONE_ST61POLBL_ESHH60',label:'GLSTD'},{id,label:'GLR'}]);
 assert.deepEqual(menu.castors,[{id:'HIGH_NONE_ST61POLBL',label:'ESH60'},{id,label:'ESHH60'}]);
 for(const candidate of [...menu.bases,...menu.castors]){const binding=chairReviewRoute(high,candidate.id,'default').construction.construction!;assert.equal(binding.structuralValues.CGASLIFT,candidate.id===id?'GLR':'GLSTD');}
 for(const other of ['default','HIGH_NONE','HIGH_NONE_TS25','HIGH_NONE_ST61POLBL'])assert.equal(chairConstructionMenus(high,other)!.gaslifts.length,1);
 const pin=constructionPins.HIGH_NONE_ST61POLBL_ESHH60_GLR.route;
 assert.equal(pin.fixedSelectableStructuralFields.CGASLIFT.fixedValue,'GLR');assert.equal(pin.fixedSelectableStructuralFields.CCASTORS.fixedValue,'ESHH60');
 assert.notEqual(pin.runtimeSha256,constructionPins.HIGH_NONE_ST61POLBL_ESHH60.route.runtimeSha256);
 assert.throws(()=>chairReviewRoute(high,id,'PRICE_4'),/Unknown finish/);
});

test('HIGH FST is only a full NONE ST61POLBL ESHH60 GLR record with its own geometry',()=>{
 const high=reviewRegistry.entries.find(e=>e.code==='KSEG003WW001')! as ChairReviewEntry,id='HIGH_NONE_ST61POLBL_ESHH60_GLR_FST';
 const menu=chairConstructionMenus(high,id)!;
 assert.equal(menu.baseId,id);assert.equal(menu.castorId,id);assert.equal(menu.gasliftId,id);
 assert.deepEqual(menu.mechanisms,[{id:'HIGH_NONE_ST61POLBL_ESHH60_GLR',label:'TAT7'},{id,label:'FST'}]);
 for(const other of ['default','HIGH_NONE','HIGH_NONE_TS25','HIGH_NONE_ST61POLBL','HIGH_NONE_ST61POLBL_ESHH60'])assert.equal(chairConstructionMenus(high,other)!.mechanisms.length,1);
 for(const candidate of [...menu.bases,...menu.castors,...menu.gaslifts]){const binding=chairReviewRoute(high,candidate.id,'default').construction.construction!;assert.equal(binding.structuralValues.CMECHANISM,candidate.id===id?'FST':'TAT7');}
 const pin=constructionPins.HIGH_NONE_ST61POLBL_ESHH60_GLR_FST.route;
 assert.equal(pin.fixedSelectableStructuralFields.CMECHANISM.fixedValue,'FST');
 assert.notEqual(pin.runtimeSha256,constructionPins.HIGH_NONE_ST61POLBL_ESHH60_GLR.route.runtimeSha256);
 assert.notEqual(pin.baselineAssetSha256,constructionPins.HIGH_NONE_ST61POLBL_ESHH60_GLR.route.baselineAssetSha256);
 assert.throws(()=>chairReviewRoute(high,id,'PRICE_4'),/Unknown finish/);
});
