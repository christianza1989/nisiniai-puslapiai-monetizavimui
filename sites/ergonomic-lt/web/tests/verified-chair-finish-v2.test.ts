import assert from 'node:assert/strict';
import {test} from 'node:test';
import overlays from '../content/verified-chair-finish-v2.json';
import {verifiedChairFinishV2} from '../src/lib/verified-chair-finish-v2';
import {qualifiedChairPlan} from '../src/lib/chair-qualified-colors';
import type {ChairPreview} from '../src/lib/chair-preview';
const own=overlays.KXLI002WW002,w=own.qualified.witnesses[0];
function fixture(){
 const contexts=[];contexts[w.context]={dimensions:w.construction,groups:[{variants:[{values:{}}]}],invariant:{sha256:w.requiredAssets[0]}};
 return {code:'KXLI002WW002',runtimeSha256:own.currentRuntimeSha256,runtime:{contexts},palette:{schema:'chair-base-observed-colours-v1',baselineObservedFinish:Object.fromEntries(Object.entries(own.fullBeforeFinish).map(([k,value])=>[k,{value}]))},selectors:{assets:{}},textures:{},assets:{}} as unknown as ChairPreview;
}
test('exact own finish overlay rejects changed package, runtime and full initial finish',()=>{
 assert.throws(()=>verifiedChairFinishV2(fixture(),'0'.repeat(64)));
 const runtime=fixture();runtime.runtimeSha256='0'.repeat(64);assert.throws(()=>verifiedChairFinishV2(runtime,own.packageSha256));
 const before=fixture();if(before.palette.schema==='chair-base-observed-colours-v1')before.palette.baselineObservedFinish.CUPHSEATCOLOR.value='SM01';assert.throws(()=>verifiedChairFinishV2(before,own.packageSha256));
});
test('seven exact X-Line states bind own primitives and fail closed outside the measured construction/assets',()=>{
 const data=fixture();assert(verifiedChairFinishV2(data,own.packageSha256));
 for(const single of w.singles){const selection={witness:w.id,kind:'single' as const,single:single.id,groups:{}};
  const admitted=qualifiedChairPlan(data,w.context,w.variants,w.requiredAssets,selection);assert.equal(admitted.status,'observed-state');assert.deepEqual(admitted.assignments,single.patch.bindings);
  assert.equal(qualifiedChairPlan(data,0,w.variants,w.requiredAssets,selection).status,'unavailable');
  assert.equal(qualifiedChairPlan(data,w.context,w.variants,['0'.repeat(64)],selection).status,'unavailable');
 }
 assert.throws(()=>verifiedChairFinishV2(data,own.packageSha256));
});
