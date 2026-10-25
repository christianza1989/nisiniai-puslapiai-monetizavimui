import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {baseSeed} from '../src/lib/catalog';
import {productModels} from '../src/lib/product-models';
import {publicProductView} from '../src/lib/public-product-copy';
import {createChairCandidateLoader,candidateForModel,type ChairCandidates} from '../src/lib/chair-structure-candidates';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import ExpandedProductDetail from '../src/components/expanded-product-detail';
import {QuoteProvider} from '../src/components/quote-provider';
import type {CatalogRuntime} from '../src/lib/catalog-configurator';
import {blockers,transition,release,type Workflow} from '../src/lib/publication-workflow';

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const product=productModels(baseSeed().products).find(p=>p.categorySlug==='kedes'&&!p.id.includes('xilium')&&p.configurations.find(c=>c.id===p.modelConfigurationId)?.code)!;
 const sample=product.configurations.find(c=>c.id===product.modelConfigurationId)!,code=sample.code!;
 const runtime:CatalogRuntime={family:{id:'cfg-123456789abc',kind:'catalog',productId:product.id,baseArticle:code,sample:sample.id,collectionMode:'structure-only',articles:[{code,sample:sample.id,name:code}],anchors:[{id:code+':structure-'+'c'.repeat(64),article:code,sample:sample.id,name:code,axes:[],defaults:{},choices:{},classes:{},geometry:{asset:'/models/configurator/structure/'+code+'-'+'a'.repeat(20)+'.glb',assetSha256:'a'.repeat(64),bytes:0},components:[],profiles:[]}]},palettes:{}};
 const bytes=JSON.stringify(runtime),sha=hash(bytes),key=product.id+':'+sample.id;
 const entries:ChairCandidates={schemaVersion:1,models:{[key]:{key,productId:product.id,sample:sample.id,code,familyId:runtime.family.id,collectionMode:'structure-only',acceptance:'DRAFT_READY',optionsRequired:false,runtime:{asset:'/models/configurator/structure/'+code+'-'+sha.slice(0,20)+'.json',sha256:sha},proofs:{sourceGeometryRuntime:hash('TEST SOURCE'),optionsGemini:hash('TEST OPTIONS'),generalGemini:hash('TEST TEXT'),factualReview:hash('TEST REVIEW'),desktop:hash('TEST DESKTOP'),mobile:hash('TEST MOBILE')}}}};
 return {product,sample,runtime,bytes,entries,key};
}
test('only a complete exact active model manifest binds a construction-only runtime',async()=>{
 const {product,entries,bytes,key}=fixture();let reads=0;
 const loader=createChairCandidateLoader(entries,async()=>{reads++;return Buffer.from(bytes);});
 assert(await loader(product));assert.equal(reads,1);
 const incomplete=structuredClone(entries);delete (incomplete.models[key].proofs as any).mobile;
 assert.throws(()=>candidateForModel(product,incomplete),/acceptance missing/);
 const wrong=structuredClone(entries);wrong.models[key].sample='FORGED';
 assert.throws(()=>candidateForModel(product,wrong),/identity mismatch/);
 const xilium=productModels(baseSeed().products).find(p=>p.id.includes('xilium'))!;
 assert.equal(await loader(xilium),undefined);assert.equal(reads,1);
});

test('chair runtime accepts the exact 15 MB boundary and rejects 15000001 bytes with an otherwise valid binding',async()=>{
 const {product,entries,bytes,key}=fixture();
 for(const size of [8_000_001,15_000_000,15_000_001]){
  const padded=bytes+' '.repeat(size-Buffer.byteLength(bytes)),copy=structuredClone(entries),sha=hash(padded);
  copy.models[key].runtime={asset:'/models/configurator/structure/'+copy.models[key].code+'-'+sha.slice(0,20)+'.json',sha256:sha};
  const loader=createChairCandidateLoader(copy,async()=>Buffer.from(padded));
  if(size<=15_000_000)assert(await loader(product));
  else await assert.rejects(loader(product),/runtime changed/);
 }
});
test('desk construction drafts retain exact model identity and the launch exclusion',async()=>{
 const desk=productModels(baseSeed().products).find(p=>p.configurations.some(c=>c.code==='KERG020WW001')&&p.modelConfigurationId==='25302337')!;
 assert(desk);
 const {runtime}=fixture(),sample=desk.configurations.find(c=>c.id===desk.modelConfigurationId)!;
 runtime.family.productId=desk.id;runtime.family.sample=sample.id;runtime.family.baseArticle=sample.code!;
 runtime.family.articles=[{code:sample.code!,sample:sample.id,name:sample.code!}];
 const a=runtime.family.anchors[0];a.id=sample.code+':structure-'+'c'.repeat(64);a.article=sample.code!;a.sample=sample.id;
 a.axes=['GDWIDTH'];a.defaults={GDWIDTH:'_2000'};a.choices={GDWIDTH:['_1800','_2000']};a.classes={GDWIDTH:'DESK_DIMENSIONS'};
 assert(a.geometry);a.geometry.asset='/models/configurator/structure/'+sample.code+'-'+'a'.repeat(20)+'.glb';
 const bytes=JSON.stringify(runtime),sha=hash(bytes),key=desk.id+':'+sample.id;
 const entries:ChairCandidates={schemaVersion:1,models:{[key]:{key,productId:desk.id,sample:sample.id,code:sample.code!,familyId:runtime.family.id,collectionMode:'structure-only',acceptance:'TECHNICAL_DRAFT',optionsRequired:true,runtime:{asset:'/models/configurator/structure/'+sample.code+'-'+sha.slice(0,20)+'.json',sha256:sha},proofs:{sourceGeometryRuntime:hash('TEST DESK SOURCE')}}}};
 const loader=createChairCandidateLoader(entries,async()=>Buffer.from(bytes));
 assert(await loader(desk));
 const html=renderToStaticMarkup(<QuoteProvider><ExpandedProductDetail product={publicProductView(desk)} url="/test-only/" presets={null} catalogRuntime={runtime}/></QuoteProvider>);
 assert(!html.includes('kėdę')&&!html.includes('kėdės')&&!html.includes('Kėdės'));
 assert(html.includes('Jūsų komplektacija'));
 assert.equal(await loader({...desk,modelConfigurationId:'25302338'}),undefined);
 assert.equal(await loader({...desk,categorySlug:'nepatikrinta'}),undefined);
 const prior=process.env.LAUNCH_SITE;try{process.env.LAUNCH_SITE='true';assert.equal(await loader(desk),undefined);}finally{if(prior===undefined)delete process.env.LAUNCH_SITE;else process.env.LAUNCH_SITE=prior;}
});
test('tampered bytes, finish selectors and cross-model saved tokens fail closed',async()=>{
 const {product,entries,bytes,key,runtime}=fixture();
 await assert.rejects(createChairCandidateLoader(entries,async()=>Buffer.from(bytes+' '))(product),/runtime changed/);
 const modified=structuredClone(runtime);modified.family.anchors[0].axes=['CCOLOR'];modified.family.anchors[0].choices={CCOLOR:['A','B']};modified.family.anchors[0].classes={CCOLOR:'TEST_FINISHES'};
 const encoded=JSON.stringify(modified),sha=hash(encoded),manifest=structuredClone(entries);
 manifest.models[key].optionsRequired=true;
 manifest.models[key].runtime={asset:'/models/configurator/structure/'+manifest.models[key].code+'-'+sha.slice(0,20)+'.json',sha256:sha};
 await assert.rejects(createChairCandidateLoader(manifest,async()=>Buffer.from(encoded))(product),/finish controls/);
 let reads=0;assert.equal(await createChairCandidateLoader(entries,async()=>{reads++;return Buffer.from(bytes);})(product,{family:'cfg-ffffffffffff'}),undefined);assert.equal(reads,0);
 const sameFamilyLegacy={family:runtime.family.id,anchor:runtime.family.baseArticle+':legacy-preset'};
 assert.equal(await createChairCandidateLoader(entries,async()=>{reads++;return Buffer.from(bytes);})(product,sameFamilyLegacy),undefined);assert.equal(reads,0);
 const parent={...product,modelConfigurationId:undefined};
 const loader=createChairCandidateLoader(entries,async()=>Buffer.from(bytes));
 assert.equal((await loader(parent,{family:runtime.family.id}))?.family.sample,product.modelConfigurationId);
 assert.equal((await loader(parent,{family:runtime.family.id,anchor:runtime.family.anchors[0].id}))?.family.sample,product.modelConfigurationId);
 assert.equal(await loader(parent),undefined);
});

test('technical drafts load on draft only and cannot be reviewed, approved or released',async()=>{
 const {product,entries,bytes,key}=fixture();const entry=entries.models[key];
 entry.acceptance='TECHNICAL_DRAFT';entry.proofs={sourceGeometryRuntime:entry.proofs.sourceGeometryRuntime};
 const loader=createChairCandidateLoader(entries,async()=>Buffer.from(bytes));assert(await loader(product));
 const previous=process.env.LAUNCH_SITE;
 try{process.env.LAUNCH_SITE='true';assert.equal(await loader(product),undefined);}finally{if(previous===undefined)delete process.env.LAUNCH_SITE;else process.env.LAUNCH_SITE=previous;}
 const row={key,revisionHash:'a'.repeat(64),name:'TEST technical draft',active:true,sourceReady:true,geometryAccepted:true,optionsReady:true,geminiReady:true,image:'/TEST.jpg',paragraphs:['TEST'],technicalDraft:true} as any;
 assert(blockers(row).some(b=>b.includes('Techninis draft')));
 const models=new Map([[key,row]]),empty=():Workflow=>({version:1,models:{},released:{},releaseId:null});
 assert.throws(()=>transition(empty(),key,row.revisionHash,'review',{desktop:true,mobile:true},'TEST',models),/Techninis draft/);
 assert.throws(()=>transition(empty(),key,row.revisionHash,'approve',{},'TEST',models),/Techninis draft/);
 const forged=empty();forged.models[key]={revisionHash:row.revisionHash,approval:{actor:'TEST',at:'TEST'}};
 assert.throws(()=>release(forged,models),/priėmimas paseno/);
});
test('fixed construction-only presentation retains request/PDF and explains the fixed finish',()=>{
 const {product,runtime}=fixture();
 const html=renderToStaticMarkup(<QuoteProvider><ExpandedProductDetail product={publicProductView(product)} url="/test-only/" presets={null} catalogRuntime={runtime}/></QuoteProvider>);
 const {document}=parseHTML(html);
 assert(html.includes('Rodoma šio varianto apdaila. Dėl kitų spalvų teiraukitės.'));
 assert.equal(document.querySelectorAll('select').length,0);
 assert.equal(document.querySelectorAll('a.product-pdf').length,1);
 assert(html.includes('Pridėti prie užklausos'));
 assert(!html.includes('Gamintojas nepateikia pasirinktos apdailos vaizdo'));
 const engine=createExpandedEngine(runtime),initial=engine.initialStateForProduct(product);
 assert.deepEqual(engine.parseStateToken(product,engine.stateToken(initial)),initial);
});
