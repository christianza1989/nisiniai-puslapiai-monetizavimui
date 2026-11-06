import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chairReviewRoute,validateChairConstructionBinding,type ChairReviewEntry,type ChairConstructionBinding} from '../src/lib/chair-review-routing';
import type {ChairPreview} from '../src/lib/chair-preview';

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
