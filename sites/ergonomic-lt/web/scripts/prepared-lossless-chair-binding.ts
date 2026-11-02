import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import type {ChairPreview,ChairSelectors} from '../src/lib/chair-preview';
import type {ChairQualifiedData} from '../src/lib/chair-qualified-colors';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const canonical=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
const same=(a:any,b:any)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs;
export type LosslessBinding={source:string;target:string;bytes:number;proof:any;receiptSha256:string;receipt:string};
export async function priorLosslessBindings(file:string,old:ChairPreview){
 assert(['KJUP001WW002','KUTI005WW001'].includes(old.code),'Only the two original-only lossless packages');
 assert(old.palette.schema==='chair-base-observed-colours-v1'&&!old.qualified?.witnesses.length,'New binding requires an original-only prior package');
 const result=JSON.parse(await fs.readFile(file,'utf8')),out=new Map<string,LosslessBinding>();
 assert(result.allFilesWithin25MiB===true&&result.originalsModified===false&&result.NativeAllowed===false);
 for(const row of result.assets.filter((r:any)=>r.code===old.code)){
  const bytes=await fs.readFile(row.proof),p=JSON.parse(bytes.toString()),a=old.assets[row.derivedSha256];
  assert(p.code===old.code&&p.sourceSha256===row.sourceSha256&&p.derivedSha256===row.derivedSha256&&p.sourceBytes===row.sourceBytes&&p.derivedBytes===row.derivedBytes,'Lossless receipt identity changed');
  assert(p.allDecodedBufferBytesExactlyEqual===true&&p.sceneMaterialsMatricesIdsExactlyEqual===true&&p.quantization===false&&p.simplification===false&&p.reordered===false&&p.sourceBytes<=55_000_000,'Prior source equivalence absent');
  assert(a?.assetSha256===p.derivedSha256&&a.bytes===p.derivedBytes&&a.bytes<=25*1024*1024,'Prior published transport differs');
  assert(!out.has(p.sourceSha256),'Duplicate raw identity');out.set(p.sourceSha256,{source:p.sourceSha256,target:p.derivedSha256,bytes:p.derivedBytes,proof:p,receipt:row.proof,receiptSha256:sha(bytes)});
 }
 assert(out.size>0);return out;
}
export function rebindLosslessRuntime(raw:any,old:ChairPreview,map:Map<string,LosslessBinding>){
 const runtime=structuredClone(raw);
 for(const c of runtime.contexts)for(const a of [c.invariant,...c.groups.flatMap((g:any)=>g.variants.map((v:any)=>v.asset))]){
  if(!a)continue;const p=map.get(a.sha256);if(!p)continue;
  assert(a.bytes===p.proof.sourceBytes&&a.needsCompression===true,'Raw runtime differs from the verified original');a.sha256=p.target;a.bytes=p.bytes;a.needsCompression=false;
 }
 assert(canonical(runtime)===canonical(old.runtime),'Lossless-only changes do not explain the runtime delta');return old.runtime;
}
export function rebindLosslessSelectors(raw:ChairSelectors,map:Map<string,LosslessBinding>):ChairSelectors{
 return {...raw,assets:Object.fromEntries(Object.entries(raw.assets).map(([h,s])=>{const target=map.get(h)?.target||h;return [target,{...s,assetSha256:target}];}))};
}
export function rebindLosslessQualified(raw:ChairQualifiedData,targetRuntimeSha:string,map:Map<string,LosslessBinding>):ChairQualifiedData{
 assert(Object.keys(raw.extraAssets).length===0,'Lossless rebinding does not grant additional geometry');
 const q=structuredClone(raw),target=(h:string)=>map.get(h)?.target||h;q.runtimeSha256=targetRuntimeSha;
 for(const w of q.witnesses){w.requiredAssets=w.requiredAssets.map(target);for(const patch of [...w.groups.flatMap(g=>g.options.map(o=>o.patch)),...w.singles.map(s=>s.patch),...w.branches.flatMap(b=>[b.patch,...b.groups.flatMap(g=>g.options.map(o=>o.patch))])])for(const b of [...patch.bindings,...patch.remove])b.assetSha256=target(b.assetSha256);}
 for(const s of q.legacyScopes)s.requiredAssets=s.requiredAssets.map(target);return q;
}
/** Decode only for newly supplied selector admission. No encoding, factory
 * reconstruction, original source reread, model copy or prior probe replay. */
export async function decodeForNewSelectors(binding:LosslessBinding,map:Record<string,any>,storedUrl:string){
 await MeshoptDecoder.ready;const p=binding.proof,original=p.originalDocument,ext='EXT_meshopt_compression';
 async function read(url:string,hash:string,size:number){const r=map[url];assert(r&&r.sha256===hash&&r.size===size&&size<=25*1024*1024&&same(await fs.stat(r.file),r),'Published lossless file identity differs');const b=await fs.readFile(r.file);assert(b.length===size&&sha(b)===hash&&same(await fs.stat(r.file),r));return b;}
 const stored=await read(storedUrl,p.derivedSha256,p.derivedBytes),length=stored.readUInt32LE(12),doc=JSON.parse(stored.subarray(20,20+length).toString()),bin=stored.subarray(28+length);
 const semantic=(d:any)=>Object.fromEntries(Object.entries(d).filter(([k])=>!['buffers','bufferViews','extensionsUsed','extensionsRequired'].includes(k)));
 assert(canonical(semantic(doc))===canonical(semantic(original)),'Original nodes/materials/accessors changed');
 assert(canonical(doc.extensionsUsed)===canonical([...new Set([...(original.extensionsUsed||[]),ext])])&&canonical(doc.extensionsRequired)===canonical([...new Set([...(original.extensionsRequired||[]),ext])]),'Lossless extension set differs');
 assert(doc.buffers?.[1]?.byteLength===original.buffers[0].byteLength&&doc.buffers[1].extensions?.[ext]?.fallback===true&&doc.bufferViews.length===original.bufferViews.length,'Lossless layout differs');
 const resources=new Map<string,Buffer>();
 for(const row of p.externalFiles)resources.set(row.url,await read(row.url,row.sha256,row.bytes));
 const restored=Buffer.alloc(Math.ceil(original.buffers[0].byteLength/4)*4);
 for(const [i,view]of original.bufferViews.entries()){
  const v=doc.bufferViews[i],e=v.extensions?.[ext],shape=structuredClone(v);delete shape.extensions?.[ext];if(shape.extensions&&!Object.keys(shape.extensions).length&&!view.extensions)delete shape.extensions;shape.buffer=view.buffer;if('byteOffset'in view)shape.byteOffset=view.byteOffset;else delete shape.byteOffset;
  assert(canonical(shape)===canonical(view),'Original buffer-view semantics changed');let data:Buffer;
  if(e){assert(v.buffer===1&&(e.buffer===0||e.buffer>=2)&&e.filter==='NONE'&&['ATTRIBUTES','INDICES'].includes(e.mode)&&e.count*e.byteStride===view.byteLength,'Unexpected lossless view');const resource=doc.buffers[e.buffer],source=e.buffer===0?bin:resources.get(resource.uri);assert(source&&source.length>=resource.byteLength&&(e.byteOffset||0)+e.byteLength<=resource.byteLength);data=Buffer.alloc(view.byteLength);MeshoptDecoder.decodeGltfBuffer(data,e.count,e.byteStride,source.subarray(e.byteOffset||0,(e.byteOffset||0)+e.byteLength),e.mode,e.filter);}
  else{assert(v.buffer===0&&(v.byteOffset||0)+v.byteLength<=doc.buffers[0].byteLength);data=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);}
  assert(data.length===view.byteLength);data.copy(restored,view.byteOffset||0);
 }
 assert(sha(restored)===p.originalBinSha256,'Decoded original BIN differs');
 const raw=Buffer.from(JSON.stringify(original)),json=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(json);const b=Buffer.alloc(28+json.length+restored.length);
 b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);b.writeUInt32LE(restored.length,20+json.length);b.writeUInt32LE(0x004e4942,24+json.length);restored.copy(b,28+json.length);
 return b;
}
