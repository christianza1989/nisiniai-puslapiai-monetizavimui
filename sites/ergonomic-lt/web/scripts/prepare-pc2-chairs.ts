/** Owner111: immutable, separate chair preparation. No supplier HTTP or upload. */
import {readFile,writeFile,mkdir,stat,statfs,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {validateChairComponents} from '../src/lib/chair-components';
import {chairObservedChoices,chairPreviewAssembly,chairInitialVariants,type ChairPreview,type ChairSelectors} from '../src/lib/chair-preview';
import type {ChairPalette} from '../src/lib/chair-color-admission';

const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const plain=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const canonical=(v:any):string=>JSON.stringify(v,(_k,value)=>plain(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
function assert(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
const first5=['KLYN002WW002','KLYN001WW002','KSOU001WW003','KTRF001WW001','KNAU018WW001'];
const names=['Lynx','Lynx','Souly','Trofi','Naudu'];
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function withoutFile(v:any):any{if(Array.isArray(v))return v.map(withoutFile);if(plain(v))return Object.fromEntries(Object.entries(v).filter(([k])=>k!=='file').map(([k,value])=>[k,withoutFile(value)]));return v;}

function glbAdmission(bytes:Buffer,selectors:ChairSelectors['assets'][string]){
 assert(bytes.readUInt32LE(0)===0x46546c67&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'Invalid GLB2');
 const jsonLength=bytes.readUInt32LE(12);assert(bytes.readUInt32LE(16)===0x4e4f534a&&jsonLength<bytes.length-20,'Invalid GLB JSON');
 const doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8')),binOffset=20+jsonLength;
 assert(bytes.readUInt32LE(binOffset+4)===0x004e4942,'Expected embedded BIN');
 const bin=bytes.subarray(binOffset+8),scene=doc.scenes?.[doc.scene??0];
 assert(scene&&Array.isArray(scene.nodes)&&doc.buffers?.length===1&&!doc.buffers[0].uri,'Unknown GLB buffers/scene');
 assert(!doc.animations?.length&&!doc.skins?.length,'Animated/skinned selectors need separate admission');
 const normalized=(value:any):any=>{
  if(Array.isArray(value))return value.map(normalized);if(!plain(value))return value;
  if('index'in value){
   const t=doc.textures?.[value.index],image=doc.images?.[t?.source],view=doc.bufferViews?.[image?.bufferView];
   assert(t&&image&&view&&view.buffer===0&&!image.uri&&typeof image.mimeType==='string','External or unknown material texture');
   const imageBytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);assert(imageBytes.length===view.byteLength,'Truncated image');
   return {...Object.fromEntries(Object.entries(value).filter(([k])=>k!=='index').map(([k,v])=>[k,normalized(v)])),texture:{image:{bytes:imageBytes.length,mimeType:image.mimeType,sha256:sha(imageBytes)},sampler:doc.samplers?.[t.sampler]||{}}};
  }
  return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,normalized(v)]));
 };
 const seen=new Set<string>(),addresses=new Set<string>();
 for(const slot of selectors.slots){
  assert(hash(slot.selectorId)&&hash(slot.materialId)&&Array.isArray(slot.sourceNodePath)&&slot.sourceNodePath.length===1&&Number.isInteger(slot.sourceNodePath[0])&&Number.isInteger(slot.primitive),'Unknown canonical selector');
  const nodeIndex=slot.sourceNodePath[0],node=doc.nodes?.[nodeIndex],primitive=doc.meshes?.[node?.mesh]?.primitives?.[slot.primitive];
  assert(scene.nodes.includes(nodeIndex)&&node&&!node.children?.length&&!node.translation&&!node.rotation&&!node.scale&&primitive,'Selector does not address a flat original world primitive');
  assert(Array.isArray(slot.transformChain)&&slot.transformChain.length===1&&canonical(slot.transformChain[0].matrix)===canonical(node.matrix||identity),'Original matrix mismatch');
  assert((primitive.mode??4)===4&&primitive.attributes?.POSITION!==undefined,'Unknown primitive mode/positions');
  const address=nodeIndex+':'+slot.primitive;assert(!seen.has(slot.selectorId)&&!addresses.has(address),'Duplicate selector/address');seen.add(slot.selectorId);addresses.add(address);
  assert(canonical(normalized(doc.materials?.[primitive.material]))===canonical(withoutFile(selectors.materials[slot.materialId])),'Original primitive material mismatch');
 }
 const actual=scene.nodes.reduce((count:number,i:number)=>count+(doc.meshes?.[doc.nodes[i]?.mesh]?.primitives?.length||0),0);assert(actual===addresses.size,'Incomplete selector coverage');
 return {originalPrimitives:actual,exactOriginalMatrices:addresses.size,originalMaterialComparisons:addresses.size,geometryBytesUnchanged:true};
}

async function main(){
 const {values}=parseArgs({options:{source:{type:'string'},output:{type:'string'},receipt:{type:'string'},'validate-only':{type:'boolean'},'bind-only':{type:'boolean'},admission:{type:'string'}}});
 assert(values.source&&values.output&&values.receipt,'Required --source --output --receipt');
 // This is preparation/staging: both owner resource floors apply before writes.
 const d=await statfs('D:/'),e=await statfs('E:/');if(!values['validate-only']&&!values['bind-only'])assert(d.bavail*d.bsize>=60_000_000_000,'D60 resource hold');assert(e.bavail*e.bsize>=150_000_000_000,'E150 owner action required');
 const parent=await realpath(path.dirname(values.output));assert(parent.toLowerCase().startsWith('e:\\ergonomic\\'),'All new physical stage files must be E:/Ergonomic');
 const prior=JSON.parse(await readFile(values.receipt,'utf8'));assert(prior.models?.length===5,'Missing original first5 qualification');
 const admission=values.admission?JSON.parse(await readFile(values.admission,'utf8')):undefined;
 if(values['bind-only'])assert(admission?.result==='FIRST5_GLBS_SELECTORS_MATRICES_BASE_PBR_SOURCE_ADMISSION_ONLY'&&admission.entries?.length===5,'Binding requires original selector qualification');
 const prepared=[];
 for(const [index,code]of first5.entries()){
  const root=path.join(values.source,code),manifestBytes=await readFile(path.join(root,'SHA256SUMS.json')),manifest=JSON.parse(manifestBytes.toString('utf8'));
  assert(manifest.code===code&&sha(manifestBytes)===prior.models[index].manifestSha256&&prior.models[index].code===code,'Qualified package changed: '+code);
  const payload=new Map<string,Buffer>();
  for(const [relative,entry]of Object.entries(manifest.files) as [string,{bytes:number;sha256:string}][]){
   assert(!relative.includes('\\')&&!path.isAbsolute(relative)&&relative.split('/').every(p=>p&&p!=='.'&&p!=='..')&&hash(entry.sha256),'Unsafe payload path');
   // The original 455-file qualification is NOREPLAY. Read only inputs needed
   // for the new selector/material proof in validation mode. Staging performs
   // a fresh stream/readback identity check as part of the actual copy.
   if((values['validate-only']||values['bind-only'])&&!relative.endsWith('.json')&&(!relative.endsWith('.glb')||values['bind-only']))continue;
   const file=path.join(root,relative),before=await stat(file),bytes=await readFile(file),after=await stat(file);
   assert(before.size===after.size&&before.mtimeMs===after.mtimeMs&&bytes.length===entry.bytes&&sha(bytes)===entry.sha256,'Payload changed: '+code+'/'+relative);
   assert(!relative.endsWith('.json')||bytes.length<=15_000_000,'JSON15MB');assert(!relative.endsWith('.glb')||bytes.length<=25*1024*1024,'GLB25MiB');payload.set(relative,bytes);
  }
  const runtime=JSON.parse(payload.get('runtime.json')!.toString('utf8'));validateChairComponents(runtime,code);
  const palette=JSON.parse(payload.get('colors.json')!.toString('utf8')) as ChairPalette,selectors=JSON.parse(payload.get('selectors.json')!.toString('utf8')) as ChairSelectors;
  const runtimeSha256=sha(payload.get('runtime.json')!);
  assert(palette.code===code&&palette.runtimeSha256===runtimeSha256&&['chair-colors-full-state-329-v1','chair-colors-observed-partial-344-v1'].includes(palette.schema)&&selectors.schema==='canonical-world-primitive-selectors-329-v1','Chair metadata binding mismatch');
  assert(palette.schema!=='chair-colors-full-state-329-v1'||runtime.contexts.length===1,'Full observed states need one original construction context');
  assert(plain(selectors.assets),'Unknown selectors');
  const namespace='/models/configurator/chairs/'+code+'-'+sha(manifestBytes).slice(0,20),assets:ChairPreview['assets']={},textures:ChairPreview['textures']={},proofs=[];
  for(const c of runtime.contexts)for(const part of [c.invariant,...c.groups.flatMap(g=>g.variants.map(v=>v.asset))])if(part&&!assets[part.sha256]){
   const bytes=payload.get(part.file),entry=manifest.files[part.file];assert(entry?.bytes===part.bytes&&entry.sha256===part.sha256,'Runtime asset manifest mismatch');
   const own=selectors.assets[part.sha256];assert(own&&own.assetSha256===part.sha256&&Array.isArray(own.slots),'Own selectors absent');
   if(values['bind-only'])assert(admission.entries[index].code===code&&admission.entries[index].manifestSha256===sha(manifestBytes),'Selector admission source mismatch');
   else{assert(bytes&&bytes.length===part.bytes&&sha(bytes)===part.sha256,'Runtime asset mismatch');proofs.push(glbAdmission(bytes,own));}
   assets[part.sha256]={asset:namespace+'/'+part.file,assetSha256:part.sha256,bytes:part.bytes};
  }
  assert(Object.keys(assets).sort().join()===Object.keys(selectors.assets).sort().join(),'Selectors include foreign assets');
  for(const [relative,entry]of Object.entries(manifest.files) as [string,{bytes:number;sha256:string}][])if(relative.startsWith('library/textures/'))textures[entry.sha256]={asset:namespace+'/'+relative,sha256:entry.sha256,bytes:entry.bytes};
  const materialDocs:Record<string,unknown>={};
  for(const [relative,bytes]of payload)if(/^library\/materials\/[a-f0-9]{64}\.json$/.test(relative)){const id=relative.split('/').at(-1)!.slice(0,-5);assert(sha(bytes)===id,'Material library SHA mismatch');materialDocs[id]=JSON.parse(bytes.toString('utf8'));}
  const states=palette.schema==='chair-colors-full-state-329-v1'?Object.values(palette.records).map(r=>r.binding):palette.observedPairs;
  for(const state of states){assert(Array.isArray(state.bindings),'Unknown bound state');if(state.status!=='EXACT_SAVED_PAIR_OWN_RUNTIME_BINDINGS'){assert(state.bindings.length===0,'Unsupported state contains assignments');continue;}assert(plain(state.materials),'Bound state has no PBR documents');for(const binding of state.bindings){assert(hash(binding.materialId)&&canonical(materialDocs[binding.materialId])===canonical(state.materials![binding.materialId]),'State material differs from own library');}}
  const bundle:ChairPreview={schema:'pc2-chair-review-111-v1',code,name:names[index],runtimeSha256,runtime,palette,selectors,assets,textures};
  // Exhaustively check the small supplied context/observed-choice boundary.
  // This does not expand the supplier graph or claim a full palette.
  const choices=chairObservedChoices(bundle);let applicable=0,unavailable=0;
  runtime.contexts.forEach((_c,n)=>choices.forEach(choice=>{const plan=chairPreviewAssembly(bundle,n,chairInitialVariants(bundle,n),choice).chairColors.plan;if(plan.status==='observed-state')applicable++;else if(plan.status==='unavailable')unavailable++;}));
  assert(applicable>0,'No admitted original observed colour state: '+code);
  prepared.push({bundle,namespace,payload,proof:{code,manifestSha256:sha(manifestBytes),payloadFiles:payload.size,payloadBytes:[...payload.values()].reduce((n,b)=>n+b.length,0),contexts:runtime.contexts.length,geometry:proofs,observedChoices:choices.length-1,applicableContextChoices:applicable,unavailableContextChoices:unavailable,fullPalettePass:false,fullGraphPass:false}});
 }
 if(values['bind-only']){
  const entries=prepared.map(item=>{const bytes=Buffer.from(JSON.stringify(item.bundle)),digest=sha(bytes);return {code:item.bundle.code,name:item.bundle.name,asset:item.namespace+'/review-'+digest.slice(0,20)+'.json',sha256:digest,bytes:bytes.length};});
  await writeFile('content/pc2-chair-review-candidates.json',JSON.stringify({schema:'pc2-first5-review-111-v1',acceptance:'LOCAL_TECHNICAL_REVIEW_ONLY',rendererOwnerApprovalRequired:true,entries},null,2)+'\n');
  console.log(JSON.stringify({result:'FIRST5_SOURCE_BINDINGS_ONLY_NO_STAGE_OR_BUILD',entries},null,2));return;
 }
 if(values['validate-only']){console.log(JSON.stringify({result:'FIRST5_GLBS_SELECTORS_MATRICES_BASE_PBR_SOURCE_ADMISSION_ONLY',stagedFiles:0,browserPass:false,freeD:d.bavail*d.bsize,freeE:e.bavail*e.bsize,entries:prepared.map(p=>p.proof)},null,2));return;}
 // No partial output before every package has passed source admission.
 await mkdir(values.output,{recursive:false});const entries=[];
 for(const item of prepared){
  const root=path.join(values.output,item.namespace);for(const [relative,bytes]of item.payload){const file=path.join(root,relative);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes,{flag:'wx'});assert(sha(await readFile(file))===sha(bytes),'Stage readback mismatch');}
  const bytes=Buffer.from(JSON.stringify(item.bundle)),digest=sha(bytes),asset=item.namespace+'/review-'+digest.slice(0,20)+'.json';assert(bytes.length<=15_000_000,'Bundle JSON15MB');await writeFile(path.join(values.output,asset),bytes,{flag:'wx'});entries.push({code:item.bundle.code,name:item.bundle.name,asset,sha256:digest,bytes:bytes.length,proof:item.proof});
 }
 await writeFile(path.join(values.output,'PC2-FIRST5-REVIEW.json'),JSON.stringify({schema:'pc2-first5-review-111-v1',acceptance:'LOCAL_TECHNICAL_REVIEW_ONLY',rendererOwnerApprovalRequired:true,entries},null,2),{flag:'wx'});
 console.log(JSON.stringify({result:'FIRST5_STAGED_SOURCE_AND_SELECTOR_ADMISSION_NOT_BROWSER_PASS',output:values.output,entries},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
