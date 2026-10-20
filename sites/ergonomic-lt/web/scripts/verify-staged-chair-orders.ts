// Uses an isolated local SQLite database and disables email delivery. Never
// submits an inquiry to the supplier, public site or customer's production DB.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {visibleProductsAsync,productPath} from '../src/lib/catalog';
import {modelProduct,modelName} from '../src/lib/product-models';
import {createExpandedEngine,choiceLabel} from '../src/lib/expanded-configurator';
import {articleChoiceLabel} from '../src/lib/configuration-article';
import {publicProductView} from '../src/lib/public-product-copy';
import {expandedQuoteEntry} from '../src/lib/expanded-quote-entry';
import {validQuoteEntry} from '../src/lib/quote-entry';
import {expandedProductCardPath} from '../src/lib/expanded-product-card-path';
import {createCatalogRuntimeLoader,type CatalogRuntimeIndex} from '../src/lib/catalog-runtime-loader';
import {storeQuote} from '../src/lib/quotes';
import {getDb} from '../src/lib/db';
import {GET} from '../src/app/api/produkto-kortele/route';

const root=path.resolve('../research/configurator/all-chairs-20261014');
const stage=path.resolve(process.argv.find(a=>a.startsWith('--stage='))?.slice(8)||path.join(root,'stage-integrated-current'));
assert(stage.startsWith(root+path.sep),'Unknown candidate root');
const index=JSON.parse(await fs.readFile(path.join(stage,'configurator-additional-index.json'),'utf8')) as CatalogRuntimeIndex;
assert.deepEqual(JSON.parse(await fs.readFile('content/configurator-additional-index.json','utf8')),index,'Activate this candidate locally before exercising the real server routes');
process.env.RUNTIME_DIR=await fs.mkdtemp(path.join(root,'isolated-order-qa-'));
process.env.PREVIEW_CATALOG='true';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
const load=createCatalogRuntimeLoader(index,async asset=>new Uint8Array(await fs.readFile(path.join('public',asset))));
const products=await visibleProductsAsync();
const reports=[],pdfGroups=new Set<string>();let pdfs=0;
try{
 for(const [id,binding] of Object.entries(index.products)){
  const parent=products.find(p=>p.id===id)!;assert(parent);
  for(const article of binding.articles){
   const configuration=parent.configurations.find(c=>c.id===article.sample&&c.code===article.code)!;assert(configuration);
   const model=modelProduct(parent,configuration),runtime=await load(model);assert(runtime);
   const engine=createExpandedEngine(runtime),initial=engine.initialStateForProduct(model);
   const choices=engine.stateChoices(initial),field=Object.keys(choices).find(k=>choices[k].some(v=>v!==initial.values[k]));
   const states=[initial,...(field?[engine.changeField(initial,field,choices[field].find(v=>v!==initial.values[field])!)]:[])];
   for(const [stateIndex,state] of states.entries()){
    const selection=engine.expandedSelection(model,state);
    // Exercise the actual production cart builder for untouched and edited
    // states, then compare persisted options with independent source evidence.
    const cart=expandedQuoteEntry(publicProductView(model),selection.configuration,state,{url:productPath(model),model:configuration,customized:stateIndex>0,quantity:2,choiceLabel:(k,v)=>articleChoiceLabel(model,k,v)||choiceLabel(k,v,runtime.palettes,state.family)});
    assert(validQuoteEntry(cart),article.sample+' valid production cart entry');
    assert.deepEqual(cart.configurationState,state,article.sample+' displayed state retained before first edit');
    const saved=await storeQuote({name:'[PATIKRA] Vietinė užklausa',email:article.sample+'-'+stateIndex+'@example.invalid',phone:'',company:'',message:'Konfigūratoriaus patikra izoliuotoje vietinėje duomenų bazėje.',consent:true,website:'',startedAt:Date.now()-5000,submissionKey:randomUUID(),items:[cart]});
    const row=getDb().prepare('SELECT payload,delivery_status FROM quotes WHERE id=?').get(saved.id) as {payload:string;delivery_status:string};
    const item=JSON.parse(row.payload).items[0];
    assert.equal(item.configurationId,article.sample);assert.equal(item.baseArticle,article.code);
    // Reviewed conditional articles may have a more precise public model name.
    // The server resolves that same article; supplier identity and codes below
    // remain independently checked against the original catalog record.
    const expectedName=engine.selectionArticle(model,state)?model.name:modelName(parent,configuration);
    assert.equal(item.productName,expectedName);
    assert.deepEqual(item.supplierOptions,selection.configuration.supplierOptions);
    assert.deepEqual(item.configurationDetails,selection.configuration.details);
    assert.equal(item.brand,parent.brand);assert.equal(item.sourceUrl,parent.sourceUrl);assert.equal(item.supplierProductId,parent.id);
    assert.equal(item.configurationEvidence.base.assetSha256,selection.assets.base.assetSha256);
    assert.notEqual(row.delivery_status,'sent');
    // One actual server PDF for each product group plus the wooden-arm model.
    if((!pdfGroups.has(parent.id)&&stateIndex===0)||article.code==='KBEW001WW008'&&stateIndex===1){
     const card=expandedProductCardPath(model,engine.stateToken(state),!!engine.selectionArticle(model,state));
     assert(card.includes('&konfig=')&&!card.includes('&komplektacija='),article.code+' actual displayed-state PDF path');
     const response=await GET(new Request('http://127.0.0.1'+card));
     assert.equal(response.status,200,article.code+' canonical PDF');
     const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.subarray(0,5).equals(Buffer.from('%PDF-')));
     await fs.writeFile(path.join(process.env.RUNTIME_DIR!,article.sample+'-'+stateIndex+'.pdf'),bytes);pdfs++;if(stateIndex===0)pdfGroups.add(parent.id);
    }
   }
   reports.push({product:id,sample:article.sample,article:article.code,states:states.length,supplierIdentity:'PASS',sampleName:'PASS',codes:'PASS'});
  }
 }
 const receipt={models:reports.length,states:reports.reduce((n,r)=>n+r.states,0),pdfs,database:process.env.RUNTIME_DIR,reports,result:'PASS',delivery:'disabled; isolated local QA only'};
 await fs.writeFile(path.join(stage,'server-orders-and-pdfs.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({models:receipt.models,states:receipt.states,pdfs,result:'PASS'}));
}finally{getDb().close();}
