import fs from 'node:fs';
import {visibleModelsAsync,productPath} from '../src/lib/catalog';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {publicProductText} from '../src/lib/public-product-copy';
const rows=[];
for(const p of await visibleModelsAsync()){
 const engine=createExpandedEngine(await loadCatalogRuntime(p));if(!engine.expandedForProduct(p))continue;
 rows.push({model:publicProductText(p.name),id:p.modelConfigurationId!,code:p.configurations.find(c=>c.id===p.modelConfigurationId)!.code!,mode:Object.keys(engine.stateChoices(engine.initialStateForProduct(p))).length?'Interaktyvus konfigūratorius':'Fiksuota 3D peržiūra',url:'https://ergonomic-preview.pinet-azprekyba.workers.dev'+productPath(p)});
}
rows.sort((a,b)=>a.model.localeCompare(b.model,'lt')||a.id.localeCompare(b.id));
const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
const csv='\ufeff'+[['Modelis','Modelio ID','Prekės kodas','3D tipas','Nuoroda'],...rows.map(r=>[r.model,r.id,r.code,r.mode,r.url])].map(r=>r.map(quote).join(';')).join('\r\n')+'\r\n';
// Atomic replacement avoids mutating any immutable hard-linked source inode.
fs.writeFileSync('public/konfiguratoriu-modeliai.csv.new',csv);fs.renameSync('public/konfiguratoriu-modeliai.csv.new','public/konfiguratoriu-modeliai.csv');
fs.writeFileSync('D:/Core/output/ergonomic-catalog-dedupe-20261016/ACTIVE-3D-LIST.json',JSON.stringify({models:rows.length,rows},null,2));console.log(JSON.stringify({models:rows.length}));
