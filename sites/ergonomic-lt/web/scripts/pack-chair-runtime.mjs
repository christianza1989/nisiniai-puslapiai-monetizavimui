import assert from 'node:assert/strict';

// Literal runtimes already supply destination defaults. Remove only redundant
// non-finish assignments, retaining every actual change and every finish value.
export function packChairRuntime(original){
 assert.equal(original.family.collectionMode,'structure-only');
 const runtime=structuredClone(original),anchors=new Map(runtime.family.anchors.map(a=>[a.id,a]));let removed=0;
 for(const a of runtime.family.anchors){
  assert.equal(a.components.length,0);assert.equal(a.profiles.length,0);
  for(const [control,changes] of Object.entries(a.axisValueChanges||{})){
   const target=anchors.get(a.axisTransitions[control]);assert(target,'Unknown measured target');
   assert.deepEqual(changes,target.defaults,'Packing requires the full original destination assignment map');
   for(const [field,value] of Object.entries(changes))if(!a.classes[field]?.endsWith('_FINISHES')&&value===a.defaults[field]&&value===target.defaults[field]){delete changes[field];removed++;}
  }
 }
 return {runtime,removedUnchangedNonFinishAssignments:removed};
}

export function restorePackedAssignments(packed){
 const runtime=structuredClone(packed),anchors=new Map(runtime.family.anchors.map(a=>[a.id,a]));
 for(const a of runtime.family.anchors)for(const [control,changes] of Object.entries(a.axisValueChanges||{})){
  const target=anchors.get(a.axisTransitions[control]);assert(target);
  for(const [field,value] of Object.entries(target.defaults))if(!Object.hasOwn(changes,field)){
   assert(!a.classes[field]?.endsWith('_FINISHES')&&value===a.defaults[field],'A changed or finish assignment was lost');changes[field]=value;
  }
 }
 return runtime;
}
