import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parts} from './configurator-geometry.mjs';
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);
const short=k=>k.split('.').at(-1);
const values=s=>Object.fromEntries(Object.entries(s.properties).filter(([k])=>/_OPTIONS\.|_FINISHES\./.test(k)).map(([k,p])=>[short(k),p.value]));
const context=s=>Object.fromEntries(Object.entries(s.properties).filter(([k,p])=>short(k)==='CPRICEGROUP'||/_FINISHES\./.test(k)&&short(k).endsWith('GROUP')&&p.visible&&p.editable).map(([k,p])=>[short(k),p.value]));
const lists=s=>Object.fromEntries(Object.entries(s.choices).filter(([k])=>s.properties[k]?.visible&&s.properties[k]?.editable).map(([k,v])=>[short(k),v.filter(x=>x.selectable).map(x=>x.value)]));
async function evidence(dir){try{return await read(path.join(dir,'linked-finish-probes/manifest.json'));}catch(e){if(e.code==='ENOENT')return;throw e;}}
function changed(before,after){
 const old=new Map(before.map(p=>[p.id,p]));assert.deepEqual(after.map(p=>p.id).sort(),[...old.keys()].sort(),'Colour probes preserve every native surface');
 return after.filter(p=>old.get(p.id).material!==p.material).map(p=>p.id);
}
export async function sailFinishEvidence(dir,base,capture,baseParts,load){
 const m=await evidence(dir);if(!m)return {roleOverrides:{},materialStates:[],proofs:[]};
 assert.equal(m.code,'KSAI008WW002');assert.equal(m.errors.length,0);assert.equal(m.records.length,37);
 const bodyField=m.code+'_FINISHES.CUPHBACKRESTCOLOR',headField=m.code+'_FINISHES.CHEADRESTUPHCOLOR';
 const before=capture.roleBase?await read(path.join(dir,capture.roleBase)):base;
 const body=await read(path.join(dir,capture.roles[bodyField])),head=await read(path.join(dir,capture.roles[headField]));
 const a=values(before),b=values(body),h=values(head);
 assert.equal(a.CUPHBACKRESTCOLOR,a.CHEADRESTUPHCOLOR);
 assert.notEqual(b.CUPHBACKRESTCOLOR,a.CUPHBACKRESTCOLOR);assert.equal(b.CHEADRESTUPHCOLOR,a.CHEADRESTUPHCOLOR,'Independent backrest probe preserves the headrest');
 assert.equal(h.CUPHBACKRESTCOLOR,h.CHEADRESTUPHCOLOR);assert.notEqual(h.CHEADRESTUPHCOLOR,a.CHEADRESTUPHCOLOR);
 const initial=parts(await load(before,dir)),backIds=changed(initial,parts(await load(body,dir))),combined=changed(initial,parts(await load(head,dir)));
 assert(backIds.length>0&&backIds.every(id=>combined.includes(id)),'The linked probe includes the independently measured backrest surfaces');
 const headIds=combined.filter(id=>!backIds.includes(id));assert(headIds.length>0,'The source separates actual headrest surfaces');
 const roleOverrides={};for(const [ids,field] of [[backIds,'CUPHBACKRESTCOLOR'],[headIds,'CHEADRESTUPHCOLOR']])for(const id of ids){assert(baseParts.some(p=>p.id===id));roleOverrides[id]=field;}
 return {roleOverrides,materialStates:[body,head],proofs:[{headParts:headIds,backrestParts:backIds,sourceSnapshotsChanged:false}]};
}
export async function sailFinishProfiles(anchor,dir){
 const m=await evidence(dir);if(!m)return anchor;
 assert.equal(m.code,anchor.article);assert.equal(m.errors.length,0);assert.equal(m.records.length,37);
 anchor.profiles=anchor.profiles.filter(r=>r.derived!=='sail-native-linked-finishes');
 const seen=new Set();
 for(const record of m.records){
  assert.equal(record.result,'PASS');const a=await read(path.join(dir,record.file)),b=await read(path.join(dir,record.probe));
  assert.deepEqual(context(a),record.when);assert.deepEqual(context(b),record.when);
  const body=short(record.bodyField),head=short(record.headField),va=values(a),vb=values(b);
  assert.notEqual(va[head],vb[head]);
  if(record.mode==='static'){
   assert.deepEqual(lists(a)[body],record.staticDomain);assert.deepEqual(lists(b)[body],record.staticDomain);
  }else{
   assert.equal(record.mode,'linked');assert.deepEqual(lists(a)[body],[...new Set([va[head],...record.fixed])]);assert.deepEqual(lists(b)[body],[...new Set([vb[head],...record.fixed])]);
  }
  const key=JSON.stringify(Object.entries(record.when).sort());assert(!seen.has(key));seen.add(key);
  anchor.profiles.push({when:record.when,defaults:{},choices:record.mode==='static'?{[body]:record.staticDomain}:{},hidden:[],...(record.mode==='linked'?{choiceLinks:{[body]:{source:head,fixed:record.fixed}}}:{}),derived:'sail-native-linked-finishes'});
 }
 return anchor;
}
