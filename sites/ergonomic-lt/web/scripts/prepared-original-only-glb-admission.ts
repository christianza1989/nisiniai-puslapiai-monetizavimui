import assert from 'node:assert/strict';
/** Whole original GLB admission grants no material/primitive addressing. */
export function originalOnlyGlbAdmission(bytes:Buffer){
 assert(bytes.length<=25*1024*1024&&bytes.readUInt32LE(0)===0x46546c67&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'Invalid original GLB2/limit');
 const n=bytes.readUInt32LE(12);assert(bytes.readUInt32LE(16)===0x4e4f534a&&20+n+8<=bytes.length&&bytes.readUInt32LE(24+n)===0x004e4942,'Invalid embedded GLB chunks');
 const doc=JSON.parse(bytes.subarray(20,20+n).toString('utf8')),binLength=bytes.length-28-n;
 assert(doc.buffers?.length===1&&!doc.buffers[0].uri&&doc.buffers[0].byteLength<=binLength&&!doc.animations?.length&&!doc.skins?.length,'External or animated/skinned original needs separate admission');
 for(const image of doc.images||[])assert(!image.uri&&Number.isSafeInteger(image.bufferView),'External original image');
 for(const v of doc.bufferViews||[])assert(v.buffer===0&&Number.isSafeInteger(v.byteLength)&&v.byteLength>0&&(v.byteOffset||0)>=0&&(v.byteOffset||0)+v.byteLength<=doc.buffers[0].byteLength,'Original buffer view outside BIN');
 const scene=doc.scenes?.[doc.scene??0];assert(Array.isArray(scene?.nodes)&&scene.nodes.length,'Empty original scene');
 const visiting=new Set<number>(),visited=new Set<number>();let primitives=0;
 function visit(i:number){assert(Number.isSafeInteger(i)&&doc.nodes?.[i]&&!visiting.has(i)&&!visited.has(i),'Invalid, cyclic or duplicate original scene node');visiting.add(i);const node=doc.nodes[i];
  if(node.matrix)assert(node.matrix.length===16&&node.matrix.every(Number.isFinite),'Invalid original matrix');
  for(const [key,length]of [['translation',3],['rotation',4],['scale',3]]as const)if(node[key])assert(node[key].length===length&&node[key].every(Number.isFinite),'Invalid original transform');
  if(node.mesh!==undefined){const mesh=doc.meshes?.[node.mesh];assert(Array.isArray(mesh?.primitives)&&mesh.primitives.length,'Missing original mesh');for(const p of mesh.primitives){assert(doc.accessors?.[p.attributes?.POSITION]?.count>0,'Missing original positions');if(p.material!==undefined)assert(doc.materials?.[p.material],'Missing original material');primitives++;}}
  for(const child of node.children||[])visit(child);visiting.delete(i);visited.add(i);
 }
 for(const i of scene.nodes)visit(i);assert(primitives>0,'Original contains no renderable primitives');
 return {originalSceneNodes:visited.size,originalPrimitives:primitives,geometryBytesUnchanged:true,originalMaterialsAndTransformHierarchyUnchanged:true,materialOrPrimitiveAddressingGranted:false};
}
