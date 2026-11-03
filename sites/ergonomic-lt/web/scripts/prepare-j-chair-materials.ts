/** Receive versioned PC2 material deltas. Existing geometry is reused by exact
 * own runtime/asset identity; newly supplied selectors get their own admission.
 * No source copying, factory calls, Native or producer WHOLE replay. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {validateChairReviewComponents} from '../src/lib/chair-components';
import {qualifiedChairPlan,qualifiedDefaultSelection} from '../src/lib/chair-qualified-colors';
import type {ChairPreview} from '../src/lib/chair-preview';
import {originalOnlyPalette} from './prepare-ready-review-inventory';
import {normalizeReadyChairPalettes} from './normalize-ready-chair-palettes';
import {glbGeometryAdmission,opaqueGlbAdmission} from './prepared-review-glb-admission';
import {retainQualifiedScopes} from './prepared-chair-qualified-union';
import {priorLosslessBindings,rebindLosslessRuntime,rebindLosslessSelectors,rebindLosslessQualified,decodeForNewSelectors} from './prepared-lossless-chair-binding';
import {conditionalChairAdmission,conditionalChairContractDisplay} from './conditional-chair-finish-contexts';
import {remainingChairScopePins,assertRemainingChairHeaders,calibratedChairLibrary,savedAutoChairState} from './remaining-chair-scope-admissions';

const sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const canonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const relative=(s:string)=>!path.isAbsolute(s)&&!s.includes('\\')&&s.split('/').every(p=>p&&p!=='.'&&p!=='..');
const json=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const identity=(s:any)=>({dev:s.dev,ino:s.ino,size:s.size,mtimeMs:s.mtimeMs});
const same=(a:any,b:any)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs;
async function bounded<T>(rows:T[],fn:(row:T)=>Promise<unknown>){let cursor=0;await Promise.all(Array.from({length:Math.min(8,rows.length)},async()=>{while(cursor<rows.length)await fn(rows[cursor++]);}));}
function primaryContract(p:any){
 if(p.schema==='chair-base-observed-colours-v1')return p;
 return Object.fromEntries((p.schema==='chair-colors-full-state-329-v1'?['schema','code','runtimeSha256','records','selectionLinks']:['schema','code','runtimeSha256','actualPaletteComplete','observedPairs']).map(k=>[k,p[k]]));
}

async function main(){
 const {values}=parseArgs({options:{index:{type:'string'},'asset-map':{type:'string'},only:{type:'string'},output:{type:'string'},lossless:{type:'string'},registry:{type:'string'}}});
 assert(values.index&&values['asset-map']&&values.only&&values.output,'Required --index --asset-map --only --output');
 const e=await fs.statfs('E:/'),d=await fs.statfs('D:/');assert(e.bavail*e.bsize>=150e9&&d.bavail*d.bsize>=60e9,'E150/D60');
 assert((await fs.realpath(path.dirname(values.output))).toLowerCase().startsWith('e:\\ergonomic\\'),'Physical output must remain on E:/Ergonomic');
 await fs.mkdir(values.output,{recursive:false});
 const indexBytes=await fs.readFile(values.index),index=JSON.parse(indexBytes.toString()),baseMap=await json(values['asset-map']);
 assert(index.schema==='chair-public-j-package-index-560-v1');
 const registry=await json(values.registry||'content/pc2-chair-review-candidates.json'),prepared:any[]=[],attention:any[]=[];
 const existingBlobs=new Map<string,{url:string;entry:any}>();
 for(const [url,entry]of Object.entries(baseMap)as[string,any][])if(/^\/(models|media)\//.test(url)&&entry.sha256)existingBlobs.set(entry.sha256+':'+entry.size,{url,entry});
 const codes=values.only.split(',');assert(new Set(codes).size===codes.length&&codes.every(c=>/^K[A-Z0-9]+$/.test(c)));
 for(const code of codes){
  const out=path.join(values.output,code);await fs.mkdir(out,{recursive:false});
  try{
   const selected=index.packages.find((p:any)=>p.code===code)?.latestVersion;assert(selected&&relative(selected.packagePath),'Missing J version');
   const additional=remainingChairScopePins[code]?.version===selected.version?remainingChairScopePins[code]:undefined;
   const root=path.join(path.dirname(values.index),selected.packagePath),manifestBytes=await fs.readFile(root+'/SHA256SUMS.json');
   assert.equal(sha(manifestBytes),selected.manifestSha256);const manifest=JSON.parse(manifestBytes.toString());
   assert.equal(manifest.code,code);assert.equal(manifest.version,selected.version);
   for(const [file,m]of Object.entries(manifest.files)as[string,any][]){
    assert(relative(file)&&/^[a-f0-9]{64}$/.test(m.sha256)&&Number.isSafeInteger(m.bytes)&&m.bytes>0,'Unsafe manifest entry');
    assert(!file.endsWith('.glb')||m.bytes<=25*1024*1024||values.lossless&&['KJUP001WW002','KUTI005WW001','KNXT002WW002'].includes(code)&&m.bytes<=55_000_000,'GLB25MiB');assert(!file.endsWith('.json')||m.bytes<=15_000_000,'JSON15MB');
   }
   const files:any[]=[],fileReceipts=new Map<string,any>(),newAssets:Record<string,any>={},readCache=new Map<string,Buffer>();
   async function read(file:string){
    if(readCache.has(file))return readCache.get(file)!;
    const expected=manifest.files[file];assert(expected,'Undeclared input '+file);const full=path.join(root,file),before=await fs.stat(full);
    assert.equal(before.size,expected.bytes);const bytes=await fs.readFile(full),after=await fs.stat(full);
    assert(same(before,after)&&bytes.length===expected.bytes&&sha(bytes)===expected.sha256,'Changed J input '+file);
    const row={relative:file,file:full,sha256:expected.sha256,...identity(after)};files.push(row);fileReceipts.set(file,row);
    if(file.endsWith('.json'))readCache.set(file,bytes);return bytes;
   }
   const oldEntry=registry.entries.find((r:any)=>r.code===code);assert(oldEntry,'New model requires separate base admission');
   const oldRef=baseMap[oldEntry.asset];assert(oldRef&&oldRef.sha256===oldEntry.sha256&&oldRef.size===oldEntry.bytes);
   const oldBytes=await fs.readFile(oldRef.file);assert.equal(sha(oldBytes),oldEntry.sha256);const old=JSON.parse(oldBytes.toString())as ChairPreview;
   const lossless=values.lossless?await priorLosslessBindings(values.lossless,old):new Map();
   for(const [file,m]of Object.entries(manifest.files)as[string,any][])if(file.endsWith('.glb')&&m.bytes>25*1024*1024)assert(lossless.get(m.sha256)?.proof.sourceBytes===m.bytes,'Oversized RAW input lacks a prior exact published transport');
   const runtimeBytes=await read('runtime.json'),rawRuntime=JSON.parse(runtimeBytes.toString()),runtime=lossless.size?rebindLosslessRuntime(rawRuntime,old,lossless):rawRuntime;validateChairReviewComponents(runtime,code);
   assert((lossless.size||sha(runtimeBytes)===old.runtimeSha256)&&canonical(runtime)===canonical(old.runtime),'Changed base runtime needs separate base admission');
   const rawPalette=JSON.parse((await read('colors.json')).toString()),rawSelectors=JSON.parse((await read('selectors.json')).toString());
   assert(rawSelectors.schema==='canonical-world-primitive-selectors-329-v1'&&rawSelectors.assets,'Missing original selectors');
   const palette=['chair-colors-full-state-329-v1','chair-colors-observed-partial-344-v1'].includes(rawPalette.schema)?rawPalette:originalOnlyPalette(rawPalette,code,old.runtimeSha256);
   if(lossless.size&&palette.schema==='chair-colors-observed-partial-344-v1'){
    assert.equal(palette.runtimeSha256,sha(runtimeBytes),'Original palette runtime differs from exact transport source');palette.runtimeSha256=old.runtimeSha256;
    for(const pair of palette.observedPairs)for(const binding of pair.bindings){
     const proved=lossless.get(binding.assetSha256);if(proved)binding.assetSha256=proved.target;
    }
   }
   if(additional?.kind==='calibrated-library'){
    assert(palette.schema==='chair-base-observed-colours-v1'&&old.palette.schema==='chair-base-observed-colours-v1','Calibrated update requires the original-only baseline');
    const baseline=(p:any)=>Object.fromEntries(Object.entries(p.baselineObservedFinish).map(([field,v]:[string,any])=>[field,v.value]));
    assert(canonical(baseline(palette))===canonical(baseline(old.palette)),'Calibrated package changed an original finish');
   }else assert(canonical(primaryContract(palette))===canonical(primaryContract(old.palette)),'Changed prior palette needs explicit scope reconciliation');
   const namespace='/models/configurator/chairs/'+code+'-'+selected.manifestSha256.slice(0,20);
   const assets:ChairPreview['assets']={},textures={...old.textures},fileAssets:Record<string,any>={},materials:Record<string,unknown>={},documents:Record<string,any>={};
   const oldAssets={...old.assets,...old.qualified?.extraAssets};
   for(const c of rawRuntime.contexts)for(const a of [c.invariant,...c.groups.flatMap((g:any)=>g.variants.map((v:any)=>v.asset))])if(a){
    const mapped=lossless.get(a.sha256),target=mapped?.target||a.sha256,m=manifest.files[a.file],prior=old.assets[target];assert(m?.sha256===a.sha256&&m.bytes===a.bytes&&prior?.bytes===(mapped?.bytes||a.bytes),'Runtime geometry changed');
    assets[target]=prior;
   }
   const supplemental=(file:string)=>/^(colors-.+\.json|conditional-context\.json|GROUP-PALETTE-VERIFIED-SAFE\.json)$/.test(file);
   if(additional)await bounded(Object.keys(additional.headers).filter(file=>file!=='SHA256SUMS.json'),read);
   await bounded(Object.keys(manifest.files).filter(file=>/^library\/materials\/[a-f0-9]{64}\.json$/.test(file)||supplemental(file)),read);
   for(const [file,m]of Object.entries(manifest.files)as[string,any][]){
    if(file.endsWith('.glb'))fileAssets[file]=oldAssets[m.sha256]?.bytes===m.bytes?oldAssets[m.sha256]:{asset:namespace+'/source/'+file,assetSha256:m.sha256,bytes:m.bytes};
    if(/^library\/materials\/[a-f0-9]{64}\.json$/.test(file)){const b=await read(file),id=path.basename(file,'.json');assert.equal(sha(b),id);materials[id]=JSON.parse(b.toString());}
    if(supplemental(file))documents[file]=JSON.parse((await read(file)).toString());
    if(/\.(png|jpe?g|webp)$/i.test(file)){
     const existing=existingBlobs.get(m.sha256+':'+m.bytes);
     if(existing){assert(same(await fs.stat(existing.entry.file),existing.entry),'Existing immutable image changed');textures[m.sha256]={asset:existing.url,sha256:m.sha256,bytes:m.bytes};}
     else{await read(file);const row=fileReceipts.get(file);const url=namespace+'/source/'+file;newAssets[url]=row;textures[m.sha256]={asset:url,sha256:m.sha256,bytes:m.bytes};}
    }
   }
   const cert=documents['GROUP-PALETTE-VERIFIED-SAFE.json'],pin=conditionalChairAdmission(code,documents['colors-groups.json']?.schema),finite=!!pin,conditional=finite||documents['colors-groups.json']?.schema==='chair-qualified-conditional-context-palette-4181-v1';
   if(additional){
    assertRemainingChairHeaders(code,selected.version,selected.manifestSha256,fileReceipts);
    if(additional.kind==='calibrated-library')calibratedChairLibrary(old,documents['colors-reuse.json']);
    else{
     assert(additional.kind==='saved-auto-state','New OWN runtime requires separate base admission');savedAutoChairState(old,documents['colors-saved-auto-construction-swaps.json']);
     const qualified=JSON.parse((await read('selectors-auto-swap-qualification.json')).toString()),extra=JSON.parse((await read('selectors-auto-swap.json')).toString());
     assert(qualified.pass===true&&qualified.code===code&&qualified.runtimeSha256===old.runtimeSha256&&qualified.allOriginalNodePathsWorldMatricesAndPrimitiveCountersVerified===true&&qualified.selectorsSha256===fileReceipts.get('selectors-auto-swap.json')?.sha256&&extra.schema==='canonical-world-primitive-selectors-329-v1','Automatic saved-state selectors are not qualified');
     for(const [hash,s]of Object.entries(extra.assets)as[string,any][]){
      const prior=rawSelectors.assets[hash];if(!prior){rawSelectors.assets[hash]=s;continue;}
      for(const slot of s.slots){const sameId=prior.slots.find((p:any)=>p.selectorId===slot.selectorId);assert(!sameId||canonical(sameId)===canonical(slot),'Automatic OWN selector changed an existing address');if(!sameId)prior.slots.push(slot);}
      for(const [id,material]of Object.entries(s.materials||{})){assert(!prior.materials?.[id]||canonical(prior.materials[id])===canonical(material),'Automatic original material changed');prior.materials??={};prior.materials[id]=material;}
     }
    }
   }else assert(cert?.pass===true&&cert.noDonorGeometry===true&&cert.code===code&&(conditional?cert.conditionalScopeKind===(finite?pin.kind:'QUALIFIED_CONDITIONAL_BJA3_74_OWN_4181')&&cert.qualifiedConditionalFinishContextComplete===true&&cert.qualifiedWitnessGroupPaletteComplete===false:cert.qualifiedWitnessGroupPaletteComplete===true),'Missing OWN scoped producer certificate');
   if(finite){
    assert.equal(selected.manifestSha256,pin.manifest,'Conditional manifest is not the explicitly admitted version');
    assert.equal(selected.version,pin.version,'Conditional package version differs');
    assert.equal(documents['conditional-context.json'][pin.qualification],fileReceipts.get('GROUP-PALETTE-VERIFIED-SAFE.json')?.sha256,'Conditional qualification certificate SHA differs');
    if(pin.contractSha256)assert.equal(fileReceipts.get('conditional-context.json')?.sha256,pin.contractSha256,'Conditional exact contract SHA differs');
   }
   const displayContract=finite?conditionalChairContractDisplay(code,selected.version,selected.manifestSha256,fileReceipts.get('conditional-context.json')!.sha256,documents['conditional-context.json']):undefined;
   for(const [hash,prior]of Object.entries(old.selectors.assets)){
    const current=rawSelectors.assets[hash];
    if(!current){rawSelectors.assets[hash]=prior;continue;}
    // Old choices must keep their exact addresses and original slot materials.
    for(const slot of prior.slots)assert(current.slots.some((s:any)=>canonical(s)===canonical(slot)),'Prior OWN selector changed');
   }
   const selectors=lossless.size?rebindLosslessSelectors(rawSelectors,lossless):rawSelectors;
   const data:ChairPreview={...old,runtime,palette:old.palette,selectors,assets,textures};
   const normalizeSource=lossless.size?{...data,runtime:rawRuntime,runtimeSha256:sha(runtimeBytes),selectors:rawSelectors}:data;
   const normalized=normalizeReadyChairPalettes(normalizeSource,documents,materials,fileAssets,selected.version);
   const fresh=lossless.size?rebindLosslessQualified(normalized.qualified,old.runtimeSha256,lossless):normalized.qualified;
   const q=retainQualifiedScopes(fresh,old.qualified);
   data.qualified=q;
   // Original-only contexts keep their already admitted geometry. Project
   // new selectors only where a complete supplied witness can use them.
   // This avoids re-admitting hundreds of untouched construction variants.
   const needed=new Set(q.witnesses.flatMap(w=>w.requiredAssets));
   for(const w of q.witnesses){
    const patches=[...w.groups.flatMap(g=>g.options.map(o=>o.patch)),...w.singles.map(s=>s.patch),...w.branches.flatMap(b=>[b.patch,...b.groups.flatMap(g=>g.options.map(o=>o.patch))])];
    for(const p of patches)for(const t of [...p.bindings,...p.remove])needed.add(t.assetSha256);
   }
   data.selectors={...selectors,assets:{...old.selectors.assets,...Object.fromEntries(Object.entries(selectors.assets).filter(([h])=>needed.has(h)))}};
   const selectorProofs:any[]=[];
   for(const [hash,a]of Object.entries(assets)){
    const selectors=data.selectors.assets[hash];
    const row=baseMap[a.asset];assert(row&&row.sha256===hash&&row.size===a.bytes&&same(await fs.stat(row.file),row),'Published base identity changed');
    if(!selectors){const nxt=code==='KNXT002WW002'&&lossless.size===9&&old.palette.schema==='chair-colors-observed-partial-344-v1'&&old.runtimeSha256==='c34242487c4332706adfbe3fc1f62a9bad6e7f2b70ba97d15ff2132289245053';assert((old.palette.schema==='chair-base-observed-colours-v1'||nxt)&&!needed.has(hash),'Missing OWN bound selectors');selectorProofs.push({sha256:hash,reusedPriorOriginalOnlyAdmission:true});continue;}
    assert(selectors.assetSha256===hash,'Missing OWN base selectors');
    if(old.selectors.assets[hash]&&canonical(old.selectors.assets[hash])===canonical(selectors))selectorProofs.push({sha256:hash,reusedExactPriorSelectors:true});
    else{
     const binding=[...lossless.values()].find(p=>p.target===hash);
     const b=binding?await decodeForNewSelectors(binding,baseMap,a.asset):await fs.readFile(row.file);if(!binding)assert.equal(sha(b),hash);
     selectorProofs.push({sha256:hash,...glbGeometryAdmission(b,selectors),newSelectorAdmission:true,...binding?{rawSha256:binding.source,losslessReceiptSha256:binding.receiptSha256,decodedOnlyForNewSelectors:true}:{}});
    }
   }
   const extraProofs:any[]=[];
   for(const file of normalized.usedAdditionalFiles){
    const m=manifest.files[file],a=q.extraAssets[m.sha256];assert(a&&a.bytes===m.bytes,'Additional OWN identity mismatch');
    const prior=oldAssets[m.sha256],oldRow=prior&&baseMap[prior.asset];
    if(prior&&oldRow&&oldRow.sha256===m.sha256&&oldRow.size===m.bytes&&same(await fs.stat(oldRow.file),oldRow)){
     assert(!data.selectors.assets[m.sha256]||canonical(data.selectors.assets[m.sha256])===canonical(old.selectors.assets[m.sha256]),'Additional selectors changed');
     extraProofs.push({file,sha256:m.sha256,reusedExactPriorOwnAsset:true});continue;
    }
    const b=await read(file),s=data.selectors.assets[m.sha256];
    extraProofs.push({file,sha256:m.sha256,...(q.opaqueAssets.includes(m.sha256)?opaqueGlbAdmission(b):glbGeometryAdmission(b,s))});
    newAssets[a.asset]=fileReceipts.get(file);
   }
   let options=0;
   for(const w of q.witnesses){
    assert(!w.branches.length,'Conditional branch update needs separate scope reconciliation');
    const base=qualifiedDefaultSelection(w);
    for(const g of w.groups)for(const o of g.options){const s={...base,kind:'groups' as const,groups:{...base.groups,[g.id]:o.id}};assert(qualifiedChairPlan(data,w.context,w.variants,w.requiredAssets,s).status!=='unavailable','Unadmitted group option');options++;}
    for(const o of w.singles){assert(qualifiedChairPlan(data,w.context,w.variants,w.requiredAssets,{...base,kind:'single',single:o.id}).status!=='unavailable','Unadmitted whole tuple option');options++;}
   }
   const bytes=Buffer.from(JSON.stringify(data)+'\n');assert(bytes.length<=15_000_000,'Review JSON15MB');
   const reviewSha=sha(bytes),reviewFile=path.join(out,'review-'+reviewSha.slice(0,20)+'.json'),url=namespace+'/review-'+reviewSha.slice(0,20)+'.json';
   await fs.writeFile(reviewFile,bytes,{flag:'wx'});const s=await fs.stat(reviewFile);newAssets[url]={file:reviewFile,sha256:reviewSha,...identity(s)};
   const entry={...oldEntry,asset:url,sha256:reviewSha,bytes:bytes.length,version:selected.version};
   const proof={code,version:selected.version,indexSha256:sha(indexBytes),manifestSha256:selected.manifestSha256,oldReviewSha256:oldEntry.sha256,runtimeSha256:old.runtimeSha256,
    sourceRuntimeSha256:sha(runtimeBytes),losslessRuntimeBindings:[...lossless.values()].map(p=>({rawSha256:p.source,transportSha256:p.target,receiptSha256:p.receiptSha256})),
    newSelectorProofs:selectorProofs,extraOwnAssetProofs:extraProofs,qualifiedWitnesses:q.witnesses.length,retainedPriorQualifiedScopes:old.qualified?.witnesses.length||0,groupOptions:options,usedInputs:files,originalGeometryCopies:0,NativeRequests:0,producerWholeReplayed:false,
    ...(displayContract?.corrected?{exactDisplayErratum:displayContract}:{}),fullPalettePass:false,browserPass:false,publicPass:false,result:'SCOPED_MATERIAL_UPDATE_SOURCE_ADMITTED'};
   await fs.writeFile(out+'/RESULT.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
   await fs.writeFile(out+'/ASSET-ROWS.json',JSON.stringify(newAssets,null,2)+'\n',{flag:'wx'});
   await fs.writeFile(out+'/ENTRY.json',JSON.stringify(entry,null,2)+'\n',{flag:'wx'});
   prepared.push({code,version:selected.version,options,selectorAssets:selectorProofs.length,newAssetRows:Object.keys(newAssets).length,entry:out+'/ENTRY.json'});console.log(JSON.stringify(prepared.at(-1)));
  }catch(e){const row={code,error:String(e instanceof Error?e.message:e),browserPass:false,publicPass:false};attention.push(row);await fs.writeFile(out+'/ATTENTION.json',JSON.stringify(row,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(row));}
 }
 await fs.writeFile(values.output+'/RESULT.json',JSON.stringify({prepared,attention,NativeAllowed:false,publicationApproved:false},null,2)+'\n',{flag:'wx'});
}
main().catch(e=>{console.error(e);process.exitCode=1;});
