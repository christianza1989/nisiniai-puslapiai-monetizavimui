import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../content/armrest-presentation.json';
import {armrestChoiceLabel,armrestFieldLabel,presentArmrestConfiguration,safeArmrestFallback} from '../src/presentation/armrest-labels';
import type {Configuration} from '../src/lib/types';
import {expandedQuoteEntry} from '../src/lib/expanded-quote-entry';
import {choiceLabel} from '../src/lib/expanded-configurator';
import {correctedItemPresentation} from '../src/lib/quote-presentation';
import {quoteOrderText} from '../src/lib/supplier-reference';
import extraLabels from '../content/source-choice-presentation.json';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {parseHTML} from 'linkedom';
import seed from '../content/seed.json';
import {allProductModels} from '../src/lib/product-models';
import {publicProductView} from '../src/lib/public-product-copy';
import type {CatalogRuntime} from '../src/lib/catalog-configurator';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import ExpandedProductDetail from '../src/components/expanded-product-detail';
import {QuoteProvider} from '../src/components/quote-provider';

test('source-fixed arms cannot be described as adjustable, and supplier 1D is retained',()=>{
 let fixed=0,oneD=0;
 for(const [code,article] of Object.entries(data.articles))for(const [value,choice] of Object.entries(article.choices)){
  const label=armrestChoiceLabel(code,'CARMRESTS',value)!;
  if(/fixed/i.test(choice.sourceText)){assert.match(label,/fiksuoti/i);assert.doesNotMatch(label,/reguliuojami|[1-4]D/);fixed++;}
  if(/: 1D,/.test(choice.sourceText)){assert.match(label,/1D/);assert.doesNotMatch(label,/fiksuoti/i);oneD++;}
 }
 assert.equal(fixed,7);assert.equal(oneD,5);
 assert.match(armrestChoiceLabel('KINT006WW002','CARMRESTS','R20I')!,/1D/);
 assert.match(armrestChoiceLabel('KINT006WW002','CARMRESTS','R32R')!,/3D/);
 assert.equal(armrestChoiceLabel('KINT006WW002','CARMRESTS','NONE'),'Be porankių');
 // The supplier does not state fixed/adjustable for this chrome Sail option.
 assert.doesNotMatch(armrestChoiceLabel('KSAI004WW002','CARMRESTS','GTPSAILARMCRB')!,/fiksuoti|reguliuojami|[1-4]D/i);
});
test('Tigu choices distinguish type, finish and pad while retaining all nine identities',()=>{
 const choices=data.articles.KTGU001WW002.choices;
 assert.equal(Object.keys(choices).length,9);
 assert.equal(new Set(Object.keys(choices).map(v=>armrestChoiceLabel('KTGU001WW002','CARMRESTS',v))).size,9);
 for(const type of ['GTP','R'])for(const pad of ['PU','UPH']){
  assert.match(armrestChoiceLabel('KTGU001WW002','CARMRESTS',type+'TIGBL'+pad)!,/juodi/);
  assert.match(armrestChoiceLabel('KTGU001WW002','CARMRESTS',type+'TIGCR'+pad)!,/chromuoti/);
 }
 assert.match(choices.GTPTIGCRPU.label,/poliuretanas/);assert.match(choices.GTPTIGCRUPH.label,/oda/);
});
test('unverified articles, fields and option codes never inherit a guessed armrest description',()=>{
 assert.equal(armrestChoiceLabel('OTHER','CARMRESTS','GTPSTEEL'),undefined);
 assert.equal(armrestChoiceLabel('KWI2002WW001','CBASE','GTPSTEEL'),undefined);
 assert.equal(armrestChoiceLabel('KWI2002WW001','CARMRESTS','GTPNEW'),undefined);
 assert.equal(armrestFieldLabel(null),undefined);
});
test('quote display correction preserves configuration identity, raw supplier options and state',()=>{
 const c={id:'cfg',code:'KTGU001WW002',description:'sample',supplierOptions:['KTGU001WW002_OPTIONS.CARMRESTS=GTPTIGCRPU'],details:[{label:'Armrests',value:'GTPTIGCRPU · reguliuojami'},{label:'Mechanism',value:'ESPT'}]} as Configuration;
 const original=structuredClone(c),state={family:'cfg-family',anchor:'original-anchor',values:{CARMRESTS:'GTPTIGCRPU',CUPHGROUP:'PAROTEGA',CUPHCOLOR:'NF737'}};
 const displayed=presentArmrestConfiguration(c,state.values,'Armrests');
 assert.deepEqual(c,original);assert.equal(displayed.id,c.id);assert.equal(displayed.code,c.code);
 assert.equal(displayed.supplierOptions,c.supplierOptions);assert.equal(displayed.details![1],c.details![1]);
 assert.equal(displayed.details![0].label,'Porankiai');assert.match(displayed.details![0].value,/fiksuoti/i);
 const quote=expandedQuoteEntry({id:'product_test',name:'sample',brand:'',image:null} as any,displayed,state,{url:'/produktai/kedes/sample/',customized:true,quantity:1,choiceLabel:(k,v)=>armrestChoiceLabel(c.code,k,v)||v});
 assert.equal(quote.configurationState,state);assert.equal(quote.configurationId,c.id);assert.match(quote.configurationLabel,/fiksuoti/i);
 assert.deepEqual(state.values,{CARMRESTS:'GTPTIGCRPU',CUPHGROUP:'PAROTEGA',CUPHCOLOR:'NF737'});
});

test('Sail presentation fixture renders a translated field and preserves all source option identities',async()=>{
 const original=allProductModels(seed.products as any).find(p=>p.modelConfigurationId==='19640461')!;
 const product=publicProductView(original),code='KSAI004WW002',sample=product.modelConfigurationId!;
 const runtime:CatalogRuntime={family:{id:'cfg-123456789abc',kind:'catalog',productId:product.id,baseArticle:code,sample,collectionMode:'structure-only',articles:[{code,sample,name:code}],anchors:[{id:code+':structure-'+'c'.repeat(64),article:code,sample,name:code,axes:['CARMRESTS'],defaults:{CARMRESTS:'GTPSAILARMBLB'},choices:{CARMRESTS:Object.keys(data.articles.KSAI004WW002.choices)},classes:{CARMRESTS:code+'_OPTIONS'},geometry:{asset:'/models/configurator/structure/'+code+'-'+'a'.repeat(20)+'.glb',assetSha256:'a'.repeat(64),bytes:0},components:[],profiles:[]}]},palettes:{_fieldLabels:{CARMRESTS:{text:'Armrests'}}}};
 const engine=createExpandedEngine(runtime),state=engine.initialStateForProduct(product);
 const html=renderToStaticMarkup(createElement(QuoteProvider,{children:createElement(ExpandedProductDetail,{product,url:'/produktai/kedes/sail/',presets:null,catalogRuntime:runtime})}));
 const {document}=parseHTML(html);const select=Array.from(document.querySelectorAll('select')).find(s=>s.querySelector('option[value="GTPSAILARMBLB"]'));
 assert.ok(select,'Sail armrests are visible in its actual initial builder step');
 assert.deepEqual(Array.from(select.querySelectorAll('option')).map(o=>o.getAttribute('value')),engine.stateChoices(state).CARMRESTS);
 assert.match(select.textContent!,/fiksuoti/i);assert.doesNotMatch(select.textContent!,/reguliuojami/);
 assert.match(select.parentElement!.textContent!,/Porankiai/);
});

test('unrecognized armrest codes cannot fall through to an unsupported adjustable claim',()=>{
 assert.equal(safeArmrestFallback('CARMRESTS','UNKNOWN','UNKNOWN · reguliuojami'),'UNKNOWN');
 assert.equal(safeArmrestFallback('CARMRESTS','R70','R70 · 2D'),'R70 · 2D');
 assert.equal(safeArmrestFallback('CARMRESTS','GTP46','GTP46 · fiksuoti, juodi'),'GTP46 · fiksuoti, juodi');
 assert.equal(safeArmrestFallback('CBASE','X','original label'),'original label');
});

test('canonical engine and order rendering use verified meanings, including old saved generic labels',()=>{
 assert.match(choiceLabel('CARMRESTS','GTPTIGCRPU'),/Fiksuoti/);
 assert.match(choiceLabel('CARMRESTS','RTIGCRPU'),/1D/);
 assert.equal(choiceLabel('CARMRESTS','UNVERIFIEDGTP'),'UNVERIFIEDGTP');
 assert.match(choiceLabel('CBASE','ST44ALU'),/aliuminis/);assert.doesNotMatch(choiceLabel('CBASE','ST44ALU'),/poliamid/);
 assert.match(choiceLabel('CCASTORS','RMHH'),/kietoms/);assert.match(choiceLabel('CCASTORS','ESSHH'),/kietoms/);
 assert.equal(choiceLabel('CBASE','UNKNOWN'),'UNKNOWN');assert.equal(choiceLabel('CCASTORS','UNKNOWN'),'UNKNOWN');
 const raw={productName:'Tiger UP',brand:'INTERNAL',quantity:1,configurationId:'original',configurationState:{family:'cfg-original',anchor:'original',values:{CARMRESTS:'GTPTIGCRPU'}},configurationLabel:'sample · GTPTIGCRPU · reguliuojami',configurationDetails:[{label:'Armrests',value:'GTPTIGCRPU · reguliuojami'}],supplierOptions:['KTGU001WW002_OPTIONS.CARMRESTS=GTPTIGCRPU']};
 const before=structuredClone(raw),view=correctedItemPresentation(raw),text=quoteOrderText(raw);
 assert.deepEqual(raw,before,'Historical saved record is unchanged');assert.equal(view.configurationState,raw.configurationState);assert.equal(view.supplierOptions,raw.supplierOptions);
 assert.match(view.configurationLabel,/Fiksuoti/);assert.doesNotMatch(view.configurationLabel,/reguliuojami/);
 assert.equal(view.configurationDetails[0].label,'Porankiai');assert.match(view.configurationDetails[0].value,/Fiksuoti/);
 assert.match(text,/Fiksuoti/);assert.doesNotMatch(text,/reguliuojami/);assert.match(text,/CARMRESTS=GTPTIGCRPU/);
});
test('every source-backed base/castor entry matches the captured material or floor fact',()=>{
 for(const [key,entry] of Object.entries(extraLabels.choices)){
  const [field,value]=key.split('='),label=choiceLabel(field,value);
  if(entry.sourceFact.includes('aluminium')){assert.match(label,/aliuminis/);assert.doesNotMatch(label,/poliamidas/);}
  if(entry.sourceFact==='polyamide')assert.match(label,/poliamidas/);
  if(entry.sourceFact==='hard')assert.match(label,/kietoms grindims/);
  if(entry.sourceFact==='soft')assert.match(label,/minkštoms grindims/);
 }
});
