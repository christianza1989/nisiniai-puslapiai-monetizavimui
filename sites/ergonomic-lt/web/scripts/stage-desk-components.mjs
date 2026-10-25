import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateDeskComponents,deskReferencedAssets,deskAssetReference} from '../src/lib/desk-components.ts';

// Only a supplied completed package is read. No supplier requests or Native
// state/queue/session access, resampling, compression or geometry rewriting.
const args=Object.fromEntries(process.argv.slice(2).map(v=>{const p=v.indexOf('=');return [v.slice(2,p),v.slice(p+1)];}));
assert(args.package&&args.out,'--package=DIR --out=NEW_DIR required');
const root=path.resolve(args.package),out=path.resolve(args.out),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});await writeFile(path.join(out,'STAGE-ONCE.claim'),new Date().toISOString(),{flag:'wx'});
const runtimeBytes=await readFile(path.join(root,'runtime.json')),infoBytes=await readFile(path.join(root,'INFO.json'));
const info=JSON.parse(infoBytes),runtime=JSON.parse(runtimeBytes);
assert.equal(info.code,'KEM2013WW004');assert.equal(info.status,'COMPONENT_HYBRID_RUNTIME_PASS');assert.equal(info.runtimePass,true);assert.equal(info.fullGraphPass,false);assert.equal(info.sourceCollectionComplete,true);assert.equal(info.needsCompression,false);assert.deepEqual(info.missing3D,[]);
assert.equal(info.runtimeSha256,hash(runtimeBytes));assert.equal(info.runtimeBytes,runtimeBytes.length);validateDeskComponents(runtime,info.code);
const referenced=deskReferencedAssets(runtime),expected=new Map(info.glbs.map(a=>[a.file,a]));
assert.equal(expected.size,info.glbs.length);assert.equal(referenced.length,expected.size);assert.equal(info.states,runtime.contexts.length);
const assets=path.join(out,'assets'),rows=[];let bytes=0;
for(const a of referenced){
 const recorded=expected.get(a.file);assert(recorded&&recorded.bytes===a.bytes&&recorded.sha256===a.sha256,'Package asset manifest mismatch');
 const input=path.resolve(root,a.file);assert(input.startsWith(root+path.sep),'Asset path escapes package');
 const original=await readFile(input);assert.equal(original.length,a.bytes);assert.equal(hash(original),a.sha256);
 assert.equal(original.readUInt32LE(0),0x46546c67);assert.equal(original.readUInt32LE(4),2);assert.equal(original.readUInt32LE(8),original.length);assert.equal(original.readUInt32LE(16),0x4e4f534a);
 const document=JSON.parse(original.subarray(20,20+original.readUInt32LE(12)).toString('utf8'));
 assert.equal(document.asset.version,'2.0');
 for(const item of [...document.buffers||[],...document.images||[]])assert(!item.uri||/^data:/.test(item.uri),'External GLB resource is not admitted');
 const ref=deskAssetReference(info.code,a),target=path.join(assets,ref.asset);await mkdir(path.dirname(target),{recursive:true});
 try{await copyFile(input,target,constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;assert.equal(hash(await readFile(target)),a.sha256);}
 assert.equal(hash(await readFile(target)),a.sha256);bytes+=original.length;rows.push({source:a.file,...ref});
}
assert.equal(info.glbBytes,bytes);assert.deepEqual([...new Set(runtime.contexts.flatMap(c=>Object.keys(c.textOnly)))].sort(),[...info.textOnlyFields].sort());
const runtimeSha=hash(runtimeBytes),runtimeAsset='/models/configurator/components/'+info.code+'-'+runtimeSha.slice(0,20)+'.json',target=path.join(assets,runtimeAsset);await writeFile(target,runtimeBytes,{flag:'wx'});assert.equal(hash(await readFile(target)),runtimeSha);
const report={at:new Date().toISOString(),result:'PASS_ORIGINAL_DESK_PACKAGE_ONLY',code:info.code,sourceRuntimeSha256:runtimeSha,sourceInfoSha256:hash(infoBytes),runtime:{asset:runtimeAsset,sha256:runtimeSha,bytes:runtimeBytes.length},contexts:runtime.contexts.length,glbs:rows.length,glbBytes:bytes,assets:rows,coordinates:runtime.coordinates,fullGraphPass:false,fullAcceptance:false,Launch:false,noNativeChange:true,originalGlbBytesUnchanged:true};
const reportBytes=Buffer.from(JSON.stringify(report,null,2)+'\n');await writeFile(path.join(out,'PACKAGE-PROOF.json'),reportBytes,{flag:'wx'});
console.log(JSON.stringify({result:report.result,contexts:report.contexts,glbs:report.glbs,glbBytes:report.glbBytes,proofSha256:hash(reportBytes),fullGraphPass:false}));
