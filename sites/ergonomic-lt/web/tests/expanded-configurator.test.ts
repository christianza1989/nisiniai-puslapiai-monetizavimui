import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {catalog} from '../src/lib/catalog';
import {families as allFamilies,initialState,stateChoices,changeField,validateState,stateToken,parseStateToken,assembledAssets,expandedSelection,fieldLabels} from '../src/lib/expanded-configurator';
import {storeQuote} from '../src/lib/quotes';
import {getDb} from '../src/lib/db';
import {GET} from '../src/app/api/produkto-kortele/route';
import {modelProduct} from '../src/lib/product-models';
const folder=fs.mkdtempSync(path.join(tmpdir(),'ergonomic-expanded-'));process.env.RUNTIME_DIR=folder;process.env.PREVIEW_CATALOG='true';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
after(()=>{getDb().close();fs.rmSync(folder,{recursive:true,force:true});});
const product=(id:string)=>catalog().products.find(p=>p.id===id)!;
const families=allFamilies.filter(f=>!f.kind);

test('Konkretaus Xilium ir Souly modelio komplektacija nepakeičiama linijos pavyzdžio ID',()=>{
 for(const family of families){
  const parent=product(family.productId);
  const samples=parent.configurations.filter(c=>c.code===family.baseArticle);
  assert(samples.length>1,'Regression requires multiple models of the same article');
  for(const sample of samples){
   const model=modelProduct(parent,sample);
   const selection=expandedSelection(model,initialState(family));
   assert.equal(selection.configuration.id,sample.id);
   assert.equal(selection.configuration.code,sample.code);
   assert.equal(selection.configuration.image,'/media/configurator/'+sample.id+'.jpg');
  }
 }
});
test('Išplėstas etapas lieka su dviem prekėmis, 8 konstrukcijomis ir originaliais pasirinkimais',async()=>{
 assert.equal(families.length,2);assert.equal(families.reduce((n,f)=>n+f.anchors.length,0),8);
 for(const f of families)for(const a of f.anchors){const s=validateState(product(f.productId),{family:f.id,anchor:a.id,values:Object.fromEntries(Object.keys(a.choices).map(k=>[k,a.defaults[k]]))});
  assert(Object.keys(stateChoices(s)).length>=14);for(const field of Object.keys(stateChoices(s)))assert(fieldLabels[field],'LT field missing: '+field);
  for(const [field,list] of Object.entries(a.choices))if(a.classes[field]?.endsWith('_OPTIONS')&&!field.startsWith('CPLASTIC')&&field!=='CHEADREST')for(const v of list)if(v!==a.defaults[field])assert(a.patches[field+'='+v]);
 }
 const x=families[0],s=initialState(x);assert.equal(Object.keys(stateChoices(s)).length,18);assert.equal(stateChoices(s).CUPHSEATCOLOR.length,72);
 for(const a of families.find(f=>f.id==='souly')!.anchors)for(const m of a.choices.CMECHANISM)for(const arm of a.choices.CARMRESTS)if(m!==a.defaults.CMECHANISM&&arm!=='NONE')assert(a.conditionalPatches[m+'|'+arm],'Missing actual arm mounting');
});
test('Medžiagų grupės, galvos atrama ir konstrukcijos spalva atnaujina leistinus pasirinkimus',async()=>{
 for(const f of families){let state=initialState(f);const p=product(f.productId);const initialKeys=Object.keys(stateChoices(state));state=changeField(state,'CHEADREST','NONE');assert(Object.keys(stateChoices(state)).length<=initialKeys.length);assert.doesNotThrow(()=>validateState(p,state));
  let seed=417;for(let i=0;i<300;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const choices=stateChoices(state),field=Object.keys(choices)[seed%Object.keys(choices).length],list=choices[field];state=changeField(state,field,list[(seed>>>8)%list.length]);assert.deepEqual(validateState(p,state),state);assert.deepEqual(parseStateToken(p,stateToken(state)),state);}
 }
});
test('Suklastoti, svetimo modelio ir tarpusavyje nesuderinami kodai atmetami',async()=>{
 const f=families[0],p=product(f.productId),s=initialState(f);
 for(const values of [{...s.values,CBASE:'FAKE'},{...s.values,FAKE:'value'},{...s.values,CPLASTICCOLORVERSION2:'BLACKEDITION'},{...s.values,CUPHSEATCOLOR:'NAPPAFAKE'}])assert.throws(()=>validateState(p,{...s,values}));
 assert.throws(()=>validateState(product(families[1].productId),s));assert.throws(()=>parseStateToken(p,'["xilium","bad",[]]'));
});
test('Fiksuotas apmušalas nekeičiamas ankstesnės kainų grupės sąrašu',async()=>{
 for(const f of families)for(const a of f.anchors){
  let s=initialState(f);s=changeField(s,f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION',a.defaults[f.id==='xilium'?'CPLASTICCOLORVERSION2':'CPLASTICCOLORVERSION']);s=changeField(s,'CHEADREST',a.defaults.CHEADREST);
  for(const price of a.choices.CPRICEGROUP){const next=changeField(s,'CPRICEGROUP',price),captured=a.profiles.find(p=>p.defaults.CPRICEGROUP===price)!;
   for(const key of Object.keys(stateChoices(next)).filter(k=>k.endsWith('GROUP')&&k!=='CPRICEGROUP'))if(!captured.choices[key]&&captured.defaults[key]){
    assert.deepEqual(stateChoices(next)[key],[captured.defaults[key]]);assert.equal(next.values[key],captured.defaults[key]);
   }
  }
 }
 const s=changeField(initialState(families[0]),'CPRICEGROUP','_6');assert.equal(s.values.CBACKRESTUPHGROUP,'NAPPA');assert(s.values.CUPHBACKRESTCOLOR.startsWith('NAP'));
 assert.throws(()=>validateState(product(families[0].productId),{...s,values:{...s.values,CBACKRESTUPHGROUP:'VL'}}));
});
test('Souly sėdynės šoniniai profiliai turi tik gamintojo priimamas kainų ir audinių grupes',async()=>{
 const f=families.find(f=>f.id==='souly')!;
 for(const a of f.anchors)for(const seat of ['UPHCPLASTICSPROFILES','UPHSIDEPROFILESSP']){
  let s=initialState(f);s=changeField(s,'CPLASTICCOLORVERSION',a.defaults.CPLASTICCOLORVERSION);s=changeField(s,'CHEADREST',a.defaults.CHEADREST);s=changeField(s,'CSEAT',seat);
  assert.deepEqual(stateChoices(s).CPRICEGROUP,['_2','_3','_5']);assert.throws(()=>changeField(s,'CPRICEGROUP','_1'));assert.throws(()=>changeField(s,'CPRICEGROUP','_4'));
  for(const price of ['_2','_3','_5']){const next=changeField(s,'CPRICEGROUP',price),source=a.profiles.find(p=>p.defaults.CSEAT===seat&&p.defaults.CPRICEGROUP===price)!;
   assert.deepEqual(stateChoices(next).CUPHGROUP,source.choices.CUPHGROUP||[source.defaults.CUPHGROUP]);
   assert(source.choices.CUPHCOLOR.includes(next.values.CUPHCOLOR));assert(source.choices.CUPHSIDECOLORSEAT.includes(next.values.CUPHSIDECOLORSEAT));
   assert.doesNotThrow(()=>validateState(product(f.productId),next));
   const selected=expandedSelection(product(f.productId),next);for(const [key,value] of Object.entries(next.values))assert(selected.configuration.supplierOptions?.some(v=>v.endsWith('.'+key+'='+(key==='CPRICEGROUP'?value.replace(/^_/,''):value))),'Missing supplier code: '+key);
  }
 }
});
test('Kiekviena vietinė 3D detalė yra baigtinė, indeksai galioja, SHA256 sutampa',async()=>{
 await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});const assets=new Map();
 for(const f of families)for(const a of f.anchors){assets.set(a.geometry.asset,a.geometry);for(const patch of [...Object.values(a.patches),...Object.values(a.conditionalPatches)])if(patch.geometry)assets.set(patch.geometry.asset,patch.geometry);}
 for(const asset of assets.values()){const bytes=fs.readFileSync(path.join('public',asset.asset));assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.assetSha256);assert(bytes.length<8_000_000);
  const d=await io.readBinary(bytes);assert(d.getRoot().listMeshes().length>0);for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives()){const pos=p.getAttribute('POSITION')!;assert(pos.getCount()>0);assert([...pos.getArray()!].every(Number.isFinite));assert([...p.getIndices()!.getArray()!].every(i=>i<pos.getCount()));}
 }
});
test('Nepriklausomi pasirinkimai užklausoje lieka atskiri ir turi tikslią specifikaciją',async()=>{
 const f=families[0],p=product(f.productId);let s=initialState(f);s=changeField(s,'CARMRESTS',stateChoices(s).CARMRESTS.at(-1)!);
 const choice=expandedSelection(p,s),base={name:'[PATIKRA] individuali',email:'expanded@example.invalid',phone:'',company:'',message:'Patikra',consent:true,website:'',startedAt:Date.now()-5000,submissionKey:randomUUID(),items:[{productId:p.id,configurationId:f.sample,configurationState:s,quantity:2,note:''}]};
 const saved=await storeQuote(base),row=getDb().prepare('SELECT payload FROM quotes WHERE id=?').get(saved.id) as {payload:string};const item=JSON.parse(row.payload).items[0];assert.deepEqual(item.supplierOptions,choice.configuration.supplierOptions);assert.deepEqual(item.configurationState,s);assert.equal(item.configurationEvidence.kind,'public-export-independent-parts');assert(item.supplierOptions.includes(f.baseArticle+'_OPTIONS.CARMRESTS='+s.values.CARMRESTS));
 await assert.rejects(()=>storeQuote({...base,submissionKey:randomUUID(),items:[{...base.items[0],configurationState:{...s,values:{...s.values,CBASE:'FAKE'}}}]}));
});
test('Individualus lietuviškas PDF bei neleistinos komplektacijos HTTP patikra',async()=>{
 for(const f of families){const p=product(f.productId),s=initialState(f);const response=await GET(new Request('http://127.0.0.1/api/produkto-kortele/?produktas='+p.id+'&konfig='+encodeURIComponent(stateToken(s))));assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');assert(Buffer.from(await response.arrayBuffer()).subarray(0,5).equals(Buffer.from('%PDF-')));}
 const p=product(families[0].productId);assert.equal((await GET(new Request('http://127.0.0.1/api/produkto-kortele/?produktas='+p.id+'&konfig=bad'))).status,400);
});
