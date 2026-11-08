import{test}from'node:test';import assert from'node:assert/strict';
import pin from'../scripts/klyn-visual-own-exact-pin.json';import{admitVisualOwnFinishes}from'../scripts/admit-visual-own-finishes';
import{qualifiedChairPlan}from'../src/lib/chair-qualified-colors';import type{ChairPreview}from'../src/lib/chair-preview';
const source=()=>structuredClone(pin)as unknown as Parameters<typeof admitVisualOwnFinishes>[0];
test('two exact complete finish tuples bind only the three saved own selectors',()=>{
 const p=source(),w=admitVisualOwnFinishes(p);assert.equal(w.singles.length,2);assert.equal(w.groups.length,0);assert.deepEqual(w.singles.map(s=>s.values.CUPHCOLOR),['V28','LE06']);assert(w.singles.every(s=>s.patch.bindings.length===3));
 const data={runtime:p.runtime,selectors:p.selectors,qualified:{witnesses:[w],materials:p.materials,extraAssets:{}}}as unknown as ChairPreview;
 for(const s of w.singles){const plan=qualifiedChairPlan(data,0,[],w.requiredAssets,{witness:w.id,kind:'single',single:s.id,groups:{}});assert.equal(plan.status,'observed-state');assert.equal(plan.assignments.length,3);}
});
test('component filename identity is not substituted for actual GLB byte SHA',()=>{const p=source();assert.notEqual(p.runtime.contexts[0].invariant!.componentSha256,p.runtime.contexts[0].invariant!.sha256);p.runtime.contexts[0].invariant!.sha256=p.runtime.contexts[0].invariant!.componentSha256;assert.throws(()=>admitVisualOwnFinishes(p));});
test('runtime mismatch or a different context is rejected',()=>{const p=source();p.profile.runtimeSha256='0'.repeat(64);assert.throws(()=>admitVisualOwnFinishes(p));const q=source();q.profile.variants[1].contextIndex=1;assert.throws(()=>admitVisualOwnFinishes(q));});
test('one changed functional construction field cannot inherit the saved finish',()=>{const p=source();p.profile.variants[1].allFunctionalConstructionValues.CARMRESTS='NONE';assert.throws(()=>admitVisualOwnFinishes(p));});
test('wrong own asset or unknown selector is rejected',()=>{const p=source();p.profile.variants[0].bindings[0].assetSha256='0'.repeat(64);assert.throws(()=>admitVisualOwnFinishes(p));const q=source();q.profile.variants[0].bindings[0].selectorId='0'.repeat(64);assert.throws(()=>admitVisualOwnFinishes(q));});
test('base material identity and available target material remain mandatory',()=>{const p=source();p.profile.variants[0].bindings[0].baseMaterialId='0'.repeat(64);assert.throws(()=>admitVisualOwnFinishes(p));const q=source();q.materials={};assert.throws(()=>admitVisualOwnFinishes(q));});
test('independent field selection or duplicated whole finish is not admitted',()=>{const p=source();delete p.profile.variants[0].exactAfterFinish.CUPHGROUP;assert.throws(()=>admitVisualOwnFinishes(p));const q=source();q.profile.variants[1].exactAfterFinish={...q.profile.variants[0].exactAfterFinish};assert.throws(()=>admitVisualOwnFinishes(q));});
