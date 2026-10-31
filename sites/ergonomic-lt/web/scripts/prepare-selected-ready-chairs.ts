/** New selected-version preparation, bounded and separate from the receiver. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {validateChairReviewComponents} from '../src/lib/chair-components';
import {catalogModelVisible} from '../src/lib/catalog-consolidation';
import {originalOnlyPalette} from './prepare-ready-review-inventory';
import {glbGeometryAdmission} from './prepared-review-glb-admission';
import {normalizeReadyChairPalettes} from './normalize-ready-chair-palettes';
import type {ChairPreview} from '../src/lib/chair-preview';
const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const same=(s:any,r:any)=>s.dev===r.dev&&s.ino===r.ino&&s.size===r.size&&s.mtimeMs===r.mtimeMs;
const json=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
async function main(){
 const {values}=parseArgs({options:{metadata:{type:'string'},integrity:{type:'string'},output:{type:'string'},prior:{type:'string'},only:{type:'string'},'metadata-only':{type:'boolean'}}});assert(values.metadata&&values.integrity&&values.output&&values.prior);
 const parent=await fs.realpath(path.dirname(values.output));assert(parent.toLowerCase().startsWith('e:\\ergonomic\\'));const e=await fs.statfs('E:/'),d=await fs.statfs('D:/');assert(e.bavail*e.bsize>=150e9&&d.bavail*d.bsize>=60e9);
 await fs.mkdir(values.output,{recursive:false});const metadata=await json(values.metadata),seed=await json('content/seed.json'),prepared:any[]=[],attention:any[]=[],skipped:any[]=[];
 for(const row of metadata.rows){
  if(values.only&&!values.only.split(',').includes(row.code))continue;
  if(Object.keys(row.oversizedOrNeedsCompression).length){skipped.push({code:row.code,version:row.version,reason:'RUNTIME_GLB_OVER25MIB_OR_COMPRESSION_REQUIRED',assets:row.oversizedOrNeedsCompression});continue;}
  const out=values.output+'/'+row.code;await fs.mkdir(out,{recursive:false});
  try{
   const received=await json(values.integrity+'/'+row.code+'/RESULT.json');assert(received.allProvidedFileHashesMatched===true&&received.headerSha256===row.manifestSha256&&received.version===row.version,'Selected packet not yet fully received');
   const byRelative=new Map<string,any>(received.files.map((r:any)=>[r.relative,r]));
   async function read(relative:string){const r=byRelative.get(relative);assert(r&&same(await fs.stat(r.file),r),'Received file changed: '+relative);assert(r.size<=25*1024*1024,'Bounded file25MiB');const bytes=await fs.readFile(r.file);assert(bytes.length===r.size&&sha(bytes)===r.sha256&&same(await fs.stat(r.file),r),'File readback changed: '+relative);return bytes;}
   const runtimeBytes=await read('runtime.json'),runtime=JSON.parse(runtimeBytes.toString('utf8')),runtimeSha256=sha(runtimeBytes);validateChairReviewComponents(runtime,row.code);
   const sourcePalette=JSON.parse((await read('colors.json')).toString('utf8')),hasSelectors=byRelative.has('selectors.json'),rawSelectors=hasSelectors?JSON.parse((await read('selectors.json')).toString('utf8')):{schema:'canonical-world-primitive-selectors-329-v1',assets:{}};
   assert(rawSelectors.schema==='canonical-world-primitive-selectors-329-v1'&&rawSelectors.assets,'Unknown OWN selector index');
   const primary=['chair-colors-full-state-329-v1','chair-colors-observed-partial-344-v1'].includes(sourcePalette.schema),palette=primary?sourcePalette:originalOnlyPalette(sourcePalette,row.code,runtimeSha256);
   assert(!primary||hasSelectors,'A bound primary palette requires the supplied OWN selector index');
   assert(palette.code===row.code&&palette.runtimeSha256===runtimeSha256,'Primary palette binding mismatch');
   const catalog=seed.products.flatMap((p:any)=>p.configurations.filter((c:any)=>c.code===row.code&&catalogModelVisible(p.id,c)).map((c:any)=>({productId:p.id,sample:c.id,name:p.name})));assert(catalog.length===1,'Catalog model is not unique');
   const namespace='/models/configurator/chairs/'+row.code+'-'+row.manifestSha256.slice(0,20),assets:ChairPreview['assets']={},textures:ChairPreview['textures']={},fileAssets:Record<string,any>={},materials:Record<string,unknown>={},documents:Record<string,any>={};
   for(const c of runtime.contexts)for(const a of [c.invariant,...c.groups.flatMap((g:any)=>g.variants.map((v:any)=>v.asset))])if(a&&!assets[a.sha256]){const r=byRelative.get(a.file);assert(r?.sha256===a.sha256&&r.size===a.bytes&&!a.needsCompression&&a.bytes<=25*1024*1024,'Runtime source asset mismatch');assets[a.sha256]={asset:namespace+'/source/'+a.file,assetSha256:a.sha256,bytes:a.bytes};}
   for(const r of received.files){
    if(/\.(png|jpe?g|webp)$/i.test(r.relative))textures[r.sha256]={asset:namespace+'/source/'+r.relative,sha256:r.sha256,bytes:r.size};
    if(r.relative.endsWith('.glb'))fileAssets[r.relative]={asset:namespace+'/source/'+r.relative,assetSha256:r.sha256,bytes:r.size};
    if(/^library\/materials\/[a-f0-9]{64}\.json$/.test(r.relative)){const b=await read(r.relative),id=path.basename(r.relative,'.json');assert(sha(b)===id,'OWN material ID differs from document SHA');materials[id]=JSON.parse(b.toString('utf8'));}
    if(/^(colors-.+\.json|GROUP-PALETTE-VERIFIED-SAFE\.json)$/.test(r.relative))documents[r.relative]=JSON.parse((await read(r.relative)).toString('utf8'));
   }
   const data:ChairPreview={schema:'pc2-chair-review-111-v1',code:row.code,name:catalog[0].name,runtimeSha256,runtime,palette,selectors:primary||Object.keys(documents).length?rawSelectors:{schema:'canonical-world-primitive-selectors-329-v1',assets:{}},assets,textures};
   const availableDocuments={...documents};
   if(!hasSelectors){
    data.unavailableFinishChoices=[];
    for(const [file,document]of Object.entries(availableDocuments)){
     if(document.schema==='chair-qualified-fixed-finish-405-v1')continue;
     if(file==='GROUP-PALETTE-VERIFIED-SAFE.json'){assert(document.pass===true,'Supplier group certificate not passed');delete availableDocuments[file];continue;}
     if(document.schema==='chair-exact-state-primitive-swaps-329-v1'){
      const parts=Object.values(document.patches)as any[],contexts=[...new Set(parts.map(p=>p.runtimeContextIndex))];for(const context of contexts)data.unavailableFinishChoices.push({label:'Surinktos apdailos būsenos',count:parts.filter(p=>p.runtimeContextIndex===context).length,context,reason:'Trūksta originalių paviršių susiejimo duomenų.'});
     }else if(document.schema==='chair-qualified-group-palette-353-v1')for(const group of document.groups)data.unavailableFinishChoices.push({label:group.fields.join(' / '),count:group.actualGroupValueCount,context:document.runtimeContextIndex,reason:'Trūksta originalių paviršių susiejimo duomenų.'});
     else assert(document.schema==='chair-qualified-group-witness-palettes-397-v1','An unsupported no-selector color schema needs explicit review');
     delete availableDocuments[file];
    }
   }
   const supplemental=normalizeReadyChairPalettes(data,availableDocuments,materials,fileAssets,row.version);if(Object.keys(availableDocuments).length)data.qualified=supplemental.qualified;
   const proof:any={code:row.code,version:row.version,manifestSha256:row.manifestSha256,runtimeSha256,sourceRoot:row.packagePath,allProvidedFileHashesMatched:true,independentPrivatePayloadCopy:false,geometry:[],supplemental:supplemental.diagnostics,missingOwnSelectorIndex:!hasSelectors&&!!data.unavailableFinishChoices?.length,unavailableFinishChoices:data.unavailableFinishChoices||[],sourceOnly:true,browserPass:false,publicPass:false,fullGraphPass:false,fullPalettePass:false,NativeAllowed:false};
   if(!values['metadata-only']){
    let old:any;try{old=await json(values.prior+'/'+row.code+'/RESULT.json');}catch{}
    const oldSelector=old?.files.find((f:any)=>f.relative==='selectors.json');const reuse=old?.result==='SCOPED_CHAIR_SOURCE_ADMITTED_NOT_BROWSER_OR_PUBLIC_PASS'&&old.runtimeSha256===runtimeSha256&&oldSelector?.sha256===row.headers['selectors.json'];
    for(const [hash,a]of Object.entries(assets)){
     const r=received.files.find((r:any)=>r.sha256===hash&&r.size===a.bytes),s=rawSelectors.assets[hash];assert(r&&s?.assetSha256===hash,'Runtime OWN selectors absent');
     const oldAsset=reuse&&old.geometry.find((g:any)=>g.sha256===hash&&g.bytes===a.bytes);
     if(oldAsset){proof.geometry.push({...oldAsset,reusedExactOriginalProof:true,priorReceipt:values.prior+'/'+row.code+'/RESULT.json'});continue;}
     const bytes=await read(r.relative);proof.geometry.push({file:r.relative,sha256:hash,bytes:bytes.length,...glbGeometryAdmission(bytes,s)});assert(process.memoryUsage().rss<768*1024*1024,'Source qualifier RSS768MiB');
    }
   }
   await fs.writeFile(out+'/PRIVATE-INPUT.json',JSON.stringify({data,sourceRoot:row.packagePath,manifestSha256:row.manifestSha256,sourceMaterialDocs:materials,proof,metadataOnly:!!values['metadata-only']})+'\n',{flag:'wx'});
   await fs.writeFile(out+'/RESULT.json',JSON.stringify({...proof,result:values['metadata-only']?'METADATA_NORMALIZED_NOT_GEOMETRY_OR_BROWSER_PASS':'BASE_GEOMETRY_ADMITTED_SUPPLEMENTAL_SELECTOR_AND_BROWSER_PENDING'},null,2)+'\n',{flag:'wx'});prepared.push({code:row.code,version:row.version,namespace,input:out+'/PRIVATE-INPUT.json',contexts:runtime.contexts.length,geometryAssets:Object.keys(assets).length,witnesses:data.qualified?.witnesses.length||0,groups:data.qualified?.witnesses.reduce((n,w)=>n+w.groups.length,0)||0});console.log(JSON.stringify(prepared.at(-1)));
  }catch(error){const entry={code:row.code,version:row.version,error:String(error instanceof Error?error.message:error),sourceOnly:true,browserPass:false,publicPass:false};attention.push(entry);await fs.writeFile(out+'/ATTENTION.json',JSON.stringify(entry,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(entry));}
 }
 const result={at:new Date().toISOString(),result:'SELECTED_VERSION_PREPARATION_NOT_PUBLIC_OR_FULL_ACCEPTANCE',metadataOnly:!!values['metadata-only'],prepared,attention,skipped,NativeAllowed:false,Gmodified:false};await fs.writeFile(values.output+'/RESULT.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({prepared:prepared.length,attention:attention.length,skipped:skipped.length}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
