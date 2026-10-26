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

test('source DTOP dimension names retain captured pairs, geometry and token fields',()=>{
 const s=source();
 s.contexts=s.contexts.map(c=>({...c,dimensions:{DTOPWIDTH:c.dimensions.GDWIDTH,DTOPDEPTH:c.dimensions.GDDEPTH}}));
 const adapted=adaptDeskComponents(s,id),e=createExpandedEngine(adapted);let state=e.initialStateForProduct(product);
 assert.equal(adapted.palettes._fieldLabels.DTOPWIDTH.text,'Stalviršio plotis');
 assert.equal(adapted.palettes._fieldLabels.DTOPDEPTH.text,'Stalviršio gylis');
 assert.deepEqual(e.stateChoices(state).DTOPDEPTH,['_800']);
 assert.throws(()=>e.changeField(state,'DTOPDEPTH','_1000'));
 state=e.changeField(state,'DTOPWIDTH','_1800');state=e.changeField(state,'DTOPDEPTH','_1000');
 assert.throws(()=>e.changeField(state,'DTOPWIDTH','_1600'));
 assert(e.expandedSelection(product,state).configuration.supplierOptions?.includes('DTOPWIDTH=_1800'));
 assert.deepEqual(e.parseStateToken(product,e.stateToken(state)),state);
 assert.equal(e.assembledAssets(state).base?.assetSha256,'a'.repeat(64));
 const unknown=structuredClone(s);unknown.contexts[0].dimensions={OTHERWIDTH:'_1600',DTOPDEPTH:'_800'};
 assert.throws(()=>validateDeskComponents(unknown,code));
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

test('constant source parts remain assembled without invented controls or empty domains',()=>{
 const s=source();s.contexts[0].groups.push({fields:[],variants:[{values:{},asset:part('f')}]});s.contexts[0].textOnly.FPANEL=[];
 const e=createExpandedEngine(adaptDeskComponents(s,id)),state=e.initialStateForProduct(product);
 assert(!Object.hasOwn(e.stateChoices(state),'FPANEL'));
 assert.equal(e.assembledAssets(state).patches.at(-1)?.geometry?.assetSha256,'f'.repeat(64));
 const invalid=structuredClone(s);invalid.contexts[0].groups.at(-1)!.variants.push({values:{},asset:null});assert.throws(()=>validateDeskComponents(invalid,code));
});

test('explicit unavailable source dimension retains text specification and never substitutes geometry',()=>{
 const missingCode='KEM2013WW009',s=source();s.code=missingCode;
 s.contexts=s.contexts.slice(0,2).map((c,i)=>({...c,dimensions:{DDEPTH:'_900X800',DWIDTH:i?'_2000':'_1600'}}));
 s.dimensionChoices=[{DDEPTH:'_900X800',DWIDTH:'_1600'},{DDEPTH:'_900X800',DWIDTH:'_1800'},{DDEPTH:'_900X800',DWIDTH:'_2000'}];s.textOnlyDimensionChoices=[{DDEPTH:'_900X800',DWIDTH:'_1800'}];s.missing3D=['1800×900X800'];s.unavailable3DMessage='3D peržiūra šiam dydžiui neprieinama';
 const p={...product,configurations:[{id:sample,code:missingCode}]} as Product;
 const e=createExpandedEngine(adaptDeskComponents(s,{...id,code:missingCode}));let state=e.initialStateForProduct(p);
 state=e.changeField(state,'DWIDTH','_1800');assert.equal(e.catalog.catalogAnchor(state)?.unavailable3D,s.unavailable3DMessage);
 const selected=e.expandedSelection(p,state);assert.equal(selected.assets.base,null);assert.deepEqual(selected.assets.patches,[]);assert(selected.configuration.supplierOptions?.includes('DWIDTH=_1800'));
 assert.deepEqual(e.parseStateToken(p,e.stateToken(state)),state);
 state=e.changeField(state,'DWIDTH','_2000');assert(e.assembledAssets(state).base);
 const invented=structuredClone(s);invented.textOnlyDimensionChoices=[{DDEPTH:'_900X800',DWIDTH:'_1900'}];assert.throws(()=>validateDeskComponents(invented,missingCode));
});

test('hybrid text-only scene retains the supplied 3D defaults instead of the first domain value',()=>{
 const s=source();s.contexts=[{...s.contexts[0],groups:[],hybrid141:true,textOnly:{FMEDIAPORTMIDDLE:['NONE','EVOLINECIRCLE801M'],FSOCKETSTANDARD:[]},default3DValues:{FMEDIAPORTMIDDLE:'EVOLINECIRCLE801M',FSOCKETSTANDARD:null}}];
 const e=createExpandedEngine(adaptDeskComponents(s,id));let state=e.initialStateForProduct(product);
 assert.equal(state.values.FMEDIAPORTMIDDLE,'EVOLINECIRCLE801M');assert(!Object.hasOwn(state.values,'FSOCKETSTANDARD'));
 const original=e.assembledAssets(state);assert.equal(original.patches.length,0);
 assert.deepEqual(e.catalog.catalogAnchor(state)?.textOnlyFields,['FMEDIAPORTMIDDLE']);
 state=e.changeField(state,'FMEDIAPORTMIDDLE','NONE');assert.deepEqual(e.assembledAssets(state),original);
 assert(e.expandedSelection(product,state).configuration.supplierOptions?.includes('FMEDIAPORTMIDDLE=NONE'));
 assert.deepEqual(e.parseStateToken(product,e.stateToken(state)),state);
 for(const mutate of [(x:DeskComponents)=>{x.contexts[0].default3DValues!.FMEDIAPORTMIDDLE='INVENTED';},(x:DeskComponents)=>{x.contexts[0].default3DValues!.FMEDIAPORTMIDDLE=null;},(x:DeskComponents)=>{x.contexts[0].default3DValues!.FSOCKETSTANDARD='';},(x:DeskComponents)=>{x.contexts[0].default3DValues!.UNKNOWN='NONE';},(x:DeskComponents)=>{delete x.contexts[0].hybrid141;}]){
  const invalid=structuredClone(s);mutate(invalid);assert.throws(()=>validateDeskComponents(invalid,code));
 }
});
test('captured read-only defaults with empty choice lists retain source identity without an invented control',()=>{
 const s=source();s.contexts[0].textOnly={FDESKTOPTYPE:[]};s.contexts[0].default3DValues={FDESKTOPTYPE:'FIXEDTOP'};
 validateDeskComponents(s,code);const runtime=adaptDeskComponents(s,id),engine=createExpandedEngine(runtime);
 const state=engine.initialStateForProduct(product);
 assert.equal(engine.stateChoices(state).FDESKTOPTYPE,undefined);
 assert.equal(engine.catalog.catalogValues(state).FDESKTOPTYPE,'FIXEDTOP');
 assert.throws(()=>engine.changeField(state,'FDESKTOPTYPE','OTHER'));
 assert(engine.expandedSelection(product,state).configuration.supplierOptions?.includes('FDESKTOPTYPE=FIXEDTOP'));
 assert.deepEqual(engine.parseStateToken(product,engine.stateToken(state)),state);
 assert.equal(runtime.family.anchors[0].geometry?.assetSha256,s.contexts[0].invariant.sha256);
});
