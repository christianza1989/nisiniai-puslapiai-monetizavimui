import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptChairComponents,validateChairComponents,type ChairComponents} from '../src/lib/chair-components';
import {validateDeskComponents} from '../src/lib/desk-components';
const part={file:'assets/'+ 'a'.repeat(64)+'.glb',componentSha256:'a'.repeat(64),sha256:'b'.repeat(64),bytes:1024,needsCompression:false as const};
const id={code:'KTEST001',sample:'1234',familyId:'cfg-0123456789ab',productId:'product_test'};
function fixture():ChairComponents{return {schema:'desk-components-065-v1',code:id.code,coordinates:'original-world-matrices',finishPolicy:'original manufacturer finishes; no FINISH setters',fullGraphClosed:false,contexts:[{dimensions:{DSEATWIDTH:'_480',CPLASTICCOLORVERSION:'BLACKEDITION'},choiceRules:'conditional selectable tuples only',invariant:{...part},groups:[],textOnly:{},default3DValues:{},hybrid141:true}]};}
test('a chair invariant-only source preserves original bytes and invents no controls',()=>{
 const f=fixture(),before=structuredClone(f);const out=adaptChairComponents(f,id);
 assert.equal(out.family.anchors[0].geometry?.assetSha256,part.sha256);assert.equal(out.family.anchors[0].components.length,0);assert.deepEqual(f,before);
 assert.deepEqual(out.family.anchors[0].choices.CPLASTICCOLORVERSION,['BLACKEDITION']);
 assert.throws(()=>validateDeskComponents(f,id.code),'original desk contract stays strict');
});
test('an empty captured static context is valid only with original invariant geometry',()=>{
 const f=fixture();f.contexts[0].dimensions={};assert.doesNotThrow(()=>validateChairComponents(f,id.code));
 f.contexts[0].invariant=null;assert.throws(()=>validateChairComponents(f,id.code));
});
test('only captured context pairs are offered, including literal ranges',()=>{
 const f=fixture();f.contexts[0].dimensions={DSEATHEIGHT:'_420T540',CPLASTICCOLORVERSION:'BLACKEDITION'};
 f.contexts.push({...structuredClone(f.contexts[0]),dimensions:{DSEATHEIGHT:'_660',CPLASTICCOLORVERSION:'LIGHTGREY'}});
 const a=adaptChairComponents(f,id).family.anchors[0];assert.deepEqual(a.choices.DSEATHEIGHT,['_420T540']);assert.deepEqual(a.choices.CPLASTICCOLORVERSION,['BLACKEDITION']);
});
test('coupled component tuples retain only conditional choices and original null absence',()=>{
 const f=fixture();f.contexts[0].groups=[{fields:['CHEADREST','CSEAT'],variants:[{values:{CHEADREST:'NONE',CSEAT:'UPH'},asset:null},{values:{CHEADREST:'HR',CSEAT:'MESH'},asset:part}]}];
 const c=adaptChairComponents(f,id).family.anchors[0].components[0];assert.deepEqual(c.variants[0].choices.CHEADREST,['NONE']);assert.equal(c.variants[0].patch.geometry,null);assert.equal(c.variants[1].patch.geometry?.assetSha256,part.sha256);
});
test('conflicting asset identities, duplicate axes and over-limit assets are rejected',()=>{
 const f=fixture();f.contexts.push({...structuredClone(f.contexts[0]),dimensions:{DSEATWIDTH:'_500',CPLASTICCOLORVERSION:'BLACKEDITION'},invariant:{...part,sha256:'c'.repeat(64)}});assert.throws(()=>validateChairComponents(f,id.code));
 const g=fixture();g.contexts[0].invariant!.bytes=25*1024*1024+1;assert.throws(()=>validateChairComponents(g,id.code));
 const h=fixture();h.contexts.push(structuredClone(h.contexts[0]));assert.throws(()=>validateChairComponents(h,id.code));
});
