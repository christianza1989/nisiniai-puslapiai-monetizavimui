import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {adaptDeskComponents,validateDeskComponents,type DeskAsset,type DeskComponents} from '../src/lib/desk-components';
import {createDeskComponentLoader,type DeskCandidates} from '../src/lib/desk-component-candidates';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import type {Product} from '../src/lib/types';

const code='KEM2013WW004',sample='23846535',productId='product_emodel-2-0-desks_f22f1a81';
const id={code,sample,productId,familyId:'cfg-123456789abc'};
const part=(n:string):DeskAsset=>({file:'assets/'+n.repeat(64)+'.glb',sha256:n.repeat(64),componentSha256:n.repeat(64),bytes:100,needsCompression:false});
const product={id:productId,categorySlug:'rasomieji-stalai-ir-darbo-vietos',modelConfigurationId:sample,configurations:[{id:sample,code}],name:'eModel 2.0'} as Product;
function source():DeskComponents{return {schema:'desk-components-065-v1',code,coordinates:'original-world-matrices',finishPolicy:'original manufacturer finishes; no FINISH setters',fullGraphClosed:false,contexts:[['_1600','_800'],['_1800','_800'],['_1800','_1000']].map(([w,d])=>({dimensions:{GDWIDTH:w,GDDEPTH:d},choiceRules:'conditional selectable tuples only',invariant:part('a'),textOnly:{FSOCKETSTANDARD:['EU','GB','CH']},groups:[{fields:['FBASEFEET','FCASTORS'],variants:[{values:{FBASEFEET:'FEET',FCASTORS:'NONE'},asset:part('b')},{values:{FBASEFEET:'CASTORBASE',FCASTORS:'NONE'},asset:part('c')},{values:{FBASEFEET:'CASTORBASE',FCASTORS:'WHEELS'},asset:part('d')}]},{fields:['FCABLECOVER'],variants:[{values:{FCABLECOVER:'NONE'},asset:null},{values:{FCABLECOVER:'COVER'},asset:part('e')}]}]}))};}
const engine=()=>createExpandedEngine(adaptDeskComponents(source(),id));

test('conditional tuple domains never offer an unlisted field combination',()=>{
 const e=engine();let s=e.initialStateForProduct(product);
 assert.deepEqual(e.stateChoices(s).FCASTORS,['NONE']);
 assert.throws(()=>e.changeField(s,'FCASTORS','WHEELS'));
 s=e.changeField(s,'FBASEFEET','CASTORBASE');
 assert.deepEqual(e.stateChoices(s).FCASTORS,['NONE','WHEELS']);
 s=e.changeField(s,'FCASTORS','WHEELS');
 assert.deepEqual(e.stateChoices(s).FBASEFEET,['CASTORBASE']);
 assert.throws(()=>e.changeField(s,'FBASEFEET','FEET'));
 const invalid={...s,values:{...s.values,FBASEFEET:'FEET'}};
 assert.throws(()=>e.validateState(product,invalid));
});
test('dimension choices preserve only the captured width/depth pairs',()=>{
 const e=engine();let s=e.initialStateForProduct(product);
 assert.deepEqual(e.stateChoices(s).GDDEPTH,['_800']);
 assert.throws(()=>e.changeField(s,'GDDEPTH','_1000'));
 s=e.changeField(s,'GDWIDTH','_1800');s=e.changeField(s,'GDDEPTH','_1000');
 assert.equal(s.values.GDWIDTH,'_1800');assert.deepEqual(e.stateChoices(s).GDWIDTH,['_1800']);
 assert.throws(()=>e.changeField(s,'GDWIDTH','_1600'));
});
test('NONE removes the part and text-only socket changes no geometry',()=>{
 const e=engine();let s=e.initialStateForProduct(product);const before=e.assembledAssets(s);
 assert.equal(before.patches[1].geometry,null);
 s=e.changeField(s,'FSOCKETSTANDARD','CH');assert.deepEqual(e.assembledAssets(s),before);
 const selected=e.expandedSelection(product,s);
 assert(selected.configuration.supplierOptions?.includes('FSOCKETSTANDARD=CH'));
 assert(selected.configuration.supplierOptions?.every(v=>!v.startsWith('.')&&!v.includes('_OPTIONS.')));
 const token=e.stateToken(s);assert.deepEqual(e.parseStateToken(product,token),s);
 s=e.changeField(s,'FCABLECOVER','COVER');assert(e.assembledAssets(s).patches[1].geometry);
 s=e.changeField(s,'FCABLECOVER','NONE');assert.equal(e.assembledAssets(s).patches[1].geometry,null);
 s=e.changeField(s,'GDWIDTH','_1800');assert.equal(s.values.FSOCKETSTANDARD,'CH');assert.equal(s.values.FCABLECOVER,'NONE');
 assert.equal(e.catalog.catalogFamily(s)?.collectionMode,'desk-components');
});
test('reject invalid table semantics, duplicate contexts/tuples and external assets',()=>{
 for(const mutate of [
  (s:any)=>{s.fullGraphClosed=true;},(s:any)=>{s.coordinates='recentered';},
  (s:any)=>{s.contexts.push(s.contexts[0]);},(s:any)=>{s.contexts[0].groups[0].variants.push(s.contexts[0].groups[0].variants[0]);},
  (s:any)=>{s.contexts[0].invariant.file='https://external.test/model.glb';},
  (s:any)=>{s.contexts[0].groups[0].fields.push('FSOCKETSTANDARD');},
  (s:any)=>{s.contexts[0].textOnly.FINISHCOLOR=['BLACK'];},
 ]){const s=source();mutate(s);assert.throws(()=>validateDeskComponents(s,code));}
});
test('actual candidate loader verifies bytes/model and excludes Launch',async()=>{
 const bytes=Buffer.from(JSON.stringify(source())),sha=createHash('sha256').update(bytes).digest('hex'),key=productId+':'+sample;
 const data:DeskCandidates={schemaVersion:1,models:{[key]:{...id,key,collectionMode:'desk-components',acceptance:'TECHNICAL_DRAFT',optionsRequired:true,runtime:{asset:'/models/configurator/components/'+code+'-'+sha.slice(0,20)+'.json',sha256:sha},proofs:{sourceGeometryRuntime:'f'.repeat(64)}}}};
 const load=createDeskComponentLoader(data,async()=>bytes);assert((await load(product))?.family.collectionMode==='desk-components');
 assert.equal(await load(product,JSON.stringify(['cfg-000000000000','wrong',[]])),undefined);
 const parent={...product,modelConfigurationId:undefined};assert.equal((await load(parent,[id.familyId,'ignored',[]]))?.family.sample,sample);
 await assert.rejects(createDeskComponentLoader(data,async()=>Buffer.from('{}'))(product),/source changed/);
 const prior=process.env.LAUNCH_SITE;try{process.env.LAUNCH_SITE='true';assert.equal(await load(product),undefined);}finally{if(prior===undefined)delete process.env.LAUNCH_SITE;else process.env.LAUNCH_SITE=prior;}
});
