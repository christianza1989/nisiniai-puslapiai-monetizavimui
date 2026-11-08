import{test}from'node:test';import assert from'node:assert/strict';
import pins from'../scripts/visual-own-four-exact-pins.json';import{admitVisualOwnFinishContexts}from'../scripts/admit-visual-own-finishes';
import{qualifiedChairPlan}from'../src/lib/chair-qualified-colors';import type{ChairPreview}from'../src/lib/chair-preview';
const sources=()=>structuredClone(pins)as unknown as Parameters<typeof admitVisualOwnFinishContexts>[0][];
test('all twelve saved complete tuples bind only their own visual geometry',()=>{
 let count=0;for(const p of sources())for(const w of admitVisualOwnFinishContexts(p)){
  const data={runtime:p.runtime,selectors:p.selectors,qualified:{witnesses:[w],materials:p.materials,extraAssets:{}}}as unknown as ChairPreview;
  for(const s of w.singles){const plan=qualifiedChairPlan(data,w.context,[],w.requiredAssets,{witness:w.id,kind:'single',single:s.id,groups:{}});assert.equal(plan.status,'observed-state');assert(plan.assignments.length>0);count++;}
 }assert.equal(count,12);
});
test('Arn without armrests and Naudu lower seat remain original-only; each retains its own geometry',()=>{const p=sources();assert.deepEqual(admitVisualOwnFinishContexts(p[3]).map(w=>w.context),[1]);assert.deepEqual(admitVisualOwnFinishContexts(p[1]).map(w=>w.context),[1]);assert.notEqual(p[1].runtime.contexts[0].invariant!.sha256,p[1].runtime.contexts[1].invariant!.sha256);});
test('Naudu ten-field and Arn eight-field tuples cannot lose linked fields',()=>{for(const i of[1,3]){const p=sources()[i];const v=p.profile.variants[0];delete v.exactAfterFinish[Object.keys(v.exactAfterFinish)[0]];assert.throws(()=>admitVisualOwnFinishContexts(p));}});
test('a selector valid for another context is still rejected',()=>{const p=sources()[1];p.profile.variants[0].contextIndex=1-p.profile.variants[0].contextIndex;assert.throws(()=>admitVisualOwnFinishContexts(p));});
test('no independent composition, unknown context, or altered dimensions',()=>{const p=sources()[0];p.profile.independentFinishCompositionAllowed=true;assert.throws(()=>admitVisualOwnFinishContexts(p));const q=sources()[0];q.profile.variants[0].contextIndex=9;assert.throws(()=>admitVisualOwnFinishContexts(q));const r=sources()[1];r.profile.variants[0].allFunctionalConstructionValues.DSEATHEIGHT='_999';assert.throws(()=>admitVisualOwnFinishContexts(r));});
