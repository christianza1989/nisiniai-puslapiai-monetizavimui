import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parts} from './configurator-geometry.mjs';
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);
const short=k=>k.split('.').at(-1);
const values=s=>Object.fromEntries(Object.entries(s.properties).filter(([k])=>/_OPTIONS\.|_FINISHES\./.test(k)).map(([k,p])=>[short(k),p.value]));
const lists=s=>Object.fromEntries(Object.entries(s.choices).filter(([k])=>s.properties[k]?.visible&&s.properties[k]?.editable).map(([k,list])=>[short(k),list.filter(v=>v.selectable).map(v=>v.value)]));
const context=s=>Object.fromEntries(Object.entries(s.properties).filter(([k,p])=>short(k)==='CPRICEGROUP'||/_FINISHES\./.test(k)&&short(k).endsWith('GROUP')&&p.visible&&p.editable).map(([k,p])=>[short(k),p.value]));
async function evidence(dir){try{return await read(path.join(dir,'native-finish-probes/manifest.json'));}catch(e){if(e.code==='ENOENT')return;throw e;}}
function changedParts(before,after){
 const old=new Map(before.map(p=>[p.id,p]));assert.equal(old.size,before.length,'Native part IDs are unique');
 assert.deepEqual(after.map(p=>p.id).sort(),[...old.keys()].sort(),'A finish probe preserves every native surface');
 return after.filter(p=>old.get(p.id).material!==p.material).map(p=>p.id);
}
export async function nativeFinishEvidence(dir,base,capture,baseParts,load){
 const manifest=await evidence(dir);if(!manifest)return {roleOverrides:{},materialStates:[],proofs:[]};
 assert.equal(manifest.schemaVersion,1);assert.equal(manifest.code,base.baseArticle);
 const roleOverrides={},materialStates=[],proofs=[];
 for(const record of manifest.records){
  const folder=path.join(dir,'native-finish-probes'),body=short(record.bodyField),target=record.target;
  let reference,changed,ids;
  if(target==='CHEADRESTUPHCHCOLOR'){
   try{reference=await read(path.join(folder,record.digest+'-head-role-base.json'));changed=await read(path.join(folder,record.digest+'-head-role-changed.json'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
   const a=values(reference),b=values(changed),differences=Object.keys(a).filter(k=>a[k]!==b[k]);
   assert.deepEqual(differences,[target],'The independent headrest probe changes only the measured headrest colour');
   ids=changedParts(parts(await load(reference,dir)),parts(await load(changed,dir)));
  }else if(target==='CARMPADSUPHCOLOR'){
   try{reference=await read(path.join(folder,record.digest+'-arm-role-base.json'));changed=await read(path.join(folder,record.digest+'-arm-role-body-changed.json'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
   const a=values(reference),b=values(changed);assert.equal(a[target],b[target],'Native independent arm upholstery stays fixed');assert.notEqual(a[body],b[body]);
   const defaultProbe=await read(path.join(dir,capture.roles[record.bodyField]));
   assert.equal(values(base)[target],values(base)[body]);assert.equal(values(defaultProbe)[target],values(defaultProbe)[body]);assert.notEqual(values(base)[body],values(defaultProbe)[body]);
   const originalChanges=changedParts(baseParts,parts(await load(defaultProbe,dir)));
   const independentChanges=new Set(changedParts(parts(await load(reference,dir)),parts(await load(changed,dir))));
   ids=originalChanges.filter(id=>!independentChanges.has(id));
   const before=new Map(parts(await load(reference,dir)).map(p=>[p.id,p.material])),after=new Map(parts(await load(changed,dir)).map(p=>[p.id,p.material]));
   for(const id of ids){assert(before.has(id)&&after.has(id),'The isolated arm surface exists in both independent material probes');assert.equal(before.get(id),after.get(id),'Arm material remains unchanged when only the body changes');}
  }else throw Error('Unreviewed native finish target '+target);
  assert(ids.length>0,'Measured finish probe must identify actual native surfaces');
  for(const id of ids){assert(baseParts.some(p=>p.id===id),'Measured finish surface exists in the original base');if(roleOverrides[id])assert.equal(roleOverrides[id],target);roleOverrides[id]=target;}
  materialStates.push(reference,changed);proofs.push({context:record.digest,target,parts:ids});
 }
 assert(proofs.length>0,'Native finish evidence has no measured role proof');
 return {roleOverrides,materialStates,proofs};
}
export async function nativeFinishProfiles(anchor,dir){
 const manifest=await evidence(dir);if(!manifest)return anchor;
 anchor.profiles=anchor.profiles.filter(r=>!['native-finish-context-visibility','native-finish-context-mirror'].includes(r.derived));
 for(const record of manifest.records){
  const baseline=await read(path.join(dir,record.file)),probe=await read(path.join(dir,'native-finish-probes',record.digest+'-body-colour.json'));
  const target=record.target,body=short(record.bodyField),a=values(baseline),b=values(probe),when=context(baseline);
  assert.deepEqual(context(probe),when,'Body colour probe preserves its measured group context');
  const before=lists(baseline)[target],after=lists(probe)[target];
  if(JSON.stringify(before)!==JSON.stringify(after)){
   assert(before?.[0]===a[body]&&after?.[0]===b[body],'Measured linked lists begin with their respective body colour');
   const fixed=before.slice(1);assert.deepEqual(after.slice(1),fixed,'Fixed native alternatives remain identical');
   const singleton=await read(path.join(dir,'native-finish-probes',record.digest+'-body-black.json'));
   const singleValues=values(singleton),singleDomain=[...new Set([singleValues[body],...fixed])];
   assert.equal(singleDomain.length,1);assert(!lists(singleton)[target]);assert.equal(singleValues[target],singleDomain[0]);
   anchor.profiles.push({when,defaults:{[target]:a[target]},choices:{},hidden:[],choiceLinks:{[target]:{source:body,fixed,hideSingle:true}},mirrors:{[target]:body},derived:'native-finish-context-visibility'});
  }else anchor.profiles.push({when,defaults:{[target]:a[target]},choices:before?{[target]:before}:{},hidden:before?[]:[target],derived:'native-finish-context-visibility'});
  if(!before&&a[target]===a[body]&&b[target]===b[body]&&a[body]!==b[body])anchor.profiles.push({when,defaults:{},choices:{},hidden:[],mirrors:{[target]:body},derived:'native-finish-context-mirror'});
 }
 return anchor;
}
