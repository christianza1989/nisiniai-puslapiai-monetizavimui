import test from 'node:test';
import assert from 'node:assert/strict';
import {hasAssemblyGeometry,viewerBaseAsset} from '../src/lib/viewer-assembly';
import {adaptDeskComponents,type DeskComponents} from '../src/lib/desk-components';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import type {Product} from '../src/lib/types';
import type {Asset,Patch} from '../src/lib/expanded-configurator';

const legacy:Asset={asset:'/legacy.glb',assetSha256:'a'.repeat(64),bytes:100};
const patch=(geometry:Asset|null,geometries?:Asset[]):Patch=>({remove:[],addIds:[],changes:{},choices:{},geometry,geometries});
test('legacy full scenes and assemblies with an invariant retain their exact base',()=>{
 assert.equal(viewerBaseAsset(legacy),legacy);
 const assembly={base:legacy,patches:[]};
 assert(hasAssemblyGeometry(assembly));assert.equal(viewerBaseAsset(legacy,assembly),legacy);
});
test('an explicit empty assembly stays unavailable and never falls back to a legacy model',()=>{
 const assembly={base:null,patches:[patch(null)]};
 assert.equal(hasAssemblyGeometry(assembly),false);assert.equal(viewerBaseAsset(legacy,assembly),null);
});
test('plural measured parts are visible without an invariant; an explicit empty plural list remains empty',()=>{
 assert(hasAssemblyGeometry({base:null,patches:[patch(null,[legacy])]}));
 assert.equal(hasAssemblyGeometry({base:null,patches:[patch(legacy,[])]}),false);
});
test('a captured null-invariant desk reaches the viewer with only its selected original parts',()=>{
 const code='KERG023WW001',sample='22074435',productId='null-base-desk';
 const part=(n:string)=>({file:'assets/'+n.repeat(64)+'.glb',sha256:n.repeat(64),componentSha256:n.repeat(64),bytes:100,needsCompression:false});
 const source:DeskComponents={schema:'desk-components-065-v1',code,coordinates:'original-world-matrices',finishPolicy:'original manufacturer finishes; no FINISH setters',fullGraphClosed:false,contexts:[{dimensions:{GDWIDTH:'_2013',GDDEPTH:'_1975'},choiceRules:'conditional selectable tuples only',invariant:null,textOnly:{},groups:[{fields:['FVERSION'],variants:[{values:{FVERSION:'LEFT'},asset:part('b')},{values:{FVERSION:'RIGHT'},asset:part('c')}]}]}]};
 const product={id:productId,categorySlug:'rasomieji-stalai-ir-darbo-vietos',modelConfigurationId:sample,configurations:[{id:sample,code}],name:'Desk'} as Product;
 const engine=createExpandedEngine(adaptDeskComponents(source,{code,sample,productId,familyId:'cfg-123456789abc'}));
 let state=engine.initialStateForProduct(product);
 for(const sha of ['b','c']){
  if(sha==='c')state=engine.changeField(state,'FVERSION','RIGHT');
  const assembly=engine.expandedSelection(product,state).assets;
  assert.equal(assembly.base,null);assert(hasAssemblyGeometry(assembly));
  assert.equal(viewerBaseAsset(legacy,assembly),null);
  assert.equal(assembly.patches.length,1);assert.equal(assembly.patches[0].geometry?.assetSha256,sha.repeat(64));
 }
});
