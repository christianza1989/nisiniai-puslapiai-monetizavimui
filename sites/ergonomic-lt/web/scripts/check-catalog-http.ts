import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {catalog} from '../src/lib/catalog';
import {catalogFamilies,catalogInitial} from '../src/lib/catalog-configurator';
import {stateToken,expandedSelection} from '../src/lib/expanded-configurator';
import materials from '../content/render-materials-catalog.json';
async function main(){
const origin=process.env.CHECK_ORIGIN||'http://127.0.0.1:3001',assets=new Map<string,string>(),pages=[],cards=[];
for(const f of catalogFamilies){const product=catalog().products.find(p=>p.id===f.productId)!;
 const url='/produktai/kedes/'+product.slug+'/',response=await fetch(origin+url),html=await response.text();assert.equal(response.status,200,url);assert(html.includes('3D konfigūratorius'),url);pages.push({family:f.id,url,status:200});
 for(const a of f.anchors){assets.set(a.geometry.asset,a.geometry.assetSha256);for(const component of a.components)for(const v of component.variants)for(const asset of [...(v.patch.geometry?[v.patch.geometry]:[]),...(v.patch.geometries||[])])assets.set(asset.asset,asset.assetSha256);}
 for(const a of f.articles){const state=catalogInitial(f,a.code),selection=expandedSelection(product,state),response=await fetch(origin+'/api/produkto-kortele/?produktas='+product.id+'&konfig='+encodeURIComponent(stateToken(state)));assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');await fs.mkdir('output/pdf/catalog',{recursive:true});await fs.writeFile('output/pdf/catalog/'+a.code+'.pdf',bytes);cards.push({family:f.id,article:a.code,bytes:bytes.length,options:selection.configuration.supplierOptions});}
}
for(const f of catalogFamilies)for(const article of f.articles){const url='/media/configurator/'+article.sample+'.jpg',bytes=await fs.readFile(path.join('public',url));assets.set(url,createHash('sha256').update(bytes).digest('hex'));}
for(const item of Object.values(materials.colors))for(const url of [item.image,...('normalImage' in item&&typeof item.normalImage==='string'?[item.normalImage]:[])])if(url){const bytes=await fs.readFile(path.join('public',url));assets.set(url,createHash('sha256').update(bytes).digest('hex'));}
let cursor=0;const list=[...assets];
await Promise.all(Array.from({length:6},async()=>{while(cursor<list.length){const [url,sha]=list[cursor++],response=await fetch(origin+url);assert.equal(response.status,200,url);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),sha,url);}}));
await fs.mkdir('.impeccable/review/configurator-ten',{recursive:true});
await fs.writeFile('.impeccable/review/configurator-ten/http-check.json',JSON.stringify({origin,checkedAt:new Date().toISOString(),pages,cards,assets:list.length,verifiedHashes:true},null,2));
console.log(pages.length,'pages',cards.length,'PDF cards',list.length,'HTTP asset hashes passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
