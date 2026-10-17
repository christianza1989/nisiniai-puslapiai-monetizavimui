import fs from 'node:fs';
import assert from 'node:assert/strict';
import {visibleModelsAsync,visibleProductsAsync,productPath} from '../src/lib/catalog';
import {allProductModels} from '../src/lib/product-models';
import {createExpandedEngine} from '../src/lib/expanded-configurator';
import {loadCatalogRuntime} from '../src/lib/catalog-runtime-loader';
const out='D:/Core/output/ergonomic-catalog-dedupe-20261016';
const active=(await visibleModelsAsync()).filter(p=>p.categorySlug==='kedes'),original=allProductModels(await visibleProductsAsync()).filter(p=>p.categorySlug==='kedes');
async function inspect(models:typeof active){const rows=[];for(const p of models){const e=createExpandedEngine(await loadCatalogRuntime(p));rows.push({productId:p.id,id:p.modelConfigurationId,code:p.configurations.find(c=>c.id===p.modelConfigurationId)?.code,path:productPath(p),has3D:!!e.expandedForProduct(p)});}return rows;}
const before=await inspect(original),after=await inspect(active),codes=(rows:typeof before)=>[...new Set(rows.filter(r=>r.has3D).map(r=>r.productId+':'+r.code))].sort();
assert.deepEqual(codes(before),codes(after),'A distinct functional3D model disappeared');
const receipt={at:new Date().toISOString(),owner3DCreationPaused:true,originalChairCards:before.length,activeChairCards:after.length,original3DCards:before.filter(r=>r.has3D).length,active3DCards:after.filter(r=>r.has3D).length,no3DActiveCards:after.filter(r=>!r.has3D),allOriginal3DBaseCodesPreserved:true,scope:'Catalogue consolidation only; eligibility and source-unavailable exceptions require the prior source evidence. This does not start or finish any3D source job.'};
fs.writeFileSync(out+'/POST-DEDUPE-3D-INVENTORY.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({originalChairCards:before.length,activeChairCards:after.length,original3DCards:receipt.original3DCards,active3DCards:receipt.active3DCards,without3D:receipt.no3DActiveCards.length,allDistinct3DBaseCodesPreserved:true}));
