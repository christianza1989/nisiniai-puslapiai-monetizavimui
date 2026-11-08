import{test}from'node:test';import assert from'node:assert/strict';
import{chairFinishIntent,resolveChairFinishIntent}from'../src/lib/chair-finish-intent';
import{chairCompatibleFinishRoute,type ChairReviewEntry}from'../src/lib/chair-review-routing';
import type{ChairPreview}from'../src/lib/chair-preview';
const hash='a'.repeat(64),selector='b'.repeat(64),base='c'.repeat(64),next='d'.repeat(64);
function fixture(arm='R35K3SB2',asset=hash):ChairPreview{return{
 code:'KSEG002WW001',runtimeSha256:'e'.repeat(64),
 runtime:{contexts:[{dimensions:{CARMRESTS:arm,CBASE:'TS25'},invariant:{sha256:asset,bytes:123},groups:[],textOnly:{}}]},
 assets:{[asset]:{asset:'/own.glb',assetSha256:asset,bytes:123}},palette:{schema:'chair-base-observed-colours-v1',baselineObservedFinish:{},availableMaterialBindings:[]},
 selectors:{assets:{[asset]:{assetSha256:asset,slots:[{selectorId:selector,materialId:base}]}}},
 qualified:{code:'KSEG002WW001',runtimeSha256:'e'.repeat(64),materials:{[next]:{}},extraAssets:{},legacyScopes:[],witnesses:[{
 id:arm,context:0,construction:{CARMRESTS:arm,CBASE:'TS25'},variants:[],requiredAssets:[asset],groups:[],branches:[],singles:[{id:'target-'+arm,label:'CSE · CSE14',values:{CPRICEGROUP:'_1',CUPHGROUP:'CSE',CUPHCOLOR:'CSE14'},patch:{bindings:[{assetSha256:asset,selectorId:selector,baseMaterialId:base,materialId:next}],remove:[],assets:[]}}],
 }]},
}as unknown as ChairPreview;}
test('Segla finish intent survives a new construction through its own witness, never old binding IDs',()=>{
 const source=fixture(),intent=chairFinishIntent(source,{kind:'single',witness:'R35K3SB2',single:'target-R35K3SB2',groups:{}})!;
 assert.deepEqual(intent.values,{CPRICEGROUP:'_1',CUPHGROUP:'CSE',CUPHCOLOR:'CSE14'});assert(!JSON.stringify(intent).includes(hash));
 const target=fixture('NONE','f'.repeat(64));assert.deepEqual(resolveChairFinishIntent(target,intent,0,[]),{kind:'single',witness:'NONE',single:'target-NONE',groups:{}});
});
test('unsupported price, group, colour and foreign chair cannot borrow a selected finish',()=>{
 const d=fixture(),intent=chairFinishIntent(d,{kind:'single',witness:'R35K3SB2',single:'target-R35K3SB2',groups:{}})!;
 for(const field of ['CPRICEGROUP','CUPHGROUP','CUPHCOLOR']){const wrong=structuredClone(intent);wrong.values[field]='UNKNOWN';assert.equal(resolveChairFinishIntent(d,wrong,0,[]),undefined);}
 assert.equal(resolveChairFinishIntent(d,{...intent,code:'KSEG003WW001'},0,[]),undefined);
 assert.equal(resolveChairFinishIntent(d,{...intent,values:{CUPHCOLOR:'CSE14'}},0,[]),undefined);
});
test('exact construction, active asset and admitted selector guards remain mandatory for restoration',()=>{
 const source=fixture(),intent=chairFinishIntent(source,{kind:'single',witness:'R35K3SB2',single:'target-R35K3SB2',groups:{}})!;
 for(const change of [(d:ChairPreview)=>{d.qualified!.witnesses[0].construction.CBASE='OTHER';},(d:ChairPreview)=>{d.qualified!.witnesses[0].requiredAssets=['f'.repeat(64)];},(d:ChairPreview)=>{d.selectors.assets[hash].slots[0].materialId='wrong';}]){const d=fixture();change(d);assert.equal(resolveChairFinishIntent(d,intent,0,[]),undefined);}
});
test('only an explicit Segla whole-tuple selection is retained; original/unknown selection clears intent',()=>{
 const d=fixture();assert.equal(chairFinishIntent(d,undefined),undefined);assert.equal(chairFinishIntent(d,{kind:'single',witness:'missing',single:'unknown',groups:{}}),undefined);d.code='KOTHER';assert.equal(chairFinishIntent(d,{kind:'single',witness:'R35K3SB2',single:'target-R35K3SB2',groups:{}}),undefined);
});
test('construction routes retain a supported finish domain and fall back only when absent',()=>{
 const e={asset:'base',contexts:[{id:'PRICE_2'}],constructions:[{id:'NONE',contexts:[{id:'PRICE_2'}]},{id:'OTHER'}]}as unknown as ChairReviewEntry;
 assert.equal(chairCompatibleFinishRoute(e,'NONE','PRICE_2'),'PRICE_2');assert.equal(chairCompatibleFinishRoute(e,'OTHER','PRICE_2'),'default');assert.throws(()=>chairCompatibleFinishRoute(e,'UNKNOWN','PRICE_2'));
});
