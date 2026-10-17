import {createHash} from 'node:crypto';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const suffix=k=>k.split('.').at(-1);
const imageHash=m=>m?.getBaseColorTexture()?hash(m.getBaseColorTexture().getImage()):null;
function textureKey(texture,info){
 if(!texture)return null;
 if(info.listExtensions().some(e=>e.extensionName!=='KHR_texture_transform'))throw Error('Unreviewed texture extension');
 const t=info.getExtension('KHR_texture_transform');
 return [hash(texture.getImage()),texture.getMimeType(),info.getTexCoord(),info.getWrapS(),info.getWrapT(),info.getMinFilter(),info.getMagFilter(),t?[t.getOffset(),t.getScale(),t.getRotation(),t.getTexCoord()]:null];
}
function materialKey(m){
 if(!m)return 'null';if(m.listExtensions().length)throw Error('Unreviewed extended Native material');
 return JSON.stringify([m.getBaseColorFactor(),m.getMetallicFactor(),m.getRoughnessFactor(),m.getEmissiveFactor(),m.getAlphaMode(),m.getAlphaCutoff(),m.getDoubleSided(),m.getNormalScale(),m.getOcclusionStrength(),
 textureKey(m.getBaseColorTexture(),m.getBaseColorTextureInfo()),textureKey(m.getNormalTexture(),m.getNormalTextureInfo()),textureKey(m.getMetallicRoughnessTexture(),m.getMetallicRoughnessTextureInfo()),textureKey(m.getOcclusionTexture(),m.getOcclusionTextureInfo()),textureKey(m.getEmissiveTexture(),m.getEmissiveTextureInfo())]);
}
const identities=new WeakMap();
const canonicalIds=new Map();
export function parts(doc){
 const counts=new Map(),oldCounts=new Map();return doc.getRoot().listNodes().filter(n=>n.getMesh()).map(n=>{
   if(identities.has(n))return {...identities.get(n),material:materialKey(n.getMesh().listPrimitives()[0].getMaterial())};
   const p=n.getMesh().listPrimitives()[0],h=createHash('sha256');
   for(const attr of p.listSemantics().sort()){const a=p.getAttribute(attr).getArray();h.update(attr);h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
   if(p.getIndices()){const a=p.getIndices().getArray();h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
   h.update(JSON.stringify(n.getWorldMatrix().map(v=>Math.round(v*1e7)/1e7)));
   const old=h.digest('hex').slice(0,24),oldCount=oldCounts.get(old)||0;oldCounts.set(old,oldCount+1);
   // Exporters can reorder vertices/triangles when other components change.
   // Identify the actual surface independently of index order, normals or UVs.
   let geometry=canonicalIds.get(old);
   if(!geometry){const pos=p.getAttribute('POSITION').getArray(),vertexKeys=[];
   for(let i=0;i<pos.length;i+=3)vertexKeys.push([pos[i],pos[i+1],pos[i+2]].map(v=>Math.round(v*1e6)).join(','));
   const unique=[...new Set(vertexKeys)].sort(),lookup=new Map(unique.map((v,i)=>[v,i])),idx=p.getIndices().getArray(),faces=[];
   for(let i=0;i<idx.length;i+=3)faces.push([lookup.get(vertexKeys[idx[i]]),lookup.get(vertexKeys[idx[i+1]]),lookup.get(vertexKeys[idx[i+2]])].sort((a,b)=>a-b).join(','));
   faces.sort();geometry=hash(JSON.stringify([unique,faces,n.getWorldMatrix().map(v=>Math.round(v*1e7)/1e7)])).slice(0,24);canonicalIds.set(old,geometry);}
   const count=counts.get(geometry)||0;counts.set(geometry,count+1);
   const identity={node:n,id:geometry+'-'+count,oldId:old+'-'+oldCount};identities.set(n,identity);return {...identity,material:materialKey(p.getMaterial())};
 });
}
export function compact(doc){
 const buffer=doc.getRoot().listBuffers()[0];
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  const indices=p.getIndices()?.getArray();if(!indices)continue;
  if(indices.some(i=>i>=p.getAttribute('POSITION').getCount()))throw Error('Supplier export has invalid indices; use texTrans=true');
  if([...p.getAttribute('POSITION').getArray()].some(v=>!Number.isFinite(v)))throw Error('Non-finite supplier geometry');
  const map=new Map(),local=new Uint32Array(indices.length);
  indices.forEach((value,i)=>{if(!map.has(value))map.set(value,map.size);local[i]=map.get(value);});
  for(const semantic of p.listSemantics()){
   const old=p.getAttribute(semantic),array=old.getArray(),size=old.getElementSize(),copy=new array.constructor(map.size*size);
   for(const [original,index] of map)for(let c=0;c<size;c++)copy[index*size+c]=array[original*size+c];
   p.setAttribute(semantic,doc.createAccessor().setType(old.getType()).setArray(copy).setNormalized(old.getNormalized()).setBuffer(buffer));
  }
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(local).setBuffer(buffer));
 }
 return doc;
}



export {materialKey as materialFingerprint};
