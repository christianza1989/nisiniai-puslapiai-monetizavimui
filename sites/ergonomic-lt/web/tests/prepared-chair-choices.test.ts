import test from'node:test';import assert from'node:assert/strict';
import{initialPreparedChair,preparedChairAssembly,preparedChairChoices,preparedChairValues}from'../src/lib/prepared-chair-choices';
import type{ChairPreview}from'../src/lib/chair-preview';
const sha='a'.repeat(64),part={file:'assets/'+sha+'.glb',componentSha256:sha,sha256:sha,bytes:100,needsCompression:false},source={schema:'pc2-chair-review-111-v1',code:'KTEST001WW001',runtimeSha256:'b'.repeat(64),runtime:{contexts:['NONE','ARMS'].map(value=>({dimensions:{CARMRESTS:value},groups:[],invariant:part,textOnly:{}}))},assets:{[sha]:{asset:'/models/configurator/components/KTEST001WW001-'+sha.slice(0,20)+'.glb',assetSha256:sha,bytes:100}},palette:{schema:'chair-base-observed-colours-v1',code:'KTEST001WW001',runtimeSha256:'b'.repeat(64),baselineObservedFinish:{CUPHCOLOR:{value:'CSE01',knownCurrentPrefixChoices:['CSE01','CSE02']}},availableMaterialBindings:[]},selectors:{schema:'canonical-world-primitive-selectors-329-v1',assets:{}},textures:{}}as unknown as ChairPreview;
test('only real whole construction tuples are offered; unbound finish lists never become fabricated swatches',()=>{
 const s=initialPreparedChair(source),rows=preparedChairChoices(source,s);assert.equal(rows.length,1);assert.equal(rows[0].key,'construction');assert.equal(rows[0].options.length,2);assert.equal(preparedChairValues(source,rows[0].options[1].selection).CARMRESTS,'ARMS');assert.equal(preparedChairValues(source,s).CUPHCOLOR,'CSE01');
 assert.throws(()=>preparedChairAssembly(source,{...s,context:99}));assert.throws(()=>preparedChairAssembly(source,{...s,observed:'invented-colour'}));assert.throws(()=>preparedChairAssembly(source,{...s,variants:[1]}));assert.deepEqual(source.runtime.contexts[0].dimensions,{CARMRESTS:'NONE'});
});
test('the selected whole-finish caption follows an independent upholstery change',()=>{
 const d=structuredClone(source),patch={bindings:[],remove:[],assets:[]};
 d.qualified={schema:'chair-qualified-review-v1',code:d.code,runtimeSha256:d.runtimeSha256,version:'test',materials:{},extraAssets:{},opaqueAssets:[],legacyScopes:[],witnesses:[{id:'w',label:'Source',context:0,construction:{CARMRESTS:'NONE'},variants:[],requiredAssets:[sha],fixed:{},singles:[],branches:[],groups:[{id:'seat',label:'Seat',base:'one',options:[{id:'one',label:'One',values:{CUPHCOLOR:'CSE01'},patch},{id:'two',label:'Two',values:{CUPHCOLOR:'CSE02'},patch}]}]}]};
 const s={...initialPreparedChair(d),qualified:{witness:'w',kind:'groups' as const,groups:{seat:'two'}}};
 const row=preparedChairChoices(d,s).find(r=>r.key==='finish-state')!,current=row.options.find(o=>o.key===row.current)!;
 assert.equal(current.values.CUPHCOLOR,'CSE02');assert.deepEqual(current.selection,s);
});
