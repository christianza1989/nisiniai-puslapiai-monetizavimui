import {createHash} from 'node:crypto';
import type {ChairSelectors} from '../src/lib/chair-preview';
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const plain=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const canonical=(v:any):string=>JSON.stringify(v,(_k,value)=>plain(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
function assert(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function withoutFile(v:any):any{if(Array.isArray(v))return v.map(withoutFile);if(plain(v))return Object.fromEntries(Object.entries(v).filter(([k])=>k!=='file').map(([k,value])=>[k,withoutFile(value)]));return v;}

export function glbAdmission(bytes:Buffer,selectors:ChairSelectors['assets'][string]){
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

/** New packets additionally bind actual accessor bytes to supplied geometry IDs. */
export function glbGeometryAdmission(bytes:Buffer,selectors:ChairSelectors['assets'][string]){
 const proof=glbAdmission(bytes,selectors),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length).toString('utf8')),bin=bytes.subarray(28+length);
 const ascii=(v:any):string=>JSON.stringify(v,(_k,x)=>plain(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0)):x);
 const cache=new Map<number,unknown>();
 function accessor(index:number){
  if(cache.has(index))return cache.get(index);
  const a=doc.accessors?.[index],v=doc.bufferViews?.[a?.bufferView];assert(a&&v&&v.buffer===0&&!a.sparse&&Number.isSafeInteger(a.count)&&a.count>0,'Unknown/sparse geometry accessor');
  const component=({5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}as Record<number,number>)[a.componentType],components=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}as Record<string,number>)[a.type];
  assert(component&&components,'Unknown accessor component/type');const width=component*components,stride=v.byteStride||width,start=(v.byteOffset||0)+(a.byteOffset||0),end=start+(a.count-1)*stride+width;
  assert(Number.isSafeInteger(stride)&&stride>=width&&end<=bin.length&&end<=(v.byteOffset||0)+v.byteLength,'Geometry accessor outside BIN/view');
  const digest=createHash('sha256');if(stride===width)digest.update(bin.subarray(start,end));else for(let n=0;n<a.count;n++)digest.update(bin.subarray(start+n*stride,start+n*stride+width));
  const result={componentType:a.componentType,type:a.type,count:a.count,normalized:a.normalized??false,data:digest.digest('hex')};cache.set(index,result);return result;
 }
 for(const slot of selectors.slots){const p=doc.meshes[doc.nodes[slot.sourceNodePath[0]].mesh].primitives[slot.primitive],geometry={attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,i])=>[k,accessor(i as number)])),indices:p.indices===undefined?null:accessor(p.indices),mode:p.mode??4};assert(sha(ascii(geometry))===(slot as any).geometrySha256,'Primitive geometry accessor signature mismatch');}
 return {...proof,actualGeometryAccessorSignatures:selectors.slots.length};
}

