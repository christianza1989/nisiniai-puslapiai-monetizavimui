// Prepare a reviewable immutable release candidate. This command never edits
// the active index, app source, editorial package, database or deployment.
import fs from 'node:fs/promises';
import {nativeAxisValueChanges} from './native-axis-value-changes.mjs';
import {sourceVariantAliases} from './source-variant-aliases.mjs';
import {verifiedLegacySamplePhoto} from './verified-legacy-sample-photo.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {baseSeed} from '../src/lib/catalog';
import {attributedProduct} from '../src/lib/photo-attribution';
import {cleanProductPhotographs} from '../src/lib/product-photographs';
import {compactCatalogRuntime} from './compact-catalog-runtime.mjs';
import type {CatalogFamily,CatalogAnchor} from '../src/lib/catalog-configurator';
import {fieldLabels} from '../src/lib/expanded-configurator';
import {localizeAdditionalPalettes} from './additional-chair-labels.mjs';
import {additionalChairStatus} from './additional-chair-status.mjs';
import {RUNTIME_TRANSPORT_MAX_BYTES} from '../src/lib/runtime-transport-limits.mjs';
import {publicProductText} from '../src/lib/public-product-copy';
import materials from '../content/render-materials.json';
import catalogMaterials from '../content/render-materials-catalog.json';

const option=(name:string,fallback:string)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const root=path.resolve('../research/configurator/all-chairs-20261014');
const prepared=path.join(root,'prepared-v3');
const stage=path.resolve(option('stage',path.join(root,'staged-runtime')));
assert(stage.startsWith(root+path.sep),'Runtime candidate must stay in this task research directory');
const only=option('article','');
const seed=baseSeed();
const selection=JSON.parse(await fs.readFile(path.join(root,'selection.json'),'utf8'));
const status=additionalChairStatus(root);
const sourceLibrary={...materials.colors,...catalogMaterials.colors} as Record<string,{image?:string;normalImage?:string}>;
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
type Receipt={asset:string;sha256:string};
const index={schemaVersion:2,articles:{} as Record<string,Receipt>,products:{} as Record<string,{id:string;articles:{code:string;sample:string;name:string;id:string}[]}>};
const verifiedFiles=new Map<string,string>();
const checks:{code:string;anchors:number;bytes:number;finishes:number;photoSamples:string[]}[]=[];
const problems:{code:string;reason:string}[]=[];
const reusedPhotos:unknown[]=[];
await fs.mkdir(path.join(stage,'public/models/configurator/runtime'),{recursive:true});
await fs.mkdir(path.join(stage,'public/media/configurator'),{recursive:true});
async function verifyAsset(asset:string,sha?:string){
 assert(/^\/(?:models\/configurator\/all-chairs-v3\/|media\/configurator\/)[A-Za-z0-9_@./-]+$/.test(asset)&&!asset.includes('..'),'Unexpected prepared asset '+asset);
 const local=path.resolve('public',asset.slice(1));
 assert(local.startsWith(path.resolve('public')+path.sep),'Asset escaped public');
 const previous=verifiedFiles.get(asset);
 if(previous){if(sha)assert.equal(previous,sha,asset);return;}
 const bytes=await fs.readFile(local),actual=digest(bytes);if(sha)assert.equal(actual,sha,asset);
 verifiedFiles.set(asset,actual);
}
type PreparedAnchor=CatalogAnchor&{roles:Record<string,string>};
async function verifyAnchor(anchor:PreparedAnchor){
 assert(anchor.geometry,'Prepared chair requires actual base geometry');
 const assetList=[anchor.geometry,...anchor.components.flatMap(c=>c.variants.flatMap(v=>[...(v.patch.geometry?[v.patch.geometry]:[]),...(v.patch.geometries||[])]))];
 for(const asset of assetList){assert(asset.bytes<=25*1024*1024&&Number((asset as typeof asset&{sourceTriangles:number}).sourceTriangles)>0,asset.asset+' exceeds Cloudflare asset limit');await verifyAsset(asset.asset,asset.assetSha256);}
 let finishes=0;
 for(const field of new Set(Object.values(anchor.roles))){
  const domain=new Set([anchor.defaults[field],...(anchor.choices[field]||[]),...anchor.profiles.flatMap(p=>[p.defaults[field],...(p.choices[field]||[])])].filter(Boolean));
  for(const code of domain){
   const material=anchor.materials?.[field]?.[code] as {image?:string;normalImage?:string;imageSha256?:string;normalImageSha256?:string;factor?:number[]}|undefined;
   const exact=material||sourceLibrary[code];assert(exact,`${anchor.id} ${field} ${code}: missing original surface material`);
   if(material)assert(material.factor?.length===4&&material.factor.every(Number.isFinite),'Invalid PBR factor');
   for(const key of ['image','normalImage'] as const)if(exact[key])await verifyAsset(exact[key]!,material?.[key==='image'?'imageSha256':'normalImageSha256']);
   finishes++;
  }
 }
 return finishes;
}
for(const [code,entry] of Object.entries(status.articles) as [string,{phase:string}][]){
 if(only?code!==only:entry.phase!=='verified')continue;
 try{
  assert(/^K[A-Z0-9]+$/.test(code));
  const ruleReport=path.join(stage,code+'-rules.json');
  const result=spawnSync(process.execPath,['--import','tsx','scripts/verify-additional-chair-data.ts','--article='+code,'--folder='+prepared,'--report='+ruleReport],{cwd:process.cwd(),encoding:'utf8',maxBuffer:2_000_000});
  await fs.writeFile(path.join(stage,code+'-rules.log'),result.stdout+result.stderr);
  assert.equal(result.status,0,'Source rule verification failed; see candidate log');
  const full=JSON.parse(await fs.readFile(path.join(prepared,code+'.json'),'utf8'));
  for(const family of full.families)await nativeAxisValueChanges(family,path.join(root,'source-v3'));
  const compact=compactCatalogRuntime(full);
  assert.equal(compact.families.length,1,'Per-article candidate contains multiple products');
  const family=compact.families[0] as CatalogFamily;
  assert.deepEqual(localizeAdditionalPalettes(compact.palettes,family.anchors,fieldLabels),[],'New source field needs a Lithuanian label');
  for(const entries of Object.values(compact.palettes) as Record<string,{text:string}>[])for(const [code,entry] of Object.entries(entries))entry.text=typeof entry.text==='string'?publicProductText(entry.text)||code:code;
  const selected=selection.products.find((p:{productId:string})=>p.productId===family.productId);
  for(const anchor of family.anchors)if(selected.id.endsWith('-meeting-chairs'))anchor.name=anchor.name.replace(/^Darbo kėdė/,'Susitikimų kėdė');
  const geometryReport=JSON.parse(await fs.readFile(path.join(prepared,code+'-verification.json'),'utf8'));
  assert.equal(geometryReport.length,family.anchors.length);assert(geometryReport.every((r:{passed:boolean;article:string})=>r.passed&&r.article===code));
  assert(family.anchors.length>0&&family.anchors.every(a=>a.article===code));
  let finishes=0;for(const anchor of family.anchors)finishes+=await verifyAnchor(anchor as PreparedAnchor);
  const article=family.articles.find(a=>a.code===code);assert(article);
  compact.palettes._sourceValueAliases=sourceVariantAliases(path.join(root,'source-v3',code));
  const bytes=Buffer.from(JSON.stringify({article,anchors:family.anchors,palettes:compact.palettes}));
  assert(bytes.byteLength<=RUNTIME_TRANSPORT_MAX_BYTES,'Per-model runtime exceeds immutable loader limit');
  const sha256=digest(bytes),asset='/models/configurator/runtime/'+code+'-'+sha256.slice(0,20)+'.json';
  await fs.writeFile(path.join(stage,'public',asset),bytes);
  index.articles[code]={asset,sha256};checks.push({code,anchors:family.anchors.length,bytes:bytes.byteLength,finishes,photoSamples:[]});
 }catch(error){problems.push({code,reason:Error.prototype.toString.call(error)});}
}
// A shared article can be published under several catalog groups and model
// IDs. Rebind each alias to its own original, approved photo and sample ID.
for(const selected of selection.products){
 const original=seed.products.find(p=>p.id===selected.productId);assert(original,'Unknown selection product');
 const product=attributedProduct(cleanProductPhotographs(original));
 const allowedCodes=new Set(selected.articles.map((a:{code:string})=>a.code));
 const articles=product.configurations.filter(c=>c.code&&allowedCodes.has(c.code)&&index.articles[c.code]);
 if(!articles.length)continue;
 const id='cfg-'+digest(product.id).slice(0,12);assert(id.length<30);
 index.products[product.id]={id,articles:[]};
 for(const configuration of articles){
  assert(/^\d+$/.test(configuration.id),'Unexpected supplier sample identifier');
  const image=configuration.image;assert(typeof image==='string','Approved model photo missing locally: '+configuration.id);assert(image.startsWith('/')&&!image.includes('..'));
  const local=path.resolve('public',image.slice(1));assert(local.startsWith(path.resolve('public')+path.sep));
  const input=await fs.readFile(local),meta=await sharp(input).metadata();
  let output=meta.format==='jpeg'?input:await sharp(input).flatten({background:'#ffffff'}).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toBuffer();
  const asset='/media/configurator/'+configuration.id+'.jpg',target=path.join(stage,'public',asset);
  const published=path.resolve('public',asset.slice(1));
  try{
   const prior=await fs.readFile(published);
   if(digest(prior)!==digest(output)){
    const sourceReceipt=JSON.parse(await fs.readFile(published+'.receipt.json','utf8'));
    const attribution=JSON.parse(await fs.readFile('content/photo-attribution.json','utf8'));
    const approved=attribution.records[product.id]?.configurations[configuration.id]?.primary;assert(approved,'Approved model photo missing');
    const proof=verifiedLegacySamplePhoto(prior,sourceReceipt,approved,product.id);
    reusedPhotos.push({product:product.id,sample:configuration.id,...proof});output=prior;
   }
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;assert.equal((error as NodeJS.ErrnoException).path,published,'Existing sample photo lacks a source receipt; attribution review required '+configuration.id);}
  await fs.writeFile(target,output);
  index.products[product.id].articles.push({code:configuration.code!,sample:configuration.id,name:configuration.name,id:'cfg-'+digest(product.id+':'+configuration.id).slice(0,12)});
  checks.find(c=>c.code===configuration.code)!.photoSamples.push(configuration.id);
 }
}
await fs.writeFile(path.join(stage,'configurator-additional-index.json'),JSON.stringify(index,null,2)+'\n');
await fs.writeFile(path.join(stage,'asset-receipts.json'),JSON.stringify(Object.fromEntries([...verifiedFiles].sort()),null,2)+'\n');
await fs.writeFile(path.join(stage,'photo-reuse.json'),JSON.stringify({reusedPhotos,existingImagesUnchanged:true},null,2)+'\n');
const report={createdAt:new Date().toISOString(),statusSnapshotSha256:digest(JSON.stringify(status)),articles:checks.length,products:Object.keys(index.products).length,modelSamples:checks.reduce((n,c)=>n+c.photoSamples.length,0),runtimeBytes:checks.reduce((n,c)=>n+c.bytes,0),assets:verifiedFiles.size,checks,problems,activated:false};
await fs.writeFile(path.join(stage,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({articles:report.articles,products:report.products,models:report.modelSamples,assets:report.assets,problems,activated:false}));
if(problems.length)process.exitCode=1;
