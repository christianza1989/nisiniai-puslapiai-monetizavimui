import{test}from'node:test';import assert from'node:assert/strict';
import registry from'../content/pc2-chair-review-candidates.json';
import{resolveSeglaVisual,type SeglaVisualSupplement}from'../src/lib/segla-visual-routing';
test('24 observed visible pairs retain their code and exact arm/base pair, never a Cartesian product',()=>{
 let pairs=0,mappings=0,newDefaults=0,exact=0;
 for(const e of registry.entries){if(!e.visualSupplement)continue;const s=e.visualSupplement as SeglaVisualSupplement;
  pairs+=s.representatives.length;newDefaults+=s.representatives.filter(r=>r.sourceKind==='ACTUAL_OWN_DEFAULT_SOURCE_WITNESS').length;
  for(const m of s.mappings){const r=resolveSeglaVisual(s,e.code,m.visualId,m.id);assert.equal(r.representative.options.CARMRESTS,m.options.CARMRESTS);assert.equal(r.representative.options.CBASE,m.options.CBASE);mappings++;if(r.exactRoute){exact++;assert.equal(r.mode,'EXACT_QUALIFIED_ROUTE');}}
  assert.throws(()=>resolveSeglaVisual(s,e.code,'UNKNOWN','UNKNOWN'),/UNRESOLVED/);
  assert.throws(()=>resolveSeglaVisual(s,'KSEG999WW001',s.representatives[0].id,s.mappings[0].id),/UNRESOLVED/);
 }
 assert.equal(pairs,24);assert.equal(mappings,54);assert.equal(newDefaults,11);assert(exact>0);
});
test('a functional approximation keeps requested metadata and receives no borrowed finish route',()=>{
 const e=registry.entries.find(e=>e.code==='KSEG001WW001')!;const s=e.visualSupplement as SeglaVisualSupplement;
 const m=s.mappings.find(m=>m.mode==='NEAREST_VISUAL_MODEL_DIRECT_ROKO'&&!m.exactRoute)!;const r=resolveSeglaVisual(s,e.code,m.visualId,m.id);
 assert.equal(r.mode,'NEAREST_VISUAL_MODEL_DIRECT_ROKO');assert.equal(r.exactRoute,undefined);assert.deepEqual(r.mapping.options,m.options);assert.deepEqual(r.mapping.dimensions,m.dimensions);
});
test('unknown pairing cannot use a mapping from a different visible model',()=>{
 const e=registry.entries.find(e=>e.code==='KSEG002WW001')!;const s=e.visualSupplement as SeglaVisualSupplement;
 const a=s.mappings[0],b=s.representatives.find(r=>r.id!==a.visualId)!;
 assert.throws(()=>resolveSeglaVisual(s,e.code,b.id,a.id),/UNRESOLVED/);
});
