// Stage only sealed full source/geometry/runtime PASS. No Native or copy authoring.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {packChairRuntime,restorePackedAssignments} from './pack-chair-runtime.mjs';
const arg=n=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3);
const root=path.resolve(arg('root')),stage=path.resolve(arg('stage'));
assert(root.startsWith(path.resolve('D:/Core/output')+path.sep));
assert(stage.startsWith(path.resolve('D:/Core/output')+path.sep)&&stage!==root);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const status=await read(path.join(root,'prepared/OFFLINE-STATUS.json'));
const queue=await read(path.join(root,'capture-v2/SOURCE-QUEUE.json'));
const inventory=await read(path.join(root,'INVENTORY.json'));
const jobs=new Map(inventory.queue.map(j=>[j.job,j]));
const selectedJobs=arg('jobs')===undefined?null:new Set(arg('jobs').split(','));
if(selectedJobs){
 assert(selectedJobs.size>0&&[...selectedJobs].every(job=>job&&jobs.has(job)),'Unknown selected job');
 for(const job of selectedJobs)assert(status.rows.some(row=>row.job===job&&row.result==='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY'),'Selected job lacks full offline PASS');
}
const snapshot=await read('content/admin-source-status.json'),models=new Map(snapshot.models.map(m=>[m.key,m]));
await fs.mkdir(stage,{recursive:false});
const assets=path.join(stage,'assets/models/configurator/structure');await fs.mkdir(assets,{recursive:true});
const prior=await read('content/chair-structure-candidates.json');
const manifest={schemaVersion:1,models:{...prior.models}},report={at:new Date().toISOString(),mode:'TECHNICAL_DRAFT',models:[],deferred:[],nativeRequests:0,geminiAuthored:0,fullAcceptanceImplied:false,launchRelease:false};
async function seal(source,target,sha,copy=false){
 const raw=await fs.readFile(source);assert.equal(hash(raw),sha,'Changed staged asset '+source);
 // prepared/runtime.json is mutable across compiler revisions. It must never
 // share an inode with the immutable content-addressed release copy.
 try{if(copy)await fs.writeFile(target,raw,{flag:'wx'});else await fs.link(source,target);}catch(e){if(e.code!=='EEXIST')throw e;assert.equal(hash(await fs.readFile(target)),sha);}
 return raw;
}
for(const row of status.rows){
 if(selectedJobs&&!selectedJobs.has(row.job))continue;
 if(row.result!=='PASS_SOURCE_GEOMETRY_RUNTIME_ONLY')continue;
 const job=jobs.get(row.job);assert(job&&job.modelKeys.length===1);
 const key=job.modelKeys[0],model=models.get(key);
 // A data-only batch cannot downgrade a later editorial acceptance. Previous
 // verified draft entries also stay present while their sources revalidate.
 if(prior.models[key]?.acceptance==='DRAFT_READY')continue;
 assert(model?.active&&model.categorySlug==='kedes'&&!model.productId.toLowerCase().includes('xilium'));
 const source=path.join(root,'capture-v2/source',row.job),prepared=path.join(root,'prepared',row.job);
 assert(queue.completedSource.includes(row.job));
 const cpRaw=await fs.readFile(path.join(source,'CHECKPOINT.json'));assert.equal(hash(cpRaw),row.checkpointSha256);
 const cp=JSON.parse(cpRaw),result=await read(path.join(source,'RESULT.json'));
 assert(result.graph.closed&&result.stopReason===null&&row.artifacts);
 const artifacts=Object.fromEntries(Object.entries(row.artifacts).map(([name,sha])=>[name.replaceAll('\\','/'),sha]));
 for(const [name,sha] of Object.entries(artifacts)){
  assert(/^(?:runtime\.json|GEOMETRY-PBR-PROOF\.json|RUNTIME-PROOF\.json|assets\/K[A-Z0-9]+-[a-f0-9]{20}\.glb)$/.test(name));
  assert.equal(hash(await fs.readFile(path.join(prepared,name))),sha,'Changed acceptance artifact '+name);
 }
 let bytes=await fs.readFile(path.join(prepared,'runtime.json'));const runtime=JSON.parse(bytes),geometry=await read(path.join(prepared,'GEOMETRY-PBR-PROOF.json')),proof=await read(path.join(prepared,'RUNTIME-PROOF.json'));let runtimeTransport;
 assert(geometry.result==='PASS'&&proof.result==='PASS'&&proof.states===Object.keys(cp.states).length&&proof.transitions===cp.edges.length);
 assert(runtime.family.productId===model.productId&&runtime.family.sample===model.configurationId&&runtime.family.baseArticle===job.code&&runtime.family.collectionMode==='structure-only');
 const oversized=[];
 for(const anchor of runtime.family.anchors){
  const file=path.basename(anchor.geometry.asset);assert(/^K[A-Z0-9]+-[a-f0-9]{20}\.glb$/.test(file));
  assert.equal(artifacts['assets/'+file],anchor.geometry.assetSha256);
  if((await fs.stat(path.join(prepared,'assets',file))).size>25*1024*1024)oversized.push(file);
 }
 if(!oversized.length&&bytes.length>8_000_000){
  const originalSha256=hash(bytes),originalBytes=bytes.length,packed=packChairRuntime(runtime);
  assert.deepEqual(restorePackedAssignments(packed.runtime),runtime,'Lossless assignment reconstruction required');
  bytes=Buffer.from(JSON.stringify(packed.runtime));
  runtimeTransport={kind:'unchanged-non-finish-assignments-v1',originalSha256,originalBytes,packedSha256:hash(bytes),packedBytes:bytes.length,removed:packed.removedUnchangedNonFinishAssignments,geometryUnchanged:true,compilerUnchanged:true,limitBytes:8_000_000,semanticVerificationRequired:true};
 }
 if(oversized.length||bytes.length>8_000_000){report.deferred.push({key,code:job.code,reason:oversized.length?'CURRENT_STATIC_TRANSPORT_FILE_LIMIT':'RUNTIME_SIZE_LIMIT',files:[...new Set(oversized)],sourcePreserved:true});continue;}
 const runtimeSha=hash(bytes),runtimeFile=job.code+'-'+runtimeSha.slice(0,20)+'.json';
 if(runtimeTransport)await fs.writeFile(path.join(assets,runtimeFile),bytes,{flag:'wx'});else await seal(path.join(prepared,'runtime.json'),path.join(assets,runtimeFile),runtimeSha,true);
 for(const anchor of runtime.family.anchors){const file=path.basename(anchor.geometry.asset);await seal(path.join(prepared,'assets',file),path.join(assets,file),anchor.geometry.assetSha256);}
 const sourceGeometryRuntime=hash(JSON.stringify({job:row.job,checkpointSha256:row.checkpointSha256,tools:row.tools,artifacts:row.artifacts,wire:row.wire,...(runtimeTransport?{runtimeTransport}: {})}));
 manifest.models[key]={key,productId:model.productId,sample:model.configurationId,code:job.code,familyId:runtime.family.id,collectionMode:'structure-only',acceptance:'TECHNICAL_DRAFT',optionsRequired:runtime.family.anchors.some(a=>Object.keys(a.choices).length>0),runtime:{asset:'/models/configurator/structure/'+runtimeFile,sha256:runtimeSha},proofs:{sourceGeometryRuntime}};
 report.models.push({key,job:row.job,code:job.code,path:model.path,states:proof.states,transitions:proof.transitions,proofSha256:sourceGeometryRuntime,...(runtimeTransport?{runtimeTransport}: {})});
}
assert(report.models.length>0);
await fs.writeFile(path.join(stage,'chair-structure-candidates.json'),JSON.stringify(manifest)+'\n');
await fs.writeFile(path.join(stage,'REPORT.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({models:report.models.length,deferred:report.deferred.length,stage,nativeRequests:0,geminiAuthored:0,launchRelease:false}));
