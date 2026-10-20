// Export only release-bound public model identities. Supplier provenance stays
// in server order data; never serialize the private product object here.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {baseSeed} from '../src/lib/catalog';
import {modelProduct} from '../src/lib/product-models';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {createCatalogRuntimeLoader,type CatalogRuntimeIndex} from '../src/lib/catalog-runtime-loader';
import {pilotForProduct} from '../src/lib/configurator';
import {publicProductText} from '../src/lib/public-product-copy';

const root=path.resolve('../research/configurator/all-chairs-20261014');
const stage=path.resolve(process.argv.find(a=>a.startsWith('--stage='))?.slice(8)||'');
assert(stage.startsWith(root+path.sep),'Choose a verified release candidate');
const indexBytes=await fs.readFile(path.join(stage,'configurator-additional-index.json'));
const index=JSON.parse(indexBytes.toString()) as CatalogRuntimeIndex;
const report=JSON.parse(await fs.readFile(path.join(stage,'report.json'),'utf8'));
assert(!report.problems.length&&report.articles===Object.keys(index.articles).length);
const load=createCatalogRuntimeLoader(index,async asset=>fs.readFile(path.resolve(stage,'public',asset.slice(1))));
const origin='https://ergonomic-preview.pinet-azprekyba.workers.dev';
const rows:{model:string;sample:string;code:string;mode:string;url:string}[]=[];
for(const parent of baseSeed().products.filter(p=>p.categorySlug==='kedes'))for(const configuration of parent.configurations){
 const model=modelProduct(parent,configuration);
 const engine=createExpandedEngine(await load(model));
 const full=!!engine.expandedForProduct(model);
 const interactive=full&&Object.keys(engine.stateChoices(engine.initialStateForProduct(model))).length>0;
 const preset=!full&&!!pilotForProduct(model);
 if(!full&&!preset)continue;
 rows.push({model:publicProductText(model.name),sample:configuration.id,code:configuration.code||'',
  mode:interactive?'Interaktyvus konfigūratorius':full?'Fiksuota 3D peržiūra':'Ribotas 3D pasirinkimas',url:origin+'/produktai/'+model.categorySlug+'/'+model.slug+'/'});
}
rows.sort((a,b)=>a.model.localeCompare(b.model,'lt')||a.sample.localeCompare(b.sample));
assert.equal(new Set(rows.map(r=>r.url)).size,rows.length,'Duplicate model page');
assert(rows.every(r=>/^https:\/\/ergonomic-preview\.pinet-azprekyba\.workers\.dev\/produktai\/kedes\/[a-z0-9-]+\/$/.test(r.url)));
assert(!/Nowy\s*Styl|SOHOS|Kusch\s*\+\s*Co|sessionId|basketId|sourceUrl/i.test(JSON.stringify(rows)));
const quote=(value:string)=>'"'+value.replaceAll('"','""')+'"';
const csv='\ufeff'+[['Modelis','Modelio ID','Prekės kodas','3D tipas','Nuoroda'],...rows.map(r=>[r.model,r.sample,r.code,r.mode,r.url])].map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n';
const markdown='# Paskelbti kėdžių modeliai su 3D\n\n'+
 `${rows.filter(r=>r.mode==='Interaktyvus konfigūratorius').length} interaktyvių modelių; ${rows.filter(r=>r.mode==='Fiksuota 3D peržiūra').length} fiksuotos 3D peržiūros; ${rows.filter(r=>r.mode==='Ribotas 3D pasirinkimas').length} modeliai su ribotu 3D pasirinkimu.\n\n`+
 '| Modelis | Modelio ID | Prekės kodas | 3D tipas | Nuoroda |\n|---|---|---|---|---|\n'+rows.map(r=>`| ${r.model.replaceAll('|','\\|')} | ${r.sample} | ${r.code} | ${r.mode} | [Atidaryti](${r.url}) |`).join('\n')+'\n';
await fs.writeFile(path.join(stage,'PASKELBTI-MODELIAI.md'),markdown);
await fs.writeFile('public/konfiguratoriu-modeliai.csv',csv);
await fs.writeFile(path.join(stage,'konfiguratoriu-modeliai.csv'),csv);
const receipt={runtimeIndexSha256:createHash('sha256').update(indexBytes).digest('hex'),
 csvSha256:createHash('sha256').update(csv).digest('hex'),models:rows.length,
 interactive:rows.filter(r=>r.mode==='Interaktyvus konfigūratorius').length,
 fixed:rows.filter(r=>r.mode==='Fiksuota 3D peržiūra').length,
 preset:rows.filter(r=>r.mode==='Ribotas 3D pasirinkimas').length,rows};
await fs.writeFile(path.join(stage,'models-list.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({models:receipt.models,interactive:receipt.interactive,preset:receipt.preset,list:'/konfiguratoriu-modeliai.csv'}));
