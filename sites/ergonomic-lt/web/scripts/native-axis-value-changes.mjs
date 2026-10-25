import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const short=key=>key.split('.').at(-1);
const values=state=>Object.fromEntries(Object.entries(state.properties).filter(([key])=>
 /_OPTIONS\.|_FINISHES\./.test(key)||key.includes('_DIMENSIONS.')&&(key.endsWith('.DFRAMEDIAMETER')||key in state.choices)
).map(([key,property])=>[short(key),property.value]));
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);

// Two independent upholstery price axes share a measured component, so a
// default-only constructor switch discards the untouched side's group.
// Opt in only to this captured schema. No geometry or rule is inferred.
export async function nativeAxisValueChanges(family,source){
 for(const anchor of family.anchors){
  if(anchor.axes.length<2||!anchor.axes.every(key=>/^CPRICEGROUP/.test(key)))continue;
  const name=anchor.id.slice(anchor.article.length+1);
  assert(/^[A-Za-z0-9_@-]+$/.test(name));
  const directory=path.join(source,anchor.article,name);
  const manifest=await read(path.join(directory,'manifest.json'));
  const baseline=await read(path.join(directory,manifest.base));
  assert.equal(baseline.baseArticle,anchor.article);
  const before=values(baseline),changes={};
  assert(Object.values(before).every(value=>typeof value==='string'),'Native axis baseline has explicit string values');
  for(const axis of anchor.axes)assert.equal(before[axis],anchor.defaults[axis],'Native baseline axes match the constructor');
  assert(manifest.axisTransitions,'Missing measured constructor transitions');
  for(const [selection,destination] of Object.entries(manifest.axisTransitions)){
   const separator=selection.indexOf('='),field=selection.slice(0,separator),value=selection.slice(separator+1);
   assert(anchor.axes.includes(field)&&/^[A-Za-z0-9_@=-]+$/.test(selection));
   const snapshot=before[field]===value?baseline:await read(path.join(directory,'axis-transitions',selection+'.json'));
   assert.equal(snapshot.baseArticle,anchor.article);
   const actual=values(snapshot);
   assert(Object.values(actual).every(value=>typeof value==='string'),'Native axis destination has explicit string values');
   assert.equal(actual[field],value,'Native axis setter retains its selected value');
   assert.deepEqual(Object.keys(actual).sort(),Object.keys(before).sort(),'Axis value delta requires the same measured property schema');
   const target=family.anchors.find(candidate=>candidate.id===anchor.article+':'+destination);
   assert(target&&anchor.axisTransitions?.[selection]===target.id,'Measured target constructor exists');
   for(const axis of target.axes)assert.equal(actual[axis],target.defaults[axis],'Measured target axes match');
   changes[selection]=Object.fromEntries(Object.entries(actual).filter(([key,next])=>before[key]!==next));
  }
  anchor.axisValueChanges=changes;
 }
 return family;
}
