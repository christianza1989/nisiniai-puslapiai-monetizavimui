import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import seedData from '../content/seed.json';
import {allProductModels} from '../src/lib/product-models';
import {catalogModelVisible} from '../src/lib/catalog-consolidation';
import type {Product} from '../src/lib/types';
import {currentTechnicalSourceHash} from '../src/lib/publication-geometry';
import {expandedForProduct} from '../src/lib/expanded-configurator';
import {pilotForProduct} from '../src/lib/configurator';
const root='D:/Core/output/ergonomic-nonchair-sources-20261015';
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const roadmap=read(path.join(root,'ROADMAP-STATE.json'));
const gemini=read('D:/Core/output/ergonomic-gemini-reviewed-local-20261014/manifest.json');
const authority=read('D:/Core/output/ergonomic-configurators-20261015/PUBLIC_GEOMETRY_AUTHORITY.json');
const index=read('content/configurator-additional-index.json');
// Existing public acceptance may be inherited only from these exact released
// inputs. A new local Native candidate cannot acquire acceptance by refreshing
// this inventory; it needs its own independent acceptance and release authority.
const published='D:/Core/workspaces/ergonomic-configurators-vcare-after-dedupe-20261016/web/content';
for(const file of ['configurator-additional-index.json','configurator-catalog.json','configurator-expanded.json','configurator-pilot.json']){
 const baseline=file==='configurator-additional-index.json'?authority.index:path.join(published,file);
 if(digest(read('content/'+file))!==digest(read(baseline)))throw Error('Unaccepted technical release change: '+file);
}
const runtime=new Map<string,any>();
for(const [code,r] of Object.entries(index.articles) as [string,any][]){
 const bytes=fs.readFileSync(path.join('public',r.asset));
 if(createHash('sha256').update(bytes).digest('hex')!==r.sha256)throw Error('Runtime SHA mismatch '+code);
 runtime.set(code,{...r,anchors:JSON.parse(bytes.toString()).anchors});
}
for(const file of ['configurator-catalog.json','configurator-expanded.json']){
 const d=read('content/'+file);for(const f of d.families){if(!runtime.has(f.baseArticle))runtime.set(f.baseArticle,{sha256:digest(f),anchors:f.anchors});}
}
const seed=seedData as unknown as {products:Product[];categories:{id:string;name:string}[]};
const models=allProductModels(seed.products).map(p=>{
 const c=p.configurations.find(x=>x.id===p.modelConfigurationId);
 const key=p.id+':'+(c?.id||'product'),article=p.modelArticle;
 const g=gemini.models.find((x:any)=>x.productId===p.id&&x.configurationId===c?.id);
 let exactGeminiProse=false;
 if(g&&article){try{
  const bytes=fs.readFileSync(`D:/Core/output/ergonomic-gemini-reviewed-local-20261014/gemini-results/${g.configurationId}.txt`);
  const raw=JSON.parse(bytes.toString('utf8').trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
  exactGeminiProse=createHash('sha256').update(bytes).digest('hex')===g.geminiResponseSha256&&raw.summary===article.summary&&JSON.stringify(raw.intro)===JSON.stringify(article.paragraphs);
 }catch{/* Incomplete historical provenance is a blocker, never an approval. */}}
 const r=c?.code?runtime.get(c.code):undefined;
 const family=seed.products.find(x=>x.id===p.id)!;
 const embedded=expandedForProduct(p),pilot=pilotForProduct(p);
 const additional=!!r&&!!c&&!!index.products[p.id]?.articles.some((a:any)=>a.code===c.code&&a.sample===c.id);
 const accepted=additional||!!embedded||!!pilot;
 const proofSha=additional?r.sha256:embedded?digest(embedded):pilot?digest(pilot):null;
 const anchors=additional?r.anchors:embedded?.anchors||[];
 const pending=roadmap.fullCollection?.pendingEdgesByObservedJob||{};
 const observed=Object.entries(pending).find(([job])=>c?.code&&job.endsWith('::'+c.code));
 const paragraphs=article?.paragraphs?.length?article.paragraphs:[p.description,c?.description||''].filter(Boolean);
 const source={key,productId:p.id,configurationId:c?.id||null,code:c?.code||null,name:p.name,
  categoryId:p.categoryId,category:seed.categories.find(x=>x.id===p.subcategoryId)?.name||p.categorySlug,
  categorySlug:p.categorySlug,path:`/produktai/${p.categorySlug}/${p.slug}/`,image:p.image,
  active:!c||catalogModelVisible(p.id,c),sourceReady:!!family.sourceUrl&&!!(c?.code||family.sourceDescription),
  geometryAvailable:accepted,geometryAccepted:accepted,geometryProof:accepted?{worker:authority.worker,release:authority.release,sha256:proofSha}:null,
  optionsReady:!!article?.configurable,geminiReady:exactGeminiProse,
  gemini:g?{conversation:g.geminiUrl,responseSha256:g.geminiResponseSha256,valueSha256:g.valueSha256}:null,
  paragraphs,summary:article?.summary||p.description,
  effort:{observedPendingEdges:observed?.[1]??null,anchors:anchors.length||null,label:observed?'Išmatuota likusių perėjimų':anchors.length?'Turimas 3D; grafo užbaigimo kaina neįvertinta':'Grafo dydis dar nežinomas'},
  sourceUrl:family.sourceUrl,brand:family.brand,
 };
 const {effort,...revisionSource}=source;
 return {...source,revisionHash:digest({source:revisionSource,configuration:c,article,images:p.gallery})};
});
if(models.length!==1111||new Set(models.map(m=>m.key)).size!==1111)throw Error('Original model inventory mismatch');
const result={version:1,generatedAt:new Date().toISOString(),technicalSourceHash:currentTechnicalSourceHash,publicWorker:authority.worker,roadmapAt:roadmap.at,roadmapReadOnly:true,models};
fs.writeFileSync('content/admin-source-status.json',JSON.stringify(result));
console.log(JSON.stringify({models:models.length,active:models.filter(m=>m.active).length,geometryAccepted:models.filter(m=>m.geometryAccepted).length,gemini:models.filter(m=>m.geminiReady).length,ready:models.filter(m=>m.geometryAccepted&&m.optionsReady&&m.geminiReady).length}));
